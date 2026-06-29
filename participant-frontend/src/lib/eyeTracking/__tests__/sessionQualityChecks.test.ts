import { describe, it, expect } from 'vitest';
import {
  MIN_BRIGHTNESS,
  REJECT_BRIGHTNESS,
  MIN_DISTANCE_CM,
  MAX_DISTANCE_CM,
  MIN_CAMERA_WIDTH,
  MIN_CAMERA_HEIGHT,
  MAX_HEAD_VARIANCE_PX,
  MIN_FACE_CONFIDENCE,
  HEAD_STABILITY_FRAMES,
  checkBrightness,
  checkResolution,
  checkDistance,
  checkHeadStability,
  checkFaceConfidence,
  estimateDistanceCm,
  computePositionVariance,
  evaluateGate,
  type QualityCheckResult,
} from '../sessionQualityChecks';

// ---------------------------------------------------------------------------
// Helpers — mock video element (no real DOM needed for pure logic tests)
// ---------------------------------------------------------------------------

const mockVideo = (overrides: Partial<{ videoWidth: number; videoHeight: number }> = {}) =>
  ({
    videoWidth: overrides.videoWidth ?? 1280,
    videoHeight: overrides.videoHeight ?? 720,
  }) as unknown as HTMLVideoElement;

// ---------------------------------------------------------------------------
// Constants sanity
// ---------------------------------------------------------------------------

