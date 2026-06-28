/**
 * Calibration Store — persists eye tracking calibration data in localStorage.
 *
 * Allows reuse of calibration across consecutive ET modules and page reloads,
 * validated by TTL and device fingerprint (resolution + userAgent hash).
 *
 * Pure functions — no side effects beyond localStorage reads/writes.
 */

import type { HybridCalibrationResidual } from './hybridCalibrationField';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StoredCalibration {
  readonly residuals: HybridCalibrationResidual[];
  readonly rmsePx: number;
  readonly timestamp: number;
  readonly deviceFingerprint: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const CALIBRATION_STORE_KEY = 'emotiox-et-calibration-v2';

/** Default TTL: 30 minutes (vs 2 min in v1 sessionStorage). */
export const CALIBRATION_TTL_MS = 30 * 60 * 1000;

// ---------------------------------------------------------------------------
// Device fingerprint
// ---------------------------------------------------------------------------

/**
 * Simple fingerprint: screen resolution + userAgent hash.
 * Calibration depends on camera/screen geometry — different device = invalid.
 */
export function buildDeviceFingerprint(): string {
  const w = typeof screen !== 'undefined' ? screen.width : 0;
  const h = typeof screen !== 'undefined' ? screen.height : 0;
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  return `${w}x${h}:${simpleHash(ua)}`;
}

/** djb2 string hash — fast, deterministic, no crypto needed. */
const simpleHash = (s: string): number => {
  let hash = 5381;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash + s.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
};

// ---------------------------------------------------------------------------
// Store operations
// ---------------------------------------------------------------------------

/**
 * Save calibration data to localStorage.
 */
export function saveCalibration(
  residuals: readonly HybridCalibrationResidual[],
  rmsePx: number,
): void {
  const data: StoredCalibration = {
    residuals: [...residuals],
    rmsePx,
    timestamp: Date.now(),
    deviceFingerprint: buildDeviceFingerprint(),
  };
  try {
    localStorage.setItem(CALIBRATION_STORE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable — silent fail, calibration will re-run
  }
}

/**
 * Load calibration from localStorage.
 * Returns null when: missing, expired, different device, or corrupt.
 *
 * @param ttlMs — maximum age in milliseconds (default CALIBRATION_TTL_MS)
 */
export function loadCalibration(ttlMs = CALIBRATION_TTL_MS): StoredCalibration | null {
  try {
    const raw = localStorage.getItem(CALIBRATION_STORE_KEY);
    return raw ? validateStored(JSON.parse(raw), ttlMs) : null;
  } catch {
    return null;
  }
}

/**
 * Remove stored calibration.
 */
export function clearCalibration(): void {
  try {
    localStorage.removeItem(CALIBRATION_STORE_KEY);
  } catch {
    // silent
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const validateStored = (data: unknown, ttlMs: number): StoredCalibration | null => {
  const isObject = typeof data === 'object' && data !== null;
  return isObject ? validateFields(data as Record<string, unknown>, ttlMs) : null;
};

const validateFields = (obj: Record<string, unknown>, ttlMs: number): StoredCalibration | null => {
  const residuals = obj.residuals;
  const rmsePx = obj.rmsePx;
  const timestamp = obj.timestamp;
  const fingerprint = obj.deviceFingerprint;

  const hasValidShape =
    Array.isArray(residuals) &&
    typeof rmsePx === 'number' &&
    typeof timestamp === 'number' &&
    typeof fingerprint === 'string';

  return hasValidShape
    ? checkConstraints(
        residuals as HybridCalibrationResidual[],
        rmsePx as number,
        timestamp as number,
        fingerprint as string,
        ttlMs,
      )
    : null;
};

const checkConstraints = (
  residuals: HybridCalibrationResidual[],
  rmsePx: number,
  timestamp: number,
  fingerprint: string,
  ttlMs: number,
): StoredCalibration | null => {
  const isExpired = Date.now() - timestamp > ttlMs;
  const isDifferentDevice = fingerprint !== buildDeviceFingerprint();
  const isEmpty = residuals.length === 0;

  return (isExpired || isDifferentDevice || isEmpty)
    ? null
    : { residuals, rmsePx, timestamp, deviceFingerprint: fingerprint };
};
