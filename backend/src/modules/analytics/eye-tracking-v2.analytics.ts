/**
 * V2 Eye Tracking Analytics Adapter
 *
 * Extracts metrics from V2 zone-event responses natively.
 * Falls back to V1 fixation-based extraction when `version !== 2`.
 *
 * The output shape matches the existing V1 analytics interface, so
 * `computeEyeTrackingMetrics` consumers don't need changes.
 *
 * Pure functions — no DB access, no side effects.
 */

// ---------------------------------------------------------------------------
// Types (mirrored from participant-frontend V2 response)
// ---------------------------------------------------------------------------

interface ZoneEvent {
  type: 'zone_enter' | 'zone_leave' | 'fixation_start' | 'fixation_end';
  zoneId: string | null;
  confidence: number;
  timestamp: number;
  duration?: number;
  emotion?: string;
}

interface ZoneMetrics {
  totalDwellTime: number;
  fixationCount: number;
  avgConfidence: number;
  firstEntryTimestamp: number;
  visitCount: number;
}

interface ZoneDefinition {
  id: string;
  label: string;
  rect: { x: number; y: number; width: number; height: number };
}

interface V2ResponsePayload {
  version: 2;
  zoneEvents: ZoneEvent[];
  zoneMetrics: Record<string, ZoneMetrics>;
  zones: ZoneDefinition[];
  calibration: {
    method: string;
    rmsePx: number;
    pointCount: number;
    persistent: boolean;
  };
  metadata: {
    trackingMethod: string;
    deviceType: string;
    uncertaintyRadius: number;
    hysteresisMs: number;
    gazeSampleCount: number;
    pipeline: string;
  };
  // Backward compat
  fixations?: Array<{ x: number; y: number; duration: number; timestamp: number }>;
  zoneMass?: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Version detection
// ---------------------------------------------------------------------------

/**
 * Detect whether a parsed response payload is V2.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isV2Response(parsed: any): parsed is V2ResponsePayload {
  return parsed.version === 2
    && Array.isArray(parsed.zoneEvents)
    && typeof parsed.zoneMetrics === 'object'
    && parsed.zoneMetrics !== null;
}

// ---------------------------------------------------------------------------
// V2 participant extraction
// ---------------------------------------------------------------------------

export interface V2ParticipantData {
  participantId: string;
  calibrationQuality: string;
  calibrationRmsePx: number | null;
  integrityScore: number;
  totalFixations: number;
  totalDwellTime: number;
  emotions: Array<{ timestamp: number; emotion: string; confidence: number }>;
  /** Fixations for heatmap + AOI (from backward-compat or zone centroids) */
  fixations: Array<{ x: number; y: number; duration: number; timestamp: number }>;
  /** Zone metrics from V2 response */
  zoneMetrics: Record<string, ZoneMetrics>;
  /** Zone events for sequence analysis */
  zoneEvents: ZoneEvent[];
  /** Zone definitions */
  zones: ZoneDefinition[];
}

/**
 * Extract participant data from a V2 response row.
 */
export function extractV2ParticipantData(
  participantId: string,
  payload: V2ResponsePayload,
): V2ParticipantData {
  const totalDwellTime = Object.values(payload.zoneMetrics)
    .reduce((sum, m) => sum + m.totalDwellTime, 0);

  const totalFixations = Object.values(payload.zoneMetrics)
    .reduce((sum, m) => sum + m.fixationCount, 0);

  // Backward-compat fixations (generated client-side from zone centroids)
  const fixations = payload.fixations ?? [];

  // Extract emotions from zone events
  const emotions: Array<{ timestamp: number; emotion: string; confidence: number }> = [];
  payload.zoneEvents
    .filter((e) => e.emotion)
    .forEach((e) => {
      emotions.push({
        timestamp: e.timestamp,
        emotion: e.emotion!,
        confidence: e.confidence,
      });
    });

  return {
    participantId,
    calibrationQuality: payload.calibration.method,
    calibrationRmsePx: payload.calibration.rmsePx,
    integrityScore: totalFixations > 0 ? 1.0 : 0,
    totalFixations,
    totalDwellTime,
    emotions,
    fixations,
    zoneMetrics: payload.zoneMetrics,
    zoneEvents: payload.zoneEvents,
    zones: payload.zones,
  };
}

// ---------------------------------------------------------------------------
// Heatmap from zone centroids
// ---------------------------------------------------------------------------

/**
 * Generate heatmap data from V2 zone metrics.
 * Each zone produces a point at its centroid, weighted by dwell time.
 */
export function v2HeatmapFromZones(
  zones: readonly ZoneDefinition[],
  metrics: Record<string, ZoneMetrics>,
): Array<{ x: number; y: number; duration: number }> {
  return zones
    .filter((z) => (metrics[z.id]?.totalDwellTime ?? 0) > 0)
    .map((z) => ({
      x: Math.round(z.rect.x + z.rect.width / 2),
      y: Math.round(z.rect.y + z.rect.height / 2),
      duration: metrics[z.id].totalDwellTime,
    }));
}

// ---------------------------------------------------------------------------
// Sequence analysis from zone events
// ---------------------------------------------------------------------------

export interface V2SequenceAnalysis {
  participantSequences: Array<{ participantId: string; sequence: string[] }>;
  transitionMatrix: Record<string, Record<string, number>>;
  aoiLabels: string[];
}

/**
 * Build sequence analysis directly from V2 zone events.
 * Each zone_enter event represents a visit — consecutive duplicates deduplicated.
 */
