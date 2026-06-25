import { describe, it, expect, beforeEach } from 'vitest';
import { renderGridComposite, computeGridPercentages } from '../VideoFrameScrubber';
import type { HeatmapPoint } from '../HeatmapSettingsModal';

/* ─── Canvas 2D context mock ─── */

interface TrackedCall { method: string; args: unknown[] }

function createMockCtx() {
    const calls: TrackedCall[] = [];
    const track = (method: string) => (...args: unknown[]) => {
        calls.push({ method, args });
    };

    return {
        drawImage: track('drawImage'),
        beginPath: track('beginPath'),
        moveTo: track('moveTo'),
        lineTo: track('lineTo'),
        stroke: track('stroke'),
        fillText: track('fillText'),
        fillRect: track('fillRect'),
        arc: track('arc'),
        fill: track('fill'),
        save: track('save'),
        restore: track('restore'),
        clearRect: track('clearRect'),
        createRadialGradient: () => ({ addColorStop: () => {} }),
        globalAlpha: 1,
        strokeStyle: '',
        lineWidth: 0,
        font: '',
        textAlign: '',
        textBaseline: '',
        shadowColor: '',
        shadowBlur: 0,
        fillStyle: '',
        calls,
    } as unknown as CanvasRenderingContext2D & { calls: TrackedCall[] };
}

const VIDEO = { width: 1920, height: 1080 } as unknown as CanvasImageSource;

describe('computeGridPercentages', () => {
    it('distributes points into cells', () => {
        const data: HeatmapPoint[] = [
            { x: 10, y: 10, value: 1 },
            { x: 90, y: 90, value: 1 },
        ];
        const pcts = computeGridPercentages(data, 3, 3);
        expect(pcts[0]).toBe(50); // top-left
        expect(pcts[8]).toBe(50); // bottom-right
        expect(pcts[4]).toBe(0);  // center
    });

    it('returns zeros for empty data', () => {
        const pcts = computeGridPercentages([], 3, 3);
        expect(pcts.every(v => v === 0)).toBe(true);
    });

    it('sums to ~100%', () => {
        const data: HeatmapPoint[] = [
            { x: 10, y: 10, value: 3 },
            { x: 50, y: 50, value: 5 },
            { x: 80, y: 80, value: 2 },
        ];
        const pcts = computeGridPercentages(data, 3, 3);
        const total = pcts.reduce((s, v) => s + v, 0);
        expect(total).toBeCloseTo(100, 0);
    });
});

describe('renderGridComposite', () => {
    let ctx: ReturnType<typeof createMockCtx>;

    beforeEach(() => { ctx = createMockCtx(); });

    it('draws video frame as first drawImage call', () => {
        renderGridComposite(ctx, VIDEO, [], 1920, 1080, 3, 3, new Array(9).fill(10));
        const first = ctx.calls.find(c => c.method === 'drawImage');
        expect(first).toBeDefined();
        expect(first!.args[0]).toBe(VIDEO);
    });

    it('draws correct grid lines for 3x3', () => {
        renderGridComposite(ctx, VIDEO, [], 1920, 1080, 3, 3, new Array(9).fill(10));
        const strokeCalls = ctx.calls.filter(c => c.method === 'stroke');
        expect(strokeCalls).toHaveLength(4); // 2 horizontal + 2 vertical
    });

    it('draws correct grid lines for 5x5', () => {
        renderGridComposite(ctx, VIDEO, [], 1920, 1080, 5, 5, new Array(25).fill(4));
        const strokeCalls = ctx.calls.filter(c => c.method === 'stroke');
        expect(strokeCalls).toHaveLength(8); // 4 + 4
    });

    it('draws one label per cell', () => {
        renderGridComposite(ctx, VIDEO, [], 1920, 1080, 3, 3, [20, 15, 10, 8, 5, 12, 10, 10, 10]);
        const labels = ctx.calls.filter(c => c.method === 'fillText');
        expect(labels).toHaveLength(9);
    });

    it('labels contain cell ID and percentage', () => {
        renderGridComposite(ctx, VIDEO, [], 1920, 1080, 3, 3, [25.5, 0, 0, 0, 0, 0, 0, 0, 74.5]);
        const labels = ctx.calls.filter(c => c.method === 'fillText').map(c => c.args[0]);
        expect(labels[0]).toBe('A1: 25.5%');
        expect(labels[8]).toBe('C3: 74.5%');
    });

    it('grid lines at correct positions for 900x600', () => {
        renderGridComposite(ctx, VIDEO, [], 900, 600, 3, 3, new Array(9).fill(10));
        const moves = ctx.calls.filter(c => c.method === 'moveTo');
        const lines = ctx.calls.filter(c => c.method === 'lineTo');

        expect(moves[0].args).toEqual([0, 200]);
        expect(lines[0].args).toEqual([900, 200]);
        expect(moves[1].args).toEqual([0, 400]);
        expect(lines[1].args).toEqual([900, 400]);
        expect(moves[2].args).toEqual([300, 0]);
        expect(lines[2].args).toEqual([300, 600]);
        expect(moves[3].args).toEqual([600, 0]);
        expect(lines[3].args).toEqual([600, 600]);
    });

    it('2x2 grid: 4 labels, 2 lines', () => {
        renderGridComposite(ctx, VIDEO, [], 800, 800, 2, 2, [40, 30, 20, 10]);
        expect(ctx.calls.filter(c => c.method === 'fillText')).toHaveLength(4);
        expect(ctx.calls.filter(c => c.method === 'stroke')).toHaveLength(2);
    });

    it('5x5 grid: 25 labels, 8 lines', () => {
        renderGridComposite(ctx, VIDEO, [], 1000, 1000, 5, 5, new Array(25).fill(4));
        expect(ctx.calls.filter(c => c.method === 'fillText')).toHaveLength(25);
        expect(ctx.calls.filter(c => c.method === 'stroke')).toHaveLength(8);
    });
});
