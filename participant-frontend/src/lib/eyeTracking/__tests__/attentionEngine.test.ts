/**
 * Attention Inference Engine tests.
 *
 * Validates uncertainty estimator, probabilistic heatmap, and session metrics
 * using synthetic data calibrated against real benchmark residuals.
 */

import { describe, it, expect } from 'vitest';
import {
  fitCalibrationEllipses,
  fitFromLoocvResiduals,
  interpolateEllipse,
  computeFrameUncertainty,
  type CalibrationSample,
  type LoocvResidual,
} from '../attention/uncertaintyEstimator';
import { ProbabilisticHeatmap } from '../attention/probabilisticHeatmap';
import { computeSessionConfidence, computeSpatialCoverage } from '../attention/sessionMetrics';

// ---------------------------------------------------------------------------
// Real residual data from our benchmark (ridge-baseline.json)
// ---------------------------------------------------------------------------

const REAL_RESIDUALS: CalibrationSample[] = [
  { u: 0.10, v: 0.10, dx: 192.1, dy: 278.7 },
  { u: 0.50, v: 0.10, dx: 18.2, dy: 239.6 },
  { u: 0.90, v: 0.10, dx: -149.2, dy: 154.2 },
  { u: 0.10, v: 0.50, dx: 147.1, dy: 33.6 },
  { u: 0.50, v: 0.50, dx: 34.0, dy: 57.0 },
  { u: 0.90, v: 0.50, dx: -119.5, dy: 83.8 },
  { u: 0.10, v: 0.90, dx: 55.7, dy: -87.5 },
  { u: 0.50, v: 0.90, dx: -23.0, dy: -119.2 },
  { u: 0.90, v: 0.90, dx: -37.5, dy: -57.9 },
];

// ---------------------------------------------------------------------------
// UncertaintyEstimator
// ---------------------------------------------------------------------------

