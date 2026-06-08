import { describe, expect, it } from 'vitest';
import {
    getPresetRadiusScale,
    isPreciseHeatmapProfile,
    resolveHeatmapRadiusPx,
} from '../attentionPrediction.utils';

describe('attentionPrediction P3 — heatmap granularity', () => {
    it('treats Balanced as a refined profile for tighter hotspots', () => {
        expect(isPreciseHeatmapProfile('balanced')).toBe(true);
        expect(isPreciseHeatmapProfile('smooth')).toBe(false);
    });

    it('caps Balanced hotspot radius within refined profile limits', () => {
        const width = 1920;
        const height = 1080;
        const balancedRadius = resolveHeatmapRadiusPx({
            width,
            height,
            visualProfile: 'balanced',
            granularity: 'precise',
            isDense: false,
            isLegacyDense: false,
        });
        const preciseRadius = resolveHeatmapRadiusPx({
            width,
            height,
            visualProfile: 'precise',
            granularity: 'precise',
            isDense: false,
            isLegacyDense: false,
        });

        expect(balancedRadius).toBeLessThanOrEqual(preciseRadius);
        expect(balancedRadius).toBeLessThanOrEqual(Math.floor(Math.sqrt(0.15 * width * height / Math.PI)));
    });

    it('orders preset radius scales: Smooth > Balanced > Lab', () => {
        const smooth = getPresetRadiusScale('Smooth');
        const balanced = getPresetRadiusScale('Balanced');
        const lab = getPresetRadiusScale('Lab');

        expect(smooth).toBeGreaterThan(balanced);
        expect(balanced).toBeGreaterThanOrEqual(lab);
    });
});
