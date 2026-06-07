import type { ManualAOI } from '../types/attentionPrediction.types';
import type { AiAnalysisResult } from '../types/aiAnalysis.types';

const MIN_AOI_SIZE = 2;
const IOU_OVERLAP_HIDE = 0.15;
const IOU_CATEGORY_MATCH = 0.35;

type PercentAoi = Pick<ManualAOI, 'x' | 'y' | 'width' | 'height'>;
type AutoAoi = AiAnalysisResult['autoAois'][number];

/** Max display height for stimulus images/heatmaps in Attention Prediction card */
export const STIMULUS_VIEWPORT_MAX_HEIGHT_CLASS = 'max-h-[calc(100vh-280px)]';

/** Default media fit — shrink-wraps to image aspect ratio for aligned overlays */
export const STIMULUS_MEDIA_FIT_CLASS =
    'block max-w-full max-h-[calc(100vh-280px)] w-auto h-auto object-contain';

/** Media fit inside a flex viewport — scales down only, never causes page scroll */
export const STIMULUS_MEDIA_FIT_FLEX_CLASS =
    'block max-h-full max-w-full w-auto h-auto object-contain';

/** Gaze Paths — extra chrome for route toolbar (~80px) */
export const STIMULUS_GAZE_MEDIA_FIT_CLASS =
    'block max-w-full max-h-[calc(100vh-360px)] w-auto h-auto object-contain';

/** Heatmap tab — layer bar + preset sliders (~60px extra) */
export const STIMULUS_HEATMAP_MEDIA_FIT_CLASS =
    'block max-w-full max-h-[calc(100vh-340px)] w-auto h-auto object-contain';

/** AOI Editor — workflow bar + toolbar + layer bar (~120px extra) */
export const STIMULUS_AOI_MEDIA_FIT_CLASS =
    'block max-w-full max-h-[calc(100vh-420px)] w-auto h-auto object-contain';

export type StimulusMediaTab = 'original' | 'heatmap' | 'gaze-paths' | 'aoi-editor';

/** Viewport chrome subtracted from 100vh per tab (px) */
const STIMULUS_TAB_HEIGHT_OFFSET: Record<StimulusMediaTab, number> = {
    original: 280,
    heatmap: 340,
    'gaze-paths': 360,
    'aoi-editor': 420,
};

export interface StimulusDisplaySize {
    width: number;
    height: number;
}

/**
 * Computes display dimensions fitting natural size inside max bounds without upscaling.
 * @param naturalWidth - Source image width in pixels
 * @param naturalHeight - Source image height in pixels
 * @param maxWidth - Available container width in pixels
 * @param maxHeight - Available max height in pixels
 * @returns Scaled width and height for on-screen display
 */
export function computeStimulusDisplaySize(
    naturalWidth: number,
    naturalHeight: number,
    maxWidth: number,
    maxHeight: number,
): StimulusDisplaySize {
    if (naturalWidth <= 0 || naturalHeight <= 0 || maxWidth <= 0 || maxHeight <= 0) {
        return { width: 0, height: 0 };
    }
    const scale = Math.min(1, maxWidth / naturalWidth, maxHeight / naturalHeight);
    return {
        width: Math.round(naturalWidth * scale),
        height: Math.round(naturalHeight * scale),
    };
}

/**
 * Returns max display height in pixels for the active Attention Prediction tab.
 * @param tab - Active viewer tab
 * @returns Max height available for stimulus media
 */
export function getStimulusMaxHeightPx(tab: StimulusMediaTab): number {
    const offset = STIMULUS_TAB_HEIGHT_OFFSET[tab];
    if (typeof window === 'undefined') {
        return 600;
    }
    return Math.max(200, window.innerHeight - offset);
}

/**
 * Returns media fit classes for the active Attention Prediction tab.
 * Uses max-w-full + w-auto so images never upscale beyond natural size.
 * @param tab - Active viewer tab
 * @returns Tailwind class string for stimulus media sizing
 */
export function resolveStimulusMediaFitClass(tab: StimulusMediaTab): string {
    switch (tab) {
        case 'gaze-paths':
            return STIMULUS_GAZE_MEDIA_FIT_CLASS;
        case 'aoi-editor':
            return STIMULUS_AOI_MEDIA_FIT_CLASS;
        case 'heatmap':
            return STIMULUS_HEATMAP_MEDIA_FIT_CLASS;
        default:
            return STIMULUS_MEDIA_FIT_CLASS;
    }
}

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

/**
 * Computes intersection-over-union for two percentage bounding boxes.
 * @param a - First AOI
 * @param b - Second AOI
 * @returns IoU value between 0 and 1
 */
