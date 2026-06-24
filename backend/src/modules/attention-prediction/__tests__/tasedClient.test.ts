import { describe, expect, it } from 'vitest';
import { parseStreamLine, decodeBase64Map } from '../tased-client';

// ─── parseStreamLine ────────────────────────────────────────────────

describe('parseStreamLine', () => {
    it('parses a progress event', () => {
        const line = '{"type":"progress","frame":3,"total":15}';
        const result = parseStreamLine(line);
        expect(result).toEqual({ type: 'progress', frame: 3, total: 15 });
    });

    it('parses a result event', () => {
        const line = '{"type":"result","maps":["AAAA"],"timestamps":[0.0],"width":384,"height":224}';
        const result = parseStreamLine(line);
        expect(result).toEqual({
            type: 'result',
            maps: ['AAAA'],
            timestamps: [0.0],
            width: 384,
            height: 224,
        });
    });

    it('returns null for empty string', () => {
        expect(parseStreamLine('')).toBeNull();
    });

    it('returns null for whitespace-only string', () => {
        expect(parseStreamLine('   \n  ')).toBeNull();
    });

    it('returns null for invalid JSON', () => {
        expect(parseStreamLine('{broken')).toBeNull();
    });

    it('trims whitespace before parsing', () => {
        const line = '  {"type":"progress","frame":1,"total":5}  ';
        const result = parseStreamLine(line);
        expect(result).toEqual({ type: 'progress', frame: 1, total: 5 });
    });
});

// ─── decodeBase64Map ────────────────────────────────────────────────

describe('decodeBase64Map', () => {
    it('decodes a base64-encoded Float32Array', () => {
        // Create a known Float32Array, encode to base64, decode back
        const original = new Float32Array([0.5, 0.75, 1.0, 0.0]);
        const base64 = Buffer.from(original.buffer).toString('base64');

        const decoded = decodeBase64Map(base64);
        expect(decoded).toBeInstanceOf(Float32Array);
        expect(decoded.length).toBe(4);
        expect(decoded[0]).toBeCloseTo(0.5);
        expect(decoded[1]).toBeCloseTo(0.75);
        expect(decoded[2]).toBeCloseTo(1.0);
        expect(decoded[3]).toBeCloseTo(0.0);
    });

    it('produces correct length for saliency map dimensions', () => {
        const width = 384;
        const height = 224;
        const smap = new Float32Array(width * height);
        smap[0] = 0.42;
        const base64 = Buffer.from(smap.buffer).toString('base64');

        const decoded = decodeBase64Map(base64);
        expect(decoded.length).toBe(width * height);
        expect(decoded[0]).toBeCloseTo(0.42);
    });

    it('preserves values across encoding roundtrip', () => {
        const values = [0.1, 0.2, 0.3, 0.999, 0.001];
        const original = new Float32Array(values);
        const base64 = Buffer.from(original.buffer).toString('base64');
        const decoded = decodeBase64Map(base64);

        for (let i = 0; i < values.length; i++) {
            expect(decoded[i]).toBeCloseTo(values[i], 5);
        }
    });
});