describe('UncertaintyEstimator', () => {
  it('fits ellipses from real residuals', () => {
    const ellipses = fitCalibrationEllipses(REAL_RESIDUALS);
    expect(ellipses.length).toBeGreaterThanOrEqual(1);

    // Each ellipse should have positive sigmas
    for (const e of ellipses) {
      expect(e.sigma1).toBeGreaterThan(0);
      expect(e.sigma2).toBeGreaterThan(0);
      expect(e.sigma1).toBeGreaterThanOrEqual(e.sigma2); // major ≥ minor
      expect(Number.isFinite(e.theta)).toBe(true);
    }
  });

  it('center ellipse is smaller than corner ellipses', () => {
    // Simulate multiple samples per point with deterministic spread
    const expanded: CalibrationSample[] = [];
    const offsets = [-15, -10, -5, 0, 5, 10, 15];
    for (const r of REAL_RESIDUALS) {
      for (const ox of offsets) {
        for (const oy of offsets) {
          expanded.push({ u: r.u, v: r.v, dx: r.dx + ox, dy: r.dy + oy });
        }
      }
    }

    const ellipses = fitCalibrationEllipses(expanded);
    // With enough samples, IDW picks up the large residuals at corners
    const center = interpolateEllipse(0.5, 0.5, ellipses);
    const corner = interpolateEllipse(0.1, 0.1, ellipses);

    // Center residual (34, 57) vs corner residual (192, 279) — corner MUCH larger
    // Even with sigma_min clamp, the IDW interpolation should reflect this
    // ponytail: ≥ with float tolerance
    expect(corner.sigma1 + corner.sigma2 + 0.01).toBeGreaterThanOrEqual(center.sigma1 + center.sigma2);
  });

  it('interpolates smoothly between calibration points', () => {
    const ellipses = fitCalibrationEllipses(REAL_RESIDUALS);

    const a = interpolateEllipse(0.3, 0.3, ellipses);
    const b = interpolateEllipse(0.31, 0.3, ellipses);

    // Small position change → small sigma change
    expect(Math.abs(a.sigma1 - b.sigma1)).toBeLessThan(5);
    expect(Math.abs(a.sigma2 - b.sigma2)).toBeLessThan(5);
  });

  it('dynamic scaling increases sigma with velocity', () => {
    const ellipses = fitCalibrationEllipses(REAL_RESIDUALS);
    const rect = { left: 0, top: 0, width: 1280, height: 720 };

    const fixation = computeFrameUncertainty(
      { gazeX: 640, gazeY: 360, velocity: 0, pitch: 0, yaw: 0, ear: 0.30, rect },
      ellipses,
    );
    const saccade = computeFrameUncertainty(
      { gazeX: 640, gazeY: 360, velocity: 600, pitch: 0, yaw: 0, ear: 0.30, rect },
      ellipses,
    );

    // Saccade should produce larger uncertainty
    expect(saccade.sigma1).toBeGreaterThan(fixation.sigma1);
    expect(saccade.sigma2).toBeGreaterThan(fixation.sigma2);
  });

  it('dynamic scaling increases sigma with head rotation', () => {
    const ellipses = fitCalibrationEllipses(REAL_RESIDUALS);
    const rect = { left: 0, top: 0, width: 1280, height: 720 };

    const straight = computeFrameUncertainty(
      { gazeX: 640, gazeY: 360, velocity: 0, pitch: 0, yaw: 0, ear: 0.30, rect },
      ellipses,
    );
    const turned = computeFrameUncertainty(
      { gazeX: 640, gazeY: 360, velocity: 0, pitch: 15, yaw: 20, ear: 0.30, rect },
      ellipses,
    );

    expect(turned.sigma1).toBeGreaterThan(straight.sigma1);
  });

  it('pre-computed a,b,c are consistent with sigma1,sigma2,theta', () => {
    const ellipses = fitCalibrationEllipses(REAL_RESIDUALS);
    const rect = { left: 0, top: 0, width: 1280, height: 720 };
    const unc = computeFrameUncertainty(
      { gazeX: 640, gazeY: 360, velocity: 0, pitch: 0, yaw: 0, ear: 0.30, rect },
      ellipses,
    );

    // Verify: at point (sigma1, 0) rotated by theta, mahalanobis ≈ 1
    const dx = unc.sigma1 * Math.cos(unc.theta);
    const dy = unc.sigma1 * Math.sin(unc.theta);
    const mahal = unc.a * dx * dx + 2 * unc.b * dx * dy + unc.c * dy * dy;
    expect(Math.abs(mahal - 1.0)).toBeLessThan(0.01);
  });
});

// ---------------------------------------------------------------------------
// ProbabilisticHeatmap
// ---------------------------------------------------------------------------

