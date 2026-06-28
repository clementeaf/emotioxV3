import { describe, it, expect } from 'vitest';
import {
  isV2Response,
  extractV2ParticipantData,
  v2HeatmapFromZones,
  v2SequenceAnalysis,
  v2FirstZoneObserved,
  v2ExplorationOrder,
  v2AggregateZoneMetrics,
  type V2ParticipantData,
} from '../eye-tracking-v2.analytics';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const zoneEvent = (
  type: 'zone_enter' | 'zone_leave' | 'fixation_start' | 'fixation_end',
  zoneId: string | null,
  timestamp: number,
  extra: Record<string, unknown> = {},
) => ({
  type, zoneId, confidence: 0.8, timestamp, ...extra,
});

const zoneDef = (id: string, x: number, y: number, w: number, h: number) => ({
  id, label: id, rect: { x, y, width: w, height: h },
});

const zoneMetrics = (dwell: number, fixations: number, firstEntry: number, visits: number, conf = 0.8) => ({
  totalDwellTime: dwell,
  fixationCount: fixations,
  avgConfidence: conf,
  firstEntryTimestamp: firstEntry,
  visitCount: visits,
});

/** Standard V2 response payload. */
const makeV2Payload = (overrides: Record<string, unknown> = {}) => ({
  version: 2 as const,
  zoneEvents: [
    zoneEvent('zone_enter', 'A', 0, { confidence: 0.9 }),
    zoneEvent('fixation_start', 'A', 0, { confidence: 0.9 }),
    zoneEvent('fixation_end', 'A', 300, { duration: 300 }),
    zoneEvent('zone_leave', 'A', 300, { duration: 300 }),
    zoneEvent('zone_enter', 'B', 300, { confidence: 0.7 }),
    zoneEvent('fixation_start', 'B', 300, { confidence: 0.7 }),
    zoneEvent('fixation_end', 'B', 500, { duration: 200 }),
    zoneEvent('zone_leave', 'B', 500, { duration: 200 }),
  ],
  zoneMetrics: {
    A: zoneMetrics(300, 1, 0, 1, 0.9),
    B: zoneMetrics(200, 1, 300, 1, 0.7),
  },
  zones: [
    zoneDef('A', 0, 0, 200, 200),
    zoneDef('B', 200, 0, 200, 200),
  ],
  calibration: { method: 'blazegaze-13pt', rmsePx: 45, pointCount: 13, persistent: false },
  metadata: {
    trackingMethod: 'blazegaze-v2',
    deviceType: 'desktop',
    uncertaintyRadius: 120,
    hysteresisMs: 200,
    gazeSampleCount: 500,
    pipeline: 'zone-event-v2',
  },
  fixations: [
    { x: 100, y: 100, duration: 300, timestamp: 0 },
    { x: 300, y: 100, duration: 200, timestamp: 300 },
  ],
  zoneMass: { A: 0.6, B: 0.4 },
  ...overrides,
});

const makeV1Payload = () => ({
  fixations: [{ x: 100, y: 200, duration: 250, timestamp: 0 }],
  zoneMass: { r0c0: 0.5, r0c1: 0.3, r1c0: 0.2 },
  calibrationQuality: 'blazegaze-13pt',
  calibrationRmsePx: 50,
  integrityScore: 0.9,
  trackingMethod: 'blazegaze',
  gazePipeline: 'hybrid-zone-idt',
});

const makeParticipant = (
  id: string,
  metricsOverride?: Record<string, ReturnType<typeof zoneMetrics>>,
  eventsOverride?: ReturnType<typeof zoneEvent>[],
  zonesOverride?: ReturnType<typeof zoneDef>[],
): V2ParticipantData => {
  const payload = makeV2Payload({
    ...(metricsOverride && { zoneMetrics: metricsOverride }),
    ...(eventsOverride && { zoneEvents: eventsOverride }),
    ...(zonesOverride && { zones: zonesOverride }),
  });
  return extractV2ParticipantData(id, payload as any);
};

// ---------------------------------------------------------------------------
// isV2Response
// ---------------------------------------------------------------------------

