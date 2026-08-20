/**
 * Learned elliptical uncertainty estimator.
 *
 * Learns per-region (σ1, σ2, θ) ellipses from calibration residuals,
 * interpolates via IDW for arbitrary gaze positions, and scales dynamically
 * based on gaze velocity, head pose, and eye openness.
 *
 * Pure functions — no side effects, no DOM.
 */

import type { CalibrationEllipse, FrameUncertainty, UncertaintyInputs } from './types';
import type { HybridCalibrationResidual } from '../hybridCalibrationField';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SIGMA_MIN = 40;
const SIGMA_MAX = 400;
const IDW_EPSILON = 1e-5;
/** Velocity threshold for saccade scaling (px/frame at ~30fps). */
const V_SACCADE = 500;
/** Ideal EAR (fully open eyes). */
const EAR_IDEAL = 0.30;

// ---------------------------------------------------------------------------
// Learn ellipses from calibration residuals
// ---------------------------------------------------------------------------

export interface CalibrationSample {
  /** Normalized position on stimulus [0,1]. */
  u: number;
  v: number;
  /** Residual in px (predicted - target). */
  dx: number;
  dy: number;
}

/**
 * Group calibration samples by anchor point and fit an uncertainty ellipse per group.
 *
 * @param samples — all calibration residuals (dx, dy at normalized positions u, v)
 * @returns One ellipse per calibration point, plus a global fallback.
 */
