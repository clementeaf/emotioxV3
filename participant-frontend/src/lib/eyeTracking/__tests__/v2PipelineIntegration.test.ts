import { describe, it, expect, beforeEach } from 'vitest';
import { ZoneRegistry, generateGrid } from '../zoneRegistry';
import type { Zone, ZoneRect } from '../zoneRegistry';
import { ZoneEventEmitter, type ZoneEvent, type ZoneEventType } from '../zoneEventEmitter';
import { classifyGaze } from '../zoneClassifier';
import { HysteresisEngine } from '../hysteresisEngine';
import {
  buildV2Response,
  computeZoneMetrics,
  generateBackwardFixations,
  generateBackwardZoneMass,
  EYE_TRACKING_V2_ENABLED,
} from '../v2ResponseBuilder';
import { getCurrentDeviceProfile, getProfileForDevice } from '../deviceProfile';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const containerRect: ZoneRect = { x: 100, y: 100, width: 900, height: 600 };

const makeEvent = (
  type: ZoneEventType,
  zoneId: string | null,
  ts: number,
  extra: Partial<ZoneEvent> = {},
): ZoneEvent => ({
  type,
  zoneId,
  confidence: 0.8,
  timestamp: ts,
  ...extra,
});

// ---------------------------------------------------------------------------
// V2 feature flag
// ---------------------------------------------------------------------------

