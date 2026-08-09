import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  RuntimeQualityMonitor,
  type RuntimeQualityCallbacks,
  type RuntimeQualityConfig,
} from '../runtimeQualityMonitor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCallbacks(): RuntimeQualityCallbacks {
  return {
    onFaceLost: vi.fn(),
    onFaceRecovered: vi.fn(),
    onOrientationInvalid: vi.fn(),
    onOrientationValid: vi.fn(),
    onHeadPoseDrift: vi.fn(),
  };
}

function makeConfig(overrides: Partial<RuntimeQualityConfig> = {}): RuntimeQualityConfig {
  return {
    faceLostThresholdMs: 2000,
    headPoseDriftThresholdDeg: 15,
    requireLandscape: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Face loss detection
// ---------------------------------------------------------------------------

describe('RuntimeQualityMonitor — face loss', () => {
  it('reports face lost after threshold elapses', () => {
    const cb = makeCallbacks();
    const monitor = new RuntimeQualityMonitor(makeConfig({ faceLostThresholdMs: 1000 }), cb);
    monitor.start();

    // Report frame with no face
    monitor.reportFrame(false, 0, 0);

    // Not yet — timer hasn't fired
    expect(cb.onFaceLost).not.toHaveBeenCalled();

    // Advance past threshold
    vi.advanceTimersByTime(1000);

    expect(cb.onFaceLost).toHaveBeenCalledTimes(1);

    monitor.stop();
  });

  it('reports face recovered after face was lost', () => {
    const cb = makeCallbacks();
    const monitor = new RuntimeQualityMonitor(makeConfig({ faceLostThresholdMs: 500 }), cb);
    monitor.start();

    // Lose face
    monitor.reportFrame(false, 0, 0);
    vi.advanceTimersByTime(500);
    expect(cb.onFaceLost).toHaveBeenCalledTimes(1);

    // Recover face
    monitor.reportFrame(true, 0, 0);
    expect(cb.onFaceRecovered).toHaveBeenCalledTimes(1);

    monitor.stop();
  });

  it('does NOT fire callback if face returns before threshold', () => {
    const cb = makeCallbacks();
    const monitor = new RuntimeQualityMonitor(makeConfig({ faceLostThresholdMs: 2000 }), cb);
    monitor.start();

    // Face disappears
    monitor.reportFrame(false, 0, 0);
    vi.advanceTimersByTime(500); // only 500ms, threshold is 2000

    // Face comes back before threshold
    monitor.reportFrame(true, 0, 0);

    // Advance past original threshold — timer should be cleared
    vi.advanceTimersByTime(2000);

    expect(cb.onFaceLost).not.toHaveBeenCalled();
    expect(cb.onFaceRecovered).not.toHaveBeenCalled();

    monitor.stop();
  });

  it('does not start a second timer while one is pending', () => {
    const cb = makeCallbacks();
    const monitor = new RuntimeQualityMonitor(makeConfig({ faceLostThresholdMs: 1000 }), cb);
    monitor.start();

    monitor.reportFrame(false, 0, 0);
    vi.advanceTimersByTime(200);
    monitor.reportFrame(false, 0, 0); // second frame — should not create new timer

    vi.advanceTimersByTime(800); // 1000ms from first frame
    expect(cb.onFaceLost).toHaveBeenCalledTimes(1);

    monitor.stop();
  });

  it('does not fire onFaceLost again while already lost', () => {
    const cb = makeCallbacks();
    const monitor = new RuntimeQualityMonitor(makeConfig({ faceLostThresholdMs: 500 }), cb);
    monitor.start();

    monitor.reportFrame(false, 0, 0);
    vi.advanceTimersByTime(500);
    expect(cb.onFaceLost).toHaveBeenCalledTimes(1);

    // More frames with no face
    monitor.reportFrame(false, 0, 0);
    vi.advanceTimersByTime(1000);
    expect(cb.onFaceLost).toHaveBeenCalledTimes(1); // still just 1

    monitor.stop();
  });
});

// ---------------------------------------------------------------------------
// Head pose drift
// ---------------------------------------------------------------------------

describe('RuntimeQualityMonitor — head pose drift', () => {
  it('triggers callback when drift exceeds threshold', () => {
    const cb = makeCallbacks();
    const monitor = new RuntimeQualityMonitor(makeConfig({ headPoseDriftThresholdDeg: 15 }), cb);
    monitor.start();

    monitor.reportFrame(true, 25, 5);

    expect(cb.onHeadPoseDrift).toHaveBeenCalledWith(25, 5);

    monitor.stop();
  });

  it('triggers callback when pitch exceeds threshold', () => {
    const cb = makeCallbacks();
    const monitor = new RuntimeQualityMonitor(makeConfig({ headPoseDriftThresholdDeg: 15 }), cb);
    monitor.start();

    monitor.reportFrame(true, 5, 20);

    expect(cb.onHeadPoseDrift).toHaveBeenCalledWith(5, 20);

    monitor.stop();
  });

  it('does NOT trigger when drift is within threshold', () => {
    const cb = makeCallbacks();
    const monitor = new RuntimeQualityMonitor(makeConfig({ headPoseDriftThresholdDeg: 15 }), cb);
    monitor.start();

    monitor.reportFrame(true, 10, 10);

    expect(cb.onHeadPoseDrift).not.toHaveBeenCalled();

    monitor.stop();
  });

  it('does NOT trigger when drift equals threshold exactly', () => {
    const cb = makeCallbacks();
    const monitor = new RuntimeQualityMonitor(makeConfig({ headPoseDriftThresholdDeg: 15 }), cb);
    monitor.start();

    monitor.reportFrame(true, 15, 10);

    expect(cb.onHeadPoseDrift).not.toHaveBeenCalled();

    monitor.stop();
  });

  it('does NOT check head pose when face is not detected', () => {
    const cb = makeCallbacks();
    const monitor = new RuntimeQualityMonitor(makeConfig({ headPoseDriftThresholdDeg: 15 }), cb);
    monitor.start();

    monitor.reportFrame(false, 30, 30);

    expect(cb.onHeadPoseDrift).not.toHaveBeenCalled();

    monitor.stop();
  });

  it('uses max of abs(yaw) and abs(pitch) for drift comparison', () => {
    const cb = makeCallbacks();
    const monitor = new RuntimeQualityMonitor(makeConfig({ headPoseDriftThresholdDeg: 15 }), cb);
    monitor.start();

    // yaw=-20 => abs=20 > 15, should trigger
    monitor.reportFrame(true, -20, 5);
    expect(cb.onHeadPoseDrift).toHaveBeenCalledWith(-20, 5);

    monitor.stop();
  });
});

// ---------------------------------------------------------------------------
// Orientation change
// ---------------------------------------------------------------------------

describe('RuntimeQualityMonitor — orientation', () => {
  it('triggers onOrientationInvalid on resize when landscape required and portrait detected', () => {
    const cb = makeCallbacks();
    const monitor = new RuntimeQualityMonitor(makeConfig({ requireLandscape: true }), cb);

    // Simulate portrait
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(400);
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800);

    monitor.start();

    window.dispatchEvent(new Event('resize'));

    expect(cb.onOrientationInvalid).toHaveBeenCalledTimes(1);
    expect(cb.onOrientationValid).not.toHaveBeenCalled();

    monitor.stop();
  });

  it('triggers onOrientationValid on resize when in landscape', () => {
    const cb = makeCallbacks();
    const monitor = new RuntimeQualityMonitor(makeConfig({ requireLandscape: true }), cb);

    // Simulate landscape
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1024);
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(768);

    monitor.start();

    window.dispatchEvent(new Event('resize'));

    expect(cb.onOrientationValid).toHaveBeenCalledTimes(1);
    expect(cb.onOrientationInvalid).not.toHaveBeenCalled();

    monitor.stop();
  });

  it('does NOT add resize listener when requireLandscape is false', () => {
    const cb = makeCallbacks();
    const addSpy = vi.spyOn(window, 'addEventListener');
    const monitor = new RuntimeQualityMonitor(makeConfig({ requireLandscape: false }), cb);
    monitor.start();

    const resizeCalls = addSpy.mock.calls.filter(([event]) => event === 'resize');
    expect(resizeCalls).toHaveLength(0);

    monitor.stop();
  });
});

