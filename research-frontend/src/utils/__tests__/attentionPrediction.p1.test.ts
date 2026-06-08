import { describe, expect, it } from 'vitest';
import {
    computeAoiAttentionShare,
    isLegacyAttentionStimulus,
    isNewAttentionStimulus,
    sanitizeAutoAoiBounds,
} from '../attentionPrediction.utils';

describe('attentionPrediction P1 — AOI-first flow helpers', () => {
    it('isNewAttentionStimulus is true only without predict and without analysis', () => {
        expect(isNewAttentionStimulus(undefined, false)).toBe(true);
        expect(isNewAttentionStimulus('2026-06-07', false)).toBe(false);
        expect(isNewAttentionStimulus(undefined, true)).toBe(false);
    });

    it('isLegacyAttentionStimulus flags pre-AOI-first results', () => {
        expect(isLegacyAttentionStimulus(undefined, 0, true, 0, false)).toBe(true);
        expect(isLegacyAttentionStimulus('2026-06-07', 72, true, 0, false)).toBe(true);
        expect(isLegacyAttentionStimulus('2026-06-07', 72, true, 2, false)).toBe(false);
        expect(isLegacyAttentionStimulus('2026-06-07', 72, true, 0, true)).toBe(false);
        expect(isLegacyAttentionStimulus('2026-06-07', 72, false, 0, false)).toBe(false);
    });

    it('computeAoiAttentionShare uses saliency weights, not point count', () => {
        const heatmapData = [
            { x: 50, y: 50, value: 0.9 },
            { x: 10, y: 10, value: 0.1 },
            { x: 90, y: 90, value: 0.1 },
        ];
        const aoi = { x: 40, y: 40, width: 20, height: 20 };

        expect(computeAoiAttentionShare(aoi, heatmapData)).toBe(82);
    });

    it('computeAoiAttentionShare falls back to nearest hotspot for sparse maps', () => {
        const heatmapData = [
            { x: 48, y: 52, value: 0.8 },
            { x: 5, y: 5, value: 0.1 },
        ];
        const aoi = { x: 45, y: 45, width: 10, height: 10 };

        expect(computeAoiAttentionShare(aoi, heatmapData)).toBeGreaterThan(0);
    });

    it('sanitizeAutoAoiBounds clamps invalid LLM coordinates', () => {
        const sanitized = sanitizeAutoAoiBounds({
            label: 'Logo',
            x: -5,
            y: 110,
            width: 200,
            height: 1,
            attentionLevel: 'high',
            description: 'test',
        });

        expect(sanitized.x).toBeGreaterThanOrEqual(0);
        expect(sanitized.y).toBeLessThanOrEqual(98);
        expect(sanitized.width).toBeGreaterThanOrEqual(2);
        expect(sanitized.height).toBeGreaterThanOrEqual(2);
        expect(sanitized.lowConfidence).toBe(true);
    });
});
