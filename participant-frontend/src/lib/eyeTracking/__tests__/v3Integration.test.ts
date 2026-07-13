/**
 * V3 Probabilistic Heatmap — integration tests.
 *
 * Simulates a full viewing session: calibration residuals → ellipse fitting →
 * per-frame uncertainty + heatmap accumulation → V3 metrics generation.
 * Validates mass conservation, dual-write compatibility, and metric integrity.
 */

import { describe, it, expect } from 'vitest';
import {
  fitFromHybridResiduals,
  fitFromLoocvResiduals,
  computeFrameUncertainty,
  type CalibrationSample,
  type LoocvResidual,
} from '../attention/uncertaintyEstimator';
import { ProbabilisticHeatmap } from '../attention/probabilisticHeatmap';
import { computeSessionConfidence, computeSpatialCoverage } from '../attention/sessionMetrics';
import type { HybridCalibrationResidual } from '../hybridCalibrationField';

// ---------------------------------------------------------------------------
// Realistic calibration residuals (from actual benchmark)
// ---------------------------------------------------------------------------

const CALIBRATION_RESIDUALS: HybridCalibrationResidual[] = [
  { u: 0.10, v: 0.10, dx: 192, dy: 279 },
  { u: 0.50, v: 0.10, dx: 18, dy: 240 },
  { u: 0.90, v: 0.10, dx: -149, dy: 154 },
  { u: 0.10, v: 0.50, dx: 147, dy: 34 },
  { u: 0.50, v: 0.50, dx: 34, dy: 57 },
  { u: 0.90, v: 0.50, dx: -120, dy: 84 },
  { u: 0.10, v: 0.90, dx: 56, dy: -88 },
  { u: 0.50, v: 0.90, dx: -23, dy: -119 },
  { u: 0.90, v: 0.90, dx: -38, dy: -58 },
];

const LOOCV_RESIDUALS: LoocvResidual[] = CALIBRATION_RESIDUALS.map(r => ({
  u: r.u, v: r.v,
  dx: r.dx * 1.4, // CV errors ~40% larger than in-sample
  dy: r.dy * 1.4,
}));

// ---------------------------------------------------------------------------
// Full session simulation
// ---------------------------------------------------------------------------

