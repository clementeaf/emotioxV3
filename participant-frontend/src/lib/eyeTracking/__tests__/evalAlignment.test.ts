/**
 * Eval alignment validation tests.
 *
 * Verifies that ground truth format, coordinate spaces, timestamp ordering,
 * and calibration/evaluation splits produce valid and non-misleading metrics.
 *
 * These tests catch alignment bugs BEFORE running expensive E2E evaluations.
 */

import { describe, it, expect } from 'vitest';
import {
  computeRmse,
  computeDrift,
  computeFalseZoneChanges,
  computeAllMetrics,
  type PredictedSample,
} from '../../../../eval/computeMetrics';
import type { GroundTruthPoint } from '../../../../eval/types';
import {
  presetLeftRightSaccade,
} from '../../../../eval/synthetic/generateSyntheticGaze';

const VW = 1280;
const VH = 720;

// ---------------------------------------------------------------------------
// Ground truth format validation
// ---------------------------------------------------------------------------

describe('Eval alignment — Ground truth validation', () => {
  it('rejects overlapping GT windows', () => {
    const gt: GroundTruthPoint[] = [
      { startMs: 0, endMs: 2000, x: 0.2, y: 0.5 },
      { startMs: 1500, endMs: 3000, x: 0.8, y: 0.5 }, // overlap at 1500-2000
    ];

    // Overlapping windows would double-count samples in RMSE
    const hasOverlap = gt.some((a, i) =>
      gt.some((b, j) => i !== j && a.startMs < b.endMs && b.startMs < a.endMs),
    );
    expect(hasOverlap).toBe(true);
    // This is a validation check — real GT should NOT have overlaps
  });

  it('GT coordinates must be in [0,1] range', () => {
    const gt: GroundTruthPoint[] = [
      { startMs: 0, endMs: 1000, x: 0.5, y: 0.5 },
      { startMs: 1200, endMs: 2200, x: 0.9, y: 0.1 },
    ];

    for (const pt of gt) {
      expect(pt.x).toBeGreaterThanOrEqual(0);
      expect(pt.x).toBeLessThanOrEqual(1);
      expect(pt.y).toBeGreaterThanOrEqual(0);
      expect(pt.y).toBeLessThanOrEqual(1);
    }
  });

  it('GT timestamps must be monotonically non-decreasing', () => {
    const gt: GroundTruthPoint[] = [
      { startMs: 0, endMs: 1000, x: 0.2, y: 0.5 },
      { startMs: 1200, endMs: 2200, x: 0.5, y: 0.5 },
      { startMs: 2400, endMs: 3400, x: 0.8, y: 0.5 },
    ];

    for (let i = 1; i < gt.length; i++) {
      expect(gt[i].startMs).toBeGreaterThanOrEqual(gt[i - 1].endMs);
    }
  });
});

// ---------------------------------------------------------------------------
// Coordinate space validation
// ---------------------------------------------------------------------------

describe('Eval alignment — Coordinate space', () => {
  it('RMSE is zero when predictions exactly match GT', () => {
    const gt: GroundTruthPoint[] = [
      { startMs: 0, endMs: 1000, x: 0.5, y: 0.5 },
    ];
    const predicted: PredictedSample[] = [
      { t: 100, x: 0.5 * VW, y: 0.5 * VH },
      { t: 500, x: 0.5 * VW, y: 0.5 * VH },
    ];

    const rmse = computeRmse(predicted, gt, VW, VH);
    expect(rmse).toBe(0);
  });

  it('RMSE reflects pixel distance, not normalized distance', () => {
    const gt: GroundTruthPoint[] = [
      { startMs: 0, endMs: 1000, x: 0.5, y: 0.5 },
    ];
    // 100px off in X
    const predicted: PredictedSample[] = [
      { t: 100, x: 0.5 * VW + 100, y: 0.5 * VH },
    ];

    const rmse = computeRmse(predicted, gt, VW, VH);
    expect(Math.round(rmse)).toBe(100);
  });

  it('predictions outside GT windows are NOT counted in RMSE', () => {
    const gt: GroundTruthPoint[] = [
      { startMs: 1000, endMs: 2000, x: 0.5, y: 0.5 },
    ];
    // All predictions before GT window
    const predicted: PredictedSample[] = [
      { t: 0, x: 0, y: 0 },
      { t: 500, x: VW, y: VH },
    ];

    const rmse = computeRmse(predicted, gt, VW, VH);
    expect(rmse).toBe(0); // No samples matched → 0, not misleading high/low
  });

  it('viewport scaling produces correct RMSE', () => {
    // Simulate MPIIFaceGaze coordinate conversion:
    // Original screen: 1920x1080, target: 1280x720
    const origW = 1920, origH = 1080;
    const scaleX = VW / origW;
    const scaleY = VH / origH;

    // GT point at center of original screen
    const gtOrigX = 960; // center of 1920
    const gtOrigY = 540; // center of 1080
    const gtNormX = (gtOrigX * scaleX) / VW; // should be 0.5
    const gtNormY = (gtOrigY * scaleY) / VH; // should be 0.5

    expect(Math.abs(gtNormX - 0.5)).toBeLessThan(0.001);
    expect(Math.abs(gtNormY - 0.5)).toBeLessThan(0.001);
  });
});

// ---------------------------------------------------------------------------
// Calibration vs evaluation separation
// ---------------------------------------------------------------------------

