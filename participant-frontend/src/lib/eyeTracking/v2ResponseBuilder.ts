/**
 * V2 Response Builder — constructs the zone-event response payload.
 *
 * Transforms raw ZoneEvents into:
 *   1. zoneEvents[]   — the primary data (enter/leave/fixation events)
 *   2. zoneMetrics{}   — per-zone aggregates (dwell time, fixation count, etc.)
 *   3. zones[]         — zone definitions used during the session
 *   4. Backward-compat fields (fixations[], zoneMass{}) for V1 analytics
 *
 * All pure functions — no side effects, no DOM access.
 */

import type { Zone, ZoneRect } from './zoneRegistry';
import type { ZoneEvent } from './zoneEventEmitter';

// ---------------------------------------------------------------------------
// Feature flag
// ---------------------------------------------------------------------------

/**
 * When true, the pipeline produces V2 zone-event responses.
 * When false, the legacy V1 coordinate-based pipeline is used.
 * ponytail: simple boolean, flip when ready
 */
export const EYE_TRACKING_V2_ENABLED = true;

// ---------------------------------------------------------------------------
// V2 Response types
// ---------------------------------------------------------------------------

export interface ZoneMetrics {
  readonly totalDwellTime: number;
  readonly fixationCount: number;
  readonly avgConfidence: number;
  readonly firstEntryTimestamp: number;
  readonly visitCount: number;
}

export interface ZoneDefinition {
  readonly id: string;
  readonly label: string;
  readonly rect: ZoneRect;
}

export interface V2CalibrationInfo {
  readonly method: string;
  readonly rmsePx: number;
  readonly pointCount: number;
  readonly persistent: boolean;
}

export interface V2Metadata {
  readonly trackingMethod: 'blazegaze-v2' | 'click-proxy';
  readonly deviceType: string;
  readonly uncertaintyRadius: number;
  readonly hysteresisMs: number;
  readonly gazeSampleCount: number;
  readonly pipeline: 'zone-event-v2';
}

export interface V2Response {
  readonly version: 2;
  readonly zoneEvents: ZoneEvent[];
  readonly zoneMetrics: Record<string, ZoneMetrics>;
  readonly zones: ZoneDefinition[];
  readonly calibration: V2CalibrationInfo;
  readonly metadata: V2Metadata;
  // Backward compat — generated from zoneEvents for V1 analytics
  readonly fixations: BackwardCompatFixation[];
  readonly zoneMass: Record<string, number>;
}

/** Backward-compat fixation for V1 analytics. */
export interface BackwardCompatFixation {
  readonly x: number;
  readonly y: number;
  readonly duration: number;
  readonly timestamp: number;
}

// ---------------------------------------------------------------------------
// Zone metrics computation
// ---------------------------------------------------------------------------

/**
 * Compute per-zone metrics from a list of zone events.
 *
 * @param events — zone events sorted by timestamp
 * @param zoneIds — all zone IDs to include (ensures zones with no visits get zero metrics)
 */
export function computeZoneMetrics(
  events: readonly ZoneEvent[],
  zoneIds: readonly string[],
): Record<string, ZoneMetrics> {
  // Accumulator per zone
  const acc = new Map<string, {
    totalDwellTime: number;
    fixationCount: number;
    confidenceSum: number;
    confidenceCount: number;
    firstEntryTimestamp: number;
    visitCount: number;
  }>();

  // Initialize all zones (-1 = never entered)
  zoneIds.forEach((id) => acc.set(id, {
    totalDwellTime: 0,
    fixationCount: 0,
    confidenceSum: 0,
    confidenceCount: 0,
    firstEntryTimestamp: -1,
    visitCount: 0,
  }));

  events.forEach((event) => {
    const zoneId = event.zoneId;
    const entry = zoneId ? acc.get(zoneId) : undefined;
    if (entry) { applyEvent(entry, event); }
  });

  const result: Record<string, ZoneMetrics> = {};
  acc.forEach((a, id) => {
    result[id] = {
      totalDwellTime: a.totalDwellTime,
      fixationCount: a.fixationCount,
      avgConfidence: a.confidenceCount > 0 ? a.confidenceSum / a.confidenceCount : 0,
      firstEntryTimestamp: a.firstEntryTimestamp === -1 ? 0 : a.firstEntryTimestamp,
      visitCount: a.visitCount,
    };
  });

  return result;
}

