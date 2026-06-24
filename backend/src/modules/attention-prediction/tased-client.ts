/**
 * HTTP streaming client for the TASED-Net Python microservice.
 *
 * Calls POST /predict-video on the FastAPI service, parses JSON-lines stream,
 * fires progress callbacks, and returns raw Float32Array saliency maps.
 *
 * Used exclusively for VIDEO saliency — images remain on TranSalNet ONNX.
 */

import http from 'node:http';

// ─── Types ──────────────────────────────────────────────────────────

export interface TasedFrameInput {
    path: string;      // absolute file path to frame PNG
    timestamp: number;  // seconds
}

export interface TasedResult {
    maps: Float32Array[];   // one saliency map per frame, (H*W) float32
    timestamps: number[];
    width: number;
    height: number;
}

export type TasedProgressCallback = (frame: number, total: number) => void;

// ─── Configuration ──────────────────────────────────────────────────

const TASED_SERVICE_URL = process.env.TASED_SERVICE_URL ?? 'http://localhost:8001';
const REQUEST_TIMEOUT_MS = 600_000; // 10 minutes

// ─── JSON-lines event types ─────────────────────────────────────────

interface ProgressLine {
    type: 'progress';
    frame: number;
    total: number;
}

interface ResultLine {
    type: 'result';
    maps: string[];       // base64-encoded Float32Arrays
    timestamps: number[];
    width: number;
    height: number;
}

type StreamLine = ProgressLine | ResultLine;

// ─── Stream parsing ─────────────────────────────────────────────────

/**
 * Parse a single JSON-line into a typed event.
 * Returns null for empty or unparseable lines.
 */
export function parseStreamLine(line: string): StreamLine | null {
    const trimmed = line.trim();
    try {
        return trimmed.length > 0 ? JSON.parse(trimmed) as StreamLine : null;
    } catch {
        return null;
    }
}

/**
 * Decode a base64-encoded Float32Array saliency map.
 */
export function decodeBase64Map(encoded: string): Float32Array {
    const buffer = Buffer.from(encoded, 'base64');
    return new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
}

// ─── Line-by-line event processing ──────────────────────────────────

const LINE_HANDLERS: Record<string, (
    line: StreamLine,
    onProgress: TasedProgressCallback | undefined,
    resultRef: { value: TasedResult | null },
) => void> = {
    progress: (line, onProgress) => {
        const { frame, total } = line as ProgressLine;
        onProgress?.(frame, total);
    },
    result: (line, _onProgress, resultRef) => {
        const { maps, timestamps, width, height } = line as ResultLine;
        resultRef.value = {
            maps: maps.map(decodeBase64Map),
            timestamps,
            width,
            height,
        };
    },
};

function processLine(
    line: StreamLine,
    onProgress: TasedProgressCallback | undefined,
    resultRef: { value: TasedResult | null },
): void {
    const handler = LINE_HANDLERS[line.type];
    handler?.(line, onProgress, resultRef);
}

// ─── Main client ────────────────────────────────────────────────────

/**
 * Call the TASED-Net Python service for video saliency prediction.
 *
 * Streams JSON-lines from the service, fires progress callbacks,
 * and resolves with decoded saliency maps.
 *
 * Throws on connection error, timeout, or missing result.
 */
export function predictWithTased(
    frames: TasedFrameInput[],
    onProgress?: TasedProgressCallback,
    outputWidth = 384,
    outputHeight = 224,
): Promise<TasedResult> {
    const payload = JSON.stringify({
        frame_paths: frames.map(f => f.path),
        timestamps: frames.map(f => f.timestamp),
        output_width: outputWidth,
        output_height: outputHeight,
    });

    const url = new URL('/predict-video', TASED_SERVICE_URL);

    return new Promise<TasedResult>((resolve, reject) => {
        const req = http.request(
            {
                hostname: url.hostname,
                port: url.port,
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload),
                },
                timeout: REQUEST_TIMEOUT_MS,
            },
            (res) => {
                const resultRef: { value: TasedResult | null } = { value: null };
                let buffer = '';

                res.setEncoding('utf-8');

                res.on('data', (chunk: string) => {
                    buffer += chunk;
                    const lines = buffer.split('\n');
                    // Keep the last incomplete line in the buffer
                    buffer = lines.pop() ?? '';

                    for (const rawLine of lines) {
                        const parsed = parseStreamLine(rawLine);
                        parsed && processLine(parsed, onProgress, resultRef);
                    }
                });

                res.on('end', () => {
                    // Process any remaining data in buffer
                    const lastParsed = parseStreamLine(buffer);
                    lastParsed && processLine(lastParsed, onProgress, resultRef);

                    resultRef.value
                        ? resolve(resultRef.value)
                        : reject(new Error('TASED-Net service returned no result event'));
                });

                res.on('error', reject);
            },
        );

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error(`TASED-Net service timeout after ${REQUEST_TIMEOUT_MS}ms`));
        });

        req.write(payload);
        req.end();
    });
}