export function fitCalibrationEllipses(samples: readonly CalibrationSample[]): CalibrationEllipse[] {
  if (samples.length < 3) return [globalFallbackEllipse(samples)];

  // Group by anchor (round to nearest 1% to cluster)
  const groups = new Map<string, CalibrationSample[]>();
  for (const s of samples) {
    const key = `${Math.round(s.u * 100)},${Math.round(s.v * 100)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }

  const ellipses: CalibrationEllipse[] = [];
  for (const [, group] of groups) {
    if (group.length < 2) continue;
    ellipses.push(fitEllipseFromResiduals(group));
  }

  // If too few points produced valid ellipses, add global fallback
  if (ellipses.length < 2) {
    return [globalFallbackEllipse(samples)];
  }

  return ellipses;
}

/** Fit from HybridCalibrationResidual[] (existing calibration format).
 *  WARNING: these are in-sample residuals — uncertainty will be underestimated.
 *  Prefer fitFromLoocvResiduals() when available. */
export function fitFromHybridResiduals(residuals: readonly HybridCalibrationResidual[]): CalibrationEllipse[] {
  const samples: CalibrationSample[] = residuals.map(r => ({
    u: r.u, v: r.v, dx: r.dx, dy: r.dy,
  }));
  return fitCalibrationEllipses(samples);
}

/**
 * Cross-validated residual for one calibration point.
 * dx, dy are the errors when this point was HELD OUT during ridge training.
 */
export interface LoocvResidual {
  /** Normalized position [0,1] on stimulus. */
  u: number;
  v: number;
  /** LOOCV prediction error in px (predicted_without_this_point - target). */
  dx: number;
  dy: number;
}

/**
 * Fit ellipses from leave-one-point-out cross-validated residuals.
 *
 * These residuals represent true generalization error at each calibration
 * position — not in-sample error. This produces realistic uncertainty
 * estimates that won't be artificially small.
 *
 * @param loocvResiduals — one residual per calibration point (from Ridge LOOCV)
 * @param inSampleResiduals — optional in-sample residuals (used as fallback
 *        for points with only one LOOCV sample, and to diversify the covariance)
 */
export function fitFromLoocvResiduals(
  loocvResiduals: readonly LoocvResidual[],
  inSampleResiduals?: readonly CalibrationSample[],
): CalibrationEllipse[] {
  if (loocvResiduals.length < 3) {
    // Not enough LOOCV data — fall back to in-sample if available
    if (inSampleResiduals && inSampleResiduals.length >= 3) {
      return fitCalibrationEllipses(inSampleResiduals);
    }
    return [globalFallbackEllipse(loocvResiduals)];
  }

  // Each LOOCV residual represents the error at one calibration point.
  // Since we only have 1 LOOCV sample per point (one residual per held-out point),
  // we can't compute per-point covariance from LOOCV alone.
  //
  // Strategy: use the LOOCV residuals as the PRIMARY error magnitude,
  // but borrow the directional shape (σ_y/σ_x ratio, θ) from in-sample
  // residuals (which have many frames per point).

  // Global LOOCV covariance (gives the right magnitude)
  const globalLoocv = fitEllipseFromResiduals(loocvResiduals.map(r => ({
    u: 0.5, v: 0.5, dx: r.dx, dy: r.dy,
  })));

  // If we have in-sample residuals with multiple frames per point, use them
  // for per-point shape, scaled by the LOOCV/in-sample ratio
  if (inSampleResiduals && inSampleResiduals.length >= 9) {
    const inSampleEllipses = fitCalibrationEllipses(inSampleResiduals);
    const inSampleGlobal = fitEllipseFromResiduals(inSampleResiduals.map(r => ({
      u: 0.5, v: 0.5, dx: r.dx, dy: r.dy,
    })));

    // Scale factor: LOOCV errors are larger than in-sample by this ratio
    const scaleFactor = Math.max(1, globalLoocv.sigma1 / Math.max(1, inSampleGlobal.sigma1));

    // Scale each in-sample ellipse by the LOOCV/in-sample ratio
    return inSampleEllipses.map(e => ({
      ...e,
      sigma1: clamp(e.sigma1 * scaleFactor, SIGMA_MIN, SIGMA_MAX),
      sigma2: clamp(e.sigma2 * scaleFactor, SIGMA_MIN, SIGMA_MAX),
    }));
  }

  // No in-sample data — use global LOOCV ellipse for all positions
  return loocvResiduals.map(r => ({
    u: r.u,
    v: r.v,
    sigma1: globalLoocv.sigma1,
    sigma2: globalLoocv.sigma2,
    theta: globalLoocv.theta,
    sampleCount: 1,
  }));
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function fitEllipseFromResiduals(group: CalibrationSample[]): CalibrationEllipse {
  const n = group.length;
  const u = group.reduce((s, g) => s + g.u, 0) / n;
  const v = group.reduce((s, g) => s + g.v, 0) / n;

  // Subtract bias (mean residual) — model noise, not systematic error
  const meanDx = group.reduce((s, g) => s + g.dx, 0) / n;
  const meanDy = group.reduce((s, g) => s + g.dy, 0) / n;

  // 2×2 covariance of centered residuals
  let varX = 0, varY = 0, covXY = 0;
  for (const g of group) {
    const cx = g.dx - meanDx;
    const cy = g.dy - meanDy;
    varX += cx * cx;
    varY += cy * cy;
    covXY += cx * cy;
  }
  varX /= n;
  varY /= n;
  covXY /= n;

  // Eigendecomposition of 2×2 symmetric matrix
  const { sigma1, sigma2, theta } = eigenDecompose2x2(varX, varY, covXY);

  return {
    u, v,
    sigma1: Math.max(SIGMA_MIN, sigma1),
    sigma2: Math.max(SIGMA_MIN, sigma2),
    theta,
    sampleCount: n,
  };
}

function globalFallbackEllipse(samples: readonly CalibrationSample[]): CalibrationEllipse {
  if (samples.length === 0) {
    return { u: 0.5, v: 0.5, sigma1: 200, sigma2: 150, theta: Math.PI / 2, sampleCount: 0 };
  }
  // Fit single global ellipse
  return fitEllipseFromResiduals(samples as CalibrationSample[]);
}

// ---------------------------------------------------------------------------
// 2×2 eigendecomposition
// ---------------------------------------------------------------------------

function eigenDecompose2x2(varX: number, varY: number, covXY: number): {
  sigma1: number; sigma2: number; theta: number;
} {
  const trace = varX + varY;
  const det = varX * varY - covXY * covXY;
  const disc = Math.sqrt(Math.max(0, (trace / 2) ** 2 - det));
  const lambda1 = trace / 2 + disc; // larger eigenvalue
  const lambda2 = Math.max(0, trace / 2 - disc);

  // Angle of major eigenvector
  const theta = Math.abs(covXY) > 1e-8
    ? Math.atan2(lambda1 - varX, covXY)
    : (varY > varX ? Math.PI / 2 : 0);

  return {
    sigma1: Math.sqrt(lambda1),
    sigma2: Math.sqrt(lambda2),
    theta,
  };
}

// ---------------------------------------------------------------------------
// IDW interpolation of ellipses
// ---------------------------------------------------------------------------

/**
 * Interpolate ellipse parameters at an arbitrary screen position using IDW
 * over the learned calibration ellipses.
 */
export function interpolateEllipse(
  u: number,
  v: number,
  ellipses: readonly CalibrationEllipse[],
): { sigma1: number; sigma2: number; theta: number } {
  if (ellipses.length === 0) {
    return { sigma1: 200, sigma2: 150, theta: Math.PI / 2 };
  }
  if (ellipses.length === 1) {
    return { sigma1: ellipses[0].sigma1, sigma2: ellipses[0].sigma2, theta: ellipses[0].theta };
  }

  let wSum = 0;
  let s1Sum = 0, s2Sum = 0;
  let sinSum = 0, cosSum = 0; // for circular mean of theta

  for (const e of ellipses) {
    const du = u - e.u;
    const dv = v - e.v;
    const w = 1 / (du * du + dv * dv + IDW_EPSILON);
    wSum += w;
    s1Sum += w * e.sigma1;
    s2Sum += w * e.sigma2;
    // Weighted circular mean: theta has period π (ellipse symmetric)
    sinSum += w * Math.sin(2 * e.theta);
    cosSum += w * Math.cos(2 * e.theta);
  }

  return {
    sigma1: s1Sum / wSum,
    sigma2: s2Sum / wSum,
    theta: Math.atan2(sinSum, cosSum) / 2,
  };
}

// ---------------------------------------------------------------------------
// Dynamic scaling
// ---------------------------------------------------------------------------

/**
 * Compute per-frame uncertainty ellipse from learned ellipses + dynamic inputs.
 *
 * Returns the full FrameUncertainty with pre-computed Σ⁻¹ components (a, b, c)
 * for fast Gaussian splat in the heatmap accumulator.
 */
export function computeFrameUncertainty(
  inputs: UncertaintyInputs,
  ellipses: readonly CalibrationEllipse[],
): FrameUncertainty {
  // Normalize gaze to stimulus [0,1]
  const u = inputs.rect.width > 0 ? (inputs.gazeX - inputs.rect.left) / inputs.rect.width : 0.5;
  const v = inputs.rect.height > 0 ? (inputs.gazeY - inputs.rect.top) / inputs.rect.height : 0.5;

  // Interpolate base ellipse
  const base = interpolateEllipse(u, v, ellipses);

  // Dynamic scaling factor (uniform, preserves ellipse shape)
  const sVelocity = 1 + clamp(inputs.velocity / V_SACCADE, 0, 2);
  const sHeadpose = 1 + clamp((Math.abs(inputs.yaw) + Math.abs(inputs.pitch)) / 30, 0, 1);
  const sEar = 1 + clamp((EAR_IDEAL - inputs.ear) / EAR_IDEAL, 0, 1.5);
  const s = sVelocity * sHeadpose * sEar;

  const sigma1 = clamp(base.sigma1 * s, SIGMA_MIN, SIGMA_MAX);
  const sigma2 = clamp(base.sigma2 * s, SIGMA_MIN, SIGMA_MAX);
  const theta = base.theta;

  // Pre-compute Σ⁻¹ components for w = exp(-0.5*(a·dx² + 2b·dx·dy + c·dy²))
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const inv1 = 1 / (sigma1 * sigma1);
  const inv2 = 1 / (sigma2 * sigma2);

  const a = cosT * cosT * inv1 + sinT * sinT * inv2;
  const b = Math.sin(2 * theta) * (inv1 - inv2) / 2;
  const c = sinT * sinT * inv1 + cosT * cosT * inv2;

  return { sigma1, sigma2, theta, a, b, c };
}
