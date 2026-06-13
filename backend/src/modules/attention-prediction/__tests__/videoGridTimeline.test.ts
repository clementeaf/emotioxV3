import { describe, expect, it } from 'vitest';
import {
    computeCellAverage,
    buildGridLabels,
    computeAoiTemporalAttention,
    type AoiTimeRange,
} from '../video-prediction.service';

// ─── computeCellAverage ─────────────────────────────────────────────

describe('computeCellAverage', () => {
    it('computes average of a single cell in a 2x2 grid', () => {
        // 4x4 map, 2x2 grid → each cell is 2x2 pixels
        const map = new Float32Array([
            1, 1, 0, 0,
            1, 1, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 0,
        ]);
        // Top-left cell (row=0, col=0) should average 1.0
        expect(computeCellAverage(map, 4, 4, 0, 0, 2, 2)).toBe(1);
        // Top-right cell (row=0, col=1) should average 0.0
        expect(computeCellAverage(map, 4, 4, 0, 1, 2, 2)).toBe(0);
    });

    it('handles 3x3 grid on a 9x9 map', () => {
        const map = new Float32Array(81); // 9x9, all zeros
        // Fill top-left 3x3 block with 0.9
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                map[r * 9 + c] = 0.9;
            }
        }
        // Cell (0,0) should be 0.9
        expect(computeCellAverage(map, 9, 9, 0, 0, 3, 3)).toBeCloseTo(0.9);
        // Cell (1,1) should be 0
        expect(computeCellAverage(map, 9, 9, 1, 1, 3, 3)).toBe(0);
    });

    it('returns 0 for an empty map', () => {
        const map = new Float32Array(16);
        expect(computeCellAverage(map, 4, 4, 0, 0, 2, 2)).toBe(0);
    });
});

// ─── buildGridLabels ────────────────────────────────────────────────

describe('buildGridLabels', () => {
    it('generates 4 labels for 2x2 grid', () => {
        expect(buildGridLabels(2, 2)).toEqual(['A1', 'B1', 'A2', 'B2']);
    });

    it('generates 9 labels for 3x3 grid', () => {
        const labels = buildGridLabels(3, 3);
        expect(labels).toHaveLength(9);
        expect(labels[0]).toBe('A1');
        expect(labels[4]).toBe('B2');
        expect(labels[8]).toBe('C3');
    });

    it('generates 100 labels for 10x10 grid', () => {
        const labels = buildGridLabels(10, 10);
        expect(labels).toHaveLength(100);
        expect(labels[0]).toBe('A1');
        expect(labels[9]).toBe('J1');
        expect(labels[99]).toBe('J10');
    });

    it('generates correct column letters up to J', () => {
        const labels = buildGridLabels(10, 1);
        expect(labels).toEqual(['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1', 'H1', 'I1', 'J1']);
    });
});

// ─── computeAoiTemporalAttention ────────────────────────────────────

describe('computeAoiTemporalAttention', () => {
    const frames = [
        { timestamp: 0, heatmapData: [{ value: 0.5 }, { value: 0.5 }] },   // sum = 1.0
        { timestamp: 2, heatmapData: [{ value: 0.3 }, { value: 0.7 }] },   // sum = 1.0
        { timestamp: 4, heatmapData: [{ value: 0.8 }, { value: 0.2 }] },   // sum = 1.0
        { timestamp: 6, heatmapData: [{ value: 0.1 }, { value: 0.9 }] },   // sum = 1.0
        { timestamp: 8, heatmapData: [{ value: 0.6 }, { value: 0.4 }] },   // sum = 1.0
    ];

    it('includes all frames when range covers full duration', () => {
        const ranges: AoiTimeRange[] = [{ aoiId: 'aoi-1', startTime: 0, endTime: 10 }];
        const result = computeAoiTemporalAttention(frames, ranges);
        expect(result['aoi-1'].frameCount).toBe(5);
        expect(result['aoi-1'].totalAttention).toBeCloseTo(5.0);
    });

    it('filters frames outside time range', () => {
        const ranges: AoiTimeRange[] = [{ aoiId: 'aoi-1', startTime: 3, endTime: 7 }];
        const result = computeAoiTemporalAttention(frames, ranges);
        // Frames at t=4 and t=6 are in range
        expect(result['aoi-1'].frameCount).toBe(2);
        expect(result['aoi-1'].totalAttention).toBeCloseTo(2.0);
    });

    it('handles multiple AOIs with different ranges', () => {
        const ranges: AoiTimeRange[] = [
            { aoiId: 'aoi-1', startTime: 0, endTime: 3 },  // frames t=0, t=2
            { aoiId: 'aoi-2', startTime: 5, endTime: 9 },  // frames t=6, t=8
        ];
        const result = computeAoiTemporalAttention(frames, ranges);
        expect(result['aoi-1'].frameCount).toBe(2);
        expect(result['aoi-2'].frameCount).toBe(2);
    });

    it('returns 0 frames when range matches no frames', () => {
        const ranges: AoiTimeRange[] = [{ aoiId: 'aoi-1', startTime: 20, endTime: 30 }];
        const result = computeAoiTemporalAttention(frames, ranges);
        expect(result['aoi-1'].frameCount).toBe(0);
        expect(result['aoi-1'].totalAttention).toBe(0);
    });

    it('returns empty object for empty ranges', () => {
        const result = computeAoiTemporalAttention(frames, []);
        expect(Object.keys(result)).toHaveLength(0);
    });

    it('includes boundary frames (startTime and endTime are inclusive)', () => {
        const ranges: AoiTimeRange[] = [{ aoiId: 'aoi-1', startTime: 2, endTime: 4 }];
        const result = computeAoiTemporalAttention(frames, ranges);
        // Frames at t=2 and t=4 — both boundaries included
        expect(result['aoi-1'].frameCount).toBe(2);
    });
});
