import { describe, it, expect } from 'vitest';
import {
  detectDeviceType,
  getProfileForDevice,
  getProfileFromUA,
  getCurrentDeviceProfile,
  type DeviceType,
} from '../deviceProfile';

// ---------------------------------------------------------------------------
// User agent strings
// ---------------------------------------------------------------------------

const UA = {
  chrome_desktop: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  firefox_desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  safari_desktop: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  edge_desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',

  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
  android_phone: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  android_old: 'Mozilla/5.0 (Linux; U; Android 4.0.3; en-us; Nexus 7 Build/IML74K) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
  opera_mini: 'Opera/9.80 (J2ME/MIDP; Opera Mini/9.80 (S60; SymbOS; Opera Mobi/23.348; U; en) Presto/2.5.25 Version/10.54',
  ipod: 'Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
  blackberry: 'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.1.0.346 Mobile Safari/534.11+',
  webos: 'Mozilla/5.0 (webOS/1.4.5; U; en-US) AppleWebKit/532.2 (KHTML, like Gecko) Version/1.0 Safari/532.2',

  ipad: 'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
  android_tablet: 'Mozilla/5.0 (Linux; Android 13; SM-X200) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Tablet',

  empty: '',
  unknown: 'SomeRandomBot/1.0',
};

// ---------------------------------------------------------------------------
// detectDeviceType
// ---------------------------------------------------------------------------

describe('detectDeviceType — desktop', () => {
  it('Chrome desktop', () => {
    expect(detectDeviceType(UA.chrome_desktop)).toBe('desktop');
  });

  it('Firefox desktop', () => {
    expect(detectDeviceType(UA.firefox_desktop)).toBe('desktop');
  });

  it('Safari desktop', () => {
    expect(detectDeviceType(UA.safari_desktop)).toBe('desktop');
  });

  it('Edge desktop', () => {
    expect(detectDeviceType(UA.edge_desktop)).toBe('desktop');
  });

  it('empty UA defaults to desktop', () => {
    expect(detectDeviceType(UA.empty)).toBe('desktop');
  });

  it('unknown UA defaults to desktop', () => {
    expect(detectDeviceType(UA.unknown)).toBe('desktop');
  });
});

describe('detectDeviceType — mobile', () => {
  it('iPhone', () => {
    expect(detectDeviceType(UA.iphone)).toBe('mobile');
  });

  it('Android phone', () => {
    expect(detectDeviceType(UA.android_phone)).toBe('mobile');
  });

  it('old Android', () => {
    expect(detectDeviceType(UA.android_old)).toBe('mobile');
  });

  it('Opera Mini', () => {
    expect(detectDeviceType(UA.opera_mini)).toBe('mobile');
  });

  it('iPod', () => {
    expect(detectDeviceType(UA.ipod)).toBe('mobile');
  });

  it('BlackBerry', () => {
    expect(detectDeviceType(UA.blackberry)).toBe('mobile');
  });

  it('webOS', () => {
    expect(detectDeviceType(UA.webos)).toBe('mobile');
  });
});

describe('detectDeviceType — tablet', () => {
  it('iPad', () => {
    expect(detectDeviceType(UA.ipad)).toBe('tablet');
  });

  it('Android tablet (contains "tablet" without "mobile")', () => {
    expect(detectDeviceType(UA.android_tablet)).toBe('tablet');
  });
});

// ---------------------------------------------------------------------------
// getProfileForDevice — profile values
// ---------------------------------------------------------------------------

describe('getProfileForDevice — desktop', () => {
  const profile = getProfileForDevice('desktop');

  it('deviceType is desktop', () => {
    expect(profile.deviceType).toBe('desktop');
  });

  it('uncertaintyRadius is 300', () => {
    expect(profile.uncertaintyRadius).toBe(300);
  });

  it('hysteresisMs is 180', () => {
    expect(profile.hysteresisMs).toBe(180);
  });

  it('has gaze tracking', () => {
    expect(profile.hasGazeTracking).toBe(true);
  });

  it('headPoseGainMultiplier is 1.0', () => {
    expect(profile.headPoseGainMultiplier).toBe(1.0);
  });

  it('minConfidence is 0.10', () => {
    expect(profile.minConfidence).toBe(0.10);
  });
});

describe('getProfileForDevice — tablet', () => {
  const profile = getProfileForDevice('tablet');

  it('deviceType is tablet', () => {
    expect(profile.deviceType).toBe('tablet');
  });

  it('larger uncertainty than desktop', () => {
    expect(profile.uncertaintyRadius).toBeGreaterThan(getProfileForDevice('desktop').uncertaintyRadius);
  });

  it('slower hysteresis than desktop', () => {
    expect(profile.hysteresisMs).toBeGreaterThan(getProfileForDevice('desktop').hysteresisMs);
  });

  it('no gaze tracking', () => {
    expect(profile.hasGazeTracking).toBe(false);
  });

  it('higher headPoseGainMultiplier (more tolerance)', () => {
    expect(profile.headPoseGainMultiplier).toBeGreaterThan(getProfileForDevice('desktop').headPoseGainMultiplier);
  });
});

