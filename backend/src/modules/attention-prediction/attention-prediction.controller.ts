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

export const handleAttentionPredictionRoutes = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    const { httpMethod, path } = event;
    const origin = getRequestOrigin(event);

    try {
        const user = await requireAuth(event);

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

        return error('Route not found', 404, undefined, origin);
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('[AttentionPrediction] Error:', err);
        return error(errorMessage, 500, undefined, origin);
    }
};
