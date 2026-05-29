/**
 * Video Attention Prediction Service
 * Processes video frames sequentially through TranSalNet, accumulates saliency,
 * runs hybrid saliency on the accumulated map, and computes temporal grid attention.
 *
 * Memory-efficient: keeps a single running sum (~442KB) + 1 active frame.
 * Peak memory: ~1.3MB regardless of frame count.
 */

import { predictAttentionFast, computeAutoPresets, computeGriddedAOIs } from './attention-prediction.service';
import { generateHybridSaliency, type AnalysisProfile } from './ai-analysis.service';
import { getMediaPath } from '../../config/local-storage';
import type { VideoJobEvent } from './video-prediction-jobs';

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
    totalFrames: number;
    failedFrames: number;
    processingTimeMs: number;
}

export type ProgressCallback = (event: VideoJobEvent) => void;

// ─── Constants ───────────────────────────────────────────────────────

const MAX_FRAMES = 120;
const FRAME_STEP = 4;       // coarser step for per-frame heatmaps (reduce JSON size)
const ACCUMULATED_STEP = 3;  // finer step for accumulated heatmap (max quality)
const GRID_COLS = 4;
const GRID_ROWS = 4;

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Extract heatmap points from a saliency map with configurable step size.
 */
function extractPoints(
    map: Float32Array,
    w: number,
    h: number,
    step: number,
    threshold: number,
): Array<{ x: number; y: number; value: number }> {
    const points: Array<{ x: number; y: number; value: number }> = [];
    for (let row = 0; row < h; row += step) {
        for (let col = 0; col < w; col += step) {
            const value = map[row * w + col];
            if (value >= threshold) {
                points.push({
                    x: (col / w) * 100,
                    y: (row / h) * 100,
                    value,
                });
            }
        }
    }
    return points;
}

/**
 * Compute average saliency for a single grid cell from a saliency map.
 */
function computeCellAverage(
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
): Promise<VideoPredictionResult> {
    if (frames.length > MAX_FRAMES) {
        throw new Error(`Too many frames: ${frames.length} (max ${MAX_FRAMES})`);
    }
    if (frames.length === 0) {
        throw new Error('No frames provided');
    }

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

    // Temporal grid: 16 cells, each with a time series
    const gridAttention: number[][] = Array.from(
        { length: GRID_COLS * GRID_ROWS },
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
            const { map, width, height } = await predictAttentionFast(imagePath);

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
            const heatmapData = extractPoints(map, width, height, FRAME_STEP, threshold);
            frameResults.push({
                mediaId: frame.mediaId,
                timestamp: frame.timestamp,
                heatmapData,
            });

            // Compute per-cell attention for temporal grid
            for (let gr = 0; gr < GRID_ROWS; gr++) {
                for (let gc = 0; gc < GRID_COLS; gc++) {
                    const cellIdx = gr * GRID_COLS + gc;
                    gridAttention[cellIdx].push(
                        computeCellAverage(map, width, height, gr, gc, GRID_COLS, GRID_ROWS),
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
            for (let cellIdx = 0; cellIdx < GRID_COLS * GRID_ROWS; cellIdx++) {
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

    onProgress?.({ type: 'hybrid', totalFrames });

    let finalMap: Float32Array;
    const hybridImagePath = representativeFramePath || getMediaPath(frames[0].s3Key);

    try {
        finalMap = await generateHybridSaliency(
            hybridImagePath,
            accumulated,
            mapWidth,
            mapHeight,
            profile,
        );
    } catch (hybridErr) {
        console.warn('[VideoPrediction] Hybrid fusion failed, using averaged TranSalNet:', hybridErr);
        finalMap = accumulated;
    }

    // ─── Phase 4: Compute final outputs ──────────────────────────────

    const autoPresets = computeAutoPresets(finalMap);
    const griddedAOIs = computeGriddedAOIs(finalMap, mapWidth, mapHeight);
    const accumulatedHeatmapData = extractPoints(finalMap, mapWidth, mapHeight, ACCUMULATED_STEP, threshold);

    // Build temporal grid result
    const temporalGrid: TemporalGridCell[] = [];
    for (let gr = 0; gr < GRID_ROWS; gr++) {
        for (let gc = 0; gc < GRID_COLS; gc++) {
            const cellIdx = gr * GRID_COLS + gc;
            const colLabel = String.fromCharCode(65 + gc); // A, B, C, D
            temporalGrid.push({
                label: `${colLabel}${gr + 1}`,
                row: gr,
                col: gc,
                timeSeries: gridAttention[cellIdx],
            });
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
        totalFrames,
        failedFrames,
        processingTimeMs,
    };
}
