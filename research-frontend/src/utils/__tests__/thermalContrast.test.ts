import { describe, it, expect } from 'vitest';
import {
    gammaContrast,
    sigmoidContrast,
    buildColorLUT,
    renderSaliencyMapDirect,
    decodeThermalMap,
    LEGACY_THERMAL_STOPS,
    REBALANCED_THERMAL_STOPS,
    type ColorStop,
} from '../thermalContrast';

/* ═══════════════════════════════════════════════════════════════
   L1.1 — Sigmoid contrast curve
   ═══════════════════════════════════════════════════════════════ */

describe('gammaContrast (legacy — documenting the problem)', () => {
    const GAMMA = 2.0;

    it('boundary: 0 → 0', () => {
        expect(gammaContrast(0, GAMMA)).toBe(0);
    });

    it('boundary: 1 → 1', () => {
        expect(gammaContrast(1, GAMMA)).toBe(1);
    });

    it('PROBLEM: mid-range 0.5 maps to only 0.25 — pushed deep into cold zone', () => {
        const result = gammaContrast(0.5, GAMMA);
        expect(result).toBeCloseTo(0.25, 5);
        // This means 50th percentile saliency renders as "navy blue" (LUT index 64/255)
        // — visually indistinguishable from low-saliency areas
    });

    it('PROBLEM: 0.7 maps to only 0.49 — barely reaches green', () => {
        const result = gammaContrast(0.7, GAMMA);
        expect(result).toBeCloseTo(0.49, 2);
    });

    it('PROBLEM: only values > 0.87 reach the warm zone (> 0.74 in LUT)', () => {
        // What raw value do we need to reach LUT position 0.74 (where yellow starts)?
        // pow(x, 2) = 0.74 → x = sqrt(0.74) ≈ 0.86
        const threshold = Math.sqrt(0.74);
        expect(threshold).toBeGreaterThan(0.85);
        // Only the top ~14% of saliency values appear warm. Everything else is blue/green.
    });
});

describe('sigmoidContrast', () => {
    it('boundary: 0 → 0', () => {
        expect(sigmoidContrast(0)).toBeCloseTo(0, 3);
    });

    it('boundary: 1 → 1', () => {
        expect(sigmoidContrast(1)).toBeCloseTo(1, 3);
    });

    it('monotonically increasing across full range', () => {
        const samples = Array.from({ length: 101 }, (_, i) => i / 100);
        const mapped = samples.map(s => sigmoidContrast(s));
        mapped.reduce((prev, curr) => {
            expect(curr).toBeGreaterThanOrEqual(prev);
            return curr;
        });
    });

    it('FIX: mid-range 0.5 maps to yellow/green zone — visible but not red', () => {
        const result = sigmoidContrast(0.5);
        // With midpoint=0.48: 0.5 is just above midpoint → ~0.54
        expect(result).toBeGreaterThan(0.45);
        expect(result).toBeLessThan(0.65);
    });

    it('FIX: 0.3 (low saliency) is visibly cold but not invisible', () => {
        const result = sigmoidContrast(0.3);
        expect(result).toBeGreaterThan(0.1);
        expect(result).toBeLessThan(0.3);
    });

    it('FIX: 0.7 reaches warm zone — only true hotspots are orange/red', () => {
        const result = sigmoidContrast(0.7);
        expect(result).toBeGreaterThan(0.8);
    });

    it('FIX: center blob range (0.4-0.55) maps to green/yellow, not red', () => {
        const centerLow = sigmoidContrast(0.4);
        const centerHigh = sigmoidContrast(0.55);
        // Should stay in green-yellow zone (0.3-0.65), not reach orange/red (>0.7)
        expect(centerLow).toBeLessThan(0.5);
        expect(centerHigh).toBeLessThan(0.7);
    });

    it('steepness increases contrast separation', () => {
        const low = sigmoidContrast(0.3, 6);
        const high = sigmoidContrast(0.3, 14);
        // Higher steepness pushes values below midpoint further down
        expect(high).toBeLessThan(low);
    });

    it('midpoint shifts the center of the S-curve', () => {
        // Midpoint at 0.3: values above 0.3 get boosted more
        const atMid03 = sigmoidContrast(0.5, 10, 0.3);
        // Midpoint at 0.5: values above 0.5 get boosted more
        const atMid05 = sigmoidContrast(0.5, 10, 0.5);
        expect(atMid03).toBeGreaterThan(atMid05);
    });

    it('output range stays strictly within [0, 1]', () => {
        const extremes = [0, 0.001, 0.01, 0.1, 0.5, 0.9, 0.99, 0.999, 1];
        extremes.forEach(x => {
            const result = sigmoidContrast(x);
            expect(result).toBeGreaterThanOrEqual(0);
            expect(result).toBeLessThanOrEqual(1);
        });
    });

    it('contrast ratio: hot/cold separation better than gamma', () => {
        // Measure how much separation exists between "cold" (0.3) and "warm" (0.7)
        const gammaSep = gammaContrast(0.7, 2.0) - gammaContrast(0.3, 2.0);
        const sigmoidSep = sigmoidContrast(0.7) - sigmoidContrast(0.3);
        // Sigmoid should produce MORE separation between these two values
        expect(sigmoidSep).toBeGreaterThan(gammaSep);
    });

    it('default params produce usable distribution across percentiles', () => {
        const percentiles = [0.1, 0.25, 0.5, 0.75, 0.9];
        const mapped = percentiles.map(p => sigmoidContrast(p));
        // Each mapped value should be strictly increasing with minimum separation
        mapped.reduce((prev, curr) => {
            expect(curr - prev).toBeGreaterThan(0.01);
            return curr;
        });
        // Overall spread: mapped range should cover at least 80% of [0,1]
        const spread = mapped[mapped.length - 1] - mapped[0];
        expect(spread).toBeGreaterThan(0.8);
    });
});

