import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Static analysis tests — verify that <video> elements in key components
 * have the required attributes for cross-browser video playback.
 *
 * These are source-level checks (not DOM rendering) because the components
 * require heavy context (Zustand stores, React Query, etc.) to render.
 */

const COMPONENTS_DIR = path.resolve(__dirname, '..');

function readComponent(filename: string): string {
    return fs.readFileSync(path.join(COMPONENTS_DIR, filename), 'utf-8');
}

describe('AttentionPredictionCard <video> attributes', () => {
    const source = readComponent('AttentionPredictionCard.tsx');

    it('includes preload="metadata" on the persistent video element', () => {
        // Match the video element that has src={imageUrl}
        const videoBlock = source.match(/<video[\s\S]*?src=\{imageUrl\}[\s\S]*?\/>/);
        expect(videoBlock).not.toBeNull();
        expect(videoBlock![0]).toContain('preload="metadata"');
    });

    it('includes playsInline on the persistent video element', () => {
        const videoBlock = source.match(/<video[\s\S]*?src=\{imageUrl\}[\s\S]*?\/>/);
        expect(videoBlock).not.toBeNull();
        expect(videoBlock![0]).toContain('playsInline');
    });

    it('does NOT include crossOrigin on the display video element', () => {
        // crossOrigin should only be on extractVideoThumbnail's <video>, not display
        const videoBlock = source.match(/<video[\s\S]*?src=\{imageUrl\}[\s\S]*?\/>/);
        expect(videoBlock).not.toBeNull();
        expect(videoBlock![0]).not.toContain('crossOrigin');
    });
});

describe('VideoAccumulatedHeatmapOverlay <video> attributes', () => {
    const source = readComponent('VideoAccumulatedHeatmapOverlay.tsx');

    it('includes preload="metadata"', () => {
        const videoBlock = source.match(/<video[\s\S]*?src=\{videoUrl\}[\s\S]*?\/>/);
        expect(videoBlock).not.toBeNull();
        expect(videoBlock![0]).toContain('preload="metadata"');
    });

    it('includes playsInline', () => {
        const videoBlock = source.match(/<video[\s\S]*?src=\{videoUrl\}[\s\S]*?\/>/);
        expect(videoBlock).not.toBeNull();
        expect(videoBlock![0]).toContain('playsInline');
    });

    it('does NOT include crossOrigin on the display video', () => {
        const videoBlock = source.match(/<video[\s\S]*?src=\{videoUrl\}[\s\S]*?\/>/);
        expect(videoBlock).not.toBeNull();
        expect(videoBlock![0]).not.toContain('crossOrigin');
    });
});

describe('extractVideoThumbnail uses crossOrigin', () => {
    const source = fs.readFileSync(
        path.resolve(__dirname, '../../../utils/extractVideoThumbnail.ts'),
        'utf-8',
    );

    it('sets crossOrigin = anonymous for canvas taint safety', () => {
        expect(source).toContain("crossOrigin = 'anonymous'");
    });

    it('uses preload = metadata (not auto)', () => {
        expect(source).toContain("preload = 'metadata'");
        expect(source).not.toContain("preload = 'auto'");
    });

    it('does NOT use fetch to download the entire video', () => {
        // Old implementation used fetch() + blob — verify it is gone
        expect(source).not.toMatch(/await\s+fetch\(videoUrl\)/);
    });
});
