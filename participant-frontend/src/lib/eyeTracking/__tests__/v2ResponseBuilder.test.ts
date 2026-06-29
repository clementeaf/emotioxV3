import { describe, it, expect } from 'vitest';
import {
  computeZoneMetrics,
  generateBackwardFixations,
  generateBackwardZoneMass,
  extractZoneDefinitions,
  firstZoneObserved,
  explorationOrder,
  buildV2Response,
  EYE_TRACKING_V2_ENABLED,
  type ZoneMetrics,
} from '../v2ResponseBuilder';
import type { ZoneEvent } from '../zoneEventEmitter';
import type { Zone, ZoneRect } from '../zoneRegistry';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const event = (
  type: ZoneEvent['type'],
  zoneId: string | null,
  timestamp: number,
  extra: Partial<ZoneEvent> = {},
): ZoneEvent => ({
  type,
  zoneId,
  confidence: 0.8,
  timestamp,
  ...extra,
});

const enter = (zoneId: string, ts: number, conf = 0.8): ZoneEvent =>
  event('zone_enter', zoneId, ts, { confidence: conf });

const leave = (zoneId: string, ts: number, duration: number): ZoneEvent =>
  event('zone_leave', zoneId, ts, { duration });

const fixStart = (zoneId: string, ts: number, conf = 0.8): ZoneEvent =>
  event('fixation_start', zoneId, ts, { confidence: conf });

const fixEnd = (zoneId: string, ts: number, duration: number): ZoneEvent =>
  event('fixation_end', zoneId, ts, { duration });

const zone = (id: string, x: number, y: number, w: number, h: number): Zone => ({
  id, label: id, rect: { x, y, width: w, height: h }, priority: 0,
});

const rect = (x: number, y: number, w: number, h: number): ZoneRect => ({
  x, y, width: w, height: h,
});

/** Standard session: A(300ms with fixation) → B(200ms with fixation) → A(100ms no fixation) */
const standardSession = (): ZoneEvent[] => [
  enter('A', 0, 0.9),
  fixStart('A', 0, 0.9),
  fixEnd('A', 300, 300),
  leave('A', 300, 300),
  enter('B', 300, 0.7),
  fixStart('B', 300, 0.7),
  fixEnd('B', 500, 200),
  leave('B', 500, 200),
  enter('A', 500, 0.85),
  leave('A', 600, 100),
];

const standardZones = (): Zone[] => [
  zone('A', 0, 0, 200, 200),
  zone('B', 200, 0, 200, 200),
];

// ---------------------------------------------------------------------------
// Feature flag
// ---------------------------------------------------------------------------

