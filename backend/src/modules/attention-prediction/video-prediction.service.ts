/**
 * Video Attention Prediction Service
 * Processes video frames sequentially through TranSalNet, accumulates saliency,
 * runs hybrid saliency on the accumulated map, and computes temporal grid attention.
 *
 * Memory-efficient: keeps a single running sum (~442KB) + 1 active frame.
 * Peak memory: ~1.3MB regardless of frame count.
 */

import {
    predictAttentionFast,
    computeAutoPresets,
    computeGriddedAOIs,
    extractHeatmapPoints,
    suppressWhitespaceSaliency,
} from './attention-prediction.service';
import { type AnalysisProfile } from './ai-analysis.service';
import { getMediaPath, getMediaUrl } from '../../config/local-storage';
import type { VideoJobEvent } from './video-prediction-jobs';
import { predictWithTased, renderVideo as renderVideoClient, type TasedResult, type RenderVideoResult, type RenderVideoInput } from './tased-client';
import path from 'node:path';
import fs from 'node:fs';

// ─── Types ───────────────────────────────────────────────────────────

export interface VideoFrameInput {
    mediaId: string;
    timestamp: number; // seconds
    s3Key: string;
}

export interface VideoFrameResult {
    mediaId: string;
    timestamp: number;
    heatmapData: Array<{ x: number; y: number; value: number }>;
}

export interface TemporalGridCell {
    label: string;
    row: number;
    col: number;
    timeSeries: number[]; // attention value per frame
}

export interface VideoPredictionResult {
    accumulatedHeatmapData: Array<{ x: number; y: number; value: number }>;
    autoPresets: { blur: number; opacity: number; threshold: number; concentration: number; coverage: number };
    griddedAOIs: Array<{ label: string; x: number; y: number; width: number; height: number; attention: number; rank: number }>;
    frames: VideoFrameResult[];
    temporalGrid: TemporalGridCell[];
    aoiAttention?: Record<string, { totalAttention: number; frameCount: number }>;
    thermalMap?: string;       // base64-encoded Uint8Array (dense saliency, 0-255)
    thermalMapWidth?: number;  // pixel width of thermal map
    thermalMapHeight?: number; // pixel height of thermal map
    totalFrames: number;
    failedFrames: number;
    processingTimeMs: number;
}

export interface AoiTimeRange {
    aoiId: string;
    startTime: number; // seconds
    endTime: number;   // seconds
}

export interface VideoGridConfig {
    cols: number; // 2-10
    rows: number; // 2-10
}

export type ProgressCallback = (event: VideoJobEvent) => void;

// ─── Constants ───────────────────────────────────────────────────────

const MAX_FRAMES = 120;
const DEFAULT_GRID_COLS = 4;
const DEFAULT_GRID_ROWS = 4;
const FRAME_TIMEOUT_MS = 60_000; // 60s per frame — abort if ONNX hangs

/** Wraps a promise with a timeout. Rejects if not resolved within ms. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Timeout: ${label} exceeded ${ms}ms`)), ms);
        promise.then(
            (v) => { clearTimeout(timer); resolve(v); },
            (e) => { clearTimeout(timer); reject(e); },
        );
    });
}

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Resolves peak extraction options from API threshold (legacy 0-1 float).
 * @param threshold - Minimum saliency on normalized map
 * @param maxPoints - Cap on exported hotspots
 * @returns Options for extractHeatmapPoints
 */
function buildExtractOptions(
    threshold: number,
    maxPoints: number,
    forAccumulated = false,
): { minAbsolute: number; maxPoints: number; gridCols: number; minRelative: number } {
    // Accumulated video maps are smoother (averaged across frames) — use relaxed thresholds
    if (forAccumulated) {
        return {
            minAbsolute: Math.max(0.15, threshold * 0.5),
            maxPoints,
            gridCols: 48,
            minRelative: 0.25,
        };
    }
    return {
        minAbsolute: Math.max(0.4, threshold),
        maxPoints,
        gridCols: maxPoints > 60 ? 28 : 24,
        minRelative: 0.58,
    };
}

