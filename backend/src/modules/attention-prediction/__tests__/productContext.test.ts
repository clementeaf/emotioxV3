import { describe, expect, it } from 'vitest';
import {
    buildLowTextureMask,
    getExtractOptions,
    getTextureThresholds,
    DEFAULT_EXTRACT_HEATMAP_OPTIONS,
    PRODUCT_EXTRACT_HEATMAP_OPTIONS,
} from '../attention-prediction.service';

describe('getExtractOptions — context-aware NMS', () => {
    it('returns default options for undefined context', () => {
        const opts = getExtractOptions(undefined, 0.48);
        expect(opts.maxPoints).toBe(DEFAULT_EXTRACT_HEATMAP_OPTIONS.maxPoints);
        expect(opts.gridCols).toBe(DEFAULT_EXTRACT_HEATMAP_OPTIONS.gridCols);
    });

    it('returns product options for product_isolated', () => {
        const opts = getExtractOptions('product_isolated', 0.48);
        expect(opts.maxPoints).toBe(PRODUCT_EXTRACT_HEATMAP_OPTIONS.maxPoints);
        expect(opts.gridCols).toBe(PRODUCT_EXTRACT_HEATMAP_OPTIONS.gridCols);
        expect(opts.minRelative).toBe(0.58);
    });

    it('returns product options for packaging', () => {
        const opts = getExtractOptions('packaging', 0.48);
        expect(opts.maxPoints).toBe(150);
        expect(opts.nmsCells).toBe(2);
    });

    it('applies threshold override to minAbsolute', () => {
        const opts = getExtractOptions('web', 0.55);
        expect(opts.minAbsolute).toBe(0.55);
    });

    it('keeps base minAbsolute when threshold is lower', () => {
        const opts = getExtractOptions('product_isolated', 0.1);
        expect(opts.minAbsolute).toBe(PRODUCT_EXTRACT_HEATMAP_OPTIONS.minAbsolute);
    });
});

describe('getTextureThresholds — context selection', () => {
    it('returns stricter thresholds for product_isolated', () => {
        const t = getTextureThresholds('product_isolated');
        expect(t.brightUniformLum).toBe(0.65);
        expect(t.lowTextureLum).toBe(0.55);
    });

    it('returns default thresholds for web', () => {
        const t = getTextureThresholds('web');
        expect(t.brightUniformLum).toBe(0.82);
    });

    it('returns default thresholds for undefined', () => {
        const t = getTextureThresholds(undefined);
        expect(t.brightUniformLum).toBe(0.82);
    });
});

describe('buildLowTextureMask — product thresholds', () => {
    it('suppresses medium-luminance uniform zones with product thresholds', () => {
        const w = 10;
        const h = 10;
        // 0.70 luminance, uniform — default would pass, product should suppress
        const gray = new Float32Array(w * h).fill(0.70);

        const defaultMask = buildLowTextureMask(gray, w, h, 2, getTextureThresholds('web'));
        const productMask = buildLowTextureMask(gray, w, h, 2, getTextureThresholds('product_isolated'));

        const centerIdx = 5 * w + 5;
        // Product mask should suppress more aggressively
        expect(productMask[centerIdx]).toBeLessThan(defaultMask[centerIdx]);
    });

    it('preserves textured zones regardless of context', () => {
        const w = 12;
        const h = 12;
        const gray = new Float32Array(w * h);
        for (let i = 0; i < gray.length; i++) {
            gray[i] = (i % 2 === 0) ? 0.2 : 0.8;
        }

        const mask = buildLowTextureMask(gray, w, h, 1, getTextureThresholds('product_isolated'));
        expect(mask[30]).toBeGreaterThan(0.5);
    });
});
