import { describe, it, expect } from 'vitest';
import {
  fitCalibrationEllipses,
  fitFromHybridResiduals,
  fitFromLoocvResiduals,
  interpolateEllipse,
  computeFrameUncertainty,
  type CalibrationSample,
  type LoocvResidual,
} from '../attention/uncertaintyEstimator';
import type { CalibrationEllipse, UncertaintyInputs } from '../attention/types';
import type { HybridCalibrationResidual } from '../hybridCalibrationField';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SIGMA_MIN = 40;
const SIGMA_MAX = 400;

/** Build samples at a given anchor with specified residuals. */
function samplesAt(u: number, v: number, residuals: [number, number][]): CalibrationSample[] {
  return residuals.map(([dx, dy]) => ({ u, v, dx, dy }));
}

/** Build a default rect for UncertaintyInputs. */
const defaultRect = { left: 0, top: 0, width: 800, height: 600 };

/** Build neutral UncertaintyInputs (zero velocity, zero head rotation, ideal EAR). */
function neutralInputs(gazeX = 400, gazeY = 300): UncertaintyInputs {
  return { gazeX, gazeY, rect: defaultRect, velocity: 0, yaw: 0, pitch: 0, ear: 0.30 };
}

// ---------------------------------------------------------------------------
// fitCalibrationEllipses
// ---------------------------------------------------------------------------

describe('fitCalibrationEllipses', () => {
  it('returns single fallback ellipse for empty samples', () => {
    const result = fitCalibrationEllipses([]);
    expect(result).toHaveLength(1);
    expect(result[0].u).toBe(0.5);
    expect(result[0].v).toBe(0.5);
    expect(result[0].sigma1).toBe(200);
    expect(result[0].sigma2).toBe(150);
    expect(result[0].sampleCount).toBe(0);
  });

  it('returns single global fallback for < 3 samples', () => {
    const samples: CalibrationSample[] = [
      { u: 0.1, v: 0.1, dx: 10, dy: 5 },
      { u: 0.9, v: 0.9, dx: -10, dy: -5 },
    ];
    const result = fitCalibrationEllipses(samples);
    expect(result).toHaveLength(1);
    // Fitted from 2 samples → sampleCount = 2
    expect(result[0].sampleCount).toBe(2);
  });

  it('produces one ellipse per anchor group when >= 3 different points with >= 2 samples each', () => {
    // 3 anchor points, each with 3 samples
    const samples: CalibrationSample[] = [
      ...samplesAt(0.0, 0.0, [[10, 5], [-10, -5], [5, 10]]),
      ...samplesAt(0.5, 0.5, [[20, 10], [-20, -10], [10, 20]]),
      ...samplesAt(1.0, 1.0, [[15, 8], [-15, -8], [8, 15]]),
    ];
    const result = fitCalibrationEllipses(samples);
    // Each group has >= 2 samples → one ellipse per group
    expect(result.length).toBe(3);
    // Each ellipse should be near its anchor
    const us = result.map(e => Math.round(e.u * 100));
    expect(us).toContain(0);
    expect(us).toContain(50);
    expect(us).toContain(100);
  });

  it('clamps sigma1 to at least SIGMA_MIN', () => {
    // Very small residuals → tiny variance, but clamped
    const samples: CalibrationSample[] = [
      ...samplesAt(0.0, 0.0, [[0.1, 0.1], [-0.1, -0.1], [0.1, -0.1]]),
      ...samplesAt(0.5, 0.5, [[0.1, 0.1], [-0.1, -0.1], [0.1, -0.1]]),
      ...samplesAt(1.0, 1.0, [[0.1, 0.1], [-0.1, -0.1], [0.1, -0.1]]),
    ];
    const result = fitCalibrationEllipses(samples);
    for (const e of result) {
      expect(e.sigma1).toBeGreaterThanOrEqual(SIGMA_MIN);
      expect(e.sigma2).toBeGreaterThanOrEqual(SIGMA_MIN);
    }
  });

  it('clamps sigma to SIGMA_MIN for zero-variance residuals', () => {
    // All identical residuals → zero covariance
    const samples: CalibrationSample[] = [
      ...samplesAt(0.0, 0.0, [[5, 5], [5, 5], [5, 5]]),
      ...samplesAt(1.0, 1.0, [[5, 5], [5, 5], [5, 5]]),
    ];
    const result = fitCalibrationEllipses(samples);
    for (const e of result) {
      expect(e.sigma1).toBe(SIGMA_MIN);
      expect(e.sigma2).toBe(SIGMA_MIN);
    }
  });

  it('produces larger sigmas for larger residuals', () => {
    const smallSamples: CalibrationSample[] = [
      ...samplesAt(0.0, 0.0, [[5, 3], [-5, -3], [3, 5]]),
      ...samplesAt(1.0, 1.0, [[5, 3], [-5, -3], [3, 5]]),
    ];
    const largeSamples: CalibrationSample[] = [
      ...samplesAt(0.0, 0.0, [[100, 60], [-100, -60], [60, 100]]),
      ...samplesAt(1.0, 1.0, [[100, 60], [-100, -60], [60, 100]]),
    ];
    const small = fitCalibrationEllipses(smallSamples);
    const large = fitCalibrationEllipses(largeSamples);
    expect(large[0].sigma1).toBeGreaterThan(small[0].sigma1);
  });

  it('reflects asymmetric residuals: large dx, small dy → sigma1 > sigma2', () => {
    // Residuals predominantly in X direction
    const samples: CalibrationSample[] = [
      ...samplesAt(0.0, 0.0, [[100, 1], [-100, -1], [80, 2]]),
      ...samplesAt(1.0, 1.0, [[100, 1], [-100, -1], [80, 2]]),
    ];
    const result = fitCalibrationEllipses(samples);
    // Major axis should capture the large X variance
    expect(result[0].sigma1).toBeGreaterThan(result[0].sigma2);
  });
});