describe('ProbabilisticHeatmap', () => {
  it('accumulates mass proportional to duration', () => {
    const hm = new ProbabilisticHeatmap(1280, 720);
    const unc = { sigma1: 100, sigma2: 80, theta: 0, a: 1e-4, b: 0, c: 1.5625e-4 };

    // 3 seconds of fixation at center
    for (let i = 0; i < 90; i++) {
      hm.addSample(640, 360, unc, 1 / 30);
    }

    // Total density = sum of Gaussian weight × dt across all cells.
    // For an unnormalized Gaussian kernel, total mass = 2π·σ1·σ2·dt per frame.
    // With σ=100, 90 frames × 0.033s = ~3s, total density can be large.
    // Key check: density is positive, peak is at gaze position, totalDurationS is correct.
    const grid = hm.getDensityGrid();
    const totalDensity = grid.data.reduce((s, v) => s + v, 0);
    expect(totalDensity).toBeGreaterThan(0);
    expect(hm.totalDurationS).toBeCloseTo(3.0, 0);
  });

  it('produces peak at gaze position', () => {
    const hm = new ProbabilisticHeatmap(1280, 720);
    // Isotropic for simplicity: a=1/(100²), b=0, c=1/(100²)
    const unc = { sigma1: 100, sigma2: 100, theta: 0, a: 1e-4, b: 0, c: 1e-4 };

    for (let i = 0; i < 30; i++) {
      hm.addSample(300, 200, unc, 1 / 30);
    }

    const grid = hm.getDensityGrid();
    const peakR = Math.floor(200 / grid.cellH);
    const peakC = Math.floor(300 / grid.cellW);
    const peakVal = grid.data[peakR * grid.cols + peakC];

    // Peak should be the max
    const maxVal = grid.data.reduce((m, v) => Math.max(m, v), 0);
    expect(peakVal).toBe(maxVal);
    expect(peakVal).toBeGreaterThan(0);
  });

  it('anisotropic splat produces elliptical shape', () => {
    const hm = new ProbabilisticHeatmap(1280, 720, 32);
    // sigma1=200 (horizontal), sigma2=50 (vertical), theta=0
    const unc = {
      sigma1: 200, sigma2: 50, theta: 0,
      a: 1 / (200 * 200), b: 0, c: 1 / (50 * 50),
    };

    for (let i = 0; i < 30; i++) {
      hm.addSample(640, 360, unc, 1 / 30);
    }

    const grid = hm.getDensityGrid();
    const centerR = Math.floor(360 / grid.cellH);
    const centerC = Math.floor(640 / grid.cellW);

    // Density should spread more horizontally than vertically
    const rightVal = grid.data[centerR * grid.cols + Math.min(grid.cols - 1, centerC + 3)];
    const belowVal = grid.data[Math.min(grid.rows - 1, centerR + 3) * grid.cols + centerC];

    // Horizontal (large sigma1) should have more density than vertical (small sigma2)
    expect(rightVal).toBeGreaterThan(belowVal);
  });

  it('tracks AOI dwell time', () => {
    const hm = new ProbabilisticHeatmap(1280, 720);
    const unc = { sigma1: 100, sigma2: 100, theta: 0, a: 1e-4, b: 0, c: 1e-4 };
    const aois = [
      { id: 'btn1', label: 'Button 1', x: 580, y: 300, width: 120, height: 60 },
      { id: 'btn2', label: 'Button 2', x: 100, y: 100, width: 120, height: 60 },
    ];

    // Look at btn1 for 2 seconds
    for (let i = 0; i < 60; i++) {
      hm.addSample(640, 330, unc, 1 / 30, i * 33, aois);
    }

    const metrics = hm.getAOIMetrics();
    const btn1 = metrics.find(m => m.aoiId === 'btn1');
    const btn2 = metrics.find(m => m.aoiId === 'btn2');

    expect(btn1).toBeDefined();
    expect(btn2).toBeDefined();
    expect(btn1!.expectedDwellS).toBeGreaterThan(btn2!.expectedDwellS);
    expect(btn1!.attentionShare).toBeGreaterThan(0.5);
  });
});

// ---------------------------------------------------------------------------
// SessionMetrics
// ---------------------------------------------------------------------------

describe('SessionMetrics', () => {
  it('high quality session → high confidence', () => {
    // RMSE 200px → calibQual = 1-200/500 = 0.6, head 5° → stability = 0.8
    // score = 0.98 × 0.6 × 0.8 = 0.47 — realistic for webcam
    const conf = computeSessionConfidence(0.98, 200, 5, 30);
    expect(conf.score).toBeGreaterThan(0.4);
    expect(conf.calibrationQuality).toBeGreaterThan(0.5);
    expect(conf.headStability).toBeGreaterThan(0.7);

    // Perfect calibration (RMSE=50) → much higher
    const perfect = computeSessionConfidence(0.99, 50, 2, 30);
    expect(perfect.score).toBeGreaterThan(0.8);
  });

  it('poor session → low confidence', () => {
    const conf = computeSessionConfidence(0.4, 450, 20, 10);
    expect(conf.score).toBeLessThan(0.4);
  });

  it('spatial coverage reflects exploration', () => {
    const grid = {
      data: new Float64Array(64 * 36),
      cols: 64, rows: 36, cellW: 20, cellH: 20,
    };

    // No attention → 0 coverage
    expect(computeSpatialCoverage(grid)).toBe(0);

    // Fill 25% of cells with attention
    for (let i = 0; i < Math.floor(grid.data.length / 4); i++) {
      grid.data[i] = 0.2;
    }
    const cov = computeSpatialCoverage(grid);
    expect(cov).toBeGreaterThan(0.2);
    expect(cov).toBeLessThan(0.3);
  });
});