const applyEvent = (
  acc: {
    totalDwellTime: number;
    fixationCount: number;
    confidenceSum: number;
    confidenceCount: number;
    firstEntryTimestamp: number;
    visitCount: number;
  },
  event: ZoneEvent,
): void => {
  switch (event.type) {
    case 'zone_enter':
      acc.visitCount += 1;
      acc.confidenceSum += event.confidence;
      acc.confidenceCount += 1;
      acc.firstEntryTimestamp = acc.firstEntryTimestamp === -1
        ? event.timestamp
        : acc.firstEntryTimestamp;
      break;
    case 'zone_leave':
      acc.totalDwellTime += event.duration ?? 0;
      break;
    case 'fixation_start':
      acc.fixationCount += 1;
      acc.confidenceSum += event.confidence;
      acc.confidenceCount += 1;
      break;
    case 'fixation_end':
      // Duration already captured in zone_leave
      break;
  }
};

// ---------------------------------------------------------------------------
// Backward compatibility: fixations from zone events
// ---------------------------------------------------------------------------

/**
 * Generate backward-compat fixations from zone events.
 * Each fixation_start/fixation_end pair → one fixation at the zone centroid.
 */
export function generateBackwardFixations(
  events: readonly ZoneEvent[],
  zoneLookup: ReadonlyMap<string, ZoneRect>,
): BackwardCompatFixation[] {
  const fixations: BackwardCompatFixation[] = [];
  let pendingFixation: { zoneId: string; timestamp: number } | null = null;

  events.forEach((event) => {
    if (event.type === 'fixation_start' && event.zoneId) {
      pendingFixation = {
        zoneId: event.zoneId,
        timestamp: event.timestamp,
      };
    }

    if (event.type === 'fixation_end' && pendingFixation) {
      const rect = zoneLookup.get(pendingFixation.zoneId);
      if (rect) {
        fixations.push({
          x: Math.round(rect.x + rect.width / 2),
          y: Math.round(rect.y + rect.height / 2),
          duration: event.duration ?? 0,
          timestamp: pendingFixation.timestamp,
        });
      }
      pendingFixation = null;
    }
  });

  return fixations;
}

// ---------------------------------------------------------------------------
// Backward compatibility: zoneMass from zone metrics
// ---------------------------------------------------------------------------

/**
 * Generate backward-compat zoneMass (normalized dwell proportions) from zone metrics.
 */
export function generateBackwardZoneMass(
  metrics: Record<string, ZoneMetrics>,
): Record<string, number> {
  const totalDwell = Object.values(metrics).reduce((sum, m) => sum + m.totalDwellTime, 0);
  const result: Record<string, number> = {};

  Object.entries(metrics).forEach(([id, m]) => {
    result[id] = totalDwell > 0 ? m.totalDwellTime / totalDwell : 0;
  });

  return result;
}

// ---------------------------------------------------------------------------
// Zone definitions from Zone[]
// ---------------------------------------------------------------------------

export function extractZoneDefinitions(zones: readonly Zone[]): ZoneDefinition[] {
  return zones.map((z) => ({
    id: z.id,
    label: z.label,
    rect: { ...z.rect },
  }));
}

// ---------------------------------------------------------------------------
// First zone observed
// ---------------------------------------------------------------------------

/**
 * The first zone entered during the session.
 */
export function firstZoneObserved(
  metrics: Record<string, ZoneMetrics>,
): string | null {
  let earliest: string | null = null;
  let minTs = Infinity;

  Object.entries(metrics).forEach(([id, m]) => {
    if (m.visitCount > 0 && m.firstEntryTimestamp < minTs) {
      minTs = m.firstEntryTimestamp;
      earliest = id;
    }
  });

  return earliest;
}

// ---------------------------------------------------------------------------
// Exploration order
// ---------------------------------------------------------------------------

/**
 * Ordered sequence of unique zone IDs visited (by first entry timestamp).
 */
export function explorationOrder(
  metrics: Record<string, ZoneMetrics>,
): string[] {
  return Object.entries(metrics)
    .filter(([, m]) => m.visitCount > 0)
    .sort(([, a], [, b]) => a.firstEntryTimestamp - b.firstEntryTimestamp)
    .map(([id]) => id);
}

// ---------------------------------------------------------------------------
// Full V2 response builder
// ---------------------------------------------------------------------------

/**
 * Build a complete V2 response from collected zone events and session context.
 */
export function buildV2Response(params: {
  events: readonly ZoneEvent[];
  zones: readonly Zone[];
  calibration: V2CalibrationInfo;
  metadata: V2Metadata;
}): V2Response {
  const zoneIds = params.zones.map((z) => z.id);
  const zoneMetrics = computeZoneMetrics(params.events, zoneIds);

  const zoneLookup = new Map<string, ZoneRect>();
  params.zones.forEach((z) => zoneLookup.set(z.id, z.rect));

  return {
    version: 2,
    zoneEvents: [...params.events],
    zoneMetrics,
    zones: extractZoneDefinitions(params.zones),
    calibration: params.calibration,
    metadata: params.metadata,
    fixations: generateBackwardFixations(params.events, zoneLookup),
    zoneMass: generateBackwardZoneMass(zoneMetrics),
  };
}
