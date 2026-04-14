/**
 * Attention Prediction Controller
 * Handles HTTP routes for visual saliency prediction.
 * Uses fire-and-forget pattern to avoid proxy timeout (LiteSpeed ~10s).
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, error } from '../../utils/response';
import { requireAuth } from '../../utils/auth.local';
import { getRequestOrigin } from '../../utils/request';
import { predictAttention } from './attention-prediction.service';
import { getMediaPath } from '../../config/local-storage';
import pool from '../../config/database';

/**
 * Runs prediction in background and saves result to research config.
 * Does NOT block the HTTP response.
 */
const runPredictionAsync = async (
    researchId: string,
    mediaId: string,
    imagePath: string,
    threshold: number
): Promise<void> => {
    try {
        console.log(`[AttentionPrediction] Starting async prediction for media ${mediaId}...`);
        const heatmapData = await predictAttention(imagePath, threshold);

        // Read current config
        const researchResult = await pool.query(
            'SELECT config FROM researches WHERE id = ? AND deleted_at IS NULL',
            [researchId]
        );
        if (researchResult.rows.length === 0) {
            console.error(`[AttentionPrediction] Research ${researchId} not found after prediction`);
            return;
        }

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
                return { ...s, heatmapData, processedAt: new Date().toISOString() };
            }
            return s;
        });

        config.stimuli = updatedStimuli;

        await pool.query(
            'UPDATE researches SET config = ? WHERE id = ?',
            [JSON.stringify(config), researchId]
        );

        console.log(`[AttentionPrediction] Done: ${heatmapData.length} points saved for media ${mediaId}`);
    } catch (err) {
        console.error(`[AttentionPrediction] Async prediction failed for media ${mediaId}:`, err);
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
        console.log(`[AttentionPrediction] Starting prediction for module ${moduleId}${imageKey ? ` image ${imageKey}` : ''}...`);
        const heatmapData = await predictAttention(imagePath, threshold);

        const moduleResult = await pool.query('SELECT config FROM modules WHERE id = ?', [moduleId]);
        if (moduleResult.rows.length === 0) {
            console.error(`[AttentionPrediction] Module ${moduleId} not found after prediction`);
            return;
        }

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

        console.log(`[AttentionPrediction] Done: ${heatmapData.length} points saved for module ${moduleId}${imageKey ? ` image ${imageKey}` : ''}`);
    } catch (err) {
        console.error(`[AttentionPrediction] Prediction failed for module ${moduleId}:`, err);
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
        // Responds immediately, processes in background
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

            // Fire and forget — don't await
            void runPredictionAsync(researchId, mediaId, imagePath, threshold);

            return success(
                {
                    status: 'processing',
                    mediaId,
                    message: 'Prediction started. Results will be available shortly.',
                },
                202,
                undefined,
                origin
            );
        }

        // GET /attention-prediction/research/:researchId/status/:mediaId
        // Check if prediction is complete for a stimulus
        const statusMatch = path.match(
            /^\/attention-prediction\/research\/([^/]+)\/status\/([^/]+)$/
        );
        if (statusMatch && httpMethod === 'GET') {
            const researchId = statusMatch[1];
            const mediaId = statusMatch[2];

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

            if (!stimulus) {
                return error('Stimulus not found', 404, undefined, origin);
            }

            const heatmapData = stimulus.heatmapData as Array<unknown> | undefined;
            const ready = heatmapData && heatmapData.length > 0;

            return success(
                {
                    mediaId,
                    status: ready ? 'complete' : 'processing',
                    pointCount: ready ? heatmapData.length : 0,
                    processedAt: stimulus.processedAt || null,
                },
                200,
                undefined,
                origin
            );
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

            if (imageIndex !== undefined) {
                // Multi-image: predict specific image (Navigation Flow)
                if (imageIndex < 0 || imageIndex >= files.length) {
                    return error(`imageIndex ${imageIndex} out of range (0-${files.length - 1})`, 400, undefined, origin);
                }
                const file = files[imageIndex];
                const s3Key = file.s3Key || file.url || '';
                if (!s3Key) return error('Image has no s3Key', 400, undefined, origin);
                const imageKey = file.id || file.mediaId || String(imageIndex);
                void runModulePredictionAsync(moduleId, getMediaPath(s3Key), threshold, imageKey);
            } else {
                // Single image (Eye Tracking) — use first file
                const s3Key = files[0].s3Key || files[0].url || '';
                if (!s3Key) return error('No stimulus image found', 400, undefined, origin);
                void runModulePredictionAsync(moduleId, getMediaPath(s3Key), threshold);
            }

            return success(
                { status: 'processing', moduleId, message: 'Prediction started.' },
                202,
                undefined,
                origin
            );
        }

        // GET /attention-prediction/research/:researchId/module/:moduleId/status
        // Check if prediction is complete for an Eye Tracking module
        const moduleStatusMatch = path.match(
            /^\/attention-prediction\/research\/([^/]+)\/module\/([^/]+)\/status$/
        );
        if (moduleStatusMatch && httpMethod === 'GET') {
            const researchId = moduleStatusMatch[1];
            const moduleId = moduleStatusMatch[2];

            const moduleResult = await pool.query(
                'SELECT config FROM modules WHERE id = ? AND research_id = ?',
                [moduleId, researchId]
            );
            if (moduleResult.rows.length === 0) {
                return error('Module not found', 404, undefined, origin);
            }

            let moduleConfig: Record<string, unknown> = {};
            try {
                const raw = moduleResult.rows[0].config;
                moduleConfig = typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
            } catch { moduleConfig = {}; }

            // Single-image prediction (Eye Tracking)
            const heatmapData = moduleConfig.predictionHeatmap as Array<unknown> | undefined;
            const singleReady = heatmapData && heatmapData.length > 0;

            // Multi-image predictions (Navigation Flow)
            const predictionHeatmaps = moduleConfig.predictionHeatmaps as Record<string, { heatmapData: unknown[]; processedAt: string }> | undefined;
            const multiImages = predictionHeatmaps ? Object.entries(predictionHeatmaps).map(([imageKey, data]) => ({
                imageKey,
                pointCount: Array.isArray(data.heatmapData) ? data.heatmapData.length : 0,
                processedAt: data.processedAt || null,
            })) : [];

            const anyReady = singleReady || multiImages.some(i => i.pointCount > 0);

            return success(
                {
                    moduleId,
                    status: anyReady ? 'complete' : 'processing',
                    pointCount: singleReady ? heatmapData.length : 0,
                    processedAt: (moduleConfig.predictionProcessedAt as string) || null,
                    images: multiImages.length > 0 ? multiImages : undefined,
                },
                200,
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
