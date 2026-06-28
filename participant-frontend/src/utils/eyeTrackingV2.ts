/**
 * V2 Eye Tracking display utilities for the test page.
 * Thin wrappers over v2ResponseBuilder computations.
 */

import { computeZoneMetrics, type ZoneMetrics } from '../lib/eyeTracking/v2ResponseBuilder';

// Re-export for convenience
export { computeZoneMetrics, type ZoneMetrics };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface V2ZoneDefinition {
  readonly id: string;
  readonly label: string;
  readonly rect: { x: number; y: number; width: number; height: number };
}

export interface ZoneDwellBar {
  readonly zoneId: string;
  readonly label: string;
  readonly dwellMs: number;
  readonly dwellPercent: number;
}

export interface ZoneAttentionSummary {
  readonly totalZones: number;
  readonly visitedZones: number;
  readonly totalDwellMs: number;
  readonly totalFixations: number;
  readonly avgConfidence: number;
  readonly firstZone: { zoneId: string; label: string } | null;
}

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

export function buildDwellBars(
  metrics: Record<string, ZoneMetrics>,
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

export function firstZoneObserved(
  metrics: Record<string, ZoneMetrics>,
): { zoneId: string; timestamp: number } | null {
  let earliest: { zoneId: string; timestamp: number } | null = null;
  Object.entries(metrics).forEach(([id, m]) => {
    if (m.visitCount > 0 && (!earliest || m.firstEntryTimestamp < earliest.timestamp)) {
      earliest = { zoneId: id, timestamp: m.firstEntryTimestamp };
    }
  });
  return earliest;
}

export function explorationOrder(
  metrics: Record<string, ZoneMetrics>,
  zones: readonly V2ZoneDefinition[],
): Array<{ zoneId: string; label: string; timestamp: number }> {
  const labelMap = new Map(zones.map((z) => [z.id, z.label]));
  return Object.entries(metrics)
    .filter(([, m]) => m.visitCount > 0)
    .sort(([, a], [, b]) => a.firstEntryTimestamp - b.firstEntryTimestamp)
    .map(([id, m]) => ({ zoneId: id, label: labelMap.get(id) ?? id, timestamp: m.firstEntryTimestamp }));
}

export function buildAttentionSummary(
  metrics: Record<string, ZoneMetrics>,
  zones: readonly V2ZoneDefinition[],
): ZoneAttentionSummary {
  const labelMap = new Map(zones.map((z) => [z.id, z.label]));
  const entries = Object.entries(metrics);
  const visited = entries.filter(([, m]) => m.visitCount > 0);
  const confSum = visited.reduce((s, [, m]) => s + m.avgConfidence, 0);
  const first = firstZoneObserved(metrics);
  return {
    totalZones: entries.length,
    visitedZones: visited.length,
    totalDwellMs: entries.reduce((s, [, m]) => s + m.totalDwellTime, 0),
    totalFixations: entries.reduce((s, [, m]) => s + m.fixationCount, 0),
    avgConfidence: visited.length > 0 ? confSum / visited.length : 0,
    firstZone: first ? { zoneId: first.zoneId, label: labelMap.get(first.zoneId) ?? first.zoneId } : null,
  };
}

export function formatDwellTime(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}

export function formatPercent(pct: number): string {
  return pct >= 10 ? `${Math.round(pct)}%` : `${pct.toFixed(1)}%`;
}
