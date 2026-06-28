import { describe, it, expect, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock localStorage (jsdom may not provide it in all configs)
// ---------------------------------------------------------------------------
const store = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => { store.set(key, value); },
  removeItem: (key: string) => { store.delete(key); },
  clear: () => { store.clear(); },
  get length() { return store.size; },
  key: (i: number) => [...store.keys()][i] ?? null,
};
Object.defineProperty(globalThis, 'localStorage', { value: mockLocalStorage, writable: true });

import {
  saveCalibration,
  loadCalibration,
  clearCalibration,
  buildDeviceFingerprint,
  CALIBRATION_STORE_KEY,
  CALIBRATION_TTL_MS,
} from '../calibrationStore';
import {
  detectDeficientPoints,
  recalibratePartial,
  computePointErrors,
  hybridCalibrationRmsePx,
  type HybridCalibrationResidual,
} from '../hybridCalibrationField';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const residual = (u: number, v: number, dx: number, dy: number): HybridCalibrationResidual => ({
  u, v, dx, dy,
});

/** 13-point calibration with mostly good residuals and some bad ones. */
const makeResiduals = (badIndices: number[] = [], badMagnitude = 100): HybridCalibrationResidual[] => {
  const base: HybridCalibrationResidual[] = [];
  for (let i = 0; i < 13; i++) {
    const u = (i % 4) * 0.33;
    const v = Math.floor(i / 4) * 0.33;
    const isBad = badIndices.includes(i);
    const mag = isBad ? badMagnitude : 10 + Math.random() * 5;
    base.push(residual(u, v, mag * 0.7, mag * 0.7));
  }
  return base;
};

/** Uniform residuals with identical error. */
const uniformResiduals = (count: number, dx: number, dy: number): HybridCalibrationResidual[] =>
  Array.from({ length: count }, (_, i) => residual(i / count, 0.5, dx, dy));

// ---------------------------------------------------------------------------
// CalibrationStore — save/load round-trip
// ---------------------------------------------------------------------------

