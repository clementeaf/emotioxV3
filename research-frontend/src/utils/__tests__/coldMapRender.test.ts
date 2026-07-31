import { describe, it, expect } from 'vitest';
import { COLD_MAP_GRADIENT } from '../coldMapRender';

// ---------------------------------------------------------------------------
// COLD_MAP_GRADIENT
// ---------------------------------------------------------------------------

describe('COLD_MAP_GRADIENT', () => {
    it('has exactly 4 color stops', () => {
        const keys = Object.keys(COLD_MAP_GRADIENT);
        expect(keys).toHaveLength(4);
    });

    it('stops are at 0.35, 0.55, 0.75, 1.0', () => {
        const stops = Object.keys(COLD_MAP_GRADIENT).map(Number).sort((a, b) => a - b);
        expect(stops).toEqual([0.35, 0.55, 0.75, 1.0]);
    });

    it('all colors are in green-cyan range (no warm colors)', () => {
        const warmPatterns = [/^#[fFeE]/, /red/, /orange/, /yellow/];
        for (const color of Object.values(COLD_MAP_GRADIENT)) {
            for (const pattern of warmPatterns) {
                expect(color).not.toMatch(pattern);
            }
        }
    });

    it('all colors are valid hex strings', () => {
        for (const color of Object.values(COLD_MAP_GRADIENT)) {
            expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
        }
    });

    it('first stop (0.35) is green-ish', () => {
        expect(COLD_MAP_GRADIENT[0.35]).toBe('#44cc88');
    });

    it('last stop (1.0) is deep teal/cyan', () => {
        expect(COLD_MAP_GRADIENT[1.0]).toBe('#0088aa');
    });

    it('gradient progresses from green toward cyan', () => {
        // Extract green channel (chars 3-4) — should generally decrease or stay similar
        // Extract blue channel (chars 5-6) — should generally increase or stay similar
        const stops = [0.35, 0.55, 0.75, 1.0] as const;
        const blueValues = stops.map(s => parseInt(COLD_MAP_GRADIENT[s].slice(5, 7), 16));
        // Blue component at last stop should be >= first stop
        expect(blueValues[blueValues.length - 1]).toBeGreaterThanOrEqual(blueValues[0]);
    });
});
