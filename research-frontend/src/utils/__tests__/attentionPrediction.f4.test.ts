import { describe, expect, it } from 'vitest';
import { estimateExposureTime } from '../attentionPrediction.utils';

describe('estimateExposureTime', () => {
    it('maps 100% share to max time', () => {
        expect(estimateExposureTime(100)).toBe('3.0s');
    });

    it('maps 0% share to minimum time', () => {
        expect(estimateExposureTime(0)).toBe('100ms');
    });

    it('maps 50% share to midpoint', () => {
        const result = estimateExposureTime(50);
        // 0.1 + (50/100) * 2.9 = 1.55
        expect(result).toBe('1.6s');
    });

    it('clamps negative values to 0', () => {
        expect(estimateExposureTime(-10)).toBe('100ms');
    });

    it('clamps values above 100 to 100', () => {
        expect(estimateExposureTime(150)).toBe('3.0s');
    });

    it('respects custom total view time', () => {
        // 100% of 5s window
        expect(estimateExposureTime(100, 5.0)).toBe('5.0s');
    });

    it('sub-second values use ms format', () => {
        // ~10% share: 0.1 + 0.1*2.9 = 0.39 → 390ms
        const result = estimateExposureTime(10);
        expect(result).toMatch(/ms$/);
    });

    it('returns seconds for values >= 1s', () => {
        const result = estimateExposureTime(80);
        expect(result).toMatch(/s$/);
        expect(result).not.toMatch(/ms$/);
    });
});
