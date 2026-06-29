import { describe, it, expect } from 'vitest';
import {
  HYBRID_VALIDATION_POINTS,
  HYBRID_VALIDATION_POINT,
  HYBRID_RECALIBRATION_RMSE_THRESHOLD_PX,
  HYBRID_REJECT_RMSE_THRESHOLD_PX,
  HYBRID_IMAGE_CALIBRATION_POINTS,
} from '../hybridZoneGrid';

// ---------------------------------------------------------------------------
// HYBRID_VALIDATION_POINTS
// ---------------------------------------------------------------------------

describe('HYBRID_VALIDATION_POINTS', () => {
  it('has exactly 5 points', () => {
    expect(HYBRID_VALIDATION_POINTS).toHaveLength(5);
  });

  it('each point is a [number, number] tuple within 0-100', () => {
    for (const [x, y] of HYBRID_VALIDATION_POINTS) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(100);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(100);
    }
  });

  it('no validation point overlaps exactly with any calibration point', () => {
    const calSet = new Set(
      HYBRID_IMAGE_CALIBRATION_POINTS.map(([x, y]) => `${x},${y}`),
    );
    for (const [x, y] of HYBRID_VALIDATION_POINTS) {
      // Allow [50,50] since it's the center and appears in both but is
      // measured independently. All others must be distinct.
      if (x === 50 && y === 50) continue;
      expect(calSet.has(`${x},${y}`)).toBe(false);
    }
  });

  it('covers all 4 quadrants + center', () => {
    const upperLeft = HYBRID_VALIDATION_POINTS.some(([x, y]) => x < 50 && y < 50);
    const upperRight = HYBRID_VALIDATION_POINTS.some(([x, y]) => x > 50 && y < 50);
    const lowerLeft = HYBRID_VALIDATION_POINTS.some(([x, y]) => x < 50 && y > 50);
    const lowerRight = HYBRID_VALIDATION_POINTS.some(([x, y]) => x > 50 && y > 50);
    const center = HYBRID_VALIDATION_POINTS.some(([x, y]) => x === 50 && y === 50);
    expect(upperLeft).toBe(true);
    expect(upperRight).toBe(true);
    expect(lowerLeft).toBe(true);
    expect(lowerRight).toBe(true);
    expect(center).toBe(true);
  });

  it('has no duplicate points', () => {
    const seen = new Set<string>();
    for (const [x, y] of HYBRID_VALIDATION_POINTS) {
      const key = `${x},${y}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });
});

// ---------------------------------------------------------------------------
// Legacy HYBRID_VALIDATION_POINT (single, deprecated)
// ---------------------------------------------------------------------------

describe('HYBRID_VALIDATION_POINT (legacy)', () => {
  it('is a 2-element tuple', () => {
    expect(HYBRID_VALIDATION_POINT).toHaveLength(2);
  });

  it('values are in 0-100 range', () => {
    expect(HYBRID_VALIDATION_POINT[0]).toBeGreaterThan(0);
    expect(HYBRID_VALIDATION_POINT[0]).toBeLessThan(100);
    expect(HYBRID_VALIDATION_POINT[1]).toBeGreaterThan(0);
    expect(HYBRID_VALIDATION_POINT[1]).toBeLessThan(100);
  });
});

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

describe('validation thresholds', () => {
  it('RECALIBRATION threshold is 150px', () => {
    expect(HYBRID_RECALIBRATION_RMSE_THRESHOLD_PX).toBe(150);
  });

  it('REJECT threshold is 200px', () => {
    expect(HYBRID_REJECT_RMSE_THRESHOLD_PX).toBe(200);
  });

  it('REJECT > RECALIBRATION (harder bar)', () => {
    expect(HYBRID_REJECT_RMSE_THRESHOLD_PX).toBeGreaterThan(
      HYBRID_RECALIBRATION_RMSE_THRESHOLD_PX,
    );
  });
});

// ---------------------------------------------------------------------------
// HYBRID_IMAGE_CALIBRATION_POINTS sanity
// ---------------------------------------------------------------------------

describe('HYBRID_IMAGE_CALIBRATION_POINTS', () => {
  it('has 13 points', () => {
    expect(HYBRID_IMAGE_CALIBRATION_POINTS).toHaveLength(13);
  });

  it('all within 0-100 range', () => {
    for (const [x, y] of HYBRID_IMAGE_CALIBRATION_POINTS) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(100);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(100);
    }
  });
});