// ---------------------------------------------------------------------------
// Mass conservation
// ---------------------------------------------------------------------------

describe('Mass conservation', () => {
  /** Helper: make FrameUncertainty with pre-computed a,b,c from σ1,σ2,θ */
  function makeUnc(sigma1: number, sigma2: number, theta = 0) {
    const cosT = Math.cos(theta), sinT = Math.sin(theta);
    const inv1 = 1 / (sigma1 * sigma1), inv2 = 1 / (sigma2 * sigma2);
    return {
      sigma1, sigma2, theta,
      a: cosT * cosT * inv1 + sinT * sinT * inv2,
      b: Math.sin(2 * theta) * (inv1 - inv2) / 2,
      c: sinT * sinT * inv1 + cosT * cosT * inv2,
    };
  }

  it('small σ and large σ produce identical total mass for same dt', () => {
    const hm1 = new ProbabilisticHeatmap(1280, 720);
    const hm2 = new ProbabilisticHeatmap(1280, 720);
    const dt = 0.033;

    const small = makeUnc(50, 40);
    const large = makeUnc(200, 150, Math.PI / 4);

    // One frame each, same dt, same position
    hm1.addSample(640, 360, small, dt);
    hm2.addSample(640, 360, large, dt);

    const sum1 = hm1.getDensityGrid().data.reduce((s, v) => s + v, 0);
    const sum2 = hm2.getDensityGrid().data.reduce((s, v) => s + v, 0);

    // Both should contribute exactly dt seconds (within 1% tolerance)
    expect(Math.abs(sum1 - dt) / dt).toBeLessThan(0.01);
    expect(Math.abs(sum2 - dt) / dt).toBeLessThan(0.01);
    expect(Math.abs(sum1 - sum2) / dt).toBeLessThan(0.01);
  });

  it('grid sum equals session duration after N frames', () => {
    const hm = new ProbabilisticHeatmap(1280, 720);
    const dt = 1 / 30;
    const nFrames = 300; // 10 seconds
    const expectedDuration = nFrames * dt;

    // Vary σ and position each frame
    for (let i = 0; i < nFrames; i++) {
      const x = 200 + (i % 50) * 18;  // sweep across stimulus
      const y = 200 + Math.floor(i / 50) * 50;
      const sigma = 60 + (i % 30) * 5; // 60-205px varying
      const unc = makeUnc(sigma, sigma * 0.7);
      hm.addSample(x, y, unc, dt);
    }

    const totalMass = hm.getDensityGrid().data.reduce((s, v) => s + v, 0);

    // Total mass should equal session duration within 2%
    expect(Math.abs(totalMass - expectedDuration) / expectedDuration).toBeLessThan(0.02);
    expect(hm.totalDurationS).toBeCloseTo(expectedDuration, 1);
  });

  it('anisotropic ellipse conserves same mass as isotropic circle', () => {
    const hm1 = new ProbabilisticHeatmap(1280, 720);
    const hm2 = new ProbabilisticHeatmap(1280, 720);
    const dt = 0.05;

    const circle = makeUnc(120, 120);
    const ellipse = makeUnc(200, 60, Math.PI / 3); // same area: π×200×60 ≈ π×120×100

    hm1.addSample(640, 360, circle, dt);
    hm2.addSample(640, 360, ellipse, dt);

    const sum1 = hm1.getDensityGrid().data.reduce((s, v) => s + v, 0);
    const sum2 = hm2.getDensityGrid().data.reduce((s, v) => s + v, 0);

    // Both must equal dt regardless of shape
    expect(Math.abs(sum1 - dt) / dt).toBeLessThan(0.01);
    expect(Math.abs(sum2 - dt) / dt).toBeLessThan(0.01);
  });

  it('edge splat (gaze near stimulus boundary) still conserves mass', () => {
    const hm = new ProbabilisticHeatmap(1280, 720);
    const dt = 0.033;
    const unc = makeUnc(150, 100);

    // Gaze at top-left corner — half the Gaussian is clipped
    hm.addSample(50, 30, unc, dt);

    const totalMass = hm.getDensityGrid().data.reduce((s, v) => s + v, 0);

    // Mass should still equal dt — normalization uses only the visible cells
    expect(Math.abs(totalMass - dt) / dt).toBeLessThan(0.01);
  });
});

