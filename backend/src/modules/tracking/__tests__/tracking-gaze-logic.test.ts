/**
 * Gauntlet tests for Website Tracking gaze logic.
 *
 * Pure functions — no DOM, no MediaPipe, no camera.
 * Cursor = primary attention signal. Iris = validation/enrichment.
 */
import { describe, it, expect } from 'vitest';
import {
  computeIrisDisplacement,
  estimateGazeDirection,
  estimateAttentionState,
  gazeMatchesCursorArea,
  classifyGazeQuadrant,
  computeAttentionScore,
  computeQuadrantProbabilities,
  type IrisDisplacement,
  type GazeDirection,
  type AttentionState,
  type QuadrantProbabilities,
} from '../tracking-gaze-logic';

// ---------------------------------------------------------------------------
// computeIrisDisplacement
// ---------------------------------------------------------------------------

describe('computeIrisDisplacement', () => {
  it('centered iris produces near-zero displacement', () => {
    // Iris at midpoint of eye box
    const d = computeIrisDisplacement(
      0.33, 0.45,   // iris
      0.28, 0.45,   // eye outer
      0.38, 0.45,   // eye inner
      0.43,         // eye top Y
      0.47,         // eye bottom Y
    );
    expect(Math.abs(d.rx)).toBeLessThan(0.05);
    expect(Math.abs(d.ry)).toBeLessThan(0.05);
  });

  it('iris displaced right produces positive rx', () => {
    const d = computeIrisDisplacement(
      0.37, 0.45,   // iris shifted right
      0.28, 0.45,
      0.38, 0.45,
      0.43, 0.47,
    );
    expect(d.rx).toBeGreaterThan(0);
  });

  it('iris displaced left produces negative rx', () => {
    const d = computeIrisDisplacement(
      0.29, 0.45,   // iris shifted left
      0.28, 0.45,
      0.38, 0.45,
      0.43, 0.47,
    );
    expect(d.rx).toBeLessThan(0);
  });

  it('iris displaced down produces positive ry', () => {
    const d = computeIrisDisplacement(
      0.33, 0.465,  // iris shifted down
      0.28, 0.45,
      0.38, 0.45,
      0.43, 0.47,
    );
    expect(d.ry).toBeGreaterThan(0);
  });

  it('iris displaced up produces negative ry', () => {
    const d = computeIrisDisplacement(
      0.33, 0.435,  // iris shifted up
      0.28, 0.45,
      0.38, 0.45,
      0.43, 0.47,
    );
    expect(d.ry).toBeLessThan(0);
  });

  it('values are finite', () => {
    const d = computeIrisDisplacement(0.5, 0.5, 0.4, 0.5, 0.6, 0.5, 0.45, 0.55);
    expect(Number.isFinite(d.rx)).toBe(true);
    expect(Number.isFinite(d.ry)).toBe(true);
  });

  it('degenerate eye (zero width) returns zero', () => {
    const d = computeIrisDisplacement(0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5);
    expect(d.rx).toBe(0);
    expect(d.ry).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// estimateGazeDirection
// ---------------------------------------------------------------------------

describe('estimateGazeDirection', () => {
  const centered: IrisDisplacement = { rx: 0, ry: 0 };
  const lookRight: IrisDisplacement = { rx: 0.12, ry: 0 };
  const lookLeft: IrisDisplacement = { rx: -0.12, ry: 0 };
  const lookUp: IrisDisplacement = { rx: 0, ry: -0.08 };
  const lookDown: IrisDisplacement = { rx: 0, ry: 0.08 };

  it('centered iris → center/center', () => {
    const d = estimateGazeDirection(centered, centered);
    expect(d.horizontal).toBe('center');
    expect(d.vertical).toBe('center');
  });

  it('both eyes looking right → right', () => {
    const d = estimateGazeDirection(lookRight, lookRight);
    expect(d.horizontal).toBe('right');
  });

  it('both eyes looking left → left', () => {
    const d = estimateGazeDirection(lookLeft, lookLeft);
    expect(d.horizontal).toBe('left');
  });

  it('both eyes looking up → up', () => {
    const d = estimateGazeDirection(lookUp, lookUp);
    expect(d.vertical).toBe('up');
  });

  it('both eyes looking down → down', () => {
    const d = estimateGazeDirection(lookDown, lookDown);
    expect(d.vertical).toBe('down');
  });

  it('averages left and right eye', () => {
    // Left eye says right, right eye says center → averaged should be center or slight right
    const slight: IrisDisplacement = { rx: 0.06, ry: 0 };
    const d = estimateGazeDirection(lookRight, centered);
    // Average rx = 0.06 — near threshold, should be center
    expect(['center', 'right']).toContain(d.horizontal);
  });

  it('handles asymmetric vertical displacement', () => {
    const d = estimateGazeDirection(lookUp, lookDown);
    // Average ry = 0 → center
    expect(d.vertical).toBe('center');
  });

  it('exactly at horizontal threshold (0.08) → center (> not >=)', () => {
    const atThreshold: IrisDisplacement = { rx: 0.08, ry: 0 };
    const d = estimateGazeDirection(atThreshold, atThreshold);
    expect(d.horizontal).toBe('center');
  });

  it('just over horizontal threshold (0.081) → right', () => {
    const over: IrisDisplacement = { rx: 0.081, ry: 0 };
    const d = estimateGazeDirection(over, over);
    expect(d.horizontal).toBe('right');
  });

  it('exactly at vertical threshold (0.06) → center', () => {
    const atThreshold: IrisDisplacement = { rx: 0, ry: 0.06 };
    const d = estimateGazeDirection(atThreshold, atThreshold);
    expect(d.vertical).toBe('center');
  });

  it('just over vertical threshold (0.061) → down', () => {
    const over: IrisDisplacement = { rx: 0, ry: 0.061 };
    const d = estimateGazeDirection(over, over);
    expect(d.vertical).toBe('down');
  });

  it('negative just over horizontal threshold → left', () => {
    const over: IrisDisplacement = { rx: -0.081, ry: 0 };
    const d = estimateGazeDirection(over, over);
    expect(d.horizontal).toBe('left');
  });

  it('negative just over vertical threshold → up', () => {
    const over: IrisDisplacement = { rx: 0, ry: -0.061 };
    const d = estimateGazeDirection(over, over);
    expect(d.vertical).toBe('up');
  });
});

// ---------------------------------------------------------------------------
// classifyGazeQuadrant
// ---------------------------------------------------------------------------

describe('classifyGazeQuadrant', () => {
  it('center/center → quadrant 0 (center)', () => {
    expect(classifyGazeQuadrant({ horizontal: 'center', vertical: 'center' })).toBe('center');
  });

  it('left/up → quadrant top-left', () => {
    expect(classifyGazeQuadrant({ horizontal: 'left', vertical: 'up' })).toBe('top-left');
  });

  it('right/down → quadrant bottom-right', () => {
    expect(classifyGazeQuadrant({ horizontal: 'right', vertical: 'down' })).toBe('bottom-right');
  });

  it('center/up → top-center', () => {
    expect(classifyGazeQuadrant({ horizontal: 'center', vertical: 'up' })).toBe('top-center');
  });

  it('left/down → bottom-left', () => {
    expect(classifyGazeQuadrant({ horizontal: 'left', vertical: 'down' })).toBe('bottom-left');
  });

  it('right/up → top-right', () => {
    expect(classifyGazeQuadrant({ horizontal: 'right', vertical: 'up' })).toBe('top-right');
  });

  it('center/down → bottom-center', () => {
    expect(classifyGazeQuadrant({ horizontal: 'center', vertical: 'down' })).toBe('bottom-center');
  });

  it('left/center → center-left', () => {
    expect(classifyGazeQuadrant({ horizontal: 'left', vertical: 'center' })).toBe('center-left');
  });

  it('right/center → center-right', () => {
    expect(classifyGazeQuadrant({ horizontal: 'right', vertical: 'center' })).toBe('center-right');
  });

  it('all 9 combinations produce distinct quadrant strings', () => {
    const h = ['left', 'center', 'right'] as const;
    const v = ['up', 'center', 'down'] as const;
    const results = new Set<string>();
    for (const horizontal of h) {
      for (const vertical of v) {
        results.add(classifyGazeQuadrant({ horizontal, vertical }));
      }
    }
    expect(results.size).toBe(9);
  });
});

// ---------------------------------------------------------------------------
// estimateAttentionState
// ---------------------------------------------------------------------------

describe('estimateAttentionState', () => {
  it('iris visible + head forward → engaged', () => {
    expect(estimateAttentionState(true, 0, 0)).toBe('engaged');
  });

  it('iris visible + slight head turn → engaged', () => {
    expect(estimateAttentionState(true, 10, 5)).toBe('engaged');
  });

  it('iris visible + large yaw → distracted', () => {
    expect(estimateAttentionState(true, 35, 0)).toBe('distracted');
  });

  it('iris visible + large pitch → distracted', () => {
    expect(estimateAttentionState(true, 0, 35)).toBe('distracted');
  });

  it('iris not visible → away', () => {
    expect(estimateAttentionState(false, 0, 0)).toBe('away');
  });

  it('iris not visible + any head pose → away', () => {
    expect(estimateAttentionState(false, 10, 10)).toBe('away');
  });

  it('negative yaw/pitch uses absolute values', () => {
    expect(estimateAttentionState(true, -35, 0)).toBe('distracted');
    expect(estimateAttentionState(true, 0, -35)).toBe('distracted');
  });

  it('borderline yaw (25°) → engaged (threshold is 30)', () => {
    expect(estimateAttentionState(true, 25, 0)).toBe('engaged');
  });

  it('exactly at threshold (30°) → engaged (> not >=)', () => {
    expect(estimateAttentionState(true, 30, 0)).toBe('engaged');
  });

  it('one degree over threshold (31°) → distracted', () => {
    expect(estimateAttentionState(true, 31, 0)).toBe('distracted');
  });

  it('pitch exactly at threshold (30°) → engaged', () => {
    expect(estimateAttentionState(true, 0, 30)).toBe('engaged');
  });

  it('pitch one degree over (31°) → distracted', () => {
    expect(estimateAttentionState(true, 0, 31)).toBe('distracted');
  });
});

// ---------------------------------------------------------------------------
// gazeMatchesCursorArea
// ---------------------------------------------------------------------------

describe('gazeMatchesCursorArea', () => {
  it('cursor in center + gaze center → match', () => {
    const match = gazeMatchesCursorArea(
      { horizontal: 'center', vertical: 'center' },
      500, 400,   // cursor near center
      1000, 800,  // viewport
    );
    expect(match).toBe(true);
  });

  it('cursor in top-left + gaze top-left → match', () => {
    const match = gazeMatchesCursorArea(
      { horizontal: 'left', vertical: 'up' },
      100, 50,
      1000, 800,
    );
    expect(match).toBe(true);
  });

  it('cursor in top-left + gaze bottom-right → no match', () => {
    const match = gazeMatchesCursorArea(
      { horizontal: 'right', vertical: 'down' },
      100, 50,
      1000, 800,
    );
    expect(match).toBe(false);
  });

  it('cursor center + gaze left → no match', () => {
    const match = gazeMatchesCursorArea(
      { horizontal: 'left', vertical: 'center' },
      500, 400,
      1000, 800,
    );
    expect(match).toBe(false);
  });

  it('gaze center matches any cursor position (center is permissive)', () => {
    // Center gaze = looking at screen generally = matches most positions
    const match = gazeMatchesCursorArea(
      { horizontal: 'center', vertical: 'center' },
      100, 50,
      1000, 800,
    );
    expect(match).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// computeAttentionScore
// ---------------------------------------------------------------------------

describe('computeAttentionScore', () => {
  it('engaged + gaze matches cursor → score 1.0', () => {
    expect(computeAttentionScore('engaged', true)).toBe(1.0);
  });

  it('engaged + gaze does not match cursor → score 0.7 (looking at screen but elsewhere)', () => {
    expect(computeAttentionScore('engaged', false)).toBe(0.7);
  });

  it('distracted → score 0.3 regardless of cursor match', () => {
    expect(computeAttentionScore('distracted', true)).toBe(0.3);
    expect(computeAttentionScore('distracted', false)).toBe(0.3);
  });

  it('away → score 0', () => {
    expect(computeAttentionScore('away', true)).toBe(0);
    expect(computeAttentionScore('away', false)).toBe(0);
  });

  it('all scores in [0, 1]', () => {
    const states: AttentionState[] = ['engaged', 'distracted', 'away'];
    for (const state of states) {
      for (const match of [true, false]) {
        const score = computeAttentionScore(state, match);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// computeQuadrantProbabilities
// ---------------------------------------------------------------------------

describe('computeQuadrantProbabilities', () => {
  const center: IrisDisplacement = { rx: 0, ry: 0 };

  it('sums to 1.0 (±0.01 rounding)', () => {
    const p = computeQuadrantProbabilities(center, center);
    const sum = Object.values(p).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 1);
  });

  it('center gaze gives highest probability to center quadrant', () => {
    const p = computeQuadrantProbabilities(center, center);
    expect(p['center']).toBeGreaterThan(p['top-left']);
    expect(p['center']).toBeGreaterThan(p['bottom-right']);
    expect(p['center']).toBeGreaterThan(p['center-left']);
  });

  it('gaze looking left shifts mass toward left quadrants', () => {
    const left: IrisDisplacement = { rx: -0.16, ry: 0 };
    const p = computeQuadrantProbabilities(left, left);
    expect(p['center-left']).toBeGreaterThan(p['center-right']);
    expect(p['center-left']).toBeGreaterThan(p['center']);
  });

  it('gaze looking top-right shifts mass to top-right', () => {
    const tr: IrisDisplacement = { rx: 0.16, ry: -0.12 };
    const p = computeQuadrantProbabilities(tr, tr);
    expect(p['top-right']).toBeGreaterThan(p['bottom-left']);
    expect(p['top-right']).toBeGreaterThan(p['center']);
  });

  it('spreads probability — no single quadrant gets 100%', () => {
    const p = computeQuadrantProbabilities(center, center);
    expect(p['center']).toBeLessThan(1);
    expect(p['center']).toBeGreaterThan(0.1);
  });

  it('adjacent quadrants get more than opposite quadrants', () => {
    const p = computeQuadrantProbabilities(center, center);
    expect(p['top-center']).toBeGreaterThan(p['top-left']);
    expect(p['center-left']).toBeGreaterThan(p['top-left']);
  });

  it('returns all 9 quadrants', () => {
    const p = computeQuadrantProbabilities(center, center);
    const keys = Object.keys(p);
    expect(keys).toHaveLength(9);
    expect(keys).toContain('center');
    expect(keys).toContain('top-left');
    expect(keys).toContain('bottom-right');
  });

  it('extreme gaze concentrates mass on nearest quadrant', () => {
    const extreme: IrisDisplacement = { rx: 0.3, ry: 0.3 };
    const p = computeQuadrantProbabilities(extreme, extreme);
    expect(p['bottom-right']).toBeGreaterThan(0.5);
    const sum = Object.values(p).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 1);
  });

  it('averages left and right eye displacement', () => {
    const leftEye: IrisDisplacement = { rx: -0.10, ry: 0 };
    const rightEye: IrisDisplacement = { rx: 0.10, ry: 0 };
    const p = computeQuadrantProbabilities(leftEye, rightEye);
    expect(p['center']).toBeGreaterThan(p['center-left']);
    expect(p['center']).toBeGreaterThan(p['center-right']);
  });
});