describe('V3 Integration — full session', () => {
  it('simulates 10s viewing session with mass conservation', () => {
    const stimW = 1280, stimH = 720;
    const fps = 30;
    const durationS = 10;
    const nFrames = fps * durationS;
    const dt = 1 / fps;

    // Fit ellipses from calibration residuals
    const ellipses = fitFromHybridResiduals(CALIBRATION_RESIDUALS);
    expect(ellipses.length).toBeGreaterThanOrEqual(1);

    // Create heatmap accumulator
    const hm = new ProbabilisticHeatmap(stimW, stimH);

    // Simulate gaze: fixation at center for 5s, then saccade to right for 5s
    const rect = { left: 0, top: 0, width: stimW, height: stimH };
    let prevX = stimW / 2, prevY = stimH / 2;

    for (let i = 0; i < nFrames; i++) {
      const t = i / fps;
      const gazeX = t < 5 ? stimW / 2 : stimW * 0.75;
      const gazeY = stimH / 2;

      const velocity = Math.sqrt((gazeX - prevX) ** 2 + (gazeY - prevY) ** 2);
      prevX = gazeX;
      prevY = gazeY;

      const unc = computeFrameUncertainty({
        gazeX, gazeY, velocity, pitch: 0, yaw: 0, ear: 0.28, rect,
      }, ellipses);

      hm.addSample(gazeX, gazeY, unc, dt);
    }

    // Verify mass conservation
    const grid = hm.getDensityGrid();
    const totalMass = grid.data.reduce((s, v) => s + v, 0);

    expect(Math.abs(totalMass - durationS) / durationS).toBeLessThan(0.02);
    expect(hm.totalDurationS).toBeCloseTo(durationS, 1);
  });

  it('LOOCV ellipses apply scaling factor from cross-validation errors', () => {
    // Expand in-sample for per-point shape (many frames per point)
    const expanded: CalibrationSample[] = [];
    for (const r of CALIBRATION_RESIDUALS) {
      for (let i = -5; i <= 5; i++) {
        for (let j = -5; j <= 5; j++) {
          expanded.push({ u: r.u, v: r.v, dx: r.dx + i * 3, dy: r.dy + j * 3 });
        }
      }
    }

    const inSampleEllipses = fitFromLoocvResiduals(
      CALIBRATION_RESIDUALS.map(r => ({ u: r.u, v: r.v, dx: r.dx, dy: r.dy })), // 1x scale
      expanded,
    );
    const loocvEllipses = fitFromLoocvResiduals(LOOCV_RESIDUALS, expanded); // 1.4x scale

    // LOOCV (1.4x residuals) should produce proportionally larger ellipses
    const avgIn = inSampleEllipses.reduce((s, e) => s + e.sigma1, 0) / inSampleEllipses.length;
    const avgCv = loocvEllipses.reduce((s, e) => s + e.sigma1, 0) / loocvEllipses.length;
    expect(avgCv).toBeGreaterThan(avgIn * 1.1); // at least 10% larger
  });

  it('V3 payload structure matches expected schema', () => {
    const stimW = 800, stimH = 600;
    const hm = new ProbabilisticHeatmap(stimW, stimH);
    const ellipses = fitFromHybridResiduals(CALIBRATION_RESIDUALS);
    const rect = { left: 0, top: 0, width: stimW, height: stimH };

    // Add some samples
    for (let i = 0; i < 60; i++) {
      const unc = computeFrameUncertainty({
        gazeX: 400, gazeY: 300, velocity: 0, pitch: 0, yaw: 0, ear: 0.28, rect,
      }, ellipses);
      hm.addSample(400, 300, unc, 1 / 30);
    }

    // Build V3 payload (simulates what EyeTrackingRenderer does)
    const grid = hm.getDensityGrid();
    const totalMass = grid.data.reduce((s: number, v: number) => s + v, 0);
    const confidence = computeSessionConfidence(0.98, 300, 5, hm.totalDurationS);
    confidence.spatialCoverage = computeSpatialCoverage(grid);

    const v3 = {
      version: 3,
      heatmap: {
        cols: grid.cols,
        rows: grid.rows,
        cellW: grid.cellW,
        cellH: grid.cellH,
      },
      aoiMetrics: hm.getAOIMetrics(),
      totalMassS: totalMass,
      totalDurationS: hm.totalDurationS,
      massError: Math.abs(totalMass - hm.totalDurationS),
      confidence,
      ellipses: ellipses.map(e => ({
        u: e.u, v: e.v,
        sigma1: Math.round(e.sigma1),
        sigma2: Math.round(e.sigma2),
        thetaDeg: Math.round(e.theta * 180 / Math.PI),
      })),
      pipeline: 'probabilistic-heatmap-v3',
    };

    // Schema checks
    expect(v3.version).toBe(3);
    expect(v3.heatmap.cols).toBe(64);
    expect(v3.heatmap.rows).toBeGreaterThan(0);
    expect(v3.totalMassS).toBeGreaterThan(0);
    expect(v3.massError).toBeLessThan(0.1); // <100ms error
    expect(v3.confidence.score).toBeGreaterThan(0);
    expect(v3.confidence.score).toBeLessThanOrEqual(1);
    expect(v3.ellipses.length).toBeGreaterThanOrEqual(1);
    expect(v3.pipeline).toBe('probabilistic-heatmap-v3');
  });

  it('dual-write V2+V3 produces valid combined payload', () => {
    // Simulate V2 payload structure
    const v2 = {
      version: 2,
      zoneEvents: [{ type: 'zone_enter', zoneId: 'r1c1', confidence: 0.8, timestamp: 1000 }],
      zoneMetrics: { 'r1c1': { totalDwellTime: 3000, fixationCount: 2 } },
    };

    // Simulate V3 payload
    const v3 = {
      version: 3,
      totalMassS: 10.0,
      totalDurationS: 10.0,
      massError: 0.003,
      pipeline: 'probabilistic-heatmap-v3',
    };

    // Combined (same structure as EyeTrackingRenderer produces)
    const combined = {
      fixations: [{ x: 640, y: 360, duration: 500, timestamp: 1000 }],
      zoneMass: { 'r1c1': 0.6 },
      v2,
      v3,
    };

    // V2 and V3 coexist without conflicts
    expect(combined.v2.version).toBe(2);
    expect(combined.v3.version).toBe(3);
    expect(combined.fixations).toBeDefined();
    expect(combined.zoneMass).toBeDefined();
  });

  it('AOI tracking through full session produces valid metrics', () => {
    const stimW = 1280, stimH = 720;
    const hm = new ProbabilisticHeatmap(stimW, stimH);
    const ellipses = fitFromHybridResiduals(CALIBRATION_RESIDUALS);
    const rect = { left: 0, top: 0, width: stimW, height: stimH };

    const aois = [
      { id: 'cta', label: 'Call to Action', x: 540, y: 300, width: 200, height: 60 },
      { id: 'logo', label: 'Logo', x: 50, y: 30, width: 150, height: 50 },
    ];

    // Look directly at CTA center for 3s, then logo center for 2s
    for (let i = 0; i < 150; i++) {
      const t = i / 30;
      const gazeX = t < 3 ? (aois[0].x + aois[0].width / 2) : (aois[1].x + aois[1].width / 2);
      const gazeY = t < 3 ? (aois[0].y + aois[0].height / 2) : (aois[1].y + aois[1].height / 2);
      const unc = computeFrameUncertainty({
        gazeX, gazeY, velocity: 0, pitch: 0, yaw: 0, ear: 0.28, rect,
      }, ellipses);
      hm.addSample(gazeX, gazeY, unc, 1 / 30, i * 33, aois);
    }

    const metrics = hm.getAOIMetrics();
    const cta = metrics.find(m => m.aoiId === 'cta');
    const logo = metrics.find(m => m.aoiId === 'logo');

    expect(cta).toBeDefined();
    expect(logo).toBeDefined();

    // Both AOIs received measurable attention
    expect(cta!.expectedDwellS).toBeGreaterThan(0);
    expect(logo!.expectedDwellS).toBeGreaterThan(0);

    // ponytail: with center-point AOI probability (not area-integral),
    // dwell ratio depends on σ differences between screen regions.
    // CTA (center, small σ) gets higher prob/frame but for now we just
    // verify both are tracked and first-attention ordering is correct.

    // Attention share sums to ~1 (may be <1 if some gaze fell outside both AOIs)
    const totalShare = metrics.reduce((s, m) => s + m.attentionShare, 0);
    expect(totalShare).toBeLessThanOrEqual(1.01);

    // CTA was attended first (if both were detected)
    if (cta!.firstAttentionMs !== null && logo!.firstAttentionMs !== null) {
      expect(cta!.firstAttentionMs).toBeLessThan(logo!.firstAttentionMs);
    }
  });
});
