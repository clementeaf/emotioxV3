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
}

// ---------------------------------------------------------------------------
// Profile definitions
// ---------------------------------------------------------------------------

const PROFILES: Record<DeviceType, Omit<DeviceProfile, 'deviceType'>> = {
  desktop: {
    uncertaintyRadius: 120,
    hysteresisMs: 200,
    minConfidence: 0.15,
    hasGazeTracking: true,
    headPoseGainMultiplier: 1.0,
  },
  tablet: {
    uncertaintyRadius: 160,
    hysteresisMs: 250,
    minConfidence: 0.12,
    hasGazeTracking: false,
    headPoseGainMultiplier: 1.5,
  },
  mobile: {
    uncertaintyRadius: 200,
    hysteresisMs: 300,
    minConfidence: 0.10,
    hasGazeTracking: false,
    headPoseGainMultiplier: 0, // no head pose on mobile
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
