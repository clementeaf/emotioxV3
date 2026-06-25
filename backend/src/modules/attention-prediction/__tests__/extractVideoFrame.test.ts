import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock node:child_process before importing
vi.mock('node:child_process', () => {
    const execFileMock = vi.fn();
    const spawnMock = vi.fn();
    return { execFile: execFileMock, spawn: spawnMock };
});

import { extractVideoFrame } from '../video-prediction.service';
import { execFile } from 'node:child_process';

const mockExecFile = execFile as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
    vi.clearAllMocks();
});

function setupExecFile(durationStderr: string | null) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockExecFile.mockImplementation((_cmd: any, args: any, cb: any) => {
        const argArr = args as string[];

        // Duration probe call
        if (argArr.includes('-f') && argArr.includes('null')) {
            if (durationStderr) {
                const err = Object.assign(new Error('probe'), { stderr: durationStderr });
                cb(err);
            } else {
                cb(new Error('probe failed'));
            }
            return;
        }
        // Frame extraction call — success
        cb(null, { stdout: '', stderr: '' });
    });
}

describe('extractVideoFrame', () => {
    it('returns a .thumb.jpg path', async () => {
        setupExecFile('  Duration: 00:00:10.00, start:');
        const result = await extractVideoFrame('/tmp/test.mp4');
        expect(result).toBe('/tmp/test.mp4.thumb.jpg');
    });

    it('seeks to midpoint of detected duration', async () => {
        setupExecFile('  Duration: 00:01:00.00, start:');
        await extractVideoFrame('/tmp/video.mp4');

        const extractCall = mockExecFile.mock.calls.find(
            (c: unknown[]) => (c[1] as string[]).includes('-frames:v'),
        );
        expect(extractCall).toBeDefined();
        const args = extractCall![1] as string[];
        const ssIndex = args.indexOf('-ss');
        expect(args[ssIndex + 1]).toBe('30');
    });

    it('falls back to 1s seek when duration probe fails', async () => {
        setupExecFile(null);
        await extractVideoFrame('/tmp/video.webm');

        const extractCall = mockExecFile.mock.calls.find(
            (c: unknown[]) => (c[1] as string[]).includes('-frames:v'),
        );
        const args = extractCall![1] as string[];
        const ssIndex = args.indexOf('-ss');
        expect(args[ssIndex + 1]).toBe('1');
    });

    it('parses hours in duration correctly', async () => {
        setupExecFile('  Duration: 01:30:00.00, start:');
        await extractVideoFrame('/tmp/long.mp4');

        const extractCall = mockExecFile.mock.calls.find(
            (c: unknown[]) => (c[1] as string[]).includes('-frames:v'),
        );
        const args = extractCall![1] as string[];
        const ssIndex = args.indexOf('-ss');
        expect(args[ssIndex + 1]).toBe('2700');
    });

    it('extracts exactly 1 frame as JPEG', async () => {
        setupExecFile('  Duration: 00:00:04.00');
        await extractVideoFrame('/tmp/clip.mp4');

        const extractCall = mockExecFile.mock.calls.find(
            (c: unknown[]) => (c[1] as string[]).includes('-frames:v'),
        );
        const args = extractCall![1] as string[];
        expect(args).toContain('-frames:v');
        expect(args).toContain('1');
        expect(args).toContain('-q:v');
        expect(args[args.length - 1]).toBe('/tmp/clip.mp4.thumb.jpg');
    });
});