describe('CalibrationStore — save/load', () => {
  beforeEach(() => store.clear());

  it('save + load round-trip preserves residuals and RMSE', () => {
    const residuals = [residual(0.1, 0.2, 5, -3), residual(0.8, 0.7, -2, 4)];
    saveCalibration(residuals, 42.5);

    const loaded = loadCalibration();
    expect(loaded).not.toBeNull();
    expect(loaded!.residuals).toEqual(residuals);
    expect(loaded!.rmsePx).toBe(42.5);
  });

  it('saved data includes device fingerprint', () => {
    saveCalibration([residual(0, 0, 1, 1)], 10);
    const loaded = loadCalibration();
    expect(loaded!.deviceFingerprint).toBe(buildDeviceFingerprint());
  });

  it('saved data includes timestamp', () => {
    const before = Date.now();
    saveCalibration([residual(0, 0, 1, 1)], 10);
    const after = Date.now();

    const loaded = loadCalibration();
    expect(loaded!.timestamp).toBeGreaterThanOrEqual(before);
    expect(loaded!.timestamp).toBeLessThanOrEqual(after);
  });

  it('multiple saves → last wins', () => {
    saveCalibration([residual(0, 0, 1, 1)], 10);
    saveCalibration([residual(0.5, 0.5, 2, 2)], 20);

    const loaded = loadCalibration();
    expect(loaded!.rmsePx).toBe(20);
    expect(loaded!.residuals).toHaveLength(1);
  });

  it('load returns null when nothing saved', () => {
    expect(loadCalibration()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// CalibrationStore — TTL expiry
// ---------------------------------------------------------------------------

describe('CalibrationStore — TTL', () => {
  beforeEach(() => store.clear());

  it('returns data within TTL', () => {
    saveCalibration([residual(0, 0, 1, 1)], 10);
    // Immediately loading — well within TTL
    expect(loadCalibration()).not.toBeNull();
  });

  it('returns null when TTL expired', () => {
    saveCalibration([residual(0, 0, 1, 1)], 10);

    // Manually set old timestamp
    const raw = JSON.parse(localStorage.getItem(CALIBRATION_STORE_KEY)!);
    raw.timestamp = Date.now() - CALIBRATION_TTL_MS - 1000;
    localStorage.setItem(CALIBRATION_STORE_KEY, JSON.stringify(raw));

    expect(loadCalibration()).toBeNull();
  });

  it('custom TTL is respected', () => {
    saveCalibration([residual(0, 0, 1, 1)], 10);

    const raw = JSON.parse(localStorage.getItem(CALIBRATION_STORE_KEY)!);
    raw.timestamp = Date.now() - 5000; // 5 seconds ago
    localStorage.setItem(CALIBRATION_STORE_KEY, JSON.stringify(raw));

    // 10s TTL → still valid
    expect(loadCalibration(10_000)).not.toBeNull();
    // 3s TTL → expired
    expect(loadCalibration(3_000)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// CalibrationStore — device fingerprint
// ---------------------------------------------------------------------------

describe('CalibrationStore — device fingerprint', () => {
  beforeEach(() => store.clear());

  it('same device → data returned', () => {
    saveCalibration([residual(0, 0, 1, 1)], 10);
    expect(loadCalibration()).not.toBeNull();
  });

  it('different device fingerprint → null', () => {
    saveCalibration([residual(0, 0, 1, 1)], 10);

    // Tamper fingerprint
    const raw = JSON.parse(localStorage.getItem(CALIBRATION_STORE_KEY)!);
    raw.deviceFingerprint = 'different-device-3840x2160:99999';
    localStorage.setItem(CALIBRATION_STORE_KEY, JSON.stringify(raw));

    expect(loadCalibration()).toBeNull();
  });

  it('fingerprint is deterministic', () => {
    const fp1 = buildDeviceFingerprint();
    const fp2 = buildDeviceFingerprint();
    expect(fp1).toBe(fp2);
  });

  it('fingerprint contains resolution', () => {
    const fp = buildDeviceFingerprint();
    expect(fp).toContain('x');
    expect(fp).toContain(':');
  });
});

// ---------------------------------------------------------------------------
// CalibrationStore — corrupt data
// ---------------------------------------------------------------------------

describe('CalibrationStore — corrupt data handling', () => {
  beforeEach(() => store.clear());

  it('non-JSON string → null', () => {
    localStorage.setItem(CALIBRATION_STORE_KEY, 'not json at all');
    expect(loadCalibration()).toBeNull();
  });

  it('JSON array instead of object → null', () => {
    localStorage.setItem(CALIBRATION_STORE_KEY, '[1,2,3]');
    expect(loadCalibration()).toBeNull();
  });

  it('missing residuals field → null', () => {
    localStorage.setItem(CALIBRATION_STORE_KEY, JSON.stringify({
      rmsePx: 10, timestamp: Date.now(), deviceFingerprint: buildDeviceFingerprint(),
    }));
    expect(loadCalibration()).toBeNull();
  });

  it('missing rmsePx field → null', () => {
    localStorage.setItem(CALIBRATION_STORE_KEY, JSON.stringify({
      residuals: [{ u: 0, v: 0, dx: 1, dy: 1 }],
      timestamp: Date.now(), deviceFingerprint: buildDeviceFingerprint(),
    }));
    expect(loadCalibration()).toBeNull();
  });

  it('empty residuals array → null', () => {
    localStorage.setItem(CALIBRATION_STORE_KEY, JSON.stringify({
      residuals: [], rmsePx: 0,
      timestamp: Date.now(), deviceFingerprint: buildDeviceFingerprint(),
    }));
    expect(loadCalibration()).toBeNull();
  });

  it('null value in localStorage → null', () => {
    // localStorage.getItem returns null for missing keys
    localStorage.removeItem(CALIBRATION_STORE_KEY);
    expect(loadCalibration()).toBeNull();
  });

  it('JSON null → null', () => {
    localStorage.setItem(CALIBRATION_STORE_KEY, 'null');
    expect(loadCalibration()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// CalibrationStore — clear
// ---------------------------------------------------------------------------

describe('CalibrationStore — clear', () => {
  beforeEach(() => store.clear());

  it('clear removes stored data', () => {
    saveCalibration([residual(0, 0, 1, 1)], 10);
    clearCalibration();
    expect(loadCalibration()).toBeNull();
  });

  it('clear on empty store is safe', () => {
    expect(() => clearCalibration()).not.toThrow();
  });

  it('double clear is safe', () => {
    saveCalibration([residual(0, 0, 1, 1)], 10);
    clearCalibration();
    expect(() => clearCalibration()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// CalibrationStore — immutability
// ---------------------------------------------------------------------------

describe('CalibrationStore — immutability', () => {
  beforeEach(() => store.clear());

  it('modifying loaded residuals does not affect stored data', () => {
    const original = [residual(0.1, 0.2, 5, 3)];
    saveCalibration(original, 10);

    const loaded1 = loadCalibration()!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (loaded1.residuals as any).push(residual(0.9, 0.9, 99, 99));

    const loaded2 = loadCalibration()!;
    expect(loaded2.residuals).toHaveLength(1);
  });

  it('modifying input residuals after save does not affect stored data', () => {
    const input = [residual(0, 0, 5, 5)];
    saveCalibration(input, 10);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (input as any).push(residual(1, 1, 99, 99));

    const loaded = loadCalibration()!;
    expect(loaded.residuals).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// computePointErrors
// ---------------------------------------------------------------------------

describe('computePointErrors', () => {
  it('computes magnitude of each residual', () => {
    const residuals = [residual(0, 0, 3, 4), residual(0.5, 0.5, 0, 5)];
    const errors = computePointErrors(residuals);
    expect(errors[0].errorPx).toBeCloseTo(5, 5);  // sqrt(9+16)
    expect(errors[1].errorPx).toBeCloseTo(5, 5);  // sqrt(0+25)
  });

  it('preserves indices', () => {
    const residuals = [residual(0, 0, 1, 0), residual(0, 0, 0, 2), residual(0, 0, 3, 0)];
    const errors = computePointErrors(residuals);
    expect(errors.map((e) => e.index)).toEqual([0, 1, 2]);
  });

  it('empty input → empty output', () => {
    expect(computePointErrors([])).toEqual([]);
  });

  it('zero residuals → zero error', () => {
    const errors = computePointErrors([residual(0.5, 0.5, 0, 0)]);
    expect(errors[0].errorPx).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// detectDeficientPoints
// ---------------------------------------------------------------------------

describe('detectDeficientPoints', () => {
  it('returns empty for fewer than 3 residuals', () => {
    expect(detectDeficientPoints([residual(0, 0, 100, 0)])).toEqual([]);
    expect(detectDeficientPoints([
      residual(0, 0, 100, 0),
      residual(0.5, 0.5, 1, 0),
    ])).toEqual([]);
  });

  it('returns empty when all points have similar error', () => {
    const uniform = uniformResiduals(13, 10, 10);
    expect(detectDeficientPoints(uniform)).toEqual([]);
  });

  it('identifies single outlier point', () => {
    // 12 points with error ~14.14px, 1 point with error ~141.4px
    const residuals = uniformResiduals(12, 10, 10);
    residuals.push(residual(0.9, 0.5, 100, 100));

    const deficient = detectDeficientPoints(residuals);
    expect(deficient).toContain(12); // last point is the outlier
    expect(deficient).toHaveLength(1);
  });

  it('identifies multiple outlier points', () => {
    const residuals = uniformResiduals(10, 5, 5); // error ~7.07px each
    // Replace two with high error
    residuals[2] = residual(0.2, 0.5, 80, 80);
    residuals[7] = residual(0.7, 0.5, 90, 90);

    const deficient = detectDeficientPoints(residuals);
    expect(deficient).toContain(2);
    expect(deficient).toContain(7);
  });

  it('respects custom factor', () => {
    // With factor 1.0, even slightly above median triggers
    const residuals = [
      residual(0, 0, 10, 0),   // error 10
      residual(0, 0, 10, 0),   // error 10
      residual(0, 0, 10, 0),   // error 10
      residual(0, 0, 11, 0),   // error 11 — just above median × 1.0
    ];
    const strict = detectDeficientPoints(residuals, 1.0);
    expect(strict).toContain(3);

    // With high factor, same point is acceptable
    const lenient = detectDeficientPoints(residuals, 2.0);
    expect(lenient).toEqual([]);
  });

  it('returns empty for all-zero residuals', () => {
    const zeros = uniformResiduals(5, 0, 0);
    // Median is 0, threshold is 0 × factor = 0, all errors = 0 → none above 0
    expect(detectDeficientPoints(zeros)).toEqual([]);
  });

  it('all points deficient → returns all indices', () => {
    // When factor < 1, even median points are "deficient"
    const residuals = [
      residual(0, 0, 10, 0),
      residual(0, 0, 20, 0),
      residual(0, 0, 30, 0),
    ];
    // Median error = 20, factor 0.3 → threshold = 6 → all above
    const deficient = detectDeficientPoints(residuals, 0.3);
    expect(deficient).toHaveLength(3);
  });

  it('deficient indices are valid indices into original array', () => {
    const residuals = makeResiduals([3, 9], 200);
    const deficient = detectDeficientPoints(residuals);
    deficient.forEach((idx) => {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(residuals.length);
    });
  });
});

// ---------------------------------------------------------------------------
// recalibratePartial
// ---------------------------------------------------------------------------

describe('recalibratePartial', () => {
  it('replaces only deficient indices', () => {
    const original = [
      residual(0, 0, 10, 10),  // good
      residual(0.3, 0, 80, 80), // bad → replace
      residual(0.6, 0, 10, 10), // good
      residual(0.9, 0, 90, 90), // bad → replace
    ];
    const newPartial = [
      residual(0.3, 0, 5, 5),  // replacement for index 1
      residual(0.9, 0, 3, 3),  // replacement for index 3
    ];
    const deficient = [1, 3];

    const result = recalibratePartial(original, newPartial, deficient);
    expect(result).toHaveLength(4);
    expect(result[0]).toEqual(original[0]); // preserved
    expect(result[1]).toEqual(newPartial[0]); // replaced
    expect(result[2]).toEqual(original[2]); // preserved
    expect(result[3]).toEqual(newPartial[1]); // replaced
  });

  it('preserves non-deficient residuals exactly', () => {
    const original = uniformResiduals(5, 10, 10);
    const result = recalibratePartial(original, [residual(0, 0, 1, 1)], [2]);
    expect(result[0]).toEqual(original[0]);
    expect(result[1]).toEqual(original[1]);
    expect(result[3]).toEqual(original[3]);
    expect(result[4]).toEqual(original[4]);
  });

  it('returns copy of original when no deficient indices', () => {
    const original = uniformResiduals(5, 10, 10);
    const result = recalibratePartial(original, [], []);
    expect(result).toEqual([...original]);
  });

  it('RMSE improves after partial recalibration', () => {
    const original = [
      residual(0, 0, 5, 5),     // good: error ~7.07
      residual(0.5, 0, 100, 0), // bad:  error 100
      residual(1, 0, 5, 5),     // good: error ~7.07
    ];
    const rmseBefore = hybridCalibrationRmsePx(original);

    const recalibrated = recalibratePartial(
      original,
      [residual(0.5, 0, 3, 3)], // much better replacement
      [1],
    );
    const rmseAfter = hybridCalibrationRmsePx(recalibrated);

    expect(rmseAfter).toBeLessThan(rmseBefore);
  });

  it('does not mutate original array', () => {
    const original = uniformResiduals(3, 10, 10);
    const frozen = [...original];
    recalibratePartial(original, [residual(0, 0, 1, 1)], [1]);
    expect(original).toEqual(frozen);
  });

  it('handles deficient indices beyond newPartial length gracefully', () => {
    const original = uniformResiduals(5, 10, 10);
    // 3 deficient but only 1 replacement → only first deficient gets replaced
    const result = recalibratePartial(
      original,
      [residual(0, 0, 1, 1)],
      [0, 2, 4],
    );
    expect(result[0]).toEqual(residual(0, 0, 1, 1)); // replaced
    expect(result[2]).toEqual(original[2]); // not enough replacements → preserved
    expect(result[4]).toEqual(original[4]); // preserved
  });

  it('result length matches original length', () => {
    const original = uniformResiduals(13, 10, 10);
    const deficient = [2, 5, 11];
    const newPartial = deficient.map((i) => residual(i / 13, 0.5, 1, 1));
    const result = recalibratePartial(original, newPartial, deficient);
    expect(result).toHaveLength(13);
  });
});

// ---------------------------------------------------------------------------
// Integration: detect → recalibrate → verify improvement
// ---------------------------------------------------------------------------

describe('Calibration — detect → recalibrate → verify', () => {
  it('full pipeline: detect bad points, replace, RMSE drops', () => {
    const original = makeResiduals([3, 9], 200);
    const rmseBefore = hybridCalibrationRmsePx(original);

    const deficient = detectDeficientPoints(original);
    expect(deficient.length).toBeGreaterThan(0);
    expect(deficient).toContain(3);
    expect(deficient).toContain(9);

    // Simulate recalibration of deficient points with better measurements
    const newMeasurements = deficient.map((i) => {
      const r = original[i];
      return residual(r.u, r.v, 5, 5); // much smaller error
    });

    const recalibrated = recalibratePartial(original, newMeasurements, deficient);
    const rmseAfter = hybridCalibrationRmsePx(recalibrated);

    expect(rmseAfter).toBeLessThan(rmseBefore);
  });

  it('no deficient points → recalibration is a no-op', () => {
    const uniform = uniformResiduals(13, 10, 10);
    const deficient = detectDeficientPoints(uniform);
    expect(deficient).toEqual([]);

    const result = recalibratePartial(uniform, [], []);
    expect(result).toEqual([...uniform]);
  });

  it('store → load → detect → recalibrate → store cycle', () => {
    localStorage.removeItem(CALIBRATION_STORE_KEY);

    const original = makeResiduals([5], 150);
    const rmseBefore = hybridCalibrationRmsePx(original);
    saveCalibration(original, rmseBefore);

    const loaded = loadCalibration()!;
    expect(loaded).not.toBeNull();

    const deficient = detectDeficientPoints(loaded.residuals);
    expect(deficient).toContain(5);

    const newMeasurements = deficient.map((i) => {
      const r = loaded.residuals[i];
      return residual(r.u, r.v, 3, 3);
    });

    const recalibrated = recalibratePartial(loaded.residuals, newMeasurements, deficient);
    const rmseAfter = hybridCalibrationRmsePx(recalibrated);

    saveCalibration(recalibrated, rmseAfter);

    const reloaded = loadCalibration()!;
    expect(reloaded.rmsePx).toBeLessThan(rmseBefore);
    expect(reloaded.residuals).toHaveLength(original.length);

    localStorage.removeItem(CALIBRATION_STORE_KEY);
  });
});