function computeAoiIoU(a: PercentAoi, b: PercentAoi): number {
    const x1 = Math.max(a.x, b.x);
    const y1 = Math.max(a.y, b.y);
    const x2 = Math.min(a.x + a.width, b.x + b.width);
    const y2 = Math.min(a.y + a.height, b.y + b.height);
    if (x2 <= x1 || y2 <= y1) return 0;
    const intersection = (x2 - x1) * (y2 - y1);
    const union = a.width * a.height + b.width * b.height - intersection;
    return union > 0 ? intersection / union : 0;
}

/**
 * Normalizes an AOI label for fuzzy comparison.
 * @param label - Raw label string
 * @returns Lowercase trimmed label
 */
function normalizeAoiLabel(label: string): string {
    return label.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Returns true when two AOI labels refer to the same region.
 * @param a - First label
 * @param b - Second label
 * @returns Whether labels are similar enough to treat as the same AOI
 */
function aoiLabelsSimilar(a: string, b: string): boolean {
    const na = normalizeAoiLabel(a);
    const nb = normalizeAoiLabel(b);
    if (na === nb) return true;
    if (na.includes(nb) || nb.includes(na)) return true;

    const tokensA = new Set(na.split(/\s+/).filter((w) => w.length > 2));
    const tokensB = new Set(nb.split(/\s+/).filter((w) => w.length > 2));
    if (tokensA.size === 0 || tokensB.size === 0) return false;

    let shared = 0;
    for (const token of tokensA) {
        if (tokensB.has(token)) shared += 1;
    }
    const unionSize = new Set([...tokensA, ...tokensB]).size;
    return shared / unionSize >= 0.5;
}

/**
 * Maps an AOI label to a coarse semantic category for conflict detection.
 * @param label - AOI label
 * @returns Category id or null when unknown
 */
function getAoiSemanticCategory(label: string): string | null {
    const normalized = normalizeAoiLabel(label);
    if (/\b(logo|brand|emblem|mark)\b/.test(normalized)) return 'logo';
    if (/\b(text|copy|headline|title|tagline|label|wording|name|slogan|blend)\b/.test(normalized)) {
        return 'text';
    }
    if (/\b(product|pack|packaging|bottle|box|item)\b/.test(normalized)) return 'product';
    if (/\b(price|cta|button|call.?to.?action|buy|shop)\b/.test(normalized)) return 'cta';
    if (/\b(image|photo|picture|illustration|icon)\b/.test(normalized)) return 'visual';
    return null;
}

/**
 * Returns true when a point lies inside a percentage bounding box.
 * @param x - X coordinate in percent
 * @param y - Y coordinate in percent
 * @param aoi - Bounding box
 * @returns Whether the point is inside the box
 */
function pointInsideAoi(x: number, y: number, aoi: PercentAoi): boolean {
    return x >= aoi.x && x <= aoi.x + aoi.width && y >= aoi.y && y <= aoi.y + aoi.height;
}

/**
 * Hides or corrects AI-detected AOIs that contradict user-defined manual zones.
 * Manual AOIs win on overlap; matching labels snap to manual bounding boxes.
 * @param manualAois - User-defined AOIs
 * @param autoAois - AI-detected AOIs from analysis
 * @returns Filtered and corrected auto AOIs safe to display
 */
export function reconcileAutoAoisWithManual<T extends AutoAoi>(
    manualAois: ManualAOI[],
    autoAois: T[],
): T[] {
    if (!manualAois.length || !autoAois.length) return autoAois;

    const reconciled: T[] = [];

    for (const auto of autoAois) {
        let include = true;
        let corrected: T | undefined;

        const centerX = auto.x + auto.width / 2;
        const centerY = auto.y + auto.height / 2;
        const autoCategory = getAoiSemanticCategory(auto.label);

        for (const manual of manualAois) {
            const iou = computeAoiIoU(auto, manual);

            if (aoiLabelsSimilar(auto.label, manual.label)) {
                corrected = {
                    ...auto,
                    x: manual.x,
                    y: manual.y,
                    width: manual.width,
                    height: manual.height,
                };
                include = true;
                break;
            }

            if (iou > IOU_OVERLAP_HIDE) {
                include = false;
                break;
            }

            if (pointInsideAoi(centerX, centerY, manual)) {
                include = false;
                break;
            }

            const manualCategory = getAoiSemanticCategory(manual.label);
            if (
                autoCategory !== null &&
                autoCategory === manualCategory &&
                iou < IOU_CATEGORY_MATCH
            ) {
                include = false;
                break;
            }
        }

        if (include) {
            reconciled.push(corrected ?? auto);
        }
    }

    return reconciled;
}
