import { describe, it, expect } from 'vitest';
import { heatmapPointToPixel, buildSpotlightMaskKey } from '../spotlightRender';
import type { SpotlightHeatmapPoint } from '../spotlightRender';

// ---------------------------------------------------------------------------
// heatmapPointToPixel
// ---------------------------------------------------------------------------

describe('heatmapPointToPixel', () => {
    const w = 800;
    const h = 600;

    it('normalized coords (0-1): center maps to center pixels', () => {
        const result = heatmapPointToPixel({ x: 0.5, y: 0.5 }, w, h);
        expect(result.px).toBe(400);
        expect(result.py).toBe(300);
        expect(result.val).toBe(1);
    });

    it('normalized coords: origin maps to (0, 0)', () => {
        const result = heatmapPointToPixel({ x: 0, y: 0 }, w, h);
        expect(result.px).toBe(0);
        expect(result.py).toBe(0);
    });

    it('normalized coords: (1, 1) maps to (w, h)', () => {
        const result = heatmapPointToPixel({ x: 1, y: 1 }, w, h);
        expect(result.px).toBe(800);
        expect(result.py).toBe(600);
    });

    it('normalized coords: quarter point', () => {
        const result = heatmapPointToPixel({ x: 0.25, y: 0.75 }, w, h);
        expect(result.px).toBe(200);
        expect(result.py).toBe(450);
    });

    it('percent coords (0-100): center maps correctly', () => {
        const result = heatmapPointToPixel({ x: 50, y: 50 }, w, h);
        expect(result.px).toBe(400);
        expect(result.py).toBe(300);
    });

    it('percent coords: edges', () => {
        const r1 = heatmapPointToPixel({ x: 100, y: 100 }, w, h);
        expect(r1.px).toBe(800);
        expect(r1.py).toBe(600);
    });

    it('percent coords: 25%, 75%', () => {
        const result = heatmapPointToPixel({ x: 25, y: 75 }, w, h);
        expect(result.px).toBe(200);
        expect(result.py).toBe(450);
    });

    it('pixel coords (>100): passed through unchanged', () => {
        const result = heatmapPointToPixel({ x: 400, y: 300 }, w, h);
        expect(result.px).toBe(400);
        expect(result.py).toBe(300);
    });

    it('pixel coords: large values stay as-is', () => {
        const result = heatmapPointToPixel({ x: 750, y: 550 }, w, h);
        expect(result.px).toBe(750);
        expect(result.py).toBe(550);
    });

    it('with explicit value: preserves it', () => {
        const result = heatmapPointToPixel({ x: 0.5, y: 0.5, value: 0.7 }, w, h);
        expect(result.val).toBe(0.7);
    });

    it('without value: defaults to 1', () => {
        const result = heatmapPointToPixel({ x: 0.5, y: 0.5 }, w, h);
        expect(result.val).toBe(1);
    });

    it('value of 0 is preserved (not defaulted)', () => {
        const result = heatmapPointToPixel({ x: 0.5, y: 0.5, value: 0 }, w, h);
        expect(result.val).toBe(0);
    });

    it('boundary between normalized and percent: x=1,y=1 treated as normalized', () => {
        // x<=1 && y<=1 → normalized branch
        const result = heatmapPointToPixel({ x: 1, y: 1 }, w, h);
        expect(result.px).toBe(w);
        expect(result.py).toBe(h);
    });

    it('mixed coords where one is >1 and other <=1 — percent branch used when both <=100', () => {
        // x=2, y=0.5 → x>1 so NOT normalized; x<=100 && y<=100 → percent
        const result = heatmapPointToPixel({ x: 2, y: 0.5 }, w, h);
        // percent: (2/100)*800=16, (0.5/100)*600=3
        expect(result.px).toBeCloseTo(16, 1);
        expect(result.py).toBeCloseTo(3, 1);
    });
});

// ---------------------------------------------------------------------------
// buildSpotlightMaskKey
// ---------------------------------------------------------------------------

describe('buildSpotlightMaskKey', () => {
    const points: SpotlightHeatmapPoint[] = [
        { x: 0.1, y: 0.2, value: 0.8 },
        { x: 0.5, y: 0.5, value: 1.0 },
        { x: 0.9, y: 0.3, value: 0.6 },
    ];

    it('same inputs produce same key', () => {
        const key1 = buildSpotlightMaskKey(points, 800, 600, 50, 20);
        const key2 = buildSpotlightMaskKey(points, 800, 600, 50, 20);
        expect(key1).toBe(key2);
    });

    it('different dimensions produce different key', () => {
        const key1 = buildSpotlightMaskKey(points, 800, 600, 50, 20);
        const key2 = buildSpotlightMaskKey(points, 1024, 768, 50, 20);
        expect(key1).not.toBe(key2);
    });

    it('different revealRadius produces different key', () => {
        const key1 = buildSpotlightMaskKey(points, 800, 600, 50, 20);
        const key2 = buildSpotlightMaskKey(points, 800, 600, 75, 20);
        expect(key1).not.toBe(key2);
    });

    it('different threshold produces different key', () => {
        const key1 = buildSpotlightMaskKey(points, 800, 600, 50, 20);
        const key2 = buildSpotlightMaskKey(points, 800, 600, 50, 40);
        expect(key1).not.toBe(key2);
    });

    it('different point count produces different key', () => {
        const morePoints = [...points, { x: 0.7, y: 0.7, value: 0.5 }];
        const key1 = buildSpotlightMaskKey(points, 800, 600, 50, 20);
        const key2 = buildSpotlightMaskKey(morePoints, 800, 600, 50, 20);
        expect(key1).not.toBe(key2);
    });

    it('key includes dimensions', () => {
        const key = buildSpotlightMaskKey(points, 800, 600, 50, 20);
        expect(key).toContain('800x600');
    });

    it('key includes point count', () => {
        const key = buildSpotlightMaskKey(points, 800, 600, 50, 20);
        expect(key).toContain('3');
    });

    it('key includes sample coordinate values', () => {
        const key = buildSpotlightMaskKey(points, 800, 600, 50, 20);
        // First point: x=0.1 → "0.1"
        expect(key).toContain('0.1');
    });

    it('empty points array produces valid key', () => {
        const key = buildSpotlightMaskKey([], 800, 600, 50, 20);
        expect(key).toContain('800x600');
        expect(key).toContain('0'); // 0 points
    });

    it('key format: WxH-radius-threshold-count-samples', () => {
        const key = buildSpotlightMaskKey(points, 800, 600, 50, 20);
        expect(key).toMatch(/^800x600-50-20-3-.+$/);
    });

    it('points without value default to 1 in sample', () => {
        const noValPoints: SpotlightHeatmapPoint[] = [{ x: 0.5, y: 0.5 }];
        const key = buildSpotlightMaskKey(noValPoints, 800, 600, 50, 20);
        expect(key).toContain('1.00'); // default value formatted
    });

    it('only first 8 points are sampled for key', () => {
        const manyPoints: SpotlightHeatmapPoint[] = Array.from({ length: 20 }, (_, i) => ({
            x: i * 0.05, y: i * 0.05, value: 0.5,
        }));
        const key = buildSpotlightMaskKey(manyPoints, 800, 600, 50, 20);
        // Count pipe separators in sample section — at most 7 pipes for 8 points
        const samplePart = key.split('-').slice(4).join('-');
        const pipes = (samplePart.match(/\|/g) || []).length;
        expect(pipes).toBeLessThanOrEqual(7);
    });
});
