import type { ManualAOI } from '../types/attentionPrediction.types';

const MIN_AOI_SIZE = 2;

/**
 * Clamps AOI bounds to valid percentage coordinates (0-100).
 * @param aoi - AOI to clamp
 * @returns AOI with normalized bounds
 */
export function clampAoiBounds(aoi: ManualAOI): ManualAOI {
    const width = Math.max(MIN_AOI_SIZE, Math.min(100, aoi.width));
    const height = Math.max(MIN_AOI_SIZE, Math.min(100, aoi.height));
    const x = Math.max(0, Math.min(100 - width, aoi.x));
    const y = Math.max(0, Math.min(100 - height, aoi.y));
    return { ...aoi, x, y, width, height };
}

/**
 * Returns true when predict/analyze gate is satisfied (D-07).
 * @param aoiCount - Number of manual AOIs defined
 * @param aoiSkipped - User confirmed continuing without zones
 * @returns Whether prediction may run
 */
export function canRunPredictionGate(aoiCount: number, aoiSkipped: boolean): boolean {
    return aoiCount >= 1 || aoiSkipped;
}

/**
 * Returns true when AI analysis may run.
 * @param heatmapPointCount - Points in TranSalNet heatmapData
 * @param aoiCount - Manual AOI count
 * @param aoiSkipped - Skip-AOI flag
 * @returns Whether analysis may run
 */
export function canRunAnalysisGate(
    heatmapPointCount: number,
    aoiCount: number,
    aoiSkipped: boolean,
): boolean {
    return heatmapPointCount > 0 && canRunPredictionGate(aoiCount, aoiSkipped);
}

/**
 * Detects a newly uploaded stimulus without prediction or analysis.
 * @param processedAt - Backend predict timestamp
 * @param hasAiAnalysis - Whether LLM analysis exists
 * @returns True for new stimuli that should open AOI Editor first
 */
export function isNewAttentionStimulus(
    processedAt: string | undefined,
    hasAiAnalysis: boolean,
): boolean {
    return !processedAt && !hasAiAnalysis;
}

/**
 * Normalizes legacy AOI records loaded from settings.
 * @param raw - Stored AOI array
 * @returns Typed manual AOIs with default source
 */
export function normalizeManualAois(raw: unknown): ManualAOI[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
        .map((item) => ({
            id: String(item.id ?? `aoi_${crypto.randomUUID()}`),
            label: String(item.label ?? 'Zona sin nombre'),
            x: Number(item.x) || 0,
            y: Number(item.y) || 0,
            width: Number(item.width) || MIN_AOI_SIZE,
            height: Number(item.height) || MIN_AOI_SIZE,
            source: (item.source as ManualAOI['source']) ?? 'manual',
        }))
        .map(clampAoiBounds);
}