describe('isV2Response', () => {
  it('V2 payload → true', () => {
    expect(isV2Response(makeV2Payload() as any)).toBe(true);
  });

  it('V1 payload → false', () => {
    expect(isV2Response(makeV1Payload() as any)).toBe(false);
  });

  it('missing version → false', () => {
    const { version, ...rest } = makeV2Payload();
    expect(isV2Response(rest as any)).toBe(false);
  });

  it('version 1 → false', () => {
    expect(isV2Response({ ...makeV2Payload(), version: 1 } as any)).toBe(false);
  });

  it('missing zoneEvents → false', () => {
    const { zoneEvents, ...rest } = makeV2Payload();
    expect(isV2Response({ ...rest, version: 2 } as any)).toBe(false);
  });

  it('missing zoneMetrics → false', () => {
    const { zoneMetrics, ...rest } = makeV2Payload();
    expect(isV2Response({ ...rest, version: 2 } as any)).toBe(false);
  });

  it('null zoneMetrics → false', () => {
    expect(isV2Response({ ...makeV2Payload(), zoneMetrics: null } as any)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// extractV2ParticipantData
// ---------------------------------------------------------------------------

describe('extractV2ParticipantData', () => {
  const payload = makeV2Payload();
  const data = extractV2ParticipantData('P1', payload as any);

  it('extracts participant ID', () => {
    expect(data.participantId).toBe('P1');
  });

  it('computes total dwell time from zone metrics', () => {
    expect(data.totalDwellTime).toBe(500); // 300 + 200
  });

  it('computes total fixations from zone metrics', () => {
    expect(data.totalFixations).toBe(2); // 1 + 1
  });

  it('extracts calibration info', () => {
    expect(data.calibrationQuality).toBe('blazegaze-13pt');
    expect(data.calibrationRmsePx).toBe(45);
  });

  it('extracts backward-compat fixations', () => {
    expect(data.fixations).toHaveLength(2);
    expect(data.fixations[0].x).toBe(100);
  });

  it('extracts zone metrics', () => {
    expect(data.zoneMetrics['A'].totalDwellTime).toBe(300);
    expect(data.zoneMetrics['B'].visitCount).toBe(1);
  });

  it('extracts emotions from zone events', () => {
    const withEmotions = makeV2Payload({
      zoneEvents: [
        zoneEvent('zone_enter', 'A', 0, { emotion: 'joy' }),
        zoneEvent('zone_leave', 'A', 200, { duration: 200, emotion: 'surprise' }),
      ],
    });
    const d = extractV2ParticipantData('P2', withEmotions as any);
    expect(d.emotions).toHaveLength(2);
    expect(d.emotions[0].emotion).toBe('joy');
    expect(d.emotions[1].emotion).toBe('surprise');
  });

  it('empty zone events → zero totals', () => {
    const empty = makeV2Payload({
      zoneEvents: [],
      zoneMetrics: { A: zoneMetrics(0, 0, 0, 0, 0) },
    });
    const d = extractV2ParticipantData('P3', empty as any);
    expect(d.totalDwellTime).toBe(0);
    expect(d.totalFixations).toBe(0);
    expect(d.integrityScore).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// v2HeatmapFromZones
// ---------------------------------------------------------------------------

describe('v2HeatmapFromZones', () => {
  const zones = [zoneDef('A', 0, 0, 200, 200), zoneDef('B', 200, 0, 200, 200)];

  it('generates heatmap points at zone centroids', () => {
    const metrics = {
      A: zoneMetrics(300, 1, 0, 1),
      B: zoneMetrics(200, 1, 300, 1),
    };
    const heatmap = v2HeatmapFromZones(zones, metrics);
    expect(heatmap).toHaveLength(2);
    expect(heatmap[0]).toEqual({ x: 100, y: 100, duration: 300 });
    expect(heatmap[1]).toEqual({ x: 300, y: 100, duration: 200 });
  });

  it('excludes zones with zero dwell time', () => {
    const metrics = {
      A: zoneMetrics(300, 1, 0, 1),
      B: zoneMetrics(0, 0, 0, 0),
    };
    const heatmap = v2HeatmapFromZones(zones, metrics);
    expect(heatmap).toHaveLength(1);
    expect(heatmap[0].x).toBe(100);
  });

  it('empty zones → empty heatmap', () => {
    expect(v2HeatmapFromZones([], {})).toEqual([]);
  });

  it('duration reflects actual dwell time', () => {
    const metrics = { A: zoneMetrics(1500, 3, 0, 5) };
    const heatmap = v2HeatmapFromZones([zones[0]], metrics);
    expect(heatmap[0].duration).toBe(1500);
  });

  it('centroid is rounded to integer', () => {
    const oddZone = zoneDef('odd', 0, 0, 101, 101);
    const metrics = { odd: zoneMetrics(100, 1, 0, 1) };
    const heatmap = v2HeatmapFromZones([oddZone], metrics);
    expect(heatmap[0].x).toBe(51); // Math.round(50.5)
  });
});

// ---------------------------------------------------------------------------
// v2SequenceAnalysis
// ---------------------------------------------------------------------------

describe('v2SequenceAnalysis', () => {
  it('builds sequence from zone_enter events', () => {
    const p1 = makeParticipant('P1');
    const result = v2SequenceAnalysis([p1]);

    expect(result).not.toBeUndefined();
    expect(result!.participantSequences).toHaveLength(1);
    expect(result!.participantSequences[0].sequence).toEqual(['A', 'B']);
  });

  it('deduplicates consecutive same-zone entries', () => {
    const events = [
      zoneEvent('zone_enter', 'A', 0),
      zoneEvent('zone_leave', 'A', 100, { duration: 100 }),
      zoneEvent('zone_enter', 'A', 100), // re-enter same zone
      zoneEvent('zone_leave', 'A', 200, { duration: 100 }),
      zoneEvent('zone_enter', 'B', 200),
    ];
    const p = makeParticipant('P1', undefined, events as any);
    const result = v2SequenceAnalysis([p]);
    expect(result!.participantSequences[0].sequence).toEqual(['A', 'B']);
  });

  it('transition matrix sums to 100% per row', () => {
    const p1 = makeParticipant('P1');
    const result = v2SequenceAnalysis([p1]);

    Object.values(result!.transitionMatrix).forEach((row) => {
      const sum = Object.values(row).reduce((a, b) => a + b, 0);
      // Either 100% or 0% (no transitions from that zone)
      expect(sum === 0 || sum === 100).toBe(true);
    });
  });

  it('returns undefined when fewer than 2 zones', () => {
    const p = makeParticipant('P1', { A: zoneMetrics(300, 1, 0, 1) }, [
      zoneEvent('zone_enter', 'A', 0),
    ] as any, [zoneDef('A', 0, 0, 200, 200)]);
    expect(v2SequenceAnalysis([p])).toBeUndefined();
  });

  it('multiple participants contribute to transition matrix', () => {
    const p1 = makeParticipant('P1'); // A → B
    const events2 = [
      zoneEvent('zone_enter', 'B', 0),
      zoneEvent('zone_leave', 'B', 100, { duration: 100 }),
      zoneEvent('zone_enter', 'A', 100),
    ];
    const p2 = makeParticipant('P2', undefined, events2 as any); // B → A

    const result = v2SequenceAnalysis([p1, p2]);
    // A→B: 1 transition, B→A: 1 transition
    expect(result!.transitionMatrix['A']['B']).toBe(100);
    expect(result!.transitionMatrix['B']['A']).toBe(100);
  });

  it('empty events → empty sequences', () => {
    const p = makeParticipant('P1', undefined, [] as any);
    const result = v2SequenceAnalysis([p]);
    expect(result!.participantSequences[0].sequence).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// v2FirstZoneObserved
// ---------------------------------------------------------------------------

describe('v2FirstZoneObserved', () => {
  it('returns zone with earliest firstEntryTimestamp', () => {
    const p1 = makeParticipant('P1');
    expect(v2FirstZoneObserved([p1])).toBe('A'); // A at 0, B at 300
  });

  it('across participants, returns the globally earliest', () => {
    const p1 = makeParticipant('P1', { A: zoneMetrics(300, 1, 100, 1), B: zoneMetrics(200, 1, 400, 1) });
    const p2 = makeParticipant('P2', { A: zoneMetrics(300, 1, 200, 1), B: zoneMetrics(200, 1, 50, 1) });
    expect(v2FirstZoneObserved([p1, p2])).toBe('B'); // P2 entered B at 50
  });

  it('returns null when no participants', () => {
    expect(v2FirstZoneObserved([])).toBeNull();
  });

  it('returns null when no zones visited', () => {
    const p = makeParticipant('P1', { A: zoneMetrics(0, 0, 0, 0) });
    expect(v2FirstZoneObserved([p])).toBeNull();
  });

  it('handles timestamp 0 correctly', () => {
    const p = makeParticipant('P1', {
      A: zoneMetrics(100, 1, 0, 1),
      B: zoneMetrics(100, 1, 50, 1),
    });
    expect(v2FirstZoneObserved([p])).toBe('A');
  });
});

// ---------------------------------------------------------------------------
// v2ExplorationOrder
// ---------------------------------------------------------------------------

describe('v2ExplorationOrder', () => {
  it('returns zones ordered by earliest entry', () => {
    const p1 = makeParticipant('P1');
    expect(v2ExplorationOrder([p1])).toEqual(['A', 'B']);
  });

  it('excludes unvisited zones', () => {
    const p = makeParticipant('P1', {
      A: zoneMetrics(300, 1, 0, 1),
      B: zoneMetrics(0, 0, 0, 0),
      C: zoneMetrics(100, 1, 500, 1),
    });
    expect(v2ExplorationOrder([p])).toEqual(['A', 'C']);
  });

  it('across participants, uses globally earliest per zone', () => {
    const p1 = makeParticipant('P1', { A: zoneMetrics(100, 1, 200, 1), B: zoneMetrics(100, 1, 100, 1) });
    const p2 = makeParticipant('P2', { A: zoneMetrics(100, 1, 50, 1), B: zoneMetrics(100, 1, 300, 1) });
    // A: min(200, 50) = 50; B: min(100, 300) = 100
    expect(v2ExplorationOrder([p1, p2])).toEqual(['A', 'B']);
  });

  it('empty participants → empty order', () => {
    expect(v2ExplorationOrder([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// v2AggregateZoneMetrics
// ---------------------------------------------------------------------------

describe('v2AggregateZoneMetrics', () => {
  it('sums dwell time and fixations across participants', () => {
    const p1 = makeParticipant('P1', { A: zoneMetrics(300, 2, 0, 1) });
    const p2 = makeParticipant('P2', { A: zoneMetrics(200, 1, 100, 1) });

    const agg = v2AggregateZoneMetrics([p1, p2]);
    expect(agg['A'].totalDwellTime).toBe(500);
    expect(agg['A'].fixationCount).toBe(3);
    expect(agg['A'].visitCount).toBe(2);
  });

  it('firstEntryTimestamp is the global minimum', () => {
    const p1 = makeParticipant('P1', { A: zoneMetrics(100, 1, 200, 1) });
    const p2 = makeParticipant('P2', { A: zoneMetrics(100, 1, 50, 1) });

    const agg = v2AggregateZoneMetrics([p1, p2]);
    expect(agg['A'].firstEntryTimestamp).toBe(50);
  });

  it('avgConfidence is mean across participants with data', () => {
    const p1 = makeParticipant('P1', { A: zoneMetrics(100, 1, 0, 1, 0.6) });
    const p2 = makeParticipant('P2', { A: zoneMetrics(100, 1, 0, 1, 1.0) });

    const agg = v2AggregateZoneMetrics([p1, p2]);
    expect(agg['A'].avgConfidence).toBeCloseTo(0.8, 5);
  });

  it('empty participants → empty metrics', () => {
    expect(v2AggregateZoneMetrics([])).toEqual({});
  });

  it('multiple zones aggregated independently', () => {
    const p1 = makeParticipant('P1', {
      A: zoneMetrics(300, 2, 0, 1),
      B: zoneMetrics(200, 1, 300, 1),
    });
    const agg = v2AggregateZoneMetrics([p1]);
    expect(agg['A'].totalDwellTime).toBe(300);
    expect(agg['B'].totalDwellTime).toBe(200);
  });

  it('unvisited zones get zero firstEntryTimestamp', () => {
    const p = makeParticipant('P1', { A: zoneMetrics(0, 0, 0, 0, 0) });
    const agg = v2AggregateZoneMetrics([p]);
    expect(agg['A'].firstEntryTimestamp).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Integration: V2 payload → full analytics pipeline
// ---------------------------------------------------------------------------

describe('V2 analytics — integration', () => {
  it('V2 payload → participant data → heatmap → sequence → metrics', () => {
    const payload = makeV2Payload();
    const participant = extractV2ParticipantData('P1', payload as any);

    // Heatmap
    const heatmap = v2HeatmapFromZones(participant.zones, participant.zoneMetrics);
    expect(heatmap).toHaveLength(2);
    expect(heatmap[0].duration).toBe(300);

    // Sequence
    const sequence = v2SequenceAnalysis([participant]);
    expect(sequence).not.toBeUndefined();
    expect(sequence!.participantSequences[0].sequence).toEqual(['A', 'B']);

    // Aggregated metrics
    const agg = v2AggregateZoneMetrics([participant]);
    expect(agg['A'].totalDwellTime).toBe(300);
    expect(agg['B'].totalDwellTime).toBe(200);

    // First zone
    expect(v2FirstZoneObserved([participant])).toBe('A');

    // Exploration order
    expect(v2ExplorationOrder([participant])).toEqual(['A', 'B']);
  });

  it('mixed V1 and V2 detection works', () => {
    expect(isV2Response(makeV2Payload() as any)).toBe(true);
    expect(isV2Response(makeV1Payload() as any)).toBe(false);
  });
});
