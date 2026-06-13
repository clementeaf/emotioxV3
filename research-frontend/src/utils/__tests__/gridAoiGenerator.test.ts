import { describe, it, expect } from 'vitest';
import { generateGridAois } from '../gridAoiGenerator';

describe('generateGridAois', () => {
    it('generates 9 AOIs for a 3x3 grid', () => {
        const aois = generateGridAois(3, 3);
        expect(aois).toHaveLength(9);
    });

    it('generates 25 AOIs for a 5x5 grid', () => {
        const aois = generateGridAois(5, 5);
        expect(aois).toHaveLength(25);
    });

    it('generates 100 AOIs for a 10x10 grid', () => {
        const aois = generateGridAois(10, 10);
        expect(aois).toHaveLength(100);
    });

    it('produces correct bounds for 3x3', () => {
        const aois = generateGridAois(3, 3);
        const cellW = 100 / 3;
        const cellH = 100 / 3;

        // First cell A1
        expect(aois[0].x).toBeCloseTo(0);
        expect(aois[0].y).toBeCloseTo(0);
        expect(aois[0].width).toBeCloseTo(cellW);
        expect(aois[0].height).toBeCloseTo(cellH);

        // Last cell C3
        const last = aois[8];
        expect(last.x).toBeCloseTo(2 * cellW);
        expect(last.y).toBeCloseTo(2 * cellH);
        expect(last.width).toBeCloseTo(cellW);
        expect(last.height).toBeCloseTo(cellH);
    });

    it('labels cells correctly (column letter + row number)', () => {
        const aois = generateGridAois(3, 3);
        const labels = aois.map(a => a.label);
        expect(labels).toEqual([
            'A1', 'B1', 'C1',
            'A2', 'B2', 'C2',
            'A3', 'B3', 'C3',
        ]);
    });

    it('all AOIs have source imported-grid', () => {
        const aois = generateGridAois(5, 5);
        for (const aoi of aois) {
            expect(aoi.source).toBe('imported-grid');
        }
    });

    it('sets timeRange when videoDuration is provided', () => {
        const aois = generateGridAois(3, 3, 30);
        for (const aoi of aois) {
            expect(aoi.timeRange).toEqual({ startTime: 0, endTime: 30 });
        }
    });

    it('omits timeRange when videoDuration is not provided', () => {
        const aois = generateGridAois(3, 3);
        for (const aoi of aois) {
            expect(aoi.timeRange).toBeUndefined();
        }
    });

    it('clamps cols and rows to 2-10 range', () => {
        expect(generateGridAois(1, 1)).toHaveLength(4);   // clamped to 2x2
        expect(generateGridAois(15, 15)).toHaveLength(100); // clamped to 10x10
    });

    it('cells cover the full 100x100 space without gaps', () => {
        const aois = generateGridAois(4, 3);
        const totalArea = aois.reduce((sum, a) => sum + a.width * a.height, 0);
        expect(totalArea).toBeCloseTo(10000); // 100 * 100
    });
});