// ---------------------------------------------------------------------------
// fitFromHybridResiduals
// ---------------------------------------------------------------------------

describe('fitFromHybridResiduals', () => {
  it('maps HybridCalibrationResidual[] to CalibrationSample[] and delegates', () => {
    const residuals: HybridCalibrationResidual[] = [
      { u: 0.0, v: 0.0, dx: 10, dy: 5 },
      { u: 0.0, v: 0.0, dx: -10, dy: -5 },
      { u: 0.0, v: 0.0, dx: 5, dy: 10 },
      { u: 1.0, v: 1.0, dx: 20, dy: 10 },
      { u: 1.0, v: 1.0, dx: -20, dy: -10 },
      { u: 1.0, v: 1.0, dx: 10, dy: 20 },
    ];
    const result = fitFromHybridResiduals(residuals);
    expect(result.length).toBeGreaterThanOrEqual(1);
    for (const e of result) {
      expect(e.sigma1).toBeGreaterThanOrEqual(SIGMA_MIN);
      expect(e.sigma2).toBeGreaterThanOrEqual(SIGMA_MIN);
    }
  });

  it('returns fallback for fewer than 3 residuals', () => {
    const residuals: HybridCalibrationResidual[] = [
      { u: 0.5, v: 0.5, dx: 10, dy: 5 },
    ];
    const result = fitFromHybridResiduals(residuals);
    expect(result).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// fitFromLoocvResiduals
// ---------------------------------------------------------------------------

describe('fitFromLoocvResiduals', () => {
  it('returns fallback ellipse when < 3 LOOCV samples and no in-sample', () => {
    const loocv: LoocvResidual[] = [
      { u: 0.1, v: 0.1, dx: 10, dy: 5 },
      { u: 0.9, v: 0.9, dx: -10, dy: -5 },
    ];
    const result = fitFromLoocvResiduals(loocv);
    expect(result).toHaveLength(1);
    // Fallback from the 2 samples
    expect(result[0].sampleCount).toBe(2);
  });

  it('uses in-sample residuals when < 3 LOOCV but >= 3 in-sample', () => {
    const loocv: LoocvResidual[] = [
      { u: 0.5, v: 0.5, dx: 10, dy: 5 },
    ];
    const inSample: CalibrationSample[] = [
      ...samplesAt(0.0, 0.0, [[5, 3], [-5, -3], [3, 5]]),
      ...samplesAt(1.0, 1.0, [[5, 3], [-5, -3], [3, 5]]),
    ];
    const result = fitFromLoocvResiduals(loocv, inSample);
    // Should delegate to fitCalibrationEllipses(inSample)
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it('scales ellipses when >= 3 LOOCV and >= 9 in-sample', () => {
    const loocv: LoocvResidual[] = [
      { u: 0.0, v: 0.0, dx: 40, dy: 30 },
      { u: 0.5, v: 0.5, dx: -40, dy: -30 },
      { u: 1.0, v: 1.0, dx: 30, dy: 40 },
    ];
    // 9 in-sample (3 groups x 3 samples) — smaller residuals
    const inSample: CalibrationSample[] = [
      ...samplesAt(0.0, 0.0, [[10, 5], [-10, -5], [5, 10]]),
      ...samplesAt(0.5, 0.5, [[10, 5], [-10, -5], [5, 10]]),
      ...samplesAt(1.0, 1.0, [[10, 5], [-10, -5], [5, 10]]),
    ];
    const result = fitFromLoocvResiduals(loocv, inSample);
    // Scaled in-sample ellipses
    expect(result.length).toBeGreaterThanOrEqual(1);
    // LOOCV residuals are ~4x larger → scale factor > 1 → sigmas should be larger
    // than raw in-sample
    const rawInSample = fitCalibrationEllipses(inSample);
    // At least one ellipse should have sigma scaled up
    const maxScaled = Math.max(...result.map(e => e.sigma1));
    const maxRaw = Math.max(...rawInSample.map(e => e.sigma1));
    expect(maxScaled).toBeGreaterThanOrEqual(maxRaw);
  });

  it('returns one ellipse per LOOCV position with global sigma when no in-sample', () => {
    const loocv: LoocvResidual[] = [
      { u: 0.0, v: 0.0, dx: 50, dy: 30 },
      { u: 0.5, v: 0.5, dx: -50, dy: -30 },
      { u: 1.0, v: 1.0, dx: 30, dy: 50 },
    ];
    const result = fitFromLoocvResiduals(loocv);
    expect(result).toHaveLength(3);
    // All should share the same global sigma
    expect(result[0].sigma1).toBe(result[1].sigma1);
    expect(result[1].sigma1).toBe(result[2].sigma1);
    // Each at its own position
    expect(result[0].u).toBe(0.0);
    expect(result[1].u).toBe(0.5);
    expect(result[2].u).toBe(1.0);
    // sampleCount = 1 per position
    for (const e of result) expect(e.sampleCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// interpolateEllipse
// ---------------------------------------------------------------------------

describe('interpolateEllipse', () => {
  it('returns defaults for empty ellipses array', () => {
    const result = interpolateEllipse(0.5, 0.5, []);
    expect(result.sigma1).toBe(200);
    expect(result.sigma2).toBe(150);
    expect(result.theta).toBeCloseTo(Math.PI / 2, 5);
  });

  it('returns exact values for single ellipse', () => {
    const ellipse: CalibrationEllipse = {
      u: 0.3, v: 0.7, sigma1: 80, sigma2: 50, theta: 0.4, sampleCount: 10,
    };
    const result = interpolateEllipse(0.5, 0.5, [ellipse]);
    expect(result.sigma1).toBe(80);
    expect(result.sigma2).toBe(50);
    expect(result.theta).toBe(0.4);
  });

  it('blends two ellipses via IDW', () => {
    const e1: CalibrationEllipse = { u: 0.0, v: 0.5, sigma1: 60, sigma2: 40, theta: 0, sampleCount: 5 };
    const e2: CalibrationEllipse = { u: 1.0, v: 0.5, sigma1: 100, sigma2: 80, theta: 0, sampleCount: 5 };
    const result = interpolateEllipse(0.5, 0.5, [e1, e2]);
    // Midpoint → equal weights → average
    expect(result.sigma1).toBeCloseTo(80, 0); // (60+100)/2
    expect(result.sigma2).toBeCloseTo(60, 0); // (40+80)/2
  });

  it('heavily weights nearest ellipse when querying at exact position', () => {
    const e1: CalibrationEllipse = { u: 0.2, v: 0.2, sigma1: 60, sigma2: 40, theta: 0, sampleCount: 5 };
    const e2: CalibrationEllipse = { u: 0.8, v: 0.8, sigma1: 200, sigma2: 180, theta: 1.0, sampleCount: 5 };
    // Query very close to e1
    const result = interpolateEllipse(0.2001, 0.2001, [e1, e2]);
    expect(result.sigma1).toBeCloseTo(60, 0);
    expect(result.sigma2).toBeCloseTo(40, 0);
  });

  it('uses circular mean for theta (atan2 of weighted sin/cos)', () => {
    const e1: CalibrationEllipse = { u: 0.0, v: 0.5, sigma1: 60, sigma2: 40, theta: 0.1, sampleCount: 5 };
    const e2: CalibrationEllipse = { u: 1.0, v: 0.5, sigma1: 60, sigma2: 40, theta: -0.1, sampleCount: 5 };
    // Midpoint → equal weights → circular mean of 0.1 and -0.1 should be ~0
    const result = interpolateEllipse(0.5, 0.5, [e1, e2]);
    expect(result.theta).toBeCloseTo(0, 1);
  });
});

// ---------------------------------------------------------------------------
// computeFrameUncertainty
// ---------------------------------------------------------------------------

describe('computeFrameUncertainty', () => {
  // Use a simple set of ellipses for all tests
  const baseEllipses: CalibrationEllipse[] = [
    { u: 0.5, v: 0.5, sigma1: 80, sigma2: 60, theta: 0, sampleCount: 10 },
  ];

  it('returns scale factor ~1 for zero velocity, zero head rotation, ideal EAR', () => {
    const inputs = neutralInputs();
    const result = computeFrameUncertainty(inputs, baseEllipses);
    // sVelocity=1, sHeadpose=1, sEar=1 → s=1
    expect(result.sigma1).toBeCloseTo(80, 0);
    expect(result.sigma2).toBeCloseTo(60, 0);
  });

  it('produces larger sigmas for high velocity', () => {
    const inputs: UncertaintyInputs = {
      ...neutralInputs(),
      velocity: 500, // V_SACCADE threshold
    };
    const result = computeFrameUncertainty(inputs, baseEllipses);
    // sVelocity = 1 + 500/500 = 2 → sigma1 = 80*2 = 160
    expect(result.sigma1).toBeGreaterThan(80);
    expect(result.sigma1).toBeCloseTo(160, 0);
  });

  it('produces larger sigmas for large yaw/pitch', () => {
    const inputs: UncertaintyInputs = {
      ...neutralInputs(),
      yaw: 15, pitch: 15,
    };
    const result = computeFrameUncertainty(inputs, baseEllipses);
    // sHeadpose = 1 + (15+15)/30 = 2
    expect(result.sigma1).toBeGreaterThan(80);
    expect(result.sigma1).toBeCloseTo(160, 0);
  });

  it('produces larger sigmas for low EAR (squinting)', () => {
    const inputs: UncertaintyInputs = {
      ...neutralInputs(),
      ear: 0.15, // half of EAR_IDEAL (0.30)
    };
    const result = computeFrameUncertainty(inputs, baseEllipses);
    // sEar = 1 + (0.30 - 0.15) / 0.30 = 1.5
    expect(result.sigma1).toBeCloseTo(120, 0); // 80 * 1.5
  });

  it('returns consistent inverse-covariance components (a, b, c)', () => {
    const inputs = neutralInputs();
    const result = computeFrameUncertainty(inputs, baseEllipses);
    // For theta=0: a = 1/sigma1^2, b = 0, c = 1/sigma2^2
    const expectedA = 1 / (result.sigma1 * result.sigma1);
    const expectedC = 1 / (result.sigma2 * result.sigma2);
    expect(result.a).toBeCloseTo(expectedA, 8);
    expect(result.b).toBeCloseTo(0, 8);
    expect(result.c).toBeCloseTo(expectedC, 8);
  });

  it('clamps sigmas to [SIGMA_MIN, SIGMA_MAX]', () => {
    // Very small base ellipse → clamp to SIGMA_MIN
    const tinyEllipses: CalibrationEllipse[] = [
      { u: 0.5, v: 0.5, sigma1: 10, sigma2: 5, theta: 0, sampleCount: 10 },
    ];
    const result1 = computeFrameUncertainty(neutralInputs(), tinyEllipses);
    expect(result1.sigma1).toBeGreaterThanOrEqual(SIGMA_MIN);
    expect(result1.sigma2).toBeGreaterThanOrEqual(SIGMA_MIN);

    // Very large base ellipse + high scaling → clamp to SIGMA_MAX
    const hugeEllipses: CalibrationEllipse[] = [
      { u: 0.5, v: 0.5, sigma1: 350, sigma2: 300, theta: 0, sampleCount: 10 },
    ];
    const highInputs: UncertaintyInputs = {
      ...neutralInputs(),
      velocity: 1000,
      yaw: 30, pitch: 0,
      ear: 0.0,
    };
    const result2 = computeFrameUncertainty(highInputs, hugeEllipses);
    expect(result2.sigma1).toBeLessThanOrEqual(SIGMA_MAX);
    expect(result2.sigma2).toBeLessThanOrEqual(SIGMA_MAX);
  });

  it('normalizes gaze to stimulus [0,1] for ellipse lookup', () => {
    // Two ellipses at different positions
    const ellipses: CalibrationEllipse[] = [
      { u: 0.0, v: 0.5, sigma1: 50, sigma2: 40, theta: 0, sampleCount: 5 },
      { u: 1.0, v: 0.5, sigma1: 150, sigma2: 120, theta: 0, sampleCount: 5 },
    ];
    // Gaze near left edge → closer to first ellipse
    const leftInputs: UncertaintyInputs = { ...neutralInputs(10, 300), rect: defaultRect };
    const leftResult = computeFrameUncertainty(leftInputs, ellipses);
    // Gaze near right edge → closer to second ellipse
    const rightInputs: UncertaintyInputs = { ...neutralInputs(790, 300), rect: defaultRect };
    const rightResult = computeFrameUncertainty(rightInputs, ellipses);
    expect(rightResult.sigma1).toBeGreaterThan(leftResult.sigma1);
  });

  it('handles non-zero theta in inverse-covariance computation', () => {
    // Use widely different sigmas to make b clearly nonzero
    const angledEllipses: CalibrationEllipse[] = [
      { u: 0.5, v: 0.5, sigma1: 200, sigma2: 40, theta: Math.PI / 4, sampleCount: 10 },
    ];
    const result = computeFrameUncertainty(neutralInputs(), angledEllipses);
    // b should be nonzero for theta = π/4 with asymmetric sigmas
    // b = sin(2θ) * (1/σ1² - 1/σ2²) / 2, large difference → large |b|
    expect(Math.abs(result.b)).toBeGreaterThan(1e-4);
    // Verify the matrix is positive definite: a > 0, c > 0, ac - b^2 > 0
    expect(result.a).toBeGreaterThan(0);
    expect(result.c).toBeGreaterThan(0);
    expect(result.a * result.c - result.b * result.b).toBeGreaterThan(0);
  });
});
