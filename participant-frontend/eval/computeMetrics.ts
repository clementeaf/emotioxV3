/**
 * Compute evaluation metrics from predicted gaze vs ground truth.
 * Pure functions — used by both synthetic vitest tests and Playwright E2E.
 */

import type { EvalMetrics, GroundTruthPoint } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PredictedSample {
  t: number;
  x: number;
  y: number;
  zone?: string | null;
  latencyMs?: number;
}

// ---------------------------------------------------------------------------
// Core metrics
// ---------------------------------------------------------------------------

/**
 * Compute RMSE between predicted samples and ground truth fixation targets.
 * Only samples within a GT fixation window are evaluated.
 */
export function computeRmse(
  predicted: readonly PredictedSample[],
  groundTruth: readonly GroundTruthPoint[],
  vw: number,
  vh: number,
): number {
  let sumSq = 0;
  let count = 0;

  for (const p of predicted) {
    const gt = groundTruth.find(g => p.t >= g.startMs && p.t <= g.endMs);
    if (!gt) continue;
    const dx = p.x - gt.x * vw;
    const dy = p.y - gt.y * vh;
    sumSq += dx * dx + dy * dy;
    count++;
  }

  return count > 0 ? Math.sqrt(sumSq / count) : 0;
}

/**
 * Average frame-to-frame jitter — consecutive sample distance.
 * Bug #3 fix: only count pairs where temporal gap ≤ MAX_JITTER_GAP_MS.
 * Larger gaps indicate blinks or missing frames — the distance between
 * those samples includes real eye movement, not noise.
 */
const MAX_JITTER_GAP_MS = 1500; // allow gaps up to 1.5s — only skip true outliers (blinks >1.5s, session gaps)

export function computeJitter(predicted: readonly PredictedSample[]): number {
  if (predicted.length < 2) return 0;
  let sum = 0;
  let count = 0;
  for (let i = 1; i < predicted.length; i++) {
    const dt = predicted[i].t - predicted[i - 1].t;
    if (dt > MAX_JITTER_GAP_MS) continue; // skip gaps (blinks, missing frames)
    const dx = predicted[i].x - predicted[i - 1].x;
    const dy = predicted[i].y - predicted[i - 1].y;
    sum += Math.sqrt(dx * dx + dy * dy);
    count++;
  }
  return count > 0 ? sum / count : 0;
}

/**
 * Linear drift rate — px/s from linear regression of position over time.
 */
export function computeDrift(predicted: readonly PredictedSample[]): number {
  if (predicted.length < 2) return 0;

  const n = predicted.length;
  const t0 = predicted[0].t;
  let sumT = 0, sumX = 0, sumY = 0, sumTT = 0, sumTX = 0, sumTY = 0;

  for (const p of predicted) {
    const t = (p.t - t0) / 1000; // seconds
    sumT += t;
    sumX += p.x;
    sumY += p.y;
    sumTT += t * t;
    sumTX += t * p.x;
    sumTY += t * p.y;
  }

  const denom = n * sumTT - sumT * sumT;
  if (Math.abs(denom) < 1e-10) return 0;

  const slopeX = (n * sumTX - sumT * sumX) / denom;
  const slopeY = (n * sumTY - sumT * sumY) / denom;

  return Math.sqrt(slopeX * slopeX + slopeY * slopeY);
}

/**
 * Count false zone changes — zone transitions that don't match a GT zone transition.
 */
export function computeFalseZoneChanges(
  predicted: readonly PredictedSample[],
  groundTruth: readonly GroundTruthPoint[],
): { falseChanges: number; totalChanges: number } {
  // Build set of expected transition timestamps (GT zone changes)
  const gtZoneChanges = new Set<number>();
  for (let i = 1; i < groundTruth.length; i++) {
    if (groundTruth[i].zone && groundTruth[i].zone !== groundTruth[i - 1].zone) {
      // Transition window: between end of prev and start of next
      gtZoneChanges.add(i);
    }
  }

  let totalChanges = 0;
  let falseChanges = 0;
  let prevZone: string | null | undefined = null;

  for (const p of predicted) {
    if (p.zone !== undefined && p.zone !== prevZone && prevZone !== null) {
      totalChanges++;

      // Check if this change matches any expected GT transition (within tolerance)
      const gt = groundTruth.find(g => p.t >= g.startMs && p.t <= g.endMs);
      const gtPrev = groundTruth.find(g => {
        const prevP = predicted.find(pp => pp.t < p.t && pp.zone === prevZone);
        return prevP && prevP.t >= g.startMs && prevP.t <= g.endMs;
      });

      const expectedTransition = gt?.zone !== gtPrev?.zone && gt?.zone !== undefined;
      if (!expectedTransition) {
        falseChanges++;
      }
    }
    prevZone = p.zone;
  }

  return { falseChanges, totalChanges };
}

// ---------------------------------------------------------------------------
// Full metrics computation
// ---------------------------------------------------------------------------

export function computeAllMetrics(
  engine: string,
  predicted: readonly PredictedSample[],
  groundTruth: readonly GroundTruthPoint[],
  totalInputSamples: number,
  vw: number,
  vh: number,
): EvalMetrics {
  const rmsePx = computeRmse(predicted, groundTruth, vw, vh);
  const jitterPx = computeJitter(predicted);
  const driftPxPerS = computeDrift(predicted);
  const { falseChanges, totalChanges } = computeFalseZoneChanges(predicted, groundTruth);
  const avgLatencyMs = predicted.length > 0
    ? predicted.reduce((s, p) => s + (p.latencyMs ?? 0), 0) / predicted.length
    : 0;

  // Count fixations: consecutive samples in same zone for >150ms
  let fixationCount = 0;
  let fixStart = 0;
  let fixZone: string | null | undefined = null;
  for (const p of predicted) {
    if (p.zone === fixZone) {
      if (p.t - fixStart >= 150) {
        // Only count once per fixation
        if (p.t - fixStart < 150 + 50) fixationCount++;
      }
    } else {
      fixZone = p.zone;
      fixStart = p.t;
    }
  }

  return {
    engine,
    rmsePx,
    jitterPx,
    driftPxPerS,
    validFrameRatio: totalInputSamples > 0 ? predicted.length / totalInputSamples : 0,
    falseZoneChanges: falseChanges,
    totalZoneChanges: totalChanges,
    avgLatencyMs,
    totalFrames: predicted.length,
    fixationCount,
  };
}