// ─── Render video types ────────────────────────────────────────────

export interface RenderVideoInput {
    videoPath: string;
    gridRows?: number;
    gridCols?: number;
    overlayAlpha?: number;
    rotation?: number;
    flipHeatmapV?: boolean;
    logoPath?: string;
    footerHeight?: number;
    outputPath?: string;
}

export interface RenderGridCell {
    label: string;
    percentage: number;
}

export interface RenderFrameData {
    timestamp: number;
    cells: RenderGridCell[];
}

export interface RenderVideoResult {
    outputPath: string;
    overlayOnlyPath: string;
    durationS: number;
    fps: number;
    totalFrames: number;
    processedFrames: number;
    frames: RenderFrameData[];
}

interface RenderResultLine {
    type: 'result';
    output_path: string;
    overlay_only_path?: string;
    duration_s: number;
    fps: number;
    total_frames: number;
    processed_frames: number;
    frames: Array<{ timestamp: number; cells: Array<{ label: string; percentage: number }> }>;
}

// ─── Render video line processing ──────────────────────────────────

const RENDER_LINE_HANDLERS: Record<string, (
    line: StreamLine | RenderResultLine,
    onProgress: TasedProgressCallback | undefined,
    resultRef: { value: RenderVideoResult | null },
) => void> = {
    progress: (line, onProgress) => {
        const { frame, total } = line as ProgressLine;
        onProgress?.(frame, total);
    },
    result: (line, _onProgress, resultRef) => {
        const r = line as RenderResultLine;
        resultRef.value = {
            outputPath: r.output_path,
            overlayOnlyPath: r.overlay_only_path ?? '',
            durationS: r.duration_s,
            fps: r.fps,
            totalFrames: r.total_frames,
            processedFrames: r.processed_frames,
            frames: r.frames.map(f => ({
                timestamp: f.timestamp,
                cells: f.cells,
            })),
        };
    },
};

// ─── Render video client ───────────────────────────────────────────

/**
 * Call the Python service to render a video with DINO attention heatmap.
 *
 * Produces a side-by-side MP4: original | heatmap+grid, with optional logo footer.
 * Returns plain JSON (not streaming) — Python keeps the socket alive with asyncio.sleep.
 */
export function renderVideo(
    input: RenderVideoInput,
    _onProgress?: TasedProgressCallback,
): Promise<RenderVideoResult> {
    const payload = JSON.stringify({
        video_path: input.videoPath,
        grid_rows: input.gridRows ?? 3,
        grid_cols: input.gridCols ?? 3,
        overlay_alpha: input.overlayAlpha ?? 0.6,
        rotation: input.rotation ?? -1,
        flip_heatmap_v: input.flipHeatmapV ?? false,
        logo_path: input.logoPath ?? '',
        footer_height: input.footerHeight ?? 100,
        output_path: input.outputPath ?? '',
    });

    const url = new URL('/render-video', TASED_SERVICE_URL);

    return new Promise<RenderVideoResult>((resolve, reject) => {
        const req = http.request(
            {
                hostname: url.hostname,
                port: url.port,
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload),
                },
                timeout: REQUEST_TIMEOUT_MS,
            },
            (res) => {
                let body = '';
                res.setEncoding('utf-8');
                res.on('data', (chunk: string) => { body += chunk; });
                res.on('end', () => {
                    try {
                        const r = JSON.parse(body) as RenderResultLine;
                        resolve({
                            outputPath: r.output_path,
                            overlayOnlyPath: r.overlay_only_path ?? '',
                            durationS: r.duration_s,
                            fps: r.fps,
                            totalFrames: r.total_frames,
                            processedFrames: r.processed_frames,
                            frames: r.frames.map(f => ({ timestamp: f.timestamp, cells: f.cells })),
                        });
                    } catch (e) {
                        reject(new Error(`Failed to parse render response: ${(e as Error).message}`));
                    }
                });
                res.on('error', reject);
            },
        );

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error(`Render service timeout after ${REQUEST_TIMEOUT_MS}ms`));
        });

        req.write(payload);
        req.end();
    });
}

// ─── Health check ──────────────────────────────────────────────────

/**
 * Check whether the TASED-Net service is reachable.
 * Returns true on HTTP 200 from /health, false otherwise.
 */
export function isTasedServiceAvailable(): Promise<boolean> {
    const url = new URL('/health', TASED_SERVICE_URL);

    return new Promise<boolean>((resolve) => {
        const req = http.get(
            { hostname: url.hostname, port: url.port, path: url.pathname, timeout: 3000 },
            (res) => {
                res.resume(); // drain response
                resolve(res.statusCode === 200);
            },
        );
        req.on('error', () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
    });
}
