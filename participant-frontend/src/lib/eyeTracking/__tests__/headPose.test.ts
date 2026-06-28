import { describe, it, expect } from 'vitest';
import {
  extractEulerAngles,
  compensateHeadPose,
  parseFacialTransformationMatrix,
  HEAD_POSE_GAIN_X,
  HEAD_POSE_GAIN_Y,
  HEAD_POSE_ROLL_WARNING_THRESHOLD,
  HEAD_POSE_MAX_CORRECTION_PX,
  type RotationRowMajor,
  type EulerAngles,
} from '../headPose';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VW = 1920;
const VH = 1080;

const angles = (pitch: number, yaw: number, roll = 0): EulerAngles => ({ pitch, yaw, roll });

/** Identity rotation — no rotation at all. */
const IDENTITY: RotationRowMajor = [1, 0, 0, 0, 1, 0, 0, 0, 1];

/**
 * Build a rotation matrix for a single-axis rotation (simplified).
 * Yaw = rotation around Y, Pitch = around X, Roll = around Z.
 */
const rotationY = (degYaw: number): RotationRowMajor => {
  const r = (degYaw * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [c, 0, s, 0, 1, 0, -s, 0, c];
};

const rotationX = (degPitch: number): RotationRowMajor => {
  const r = (degPitch * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [1, 0, 0, 0, c, -s, 0, s, c];
};

const rotationZ = (degRoll: number): RotationRowMajor => {
  const r = (degRoll * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [c, -s, 0, s, c, 0, 0, 0, 1];
};

// ---------------------------------------------------------------------------
// extractEulerAngles
// ---------------------------------------------------------------------------

describe('extractEulerAngles', () => {
  it('identity matrix → all angles ~0', () => {
    const a = extractEulerAngles(IDENTITY);
    expect(a.pitch).toBeCloseTo(0, 5);
    expect(a.yaw).toBeCloseTo(0, 5);
    expect(a.roll).toBeCloseTo(0, 5);
  });

  it('pure pitch rotation (X axis) is extracted correctly', () => {
    const a = extractEulerAngles(rotationX(15));
    expect(a.pitch).toBeCloseTo(15, 0);
    expect(a.yaw).toBeCloseTo(0, 0);
  });

  it('negative pitch', () => {
    const a = extractEulerAngles(rotationX(-20));
    expect(a.pitch).toBeCloseTo(-20, 0);
  });

  it('pure roll rotation (Z axis) is extracted correctly', () => {
    const a = extractEulerAngles(rotationZ(25));
    expect(a.roll).toBeCloseTo(25, 0);
    expect(a.pitch).toBeCloseTo(0, 0);
  });

  it('negative roll', () => {
    const a = extractEulerAngles(rotationZ(-10));
    expect(a.roll).toBeCloseTo(-10, 0);
  });

  it('pure yaw rotation (Y axis) is extracted correctly', () => {
    const a = extractEulerAngles(rotationY(30));
    expect(a.yaw).toBeCloseTo(30, 0);
    expect(a.pitch).toBeCloseTo(0, 0);
  });

  it('small angles return small values', () => {
    const a = extractEulerAngles(rotationX(2));
    expect(Math.abs(a.pitch)).toBeLessThan(5);
  });

  it('handles near-gimbal-lock (pitch ≈ 90°)', () => {
    // Pitch ~90° causes gimbal lock — should not throw or return NaN
    const r: RotationRowMajor = [0, 0, 1, 0, 1, 0, -1, 0, 0];
    const a = extractEulerAngles(r);
    expect(Number.isFinite(a.pitch)).toBe(true);
    expect(Number.isFinite(a.yaw)).toBe(true);
    expect(Number.isFinite(a.roll)).toBe(true);
  });

  it('all returned values are finite numbers', () => {
    // Random-ish rotation matrix
    const r: RotationRowMajor = [0.9, -0.3, 0.3, 0.3, 0.95, -0.05, -0.3, 0.1, 0.95];
    const a = extractEulerAngles(r);
    expect(Number.isFinite(a.pitch)).toBe(true);
    expect(Number.isFinite(a.yaw)).toBe(true);
    expect(Number.isFinite(a.roll)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// compensateHeadPose — zero angles (passthrough)
// ---------------------------------------------------------------------------

describe('compensateHeadPose — zero angles', () => {
  it('zero yaw and pitch → no correction', () => {
    const result = compensateHeadPose(500, 300, angles(0, 0), VW, VH);
    expect(result.x).toBe(500);
    expect(result.y).toBe(300);
    expect(result.rollWarning).toBe(false);
  });

  it('zero angles preserves exact position', () => {
    const result = compensateHeadPose(960, 540, angles(0, 0, 0), VW, VH);
    expect(result.x).toBe(960);
    expect(result.y).toBe(540);
  });
});

// ---------------------------------------------------------------------------
// compensateHeadPose — yaw correction
// ---------------------------------------------------------------------------

describe('compensateHeadPose — yaw correction', () => {
  it('positive yaw (looking right) shifts gaze left', () => {
    const result = compensateHeadPose(500, 300, angles(0, 10), VW, VH);
    // dx = -10 * 2.5 = -25
    expect(result.x).toBeCloseTo(475, 1);
    expect(result.y).toBe(300);
  });

  it('negative yaw (looking left) shifts gaze right', () => {
    const result = compensateHeadPose(500, 300, angles(0, -10), VW, VH);
    // dx = 10 * 2.5 = 25
    expect(result.x).toBeCloseTo(525, 1);
  });

  it('yaw correction magnitude is proportional to gain', () => {
    const r1 = compensateHeadPose(500, 300, angles(0, 10), VW, VH);
    const r2 = compensateHeadPose(500, 300, angles(0, 20), VW, VH);
    const shift1 = 500 - r1.x;
    const shift2 = 500 - r2.x;
    expect(shift2).toBeCloseTo(shift1 * 2, 1);
  });

  it('yaw correction with default gain matches HEAD_POSE_GAIN_X', () => {
    const deg = 10;
    const result = compensateHeadPose(500, 300, angles(0, deg), VW, VH);
    const expected = 500 - deg * HEAD_POSE_GAIN_X;
    expect(result.x).toBeCloseTo(expected, 1);
  });
});

// ---------------------------------------------------------------------------
// compensateHeadPose — pitch correction
// ---------------------------------------------------------------------------

describe('compensateHeadPose — pitch correction', () => {
  it('positive pitch (looking down) shifts gaze up', () => {
    const result = compensateHeadPose(500, 300, angles(10, 0), VW, VH);
    // dy = -10 * 3.0 = -30
    expect(result.y).toBeCloseTo(270, 1);
    expect(result.x).toBe(500);
  });

  it('negative pitch (looking up) shifts gaze down', () => {
    const result = compensateHeadPose(500, 300, angles(-10, 0), VW, VH);
    // dy = 10 * 3.0 = 30
    expect(result.y).toBeCloseTo(330, 1);
  });

  it('pitch correction with default gain matches HEAD_POSE_GAIN_Y', () => {
    const deg = 10;
    const result = compensateHeadPose(500, 300, angles(deg, 0), VW, VH);
    const expected = 300 - deg * HEAD_POSE_GAIN_Y;
    expect(result.y).toBeCloseTo(expected, 1);
  });
});

// ---------------------------------------------------------------------------
// compensateHeadPose — combined yaw + pitch
// ---------------------------------------------------------------------------

describe('compensateHeadPose — combined corrections', () => {
  it('both yaw and pitch apply simultaneously', () => {
    const result = compensateHeadPose(500, 300, angles(10, 10), VW, VH);
    expect(result.x).toBeCloseTo(500 - 10 * HEAD_POSE_GAIN_X, 1);
    expect(result.y).toBeCloseTo(300 - 10 * HEAD_POSE_GAIN_Y, 1);
  });

  it('opposite directions cancel each other on different axes', () => {
    const r1 = compensateHeadPose(500, 300, angles(5, -5), VW, VH);
    expect(r1.x).toBeGreaterThan(500); // yaw -5 → shift right
    expect(r1.y).toBeLessThan(300);    // pitch 5 → shift up
  });
});

// ---------------------------------------------------------------------------
// compensateHeadPose — roll warning
// ---------------------------------------------------------------------------

describe('compensateHeadPose — roll warning', () => {
  it('roll below threshold → no warning', () => {
    const result = compensateHeadPose(500, 300, angles(0, 0, 10), VW, VH);
    expect(result.rollWarning).toBe(false);
  });

  it('roll at threshold → no warning (exclusive)', () => {
    const result = compensateHeadPose(500, 300, angles(0, 0, HEAD_POSE_ROLL_WARNING_THRESHOLD), VW, VH);
    expect(result.rollWarning).toBe(false);
  });

  it('roll above threshold → warning', () => {
    const result = compensateHeadPose(500, 300, angles(0, 0, HEAD_POSE_ROLL_WARNING_THRESHOLD + 1), VW, VH);
    expect(result.rollWarning).toBe(true);
  });

  it('negative roll above threshold → warning', () => {
    const result = compensateHeadPose(500, 300, angles(0, 0, -(HEAD_POSE_ROLL_WARNING_THRESHOLD + 1)), VW, VH);
    expect(result.rollWarning).toBe(true);
  });

  it('roll does NOT affect x/y coordinates', () => {
    const noRoll = compensateHeadPose(500, 300, angles(0, 0, 0), VW, VH);
    const withRoll = compensateHeadPose(500, 300, angles(0, 0, 30), VW, VH);
    expect(withRoll.x).toBe(noRoll.x);
    expect(withRoll.y).toBe(noRoll.y);
  });
});

// ---------------------------------------------------------------------------
// compensateHeadPose — extreme angle clamp
// ---------------------------------------------------------------------------

describe('compensateHeadPose — extreme angle clamp', () => {
  it('extreme yaw (45°) is clamped to MAX_CORRECTION_PX', () => {
    const rawCorrection = 45 * HEAD_POSE_GAIN_X; // 112.5px
    expect(rawCorrection).toBeGreaterThan(HEAD_POSE_MAX_CORRECTION_PX);

    const result = compensateHeadPose(500, 300, angles(0, 45), VW, VH);
    const shift = Math.abs(500 - result.x);
    expect(shift).toBeLessThanOrEqual(HEAD_POSE_MAX_CORRECTION_PX);
  });

  it('extreme pitch (45°) is clamped to MAX_CORRECTION_PX', () => {
    const rawCorrection = 45 * HEAD_POSE_GAIN_Y; // 135px
    expect(rawCorrection).toBeGreaterThan(HEAD_POSE_MAX_CORRECTION_PX);

    const result = compensateHeadPose(500, 300, angles(45, 0), VW, VH);
    const shift = Math.abs(300 - result.y);
    expect(shift).toBeLessThanOrEqual(HEAD_POSE_MAX_CORRECTION_PX);
  });

  it('both axes clamped independently', () => {
    const result = compensateHeadPose(500, 300, angles(60, 60), VW, VH);
    const shiftX = Math.abs(500 - result.x);
    const shiftY = Math.abs(300 - result.y);
    expect(shiftX).toBeLessThanOrEqual(HEAD_POSE_MAX_CORRECTION_PX);
    expect(shiftY).toBeLessThanOrEqual(HEAD_POSE_MAX_CORRECTION_PX);
  });
});

// ---------------------------------------------------------------------------
// compensateHeadPose — viewport clamp
// ---------------------------------------------------------------------------

describe('compensateHeadPose — viewport clamp', () => {
  it('correction does not push x below 0', () => {
    // Gaze at x=10, large positive yaw → would push to -15
    const result = compensateHeadPose(10, 300, angles(0, 10), VW, VH);
    expect(result.x).toBeGreaterThanOrEqual(0);
  });

  it('correction does not push x above viewport width', () => {
    const result = compensateHeadPose(VW - 10, 300, angles(0, -10), VW, VH);
    expect(result.x).toBeLessThanOrEqual(VW);
  });

  it('correction does not push y below 0', () => {
    const result = compensateHeadPose(500, 10, angles(10, 0), VW, VH);
    expect(result.y).toBeGreaterThanOrEqual(0);
  });

  it('correction does not push y above viewport height', () => {
    const result = compensateHeadPose(500, VH - 10, angles(-10, 0), VW, VH);
    expect(result.y).toBeLessThanOrEqual(VH);
  });

  it('gaze at corner with extreme angles stays within viewport', () => {
    const result = compensateHeadPose(0, 0, angles(40, 40), VW, VH);
    expect(result.x).toBeGreaterThanOrEqual(0);
    expect(result.y).toBeGreaterThanOrEqual(0);
  });

  it('gaze at bottom-right corner stays within viewport', () => {
    const result = compensateHeadPose(VW, VH, angles(-40, -40), VW, VH);
    expect(result.x).toBeLessThanOrEqual(VW);
    expect(result.y).toBeLessThanOrEqual(VH);
  });
});

// ---------------------------------------------------------------------------
// compensateHeadPose — NaN/undefined handling
// ---------------------------------------------------------------------------

describe('compensateHeadPose — NaN/invalid angles', () => {
  it('NaN yaw → passthrough (no correction)', () => {
    const result = compensateHeadPose(500, 300, angles(0, NaN), VW, VH);
    expect(result.x).toBe(500);
    expect(result.y).toBe(300);
  });

  it('NaN pitch → passthrough', () => {
    const result = compensateHeadPose(500, 300, angles(NaN, 0), VW, VH);
    expect(result.y).toBe(300);
  });

  it('NaN roll → no warning (treated as 0)', () => {
    const result = compensateHeadPose(500, 300, angles(0, 0, NaN), VW, VH);
    expect(result.rollWarning).toBe(false);
  });

  it('Infinity yaw → passthrough', () => {
    const result = compensateHeadPose(500, 300, angles(0, Infinity), VW, VH);
    expect(result.x).toBe(500);
  });

  it('all NaN → pure passthrough', () => {
    const result = compensateHeadPose(500, 300, { pitch: NaN, yaw: NaN, roll: NaN }, VW, VH);
    expect(result.x).toBe(500);
    expect(result.y).toBe(300);
    expect(result.rollWarning).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// compensateHeadPose — configurable gains
// ---------------------------------------------------------------------------

describe('compensateHeadPose — configurable gains', () => {
  it('custom gainX produces proportional correction', () => {
    const r1 = compensateHeadPose(500, 300, angles(0, 10), VW, VH, 1.0, HEAD_POSE_GAIN_Y);
    const r2 = compensateHeadPose(500, 300, angles(0, 10), VW, VH, 5.0, HEAD_POSE_GAIN_Y);
    const shift1 = 500 - r1.x;
    const shift2 = 500 - r2.x;
    expect(shift2).toBeCloseTo(shift1 * 5, 1);
  });

  it('custom gainY produces proportional correction', () => {
    const r1 = compensateHeadPose(500, 300, angles(10, 0), VW, VH, HEAD_POSE_GAIN_X, 1.0);
    const r2 = compensateHeadPose(500, 300, angles(10, 0), VW, VH, HEAD_POSE_GAIN_X, 6.0);
    const shift1 = 300 - r1.y;
    const shift2 = 300 - r2.y;
    expect(shift2).toBeCloseTo(shift1 * 6, 1);
  });

  it('gain 0 → no correction regardless of angle', () => {
    const result = compensateHeadPose(500, 300, angles(30, 30), VW, VH, 0, 0);
    expect(result.x).toBe(500);
    expect(result.y).toBe(300);
  });
});

// ---------------------------------------------------------------------------
// compensateHeadPose — determinism & purity
// ---------------------------------------------------------------------------

describe('compensateHeadPose — purity', () => {
  it('same input produces same output', () => {
    const a = angles(5, -3, 8);
    const r1 = compensateHeadPose(400, 250, a, VW, VH);
    const r2 = compensateHeadPose(400, 250, a, VW, VH);
    expect(r1).toEqual(r2);
  });

  it('does not mutate input angles object', () => {
    const a = { pitch: 10, yaw: 5, roll: 3 };
    const frozen = { ...a };
    compensateHeadPose(500, 300, a, VW, VH);
    expect(a).toEqual(frozen);
  });
});

// ---------------------------------------------------------------------------
// parseFacialTransformationMatrix — existing tests preserved
// ---------------------------------------------------------------------------

describe('parseFacialTransformationMatrix', () => {
  it('parses valid 4×4 matrix', () => {
    const matrix = {
      rows: 4,
      columns: 4,
      data: [1, 0, 0, 10, 0, 1, 0, 20, 0, 0, 1, 30, 0, 0, 0, 1],
    };
    const result = parseFacialTransformationMatrix(matrix);
    expect(result).not.toBeNull();
    expect(result!.rotationRowMajor).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    expect(result!.translation).toEqual([10, 20, 30]);
  });

  it('returns null for wrong dimensions', () => {
    expect(parseFacialTransformationMatrix({ rows: 3, columns: 4, data: new Array(12).fill(0) })).toBeNull();
    expect(parseFacialTransformationMatrix({ rows: 4, columns: 3, data: new Array(12).fill(0) })).toBeNull();
  });

  it('returns null for wrong data length', () => {
    expect(parseFacialTransformationMatrix({ rows: 4, columns: 4, data: new Array(15).fill(0) })).toBeNull();
  });

  it('rotation can be fed to extractEulerAngles', () => {
    const matrix = {
      rows: 4,
      columns: 4,
      data: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    };
    const parsed = parseFacialTransformationMatrix(matrix)!;
    const euler = extractEulerAngles(parsed.rotationRowMajor);
    expect(euler.pitch).toBeCloseTo(0, 5);
    expect(euler.yaw).toBeCloseTo(0, 5);
    expect(euler.roll).toBeCloseTo(0, 5);
  });
});

// ---------------------------------------------------------------------------
// Integration: parse → extract → compensate
// ---------------------------------------------------------------------------

describe('headPose — full pipeline integration', () => {
  it('identity matrix → no gaze correction', () => {
    const matrix = {
      rows: 4, columns: 4,
      data: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    };
    const parsed = parseFacialTransformationMatrix(matrix)!;
    const euler = extractEulerAngles(parsed.rotationRowMajor);
    const result = compensateHeadPose(500, 300, euler, VW, VH);
    expect(result.x).toBeCloseTo(500, 0);
    expect(result.y).toBeCloseTo(300, 0);
  });

  it('rotated matrix produces non-zero correction', () => {
    // Pitch ~15° around X
    const c = Math.cos(15 * Math.PI / 180);
    const s = Math.sin(15 * Math.PI / 180);
    const matrix = {
      rows: 4, columns: 4,
      data: [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0, 0, 0, 0, 1],
    };
    const parsed = parseFacialTransformationMatrix(matrix)!;
    const euler = extractEulerAngles(parsed.rotationRowMajor);
    const result = compensateHeadPose(500, 300, euler, VW, VH);
    // Should have some Y correction
    expect(result.y).not.toBeCloseTo(300, 0);
  });
});
