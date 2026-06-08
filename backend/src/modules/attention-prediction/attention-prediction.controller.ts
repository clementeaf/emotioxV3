/**
 * Attention Prediction Controller
 * Handles HTTP routes for visual saliency prediction.
 * Synchronous — awaits TranSalNet inference and returns result directly.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, error } from '../../utils/response';
import { requireAuth } from '../../utils/auth.local';
import { getRequestOrigin } from '../../utils/request';
import {
    predictAttentionFast,
    predictAttentionRaw,
    computeAutoPresets,
    computeGriddedAOIs,
    extractHeatmapPoints,
    DEFAULT_EXTRACT_HEATMAP_OPTIONS,
    suppressWhitespaceSaliency,
} from './attention-prediction.service';
import { analyzeAttentionWithAI, generateHybridSaliency, parseManualAois, type ManualAoiInput } from './ai-analysis.service';
import { getMediaPath } from '../../config/local-storage';
import { predictVideoFrames } from './video-prediction.service';
import { registerJob, broadcastProgress, removeJob } from './video-prediction-jobs';
import pool from '../../config/database';
import crypto from 'crypto';

/**
 * Runs the unified hybrid prediction pipeline:
 * 1. 3× TranSalNet averaged (no center bias — model has inherent bias)
 * 2. Gemini semantic grid → fusion → focal equalization → jitter
 * 3. Auto-presets + gridded AOIs
 *
 * On failure, saves error state to the stimulus entry and re-throws.
 */
const runPredictionAsync = async (
    researchId: string,
    mediaId: string,
    imagePath: string,
    threshold: number,
    profile?: import('./ai-analysis.service').AnalysisProfile,
    manualAois?: ManualAoiInput[],
): Promise<void> => {
    try {
        // Step 1: TranSalNet single-pass (TTA too slow for shared hosting timeouts)
        const { map: transalnetMap, width, height } = await predictAttentionFast(imagePath);

        // Step 2: Hybrid fusion with Gemini semantic saliency + focal equalization + jitter
        let finalMap: Float32Array;
        try {
            finalMap = await generateHybridSaliency(
                imagePath,
                transalnetMap,
                width,
                height,
                profile,
                manualAois,
            );
        } catch (hybridErr) {
            // Fallback to TranSalNet-only if Gemini fails
            console.warn('[Predict] Hybrid fusion failed, using TranSalNet only:', hybridErr);
            finalMap = transalnetMap;
        }

        try {
            finalMap = await suppressWhitespaceSaliency(finalMap, imagePath, width, height);
        } catch (suppressErr) {
            console.warn('[Predict] Whitespace suppression skipped:', suppressErr);
        }

        // Step 3: Extract points + auto-presets + gridded AOIs
        const autoPresets = computeAutoPresets(finalMap);
        const griddedAOIs = computeGriddedAOIs(finalMap, width, height);
        const heatmapData = extractHeatmapPoints(finalMap, width, height, {
            ...DEFAULT_EXTRACT_HEATMAP_OPTIONS,
            minAbsolute: Math.max(0.4, threshold),
        });

        // Read current config
        const researchResult = await pool.query(
            'SELECT config FROM researches WHERE id = ? AND deleted_at IS NULL',
            [researchId]
        );
        if (researchResult.rows.length === 0) return;

        let config: Record<string, unknown> = {};
        try {
            const rawConfig = researchResult.rows[0].config;
            config = typeof rawConfig === 'string' ? JSON.parse(rawConfig) : (rawConfig || {});
        } catch {
            config = {};
        }

        // Merge heatmapData + autoPresets into the matching stimulus
        const stimuli = (config.stimuli as Array<Record<string, unknown>>) || [];
        const updatedStimuli = stimuli.map((s) => {
            if (s.mediaId === mediaId) {
                return {
                    ...s,
                    heatmapData,
                    autoPresets,
                    griddedAOIs,
                    analysisProfile: profile || undefined,
                    processedAt: new Date().toISOString(),
                    predictionStatus: 'complete',
                    predictionError: undefined,
                    predictionErrorAt: undefined,
                };
            }
            return s;
        });

        config.stimuli = updatedStimuli;

        await pool.query(
            'UPDATE researches SET config = ? WHERE id = ?',
            [JSON.stringify(config), researchId]
        );
    } catch (err) {
        // Save error state so frontend can display it
        try {
            const researchResult = await pool.query(
                'SELECT config FROM researches WHERE id = ? AND deleted_at IS NULL',
                [researchId]
            );
            if (researchResult.rows.length > 0) {
                let config: Record<string, unknown> = {};
                try {
                    const rawConfig = researchResult.rows[0].config;
                    config = typeof rawConfig === 'string' ? JSON.parse(rawConfig) : (rawConfig || {});
                } catch { config = {}; }

                const stimuli = (config.stimuli as Array<Record<string, unknown>>) || [];
                config.stimuli = stimuli.map((s) => {
                    if (s.mediaId === mediaId) {
                        return {
                            ...s,
                            predictionStatus: 'error',
                            predictionError: err instanceof Error ? err.message : 'Unknown prediction error',
                            predictionErrorAt: new Date().toISOString(),
                        };
                    }
                    return s;
                });

                await pool.query(
                    'UPDATE researches SET config = ? WHERE id = ?',
                    [JSON.stringify(config), researchId]
                );
            }
        } catch {
            // Best-effort error save
        }
        throw err;
    }
};

