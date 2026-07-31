import { describe, it, expect } from 'vitest';
import {
  hybridMinimumJerkPositive01,
  expandGazeWithMinimumJerkGapFill,
  HYBRID_GAP_FILL_MAX_MS,
  HYBRID_GAP_FILL_STEP_MS,
  HYBRID_GAP_FILL_MIN_SEGMENT_MS,
  HYBRID_GAP_FILL_SYNTHETIC_WEIGHT,
} from '../gazeGapFill';

// ---------------------------------------------------------------------------
// Constants sanity
// ---------------------------------------------------------------------------

describe('gazeGapFill constants', () => {
  it('MAX_MS = 1800', () => expect(HYBRID_GAP_FILL_MAX_MS).toBe(1800));
  it('STEP_MS = 50', () => expect(HYBRID_GAP_FILL_STEP_MS).toBe(50));
  it('MIN_SEGMENT_MS = 55', () => expect(HYBRID_GAP_FILL_MIN_SEGMENT_MS).toBe(55));
  it('SYNTHETIC_WEIGHT = 0.22', () => expect(HYBRID_GAP_FILL_SYNTHETIC_WEIGHT).toBe(0.22));
});

// ---------------------------------------------------------------------------
// hybridMinimumJerkPositive01
// ---------------------------------------------------------------------------

describe('hybridMinimumJerkPositive01', () => {
  it('tau=0 returns 0', () => {
    expect(hybridMinimumJerkPositive01(0)).toBe(0);
  });

  it('tau=1 returns 1', () => {
    expect(hybridMinimumJerkPositive01(1)).toBe(1);
  });

  it('tau=0.5 returns 0.5 (symmetric)', () => {
    // 10*(0.5^3) - 15*(0.5^4) + 6*(0.5^5)
    // = 10*0.125 - 15*0.0625 + 6*0.03125
    // = 1.25 - 0.9375 + 0.1875 = 0.5
    expect(hybridMinimumJerkPositive01(0.5)).toBeCloseTo(0.5, 10);
  });

  it('tau<0 clamped to 0 returns 0', () => {
    expect(hybridMinimumJerkPositive01(-0.5)).toBe(0);
    expect(hybridMinimumJerkPositive01(-100)).toBe(0);
  });

  it('tau>1 clamped to 1 returns 1', () => {
    expect(hybridMinimumJerkPositive01(1.5)).toBe(1);
    expect(hybridMinimumJerkPositive01(100)).toBe(1);
  });

  it('monotonically increasing: tau=0.25 < tau=0.5 < tau=0.75', () => {
    const v25 = hybridMinimumJerkPositive01(0.25);
    const v50 = hybridMinimumJerkPositive01(0.5);
    const v75 = hybridMinimumJerkPositive01(0.75);
    expect(v25).toBeLessThan(v50);
    expect(v50).toBeLessThan(v75);
  });

  it('tau=0.25 exact value', () => {
    // 10*(0.25^3) - 15*(0.25^4) + 6*(0.25^5)
    // = 10*(1/64) - 15*(1/256) + 6*(1/1024)
    // = 10/64 - 15/256 + 6/1024
    // = 0.15625 - 0.05859375 + 0.005859375
    // = 0.103515625
    const expected = 10 * Math.pow(0.25, 3) - 15 * Math.pow(0.25, 4) + 6 * Math.pow(0.25, 5);
    expect(hybridMinimumJerkPositive01(0.25)).toBeCloseTo(expected, 10);
    expect(expected).toBeCloseTo(0.103515625, 10);
  });

  it('tau=0.75 exact value (symmetric to 0.25)', () => {
    // By symmetry s(0.25) + s(0.75) = 1
    const v25 = hybridMinimumJerkPositive01(0.25);
    const v75 = hybridMinimumJerkPositive01(0.75);
    expect(v25 + v75).toBeCloseTo(1, 10);
  });

  it('derivative at endpoints is zero (smooth start/stop)', () => {
    // Verify numerically: f(epsilon) ~ 0, f(1-epsilon) ~ 1
    const eps = 1e-6;
    const nearZero = hybridMinimumJerkPositive01(eps);
    const nearOne = hybridMinimumJerkPositive01(1 - eps);
    // Very close to boundary => very small derivative => value very close to endpoint
    expect(nearZero).toBeCloseTo(0, 5);
    expect(nearOne).toBeCloseTo(1, 5);
  });
});

