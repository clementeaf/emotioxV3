import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { extractVideoThumbnail } from '../extractVideoThumbnail';

// ── Helpers ──────────────────────────────────────────────────────────────

/** Minimal mock video that fires lifecycle events on src assignment. */
function createMockVideo(): HTMLVideoElement {
    const listeners = new Map<string, EventListener>();
    const el = {
        muted: false,
        playsInline: false,
        preload: '',
        crossOrigin: '',
        src: '',
        videoWidth: 640,
        videoHeight: 480,
        duration: 10,
        currentTime: 0,
        addEventListener: vi.fn((event: string, handler: EventListener, _opts?: unknown) => { // eslint-disable-line @typescript-eslint/no-unused-vars
            listeners.set(event, handler);
        }),
        removeAttribute: vi.fn(),
        load: vi.fn(),
    } as unknown as HTMLVideoElement;

    // When src is set, fire loadedmetadata → then seeked after currentTime set
    const srcDescriptor: PropertyDescriptor = {
        set(value: string) {
            (el as Record<string, unknown>)._src = value;
            // Fire loadedmetadata async (next tick)
            queueMicrotask(() => {
                const onMeta = listeners.get('loadedmetadata');
                if (onMeta) (onMeta as () => void)();
            });
        },
        get() {
            return (el as Record<string, unknown>)._src as string;
        },
    };
    Object.defineProperty(el, 'src', srcDescriptor);

    // When currentTime is set, fire seeked
    const ctDescriptor: PropertyDescriptor = {
        set(value: number) {
            (el as Record<string, unknown>)._ct = value;
            queueMicrotask(() => {
                const onSeeked = listeners.get('seeked');
                if (onSeeked) (onSeeked as () => void)();
            });
        },
        get() {
            return ((el as Record<string, unknown>)._ct as number) ?? 0;
        },
    };
    Object.defineProperty(el, 'currentTime', ctDescriptor);

    return el;
}

let mockVideo: HTMLVideoElement;
const originalCreateElement = document.createElement.bind(document);

beforeEach(() => {
    mockVideo = createMockVideo();
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'video') return mockVideo;
        if (tag === 'canvas') {
            return {
                width: 0,
                height: 0,
                getContext: () => ({ drawImage: vi.fn() }),
                toBlob: (cb: BlobCallback) => {
                    cb(new Blob(['fake'], { type: 'image/png' }));
                },
            } as unknown as HTMLCanvasElement;
        }
        return originalCreateElement(tag);
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:thumb');
});

afterEach(() => {
    vi.restoreAllMocks();
});

// ── Tests ────────────────────────────────────────────────────────────────

describe('extractVideoThumbnail', () => {
    it('sets preload="metadata" on the video element (no full download)', async () => {
        const promise = extractVideoThumbnail('https://emotio.cx/media/video.mp4');
        const result = await promise;

        expect(mockVideo.preload).toBe('metadata');
        expect(result).toBe('blob:thumb');
    });

    it('sets crossOrigin="anonymous" for canvas taint safety', async () => {
        await extractVideoThumbnail('https://emotio.cx/media/video.mp4');
        expect(mockVideo.crossOrigin).toBe('anonymous');
    });

    it('does NOT fetch the entire video as a blob', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch');
        await extractVideoThumbnail('https://emotio.cx/media/video.mp4');
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('seeks to min(duration/2, 5) for fast thumbnail', async () => {
        // duration is 10, so should seek to 5
        await extractVideoThumbnail('https://emotio.cx/media/video.mp4');
        expect((mockVideo as Record<string, unknown>)._ct).toBe(5);
    });

    it('cleans up video src after extraction', async () => {
        await extractVideoThumbnail('https://emotio.cx/media/video.mp4');
        expect(mockVideo.removeAttribute).toHaveBeenCalledWith('src');
        expect(mockVideo.load).toHaveBeenCalled();
    });
});