describe('EYE_TRACKING_V2_ENABLED', () => {
  it('is enabled (v0.86+ production wiring)', () => {
    expect(EYE_TRACKING_V2_ENABLED).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// computeZoneMetrics — basic
// ---------------------------------------------------------------------------

describe('computeZoneMetrics — basic', () => {
  it('empty events → zero metrics for all zones', () => {
    const metrics = computeZoneMetrics([], ['A', 'B']);
    expect(metrics['A'].totalDwellTime).toBe(0);
    expect(metrics['A'].fixationCount).toBe(0);
    expect(metrics['A'].visitCount).toBe(0);
    expect(metrics['A'].firstEntryTimestamp).toBe(0);
    expect(metrics['A'].avgConfidence).toBe(0);
  });

  it('single enter/leave pair computes dwell time', () => {
    const events: ZoneEvent[] = [
      enter('A', 100),
      leave('A', 400, 300),
    ];
    const metrics = computeZoneMetrics(events, ['A']);
    expect(metrics['A'].totalDwellTime).toBe(300);
    expect(metrics['A'].visitCount).toBe(1);
    expect(metrics['A'].firstEntryTimestamp).toBe(100);
  });

  it('fixation_start increments fixation count', () => {
    const events: ZoneEvent[] = [
      enter('A', 0),
      fixStart('A', 0),
      fixEnd('A', 200, 200),
      leave('A', 200, 200),
    ];
    const metrics = computeZoneMetrics(events, ['A']);
    expect(metrics['A'].fixationCount).toBe(1);
  });

  it('multiple visits accumulate dwell time', () => {
    const events: ZoneEvent[] = [
      enter('A', 0),    leave('A', 100, 100),
      enter('B', 100),  leave('B', 200, 100),
      enter('A', 200),  leave('A', 500, 300),
    ];
    const metrics = computeZoneMetrics(events, ['A', 'B']);
    expect(metrics['A'].totalDwellTime).toBe(400); // 100 + 300
    expect(metrics['A'].visitCount).toBe(2);
    expect(metrics['B'].totalDwellTime).toBe(100);
    expect(metrics['B'].visitCount).toBe(1);
  });

  it('firstEntryTimestamp is the earliest enter', () => {
    const events: ZoneEvent[] = [
      enter('A', 500),
      leave('A', 600, 100),
      enter('A', 1000),
      leave('A', 1200, 200),
    ];
    const metrics = computeZoneMetrics(events, ['A']);
    expect(metrics['A'].firstEntryTimestamp).toBe(500);
  });

  it('zones with no events get zero metrics', () => {
    const events: ZoneEvent[] = [
      enter('A', 0), leave('A', 100, 100),
    ];
    const metrics = computeZoneMetrics(events, ['A', 'B', 'C']);
    expect(metrics['B'].totalDwellTime).toBe(0);
    expect(metrics['B'].visitCount).toBe(0);
    expect(metrics['C'].fixationCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computeZoneMetrics — confidence
// ---------------------------------------------------------------------------

describe('computeZoneMetrics — confidence', () => {
  it('avgConfidence is mean of enter + fixation_start confidences', () => {
    const events: ZoneEvent[] = [
      enter('A', 0, 0.9),        // conf 0.9
      fixStart('A', 0, 0.7),     // conf 0.7
      fixEnd('A', 200, 200),
      leave('A', 200, 200),
    ];
    const metrics = computeZoneMetrics(events, ['A']);
    expect(metrics['A'].avgConfidence).toBeCloseTo(0.8, 5); // (0.9 + 0.7) / 2
  });

  it('no enter/fixation → avgConfidence 0', () => {
    const metrics = computeZoneMetrics([], ['A']);
    expect(metrics['A'].avgConfidence).toBe(0);
  });

  it('multiple visits average all confidences', () => {
    const events: ZoneEvent[] = [
      enter('A', 0, 0.6), leave('A', 100, 100),
      enter('A', 200, 0.8), leave('A', 300, 100),
      enter('A', 400, 1.0), leave('A', 500, 100),
    ];
    const metrics = computeZoneMetrics(events, ['A']);
    expect(metrics['A'].avgConfidence).toBeCloseTo(0.8, 5); // (0.6 + 0.8 + 1.0) / 3
  });
});

// ---------------------------------------------------------------------------
// computeZoneMetrics — standard session
// ---------------------------------------------------------------------------

describe('computeZoneMetrics — standard session', () => {
  const events = standardSession();
  const metrics = computeZoneMetrics(events, ['A', 'B']);

  it('zone A: 2 visits, 400ms total dwell, 1 fixation', () => {
    expect(metrics['A'].visitCount).toBe(2);
    expect(metrics['A'].totalDwellTime).toBe(400); // 300 + 100
    expect(metrics['A'].fixationCount).toBe(1);
    expect(metrics['A'].firstEntryTimestamp).toBe(0);
  });

  it('zone B: 1 visit, 200ms dwell, 1 fixation', () => {
    expect(metrics['B'].visitCount).toBe(1);
    expect(metrics['B'].totalDwellTime).toBe(200);
    expect(metrics['B'].fixationCount).toBe(1);
    expect(metrics['B'].firstEntryTimestamp).toBe(300);
  });
});

// ---------------------------------------------------------------------------
// computeZoneMetrics — edge cases
// ---------------------------------------------------------------------------

describe('computeZoneMetrics — edge cases', () => {
  it('events with null zoneId are ignored', () => {
    const events: ZoneEvent[] = [
      enter('A', 0), leave('A', 100, 100),
      event('zone_enter', null, 200),
      event('zone_leave', null, 300, { duration: 100 }),
    ];
    const metrics = computeZoneMetrics(events, ['A']);
    expect(metrics['A'].totalDwellTime).toBe(100);
  });

  it('events for unknown zones (not in zoneIds) are ignored', () => {
    const events: ZoneEvent[] = [
      enter('X', 0), leave('X', 100, 100), // X not in zoneIds
    ];
    const metrics = computeZoneMetrics(events, ['A']);
    expect(metrics['A'].totalDwellTime).toBe(0);
    expect(metrics['X']).toBeUndefined();
  });

  it('leave without enter still accumulates dwell time', () => {
    // Edge case: event stream starts mid-session
    const events: ZoneEvent[] = [leave('A', 500, 500)];
    const metrics = computeZoneMetrics(events, ['A']);
    expect(metrics['A'].totalDwellTime).toBe(500);
  });

  it('zero-duration leave', () => {
    const events: ZoneEvent[] = [
      enter('A', 0), leave('A', 0, 0),
    ];
    const metrics = computeZoneMetrics(events, ['A']);
    expect(metrics['A'].totalDwellTime).toBe(0);
    expect(metrics['A'].visitCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// generateBackwardFixations
// ---------------------------------------------------------------------------

describe('generateBackwardFixations', () => {
  const lookup = new Map<string, ZoneRect>([
    ['A', rect(0, 0, 200, 200)],
    ['B', rect(200, 0, 200, 200)],
  ]);

  it('paired fixation_start/end → one fixation at zone centroid', () => {
    const events: ZoneEvent[] = [
      fixStart('A', 100),
      fixEnd('A', 400, 300),
    ];
    const fixations = generateBackwardFixations(events, lookup);
    expect(fixations).toHaveLength(1);
    expect(fixations[0].x).toBe(100); // centroid of (0,0,200,200)
    expect(fixations[0].y).toBe(100);
    expect(fixations[0].duration).toBe(300);
    expect(fixations[0].timestamp).toBe(100);
  });

  it('multiple fixations → multiple entries', () => {
    const events: ZoneEvent[] = [
      fixStart('A', 0), fixEnd('A', 200, 200),
      fixStart('B', 300), fixEnd('B', 500, 200),
    ];
    const fixations = generateBackwardFixations(events, lookup);
    expect(fixations).toHaveLength(2);
    expect(fixations[0].x).toBe(100); // A centroid
    expect(fixations[1].x).toBe(300); // B centroid (200 + 200/2)
  });

  it('empty events → empty fixations', () => {
    expect(generateBackwardFixations([], lookup)).toEqual([]);
  });

  it('fixation_start without matching end → no fixation', () => {
    const events: ZoneEvent[] = [fixStart('A', 0)];
    expect(generateBackwardFixations(events, lookup)).toEqual([]);
  });

  it('fixation_end without start → no fixation', () => {
    const events: ZoneEvent[] = [fixEnd('A', 200, 200)];
    expect(generateBackwardFixations(events, lookup)).toEqual([]);
  });

  it('unknown zone in fixation → skipped', () => {
    const events: ZoneEvent[] = [
      fixStart('X', 0), fixEnd('X', 200, 200), // X not in lookup
    ];
    expect(generateBackwardFixations(events, lookup)).toEqual([]);
  });

  it('fixation centroid is rounded to integer', () => {
    const oddLookup = new Map<string, ZoneRect>([
      ['odd', rect(0, 0, 101, 101)], // centroid = 50.5
    ]);
    const events: ZoneEvent[] = [fixStart('odd', 0), fixEnd('odd', 200, 200)];
    const fixations = generateBackwardFixations(events, oddLookup);
    expect(fixations[0].x).toBe(51); // Math.round(50.5)
  });

  it('standard session produces correct fixations', () => {
    const fixations = generateBackwardFixations(standardSession(), lookup);
    expect(fixations).toHaveLength(2);
    expect(fixations[0].x).toBe(100); // A centroid
    expect(fixations[0].duration).toBe(300);
    expect(fixations[1].x).toBe(300); // B centroid
    expect(fixations[1].duration).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// generateBackwardZoneMass
// ---------------------------------------------------------------------------

describe('generateBackwardZoneMass', () => {
  it('proportional to dwell time', () => {
    const metrics: Record<string, ZoneMetrics> = {
      A: { totalDwellTime: 300, fixationCount: 1, avgConfidence: 0.8, firstEntryTimestamp: 0, visitCount: 1 },
      B: { totalDwellTime: 100, fixationCount: 1, avgConfidence: 0.7, firstEntryTimestamp: 300, visitCount: 1 },
    };
    const mass = generateBackwardZoneMass(metrics);
    expect(mass['A']).toBeCloseTo(0.75, 5); // 300/400
    expect(mass['B']).toBeCloseTo(0.25, 5); // 100/400
  });

  it('sums to 1.0', () => {
    const events = standardSession();
    const metrics = computeZoneMetrics(events, ['A', 'B']);
    const mass = generateBackwardZoneMass(metrics);
    const total = Object.values(mass).reduce((s, v) => s + v, 0);
    expect(total).toBeCloseTo(1.0, 5);
  });

  it('all zero dwell → all zero mass', () => {
    const metrics: Record<string, ZoneMetrics> = {
      A: { totalDwellTime: 0, fixationCount: 0, avgConfidence: 0, firstEntryTimestamp: 0, visitCount: 0 },
      B: { totalDwellTime: 0, fixationCount: 0, avgConfidence: 0, firstEntryTimestamp: 0, visitCount: 0 },
    };
    const mass = generateBackwardZoneMass(metrics);
    expect(mass['A']).toBe(0);
    expect(mass['B']).toBe(0);
  });

  it('single zone gets 100%', () => {
    const metrics: Record<string, ZoneMetrics> = {
      A: { totalDwellTime: 500, fixationCount: 1, avgConfidence: 0.9, firstEntryTimestamp: 0, visitCount: 1 },
    };
    const mass = generateBackwardZoneMass(metrics);
    expect(mass['A']).toBeCloseTo(1.0, 5);
  });

  it('empty metrics → empty mass', () => {
    expect(generateBackwardZoneMass({})).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// extractZoneDefinitions
// ---------------------------------------------------------------------------

describe('extractZoneDefinitions', () => {
  it('extracts id, label, rect from zones', () => {
    const zones = standardZones();
    const defs = extractZoneDefinitions(zones);
    expect(defs).toHaveLength(2);
    expect(defs[0]).toEqual({ id: 'A', label: 'A', rect: { x: 0, y: 0, width: 200, height: 200 } });
    expect(defs[1]).toEqual({ id: 'B', label: 'B', rect: { x: 200, y: 0, width: 200, height: 200 } });
  });

  it('empty zones → empty definitions', () => {
    expect(extractZoneDefinitions([])).toEqual([]);
  });

  it('does not include priority', () => {
    const defs = extractZoneDefinitions([zone('X', 0, 0, 100, 100)]);
    expect(defs[0]).not.toHaveProperty('priority');
  });
});

// ---------------------------------------------------------------------------
// firstZoneObserved
// ---------------------------------------------------------------------------

describe('firstZoneObserved', () => {
  it('returns zone with earliest firstEntryTimestamp', () => {
    const events = standardSession();
    const metrics = computeZoneMetrics(events, ['A', 'B']);
    expect(firstZoneObserved(metrics)).toBe('A');
  });

  it('returns null when no zones were visited', () => {
    const metrics = computeZoneMetrics([], ['A', 'B']);
    expect(firstZoneObserved(metrics)).toBeNull();
  });

  it('B first when B entered before A', () => {
    const events: ZoneEvent[] = [
      enter('B', 50), leave('B', 150, 100),
      enter('A', 200), leave('A', 300, 100),
    ];
    const metrics = computeZoneMetrics(events, ['A', 'B']);
    expect(firstZoneObserved(metrics)).toBe('B');
  });
});

// ---------------------------------------------------------------------------
// explorationOrder
// ---------------------------------------------------------------------------

describe('explorationOrder', () => {
  it('returns zones in order of first entry', () => {
    const events = standardSession();
    const metrics = computeZoneMetrics(events, ['A', 'B']);
    expect(explorationOrder(metrics)).toEqual(['A', 'B']);
  });

  it('excludes zones never visited', () => {
    const events: ZoneEvent[] = [enter('B', 100), leave('B', 200, 100)];
    const metrics = computeZoneMetrics(events, ['A', 'B', 'C']);
    expect(explorationOrder(metrics)).toEqual(['B']);
  });

  it('empty events → empty order', () => {
    const metrics = computeZoneMetrics([], ['A', 'B']);
    expect(explorationOrder(metrics)).toEqual([]);
  });

  it('reverse order entry', () => {
    const events: ZoneEvent[] = [
      enter('C', 0), leave('C', 50, 50),
      enter('B', 50), leave('B', 100, 50),
      enter('A', 100), leave('A', 150, 50),
    ];
    const metrics = computeZoneMetrics(events, ['A', 'B', 'C']);
    expect(explorationOrder(metrics)).toEqual(['C', 'B', 'A']);
  });
});

// ---------------------------------------------------------------------------
// buildV2Response — full builder
// ---------------------------------------------------------------------------

describe('buildV2Response', () => {
  const defaultCalibration = {
    method: 'blazegaze-13pt',
    rmsePx: 45,
    pointCount: 13,
    persistent: false,
  };

  const defaultMetadata = {
    trackingMethod: 'blazegaze-v2' as const,
    deviceType: 'desktop',
    uncertaintyRadius: 120,
    hysteresisMs: 200,
    gazeSampleCount: 500,
    pipeline: 'zone-event-v2' as const,
  };

  it('produces a valid V2Response', () => {
    const response = buildV2Response({
      events: standardSession(),
      zones: standardZones(),
      calibration: defaultCalibration,
      metadata: defaultMetadata,
    });

    expect(response.version).toBe(2);
    expect(response.zoneEvents).toHaveLength(10);
    expect(Object.keys(response.zoneMetrics)).toEqual(['A', 'B']);
    expect(response.zones).toHaveLength(2);
    expect(response.calibration).toEqual(defaultCalibration);
    expect(response.metadata).toEqual(defaultMetadata);
  });

  it('zoneMetrics match standalone computation', () => {
    const events = standardSession();
    const zones = standardZones();
    const response = buildV2Response({ events, zones, calibration: defaultCalibration, metadata: defaultMetadata });
    const standalone = computeZoneMetrics(events, ['A', 'B']);
    expect(response.zoneMetrics).toEqual(standalone);
  });

  it('backward fixations are generated', () => {
    const response = buildV2Response({
      events: standardSession(),
      zones: standardZones(),
      calibration: defaultCalibration,
      metadata: defaultMetadata,
    });
    expect(response.fixations).toHaveLength(2);
    expect(response.fixations[0].x).toBe(100); // A centroid
    expect(response.fixations[1].x).toBe(300); // B centroid
  });

  it('backward zoneMass is generated and sums to ~1.0', () => {
    const response = buildV2Response({
      events: standardSession(),
      zones: standardZones(),
      calibration: defaultCalibration,
      metadata: defaultMetadata,
    });
    const total = Object.values(response.zoneMass).reduce((s, v) => s + v, 0);
    expect(total).toBeCloseTo(1.0, 5);
    expect(response.zoneMass['A']).toBeGreaterThan(response.zoneMass['B']); // A has more dwell
  });

  it('zoneEvents is a copy (not reference)', () => {
    const events = standardSession();
    const response = buildV2Response({ events, zones: standardZones(), calibration: defaultCalibration, metadata: defaultMetadata });
    expect(response.zoneEvents).not.toBe(events);
    expect(response.zoneEvents).toEqual(events);
  });

  it('empty session produces valid response with zero metrics', () => {
    const response = buildV2Response({
      events: [],
      zones: standardZones(),
      calibration: defaultCalibration,
      metadata: defaultMetadata,
    });
    expect(response.version).toBe(2);
    expect(response.zoneEvents).toEqual([]);
    expect(response.zoneMetrics['A'].totalDwellTime).toBe(0);
    expect(response.fixations).toEqual([]);
    expect(response.zoneMass['A']).toBe(0);
  });

  it('response is serializable to JSON', () => {
    const response = buildV2Response({
      events: standardSession(),
      zones: standardZones(),
      calibration: defaultCalibration,
      metadata: defaultMetadata,
    });
    const json = JSON.stringify(response);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(2);
    expect(parsed.zoneEvents).toHaveLength(10);
    expect(parsed.zoneMetrics.A.totalDwellTime).toBe(400);
  });

  it('response payload is smaller than raw coordinate data', () => {
    // Simulate: 500 gaze samples × ~40 bytes each = ~20KB
    // V2 response: 10 events + 2 metrics + 2 fixations = much smaller
    const response = buildV2Response({
      events: standardSession(),
      zones: standardZones(),
      calibration: defaultCalibration,
      metadata: defaultMetadata,
    });
    const jsonSize = JSON.stringify(response).length;
    const rawCoordsSize = 500 * 40; // estimated 500 gaze samples
    expect(jsonSize).toBeLessThan(rawCoordsSize);
  });
});

// ---------------------------------------------------------------------------
// buildV2Response — with emotions
// ---------------------------------------------------------------------------

describe('buildV2Response — emotion events', () => {
  it('emotion is preserved in zoneEvents', () => {
    const events: ZoneEvent[] = [
      { type: 'zone_enter', zoneId: 'A', confidence: 0.8, timestamp: 0, emotion: 'joy' },
      { type: 'zone_leave', zoneId: 'A', confidence: 0.8, timestamp: 200, duration: 200, emotion: 'surprise' },
    ];
    const response = buildV2Response({
      events,
      zones: [zone('A', 0, 0, 200, 200)],
      calibration: { method: 'test', rmsePx: 0, pointCount: 0, persistent: false },
      metadata: { trackingMethod: 'blazegaze-v2', deviceType: 'desktop', uncertaintyRadius: 120, hysteresisMs: 200, gazeSampleCount: 10, pipeline: 'zone-event-v2' },
    });

    expect(response.zoneEvents[0].emotion).toBe('joy');
    expect(response.zoneEvents[1].emotion).toBe('surprise');
  });
});

// ---------------------------------------------------------------------------
// Invariants across random sessions
// ---------------------------------------------------------------------------

describe('V2Response — invariants', () => {
  it('zoneMass keys match zone IDs', () => {
    const zones = standardZones();
    const response = buildV2Response({
      events: standardSession(),
      zones,
      calibration: { method: 'test', rmsePx: 0, pointCount: 0, persistent: false },
      metadata: { trackingMethod: 'blazegaze-v2', deviceType: 'desktop', uncertaintyRadius: 120, hysteresisMs: 200, gazeSampleCount: 100, pipeline: 'zone-event-v2' },
    });
    expect(Object.keys(response.zoneMass).sort()).toEqual(zones.map((z) => z.id).sort());
  });

  it('zoneMetrics keys match zone IDs', () => {
    const zones = standardZones();
    const response = buildV2Response({
      events: standardSession(),
      zones,
      calibration: { method: 'test', rmsePx: 0, pointCount: 0, persistent: false },
      metadata: { trackingMethod: 'blazegaze-v2', deviceType: 'desktop', uncertaintyRadius: 120, hysteresisMs: 200, gazeSampleCount: 100, pipeline: 'zone-event-v2' },
    });
    expect(Object.keys(response.zoneMetrics).sort()).toEqual(zones.map((z) => z.id).sort());
  });

  it('fixation count matches fixation pairs in events', () => {
    const events = standardSession();
    const fixPairs = events.filter((e) => e.type === 'fixation_start').length;
    const response = buildV2Response({
      events,
      zones: standardZones(),
      calibration: { method: 'test', rmsePx: 0, pointCount: 0, persistent: false },
      metadata: { trackingMethod: 'blazegaze-v2', deviceType: 'desktop', uncertaintyRadius: 120, hysteresisMs: 200, gazeSampleCount: 100, pipeline: 'zone-event-v2' },
    });
    expect(response.fixations).toHaveLength(fixPairs);
  });

  it('total dwell across all zones equals session duration', () => {
    // Standard session: enters at 0, last leave at 600 → 600ms total
    const events = standardSession();
    const metrics = computeZoneMetrics(events, ['A', 'B']);
    const totalDwell = Object.values(metrics).reduce((s, m) => s + m.totalDwellTime, 0);
    expect(totalDwell).toBe(600); // 300 + 200 + 100
  });
});
