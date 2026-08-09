/**
 * Device Profile — tuning parameters for zone-based eye tracking per device type.
 *
 * Desktop prioritizes precision (smaller uncertainty, faster hysteresis).
 * Mobile/tablet prioritizes stability (larger uncertainty, slower hysteresis).
 *
 * Pure functions — no side effects beyond navigator.userAgent read.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DeviceType = 'desktop' | 'tablet' | 'mobile';

export interface DeviceProfile {
  readonly deviceType: DeviceType;
  /** Uncertainty radius in pixels for zone classifier. */
  readonly uncertaintyRadius: number;
  /** Milliseconds candidate zone must hold before switching. */
  readonly hysteresisMs: number;
  /** Minimum confidence from zone classifier to accept a zone. */
  readonly minConfidence: number;
  /** Whether gaze tracking is available (false = click-proxy only). */
  readonly hasGazeTracking: boolean;
  /** Head pose compensation gain multiplier (higher = more correction). */
  readonly headPoseGainMultiplier: number;
  /** Max acceptable RMSE (px) after calibration validation. */
  readonly maxCalibrationRmsePx: number;
  /** Max RMSE (px) before hard-reject (after retries). */
  readonly rejectCalibrationRmsePx: number;
  /** Gaze poll interval during stimulus (ms). Lower = more samples. */
  readonly gazeCollectIntervalMs: number;
  /** Require fullscreen during calibration + stimulus. */
  readonly requireFullscreen: boolean;
  /** Require landscape orientation. */
  readonly requireLandscape: boolean;
  /** Max seconds face can be lost before pausing stimulus. */
  readonly faceLostPauseThresholdS: number;
  /** Head pose drift (degrees) that triggers micro-recalibration. */
  readonly headPoseDriftThresholdDeg: number;
}

// ---------------------------------------------------------------------------
// Profile definitions
// ---------------------------------------------------------------------------

const PROFILES: Record<DeviceType, Omit<DeviceProfile, 'deviceType'>> = {
  desktop: {
    uncertaintyRadius: 300,
    hysteresisMs: 180,
    minConfidence: 0.10,
    hasGazeTracking: true,
    headPoseGainMultiplier: 1.0,
    maxCalibrationRmsePx: 80,
    rejectCalibrationRmsePx: 150,
    gazeCollectIntervalMs: 50,
    requireFullscreen: true,
    requireLandscape: false,
    faceLostPauseThresholdS: 1.5,
    headPoseDriftThresholdDeg: 15,
  },
  tablet: {
    uncertaintyRadius: 350,
    hysteresisMs: 220,
    minConfidence: 0.08,
    hasGazeTracking: false,
    headPoseGainMultiplier: 1.5,
    maxCalibrationRmsePx: 120,
    rejectCalibrationRmsePx: 200,
    gazeCollectIntervalMs: 40,
    requireFullscreen: true,
    requireLandscape: true,
    faceLostPauseThresholdS: 2.0,
    headPoseDriftThresholdDeg: 20,
  },
  mobile: {
    uncertaintyRadius: 400,
    hysteresisMs: 280,
    minConfidence: 0.08,
    hasGazeTracking: false,
    headPoseGainMultiplier: 0,
    maxCalibrationRmsePx: 120,
    rejectCalibrationRmsePx: 200,
    gazeCollectIntervalMs: 30,
    requireFullscreen: true,
    requireLandscape: true,
    faceLostPauseThresholdS: 2.0,
    headPoseDriftThresholdDeg: 25,
  },
};

// ---------------------------------------------------------------------------
// Device detection
// ---------------------------------------------------------------------------

/**
 * Detect device type from userAgent string.
 * Matches the existing `getDeviceType()` in eye-tracking/types.ts.
 */
export function detectDeviceType(userAgent: string): DeviceType {
  const ua = userAgent.toLowerCase();
  const isTablet = ua.includes('ipad')
    || (ua.includes('tablet') && !ua.includes('mobile'));
  const isMobile = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua);

  return isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';
}

// ---------------------------------------------------------------------------
// Profile retrieval
// ---------------------------------------------------------------------------

/**
 * Get device profile from an explicit device type.
 */
export function getProfileForDevice(deviceType: DeviceType): DeviceProfile {
  return { deviceType, ...PROFILES[deviceType] };
}

/**
 * Get device profile from userAgent string.
 */
export function getProfileFromUA(userAgent: string): DeviceProfile {
  return getProfileForDevice(detectDeviceType(userAgent));
}

/**
 * Get device profile for the current environment.
 * Falls back to desktop when navigator is unavailable (SSR/test).
 */
export function getCurrentDeviceProfile(): DeviceProfile {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  return getProfileFromUA(ua);
}
