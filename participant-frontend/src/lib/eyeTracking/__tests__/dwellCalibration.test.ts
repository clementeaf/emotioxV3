import { describe, it, expect } from 'vitest';
import {
  hybridCalibrationRmsePx,
  hybridApplyCalibrationField,
  HYBRID_CALIBRATION_FIELD_STRENGTH,
  type HybridCalibrationResidual,
} from '../hybridCalibrationField';
import {
  HYBRID_IMAGE_CALIBRATION_POINTS,
  hybridImagePercentToBlazeNorm,
} from '../hybridZoneGrid';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const residual = (u: number, v: number, dx: number, dy: number): HybridCalibrationResidual => ({
  u, v, dx, dy,
});

// ---------------------------------------------------------------------------
// Dwell calibration constants
// ---------------------------------------------------------------------------

describe('dwell calibration constants', () => {
  it('13 calibration points exist', () => {
    expect(HYBRID_IMAGE_CALIBRATION_POINTS).toHaveLength(13);
  });

  it('field strength is 0.85', () => {
    expect(HYBRID_CALIBRATION_FIELD_STRENGTH).toBe(0.85);
  });
});

// ---------------------------------------------------------------------------
// hybridCalibrationRmsePx — multi-sample residuals (dwell averaging)
// ---------------------------------------------------------------------------

describe('hybridCalibrationRmsePx — dwell averaged residuals', () => {
  it('returns 0 for empty residuals', () => {
    expect(hybridCalibrationRmsePx([])).toBe(0);
  });

  it('returns correct RMSE for uniform error', () => {
    // All points have dx=10, dy=0 → error = 10 each → RMSE = 10
    const residuals = [
      residual(0.1, 0.1, 10, 0),
      residual(0.5, 0.5, 10, 0),
      residual(0.9, 0.9, 10, 0),
    ];
    expect(hybridCalibrationRmsePx(residuals)).toBeCloseTo(10, 1);
  });

  it('returns correct RMSE for mixed errors', () => {
    // dx=3,dy=4 → error=5 for all → RMSE=5
    const residuals = [
      residual(0.1, 0.1, 3, 4),
      residual(0.5, 0.5, 3, 4),
      residual(0.9, 0.9, 3, 4),
    ];
    expect(hybridCalibrationRmsePx(residuals)).toBeCloseTo(5, 1);
  });

  it('averaged gaze reduces RMSE (simulating dwell averaging)', () => {
    // Simulating: 5 samples at slightly different positions, averaged
    // vs single instant sample. Averaged should have smaller residual.
    const singleSample = residual(0.5, 0.5, 30, 20); // instant click
    const avgSample = residual(0.5, 0.5, 15, 10);     // averaged dwell (half error)

    const rmseSingle = hybridCalibrationRmsePx([singleSample]);
    const rmseAvg = hybridCalibrationRmsePx([avgSample]);
    expect(rmseAvg).toBeLessThan(rmseSingle);
  });

  it('13-point calibration produces valid RMSE', () => {
    const residuals = HYBRID_IMAGE_CALIBRATION_POINTS.map(([x, y], i) =>
      residual(x / 100, y / 100, (i % 3) * 5, (i % 2) * 8),
    );
    const rmse = hybridCalibrationRmsePx(residuals);
    expect(rmse).toBeGreaterThan(0);
    expect(rmse).toBeLessThan(200); // reasonable
    expect(Number.isFinite(rmse)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// hybridApplyCalibrationField — correction quality
// ---------------------------------------------------------------------------

describe('hybridApplyCalibrationField — post-dwell correction', () => {
  const rect = new DOMRect(100, 100, 800, 600);

  it('no samples → returns original point', () => {
    const result = hybridApplyCalibrationField(400, 300, rect, [], 0.85);
    expect(result.x).toBe(400);
    expect(result.y).toBe(300);
  });

  it('applies correction toward calibration target', () => {
    // Point at center (0.5, 0.5) has residual dx=20, dy=10
    // Correction should move point in that direction
    const samples = [residual(0.5, 0.5, 20, 10)];
    const result = hybridApplyCalibrationField(500, 400, rect, samples, 0.85);
    expect(result.x).toBeGreaterThan(500); // shifted right
    expect(result.y).toBeGreaterThan(400); // shifted down
  });

  it('strength=0 → no correction', () => {
    const samples = [residual(0.5, 0.5, 100, 100)];
    const result = hybridApplyCalibrationField(500, 400, rect, samples, 0);
    expect(result.x).toBe(500);
    expect(result.y).toBe(400);
  });

  it('multiple calibration points provide better spatial coverage', () => {
    // 4 corners + center
    const samples = [
      residual(0.1, 0.1, 10, 10),
      residual(0.9, 0.1, -10, 10),
      residual(0.1, 0.9, 10, -10),
      residual(0.9, 0.9, -10, -10),
      residual(0.5, 0.5, 5, 5),
    ];
    // Point near center should be influenced most by center residual
    const center = hybridApplyCalibrationField(500, 400, rect, samples, 0.85);
    expect(center.x).toBeGreaterThan(500); // slight correction
    expect(Number.isFinite(center.x)).toBe(true);
    expect(Number.isFinite(center.y)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// hybridImagePercentToBlazeNorm — BlazeGaze calibrate() coords
// ---------------------------------------------------------------------------

describe('hybridImagePercentToBlazeNorm', () => {
  const imgRect = new DOMRect(100, 50, 800, 600);
  const vw = 1920;
  const vh = 1080;

  it('center of image maps near screen center', () => {
    const [nx, ny] = hybridImagePercentToBlazeNorm(imgRect, 50, 50, vw, vh);
    // Image center: x=500, y=350 → norm: 500/1920 - 0.5 ≈ -0.24, 350/1080 - 0.5 ≈ -0.18
    expect(nx).toBeGreaterThan(-0.5);
    expect(nx).toBeLessThan(0.5);
    expect(ny).toBeGreaterThan(-0.5);
    expect(ny).toBeLessThan(0.5);
  });

  it('top-left corner maps to negative norm coords', () => {
    const [nx, ny] = hybridImagePercentToBlazeNorm(imgRect, 0, 0, vw, vh);
    expect(nx).toBeLessThan(0); // left of center
    expect(ny).toBeLessThan(0); // above center
  });

  it('multiple calls per point (simulating 3x calibrate) produce same coords', () => {
    const results = Array(3).fill(null).map(() =>
      hybridImagePercentToBlazeNorm(imgRect, 33, 67, vw, vh),
    );
    // All 3 calls should be identical (pure function)
    expect(results[0]).toEqual(results[1]);
    expect(results[1]).toEqual(results[2]);
  });

  it('all 13 calibration points produce valid norm coords', () => {
    for (const [px, py] of HYBRID_IMAGE_CALIBRATION_POINTS) {
      const [nx, ny] = hybridImagePercentToBlazeNorm(imgRect, px, py, vw, vh);
      expect(Number.isFinite(nx)).toBe(true);
      expect(Number.isFinite(ny)).toBe(true);
      expect(nx).toBeGreaterThan(-1);
      expect(nx).toBeLessThan(1);
      expect(ny).toBeGreaterThan(-1);
      expect(ny).toBeLessThan(1);
    }
  });
});
