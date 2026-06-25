import { describe, expect, it } from 'vitest';
import { canRunAnalysisGate, isLegacyAttentionStimulus } from '../attentionPrediction.utils';

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

describe('isLegacyAttentionStimulus — video support', () => {
    it('not legacy when no AI analysis', () => {
        expect(isLegacyAttentionStimulus('2026-06-25', 0, false, 2, false, true)).toBe(false);
    });

    it('legacy when AI analysis exists but no heatmap and no video', () => {
        expect(isLegacyAttentionStimulus('2026-06-25', 0, true, 2, false, false)).toBe(true);
    });

    it('NOT legacy when AI analysis exists with heatmapVideoUrl (DINO video)', () => {
        expect(isLegacyAttentionStimulus('2026-06-25', 0, true, 2, false, true)).toBe(false);
    });

    it('NOT legacy when AI analysis exists with heatmapData (image)', () => {
        expect(isLegacyAttentionStimulus('2026-06-25', 72, true, 2, false, false)).toBe(false);
    });

    it('legacy when no processedAt even with video', () => {
        expect(isLegacyAttentionStimulus(undefined, 0, true, 2, false, true)).toBe(true);
    });

    it('backward compat: 5 args still works', () => {
        expect(isLegacyAttentionStimulus('2026-06-25', 0, true, 2, false)).toBe(true);
        expect(isLegacyAttentionStimulus('2026-06-25', 72, true, 2, false)).toBe(false);
    });
});