/**
 * Compute average saliency for a single grid cell from a saliency map.
 */
export function computeCellAverage(
    map: Float32Array,
    w: number,
    h: number,
    gridRow: number,
    gridCol: number,
    gridCols: number,
    gridRows: number,
): number {
    const cellW = Math.floor(w / gridCols);
    const cellH = Math.floor(h / gridRows);
    const startCol = gridCol * cellW;
    const startRow = gridRow * cellH;
    const endCol = Math.min(startCol + cellW, w);
    const endRow = Math.min(startRow + cellH, h);

    let sum = 0;
    let count = 0;
    for (let r = startRow; r < endRow; r++) {
        for (let c = startCol; c < endCol; c++) {
            sum += map[r * w + c];
            count++;
        }
    }
    return count > 0 ? sum / count : 0;
}

// ─── Main Pipeline ───────────────────────────────────────────────────

export async function predictVideoFrames(
    frames: VideoFrameInput[],
    threshold: number,
    profile?: AnalysisProfile,
    onProgress?: ProgressCallback,
    gridConfig?: VideoGridConfig,
    aoiTimeRanges?: AoiTimeRange[],
): Promise<VideoPredictionResult> {
    if (frames.length > MAX_FRAMES) {
        throw new Error(`Too many frames: ${frames.length} (max ${MAX_FRAMES})`);
    }
    if (frames.length === 0) {
        throw new Error('No frames provided');
    }

    const gridCols = Math.max(2, Math.min(10, gridConfig?.cols ?? DEFAULT_GRID_COLS));
    const gridRows = Math.max(2, Math.min(10, gridConfig?.rows ?? DEFAULT_GRID_ROWS));

    const startTime = Date.now();
    const totalFrames = frames.length;

    // Running accumulator (memory-efficient: ~442KB fixed)
    let runningSum: Float32Array | null = null;
    let mapWidth = 0;
    let mapHeight = 0;
    let successCount = 0;
    let failedFrames = 0;

    // Per-frame results
    const frameResults: VideoFrameResult[] = [];

    // Temporal grid: gridCols*gridRows cells, each with a time series
    const gridAttention: number[][] = Array.from(
        { length: gridCols * gridRows },
        () => [],
    );

    // Representative frame path for hybrid saliency (middle frame)
    const middleIdx = Math.floor(frames.length / 2);
    let representativeFramePath = '';

    // ─── Phase 1: Sequential frame prediction ────────────────────────

    for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        const imagePath = getMediaPath(frame.s3Key);

        try {
            console.error(`[VideoPrediction] Frame ${i}/${frames.length} starting (${frame.mediaId})`);
            const { map, width, height } = await withTimeout(
                predictAttentionFast(imagePath),
                FRAME_TIMEOUT_MS,
                `Frame ${i} (${frame.mediaId})`,
            );

            // Initialize accumulator on first success
            if (!runningSum) {
                mapWidth = width;
                mapHeight = height;
                runningSum = new Float32Array(width * height);
            }

            // Accumulate running sum
            for (let j = 0; j < map.length; j++) {
                runningSum[j] += map[j];
            }

            // Extract per-frame heatmap points (coarser step)
            const heatmapData = extractHeatmapPoints(
                map,
                width,
                height,
                buildExtractOptions(threshold, 48),
            );
            frameResults.push({
                mediaId: frame.mediaId,
                timestamp: frame.timestamp,
                heatmapData,
            });

            // Compute per-cell attention for temporal grid
            for (let gr = 0; gr < gridRows; gr++) {
                for (let gc = 0; gc < gridCols; gc++) {
                    const cellIdx = gr * gridCols + gc;
                    gridAttention[cellIdx].push(
                        computeCellAverage(map, width, height, gr, gc, gridCols, gridRows),
                    );
                }
            }

            // Track representative frame
            if (i === middleIdx) {
                representativeFramePath = imagePath;
            }

            successCount++;

            onProgress?.({
                type: 'frame-complete',
                frameIndex: i,
                totalFrames,
                mediaId: frame.mediaId,
                timestamp: frame.timestamp,
            });
        } catch (err) {
            failedFrames++;
            console.error(`[VideoPrediction] Frame ${i} failed (${frame.mediaId}):`, err);

            // Push zeros for temporal grid continuity
            for (let cellIdx = 0; cellIdx < gridCols * gridRows; cellIdx++) {
                gridAttention[cellIdx].push(0);
            }

            onProgress?.({
                type: 'frame-error',
                frameIndex: i,
                totalFrames,
                mediaId: frame.mediaId,
                timestamp: frame.timestamp,
                error: err instanceof Error ? err.message : 'Unknown error',
            });

            // Abort if >50% failed
            if (failedFrames > totalFrames / 2) {
                onProgress?.({
                    type: 'error',
                    totalFrames,
                    error: `Too many frame failures: ${failedFrames}/${totalFrames}`,
                });
                throw new Error(`Aborted: ${failedFrames}/${totalFrames} frames failed`);
            }
        }
    }

    console.error(`[VideoPrediction] All frames done: ${successCount} success, ${failedFrames} failed`);

    if (!runningSum || successCount === 0) {
        throw new Error('No frames were successfully processed');
    }

    // ─── Phase 2: Compute accumulated map ────────────────────────────

    onProgress?.({
        type: 'accumulating',
        totalFrames,
        successfulFrames: successCount,
    });

    const accumulated = new Float32Array(runningSum.length);
    for (let i = 0; i < accumulated.length; i++) {
        accumulated[i] = runningSum[i] / successCount;
    }

    // Free running sum
    runningSum = null;

    // ─── Phase 3: Hybrid saliency on accumulated map ─────────────────

    // Skip hybrid saliency + whitespace suppression for video.
    // Temporal averaging across frames already provides robust saliency.
    // Whitespace suppression is designed for isolated products, not video scenes.
    console.error('[VideoPrediction] Phase 3: skipping hybrid saliency + whitespace (video mode)');
    onProgress?.({ type: 'hybrid', totalFrames });

    const finalMap: Float32Array = accumulated;

    console.error('[VideoPrediction] Phase 4: computing final outputs');
    // ─── Phase 4: Compute final outputs ──────────────────────────────

    const autoPresets = computeAutoPresets(finalMap);
    const griddedAOIs = computeGriddedAOIs(finalMap, mapWidth, mapHeight);

    // Dense uniform sampling — stride-based single pass.
    // NMS fails on averaged maps (values too uniform), so we sample every Nth pixel.
    const DENSE_STEP = 8; // ~48×36 = ~1700 max points
    const rowStride = mapWidth * DENSE_STEP; // jump DENSE_STEP rows at a time
    const invW = 100 / mapWidth;
    const invH = 100 / mapHeight;
    const accumulatedHeatmapData: Array<{ x: number; y: number; value: number }> = [];

    for (let rowStart = 0; rowStart < finalMap.length; rowStart += rowStride) {
        const row = (rowStart / mapWidth) | 0;
        const yPct = row * invH;
        const rowEnd = Math.min(rowStart + mapWidth, finalMap.length);
        for (let idx = rowStart; idx < rowEnd; idx += DENSE_STEP) {
            const val = finalMap[idx];
            if (val > 0.05) {
                accumulatedHeatmapData.push({ x: (idx - rowStart) * invW, y: yPct, value: val });
            }
        }
    }
    console.error(`[VideoPrediction] Exported ${accumulatedHeatmapData.length} dense points (step=${DENSE_STEP})`);

    // Build temporal grid result
    const temporalGrid: TemporalGridCell[] = [];
    for (let gr = 0; gr < gridRows; gr++) {
        for (let gc = 0; gc < gridCols; gc++) {
            const cellIdx = gr * gridCols + gc;
            const colLabel = String.fromCharCode(65 + gc); // A, B, C, ...
            temporalGrid.push({
                label: `${colLabel}${gr + 1}`,
                row: gr,
                col: gc,
                timeSeries: gridAttention[cellIdx],
            });
        }
    }

    // Compute per-AOI attention filtered by time ranges
    const aoiAttention: Record<string, { totalAttention: number; frameCount: number }> = {};
    if (aoiTimeRanges && aoiTimeRanges.length > 0 && frameResults.length > 0) {
        for (const range of aoiTimeRanges) {
            let totalAtt = 0;
            let count = 0;
            for (const fr of frameResults) {
                if (fr.timestamp >= range.startTime && fr.timestamp <= range.endTime) {
                    // Sum attention values within this frame's heatmap
                    const frameAtt = fr.heatmapData.reduce((s, p) => s + p.value, 0);
                    totalAtt += frameAtt;
                    count++;
                }
            }
            aoiAttention[range.aoiId] = { totalAttention: totalAtt, frameCount: count };
        }
    }

    const processingTimeMs = Date.now() - startTime;

    onProgress?.({
        type: 'complete',
        totalFrames,
        failedFrames,
        processingTimeMs,
    });

    return {
        accumulatedHeatmapData,
        autoPresets,
        griddedAOIs,
        frames: frameResults,
        temporalGrid,
        ...(Object.keys(aoiAttention).length > 0 ? { aoiAttention } : {}),
        thermalMap: encodeThermalMap(finalMap),
        thermalMapWidth: mapWidth,
        thermalMapHeight: mapHeight,
        totalFrames,
        failedFrames,
        processingTimeMs,
    };
}