/**
 * Runs prediction for a module stimulus and saves to module config.
 * Supports single stimulus (Eye Tracking) and multi-image (Navigation Flow).
 * @param imageKey - optional image ID for multi-image modules (Nav Flow). If omitted, stores as single prediction.
 */
const runModulePredictionAsync = async (
    moduleId: string,
    imagePath: string,
    threshold: number,
    imageKey?: string
): Promise<void> => {
    try {
        // Unified hybrid pipeline
        const { map: transalnetMap, width, height } = await predictAttentionRaw(imagePath);
        let finalMap: Float32Array;
        try {
            finalMap = await generateHybridSaliency(imagePath, transalnetMap, width, height);
        } catch {
            finalMap = transalnetMap;
        }

        try {
            finalMap = await suppressWhitespaceSaliency(finalMap, imagePath, width, height);
        } catch (suppressErr) {
            console.warn('[ModulePredict] Whitespace suppression skipped:', suppressErr);
        }

        const autoPresets = computeAutoPresets(finalMap);
        const griddedAOIs = computeGriddedAOIs(finalMap, width, height);
        const heatmapData = extractHeatmapPoints(finalMap, width, height, {
            ...DEFAULT_EXTRACT_HEATMAP_OPTIONS,
            minAbsolute: Math.max(0.4, threshold),
        });

        const moduleResult = await pool.query('SELECT config FROM modules WHERE id = ?', [moduleId]);
        if (moduleResult.rows.length === 0) return;

        let config: Record<string, unknown> = {};
        try {
            const raw = moduleResult.rows[0].config;
            config = typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
        } catch { config = {}; }

        if (imageKey) {
            // Multi-image: store per-image predictions in a map
            const predictions = (config.predictionHeatmaps ?? {}) as Record<string, unknown>;
            predictions[imageKey] = { heatmapData, autoPresets, griddedAOIs, processedAt: new Date().toISOString() };
            config.predictionHeatmaps = predictions;
        } else {
            // Single stimulus (Eye Tracking)
            config.predictionHeatmap = heatmapData;
            config.predictionAutoPresets = autoPresets;
            config.predictionGriddedAOIs = griddedAOIs;
            config.predictionProcessedAt = new Date().toISOString();
        }

        await pool.query('UPDATE modules SET config = ? WHERE id = ?', [JSON.stringify(config), moduleId]);
    } catch (err) {
        // Save error state so caller can report failure
        try {
            const moduleResult = await pool.query('SELECT config FROM modules WHERE id = ?', [moduleId]);
            if (moduleResult.rows.length > 0) {
                let config: Record<string, unknown> = {};
                try {
                    const raw = moduleResult.rows[0].config;
                    config = typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
                } catch { config = {}; }
                config.predictionError = err instanceof Error ? err.message : 'Unknown prediction error';
                config.predictionErrorAt = new Date().toISOString();
                await pool.query('UPDATE modules SET config = ? WHERE id = ?', [JSON.stringify(config), moduleId]);
            }
        } catch {
            // Best-effort error save
        }
    }
};