export function v2SequenceAnalysis(
  participantDataList: readonly V2ParticipantData[],
): V2SequenceAnalysis | undefined {
  // Collect all zone labels
  const labelSet = new Set<string>();
  participantDataList.forEach((p) =>
    p.zones.forEach((z) => labelSet.add(z.label))
  );
  const aoiLabels = [...labelSet].sort();

  const zoneLabelLookup = new Map<string, string>();
  participantDataList.forEach((p) =>
    p.zones.forEach((z) => zoneLabelLookup.set(z.id, z.label))
  );

  const hasMultipleZones = aoiLabels.length >= 2;
  return hasMultipleZones
    ? buildSequences(participantDataList, aoiLabels, zoneLabelLookup)
    : undefined;
}

function buildSequences(
  participants: readonly V2ParticipantData[],
  aoiLabels: string[],
  labelLookup: ReadonlyMap<string, string>,
): V2SequenceAnalysis {
  const participantSequences: Array<{ participantId: string; sequence: string[] }> = [];

  // Initialize transition counts
  const transitionCounts: Record<string, Record<string, number>> = {};
  aoiLabels.forEach((from) => {
    transitionCounts[from] = {};
    aoiLabels.forEach((to) => { transitionCounts[from][to] = 0; });
  });

  participants.forEach((p) => {
    const enters = p.zoneEvents
      .filter((e) => e.type === 'zone_enter' && e.zoneId)
      .map((e) => labelLookup.get(e.zoneId!) ?? e.zoneId!);

    // Deduplicate consecutive
    const seq: string[] = [];
    enters.forEach((label) => {
      (seq.length === 0 || seq[seq.length - 1] !== label) && seq.push(label);
    });

    participantSequences.push({ participantId: p.participantId, sequence: seq });

    // Count transitions
    for (let i = 0; i < seq.length - 1; i++) {
      const from = seq[i];
      const to = seq[i + 1];
      transitionCounts[from]?.[to] !== undefined && transitionCounts[from][to]++;
    }
  });

  // Normalize to percentages
  const transitionMatrix: Record<string, Record<string, number>> = {};
  aoiLabels.forEach((from) => {
    const rowSum = Object.values(transitionCounts[from]).reduce((a, b) => a + b, 0);
    transitionMatrix[from] = {};
    aoiLabels.forEach((to) => {
      transitionMatrix[from][to] = rowSum > 0
        ? Math.round((transitionCounts[from][to] / rowSum) * 100)
        : 0;
    });
  });

  return { participantSequences, transitionMatrix, aoiLabels };
}

// ---------------------------------------------------------------------------
// First zone & exploration order
// ---------------------------------------------------------------------------

/**
 * First zone observed across all participants (earliest first-entry timestamp).
 */
export function v2FirstZoneObserved(
  participantDataList: readonly V2ParticipantData[],
): string | null {
  let earliest: string | null = null;
  let minTs = Infinity;

  participantDataList.forEach((p) => {
    Object.entries(p.zoneMetrics).forEach(([id, m]) => {
      m.visitCount > 0 && m.firstEntryTimestamp < minTs && (() => {
        minTs = m.firstEntryTimestamp;
        earliest = id;
      })();
    });
  });

  return earliest;
}

/**
 * Exploration order: unique zones visited, ordered by earliest first-entry across participants.
 */
export function v2ExplorationOrder(
  participantDataList: readonly V2ParticipantData[],
): string[] {
  const earliest = new Map<string, number>();

  participantDataList.forEach((p) => {
    Object.entries(p.zoneMetrics).forEach(([id, m]) => {
      m.visitCount > 0 && (() => {
        const current = earliest.get(id) ?? Infinity;
        m.firstEntryTimestamp < current && earliest.set(id, m.firstEntryTimestamp);
      })();
    });
  });

  return [...earliest.entries()]
    .sort(([, a], [, b]) => a - b)
    .map(([id]) => id);
}

// ---------------------------------------------------------------------------
// Aggregate zone metrics across participants
// ---------------------------------------------------------------------------

/**
 * Aggregate zone metrics across multiple V2 participants.
 */
export function v2AggregateZoneMetrics(
  participantDataList: readonly V2ParticipantData[],
): Record<string, ZoneMetrics> {
  const acc = new Map<string, {
    totalDwellTime: number;
    fixationCount: number;
    confidenceSum: number;
    confidenceCount: number;
    firstEntryTimestamp: number;
    visitCount: number;
  }>();

  participantDataList.forEach((p) => {
    Object.entries(p.zoneMetrics).forEach(([id, m]) => {
      const existing = acc.get(id) ?? {
        totalDwellTime: 0, fixationCount: 0,
        confidenceSum: 0, confidenceCount: 0,
        firstEntryTimestamp: Infinity, visitCount: 0,
      };
      existing.totalDwellTime += m.totalDwellTime;
      existing.fixationCount += m.fixationCount;
      existing.visitCount += m.visitCount;
      m.avgConfidence > 0 && (() => {
        existing.confidenceSum += m.avgConfidence;
        existing.confidenceCount += 1;
      })();
      m.visitCount > 0 && m.firstEntryTimestamp < existing.firstEntryTimestamp
        && (existing.firstEntryTimestamp = m.firstEntryTimestamp);
      acc.set(id, existing);
    });
  });

  const result: Record<string, ZoneMetrics> = {};
  acc.forEach((a, id) => {
    result[id] = {
      totalDwellTime: a.totalDwellTime,
      fixationCount: a.fixationCount,
      avgConfidence: a.confidenceCount > 0 ? a.confidenceSum / a.confidenceCount : 0,
      firstEntryTimestamp: a.firstEntryTimestamp === Infinity ? 0 : a.firstEntryTimestamp,
      visitCount: a.visitCount,
    };
  });

  return result;
}
