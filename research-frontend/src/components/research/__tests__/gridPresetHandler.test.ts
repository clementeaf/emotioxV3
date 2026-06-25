import { describe, it, expect } from 'vitest';
import { generateGridAois } from '../../../utils/gridAoiGenerator';
import type { ManualAOI } from '../../../types/attentionPrediction.types';

/**
 * Tests for the grid preset handler logic used in AttentionPredictionCard.
 * Mirrors the handleGridPresetChange callback: generating grid AOIs,
 * replacing existing, and switching back to manual mode.
 */

describe('Grid preset handler logic', () => {
    const makeManualAoi = (id: string): ManualAOI => ({
        id, label: `Manual ${id}`, x: 10, y: 10, width: 20, height: 20, source: 'manual',
    });

    it('generates 9 AOIs for 3x3 preset', () => {
        const result = generateGridAois(3, 3);
        expect(result).toHaveLength(9);
        expect(result.every(a => a.source === 'imported-grid')).toBe(true);
    });

    it('generates 25 AOIs for 5x5 preset', () => {
        const result = generateGridAois(5, 5);
        expect(result).toHaveLength(25);
    });

    it('grid AOIs replace existing manual AOIs', () => {
        const existing: ManualAOI[] = [makeManualAoi('m1'), makeManualAoi('m2')];
        // Simulates the handler: preset replaces all
        const gridAois = generateGridAois(3, 3);
        // Handler sets aoiList to gridAois, discarding existing
        expect(gridAois).toHaveLength(9);
        expect(gridAois.find(a => a.id === 'm1')).toBeUndefined();
        expect(existing).toHaveLength(2); // original untouched (immutable)
    });

    it('switching to Manual clears grid AOIs, keeps manual ones', () => {
        const mixed: ManualAOI[] = [
            makeManualAoi('m1'),
            ...generateGridAois(3, 3),
            makeManualAoi('m2'),
        ];
        // Simulates "Manual" preset: filter out grid AOIs
        const manualOnly = mixed.filter(a => a.source !== 'imported-grid');
        expect(manualOnly).toHaveLength(2);
        expect(manualOnly.map(a => a.id)).toEqual(['m1', 'm2']);
    });

    it('grid AOIs have unique IDs', () => {
        const aois = generateGridAois(5, 5);
        const ids = new Set(aois.map(a => a.id));
        expect(ids.size).toBe(25);
    });

    it('grid AOIs cover full 100x100 area', () => {
        const aois = generateGridAois(3, 3);
        const totalArea = aois.reduce((sum, a) => sum + a.width * a.height, 0);
        expect(totalArea).toBeCloseTo(10000);
    });

    it('grid AOIs include timeRange when videoDuration provided', () => {
        const aois = generateGridAois(3, 3, 30);
        for (const aoi of aois) {
            expect(aoi.timeRange).toEqual({ startTime: 0, endTime: 30 });
        }
    });

    it('grid AOIs omit timeRange when no videoDuration', () => {
        const aois = generateGridAois(3, 3);
        for (const aoi of aois) {
            expect(aoi.timeRange).toBeUndefined();
        }
    });

    it('switching presets is idempotent — same preset always gives same count', () => {
        const first = generateGridAois(5, 5);
        const second = generateGridAois(5, 5);
        expect(first).toHaveLength(second.length);
        expect(first.map(a => a.label)).toEqual(second.map(a => a.label));
    });
});
