import { describe, expect, it } from 'vitest';
import { encodeThermalMap } from '../video-prediction.service';

describe('encodeThermalMap', () => {
    it('encodes float [0,1] to base64 uint8 [0,255]', () => {
        const map = new Float32Array([0, 0.5, 1.0]);
        const encoded = encodeThermalMap(map);
        const decoded = Buffer.from(encoded, 'base64');
        const uint8 = new Uint8Array(decoded.buffer, decoded.byteOffset, decoded.byteLength);

        expect(uint8[0]).toBe(0);
        expect(uint8[1]).toBe(128);
        expect(uint8[2]).toBe(255);
    });

    it('produces output length equal to input length', () => {
        const map = new Float32Array(384 * 224).fill(0.42);
        const encoded = encodeThermalMap(map);
        const decoded = Buffer.from(encoded, 'base64');
        expect(decoded.length).toBe(384 * 224);
    });

    it('clamps values outside [0, 1]', () => {
        const map = new Float32Array([-0.5, 1.5, 2.0]);
        const encoded = encodeThermalMap(map);
        const decoded = Buffer.from(encoded, 'base64');
        const uint8 = new Uint8Array(decoded.buffer, decoded.byteOffset, decoded.byteLength);

        expect(uint8[0]).toBe(0);
        expect(uint8[1]).toBe(255);
        expect(uint8[2]).toBe(255);
    });

    it('roundtrips through base64 within ±1 quantization tolerance', () => {
        const values = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1.0];
        const map = new Float32Array(values);
        const encoded = encodeThermalMap(map);
        const decoded = Buffer.from(encoded, 'base64');
        const uint8 = new Uint8Array(decoded.buffer, decoded.byteOffset, decoded.byteLength);

        values.forEach((v, i) => {
            const target = v * 255;
            // Float32 precision can shift by ±1 after round
            expect(uint8[i]).toBeGreaterThanOrEqual(Math.floor(target));
            expect(uint8[i]).toBeLessThanOrEqual(Math.ceil(target));
        });
    });

    it('produces valid base64 string', () => {
        const map = new Float32Array([0.33, 0.66]);
        const encoded = encodeThermalMap(map);
        // Valid base64 chars only
        expect(/^[A-Za-z0-9+/=]+$/.test(encoded)).toBe(true);
    });
});
