import { describe, it, expect } from 'vitest';
import { resolveFrameIndex, modulateAccumulatedByFrame } from '../AttentionPredictionCard';
import type { VideoFrameData } from '../VideoFrameScrubber';
import type { HeatmapPoint } from '../HeatmapSettingsModal';

const frames = (timestamps: number[]) => timestamps.map(t => ({ timestamp: t }));

describe('resolveFrameIndex', () => {
    const everyTwoSeconds = frames([0, 2, 4, 6, 8, 10]);

    it('returns 0 for currentTime before first frame', () => {
        expect(resolveFrameIndex(everyTwoSeconds, -1)).toBe(0);
    });

    it('returns 0 for currentTime exactly at first frame', () => {
        expect(resolveFrameIndex(everyTwoSeconds, 0)).toBe(0);
    });

    it('returns last eligible frame when between two frames', () => {
        expect(resolveFrameIndex(everyTwoSeconds, 3.5)).toBe(1);
    });

    it('returns exact match frame', () => {
        expect(resolveFrameIndex(everyTwoSeconds, 6)).toBe(3);
    });

    it('returns last frame when currentTime exceeds all timestamps', () => {
        expect(resolveFrameIndex(everyTwoSeconds, 999)).toBe(5);
    });

    it('returns 0 for empty frames array', () => {
        expect(resolveFrameIndex([], 5)).toBe(0);
    });

    it('returns 0 for single-frame array when time matches', () => {
        expect(resolveFrameIndex(frames([0]), 0)).toBe(0);
    });

    it('returns 0 for single-frame array when time exceeds', () => {
        expect(resolveFrameIndex(frames([0]), 10)).toBe(0);
    });

    it('handles non-uniform intervals', () => {
        const irregular = frames([0, 1, 5, 5.5, 20]);
        expect(resolveFrameIndex(irregular, 5.2)).toBe(2);
        expect(resolveFrameIndex(irregular, 5.5)).toBe(3);
        expect(resolveFrameIndex(irregular, 19.9)).toBe(3);
        expect(resolveFrameIndex(irregular, 20)).toBe(4);
    });

    it('progresses through all frames sequentially during playback', () => {
        const result = everyTwoSeconds.map((_, i) =>
            resolveFrameIndex(everyTwoSeconds, i * 2 + 0.5),
        );
        expect(result).toEqual([0, 1, 2, 3, 4, 5]);
    });
});

/* ─── modulateAccumulatedByFrame ─── */

const pt = (x: number, y: number, value = 0.8): HeatmapPoint => ({ x, y, value });

const accumulated: HeatmapPoint[] = [
    pt(10, 10, 1.0),  // top-left
    pt(50, 50, 1.0),  // center
    pt(90, 90, 1.0),  // bottom-right
];

const makeFrames = (hotspots: Array<{ x: number; y: number }>): VideoFrameData[] => [
    {
        mediaId: 'f0',
        timestamp: 0,
        heatmapData: hotspots.map(h => pt(h.x, h.y, 0.9)),
    },
];

