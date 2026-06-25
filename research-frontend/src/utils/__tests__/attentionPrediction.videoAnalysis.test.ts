import { describe, expect, it } from 'vitest';
import { canRunAnalysisGate, canRunPredictionGate } from '../attentionPrediction.utils';

describe('canRunAnalysisGate — video support', () => {
    it('opens gate when heatmapData exists and AOIs defined', () => {
        expect(canRunAnalysisGate(72, 2, false)).toBe(true);
    });

    it('opens gate when heatmapData exists and AOIs skipped', () => {
        expect(canRunAnalysisGate(72, 0, true)).toBe(true);
    });

    it('blocks gate when no heatmap and no video', () => {
        expect(canRunAnalysisGate(0, 2, false)).toBe(false);
    });

    it('blocks gate when no heatmap, no video, no AOIs', () => {
        expect(canRunAnalysisGate(0, 0, false)).toBe(false);
    });

    it('opens gate when heatmapVideoUrl exists (DINO video) and AOIs defined', () => {
        expect(canRunAnalysisGate(0, 3, false, true)).toBe(true);
    });

    it('opens gate when heatmapVideoUrl exists and AOIs skipped', () => {
        expect(canRunAnalysisGate(0, 0, true, true)).toBe(true);
    });

    it('blocks gate when heatmapVideoUrl exists but no AOIs and not skipped', () => {
        expect(canRunAnalysisGate(0, 0, false, true)).toBe(false);
    });

    it('opens gate when both heatmapData and heatmapVideoUrl exist', () => {
        expect(canRunAnalysisGate(72, 2, false, true)).toBe(true);
    });

    it('defaults hasHeatmapVideo to false (backward compat)', () => {
        // Without the 4th param, behaves same as before
        expect(canRunAnalysisGate(72, 1, false)).toBe(true);
        expect(canRunAnalysisGate(0, 1, false)).toBe(false);
    });
});
