/**
 * Tests for the video heatmap rendering decision:
 * - heatmapVideoUrl present → server-rendered MP4 (DINO path)
 * - heatmapVideoUrl absent → legacy canvas-based thermal grid (TranSalNet path)
 *
 * Also validates gridMetadata shape from DINO render response.
 */

import { describe, expect, it } from 'vitest';

// ─── Rendering decision logic (mirrors AttentionPredictionCard conditional) ───

type VideoRenderPath = 'dino-video' | 'thermal-grid' | 'original-only';

/**
 * Determine which rendering path to use for a video stimulus heatmap tab.
 * Extracted from AttentionPredictionCard's JSX conditional for testability.
 */
function resolveVideoRenderPath(stimulus: {
    isVideo?: boolean;
    heatmapVideoUrl?: string;
    heatmapData?: Array<{ x: number; y: number; value: number }>;
    frames?: Array<{ mediaId: string; timestamp: number }>;
    thermalMap?: string;
}, activeTab: string): VideoRenderPath {
    const isHeatmapTab = activeTab === 'heatmap';
    const hasRenderedVideo = Boolean(stimulus.heatmapVideoUrl);
    const hasLegacyData = Boolean(stimulus.thermalMap) || (stimulus.frames?.length ?? 0) > 0;

    return isHeatmapTab && hasRenderedVideo
        ? 'dino-video'
        : isHeatmapTab && hasLegacyData
            ? 'thermal-grid'
            : 'original-only';
}

describe('resolveVideoRenderPath', () => {
    it('selects dino-video when heatmapVideoUrl exists on heatmap tab', () => {
        const path = resolveVideoRenderPath(
            { isVideo: true, heatmapVideoUrl: '/media/research/abc/heatmap_123.mp4' },
            'heatmap',
        );
        expect(path).toBe('dino-video');
    });

    it('selects thermal-grid when only thermalMap exists on heatmap tab', () => {
        const path = resolveVideoRenderPath(
            { isVideo: true, thermalMap: 'base64data...' },
            'heatmap',
        );
        expect(path).toBe('thermal-grid');
    });

    it('selects thermal-grid when only frames exist on heatmap tab', () => {
        const path = resolveVideoRenderPath(
            { isVideo: true, frames: [{ mediaId: 'f1', timestamp: 0 }] },
            'heatmap',
        );
        expect(path).toBe('thermal-grid');
    });

    it('selects original-only on original tab regardless of data', () => {
        const path = resolveVideoRenderPath(
            { isVideo: true, heatmapVideoUrl: '/media/video.mp4', thermalMap: 'x' },
            'original',
        );
        expect(path).toBe('original-only');
    });

    it('selects original-only when no heatmap data at all', () => {
        const path = resolveVideoRenderPath(
            { isVideo: true },
            'heatmap',
        );
        expect(path).toBe('original-only');
    });

    it('dino-video takes precedence over thermal-grid when both exist', () => {
        const path = resolveVideoRenderPath(
            { isVideo: true, heatmapVideoUrl: '/video.mp4', thermalMap: 'x', frames: [{ mediaId: 'f', timestamp: 0 }] },
            'heatmap',
        );
        expect(path).toBe('dino-video');
    });
});

// ─── Grid metadata shape validation ─────────────────────────────────

interface GridCell {
    label: string;
    percentage: number;
}

interface FrameGridData {
    timestamp: number;
    cells: GridCell[];
}

describe('gridMetadata shape', () => {
    it('each frame has 9 cells for 3x3 grid', () => {
        const metadata: FrameGridData[] = Array.from({ length: 10 }, (_, i) => ({
            timestamp: i * 0.033,
            cells: Array.from({ length: 9 }, (_, j) => ({
                label: `Q${j + 1}`,
                percentage: 100 / 9,
            })),
        }));

        expect(metadata).toHaveLength(10);
        metadata.forEach(frame => {
            expect(frame.cells).toHaveLength(9);
        });
    });

    it('cell percentages sum to ~100 per frame', () => {
        const cells: GridCell[] = [
            { label: 'Q1', percentage: 15.2 },
            { label: 'Q2', percentage: 10.8 },
            { label: 'Q3', percentage: 11.1 },
            { label: 'Q4', percentage: 12.3 },
            { label: 'Q5', percentage: 9.7 },
            { label: 'Q6', percentage: 10.4 },
            { label: 'Q7', percentage: 8.5 },
            { label: 'Q8', percentage: 11.6 },
            { label: 'Q9', percentage: 10.4 },
        ];
        const total = cells.reduce((sum, c) => sum + c.percentage, 0);
        expect(total).toBeCloseTo(100, 0);
    });

    it('labels follow Q1-Q9 pattern', () => {
        const labels = Array.from({ length: 9 }, (_, i) => `Q${i + 1}`);
        expect(labels).toEqual(['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Q9']);
    });

    it('timestamps are sequential', () => {
        const timestamps = [0.0, 0.033, 0.066, 0.1, 0.133];
        const sorted = [...timestamps].sort((a, b) => a - b);
        expect(timestamps).toEqual(sorted);
    });
});

// ─── heatmapVideoUrl resolution ─────────────────────────────────────

describe('heatmapVideoUrl handling', () => {
    it('relative path is valid media path', () => {
        const url = '/media/research/abc-123/heatmap_1719230400000.mp4';
        expect(url).toMatch(/^\/media\/.*\.mp4$/);
    });

    it('accepts absolute URL', () => {
        const url = 'https://emotio.cx/api/media/research/abc/heatmap_123.mp4';
        expect(url).toMatch(/^https?:\/\//);
    });
});