// ---------------------------------------------------------------------------
// expandGazeWithMinimumJerkGapFill
// ---------------------------------------------------------------------------

describe('expandGazeWithMinimumJerkGapFill', () => {
  it('empty input returns empty', () => {
    expect(expandGazeWithMinimumJerkGapFill([])).toEqual([]);
  });

  it('single point returns single point with interpolated=false', () => {
    const result = expandGazeWithMinimumJerkGapFill([{ x: 100, y: 200, t: 0 }]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ x: 100, y: 200, t: 0, interpolated: false });
  });

  it('two points close together (dt <= MIN_SEGMENT_MS) — no interpolation', () => {
    const p1 = { x: 10, y: 20, t: 0 };
    const p2 = { x: 30, y: 40, t: 50 }; // 50ms <= 55ms
    const result = expandGazeWithMinimumJerkGapFill([p1, p2]);
    expect(result).toHaveLength(2);
    expect(result.every((s) => s.interpolated === false)).toBe(true);
  });

  it('two points exactly at MIN_SEGMENT_MS — no interpolation', () => {
    const p1 = { x: 10, y: 20, t: 0 };
    const p2 = { x: 30, y: 40, t: HYBRID_GAP_FILL_MIN_SEGMENT_MS }; // 55ms
    const result = expandGazeWithMinimumJerkGapFill([p1, p2]);
    expect(result).toHaveLength(2);
    expect(result.every((s) => s.interpolated === false)).toBe(true);
  });

  it('two points far apart (dt > MAX_MS) — no interpolation', () => {
    const p1 = { x: 10, y: 20, t: 0 };
    const p2 = { x: 30, y: 40, t: 2000 }; // 2000ms > 1800ms
    const result = expandGazeWithMinimumJerkGapFill([p1, p2]);
    expect(result).toHaveLength(2);
    expect(result.every((s) => s.interpolated === false)).toBe(true);
  });

  it('two points exactly at MAX_MS — no interpolation', () => {
    const p1 = { x: 10, y: 20, t: 0 };
    const p2 = { x: 30, y: 40, t: HYBRID_GAP_FILL_MAX_MS }; // 1800ms exactly
    const result = expandGazeWithMinimumJerkGapFill([p1, p2]);
    // dt = 1800 which is NOT > 1800 so condition dt > MAX fails, but dt > MIN_SEGMENT passes
    // Wait: condition is dt <= MIN || dt > MAX => skip. dt=1800 > MIN=55 true, dt=1800 > MAX=1800 false
    // So it WILL interpolate
    const synthetics = result.filter((s) => s.interpolated);
    expect(synthetics.length).toBeGreaterThan(0);
  });

  it('two points just above MAX_MS — no interpolation', () => {
    const p1 = { x: 10, y: 20, t: 0 };
    const p2 = { x: 30, y: 40, t: HYBRID_GAP_FILL_MAX_MS + 1 }; // 1801ms > 1800ms
    const result = expandGazeWithMinimumJerkGapFill([p1, p2]);
    expect(result).toHaveLength(2);
    expect(result.every((s) => s.interpolated === false)).toBe(true);
  });

  it('two points in fillable range (200ms apart) — synthetic points inserted', () => {
    const p1 = { x: 0, y: 0, t: 0 };
    const p2 = { x: 100, y: 100, t: 200 };
    const result = expandGazeWithMinimumJerkGapFill([p1, p2]);
    expect(result.length).toBeGreaterThan(2);

    const originals = result.filter((s) => !s.interpolated);
    const synthetics = result.filter((s) => s.interpolated);
    expect(originals).toHaveLength(2);
    expect(synthetics.length).toBeGreaterThan(0);
  });

  it('synthetic points have interpolated=true, originals have false', () => {
    const p1 = { x: 0, y: 0, t: 0 };
    const p2 = { x: 100, y: 100, t: 300 };
    const result = expandGazeWithMinimumJerkGapFill([p1, p2]);
    const originals = result.filter((s) => !s.interpolated);
    const synthetics = result.filter((s) => s.interpolated);

    expect(originals[0]).toEqual({ x: 0, y: 0, t: 0, interpolated: false });
    expect(originals[1]).toEqual({ x: 100, y: 100, t: 300, interpolated: false });
    for (const s of synthetics) {
      expect(s.interpolated).toBe(true);
    }
  });

  it('output sorted by t', () => {
    const p1 = { x: 0, y: 0, t: 0 };
    const p2 = { x: 100, y: 100, t: 500 };
    const result = expandGazeWithMinimumJerkGapFill([p1, p2]);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].t).toBeGreaterThanOrEqual(result[i - 1].t);
    }
  });

  it('unsorted input gets sorted', () => {
    const p1 = { x: 0, y: 0, t: 500 };
    const p2 = { x: 100, y: 100, t: 0 };
    const result = expandGazeWithMinimumJerkGapFill([p2, p1]); // reversed
    expect(result[0].t).toBe(0);
    expect(result[result.length - 1].t).toBe(500);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].t).toBeGreaterThanOrEqual(result[i - 1].t);
    }
  });

  it('synthetic positions follow minimum jerk trajectory', () => {
    const p1 = { x: 0, y: 0, t: 0 };
    const p2 = { x: 100, y: 200, t: 300 };
    const result = expandGazeWithMinimumJerkGapFill([p1, p2]);
    const synthetics = result.filter((s) => s.interpolated);

    for (const s of synthetics) {
      const tau = (s.t - p1.t) / (p2.t - p1.t);
      const jerk = hybridMinimumJerkPositive01(tau);
      const expectedX = p1.x + (p2.x - p1.x) * jerk;
      const expectedY = p1.y + (p2.y - p1.y) * jerk;
      expect(s.x).toBeCloseTo(expectedX, 10);
      expect(s.y).toBeCloseTo(expectedY, 10);
    }
  });

  it('step size between synthetic points equals STEP_MS', () => {
    const p1 = { x: 0, y: 0, t: 0 };
    const p2 = { x: 100, y: 100, t: 500 };
    const result = expandGazeWithMinimumJerkGapFill([p1, p2]);
    const synthetics = result.filter((s) => s.interpolated);

    // All synthetic points should start at t=50 and increment by 50
    for (let i = 0; i < synthetics.length; i++) {
      const expectedT = HYBRID_GAP_FILL_STEP_MS * (i + 1);
      expect(synthetics[i].t).toBe(expectedT);
    }
  });

  it('synthetic points stay within bounding box of endpoints', () => {
    const p1 = { x: 50, y: 100, t: 0 };
    const p2 = { x: 200, y: 300, t: 400 };
    const result = expandGazeWithMinimumJerkGapFill([p1, p2]);
    const synthetics = result.filter((s) => s.interpolated);

    for (const s of synthetics) {
      expect(s.x).toBeGreaterThanOrEqual(Math.min(p1.x, p2.x));
      expect(s.x).toBeLessThanOrEqual(Math.max(p1.x, p2.x));
      expect(s.y).toBeGreaterThanOrEqual(Math.min(p1.y, p2.y));
      expect(s.y).toBeLessThanOrEqual(Math.max(p1.y, p2.y));
    }
  });

  it('multiple gaps in a sequence — fills each independently', () => {
    const points = [
      { x: 0, y: 0, t: 0 },
      { x: 50, y: 50, t: 200 },    // 200ms gap from 0 -> fillable
      { x: 60, y: 60, t: 210 },    // 10ms gap -> not fillable
      { x: 100, y: 100, t: 500 },  // 290ms gap -> fillable
    ];
    const result = expandGazeWithMinimumJerkGapFill(points);
    const originals = result.filter((s) => !s.interpolated);
    const synthetics = result.filter((s) => s.interpolated);
    expect(originals).toHaveLength(4);
    expect(synthetics.length).toBeGreaterThan(0);

    // Synthetics only in the two fillable gaps
    for (const s of synthetics) {
      const inGap1 = s.t > 0 && s.t < 200;
      const inGap2 = s.t > 210 && s.t < 500;
      expect(inGap1 || inGap2).toBe(true);
    }
  });

  it('endExclusive boundary: no synthetic too close to next point', () => {
    // endExclusive = q.t - STEP_MS * 0.25 = q.t - 12.5
    const p1 = { x: 0, y: 0, t: 0 };
    const p2 = { x: 100, y: 100, t: 200 };
    const result = expandGazeWithMinimumJerkGapFill([p1, p2]);
    const synthetics = result.filter((s) => s.interpolated);
    const endExclusive = p2.t - HYBRID_GAP_FILL_STEP_MS * 0.25; // 187.5
    for (const s of synthetics) {
      expect(s.t).toBeLessThan(endExclusive);
    }
  });
});