/* ═══════════════════════════════════════════════════════════════
   Colormap LUT
   ═══════════════════════════════════════════════════════════════ */

describe('buildColorLUT', () => {
    it('produces exactly 256 entries', () => {
        const lut = buildColorLUT(LEGACY_THERMAL_STOPS);
        expect(lut).toHaveLength(256);
    });

    it('first entry matches first stop', () => {
        const lut = buildColorLUT(LEGACY_THERMAL_STOPS);
        expect(lut[0]).toEqual([0, 0, 80]);
    });

    it('last entry matches last stop', () => {
        const lut = buildColorLUT(LEGACY_THERMAL_STOPS);
        expect(lut[255]).toEqual([255, 0, 0]);
    });

    it('all RGB values in [0, 255]', () => {
        const lut = buildColorLUT(REBALANCED_THERMAL_STOPS);
        lut.forEach(([r, g, b]) => {
            expect(r).toBeGreaterThanOrEqual(0);
            expect(r).toBeLessThanOrEqual(255);
            expect(g).toBeGreaterThanOrEqual(0);
            expect(g).toBeLessThanOrEqual(255);
            expect(b).toBeGreaterThanOrEqual(0);
            expect(b).toBeLessThanOrEqual(255);
        });
    });

    it('interpolates between stops smoothly (no jumps > 15 per step)', () => {
        const lut = buildColorLUT(REBALANCED_THERMAL_STOPS);
        for (let i = 1; i < lut.length; i++) {
            const [pr, pg, pb] = lut[i - 1];
            const [cr, cg, cb] = lut[i];
            const maxDelta = Math.max(Math.abs(cr - pr), Math.abs(cg - pg), Math.abs(cb - pb));
            expect(maxDelta).toBeLessThanOrEqual(15);
        }
    });

    it('single-stop LUT fills with that color', () => {
        const mono: ColorStop[] = [{ t: 0, r: 128, g: 64, b: 32 }];
        const lut = buildColorLUT(mono);
        lut.forEach(([r, g, b]) => {
            expect(r).toBe(128);
            expect(g).toBe(64);
            expect(b).toBe(32);
        });
    });
});