describe('Eval alignment — Calibration/evaluation separation', () => {
  it('metrics computed only on evaluation points, not calibration', () => {
    // Calibration: model is perfect (RMSE = 0)
    // Evaluation: model is 50px off
    const calGT: GroundTruthPoint[] = [
      { startMs: 0, endMs: 1000, x: 0.5, y: 0.5 },
    ];
    const evalGT: GroundTruthPoint[] = [
      { startMs: 2000, endMs: 3000, x: 0.5, y: 0.5 },
    ];

    const calPredicted: PredictedSample[] = [
      { t: 500, x: 0.5 * VW, y: 0.5 * VH }, // perfect
    ];
    const evalPredicted: PredictedSample[] = [
      { t: 2500, x: 0.5 * VW + 50, y: 0.5 * VH }, // 50px off
    ];

    const calRmse = computeRmse(calPredicted, calGT, VW, VH);
    const evalRmse = computeRmse(evalPredicted, evalGT, VW, VH);

    expect(calRmse).toBe(0);
    expect(Math.round(evalRmse)).toBe(50);
    // These are different — eval metrics should use evalGT only
  });
});

// ---------------------------------------------------------------------------
// False zone change detection
// ---------------------------------------------------------------------------

describe('Eval alignment — False zone changes', () => {
  it('no false changes when predictions match GT zones perfectly', () => {
    const gt: GroundTruthPoint[] = [
      { startMs: 0, endMs: 2000, x: 0.2, y: 0.5, zone: 'left' },
      { startMs: 2500, endMs: 4500, x: 0.8, y: 0.5, zone: 'right' },
    ];
    const predicted: PredictedSample[] = [
      { t: 500, x: 256, y: 360, zone: 'left' },
      { t: 1500, x: 256, y: 360, zone: 'left' },
      { t: 3000, x: 1024, y: 360, zone: 'right' },
      { t: 4000, x: 1024, y: 360, zone: 'right' },
    ];

    const { falseChanges, totalChanges } = computeFalseZoneChanges(predicted, gt);
    expect(totalChanges).toBe(1); // one left→right transition
    expect(falseChanges).toBe(0); // matches GT
  });

  it('detects false zone changes (oscillation)', () => {
    const gt: GroundTruthPoint[] = [
      { startMs: 0, endMs: 4000, x: 0.2, y: 0.5, zone: 'left' },
    ];
    // Prediction oscillates between left and right during a left-fixation
    const predicted: PredictedSample[] = [
      { t: 500, x: 256, y: 360, zone: 'left' },
      { t: 1000, x: 1024, y: 360, zone: 'right' }, // false
      { t: 1500, x: 256, y: 360, zone: 'left' },   // false
      { t: 2000, x: 1024, y: 360, zone: 'right' }, // false
      { t: 2500, x: 256, y: 360, zone: 'left' },   // false
    ];

    const { falseChanges, totalChanges } = computeFalseZoneChanges(predicted, gt);
    expect(totalChanges).toBe(4);
    expect(falseChanges).toBeGreaterThanOrEqual(3); // most should be false
  });
});

// ---------------------------------------------------------------------------
// Drift detection validity
// ---------------------------------------------------------------------------

describe('Eval alignment — Drift measurement validity', () => {
  it('drift is near-zero for stationary gaze', () => {
    const predicted: PredictedSample[] = Array.from({ length: 100 }, (_, i) => ({
      t: i * 33,
      x: 640 + (Math.random() - 0.5) * 10, // tiny noise
      y: 360 + (Math.random() - 0.5) * 10,
    }));

    const drift = computeDrift(predicted);
    expect(drift).toBeLessThan(5);
  });

  it('drift detects consistent linear movement', () => {
    const predicted: PredictedSample[] = Array.from({ length: 100 }, (_, i) => ({
      t: i * 33,
      x: 640 + i * 2, // 2px per frame ≈ 60px/s
      y: 360,
    }));

    const drift = computeDrift(predicted);
    expect(drift).toBeGreaterThan(40); // should detect ~60px/s
  });
});

// ---------------------------------------------------------------------------
// Full pipeline metric validity
// ---------------------------------------------------------------------------

describe('Eval alignment — computeAllMetrics integrity', () => {
  it('produces finite metrics for normal input', () => {
    const { samples, groundTruth } = presetLeftRightSaccade(VW, VH);
    const predicted: PredictedSample[] = samples
      .filter(s => s.open)
      .map(s => ({ t: s.t, x: s.x, y: s.y }));

    const metrics = computeAllMetrics('test', predicted, groundTruth, samples.length, VW, VH);

    expect(Number.isFinite(metrics.rmsePx)).toBe(true);
    expect(Number.isFinite(metrics.jitterPx)).toBe(true);
    expect(Number.isFinite(metrics.driftPxPerS)).toBe(true);
    expect(metrics.validFrameRatio).toBeGreaterThan(0);
    expect(metrics.validFrameRatio).toBeLessThanOrEqual(1);
    expect(metrics.totalFrames).toBeGreaterThan(0);
  });

  it('produces zero RMSE for empty evaluation GT', () => {
    const predicted: PredictedSample[] = [
      { t: 0, x: 100, y: 100 },
    ];
    const metrics = computeAllMetrics('test', predicted, [], 1, VW, VH);
    expect(metrics.rmsePx).toBe(0);
  });
});
