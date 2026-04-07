/**
 * Aggregates per-frame gaze errors (px) for validation UI and summaries.
 */

/**
 * Metrics for a single validation target (known screen position vs predicted gaze).
 */
export interface ValidationPointMetrics {
    pct: [number, number];
    targetPx: [number, number];
    frameErrorsPx: number[];
    meanErrorPx: number;
    medianErrorPx: number;
    p95ErrorPx: number;
}

/**
 * Full validation run after calibration (reconstruction error on fixed targets).
 */
export interface ValidationMetrics {
    points: ValidationPointMetrics[];
    overallMeanErrorPx: number;
    overallMedianErrorPx: number;
    overallP95ErrorPx: number;
}

/**
 * Arithmetic mean of finite numbers; 0 if empty.
 * @param values - Sample values
 * @returns Mean
 */
export function meanFinite(values: number[]): number {
    if (values.length === 0) return 0;
    let sum = 0;
    let n = 0;
    for (const v of values) {
        if (Number.isFinite(v)) {
            sum += v;
            n += 1;
        }
    }
    return n === 0 ? 0 : sum / n;
}

/**
 * Median of finite numbers; 0 if empty.
 * @param values - Sample values
 * @returns Median
 */
export function medianFinite(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].filter(Number.isFinite).sort((a, b) => a - b);
    if (sorted.length === 0) return 0;
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * 95th percentile (linear interpolation) of finite values; 0 if empty.
 * @param values - Sample values
 * @returns Approximate p95
 */
export function percentile95Finite(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].filter(Number.isFinite).sort((a, b) => a - b);
    if (sorted.length === 0) return 0;
    const idx = 0.95 * (sorted.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/**
 * Builds per-point metrics from raw frame errors and target metadata.
 * @param pct - Calibration percentage (x, y)
 * @param targetPx - Target in CSS pixels
 * @param frameErrorsPx - Euclidean errors per captured frame
 * @returns Point-level summary
 */
export function buildValidationPointMetrics(
    pct: [number, number],
    targetPx: [number, number],
    frameErrorsPx: number[],
): ValidationPointMetrics {
    const meanErrorPx = meanFinite(frameErrorsPx);
    const medianErrorPx = medianFinite(frameErrorsPx);
    const p95ErrorPx = percentile95Finite(frameErrorsPx);
    return {
        pct,
        targetPx,
        frameErrorsPx: [...frameErrorsPx],
        meanErrorPx,
        medianErrorPx,
        p95ErrorPx,
    };
}

/**
 * Combines per-point metrics into overall stats (pooled frames for global median/p95).
 * @param points - One entry per validation target
 * @returns Summary for UI
 */
export function aggregateValidationMetrics(points: ValidationPointMetrics[]): ValidationMetrics {
    if (points.length === 0) {
        return {
            points: [],
            overallMeanErrorPx: 0,
            overallMedianErrorPx: 0,
            overallP95ErrorPx: 0,
        };
    }
    const pooled: number[] = [];
    for (const p of points) {
        pooled.push(...p.frameErrorsPx);
    }
    const overallMeanErrorPx =
        points.reduce((acc, p) => acc + p.meanErrorPx, 0) / points.length;
    return {
        points,
        overallMeanErrorPx,
        overallMedianErrorPx: medianFinite(pooled),
        overallP95ErrorPx: percentile95Finite(pooled),
    };
}
