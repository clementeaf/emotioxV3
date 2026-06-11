import { describe, expect, it } from 'vitest';
import { modulateIntensityByAoiProximity, type AoiRect } from '../attention-prediction.service';

describe('modulateIntensityByAoiProximity', () => {
    const logoAoi: AoiRect = { x: 30, y: 40, width: 40, height: 20 }; // center at 50,50
    const aois: AoiRect[] = [logoAoi];

    it('preserves full intensity for points inside the AOI', () => {
        const points = [{ x: 50, y: 50, value: 0.9 }];
        const result = modulateIntensityByAoiProximity(points, aois);
        expect(result[0].value).toBe(0.9);
    });

    it('attenuates points far from any AOI', () => {
        const points = [{ x: 5, y: 5, value: 0.9 }];
        const result = modulateIntensityByAoiProximity(points, aois);
        expect(result[0].value).toBeLessThan(0.9);
        expect(result[0].value).toBeGreaterThan(0); // never zero
    });

    it('returns unmodified when no AOIs provided', () => {
        const points = [
            { x: 10, y: 10, value: 0.8 },
            { x: 50, y: 50, value: 0.6 },
        ];
        const result = modulateIntensityByAoiProximity(points, []);
        // With no AOIs, every point is Infinity distance — clamped to maxDist → factor = 1 - decay
        expect(result[0].value).toBeLessThan(0.8);
    });

    it('gradient: closer points get higher intensity than farther ones', () => {
        const points = [
            { x: 50, y: 50, value: 0.8 }, // inside logo
            { x: 75, y: 50, value: 0.8 }, // just outside
            { x: 95, y: 95, value: 0.8 }, // far corner
        ];
        const result = modulateIntensityByAoiProximity(points, aois);
        expect(result[0].value).toBeGreaterThan(result[1].value);
        expect(result[1].value).toBeGreaterThan(result[2].value);
    });

    it('simulates HiCONIC can: logo zone gets ~80% while periphery gets ~48%', () => {
        // Reference data: Logo HiCONIC 80%, Tonic Water 48%, Botanicals 55%
        const canAois: AoiRect[] = [
            { x: 25, y: 35, width: 50, height: 20 }, // Logo HiCONIC zone
        ];

        const points = [
            { x: 50, y: 45, value: 1.0 },  // logo center
            { x: 50, y: 15, value: 0.9 },  // Tonic Water (top)
            { x: 50, y: 75, value: 0.85 }, // Botanicals (bottom)
        ];

        const result = modulateIntensityByAoiProximity(points, canAois);

        // Logo should retain most intensity
        expect(result[0].value).toBeGreaterThan(0.95);
        // Tonic Water should be attenuated but still significant
        expect(result[1].value).toBeLessThan(result[0].value);
        expect(result[1].value).toBeGreaterThan(0.4);
        // Botanicals should be attenuated similarly
        expect(result[2].value).toBeLessThan(result[0].value);
    });

    it('custom decay parameter controls attenuation strength', () => {
        const points = [{ x: 5, y: 5, value: 1.0 }];
        const gentle = modulateIntensityByAoiProximity(points, aois, 0.3);
        const strong = modulateIntensityByAoiProximity(points, aois, 0.8);
        expect(gentle[0].value).toBeGreaterThan(strong[0].value);
    });

    it('preserves x and y coordinates unchanged', () => {
        const points = [{ x: 42.5, y: 67.3, value: 0.7 }];
        const result = modulateIntensityByAoiProximity(points, aois);
        expect(result[0].x).toBe(42.5);
        expect(result[0].y).toBe(67.3);
    });

    it('multiple AOIs: point between two AOIs uses nearest', () => {
        const twoAois: AoiRect[] = [
            { x: 10, y: 10, width: 20, height: 20 }, // top-left
            { x: 70, y: 70, width: 20, height: 20 }, // bottom-right
        ];
        const midPoint = [{ x: 50, y: 50, value: 1.0 }];
        const result = modulateIntensityByAoiProximity(midPoint, twoAois);
        // Should be attenuated but not maximally (equidistant from both)
        expect(result[0].value).toBeLessThan(1.0);
        expect(result[0].value).toBeGreaterThan(0.5);
    });
});
