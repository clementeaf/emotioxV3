import { describe, expect, it, vi } from 'vitest';
import {
    computeCellAverage,
    buildGridLabels,
    computeAoiTemporalAttention,
    type AoiTimeRange,
} from '../video-prediction.service';

// ─── computeCellAverage (reused by both TranSalNet and TASED paths) ─

describe('computeCellAverage', () => {
    it('computes average for a uniform map', () => {
        const w = 10;
        const h = 10;
        const map = new Float32Array(w * h).fill(0.5);
        const avg = computeCellAverage(map, w, h, 0, 0, 2, 2);
        expect(avg).toBeCloseTo(0.5);
    });

    it('isolates the correct cell in a grid', () => {
        const w = 4;
        const h = 4;
        const map = new Float32Array(w * h).fill(0);
        // Set top-right cell (row 0, col 1 in a 2x2 grid) to 1.0
        map[2] = 1.0;
        map[3] = 1.0;
        map[6] = 1.0;
        map[7] = 1.0;

        const topLeft = computeCellAverage(map, w, h, 0, 0, 2, 2);
        const topRight = computeCellAverage(map, w, h, 0, 1, 2, 2);
        expect(topLeft).toBeCloseTo(0);
        expect(topRight).toBeCloseTo(1.0);
    });

    it('returns 0 for an empty map', () => {
        const map = new Float32Array(100).fill(0);
        expect(computeCellAverage(map, 10, 10, 0, 0, 5, 5)).toBeCloseTo(0);
    });
});

// ─── buildGridLabels ────────────────────────────────────────────────

describe('buildGridLabels', () => {
    it('generates 2x2 labels', () => {
        expect(buildGridLabels(2, 2)).toEqual(['A1', 'B1', 'A2', 'B2']);
    });

    it('generates 4x4 labels', () => {
        const labels = buildGridLabels(4, 4);
        expect(labels).toHaveLength(16);
        expect(labels[0]).toBe('A1');
        expect(labels[3]).toBe('D1');
        expect(labels[15]).toBe('D4');
    });

    it('handles 1x1 grid', () => {
        expect(buildGridLabels(1, 1)).toEqual(['A1']);
    });
});

// ─── computeAoiTemporalAttention ────────────────────────────────────

describe('computeAoiTemporalAttention', () => {
    const frameResults = [
        { timestamp: 0, heatmapData: [{ value: 0.5 }, { value: 0.3 }] },
        { timestamp: 2, heatmapData: [{ value: 0.8 }] },
        { timestamp: 4, heatmapData: [{ value: 0.2 }, { value: 0.1 }] },
        { timestamp: 6, heatmapData: [{ value: 0.9 }] },
    ];

    it('filters frames within time range', () => {
        const ranges: AoiTimeRange[] = [
            { aoiId: 'zone-1', startTime: 0, endTime: 3 },
        ];
        const result = computeAoiTemporalAttention(frameResults, ranges);
        expect(result['zone-1'].frameCount).toBe(2); // timestamps 0 and 2
    });

    it('sums attention values correctly', () => {
        const ranges: AoiTimeRange[] = [
            { aoiId: 'zone-1', startTime: 0, endTime: 0 },
        ];
        const result = computeAoiTemporalAttention(frameResults, ranges);
        expect(result['zone-1'].totalAttention).toBeCloseTo(0.8); // 0.5 + 0.3
        expect(result['zone-1'].frameCount).toBe(1);
    });

    it('handles multiple AOIs independently', () => {
        const ranges: AoiTimeRange[] = [
            { aoiId: 'a', startTime: 0, endTime: 2 },
            { aoiId: 'b', startTime: 4, endTime: 6 },
        ];
        const result = computeAoiTemporalAttention(frameResults, ranges);
        expect(result['a'].frameCount).toBe(2);
        expect(result['b'].frameCount).toBe(2);
    });

    it('returns 0 for ranges with no matching frames', () => {
        const ranges: AoiTimeRange[] = [
            { aoiId: 'empty', startTime: 10, endTime: 20 },
        ];
        const result = computeAoiTemporalAttention(frameResults, ranges);
        expect(result['empty'].totalAttention).toBe(0);
        expect(result['empty'].frameCount).toBe(0);
    });
});
