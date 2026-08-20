/**
 * Session-level metrics computed from the probabilistic heatmap density grid.
 */

import type { DensityGrid, SessionConfidence } from './types';

// ---------------------------------------------------------------------------
// Session confidence
// ---------------------------------------------------------------------------

/**
 * Compute session confidence score from tracking quality signals.
 *
 * @param validFrameRatio — fraction of frames where gaze was detected [0,1]
 * @param cvRmsePx — leave-one-out cross-validation RMSE from calibration (px)
 * @param avgHeadRotationDeg — average |yaw|+|pitch| during session (degrees)
 * @param effectiveDurationS — seconds of valid tracking
 */
export function computeSessionConfidence(
  validFrameRatio: number,
  cvRmsePx: number | null,
  avgHeadRotationDeg: number,
  effectiveDurationS: number,
): SessionConfidence {
  const calibrationQuality = cvRmsePx !== null
    ? clamp(1 - cvRmsePx / 500, 0.2, 1.0)
    : 0.5; // unknown calibration → medium

  const headStability = 1 - clamp(avgHeadRotationDeg / 25, 0, 0.5);

  const score = validFrameRatio * calibrationQuality * headStability;

  return {
    score: clamp(score, 0, 1),
    calibrationQuality,
    validFrameRatio,
    headStability,
    effectiveDurationS,
    spatialCoverage: 0, // filled by computeSpatialCoverage
  };
}

/**
 * Fraction of grid cells with meaningful attention (>threshold seconds).
 */
export function computeSpatialCoverage(grid: DensityGrid, thresholdS = 0.1): number {
  let above = 0;
  for (let i = 0; i < grid.data.length; i++) {
    if (grid.data[i] > thresholdS) above++;
  }
  return above / grid.data.length;
}

// ---------------------------------------------------------------------------
// Region-level dwell time (without explicit AOI — grid-based)
// ---------------------------------------------------------------------------

/**
 * Compute approximate dwell time for a rectangular region of the stimulus.
 * Sums density within the region.
 */
export function dwellTimeInRegion(
  grid: DensityGrid,
  x: number, y: number, width: number, height: number,
): number {
  const c0 = Math.max(0, Math.floor(x / grid.cellW));
  const c1 = Math.min(grid.cols - 1, Math.ceil((x + width) / grid.cellW));
  const r0 = Math.max(0, Math.floor(y / grid.cellH));
  const r1 = Math.min(grid.rows - 1, Math.ceil((y + height) / grid.cellH));

  let total = 0;
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      total += grid.data[r * grid.cols + c];
    }
  }
  return total;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