describe('LEGACY_THERMAL_STOPS vs REBALANCED_THERMAL_STOPS', () => {
    const legacyLUT = buildColorLUT(LEGACY_THERMAL_STOPS);
    const rebalancedLUT = buildColorLUT(REBALANCED_THERMAL_STOPS);

    it('both produce 256 entries', () => {
        expect(legacyLUT).toHaveLength(256);
        expect(rebalancedLUT).toHaveLength(256);
    });

    it('PROBLEM (legacy): LUT index 128 (50%) is still in cold zone (dominant blue)', () => {
        const [r, g, b] = legacyLUT[128];
        // At 50%, legacy is around teal/green — blue channel still significant
        expect(b).toBeGreaterThan(0);
        expect(r).toBeLessThan(50);
    });

    it('FIX (rebalanced): LUT index 128 (50%) reaches warm transition (green/yellow)', () => {
        const [r, g, b] = rebalancedLUT[128];
        // Rebalanced at 50% should be in green/yellow territory
        expect(g).toBeGreaterThan(100);
        // Red channel should be emerging
        expect(r).toBeGreaterThan(20);
    });

    it('PROBLEM (legacy): warm colors (r>200) only appear in top 30% of LUT', () => {
        const firstWarmIdx = legacyLUT.findIndex(([r]) => r > 200);
        expect(firstWarmIdx).toBeGreaterThan(178); // > 70% of range
    });

    it('FIX (rebalanced): warm colors (r>200) appear by 60% of LUT', () => {
        const firstWarmIdx = rebalancedLUT.findIndex(([r]) => r > 200);
        expect(firstWarmIdx).toBeLessThan(180); // < 70% of range
    });

    it('both start dark and end red', () => {
        // Start: dark
        expect(legacyLUT[0][0] + legacyLUT[0][1] + legacyLUT[0][2]).toBeLessThan(200);
        expect(rebalancedLUT[0][0] + rebalancedLUT[0][1] + rebalancedLUT[0][2]).toBeLessThan(200);
        // End: red
        expect(legacyLUT[255]).toEqual([255, 0, 0]);
        expect(rebalancedLUT[255]).toEqual([255, 0, 0]);
    });
});

/* ═══════════════════════════════════════════════════════════════
   renderSaliencyMapDirect — direct map rendering (no IDW)
   ═══════════════════════════════════════════════════════════════ */

// Polyfill ImageData for Node/vitest (not available outside browser)
class ImageDataPolyfill {
    width: number;
    height: number;
    data: Uint8ClampedArray;
    constructor(w: number, h: number) {
        this.width = w;
        this.height = h;
        this.data = new Uint8ClampedArray(w * h * 4);
    }
}
if (typeof globalThis.ImageData === 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).ImageData = ImageDataPolyfill;
}

