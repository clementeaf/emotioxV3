/**
 * V2 Eye Tracking data utilities for the results UI.
 *
 * Detects V2 zone-event data in analytics responses, extracts metrics,
 * and generates display-ready structures. All pure functions.
 */

// ---------------------------------------------------------------------------
// Types (subset of backend V2 response, as seen in analytics API output)
// ---------------------------------------------------------------------------

export interface V2ZoneMetrics {
  readonly totalDwellTime: number;
  readonly fixationCount: number;
  readonly avgConfidence: number;
  readonly firstEntryTimestamp: number;
  readonly visitCount: number;
}

export interface V2ZoneDefinition {
  readonly id: string;
  readonly label: string;
  readonly rect: { x: number; y: number; width: number; height: number };
}

export interface V2ParticipantResponse {
  readonly version: 2;
  readonly zoneMetrics: Record<string, V2ZoneMetrics>;
  readonly zones: V2ZoneDefinition[];
  readonly zoneEvents: Array<{
    type: string;
    zoneId: string | null;
    confidence: number;
    timestamp: number;
    duration?: number;
    emotion?: string;
  }>;
}

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

/**
 * Check whether an analytics stimulus response contains V2 zone data.
 * V2 data is identified by the presence of aggregated zoneMetrics
 * from the backend V2 analytics adapter.
 */
export function hasV2ZoneData(stimulus: {
  zoneMass?: Record<string, number>;
  heatmapData?: Array<{ x: number; y: number; duration: number }>;
}): boolean {
  const mass = stimulus.zoneMass;
  return mass !== undefined
    && mass !== null
    && Object.keys(mass).length > 0
    && Object.values(mass).some((v) => v > 0);
}

// ---------------------------------------------------------------------------
// Bar chart data
// ---------------------------------------------------------------------------

export interface ZoneDwellBar {
  readonly zoneId: string;
  readonly label: string;
  readonly dwellMs: number;
  readonly dwellPercent: number;
}

/**
 * Generate bar chart data for time-per-zone visualization.
 * Sorted by dwell time descending.
 */
export function buildDwellBars(
  metrics: Record<string, V2ZoneMetrics>,
  zones: readonly V2ZoneDefinition[],
): ZoneDwellBar[] {
  const labelMap = new Map(zones.map((z) => [z.id, z.label]));
  const totalDwell = Object.values(metrics).reduce((sum, m) => sum + m.totalDwellTime, 0);

  return Object.entries(metrics)
    .map(([id, m]) => ({
      zoneId: id,
      label: labelMap.get(id) ?? id,
      dwellMs: m.totalDwellTime,
      dwellPercent: totalDwell > 0 ? (m.totalDwellTime / totalDwell) * 100 : 0,
    }))
    .sort((a, b) => b.dwellMs - a.dwellMs);
}

// ---------------------------------------------------------------------------
// First zone observed
// ---------------------------------------------------------------------------

/**
 * The first zone entered during the session.
 * Returns null when no zones were visited.
 */
export function firstZoneObserved(
  metrics: Record<string, V2ZoneMetrics>,
): { zoneId: string; timestamp: number } | null {
  let earliest: { zoneId: string; timestamp: number } | null = null;

  Object.entries(metrics).forEach(([id, m]) => {
    if (m.visitCount > 0 && (!earliest || m.firstEntryTimestamp < earliest.timestamp)) {
      earliest = { zoneId: id, timestamp: m.firstEntryTimestamp };
    }
  });

  return earliest;
}

// ---------------------------------------------------------------------------
// Exploration order
// ---------------------------------------------------------------------------

/**
 * Ordered sequence of unique zone IDs visited, by first entry timestamp.
 */
export function explorationOrder(
  metrics: Record<string, V2ZoneMetrics>,
  zones: readonly V2ZoneDefinition[],
): Array<{ zoneId: string; label: string; timestamp: number }> {
  const labelMap = new Map(zones.map((z) => [z.id, z.label]));

  return Object.entries(metrics)
    .filter(([, m]) => m.visitCount > 0)
    .sort(([, a], [, b]) => a.firstEntryTimestamp - b.firstEntryTimestamp)
    .map(([id, m]) => ({
      zoneId: id,
      label: labelMap.get(id) ?? id,
      timestamp: m.firstEntryTimestamp,
    }));
}

// ---------------------------------------------------------------------------
// Confidence summary
// ---------------------------------------------------------------------------

/**
 * Average confidence across all zones with visits.
 */
export function avgConfidence(
  metrics: Record<string, V2ZoneMetrics>,
): number {
  const visited = Object.values(metrics).filter((m) => m.visitCount > 0);
  const sum = visited.reduce((s, m) => s + m.avgConfidence, 0);
  return visited.length > 0 ? sum / visited.length : 0;
}

// ---------------------------------------------------------------------------
// Zone attention summary
// ---------------------------------------------------------------------------

export interface ZoneAttentionSummary {
  readonly totalZones: number;
  readonly visitedZones: number;
  readonly totalDwellMs: number;
  readonly totalFixations: number;
  readonly avgConfidence: number;
  readonly firstZone: { zoneId: string; label: string } | null;
}

/**
 * High-level attention summary from zone metrics.
 */
export function buildAttentionSummary(
  metrics: Record<string, V2ZoneMetrics>,
  zones: readonly V2ZoneDefinition[],
): ZoneAttentionSummary {
  const labelMap = new Map(zones.map((z) => [z.id, z.label]));
  const entries = Object.entries(metrics);
  const visited = entries.filter(([, m]) => m.visitCount > 0);
  const first = firstZoneObserved(metrics);

  return {
    totalZones: entries.length,
    visitedZones: visited.length,
    totalDwellMs: entries.reduce((s, [, m]) => s + m.totalDwellTime, 0),
    totalFixations: entries.reduce((s, [, m]) => s + m.fixationCount, 0),
    avgConfidence: avgConfidence(metrics),
    firstZone: first
      ? { zoneId: first.zoneId, label: labelMap.get(first.zoneId) ?? first.zoneId }
      : null,
  };
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

/**
 * Format milliseconds as human-readable duration.
 */
export function formatDwellTime(ms: number): string {
  return ms >= 1000
    ? `${(ms / 1000).toFixed(1)}s`
    : `${Math.round(ms)}ms`;
}

/**
 * Format percentage for display.
 */
export function formatPercent(pct: number): string {
  return pct >= 10
    ? `${Math.round(pct)}%`
    : `${pct.toFixed(1)}%`;
}