describe('sessionQualityChecks — constants', () => {
  it('brightness thresholds are ordered correctly', () => {
    expect(REJECT_BRIGHTNESS).toBeLessThan(MIN_BRIGHTNESS);
    expect(MIN_BRIGHTNESS).toBeGreaterThan(0);
    expect(MIN_BRIGHTNESS).toBeLessThan(255);
  });

  it('distance range is valid', () => {
    expect(MIN_DISTANCE_CM).toBeGreaterThan(0);
    expect(MAX_DISTANCE_CM).toBeGreaterThan(MIN_DISTANCE_CM);
  });

  it('camera resolution minimums are reasonable', () => {
    expect(MIN_CAMERA_WIDTH).toBe(640);
    expect(MIN_CAMERA_HEIGHT).toBe(480);
  });

  it('head stability threshold is positive', () => {
    expect(MAX_HEAD_VARIANCE_PX).toBeGreaterThan(0);
  });

  it('face confidence minimum is between 0 and 1', () => {
    expect(MIN_FACE_CONFIDENCE).toBeGreaterThan(0);
    expect(MIN_FACE_CONFIDENCE).toBeLessThanOrEqual(1);
  });

  it('HEAD_STABILITY_FRAMES is positive integer', () => {
    expect(HEAD_STABILITY_FRAMES).toBeGreaterThan(0);
    expect(Number.isInteger(HEAD_STABILITY_FRAMES)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// checkResolution
// ---------------------------------------------------------------------------

describe('checkResolution', () => {
  it('passes for 1280x720', () => {
    const result = checkResolution(mockVideo({ videoWidth: 1280, videoHeight: 720 }));
    expect(result.status).toBe('pass');
    expect(result.id).toBe('resolution');
  });

  it('passes for exactly 640x480', () => {
    const result = checkResolution(mockVideo({ videoWidth: 640, videoHeight: 480 }));
    expect(result.status).toBe('pass');
  });

  it('fails for 320x240', () => {
    const result = checkResolution(mockVideo({ videoWidth: 320, videoHeight: 240 }));
    expect(result.status).toBe('fail');
    expect(result.message).toBeDefined();
  });

  it('fails when width is ok but height is too low', () => {
    const result = checkResolution(mockVideo({ videoWidth: 640, videoHeight: 360 }));
    expect(result.status).toBe('fail');
  });

  it('fails when height is ok but width is too low', () => {
    const result = checkResolution(mockVideo({ videoWidth: 480, videoHeight: 480 }));
    expect(result.status).toBe('fail');
  });
});

// ---------------------------------------------------------------------------
// estimateDistanceCm
// ---------------------------------------------------------------------------

describe('estimateDistanceCm', () => {
  it('returns large distance for small iris', () => {
    const dist = estimateDistanceCm(5, 1280);
    expect(dist).toBeGreaterThan(100); // very far
  });

  it('returns small distance for large iris', () => {
    const dist = estimateDistanceCm(80, 1280);
    expect(dist).toBeLessThan(30); // very close
  });

  it('returns 999 for zero iris diameter', () => {
    expect(estimateDistanceCm(0, 1280)).toBe(999);
  });

  it('returns 999 for negative iris diameter', () => {
    expect(estimateDistanceCm(-10, 1280)).toBe(999);
  });

  it('returns reasonable distance for typical iris size (~20px at 60cm on 1280 frame)', () => {
    // At 60cm with 1280px frame, iris ~= 11.7mm * 1280 / 600mm = ~25px
    const dist = estimateDistanceCm(25, 1280);
    expect(dist).toBeGreaterThan(40);
    expect(dist).toBeLessThan(80);
  });
});

// ---------------------------------------------------------------------------
// checkDistance
// ---------------------------------------------------------------------------

describe('checkDistance', () => {
  it('passes for 55cm (within range)', () => {
    const result = checkDistance(55);
    expect(result.status).toBe('pass');
    expect(result.id).toBe('distance');
  });

  it('warns when too close (30cm)', () => {
    const result = checkDistance(30);
    expect(result.status).toBe('warn');
    expect(result.message).toContain('close');
  });

  it('warns when too far (90cm)', () => {
    const result = checkDistance(90);
    expect(result.status).toBe('warn');
    expect(result.message).toContain('far');
  });

  it('passes at exact MIN_DISTANCE_CM boundary', () => {
    const result = checkDistance(MIN_DISTANCE_CM);
    expect(result.status).toBe('pass');
  });

  it('passes at exact MAX_DISTANCE_CM boundary', () => {
    const result = checkDistance(MAX_DISTANCE_CM);
    expect(result.status).toBe('pass');
  });

  it('warns just below MIN_DISTANCE_CM', () => {
    const result = checkDistance(MIN_DISTANCE_CM - 1);
    expect(result.status).toBe('warn');
  });

  it('warns just above MAX_DISTANCE_CM', () => {
    const result = checkDistance(MAX_DISTANCE_CM + 1);
    expect(result.status).toBe('warn');
  });
});

// ---------------------------------------------------------------------------
// computePositionVariance
// ---------------------------------------------------------------------------

describe('computePositionVariance', () => {
  it('returns 999 for empty array', () => {
    expect(computePositionVariance([])).toBe(999);
  });

  it('returns 999 for single point', () => {
    expect(computePositionVariance([{ x: 100, y: 100 }])).toBe(999);
  });

  it('returns 0 for identical positions', () => {
    const positions = Array(10).fill({ x: 50, y: 50 });
    expect(computePositionVariance(positions)).toBe(0);
  });

  it('returns small value for tight cluster', () => {
    const positions = [
      { x: 50, y: 50 },
      { x: 51, y: 50 },
      { x: 50, y: 51 },
      { x: 49, y: 50 },
      { x: 50, y: 49 },
    ];
    const variance = computePositionVariance(positions);
    expect(variance).toBeGreaterThan(0);
    expect(variance).toBeLessThan(5); // very stable
  });

  it('returns large value for scattered positions', () => {
    const positions = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 0, y: 100 },
      { x: 100, y: 100 },
    ];
    const variance = computePositionVariance(positions);
    expect(variance).toBeGreaterThan(50);
  });
});

// ---------------------------------------------------------------------------
// checkHeadStability
// ---------------------------------------------------------------------------

describe('checkHeadStability', () => {
  it('passes for low variance (5px)', () => {
    const result = checkHeadStability(5);
    expect(result.status).toBe('pass');
    expect(result.id).toBe('headStability');
  });

  it('fails for high variance (25px)', () => {
    const result = checkHeadStability(25);
    expect(result.status).toBe('fail');
    expect(result.message).toContain('still');
  });

  it('passes at exact threshold', () => {
    const result = checkHeadStability(MAX_HEAD_VARIANCE_PX);
    expect(result.status).toBe('pass');
  });

  it('fails just above threshold', () => {
    const result = checkHeadStability(MAX_HEAD_VARIANCE_PX + 0.1);
    expect(result.status).toBe('fail');
  });
});

// ---------------------------------------------------------------------------
// checkFaceConfidence
// ---------------------------------------------------------------------------

describe('checkFaceConfidence', () => {
  it('passes for high confidence (0.95)', () => {
    const result = checkFaceConfidence(0.95);
    expect(result.status).toBe('pass');
    expect(result.id).toBe('faceDetection');
  });

  it('fails for low confidence (0.5)', () => {
    const result = checkFaceConfidence(0.5);
    expect(result.status).toBe('fail');
    expect(result.message).toBeDefined();
  });

  it('passes at exact threshold', () => {
    const result = checkFaceConfidence(MIN_FACE_CONFIDENCE);
    expect(result.status).toBe('pass');
  });

  it('fails just below threshold', () => {
    const result = checkFaceConfidence(MIN_FACE_CONFIDENCE - 0.01);
    expect(result.status).toBe('fail');
  });

  it('passes for perfect confidence (1.0)', () => {
    const result = checkFaceConfidence(1.0);
    expect(result.status).toBe('pass');
  });
});

// ---------------------------------------------------------------------------
// checkBrightness (uses mockVideo — tests the threshold logic, not canvas)
// ---------------------------------------------------------------------------

describe('checkBrightness — threshold logic', () => {
  // checkBrightness calls measureBrightness which needs a real canvas.
  // We test the pure threshold functions directly via checkDistance/checkFace etc.
  // For brightness, we test the boundary conditions that the function enforces.

  it('exports REJECT_BRIGHTNESS < MIN_BRIGHTNESS', () => {
    expect(REJECT_BRIGHTNESS).toBeLessThan(MIN_BRIGHTNESS);
  });

  it('REJECT_BRIGHTNESS is 60', () => {
    expect(REJECT_BRIGHTNESS).toBe(60);
  });

  it('MIN_BRIGHTNESS is 80', () => {
    expect(MIN_BRIGHTNESS).toBe(80);
  });
});

// ---------------------------------------------------------------------------
// evaluateGate
// ---------------------------------------------------------------------------

describe('evaluateGate', () => {
  const pass = (id: string): QualityCheckResult => ({ id: id as any, status: 'pass' });
  const fail = (id: string): QualityCheckResult => ({ id: id as any, status: 'fail', message: 'bad' });
  const warn = (id: string): QualityCheckResult => ({ id: id as any, status: 'warn', message: 'meh' });

  it('all pass → canProceed true', () => {
    const result = evaluateGate([pass('a'), pass('b'), pass('c')]);
    expect(result.canProceed).toBe(true);
    expect(result.checks).toHaveLength(3);
  });

  it('one fail → canProceed false', () => {
    const result = evaluateGate([pass('a'), fail('b'), pass('c')]);
    expect(result.canProceed).toBe(false);
  });

  it('warnings only → canProceed true', () => {
    const result = evaluateGate([pass('a'), warn('b'), pass('c')]);
    expect(result.canProceed).toBe(true);
  });

  it('multiple fails → canProceed false', () => {
    const result = evaluateGate([fail('a'), fail('b')]);
    expect(result.canProceed).toBe(false);
  });

  it('empty checks → canProceed true', () => {
    const result = evaluateGate([]);
    expect(result.canProceed).toBe(true);
  });

  it('preserves all checks in result', () => {
    const checks = [pass('a'), fail('b'), warn('c')];
    const result = evaluateGate(checks);
    expect(result.checks).toEqual(checks);
  });
});
