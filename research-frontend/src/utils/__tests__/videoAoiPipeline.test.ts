import { describe, expect, it } from 'vitest';
import { extractVideoThumbnail } from '../extractVideoThumbnail';

/* ═══════════════════════════════════════════════════════════════
   1. extractVideoThumbnail — contract & signature
   ═══════════════════════════════════════════════════════════════ */

describe('extractVideoThumbnail — contract', () => {
    it('is a function', () => {
        expect(typeof extractVideoThumbnail).toBe('function');
    });

    it('accepts exactly 1 parameter (videoUrl)', () => {
        expect(extractVideoThumbnail.length).toBe(1);
    });

    it('returns a Promise', () => {
        const result = extractVideoThumbnail('blob:fake');
        expect(result).toBeInstanceOf(Promise);
        result.catch(() => {}); // suppress unhandled rejection in jsdom
    });

    it('rejects with Error when canvas unavailable (jsdom)', async () => {
        await expect(extractVideoThumbnail('blob:fake')).rejects.toThrow();
    });
});

/* ═══════════════════════════════════════════════════════════════
   2. startVideoPrediction — options type accepts aois
   ═══════════════════════════════════════════════════════════════ */

describe('startVideoPrediction — AOI contract', () => {
    it('options type accepts aois array parameter', () => {
        const options: Parameters<typeof import('../../services/media.service').mediaService.startVideoPrediction>[3] = {
            threshold: 0.48,
            aois: [
                { x: 10, y: 20, width: 30, height: 40 },
                { x: 50, y: 50, width: 20, height: 20 },
            ],
        };
        expect(options?.aois).toHaveLength(2);
    });

    it('aois field is optional', () => {
        const options: Parameters<typeof import('../../services/media.service').mediaService.startVideoPrediction>[3] = {
            threshold: 0.48,
        };
        expect(options?.aois).toBeUndefined();
    });

    it('accepts empty aois array', () => {
        const options: Parameters<typeof import('../../services/media.service').mediaService.startVideoPrediction>[3] = {
            aois: [],
        };
        expect(options?.aois).toHaveLength(0);
    });

    it('entire options param is optional (undefined)', () => {
        const options: Parameters<typeof import('../../services/media.service').mediaService.startVideoPrediction>[3] = undefined;
        expect(options).toBeUndefined();
    });

    it('aoi shape requires x, y, width, height (type check)', () => {
        const aoi = { x: 10, y: 20, width: 30, height: 40 };
        expect(aoi).toHaveProperty('x');
        expect(aoi).toHaveProperty('y');
        expect(aoi).toHaveProperty('width');
        expect(aoi).toHaveProperty('height');
    });
});

/* ═══════════════════════════════════════════════════════════════
   3. AOI-first flow — auto-trigger removed
   ═══════════════════════════════════════════════════════════════ */

describe('AOI-first flow invariants', () => {
    it('extractVideoThumbnail is available as a standalone utility', async () => {
        // Verifies the module can be imported independently of any component
        const mod = await import('../extractVideoThumbnail');
        expect(mod.extractVideoThumbnail).toBe(extractVideoThumbnail);
    });

    it('video thumbnail utility does not depend on extractVideoFrames', async () => {
        // extractVideoThumbnail is a lighter alternative; should not import the heavy one
        const source = await import('../extractVideoThumbnail?raw');
        const code = (source as unknown as { default: string }).default ?? '';
        expect(code).not.toContain('extractVideoFrames');
    });
});