// ─── Pure helpers (exported for testing) ─────────────────────────────

/**
 * Encode a Float32Array saliency map to a base64 Uint8Array.
 * Maps float [0, 1] → uint8 [0, 255]. Full coverage, no sampling.
 */
export function encodeThermalMap(map: Float32Array): string {
    const uint8 = new Uint8Array(map.length);
    for (let i = 0; i < map.length; i++) {
        uint8[i] = Math.min(255, Math.max(0, Math.round(map[i] * 255)));
    }
    return Buffer.from(uint8.buffer).toString('base64');
}

/**
 * Generate temporal grid labels for a given grid size.
 */
export function buildGridLabels(cols: number, rows: number): string[] {
    const labels: string[] = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            labels.push(`${String.fromCharCode(65 + c)}${r + 1}`);
        }
    }
    return labels;
}

/**
 * Filter frame results by AOI time range and compute total attention.
 * Pure function — no side effects.
 */
export function computeAoiTemporalAttention(
    frameResults: Array<{ timestamp: number; heatmapData: Array<{ value: number }> }>,
    aoiTimeRanges: AoiTimeRange[],
): Record<string, { totalAttention: number; frameCount: number }> {
    const result: Record<string, { totalAttention: number; frameCount: number }> = {};
    for (const range of aoiTimeRanges) {
        let totalAtt = 0;
        let count = 0;
        for (const fr of frameResults) {
            if (fr.timestamp >= range.startTime && fr.timestamp <= range.endTime) {
                const frameAtt = fr.heatmapData.reduce((s, p) => s + p.value, 0);
                totalAtt += frameAtt;
                count++;
            }
        }
        result[range.aoiId] = { totalAttention: totalAtt, frameCount: count };
    }
    return result;
}

