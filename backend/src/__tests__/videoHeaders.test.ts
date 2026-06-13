import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Source-level tests verifying that the media static file server
 * sets correct headers for video files (.mp4, .webm).
 *
 * Both entry points (server-cpanel.js and server-cpanel.ts) must be consistent.
 */

const BACKEND_ROOT = path.resolve(__dirname, '../..');

function readEntryPoint(filename: string): string {
    return fs.readFileSync(path.join(BACKEND_ROOT, filename), 'utf-8');
}

describe.each([
    ['server-cpanel.js'],
    ['src/server-cpanel.ts'],
])('%s — video static headers', (file) => {
    const source = readEntryPoint(file);

    it('serves .mp4 with correct Content-Type', () => {
        expect(source).toContain("'.mp4': 'video/mp4'");
    });

    it('serves .webm with correct Content-Type', () => {
        expect(source).toContain("'.webm': 'video/webm'");
    });

    it('sets Cache-Control for video files', () => {
        // Should have a block that checks for mp4/webm and sets Cache-Control
        const hasCacheControl = source.includes("ext === '.mp4' || ext === '.webm'")
            && source.includes("'Cache-Control', 'public, max-age=3600'");
        expect(hasCacheControl).toBe(true);
    });

    it('sets Accept-Ranges: bytes for video files', () => {
        expect(source).toContain("'Accept-Ranges', 'bytes'");
    });

    it('applies video headers to BOTH /media and /api/media routes', () => {
        // Count occurrences of Accept-Ranges — should be at least 2 (one per route)
        const matches = source.match(/'Accept-Ranges', 'bytes'/g);
        expect(matches).not.toBeNull();
        expect(matches!.length).toBeGreaterThanOrEqual(2);
    });
});