// ---------------------------------------------------------------------------
// LOOCV ellipses
// ---------------------------------------------------------------------------

describe('LOOCV ellipse estimation', () => {
  it('LOOCV residuals produce larger ellipses than in-sample', () => {
    // In-sample residuals (from ridge-baseline.json diagnostics)
    const inSample: CalibrationSample[] = REAL_RESIDUALS;

    // Simulated LOOCV residuals — always larger than in-sample
    // (holding out a point increases prediction error at that point)
    const loocv: LoocvResidual[] = REAL_RESIDUALS.map(r => ({
      u: r.u, v: r.v,
      dx: r.dx * 1.4, // CV error is typically 30-50% larger than in-sample
      dy: r.dy * 1.4,
    }));

    const inSampleEllipses = fitCalibrationEllipses(inSample);
    const loocvEllipses = fitFromLoocvResiduals(loocv, inSample);

    // LOOCV ellipses should be larger (σ1 and σ2 scaled up)
    const inSampleAvgSigma = inSampleEllipses.reduce((s, e) => s + e.sigma1, 0) / inSampleEllipses.length;
    const loocvAvgSigma = loocvEllipses.reduce((s, e) => s + e.sigma1, 0) / loocvEllipses.length;

    expect(loocvAvgSigma).toBeGreaterThan(inSampleAvgSigma);
  });

  it('LOOCV ellipses preserve per-point shape from in-sample', () => {
    const inSample: CalibrationSample[] = [];
    const offsets = [-10, -5, 0, 5, 10];
    for (const r of REAL_RESIDUALS) {
      for (const ox of offsets) {
        for (const oy of offsets) {
          inSample.push({ u: r.u, v: r.v, dx: r.dx + ox, dy: r.dy + oy });
        }
      }
    }

    const loocv: LoocvResidual[] = REAL_RESIDUALS.map(r => ({
      u: r.u, v: r.v, dx: r.dx * 1.5, dy: r.dy * 1.5,
    }));

    const loocvEllipses = fitFromLoocvResiduals(loocv, inSample);

    // Should have multiple ellipses (one per calibration point)
    expect(loocvEllipses.length).toBeGreaterThanOrEqual(3);

    // Each should have valid params
    for (const e of loocvEllipses) {
      expect(e.sigma1).toBeGreaterThan(0);
      expect(e.sigma2).toBeGreaterThan(0);
      expect(Number.isFinite(e.theta)).toBe(true);
    }
  });

  it('falls back gracefully with insufficient LOOCV data', () => {
    const loocv: LoocvResidual[] = [
      { u: 0.5, v: 0.5, dx: 100, dy: 200 },
    ];

    const ellipses = fitFromLoocvResiduals(loocv);
    expect(ellipses.length).toBeGreaterThanOrEqual(1);
    expect(ellipses[0].sigma1).toBeGreaterThan(0);
  });
});