// ─── TASED-Net video prediction (Python microservice) ───────────────

/**
 * Video saliency prediction via TASED-Net Python microservice.
 *
 * Calls the FastAPI service, receives raw Float32Array saliency maps,
 * then runs the same post-processing pipeline as TranSalNet to produce
 * an identical VideoPredictionResult.
 *
 * Used exclusively for VIDEO — images remain on TranSalNet ONNX.
 */
export async function predictVideoFramesTased(
    frames: VideoFrameInput[],
    threshold: number,
    _profile?: AnalysisProfile,
    onProgress?: ProgressCallback,
    gridConfig?: VideoGridConfig,
    aoiTimeRanges?: AoiTimeRange[],
): Promise<VideoPredictionResult> {
    const startTime = Date.now();
    const totalFrames = frames.length;

    const gridCols = Math.max(2, Math.min(10, gridConfig?.cols ?? DEFAULT_GRID_COLS));
    const gridRows = Math.max(2, Math.min(10, gridConfig?.rows ?? DEFAULT_GRID_ROWS));

    // Resolve absolute file paths for the Python service
    const tasedInputs = frames.map(f => ({
        path: getMediaPath(f.s3Key),
        timestamp: f.timestamp,
    }));

    // Call Python microservice with streaming progress
    const tasedResult: TasedResult = await predictWithTased(
        tasedInputs,
        (frame, total) => {
            onProgress?.({
                type: 'frame-complete',
                frameIndex: frame - 1,
                totalFrames: total,
                mediaId: frames[Math.min(frame - 1, frames.length - 1)].mediaId,
                timestamp: frames[Math.min(frame - 1, frames.length - 1)].timestamp,
            });
        },
    );

    onProgress?.({ type: 'accumulating', totalFrames, successfulFrames: totalFrames });

    // ─── Post-process raw saliency maps ─────────────────────────────

    const mapWidth = tasedResult.width;
    const mapHeight = tasedResult.height;

    // Build per-frame results + temporal grid + accumulated map
    const frameResults: VideoFrameResult[] = [];
    const gridAttention: number[][] = Array.from({ length: gridCols * gridRows }, () => []);
    const accumulated = new Float32Array(mapWidth * mapHeight);

    for (let i = 0; i < tasedResult.maps.length; i++) {
        const map = tasedResult.maps[i];

        // Accumulate for averaged map
        for (let j = 0; j < map.length; j++) {
            accumulated[j] += map[j];
        }

        // Extract per-frame heatmap points
        const heatmapData = extractHeatmapPoints(
            map, mapWidth, mapHeight,
            buildExtractOptions(threshold, 48),
        );
        frameResults.push({
            mediaId: frames[i].mediaId,
            timestamp: frames[i].timestamp,
            heatmapData,
        });

        // Compute per-cell attention for temporal grid
        for (let gr = 0; gr < gridRows; gr++) {
            for (let gc = 0; gc < gridCols; gc++) {
                const cellIdx = gr * gridCols + gc;
                gridAttention[cellIdx].push(
                    computeCellAverage(map, mapWidth, mapHeight, gr, gc, gridCols, gridRows),
                );
            }
        }
    }

    // Average accumulated map
    const invCount = 1 / totalFrames;
    for (let i = 0; i < accumulated.length; i++) {
        accumulated[i] *= invCount;
    }

    // ─── Compute final outputs (same as TranSalNet path) ────────────

    onProgress?.({ type: 'hybrid', totalFrames });

    const autoPresets = computeAutoPresets(accumulated);
    const griddedAOIs = computeGriddedAOIs(accumulated, mapWidth, mapHeight);

    // Dense uniform sampling for accumulated heatmap
    const DENSE_STEP = 8;
    const rowStride = mapWidth * DENSE_STEP;
    const invW = 100 / mapWidth;
    const invH = 100 / mapHeight;
    const accumulatedHeatmapData: Array<{ x: number; y: number; value: number }> = [];

    for (let rowStart = 0; rowStart < accumulated.length; rowStart += rowStride) {
        const row = (rowStart / mapWidth) | 0;
        const yPct = row * invH;
        const rowEnd = Math.min(rowStart + mapWidth, accumulated.length);
        for (let idx = rowStart; idx < rowEnd; idx += DENSE_STEP) {
            const val = accumulated[idx];
            // Skip negligible values
            accumulatedHeatmapData.push(
                ...(val > 0.05 ? [{ x: (idx - rowStart) * invW, y: yPct, value: val }] : []),
            );
        }
    }

    // Build temporal grid
    const temporalGrid: TemporalGridCell[] = [];
    for (let gr = 0; gr < gridRows; gr++) {
        for (let gc = 0; gc < gridCols; gc++) {
            const cellIdx = gr * gridCols + gc;
            const colLabel = String.fromCharCode(65 + gc);
            temporalGrid.push({
                label: `${colLabel}${gr + 1}`,
                row: gr,
                col: gc,
                timeSeries: gridAttention[cellIdx],
            });
        }
    }

    // Compute per-AOI temporal attention
    const aoiAttention = aoiTimeRanges?.length
        ? computeAoiTemporalAttention(frameResults, aoiTimeRanges)
        : undefined;

    const processingTimeMs = Date.now() - startTime;

    onProgress?.({ type: 'complete', totalFrames, failedFrames: 0, processingTimeMs });

    return {
        accumulatedHeatmapData,
        autoPresets,
        griddedAOIs,
        frames: frameResults,
        temporalGrid,
        ...(aoiAttention ? { aoiAttention } : {}),
        thermalMap: encodeThermalMap(accumulated),
        thermalMapWidth: mapWidth,
        thermalMapHeight: mapHeight,
        totalFrames,
        failedFrames: 0,
        processingTimeMs,
    };
}

