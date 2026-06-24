import { describe, expect, it } from 'vitest';
import { parseStreamLine } from '../tased-client';

// ─── parseStreamLine for render-video events ─────────────────────────

describe('parseStreamLine (render-video events)', () => {
    it('parses a render progress event', () => {
        const line = '{"type":"progress","frame":5,"total":100}';
        const result = parseStreamLine(line);
        expect(result).toEqual({ type: 'progress', frame: 5, total: 100 });
    });

    it('parses a render result event', () => {
        const line = JSON.stringify({
            type: 'result',
            output_path: '/tmp/output.mp4',
            duration_s: 24.0,
            fps: 30.0,
            total_frames: 720,
            processed_frames: 720,
            frames: [
                {
                    timestamp: 0.0,
                    cells: [
                        { label: 'Q1', percentage: 15.2 },
                        { label: 'Q2', percentage: 10.8 },
                    ],
                },
            ],
        });

        const result = parseStreamLine(line) as unknown as Record<string, unknown>;
        expect(result).not.toBeNull();
        expect(result.type).toBe('result');
        expect(result.output_path).toBe('/tmp/output.mp4');
        expect(result.duration_s).toBe(24.0);
        expect(result.total_frames).toBe(720);

        const frames = result.frames as Array<{ timestamp: number; cells: Array<{ label: string; percentage: number }> }>;
        expect(frames).toHaveLength(1);
        expect(frames[0].cells).toHaveLength(2);
        expect(frames[0].cells[0].label).toBe('Q1');
        expect(frames[0].cells[0].percentage).toBe(15.2);
    });

    it('returns null for empty line', () => {
        expect(parseStreamLine('')).toBeNull();
    });

    it('returns null for malformed JSON', () => {
        expect(parseStreamLine('{broken')).toBeNull();
    });
});

// ─── RenderVideoResult shape validation ─────────────────────────────

describe('RenderVideoResult type contract', () => {
    it('result event contains all required fields', () => {
        const resultJson = {
            type: 'result',
            output_path: '/media/research/abc/heatmap_123.mp4',
            duration_s: 10.5,
            fps: 30,
            total_frames: 315,
            processed_frames: 315,
            frames: Array.from({ length: 5 }, (_, i) => ({
                timestamp: i * 2.0,
                cells: Array.from({ length: 9 }, (_, j) => ({
                    label: `Q${j + 1}`,
                    percentage: 100 / 9,
                })),
            })),
        };

        const parsed = parseStreamLine(JSON.stringify(resultJson)) as unknown as Record<string, unknown>;
        expect(parsed.type).toBe('result');
        expect(typeof parsed.output_path).toBe('string');
        expect(typeof parsed.duration_s).toBe('number');
        expect(typeof parsed.fps).toBe('number');
        expect(typeof parsed.total_frames).toBe('number');
        expect(typeof parsed.processed_frames).toBe('number');

        const frames = parsed.frames as Array<{ cells: unknown[] }>;
        expect(frames).toHaveLength(5);
        expect(frames[0].cells).toHaveLength(9);
    });

    it('grid cells percentages sum to ~100', () => {
        const cells = Array.from({ length: 9 }, (_, j) => ({
            label: `Q${j + 1}`,
            percentage: 100 / 9,
        }));
        const total = cells.reduce((sum, c) => sum + c.percentage, 0);
        expect(total).toBeCloseTo(100, 0);
    });
});

// ─── Progress callback accumulation ─────────────────────────────────

describe('progress event streaming', () => {
    it('sequential progress lines parse correctly', () => {
        const lines = [
            '{"type":"progress","frame":1,"total":10}',
            '{"type":"progress","frame":2,"total":10}',
            '{"type":"progress","frame":10,"total":10}',
        ];

        const parsed = lines.map(parseStreamLine).filter(Boolean);
        expect(parsed).toHaveLength(3);
        expect((parsed[0] as unknown as Record<string, unknown>).frame).toBe(1);
        expect((parsed[2] as unknown as Record<string, unknown>).frame).toBe(10);
    });

    it('interleaved empty lines are skipped', () => {
        const lines = [
            '{"type":"progress","frame":1,"total":5}',
            '',
            '   ',
            '{"type":"progress","frame":2,"total":5}',
        ];

        const parsed = lines.map(parseStreamLine).filter(Boolean);
        expect(parsed).toHaveLength(2);
    });
});