describe('getProfileForDevice — mobile', () => {
  const profile = getProfileForDevice('mobile');

  it('deviceType is mobile', () => {
    expect(profile.deviceType).toBe('mobile');
  });

  it('largest uncertainty', () => {
    expect(profile.uncertaintyRadius).toBe(400);
    expect(profile.uncertaintyRadius).toBeGreaterThan(getProfileForDevice('tablet').uncertaintyRadius);
  });

  it('slowest hysteresis', () => {
    expect(profile.hysteresisMs).toBe(280);
    expect(profile.hysteresisMs).toBeGreaterThan(getProfileForDevice('tablet').hysteresisMs);
  });

  it('no gaze tracking', () => {
    expect(profile.hasGazeTracking).toBe(false);
  });

  it('no head pose compensation', () => {
    expect(profile.headPoseGainMultiplier).toBe(0);
  });

  it('lowest minConfidence (most tolerant)', () => {
    expect(profile.minConfidence).toBeLessThanOrEqual(getProfileForDevice('desktop').minConfidence);
    expect(profile.minConfidence).toBeLessThanOrEqual(getProfileForDevice('tablet').minConfidence);
  });
});

// ---------------------------------------------------------------------------
// getProfileForDevice — value ordering invariants
// ---------------------------------------------------------------------------

describe('getProfileForDevice — ordering invariants', () => {
  const desktop = getProfileForDevice('desktop');
  const tablet = getProfileForDevice('tablet');
  const mobile = getProfileForDevice('mobile');

  it('uncertaintyRadius: desktop < tablet < mobile', () => {
    expect(desktop.uncertaintyRadius).toBeLessThan(tablet.uncertaintyRadius);
    expect(tablet.uncertaintyRadius).toBeLessThan(mobile.uncertaintyRadius);
  });

  it('hysteresisMs: desktop < tablet < mobile', () => {
    expect(desktop.hysteresisMs).toBeLessThan(tablet.hysteresisMs);
    expect(tablet.hysteresisMs).toBeLessThan(mobile.hysteresisMs);
  });

  it('minConfidence: desktop >= tablet >= mobile', () => {
    expect(desktop.minConfidence).toBeGreaterThanOrEqual(tablet.minConfidence);
    expect(tablet.minConfidence).toBeGreaterThanOrEqual(mobile.minConfidence);
  });

  it('all uncertaintyRadius values are positive', () => {
    [desktop, tablet, mobile].forEach((p) => {
      expect(p.uncertaintyRadius).toBeGreaterThan(0);
    });
  });

  it('all hysteresisMs values are positive', () => {
    [desktop, tablet, mobile].forEach((p) => {
      expect(p.hysteresisMs).toBeGreaterThan(0);
    });
  });

  it('all minConfidence values are in (0, 1)', () => {
    [desktop, tablet, mobile].forEach((p) => {
      expect(p.minConfidence).toBeGreaterThan(0);
      expect(p.minConfidence).toBeLessThan(1);
    });
  });
});

// ---------------------------------------------------------------------------
// getProfileFromUA — end-to-end
// ---------------------------------------------------------------------------

describe('getProfileFromUA', () => {
  it('desktop Chrome → desktop profile', () => {
    const profile = getProfileFromUA(UA.chrome_desktop);
    expect(profile.deviceType).toBe('desktop');
    expect(profile.uncertaintyRadius).toBe(300);
  });

  it('iPhone → mobile profile', () => {
    const profile = getProfileFromUA(UA.iphone);
    expect(profile.deviceType).toBe('mobile');
    expect(profile.uncertaintyRadius).toBe(400);
  });

  it('iPad → tablet profile', () => {
    const profile = getProfileFromUA(UA.ipad);
    expect(profile.deviceType).toBe('tablet');
    expect(profile.uncertaintyRadius).toBe(350);
  });

  it('Android phone → mobile profile', () => {
    const profile = getProfileFromUA(UA.android_phone);
    expect(profile.deviceType).toBe('mobile');
  });

  it('empty string → desktop profile', () => {
    const profile = getProfileFromUA(UA.empty);
    expect(profile.deviceType).toBe('desktop');
  });
});

// ---------------------------------------------------------------------------
// getCurrentDeviceProfile
// ---------------------------------------------------------------------------