// ─── DINO render-video (server-side MP4 generation) ─────────────────

export interface VideoRenderHeatmapResult {
    /** Relative media path to rendered video (usable with getMediaUrl) */
    heatmapVideoPath: string;
    /** Public URL to rendered side-by-side video */
    heatmapVideoUrl: string;
    /** Public URL to overlay-only video (heatmap without original) */
    overlayOnlyUrl: string;
    /** Per-frame grid metadata */
    gridMetadata: RenderVideoResult['frames'];
    durationS: number;
    fps: number;
    totalFrames: number;
    processedFrames: number;
    processingTimeMs: number;
}

/**
 * Render a video with DINO attention heatmap via Python subprocess.
 *
 * Calls render_cli.py directly — no HTTP, no uvicorn, no socket issues.
 * Python writes MP4 + .meta.json, prints JSON to stdout. Node reads it.
 */
export async function renderVideoHeatmap(
    videoS3Key: string,
    researchId: string,
    options: {
        gridRows?: number;
        gridCols?: number;
        rotation?: number;
        flipHeatmapV?: boolean;
        logoPath?: string;
    } = {},
    onProgress?: ProgressCallback,
): Promise<VideoRenderHeatmapResult> {
    const startTime = Date.now();
    const videoPath = getMediaPath(videoS3Key);

    const outputFilename = `heatmap_${Date.now()}.webm`;
    const outputRelative = path.join(path.dirname(videoS3Key), outputFilename);
    const outputAbsolute = getMediaPath(outputRelative);

    const outputDir = path.dirname(outputAbsolute);
    fs.mkdirSync(outputDir, { recursive: true });

    const rows = options.gridRows ?? 3;
    const cols = options.gridCols ?? 3;

    // ponytail: subprocess > HTTP. No sockets to drop, no event loops to block.
    const pythonDir = path.resolve(__dirname, '../../../python-saliency');
    const venvPython = path.join(pythonDir, 'venv', 'bin', 'python');
    const cliScript = path.join(pythonDir, 'render_cli.py');

    const args = [
        cliScript,
        videoPath,
        outputAbsolute,
        '--grid', `${rows}x${cols}`,
        '--rotation', String(options.rotation ?? -1),
        '--alpha', '0.6',
        '--sample', '2.0',
    ];
    options.flipHeatmapV && args.push('--flip');
    options.logoPath && args.push('--logo', options.logoPath);

    console.error(`[renderVideoHeatmap] Spawning: ${venvPython} ${args.join(' ')}`);

    const result = await new Promise<RenderVideoResult>((resolve, reject) => {
        const { spawn } = require('child_process') as typeof import('child_process');
        const proc = spawn(venvPython, args, { cwd: pythonDir, stdio: ['ignore', 'pipe', 'pipe'] });

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
        proc.stderr.on('data', (chunk: Buffer) => {
            const line = chunk.toString();
            stderr += line;
            // Forward keyframe progress to SSE
            const match = line.match(/keyframe (\d+)\/(\d+)/);
            match && onProgress?.({
                type: 'frame-complete',
                frameIndex: parseInt(match[1]) - 1,
                totalFrames: parseInt(match[2]),
                mediaId: '',
                timestamp: 0,
            });
        });

        proc.on('close', (code: number) => {
            console.error(`[renderVideoHeatmap] Process exited with code ${code}`);
            stderr && console.error(`[renderVideoHeatmap] stderr:\n${stderr}`);

            try {
                const parsed = JSON.parse(stdout);
                resolve({
                    outputPath: parsed.output_path,
                    overlayOnlyPath: parsed.overlay_only_path,
                    durationS: parsed.duration_s,
                    fps: parsed.fps,
                    totalFrames: parsed.total_frames,
                    processedFrames: parsed.processed_frames,
                    frames: parsed.frames,
                });
            } catch (e) {
                reject(new Error(`render_cli.py failed (code ${code}): ${stderr.slice(-500)}`));
            }
        });

        proc.on('error', (err: Error) => reject(new Error(`Failed to spawn render_cli.py: ${err.message}`)));
    });

    const processingTimeMs = Date.now() - startTime;

    onProgress?.({
        type: 'complete',
        totalFrames: result.totalFrames,
        failedFrames: 0,
        processingTimeMs,
    });

    // Derive overlay-only relative path from the absolute path Python returned
    const overlayOnlyRelative = path.join(path.dirname(outputRelative), path.basename(result.overlayOnlyPath));

    return {
        heatmapVideoPath: outputRelative,
        heatmapVideoUrl: getMediaUrl(outputRelative),
        overlayOnlyUrl: getMediaUrl(overlayOnlyRelative),
        gridMetadata: result.frames,
        durationS: result.durationS,
        fps: result.fps,
        totalFrames: result.totalFrames,
        processedFrames: result.processedFrames,
        processingTimeMs,
    };
}

/**
 * Poll for the .meta.json sidecar file that Python writes alongside the MP4.
 * Retries every 5s until the file appears or timeout.
 */
async function pollForSidecar(
    metaPath: string,
    mp4Path: string,
    timeoutMs: number,
): Promise<RenderVideoResult> {
    const deadline = Date.now() + timeoutMs;
    const POLL_INTERVAL = 5_000;

    while (Date.now() < deadline) {
        const metaExists = fs.existsSync(metaPath);
        const mp4Exists = fs.existsSync(mp4Path);

        if (metaExists && mp4Exists) {
            const raw = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
            return {
                outputPath: raw.output_path,
                overlayOnlyPath: raw.overlay_only_path ?? '',
                durationS: raw.duration_s,
                fps: raw.fps,
                totalFrames: raw.total_frames,
                processedFrames: raw.processed_frames,
                frames: raw.frames,
            };
        }

        console.error(`[pollForSidecar] Waiting... mp4=${mp4Exists} meta=${metaExists}`);
        await new Promise(r => setTimeout(r, POLL_INTERVAL));
    }

    throw new Error('Render sidecar not found within timeout — Python may still be processing');
}
