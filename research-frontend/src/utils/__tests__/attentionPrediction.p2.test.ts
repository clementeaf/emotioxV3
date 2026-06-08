import { describe, expect, it } from 'vitest';
import { anchorGazePathToHeatmap } from '../attentionPrediction.utils';

describe('attentionPrediction P2 — gaze path anchoring', () => {
    it('snaps fixations toward nearby heatmap hotspots', () => {
        const fixations = [
            { order: 1, x: 12, y: 10, label: 'Logo', duration: 'brief' },
            { order: 2, x: 55, y: 48, label: 'Hero', duration: 'long' },
        ];
        const heatmapData = [
            { x: 15, y: 12, value: 0.9 },
            { x: 50, y: 50, value: 0.85 },
            { x: 90, y: 90, value: 0.2 },
        ];

        const anchored = anchorGazePathToHeatmap(fixations, heatmapData);

        expect(anchored[0].x).toBeGreaterThan(12);
        expect(anchored[0].y).toBeGreaterThan(10);
        expect(Math.hypot(anchored[1].x - 50, anchored[1].y - 50)).toBeLessThan(8);
    });

    it('applies deterministic jitter when no hotspot is nearby', () => {
        const fixations = [
            { order: 1, x: 50, y: 50, label: 'Center', duration: 'moderate' },
        ];
        const heatmapData = [
            { x: 5, y: 5, value: 0.9 },
            { x: 95, y: 95, value: 0.8 },
        ];

        const anchored = anchorGazePathToHeatmap(fixations, heatmapData);

        expect(anchored[0].x).not.toBe(50);
        expect(anchored[0].y).not.toBe(50);
        expect(anchored[0].order).toBe(1);
    });

    it('preserves fixation order and labels', () => {
        const fixations = [
            { order: 1, x: 20, y: 20, label: 'A', duration: 'brief' },
            { order: 2, x: 40, y: 40, label: 'B', duration: 'moderate' },
            { order: 3, x: 60, y: 60, label: 'C', duration: 'long' },
        ];
        const heatmapData = [
            { x: 22, y: 18, value: 0.7 },
            { x: 42, y: 38, value: 0.75 },
            { x: 58, y: 62, value: 0.8 },
        ];

        const anchored = anchorGazePathToHeatmap(fixations, heatmapData);

        expect(anchored.map((f) => f.order)).toEqual([1, 2, 3]);
        expect(anchored.map((f) => f.label)).toEqual(['A', 'B', 'C']);
    });
});