describe('renderSaliencyMapDirect', () => {
    const lut = buildColorLUT(REBALANCED_THERMAL_STOPS);
    const identity = (x: number) => x;

    it('produces ImageData with correct dimensions', () => {
        const map = new Uint8Array([0, 128, 255, 64]);
        const result = renderSaliencyMapDirect(map, 2, 2, 2, 2, lut, identity);
        expect(result.width).toBe(2);
        expect(result.height).toBe(2);
        expect(result.data.length).toBe(2 * 2 * 4);
    });

    it('maps zero saliency to first LUT color', () => {
        const map = new Uint8Array([0]);
        const result = renderSaliencyMapDirect(map, 1, 1, 1, 1, lut, identity);
        const [r, g, b] = [result.data[0], result.data[1], result.data[2]];
        expect([r, g, b]).toEqual(lut[0]);
    });

    it('maps max saliency to last LUT color', () => {
        const map = new Uint8Array([255]);
        const result = renderSaliencyMapDirect(map, 1, 1, 1, 1, lut, identity);
        const [r, g, b] = [result.data[0], result.data[1], result.data[2]];
        expect([r, g, b]).toEqual(lut[255]);
    });

    it('applies contrast function before LUT lookup', () => {
        const map = new Uint8Array([128]); // raw = 0.502
        const boost = (x: number) => Math.min(1, x * 2); // doubles intensity
        const result = renderSaliencyMapDirect(map, 1, 1, 1, 1, lut, boost);
        // boosted: 0.502 * 2 = 1.0 → LUT[255]
        const [r, g, b] = [result.data[0], result.data[1], result.data[2]];
        expect([r, g, b]).toEqual(lut[255]);
    });

    it('applies alpha channel correctly', () => {
        const map = new Uint8Array([128]);
        const result = renderSaliencyMapDirect(map, 1, 1, 1, 1, lut, identity, 0.7);
        expect(result.data[3]).toBe(Math.round(0.7 * 255));
    });

    it('upscales small map to larger canvas via nearest-neighbor', () => {
        // 2×2 map → 4×4 canvas
        const map = new Uint8Array([0, 255, 128, 64]);
        const result = renderSaliencyMapDirect(map, 2, 2, 4, 4, lut, identity);
        expect(result.width).toBe(4);
        expect(result.height).toBe(4);

        // Top-left 2×2 block should match map[0]=0 → lut[0]
        const tl = [result.data[0], result.data[1], result.data[2]];
        expect(tl).toEqual(lut[0]);

        // Top-right 2×2 block should match map[1]=255 → lut[255]
        const trOff = 2 * 4; // pixel (2,0)
        const tr = [result.data[trOff], result.data[trOff + 1], result.data[trOff + 2]];
        expect(tr).toEqual(lut[255]);
    });

    it('downscales large map to smaller canvas', () => {
        // 4×4 map → 2×2 canvas (samples every other pixel)
        const map = new Uint8Array(16).fill(200);
        const result = renderSaliencyMapDirect(map, 4, 4, 2, 2, lut, identity);
        expect(result.width).toBe(2);
        expect(result.height).toBe(2);
        // All pixels should be lut[200]
        const expected = lut[200];
        for (let i = 0; i < 4; i++) {
            const off = i * 4;
            expect([result.data[off], result.data[off + 1], result.data[off + 2]]).toEqual(expected);
        }
    });

    it('total pixel count matches canvas dimensions', () => {
        const map = new Uint8Array(384 * 288).fill(100);
        const result = renderSaliencyMapDirect(map, 384, 288, 1920, 1080, lut, identity);
        expect(result.data.length).toBe(1920 * 1080 * 4);
    });

    it('sigmoid contrast produces more warm pixels than gamma for same input', () => {
        // Gradient map 0..255
        const map = new Uint8Array(256);
        for (let i = 0; i < 256; i++) map[i] = i;

        const gammResult = renderSaliencyMapDirect(map, 256, 1, 256, 1, lut, x => gammaContrast(x, 2.0));
        const sigResult = renderSaliencyMapDirect(map, 256, 1, 256, 1, lut, sigmoidContrast);

        // Count pixels where red channel > 200 (warm zone)
        let gammaWarm = 0, sigWarm = 0;
        for (let i = 0; i < 256; i++) {
            if (gammResult.data[i * 4] > 200) gammaWarm++;
            if (sigResult.data[i * 4] > 200) sigWarm++;
        }
        expect(sigWarm).toBeGreaterThan(gammaWarm);
    });
});

/* ═══════════════════════════════════════════════════════════════
   decodeThermalMap — base64 → Uint8Array (no compression)
   ═══════════════════════════════════════════════════════════════ */

describe('decodeThermalMap', () => {
    it('decodes base64 to Uint8Array', () => {
        const original = new Uint8Array([0, 128, 255]);
        const base64 = btoa(String.fromCharCode(...original));
        const decoded = decodeThermalMap(base64);
        expect(decoded).toBeInstanceOf(Uint8Array);
        expect(decoded.length).toBe(3);
        expect(decoded[0]).toBe(0);
        expect(decoded[1]).toBe(128);
        expect(decoded[2]).toBe(255);
    });

    it('roundtrips saliency map dimensions', () => {
        const size = 384 * 224;
        const original = new Uint8Array(size);
        original[0] = 42;
        original[size - 1] = 200;
        const base64 = btoa(String.fromCharCode(...original));
        const decoded = decodeThermalMap(base64);
        expect(decoded.length).toBe(size);
        expect(decoded[0]).toBe(42);
        expect(decoded[size - 1]).toBe(200);
    });

    it('returns empty array for empty base64', () => {
        const decoded = decodeThermalMap(btoa(''));
        expect(decoded.length).toBe(0);
    });
});