describe('getCurrentDeviceProfile', () => {
  it('returns a valid profile', () => {
    const profile = getCurrentDeviceProfile();
    expect(profile.deviceType).toBeDefined();
    expect(profile.uncertaintyRadius).toBeGreaterThan(0);
    expect(profile.hysteresisMs).toBeGreaterThan(0);
    expect(profile.minConfidence).toBeGreaterThan(0);
  });

  it('defaults to desktop in test environment (jsdom)', () => {
    // jsdom navigator.userAgent typically doesn't match mobile patterns
    const profile = getCurrentDeviceProfile();
    expect(profile.deviceType).toBe('desktop');
  });
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

describe('deviceProfile — determinism', () => {
  it('same UA produces same profile', () => {
    const p1 = getProfileFromUA(UA.iphone);
    const p2 = getProfileFromUA(UA.iphone);
    expect(p1).toEqual(p2);
  });

  it('same device type produces same profile', () => {
    const p1 = getProfileForDevice('tablet');
    const p2 = getProfileForDevice('tablet');
    expect(p1).toEqual(p2);
  });

  it('getCurrentDeviceProfile is stable across calls', () => {
    const p1 = getCurrentDeviceProfile();
    const p2 = getCurrentDeviceProfile();
    expect(p1).toEqual(p2);
  });
});

// ---------------------------------------------------------------------------
// Profile completeness
// ---------------------------------------------------------------------------

describe('deviceProfile — completeness', () => {
  const types: DeviceType[] = ['desktop', 'tablet', 'mobile'];

  types.forEach((type) => {
    it(`${type} profile has all required fields`, () => {
      const profile = getProfileForDevice(type);
      expect(typeof profile.deviceType).toBe('string');
      expect(typeof profile.uncertaintyRadius).toBe('number');
      expect(typeof profile.hysteresisMs).toBe('number');
      expect(typeof profile.minConfidence).toBe('number');
      expect(typeof profile.hasGazeTracking).toBe('boolean');
      expect(typeof profile.headPoseGainMultiplier).toBe('number');
    });
  });

  it('only desktop has gaze tracking', () => {
    expect(getProfileForDevice('desktop').hasGazeTracking).toBe(true);
    expect(getProfileForDevice('tablet').hasGazeTracking).toBe(false);
    expect(getProfileForDevice('mobile').hasGazeTracking).toBe(false);
  });

  types.forEach((type) => {
    it(`${type} profile has all new calibration and quality fields`, () => {
      const profile = getProfileForDevice(type);
      expect(typeof profile.maxCalibrationRmsePx).toBe('number');
      expect(typeof profile.rejectCalibrationRmsePx).toBe('number');
      expect(typeof profile.gazeCollectIntervalMs).toBe('number');
      expect(typeof profile.requireFullscreen).toBe('boolean');
      expect(typeof profile.requireLandscape).toBe('boolean');
      expect(typeof profile.faceLostPauseThresholdS).toBe('number');
      expect(typeof profile.headPoseDriftThresholdDeg).toBe('number');
    });
  });
});

// ---------------------------------------------------------------------------
// New calibration / quality fields — exact values
// ---------------------------------------------------------------------------

describe('getProfileForDevice — calibration fields (desktop)', () => {
  const profile = getProfileForDevice('desktop');

  it('maxCalibrationRmsePx is 80', () => {
    expect(profile.maxCalibrationRmsePx).toBe(80);
  });

  it('requireFullscreen is true', () => {
    expect(profile.requireFullscreen).toBe(true);
  });

  it('requireLandscape is false', () => {
    expect(profile.requireLandscape).toBe(false);
  });

  it('gazeCollectIntervalMs is 50', () => {
    expect(profile.gazeCollectIntervalMs).toBe(50);
  });
});

describe('getProfileForDevice — calibration fields (tablet)', () => {
  const profile = getProfileForDevice('tablet');

  it('maxCalibrationRmsePx is 120', () => {
    expect(profile.maxCalibrationRmsePx).toBe(120);
  });

  it('requireLandscape is true', () => {
    expect(profile.requireLandscape).toBe(true);
  });

  it('gazeCollectIntervalMs is 40', () => {
    expect(profile.gazeCollectIntervalMs).toBe(40);
  });
});

describe('getProfileForDevice — calibration fields (mobile)', () => {
  const profile = getProfileForDevice('mobile');

  it('maxCalibrationRmsePx is 120', () => {
    expect(profile.maxCalibrationRmsePx).toBe(120);
  });

  it('requireLandscape is true', () => {
    expect(profile.requireLandscape).toBe(true);
  });

  it('gazeCollectIntervalMs is 30', () => {
    expect(profile.gazeCollectIntervalMs).toBe(30);
  });
});

describe('getProfileForDevice — quality invariants', () => {
  const types: DeviceType[] = ['desktop', 'tablet', 'mobile'];

  types.forEach((type) => {
    it(`${type}: faceLostPauseThresholdS > 0`, () => {
      expect(getProfileForDevice(type).faceLostPauseThresholdS).toBeGreaterThan(0);
    });

    it(`${type}: headPoseDriftThresholdDeg > 0`, () => {
      expect(getProfileForDevice(type).headPoseDriftThresholdDeg).toBeGreaterThan(0);
    });

    it(`${type}: rejectCalibrationRmsePx > maxCalibrationRmsePx`, () => {
      const profile = getProfileForDevice(type);
      expect(profile.rejectCalibrationRmsePx).toBeGreaterThan(profile.maxCalibrationRmsePx);
    });
  });
});