describe('modulateAccumulatedByFrame', () => {
    it('returns accumulated unchanged when frame has no heatmapData', () => {
        const emptyFrames: VideoFrameData[] = [{ mediaId: 'a', timestamp: 0 }];
        const result = modulateAccumulatedByFrame(accumulated, emptyFrames, 0);
        expect(result).toBe(accumulated);
    });

    it('returns accumulated unchanged when centerIdx is out of bounds', () => {
        const vf = makeFrames([{ x: 50, y: 50 }]);
        const result = modulateAccumulatedByFrame(accumulated, vf, 99);
        expect(result).toBe(accumulated);
    });

    it('returns accumulated unchanged when frames array is empty', () => {
        const result = modulateAccumulatedByFrame(accumulated, [], 0);
        expect(result).toBe(accumulated);
    });

    it('preserves point count (same length as accumulated)', () => {
        const vf = makeFrames([{ x: 50, y: 50 }]);
        const result = modulateAccumulatedByFrame(accumulated, vf, 0);
        expect(result).toHaveLength(accumulated.length);
    });

    it('preserves x/y coordinates without mutation', () => {
        const vf = makeFrames([{ x: 50, y: 50 }]);
        const result = modulateAccumulatedByFrame(accumulated, vf, 0);
        result.forEach((rp, i) => {
            expect(rp.x).toBe(accumulated[i].x);
            expect(rp.y).toBe(accumulated[i].y);
        });
    });

    it('boosts points near frame hotspot (value close to original)', () => {
        // Hotspot at center (50,50) — accumulated point at (50,50) should retain ~full intensity
        const vf = makeFrames([{ x: 50, y: 50 }]);
        const result = modulateAccumulatedByFrame(accumulated, vf, 0);
        const centerPoint = result.find(p => p.x === 50 && p.y === 50)!;
        // multiplier = baseAtt + (1-baseAtt) * proximity; at dist=0 proximity=1 → multiplier=1.0
        expect(centerPoint.value).toBeCloseTo(1.0, 2);
    });

    it('attenuates points far from frame hotspots', () => {
        // Hotspot at (10,10) — point at (90,90) is far → attenuated
        const vf = makeFrames([{ x: 10, y: 10 }]);
        const result = modulateAccumulatedByFrame(accumulated, vf, 0);
        const farPoint = result.find(p => p.x === 90 && p.y === 90)!;
        // dist from (10,10) to (90,90) = ~113 >> boostRadius=12 → proximity≈0 → multiplier≈0.25
        expect(farPoint.value).toBeCloseTo(0.25, 2);
    });

    it('does not mutate original accumulated array', () => {
        const original = accumulated.map(p => ({ ...p }));
        const vf = makeFrames([{ x: 50, y: 50 }]);
        modulateAccumulatedByFrame(accumulated, vf, 0);
        accumulated.forEach((p, i) => {
            expect(p.value).toBe(original[i].value);
        });
    });

    it('different frame indices produce different modulations', () => {
        const vf: VideoFrameData[] = [
            { mediaId: 'f0', timestamp: 0, heatmapData: [pt(10, 10, 0.9)] },
            { mediaId: 'f1', timestamp: 2, heatmapData: [pt(90, 90, 0.9)] },
        ];
        const r0 = modulateAccumulatedByFrame(accumulated, vf, 0);
        const r1 = modulateAccumulatedByFrame(accumulated, vf, 1);
        // Frame 0 hotspot at top-left → top-left bright, bottom-right dim
        // Frame 1 hotspot at bottom-right → opposite
        const topLeft0 = r0.find(p => p.x === 10)!.value;
        const topLeft1 = r1.find(p => p.x === 10)!.value;
        expect(topLeft0).toBeGreaterThan(topLeft1);
    });

    it('respects custom baseAttenuation', () => {
        const vf = makeFrames([{ x: 10, y: 10 }]);
        const resultLow = modulateAccumulatedByFrame(accumulated, vf, 0, 0.1);
        const resultHigh = modulateAccumulatedByFrame(accumulated, vf, 0, 0.5);
        const farLow = resultLow.find(p => p.x === 90)!.value;
        const farHigh = resultHigh.find(p => p.x === 90)!.value;
        expect(farLow).toBeCloseTo(0.1, 2);
        expect(farHigh).toBeCloseTo(0.5, 2);
    });

    it('respects custom boostRadius', () => {
        // Hotspot at (50,50), point at (55,50) = dist 5
        const acc = [pt(55, 50, 1.0)];
        const vf = makeFrames([{ x: 50, y: 50 }]);
        // Small radius (3): dist=5 > radius → attenuated
        const smallR = modulateAccumulatedByFrame(acc, vf, 0, 0.25, 3);
        // Large radius (20): dist=5 within radius → boosted
        const largeR = modulateAccumulatedByFrame(acc, vf, 0, 0.25, 20);
        expect(largeR[0].value).toBeGreaterThan(smallR[0].value);
    });

    it('multiple hotspots boost from nearest one', () => {
        // Two hotspots: one near top-left, one near bottom-right
        const vf = makeFrames([{ x: 10, y: 10 }, { x: 90, y: 90 }]);
        const result = modulateAccumulatedByFrame(accumulated, vf, 0);
        // Both corners should be boosted, center might be attenuated
        const topLeft = result.find(p => p.x === 10)!.value;
        const bottomRight = result.find(p => p.x === 90)!.value;
        const center = result.find(p => p.x === 50)!.value;
        expect(topLeft).toBeGreaterThan(center);
        expect(bottomRight).toBeGreaterThan(center);
    });
});
