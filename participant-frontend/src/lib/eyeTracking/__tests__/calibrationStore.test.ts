import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { HybridCalibrationResidual } from '../hybridCalibrationField';
import {
  saveCalibration,
  loadCalibration,
  clearCalibration,
  buildDeviceFingerprint,
  CALIBRATION_STORE_KEY,
  CALIBRATION_TTL_MS,
} from '../calibrationStore';

// ---------------------------------------------------------------------------
// localStorage mock
// ---------------------------------------------------------------------------

let mockStorage: Map<string, string>;

beforeEach(() => {
  mockStorage = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => mockStorage.get(k) ?? null,
    setItem: (k: string, v: string) => { mockStorage.set(k, v); },
    removeItem: (k: string) => { mockStorage.delete(k); },
  });
  vi.stubGlobal('screen', { width: 1920, height: 1080 });
  vi.stubGlobal('navigator', { userAgent: 'test-ua-vitest' });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeResiduals = (n = 3): HybridCalibrationResidual[] =>
  Array.from({ length: n }, (_, i) => ({
    u: i * 0.25,
    v: i * 0.25,
    dx: i * 2,
    dy: i * 3,
  }));

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('calibrationStore constants', () => {
  it('CALIBRATION_STORE_KEY is emotiox-et-calibration-v2', () => {
    expect(CALIBRATION_STORE_KEY).toBe('emotiox-et-calibration-v2');
  });

  it('CALIBRATION_TTL_MS is 30 minutes', () => {
    expect(CALIBRATION_TTL_MS).toBe(30 * 60 * 1000);
  });
});

// ---------------------------------------------------------------------------
// buildDeviceFingerprint
// ---------------------------------------------------------------------------

describe('buildDeviceFingerprint', () => {
  it('returns deterministic result for same environment', () => {
    const fp1 = buildDeviceFingerprint();
    const fp2 = buildDeviceFingerprint();
    expect(fp1).toBe(fp2);
  });

  it('uses screen dimensions', () => {
    const fp1 = buildDeviceFingerprint();
    expect(fp1).toContain('1920x1080');
  });

  it('changes when screen changes', () => {
    const fp1 = buildDeviceFingerprint();
    vi.stubGlobal('screen', { width: 1280, height: 720 });
    const fp2 = buildDeviceFingerprint();
    expect(fp1).not.toBe(fp2);
  });

  it('changes when userAgent changes', () => {
    const fp1 = buildDeviceFingerprint();
    vi.stubGlobal('navigator', { userAgent: 'different-ua' });
    const fp2 = buildDeviceFingerprint();
    expect(fp1).not.toBe(fp2);
  });

  it('format is WxH:hash', () => {
    const fp = buildDeviceFingerprint();
    expect(fp).toMatch(/^\d+x\d+:\d+$/);
  });

  it('handles missing screen gracefully', () => {
    vi.stubGlobal('screen', undefined);
    const fp = buildDeviceFingerprint();
    expect(fp).toContain('0x0');
  });

  it('handles missing navigator gracefully', () => {
    vi.stubGlobal('navigator', undefined);
    const fp = buildDeviceFingerprint();
    // Empty UA string hashed => some number
    expect(fp).toMatch(/^\d+x\d+:\d+$/);
  });
});

// ---------------------------------------------------------------------------
// saveCalibration + loadCalibration round-trip
// ---------------------------------------------------------------------------