export const handleAttentionPredictionRoutes = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    const { httpMethod, path } = event;
    const origin = getRequestOrigin(event);

    try {
        await requireAuth(event);

        // POST /attention-prediction/research/:researchId/predict/:mediaId
        // Fire-and-forget — avoids cPanel/proxy timeout (~60s) on TranSalNet + hybrid fusion
        const predictMatch = path.match(
            /^\/attention-prediction\/research\/([^/]+)\/predict\/([^/]+)$/
        );
        if (predictMatch && httpMethod === 'POST') {
            const researchId = predictMatch[1];
            const mediaId = predictMatch[2];

            // Validate media exists
            const mediaResult = await pool.query(
                'SELECT s3_key FROM media WHERE id = ? AND research_id = ?',
                [mediaId, researchId]
            );
            if (mediaResult.rows.length === 0) {
                return error('Media not found', 404, undefined, origin);
            }

            const s3Key = mediaResult.rows[0].s3_key as string;
            const imagePath = getMediaPath(s3Key);

            const researchResult = await pool.query(
                'SELECT config FROM researches WHERE id = ? AND deleted_at IS NULL',
                [researchId]
            );
            if (researchResult.rows.length === 0) {
                return error('Research not found', 404, undefined, origin);
            }

            let config: Record<string, unknown> = {};
            try {
                const rawConfig = researchResult.rows[0].config;
                config = typeof rawConfig === 'string' ? JSON.parse(rawConfig) : (rawConfig || {});
            } catch {
                config = {};
            }

            const stimuli = (config.stimuli as Array<Record<string, unknown>>) || [];
            const stimulus = stimuli.find((s) => s.mediaId === mediaId);

            const body = event.body ? JSON.parse(event.body) : {};
            const threshold = typeof body.threshold === 'number' ? body.threshold : 0.48;
            const profile = body.profile || undefined;
            const manualAois = parseManualAois(body.aois ?? stimulus?.aois ?? []);
            const manualAoisForPredict = manualAois.length > 0 ? manualAois : undefined;

            // Mark as processing
            config.stimuli = stimuli.map((s) => {
                if (s.mediaId === mediaId) {
                    return {
                        ...s,
                        predictionStatus: 'processing',
                        predictionError: undefined,
                        predictionErrorAt: undefined,
                    };
                }
                return s;
            });
            await pool.query(
                'UPDATE researches SET config = ? WHERE id = ?',
                [JSON.stringify(config), researchId],
            );

            // Fire-and-forget background job
            void runPredictionAsync(
                researchId,
                mediaId,
                imagePath,
                threshold,
                profile,
                manualAoisForPredict,
            ).catch((predErr) => {
                console.error('[Predict] Background error:', predErr);
            });

            return success({ status: 'processing', mediaId }, 202, undefined, origin);
        }

        // GET /attention-prediction/research/:researchId/predict/:mediaId/status
        const predictStatusMatch = path.match(
            /^\/attention-prediction\/research\/([^/]+)\/predict\/([^/]+)\/status$/,
        );
        if (predictStatusMatch && httpMethod === 'GET') {
            const researchId = predictStatusMatch[1];
            const mediaId = predictStatusMatch[2];

            const researchResult = await pool.query(
                'SELECT config FROM researches WHERE id = ? AND deleted_at IS NULL',
                [researchId],
            );
            if (researchResult.rows.length === 0) {
                return error('Research not found', 404, undefined, origin);
            }

            let config: Record<string, unknown> = {};
            try {
                const raw = researchResult.rows[0].config;
                config = typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
            } catch {
                config = {};
            }

            const stimuli = (config.stimuli as Array<Record<string, unknown>>) || [];
            const stimulus = stimuli.find((s) => s.mediaId === mediaId);
            if (!stimulus) {
                return error('Stimulus not found', 404, undefined, origin);
            }

            const hasHeatmap = Array.isArray(stimulus.heatmapData) && (stimulus.heatmapData as unknown[]).length > 0;
            const status = (stimulus.predictionStatus as string)
                || (hasHeatmap ? 'complete' : stimulus.predictionError ? 'error' : 'idle');

            return success({
                status,
                processedAt: stimulus.processedAt ?? null,
                error: status === 'error' ? stimulus.predictionError : undefined,
            }, 200, undefined, origin);
        }

        // POST /attention-prediction/research/:researchId/module/:moduleId/predict
        // Run TranSalNet on an Eye Tracking module's stimulus image
        const modulePredictMatch = path.match(
            /^\/attention-prediction\/research\/([^/]+)\/module\/([^/]+)\/predict$/
        );
        if (modulePredictMatch && httpMethod === 'POST') {
            const researchId = modulePredictMatch[1];
            const moduleId = modulePredictMatch[2];

            // Validate module belongs to research
            const moduleResult = await pool.query(
                'SELECT config FROM modules WHERE id = ? AND research_id = ?',
                [moduleId, researchId]
            );
            if (moduleResult.rows.length === 0) {
                return error('Module not found', 404, undefined, origin);
            }

            // Extract stimulus s3Key from module config
            let moduleConfig: Record<string, unknown> = {};
            try {
                const raw = moduleResult.rows[0].config;
                moduleConfig = typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
            } catch { moduleConfig = {}; }

            const structure = (moduleConfig.structure ?? moduleConfig) as Record<string, unknown>;
            const components = (structure.components ?? []) as Array<Record<string, unknown>>;
            const fileComp = components.find((c) =>
                c.id === 'stimuli' || c.type === 'file-upload' || c.id === 'stimulus-image' || c.id === 'image' || c.id === 'stimulus'
            );

            // Parse file-upload value (may be array of images for Nav Flow)
            let files: Array<{ s3Key?: string; url?: string; id?: string; mediaId?: string }> = [];
            if (fileComp?.value) {
                try {
                    const parsed = typeof fileComp.value === 'string' ? JSON.parse(fileComp.value as string) : fileComp.value;
                    if (Array.isArray(parsed)) {
                        files = parsed;
                    } else if (typeof parsed === 'string') {
                        files = [{ s3Key: parsed }];
                    }
                } catch {
                    files = [{ s3Key: fileComp.value as string }];
                }
            }

            if (files.length === 0) {
                return error('No stimulus image found in module config', 400, undefined, origin);
            }

            const body = event.body ? JSON.parse(event.body) : {};
            const threshold = typeof body.threshold === 'number' ? body.threshold : 0.48;
            const imageIndex = typeof body.imageIndex === 'number' ? body.imageIndex : undefined;

            // Synchronous prediction — await result and return directly
            try {
                if (imageIndex !== undefined) {
                    if (imageIndex < 0 || imageIndex >= files.length) {
                        return error(`imageIndex ${imageIndex} out of range (0-${files.length - 1})`, 400, undefined, origin);
                    }
                    const file = files[imageIndex];
                    const s3Key = file.s3Key || file.url || '';
                    if (!s3Key) return error('Image has no s3Key', 400, undefined, origin);
                    const imageKey = file.id || file.mediaId || String(imageIndex);
                    await runModulePredictionAsync(moduleId, getMediaPath(s3Key), threshold, imageKey);
                } else {
                    const s3Key = files[0].s3Key || files[0].url || '';
                    if (!s3Key) return error('No stimulus image found', 400, undefined, origin);
                    await runModulePredictionAsync(moduleId, getMediaPath(s3Key), threshold);
                }

                return success(
                    { status: 'complete', moduleId },
                    200,
                    undefined,
                    origin
                );
            } catch (predErr) {
                const msg = predErr instanceof Error ? predErr.message : 'Prediction failed';
                return error(msg, 500, undefined, origin);
            }
        }

        // POST /attention-prediction/research/:researchId/analyze/:mediaId
        // Fire-and-forget: launches AI analysis in background, returns immediately
        const analyzeMatch = path.match(
            /^\/attention-prediction\/research\/([^/]+)\/analyze\/([^/]+)$/
        );
        if (analyzeMatch && httpMethod === 'POST') {
            const researchId = analyzeMatch[1];
            const mediaId = analyzeMatch[2];

            // Validate media exists
            const mediaResult = await pool.query(
                'SELECT s3_key, file_name FROM media WHERE id = ? AND research_id = ?',
                [mediaId, researchId]
            );
            if (mediaResult.rows.length === 0) {
                return error('Media not found', 404, undefined, origin);
            }

            const s3Key = mediaResult.rows[0].s3_key as string;
            const fileName = (mediaResult.rows[0].file_name as string) || 'image';
            const imagePath = getMediaPath(s3Key);

            // Read research config to get heatmapData
            const researchResult = await pool.query(
                'SELECT config FROM researches WHERE id = ? AND deleted_at IS NULL',
                [researchId]
            );
            if (researchResult.rows.length === 0) {
                return error('Research not found', 404, undefined, origin);
            }

            let config: Record<string, unknown> = {};
            try {
                const rawConfig = researchResult.rows[0].config;
                config = typeof rawConfig === 'string' ? JSON.parse(rawConfig) : (rawConfig || {});
            } catch { config = {}; }

            const stimuli = (config.stimuli as Array<Record<string, unknown>>) || [];
            const stimulus = stimuli.find((s) => s.mediaId === mediaId);
            const heatmapData = (stimulus?.heatmapData ?? []) as Array<{ x: number; y: number; value: number }>;

            const profile = (config.analysisProfile && typeof config.analysisProfile === 'object' && Object.keys(config.analysisProfile as Record<string, unknown>).length > 0)
                ? config.analysisProfile as import('./ai-analysis.service').AnalysisProfile
                : undefined;

            const requestBody = event.body ? JSON.parse(event.body) : {};
            const manualAois = parseManualAois(requestBody.aois ?? stimulus?.aois ?? []);

            // Mark as processing
            const processingStimuli = stimuli.map((s) => {
                if (s.mediaId === mediaId) {
                    return { ...s, aiAnalysisStatus: 'processing', aiAnalysisError: undefined };
                }
                return s;
            });
            config.stimuli = processingStimuli;
            await pool.query('UPDATE researches SET config = ? WHERE id = ?', [JSON.stringify(config), researchId]);

            // Fire-and-forget: run analysis in background
            (async () => {
                try {
                    const customPrompt = typeof config.attentionPrompt === 'string' ? config.attentionPrompt : undefined;
                    const analysis = await analyzeAttentionWithAI(
                        imagePath,
                        heatmapData,
                        fileName,
                        profile,
                        customPrompt,
                        manualAois.length > 0 ? manualAois : undefined,
                    );

                    // Save result
                    const freshResult = await pool.query(
                        'SELECT config FROM researches WHERE id = ? AND deleted_at IS NULL',
                        [researchId]
                    );
                    let freshConfig: Record<string, unknown> = {};
                    try {
                        const raw = freshResult.rows[0].config;
                        freshConfig = typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
                    } catch { freshConfig = {}; }

                    const freshStimuli = (freshConfig.stimuli as Array<Record<string, unknown>>) || [];
                    freshConfig.stimuli = freshStimuli.map((s) => {
                        if (s.mediaId === mediaId) {
                            return { ...s, aiAnalysis: analysis, aiAnalysisStatus: 'complete', aiAnalysisError: undefined, aiAnalysisErrorAt: undefined };
                        }
                        return s;
                    });
                    await pool.query('UPDATE researches SET config = ? WHERE id = ?', [JSON.stringify(freshConfig), researchId]);
                } catch (err) {
                    const msg = err instanceof Error ? err.message : 'AI analysis failed';
                    console.error('[AI Analysis] Background error:', err);
                    try {
                        const errResult = await pool.query('SELECT config FROM researches WHERE id = ? AND deleted_at IS NULL', [researchId]);
                        if (errResult.rows.length > 0) {
                            let errConfig: Record<string, unknown> = {};
                            try { const raw = errResult.rows[0].config; errConfig = typeof raw === 'string' ? JSON.parse(raw) : (raw || {}); } catch { errConfig = {}; }
                            const errStimuli = (errConfig.stimuli as Array<Record<string, unknown>>) || [];
                            errConfig.stimuli = errStimuli.map((s) => {
                                if (s.mediaId === mediaId) {
                                    return { ...s, aiAnalysisStatus: 'error', aiAnalysisError: msg, aiAnalysisErrorAt: new Date().toISOString() };
                                }
                                return s;
                            });
                            await pool.query('UPDATE researches SET config = ? WHERE id = ?', [JSON.stringify(errConfig), researchId]);
                        }
                    } catch { /* silent */ }
                }
            })();

            // Respond immediately
            return success({ status: 'processing', mediaId }, 202, undefined, origin);
        }

        // GET /attention-prediction/research/:researchId/analyze/:mediaId/status
        // Poll for analysis result
        const analyzeStatusMatch = path.match(
            /^\/attention-prediction\/research\/([^/]+)\/analyze\/([^/]+)\/status$/
        );
        if (analyzeStatusMatch && httpMethod === 'GET') {
            const researchId = analyzeStatusMatch[1];
            const mediaId = analyzeStatusMatch[2];

            const researchResult = await pool.query(
                'SELECT config FROM researches WHERE id = ? AND deleted_at IS NULL',
                [researchId]
            );
            if (researchResult.rows.length === 0) {
                return error('Research not found', 404, undefined, origin);
            }

            let config: Record<string, unknown> = {};
            try {
                const raw = researchResult.rows[0].config;
                config = typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
            } catch { config = {}; }

            const stimuli = (config.stimuli as Array<Record<string, unknown>>) || [];
            const stimulus = stimuli.find((s) => s.mediaId === mediaId);

            if (!stimulus) {
                return error('Stimulus not found', 404, undefined, origin);
            }

            const status = (stimulus.aiAnalysisStatus as string) || (stimulus.aiAnalysis ? 'complete' : 'idle');

            return success({
                status,
                analysis: status === 'complete' ? stimulus.aiAnalysis : undefined,
                error: status === 'error' ? stimulus.aiAnalysisError : undefined,
            }, 200, undefined, origin);
        }


        // POST /attention-prediction/research/:researchId/module/:moduleId/hybrid-predict
        // Legacy endpoint — redirects to the same unified pipeline as predict
        const hybridMatch = path.match(
            /^\/attention-prediction\/research\/([^/]+)\/module\/([^/]+)\/hybrid-predict$/
        );
        if (hybridMatch && httpMethod === 'POST') {
            const researchId = hybridMatch[1];
            const mediaId = hybridMatch[2];
            const body = event.body ? JSON.parse(event.body) : {};
            const threshold = typeof body.threshold === 'number' ? body.threshold : 0.48;
            const profile = body.profile || undefined;

            const mediaResult = await pool.query(
                'SELECT s3_key FROM media WHERE id = ? AND research_id = ?',
                [mediaId, researchId]
            );
            if (mediaResult.rows.length === 0) {
                return error('Media not found', 404, undefined, origin);
            }

            const s3Key = mediaResult.rows[0].s3_key as string;
            const imagePath = getMediaPath(s3Key);

            try {
                await runPredictionAsync(researchId, mediaId, imagePath, threshold, profile);
                return success({ status: 'complete', mediaId }, 200, undefined, origin);
            } catch (predErr) {
                const msg = predErr instanceof Error ? predErr.message : 'Prediction failed';
                return error(msg, 500, undefined, origin);
            }
        }

        // POST /attention-prediction/research/:researchId/video-predict
        // Start video frame-by-frame prediction (fire-and-forget, SSE progress)
        const videoPredictMatch = path.match(
            /^\/attention-prediction\/research\/([^/]+)\/video-predict$/
        );
        if (videoPredictMatch && httpMethod === 'POST') {
            const researchId = videoPredictMatch[1];
            const body = event.body ? JSON.parse(event.body) : {};

            const videoMediaId = body.videoMediaId as string;
            const inputFrames = body.frames as Array<{ mediaId: string; timestamp: number }> | undefined;
            const threshold = typeof body.threshold === 'number' ? body.threshold : 0.48;
            const profile = body.profile || undefined;

            if (!videoMediaId || !Array.isArray(inputFrames) || inputFrames.length === 0) {
                return error('videoMediaId and frames[] are required', 400, undefined, origin);
            }
            if (inputFrames.length > 120) {
                return error(`Too many frames: ${inputFrames.length} (max 120)`, 400, undefined, origin);
            }

            // Lookup s3_keys for all frame mediaIds
            const mediaIds = inputFrames.map(f => f.mediaId);
            const placeholders = mediaIds.map(() => '?').join(',');
            const mediaResult = await pool.query(
                `SELECT id, s3_key FROM media WHERE id IN (${placeholders}) AND research_id = ?`,
                [...mediaIds, researchId]
            );

            const s3KeyMap = new Map<string, string>();
            for (const row of mediaResult.rows) {
                s3KeyMap.set(row.id as string, row.s3_key as string);
            }

            // Validate all frames have media entries
            const missingIds = mediaIds.filter(id => !s3KeyMap.has(id));
            if (missingIds.length > 0) {
                return error(`Media not found for frame(s): ${missingIds.slice(0, 5).join(', ')}`, 404, undefined, origin);
            }

            const framesWithKeys = inputFrames.map(f => ({
                mediaId: f.mediaId,
                timestamp: f.timestamp,
                s3Key: s3KeyMap.get(f.mediaId)!,
            }));

            const jobId = crypto.randomUUID();
            registerJob(jobId, researchId, inputFrames.length);

            // Fire-and-forget: run prediction in background
            (async () => {
                try {
                    const result = await predictVideoFrames(
                        framesWithKeys,
                        threshold,
                        profile,
                        (event) => broadcastProgress(jobId, event),
                    );

                    // Save results to research.config.stimuli[]
                    const researchResult = await pool.query(
                        'SELECT config FROM researches WHERE id = ? AND deleted_at IS NULL',
                        [researchId]
                    );
                    if (researchResult.rows.length > 0) {
                        let config: Record<string, unknown> = {};
                        try {
                            const raw = researchResult.rows[0].config;
                            config = typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
                        } catch { config = {}; }

                        const stimuli = (config.stimuli as Array<Record<string, unknown>>) || [];
                        config.stimuli = stimuli.map((s) => {
                            if (s.mediaId === videoMediaId) {
                                return {
                                    ...s,
                                    isVideo: true,
                                    heatmapData: result.accumulatedHeatmapData,
                                    autoPresets: result.autoPresets,
                                    griddedAOIs: result.griddedAOIs,
                                    frames: result.frames,
                                    temporalGrid: result.temporalGrid,
                                    processedAt: new Date().toISOString(),
                                    videoPredictionMeta: {
                                        totalFrames: result.totalFrames,
                                        failedFrames: result.failedFrames,
                                        processingTimeMs: result.processingTimeMs,
                                        fps: 1,
                                    },
                                    predictionError: undefined,
                                    predictionErrorAt: undefined,
                                };
                            }
                            return s;
                        });

                        await pool.query(
                            'UPDATE researches SET config = ? WHERE id = ?',
                            [JSON.stringify(config), researchId]
                        );
                    }
                } catch (err) {
                    console.error('[VideoPrediction] Background error:', err);
                    // Save error state
                    try {
                        const errResult = await pool.query(
                            'SELECT config FROM researches WHERE id = ? AND deleted_at IS NULL',
                            [researchId]
                        );
                        if (errResult.rows.length > 0) {
                            let config: Record<string, unknown> = {};
                            try {
                                const raw = errResult.rows[0].config;
                                config = typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
                            } catch { config = {}; }

                            const stimuli = (config.stimuli as Array<Record<string, unknown>>) || [];
                            config.stimuli = stimuli.map((s) => {
                                if (s.mediaId === videoMediaId) {
                                    return {
                                        ...s,
                                        isVideo: true,
                                        predictionError: err instanceof Error ? err.message : 'Video prediction failed',
                                        predictionErrorAt: new Date().toISOString(),
                                    };
                                }
                                return s;
                            });
                            await pool.query(
                                'UPDATE researches SET config = ? WHERE id = ?',
                                [JSON.stringify(config), researchId]
                            );
                        }
                    } catch { /* best-effort */ }

                    broadcastProgress(jobId, {
                        type: 'error',
                        totalFrames: inputFrames.length,
                        error: err instanceof Error ? err.message : 'Video prediction failed',
                    });
                }

                // Delayed cleanup so SSE connections can drain
                setTimeout(() => removeJob(jobId), 60_000);
            })();

            return success(
                {
                    status: 'processing',
                    jobId,
                    totalFrames: inputFrames.length,
                    estimatedSeconds: inputFrames.length * 5,
                },
                202,
                undefined,
                origin
            );
        }

        return error('Route not found', 404, undefined, origin);
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('[AttentionPrediction] Error:', err);
        return error(errorMessage, 500, undefined, origin);
    }
};
