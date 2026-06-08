import { describe, expect, it } from 'vitest';
import { buildLowTextureMask } from '../attention-prediction.service';

describe('buildLowTextureMask', () => {
    it('strongly suppresses uniform bright whitespace gutters', () => {
        const w = 10;
        const h = 10;
        const gray = new Float32Array(w * h).fill(0.9);
        const mask = buildLowTextureMask(gray, w, h, 2);

        expect(mask[45]).toBeLessThanOrEqual(0.2);
    });

    it('preserves high-texture regions', () => {
        const w = 12;
        const h = 12;
        const gray = new Float32Array(w * h).fill(0.5);

        for (let row = 0; row < h; row++) {
            for (let col = 0; col < w; col++) {
                const checker = ((row + col) % 2 === 0) ? 0.2 : 0.8;
                gray[row * w + col] = checker;
            }
        }

        const mask = buildLowTextureMask(gray, w, h, 1);
        expect(mask[30]).toBeGreaterThan(0.6);
    });

    it('attenuates bright uniform regions more than textured content', () => {
        const w = 20;
        const h = 20;
        const gray = new Float32Array(w * h).fill(0.9);

        for (let row = 5; row < 10; row++) {
            for (let col = 5; col < 10; col++) {
                gray[row * w + col] = (row + col) % 2 === 0 ? 0.2 : 0.8;
            }
        }

        const mask = buildLowTextureMask(gray, w, h, 2);
        expect(mask[0]).toBeLessThan(0.25);
        expect(mask[5 * w + 5]).toBeGreaterThan(0.6);
    });
});