describe('saveCalibration + loadCalibration', () => {
  it('round-trip stores and retrieves data', () => {
    const residuals = makeResiduals(4);
    saveCalibration(residuals, 12.5);
    const loaded = loadCalibration();
    expect(loaded).not.toBeNull();
    expect(loaded!.residuals).toEqual(residuals);
    expect(loaded!.rmsePx).toBe(12.5);
    expect(loaded!.deviceFingerprint).toBe(buildDeviceFingerprint());
    expect(typeof loaded!.timestamp).toBe('number');
  });

  it('stores under CALIBRATION_STORE_KEY', () => {
    saveCalibration(makeResiduals(), 5);
    expect(mockStorage.has(CALIBRATION_STORE_KEY)).toBe(true);
  });

  it('stored data is valid JSON', () => {
    saveCalibration(makeResiduals(), 5);
    const raw = mockStorage.get(CALIBRATION_STORE_KEY)!;
    expect(() => JSON.parse(raw)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// loadCalibration edge cases
// ---------------------------------------------------------------------------

describe('loadCalibration', () => {
  it('no stored data returns null', () => {
    expect(loadCalibration()).toBeNull();
  });

  it('expired data returns null', () => {
    saveCalibration(makeResiduals(), 5);
    // Manually set timestamp to past
    const raw = JSON.parse(mockStorage.get(CALIBRATION_STORE_KEY)!);
    raw.timestamp = Date.now() - CALIBRATION_TTL_MS - 1000;
    mockStorage.set(CALIBRATION_STORE_KEY, JSON.stringify(raw));
    expect(loadCalibration()).toBeNull();
  });

  it('different device fingerprint returns null', () => {
    saveCalibration(makeResiduals(), 5);
    // Change screen -> different fingerprint
    vi.stubGlobal('screen', { width: 3840, height: 2160 });
    expect(loadCalibration()).toBeNull();
  });

  it('empty residuals array returns null', () => {
    saveCalibration([], 0);
    expect(loadCalibration()).toBeNull();
  });

  it('corrupt JSON in storage returns null (no throw)', () => {
    mockStorage.set(CALIBRATION_STORE_KEY, '{not valid json!!!');
    expect(() => loadCalibration()).not.toThrow();
    expect(loadCalibration()).toBeNull();
  });

  it('non-object value returns null', () => {
    mockStorage.set(CALIBRATION_STORE_KEY, '"just a string"');
    expect(loadCalibration()).toBeNull();
  });

  it('null stored returns null', () => {
    mockStorage.set(CALIBRATION_STORE_KEY, 'null');
    expect(loadCalibration()).toBeNull();
  });

  it('missing fields returns null', () => {
    mockStorage.set(CALIBRATION_STORE_KEY, JSON.stringify({ residuals: [] }));
    expect(loadCalibration()).toBeNull();
  });

  it('wrong field types returns null', () => {
    mockStorage.set(CALIBRATION_STORE_KEY, JSON.stringify({
      residuals: 'not-an-array',
      rmsePx: 5,
      timestamp: Date.now(),
      deviceFingerprint: buildDeviceFingerprint(),
    }));
    expect(loadCalibration()).toBeNull();
  });

  it('custom TTL works — short TTL expires recent data', () => {
    saveCalibration(makeResiduals(), 5);
    // Data was just saved, default TTL passes but custom 0ms TTL should fail
    // Slight race: timestamp = Date.now(), so even 1ms later it might be > 0
    const raw = JSON.parse(mockStorage.get(CALIBRATION_STORE_KEY)!);
    raw.timestamp = Date.now() - 10;
    mockStorage.set(CALIBRATION_STORE_KEY, JSON.stringify(raw));
    expect(loadCalibration(5)).toBeNull(); // 5ms TTL, data is 10ms old
  });

  it('custom TTL — long TTL accepts old data', () => {
    saveCalibration(makeResiduals(), 5);
    const raw = JSON.parse(mockStorage.get(CALIBRATION_STORE_KEY)!);
    raw.timestamp = Date.now() - 60_000; // 1 minute ago
    mockStorage.set(CALIBRATION_STORE_KEY, JSON.stringify(raw));
    // Default TTL (30min) should still accept it
    expect(loadCalibration()).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// clearCalibration
// ---------------------------------------------------------------------------

describe('clearCalibration', () => {
  it('removes stored data', () => {
    saveCalibration(makeResiduals(), 5);
    expect(loadCalibration()).not.toBeNull();
    clearCalibration();
    expect(loadCalibration()).toBeNull();
  });

  it('no-op when nothing stored', () => {
    expect(() => clearCalibration()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe('error handling', () => {
  it('saveCalibration silently fails when localStorage throws on setItem', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => { throw new Error('QuotaExceeded'); },
      removeItem: () => {},
    });
    expect(() => saveCalibration(makeResiduals(), 5)).not.toThrow();
  });

  it('loadCalibration silently fails when localStorage throws on getItem', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('SecurityError'); },
      setItem: () => {},
      removeItem: () => {},
    });
    expect(() => loadCalibration()).not.toThrow();
    expect(loadCalibration()).toBeNull();
  });

  it('clearCalibration silently fails when localStorage throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => { throw new Error('SecurityError'); },
    });
    expect(() => clearCalibration()).not.toThrow();
  });
});
