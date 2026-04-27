/**
 * Attention Prediction Controller
 * Handles HTTP routes for visual saliency prediction.
 * Synchronous — awaits TranSalNet inference and returns result directly.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, error } from '../../utils/response';
import { requireAuth } from '../../utils/auth.local';
import { getRequestOrigin } from '../../utils/request';
import { predictAttention } from './attention-prediction.service';
import { analyzeAttentionWithAI } from './ai-analysis.service';
import { getMediaPath } from '../../config/local-storage';
import pool from '../../config/database';

/**
 * Runs prediction and saves result to research config.
 * On failure, saves error state to the stimulus entry and re-throws.
 */
const runPredictionAsync = async (
    researchId: string,
    mediaId: string,
    imagePath: string,
    threshold: number
): Promise<void> => {
    try {
        const heatmapData = await predictAttention(imagePath, threshold);

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

        // Merge heatmapData into the matching stimulus
        const stimuli = (config.stimuli as Array<Record<string, unknown>>) || [];
        const updatedStimuli = stimuli.map((s) => {
            if (s.mediaId === mediaId) {
                return {
                    ...s,
                    heatmapData,
                    processedAt: new Date().toISOString(),
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
        const heatmapData = await predictAttention(imagePath, threshold);

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
            predictions[imageKey] = { heatmapData, processedAt: new Date().toISOString() };
            config.predictionHeatmaps = predictions;
        } else {
            // Single stimulus (Eye Tracking)
            config.predictionHeatmap = heatmapData;
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
        // Synchronous — awaits prediction and returns result
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

            const body = event.body ? JSON.parse(event.body) : {};
            const threshold = typeof body.threshold === 'number' ? body.threshold : 0.3;

            // Synchronous — await result and return directly
            try {
                await runPredictionAsync(researchId, mediaId, imagePath, threshold);
                return success(
                    { status: 'complete', mediaId },
                    200,
                    undefined,
                    origin
                );
            } catch (predErr) {
                const msg = predErr instanceof Error ? predErr.message : 'Prediction failed';
                return error(msg, 500, undefined, origin);
            }
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
            const threshold = typeof body.threshold === 'number' ? body.threshold : 0.3;
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
        // GPT-4o Vision analysis of visual attention (requires prediction first)
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

            if (heatmapData.length === 0) {
                return error('Run prediction first — no heatmap data available', 400, undefined, origin);
            }

            try {
                const analysis = await analyzeAttentionWithAI(imagePath, heatmapData, fileName);

                // Save to stimulus.aiAnalysis
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
                        return {
                            ...s,
                            aiAnalysis: analysis,
                            aiAnalysisError: undefined,
                            aiAnalysisErrorAt: undefined,
                        };
                    }
                    return s;
                });

                await pool.query(
                    'UPDATE researches SET config = ? WHERE id = ?',
                    [JSON.stringify(freshConfig), researchId]
                );

                return success({ analysis, status: 'complete' }, 200, undefined, origin);
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'AI analysis failed';
                console.error('[AI Analysis] Error:', err);

                // Save error state
                try {
                    const errResult = await pool.query(
                        'SELECT config FROM researches WHERE id = ? AND deleted_at IS NULL',
                        [researchId]
                    );
                    if (errResult.rows.length > 0) {
                        let errConfig: Record<string, unknown> = {};
                        try {
                            const raw = errResult.rows[0].config;
                            errConfig = typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
                        } catch { errConfig = {}; }

                        const errStimuli = (errConfig.stimuli as Array<Record<string, unknown>>) || [];
                        errConfig.stimuli = errStimuli.map((s) => {
                            if (s.mediaId === mediaId) {
                                return {
                                    ...s,
                                    aiAnalysisError: msg,
                                    aiAnalysisErrorAt: new Date().toISOString(),
                                };
                            }
                            return s;
                        });

                        await pool.query(
                            'UPDATE researches SET config = ? WHERE id = ?',
                            [JSON.stringify(errConfig), researchId]
                        );
                    }
                } catch {
                    // Best-effort error save
                }

                return error(msg, 500, undefined, origin);
            }
        }

        return error('Route not found', 404, undefined, origin);
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('[AttentionPrediction] Error:', err);
        return error(errorMessage, 500, undefined, origin);
    }
};