// ---------------------------------------------------------------------------
// start / stop lifecycle
// ---------------------------------------------------------------------------

describe('RuntimeQualityMonitor — lifecycle', () => {
  it('stop clears face lost timer', () => {
    const cb = makeCallbacks();
    const monitor = new RuntimeQualityMonitor(makeConfig({ faceLostThresholdMs: 1000 }), cb);
    monitor.start();

    monitor.reportFrame(false, 0, 0);
    monitor.stop();

    vi.advanceTimersByTime(2000);
    expect(cb.onFaceLost).not.toHaveBeenCalled();
  });

  it('stop removes resize listener', () => {
    const cb = makeCallbacks();
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const monitor = new RuntimeQualityMonitor(makeConfig({ requireLandscape: true }), cb);
    monitor.start();
    monitor.stop();

    const resizeCalls = removeSpy.mock.calls.filter(([event]) => event === 'resize');
    expect(resizeCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('reportFrame does nothing when not running', () => {
    const cb = makeCallbacks();
    const monitor = new RuntimeQualityMonitor(makeConfig({ faceLostThresholdMs: 100 }), cb);
    // Never started

    monitor.reportFrame(false, 30, 30);
    vi.advanceTimersByTime(1000);

    expect(cb.onFaceLost).not.toHaveBeenCalled();
    expect(cb.onHeadPoseDrift).not.toHaveBeenCalled();
  });

  it('reportFrame does nothing after stop', () => {
    const cb = makeCallbacks();
    const monitor = new RuntimeQualityMonitor(makeConfig({ faceLostThresholdMs: 100 }), cb);
    monitor.start();
    monitor.stop();

    monitor.reportFrame(false, 30, 30);
    vi.advanceTimersByTime(1000);

    expect(cb.onFaceLost).not.toHaveBeenCalled();
    expect(cb.onHeadPoseDrift).not.toHaveBeenCalled();
  });

  it('can start again after stop', () => {
    const cb = makeCallbacks();
    const monitor = new RuntimeQualityMonitor(makeConfig({ faceLostThresholdMs: 500 }), cb);
    monitor.start();
    monitor.stop();

    // Restart
    monitor.start();
    monitor.reportFrame(false, 0, 0);
    vi.advanceTimersByTime(500);
    expect(cb.onFaceLost).toHaveBeenCalledTimes(1);

    monitor.stop();
  });
});
