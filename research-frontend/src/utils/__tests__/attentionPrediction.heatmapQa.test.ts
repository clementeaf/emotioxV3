import { describe, expect, it } from 'vitest';
import {
    ACTIVE_HEATMAP_MAP_MODES,
    MAX_HOTSPOT_FRAME_COVERAGE,
    countSpotlightRevealZones,
    getPresetRadiusScale,
    isFullFrameMapMode,
    isLegacyDenseHeatmap,
    maxHotspotRadiusPx,
    resolveHeatmapRadiusPx,
} from '../attentionPrediction.utils';

describe('attentionPrediction heatmap QA helpers', () => {
    it('caps Lab/Precise radius to 15% frame coverage', () => {
        const width = 1920;
        const height = 1080;
        const maxR = maxHotspotRadiusPx(width, height);
        const labRadius = resolveHeatmapRadiusPx({
            width,
            height,
            visualProfile: 'lab',
            granularity: 'precise',
            isDense: false,
            isLegacyDense: false,
        });

        expect(MAX_HOTSPOT_FRAME_COVERAGE).toBe(0.15);
        expect(labRadius).toBeLessThanOrEqual(maxR);
        expect(Math.PI * labRadius * labRadius).toBeLessThanOrEqual(
            MAX_HOTSPOT_FRAME_COVERAGE * width * height * 1.05,
        );
    });

    it('uses wider radius for Smooth than Lab when data is dense', () => {
        const width = 1920;
        const height = 1080;
        const labRadius = resolveHeatmapRadiusPx({
            width,
            height,
            visualProfile: 'lab',
            granularity: 'precise',
            isDense: true,
            isLegacyDense: false,
        });
        const smoothRadius = resolveHeatmapRadiusPx({
            width,
            height,
            visualProfile: 'smooth',
            granularity: 'smooth',
            isDense: true,
            isLegacyDense: false,
        });

        expect(smoothRadius).toBeGreaterThan(labRadius);
    });

    it('orders preset radius scales: Smooth > Balanced >= Lab', () => {
        const smooth = getPresetRadiusScale('Smooth');
        const balanced = getPresetRadiusScale('Balanced');
        const lab = getPresetRadiusScale('Lab');

        expect(smooth).toBeGreaterThan(balanced);
        expect(balanced).toBeGreaterThanOrEqual(lab);
    });

    it('flags legacy dense heatmaps above 600 points', () => {
        expect(isLegacyDenseHeatmap(601)).toBe(true);
        expect(isLegacyDenseHeatmap(500)).toBe(false);
    });

    it('counts spotlight reveal zones from saliency points', () => {
        const points = [
            { value: 0.95 },
            { value: 0.82 },
            { value: 0.71 },
            { value: 0.4 },
        ];

        expect(countSpotlightRevealZones(points, 58)).toBe(3);
        expect(countSpotlightRevealZones(points, 80)).toBe(2);
    });

    it('exposes all three map modes for QA checklist', () => {
        expect(ACTIVE_HEATMAP_MAP_MODES).toEqual(['classic', 'spotlight', 'cold']);
    });

    it('treats spotlight and cold as full-frame overlay modes', () => {
        expect(isFullFrameMapMode('spotlight')).toBe(true);
        expect(isFullFrameMapMode('cold')).toBe(true);
        expect(isFullFrameMapMode('classic')).toBe(false);
    });
});