describe('V2 pipeline — feature flag', () => {
  it('V2 is enabled', () => {
    expect(EYE_TRACKING_V2_ENABLED).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// generateGrid — 3x3 for stimulus
// ---------------------------------------------------------------------------

describe('generateGrid — 3x3 stimulus zones', () => {
  let zones: Zone[];

  beforeEach(() => {
    zones = generateGrid(3, 3, containerRect);
  });

  it('produces 9 zones', () => {
    expect(zones).toHaveLength(9);
  });

  it('zone IDs match HYBRID_AOI_GRID pattern (r{row}c{col})', () => {
    const ids = zones.map(z => z.id);
    expect(ids).toContain('r0c0');
    expect(ids).toContain('r1c1');
    expect(ids).toContain('r2c2');
  });

  it('zones cover full container area', () => {
    const totalArea = zones.reduce((sum, z) => sum + z.rect.width * z.rect.height, 0);
    const containerArea = containerRect.width * containerRect.height;
    expect(totalArea).toBeCloseTo(containerArea, 0);
  });

  it('each cell has correct dimensions', () => {
    const cellW = containerRect.width / 3;
    const cellH = containerRect.height / 3;
    for (const z of zones) {
      expect(z.rect.width).toBeCloseTo(cellW, 5);
      expect(z.rect.height).toBeCloseTo(cellH, 5);
    }
  });

  it('top-left zone starts at container origin', () => {
    const topLeft = zones.find(z => z.id === 'r0c0')!;
    expect(topLeft.rect.x).toBe(containerRect.x);
    expect(topLeft.rect.y).toBe(containerRect.y);
  });

  it('bottom-right zone ends at container edge', () => {
    const bottomRight = zones.find(z => z.id === 'r2c2')!;
    const endX = bottomRight.rect.x + bottomRight.rect.width;
    const endY = bottomRight.rect.y + bottomRight.rect.height;
    expect(endX).toBeCloseTo(containerRect.x + containerRect.width, 5);
    expect(endY).toBeCloseTo(containerRect.y + containerRect.height, 5);
  });

  it('labels match Spanish convention for 3x3', () => {
    const center = zones.find(z => z.id === 'r1c1')!;
    expect(center.label).toBe('Centro');
    const topLeft = zones.find(z => z.id === 'r0c0')!;
    expect(topLeft.label).toBe('Superior izquierda');
  });
});

// ---------------------------------------------------------------------------
// ZoneRegistry — register grid zones
// ---------------------------------------------------------------------------

describe('ZoneRegistry — manual rect registration', () => {
  let registry: ZoneRegistry;

  beforeEach(() => {
    registry = new ZoneRegistry();
  });

  it('registers zones from grid', () => {
    const zones = generateGrid(3, 3, containerRect);
    zones.forEach(z => registry.register(z.id, z.label, z.rect));
    expect(registry.size).toBe(9);
    expect(registry.getZones()).toHaveLength(9);
  });

  it('getZoneAt finds correct zone', () => {
    const zones = generateGrid(3, 3, containerRect);
    zones.forEach(z => registry.register(z.id, z.label, z.rect));
    // Point in center of container → r1c1
    const match = registry.getZoneAt(
      containerRect.x + containerRect.width / 2,
      containerRect.y + containerRect.height / 2,
    );
    expect(match).not.toBeNull();
    expect(match!.zone.id).toBe('r1c1');
  });

  it('getNearestZone returns closest zone for point outside', () => {
    const zones = generateGrid(3, 3, containerRect);
    zones.forEach(z => registry.register(z.id, z.label, z.rect));
    const match = registry.getNearestZone(0, 0); // far top-left
    expect(match).not.toBeNull();
    expect(match!.zone.id).toBe('r0c0'); // nearest is top-left
  });

  it('clear removes all zones', () => {
    const zones = generateGrid(3, 3, containerRect);
    zones.forEach(z => registry.register(z.id, z.label, z.rect));
    registry.clear();
    expect(registry.size).toBe(0);
    expect(registry.getZones()).toHaveLength(0);
  });

  it('destroy cleans up', () => {
    const zones = generateGrid(3, 3, containerRect);
    zones.forEach(z => registry.register(z.id, z.label, z.rect));
    registry.destroy();
    expect(registry.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// classifyGaze — corrected coords into zones
// ---------------------------------------------------------------------------

describe('classifyGaze — IDW-corrected coords', () => {
  let zones: Zone[];

  beforeEach(() => {
    zones = generateGrid(3, 3, containerRect);
  });

  it('point in center zone → r1c1 has highest confidence', () => {
    const centerX = containerRect.x + containerRect.width / 2;
    const centerY = containerRect.y + containerRect.height / 2;
    const probs = classifyGaze(centerX, centerY, 120, zones);
    expect(probs.length).toBeGreaterThan(0);
    expect(probs[0].zoneId).toBe('r1c1');
    expect(probs[0].confidence).toBeGreaterThan(0.3);
  });

  it('point in top-left → r0c0 dominates', () => {
    const x = containerRect.x + containerRect.width * 0.1;
    const y = containerRect.y + containerRect.height * 0.1;
    const probs = classifyGaze(x, y, 120, zones);
    expect(probs[0].zoneId).toBe('r0c0');
  });

  it('point far outside → empty probabilities', () => {
    const probs = classifyGaze(-1000, -1000, 120, zones);
    expect(probs).toHaveLength(0);
  });

  it('smaller uncertainty radius → sharper distribution', () => {
    const x = containerRect.x + containerRect.width / 2;
    const y = containerRect.y + containerRect.height / 2;
    const broad = classifyGaze(x, y, 300, zones);
    const sharp = classifyGaze(x, y, 50, zones);
    // Sharp should have higher top confidence (more decisive)
    expect(sharp[0].confidence).toBeGreaterThanOrEqual(broad[0].confidence);
  });
});

// ---------------------------------------------------------------------------
// ZoneEventEmitter — end-to-end feed
// ---------------------------------------------------------------------------

describe('ZoneEventEmitter — feed corrected gaze', () => {
  let emitter: ZoneEventEmitter;
  let zones: Zone[];
  let events: ZoneEvent[];

  beforeEach(() => {
    zones = generateGrid(3, 3, containerRect);
    emitter = new ZoneEventEmitter({
      uncertaintyRadius: 120,
      switchThresholdMs: 200,
      minFixationMs: 150,
    });
    events = [];
    const types: ZoneEventType[] = ['zone_enter', 'zone_leave', 'fixation_start', 'fixation_end'];
    types.forEach(type => {
      emitter.on(type, (e) => events.push(e));
    });
  });

  it('first feed emits zone_enter', () => {
    const cx = containerRect.x + containerRect.width / 2;
    const cy = containerRect.y + containerRect.height / 2;
    emitter.feed(cx, cy, 0, zones);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('zone_enter');
    expect(events[0].zoneId).toBe('r1c1');
  });

  it('sustained gaze triggers fixation_start', () => {
    const cx = containerRect.x + containerRect.width / 2;
    const cy = containerRect.y + containerRect.height / 2;
    // Feed for 200ms (4 samples at 50ms)
    for (let t = 0; t <= 200; t += 50) {
      emitter.feed(cx, cy, t, zones);
    }
    const fixStarts = events.filter(e => e.type === 'fixation_start');
    expect(fixStarts.length).toBe(1);
    expect(fixStarts[0].zoneId).toBe('r1c1');
  });

  it('moving to different zone emits leave + enter', () => {
    const cx = containerRect.x + containerRect.width / 2;
    const cy = containerRect.y + containerRect.height / 2;
    const tlx = containerRect.x + containerRect.width * 0.1;
    const tly = containerRect.y + containerRect.height * 0.1;

    // Dwell in center
    for (let t = 0; t < 300; t += 50) {
      emitter.feed(cx, cy, t, zones);
    }
    // Move to top-left (wait for hysteresis)
    for (let t = 300; t < 600; t += 50) {
      emitter.feed(tlx, tly, t, zones);
    }

    const leaves = events.filter(e => e.type === 'zone_leave');
    expect(leaves.length).toBeGreaterThanOrEqual(1);
    const enters = events.filter(e => e.type === 'zone_enter');
    expect(enters.length).toBeGreaterThanOrEqual(2); // initial + transition
  });

  it('getState returns current zone info', () => {
    const cx = containerRect.x + containerRect.width / 2;
    const cy = containerRect.y + containerRect.height / 2;
    emitter.feed(cx, cy, 0, zones);
    const state = emitter.getState();
    expect(state.currentZone).toBe('r1c1');
    expect(state.confidence).toBeGreaterThan(0);
  });

  it('reset clears state', () => {
    const cx = containerRect.x + containerRect.width / 2;
    const cy = containerRect.y + containerRect.height / 2;
    emitter.feed(cx, cy, 0, zones);
    emitter.reset();
    expect(emitter.getState().currentZone).toBeNull();
  });

  it('destroy makes feed inert', () => {
    const cx = containerRect.x + containerRect.width / 2;
    const cy = containerRect.y + containerRect.height / 2;
    emitter.destroy();
    emitter.feed(cx, cy, 0, zones);
    expect(events).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// buildV2Response — full response construction
// ---------------------------------------------------------------------------

describe('buildV2Response — complete pipeline output', () => {
  it('produces valid V2 response structure', () => {
    const zones = generateGrid(3, 3, containerRect);
    const zoneEvents: ZoneEvent[] = [
      makeEvent('zone_enter', 'r1c1', 100, { confidence: 0.9 }),
      makeEvent('fixation_start', 'r1c1', 250, { confidence: 0.9 }),
      makeEvent('fixation_end', 'r1c1', 500, { duration: 250, confidence: 0.9 }),
      makeEvent('zone_leave', 'r1c1', 500, { duration: 400, confidence: 0.9 }),
      makeEvent('zone_enter', 'r0c0', 500, { confidence: 0.7 }),
      makeEvent('zone_leave', 'r0c0', 800, { duration: 300, confidence: 0.7 }),
    ];

    const response = buildV2Response({
      events: zoneEvents,
      zones,
      calibration: {
        method: 'dwell-13pt-idw',
        rmsePx: 85,
        pointCount: 13,
        persistent: false,
      },
      metadata: {
        trackingMethod: 'blazegaze-v2',
        deviceType: 'desktop',
        uncertaintyRadius: 120,
        hysteresisMs: 200,
        gazeSampleCount: 100,
        pipeline: 'zone-event-v2',
      },
    });

    expect(response.version).toBe(2);
    expect(response.zoneEvents).toHaveLength(6);
    expect(response.zones).toHaveLength(9);
    expect(response.calibration.method).toBe('dwell-13pt-idw');
    expect(response.calibration.rmsePx).toBe(85);
    expect(response.metadata.pipeline).toBe('zone-event-v2');
  });

  it('generates backward-compat fixations from zone events', () => {
    const zones = generateGrid(3, 3, containerRect);
    const zoneEvents: ZoneEvent[] = [
      makeEvent('zone_enter', 'r1c1', 100),
      makeEvent('fixation_start', 'r1c1', 250),
      makeEvent('fixation_end', 'r1c1', 500, { duration: 250 }),
      makeEvent('zone_leave', 'r1c1', 500, { duration: 400 }),
    ];

    const response = buildV2Response({
      events: zoneEvents,
      zones,
      calibration: { method: 'dwell-13pt-idw', rmsePx: 85, pointCount: 13, persistent: false },
      metadata: { trackingMethod: 'blazegaze-v2', deviceType: 'desktop', uncertaintyRadius: 120, hysteresisMs: 200, gazeSampleCount: 50, pipeline: 'zone-event-v2' },
    });

    expect(response.fixations).toHaveLength(1);
    expect(response.fixations[0].duration).toBe(250);
    // Fixation at centroid of r1c1
    const cellW = containerRect.width / 3;
    const cellH = containerRect.height / 3;
    const expectedX = Math.round(containerRect.x + cellW + cellW / 2); // col 1 center
    const expectedY = Math.round(containerRect.y + cellH + cellH / 2); // row 1 center
    expect(response.fixations[0].x).toBe(expectedX);
    expect(response.fixations[0].y).toBe(expectedY);
  });

  it('generates backward-compat zoneMass from dwell times', () => {
    const zones = generateGrid(3, 3, containerRect);
    const zoneEvents: ZoneEvent[] = [
      makeEvent('zone_enter', 'r1c1', 0),
      makeEvent('zone_leave', 'r1c1', 600, { duration: 600 }),
      makeEvent('zone_enter', 'r0c0', 600),
      makeEvent('zone_leave', 'r0c0', 1000, { duration: 400 }),
    ];

    const response = buildV2Response({
      events: zoneEvents,
      zones,
      calibration: { method: 'dwell-13pt-idw', rmsePx: 85, pointCount: 13, persistent: false },
      metadata: { trackingMethod: 'blazegaze-v2', deviceType: 'desktop', uncertaintyRadius: 120, hysteresisMs: 200, gazeSampleCount: 50, pipeline: 'zone-event-v2' },
    });

    expect(response.zoneMass['r1c1']).toBeCloseTo(0.6, 1); // 600/1000
    expect(response.zoneMass['r0c0']).toBeCloseTo(0.4, 1); // 400/1000
    // Other zones should be 0
    expect(response.zoneMass['r2c2']).toBe(0);
  });

  it('zone metrics aggregate correctly', () => {
    const zoneEvents: ZoneEvent[] = [
      makeEvent('zone_enter', 'A', 0, { confidence: 0.9 }),
      makeEvent('fixation_start', 'A', 200, { confidence: 0.85 }),
      makeEvent('fixation_end', 'A', 500, { duration: 300 }),
      makeEvent('zone_leave', 'A', 500, { duration: 500 }),
      makeEvent('zone_enter', 'B', 500, { confidence: 0.7 }),
      makeEvent('zone_leave', 'B', 700, { duration: 200 }),
      makeEvent('zone_enter', 'A', 700, { confidence: 0.8 }),
      makeEvent('zone_leave', 'A', 1000, { duration: 300 }),
    ];

    const metrics = computeZoneMetrics(zoneEvents, ['A', 'B', 'C']);

    expect(metrics['A'].visitCount).toBe(2);
    expect(metrics['A'].totalDwellTime).toBe(800); // 500 + 300
    expect(metrics['A'].fixationCount).toBe(1);
    expect(metrics['B'].visitCount).toBe(1);
    expect(metrics['B'].totalDwellTime).toBe(200);
    expect(metrics['C'].visitCount).toBe(0);
    expect(metrics['C'].totalDwellTime).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// DeviceProfile — config for zone pipeline
// ---------------------------------------------------------------------------

describe('DeviceProfile — zone pipeline config', () => {
  it('desktop profile has gaze tracking', () => {
    const profile = getProfileForDevice('desktop');
    expect(profile.hasGazeTracking).toBe(true);
    expect(profile.uncertaintyRadius).toBe(120);
    expect(profile.hysteresisMs).toBe(200);
  });

  it('tablet has larger uncertainty radius', () => {
    const tablet = getProfileForDevice('tablet');
    const desktop = getProfileForDevice('desktop');
    expect(tablet.uncertaintyRadius).toBeGreaterThan(desktop.uncertaintyRadius);
  });

  it('mobile has largest uncertainty radius', () => {
    const mobile = getProfileForDevice('mobile');
    const tablet = getProfileForDevice('tablet');
    expect(mobile.uncertaintyRadius).toBeGreaterThan(tablet.uncertaintyRadius);
  });

  it('getCurrentDeviceProfile returns a valid profile', () => {
    const profile = getCurrentDeviceProfile();
    expect(profile.deviceType).toBeDefined();
    expect(profile.uncertaintyRadius).toBeGreaterThan(0);
    expect(profile.hysteresisMs).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// HysteresisEngine — temporal stability after IDW
// ---------------------------------------------------------------------------

describe('HysteresisEngine — zone transition stability', () => {
  it('first sample commits immediately', () => {
    const engine = new HysteresisEngine({ switchThresholdMs: 200 });
    const result = engine.update(
      [{ zoneId: 'r1c1', confidence: 0.9, distance: 0 }],
      0,
    );
    expect(result.zone).toBe('r1c1');
    expect(result.changed).toBe(true);
  });

  it('brief excursion does not trigger switch', () => {
    const engine = new HysteresisEngine({ switchThresholdMs: 200 });
    // Commit to r1c1
    engine.update([{ zoneId: 'r1c1', confidence: 0.9, distance: 0 }], 0);
    // Brief move to r0c0 (only 100ms)
    engine.update([{ zoneId: 'r0c0', confidence: 0.8, distance: 0 }], 50);
    const result = engine.update([{ zoneId: 'r0c0', confidence: 0.8, distance: 0 }], 100);
    // Should NOT have switched yet (only 100ms elapsed, threshold is 200ms)
    expect(result.zone).toBe('r1c1');
    expect(result.changed).toBe(false);
  });

  it('sustained move triggers switch after threshold', () => {
    const engine = new HysteresisEngine({ switchThresholdMs: 200 });
    engine.update([{ zoneId: 'r1c1', confidence: 0.9, distance: 0 }], 0);
    // Move to r0c0 and hold for 250ms
    engine.update([{ zoneId: 'r0c0', confidence: 0.8, distance: 0 }], 100);
    const result = engine.update([{ zoneId: 'r0c0', confidence: 0.8, distance: 0 }], 350);
    expect(result.zone).toBe('r0c0');
    expect(result.changed).toBe(true);
  });
});
