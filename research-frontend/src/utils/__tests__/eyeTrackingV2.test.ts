import { describe, it, expect } from 'vitest';
import {
  hasV2ZoneData,
  buildDwellBars,
  firstZoneObserved,
  explorationOrder,
  avgConfidence,
  buildAttentionSummary,
  formatDwellTime,
  formatPercent,
  type V2ZoneMetrics,
  type V2ZoneDefinition,
} from '../eyeTrackingV2';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const zm = (dwell: number, fix: number, firstEntry: number, visits: number, conf = 0.8): V2ZoneMetrics => ({
  totalDwellTime: dwell,
  fixationCount: fix,
  avgConfidence: conf,
  firstEntryTimestamp: firstEntry,
  visitCount: visits,
});

const zd = (id: string, label?: string): V2ZoneDefinition => ({
  id,
  label: label ?? id,
  rect: { x: 0, y: 0, width: 100, height: 100 },
});

const standardMetrics = (): Record<string, V2ZoneMetrics> => ({
  A: zm(300, 2, 0, 2, 0.9),
  B: zm(200, 1, 300, 1, 0.7),
  C: zm(0, 0, 0, 0, 0),
});

const standardZones = (): V2ZoneDefinition[] => [zd('A'), zd('B'), zd('C')];

// ---------------------------------------------------------------------------
// hasV2ZoneData
// ---------------------------------------------------------------------------

describe('hasV2ZoneData', () => {
  it('returns true when zoneMass has positive values', () => {
    expect(hasV2ZoneData({ zoneMass: { A: 0.6, B: 0.4 } })).toBe(true);
  });

  it('returns false when zoneMass is undefined', () => {
    expect(hasV2ZoneData({ heatmapData: [] })).toBe(false);
  });

  it('returns false when zoneMass is null', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(hasV2ZoneData({ zoneMass: null as any })).toBe(false);
  });

  it('returns false when zoneMass is empty object', () => {
    expect(hasV2ZoneData({ zoneMass: {} })).toBe(false);
  });

  it('returns false when all values are 0', () => {
    expect(hasV2ZoneData({ zoneMass: { A: 0, B: 0, C: 0 } })).toBe(false);
  });

  it('returns true when at least one value is > 0', () => {
    expect(hasV2ZoneData({ zoneMass: { A: 0, B: 0.01, C: 0 } })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildDwellBars
// ---------------------------------------------------------------------------

describe('buildDwellBars', () => {
  it('generates bars sorted by dwell time descending', () => {
    const bars = buildDwellBars(standardMetrics(), standardZones());
    expect(bars[0].zoneId).toBe('A');
    expect(bars[1].zoneId).toBe('B');
    expect(bars[2].zoneId).toBe('C');
  });

  it('dwell percentages sum to ~100% for visited zones', () => {
    const metrics = { A: zm(300, 1, 0, 1), B: zm(200, 1, 300, 1) };
    const bars = buildDwellBars(metrics, [zd('A'), zd('B')]);
    const total = bars.reduce((s, b) => s + b.dwellPercent, 0);
    expect(total).toBeCloseTo(100, 1);
  });

  it('dwell percentages correct', () => {
    const metrics = { A: zm(300, 1, 0, 1), B: zm(200, 1, 300, 1) };
    const bars = buildDwellBars(metrics, [zd('A'), zd('B')]);
    expect(bars[0].dwellPercent).toBeCloseTo(60, 1); // 300/500
    expect(bars[1].dwellPercent).toBeCloseTo(40, 1); // 200/500
  });

  it('uses zone label from definitions', () => {
    const bars = buildDwellBars({ hero: zm(100, 1, 0, 1) }, [zd('hero', 'Hero Image')]);
    expect(bars[0].label).toBe('Hero Image');
  });

  it('falls back to zone ID when no matching definition', () => {
    const bars = buildDwellBars({ unknown: zm(100, 1, 0, 1) }, []);
    expect(bars[0].label).toBe('unknown');
  });

  it('empty metrics → empty bars', () => {
    expect(buildDwellBars({}, [])).toEqual([]);
  });

  it('all zero dwell → all zero percent', () => {
    const bars = buildDwellBars(
      { A: zm(0, 0, 0, 0), B: zm(0, 0, 0, 0) },
      [zd('A'), zd('B')],
    );
    bars.forEach((b) => expect(b.dwellPercent).toBe(0));
  });

  it('single zone gets 100%', () => {
    const bars = buildDwellBars({ A: zm(500, 1, 0, 1) }, [zd('A')]);
    expect(bars[0].dwellPercent).toBeCloseTo(100, 1);
  });
});

// ---------------------------------------------------------------------------
// firstZoneObserved
// ---------------------------------------------------------------------------

describe('firstZoneObserved', () => {
  it('returns zone with earliest firstEntryTimestamp', () => {
    const result = firstZoneObserved(standardMetrics());
    expect(result).not.toBeNull();
    expect(result!.zoneId).toBe('A');
    expect(result!.timestamp).toBe(0);
  });

  it('returns null when no zones visited', () => {
    expect(firstZoneObserved({ A: zm(0, 0, 0, 0) })).toBeNull();
  });

  it('returns null for empty metrics', () => {
    expect(firstZoneObserved({})).toBeNull();
  });

  it('handles timestamp 0 correctly', () => {
    const metrics = {
      A: zm(100, 1, 0, 1),
      B: zm(100, 1, 50, 1),
    };
    expect(firstZoneObserved(metrics)!.zoneId).toBe('A');
  });

  it('B first when B entered before A', () => {
    const metrics = {
      A: zm(100, 1, 200, 1),
      B: zm(100, 1, 50, 1),
    };
    expect(firstZoneObserved(metrics)!.zoneId).toBe('B');
  });
});

// ---------------------------------------------------------------------------
// explorationOrder
// ---------------------------------------------------------------------------

describe('explorationOrder', () => {
  it('returns zones ordered by first entry', () => {
    const order = explorationOrder(standardMetrics(), standardZones());
    expect(order.map((o) => o.zoneId)).toEqual(['A', 'B']);
  });

  it('excludes unvisited zones', () => {
    const order = explorationOrder(standardMetrics(), standardZones());
    expect(order.map((o) => o.zoneId)).not.toContain('C');
  });

  it('includes labels', () => {
    const order = explorationOrder(
      { hero: zm(100, 1, 0, 1), nav: zm(50, 1, 200, 1) },
      [zd('hero', 'Hero Image'), zd('nav', 'Navigation')],
    );
    expect(order[0].label).toBe('Hero Image');
    expect(order[1].label).toBe('Navigation');
  });

  it('includes timestamps', () => {
    const order = explorationOrder(standardMetrics(), standardZones());
    expect(order[0].timestamp).toBe(0);
    expect(order[1].timestamp).toBe(300);
  });

  it('empty metrics → empty order', () => {
    expect(explorationOrder({}, [])).toEqual([]);
  });

  it('reverse order', () => {
    const metrics = {
      C: zm(100, 1, 0, 1),
      B: zm(100, 1, 100, 1),
      A: zm(100, 1, 200, 1),
    };
    const order = explorationOrder(metrics, [zd('A'), zd('B'), zd('C')]);
    expect(order.map((o) => o.zoneId)).toEqual(['C', 'B', 'A']);
  });
});

// ---------------------------------------------------------------------------
// avgConfidence
// ---------------------------------------------------------------------------

describe('avgConfidence', () => {
  it('averages confidence of visited zones', () => {
    expect(avgConfidence(standardMetrics())).toBeCloseTo(0.8, 5); // (0.9 + 0.7) / 2
  });

  it('excludes unvisited zones', () => {
    const metrics = {
      A: zm(100, 1, 0, 1, 0.9),
      B: zm(0, 0, 0, 0, 0),
    };
    expect(avgConfidence(metrics)).toBeCloseTo(0.9, 5);
  });

  it('returns 0 when no zones visited', () => {
    expect(avgConfidence({ A: zm(0, 0, 0, 0, 0) })).toBe(0);
  });

  it('returns 0 for empty metrics', () => {
    expect(avgConfidence({})).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// buildAttentionSummary
// ---------------------------------------------------------------------------

describe('buildAttentionSummary', () => {
  const summary = buildAttentionSummary(standardMetrics(), standardZones());

  it('counts total and visited zones', () => {
    expect(summary.totalZones).toBe(3);
    expect(summary.visitedZones).toBe(2);
  });

  it('sums total dwell time', () => {
    expect(summary.totalDwellMs).toBe(500); // 300 + 200 + 0
  });

  it('sums total fixations', () => {
    expect(summary.totalFixations).toBe(3); // 2 + 1 + 0
  });

  it('computes average confidence', () => {
    expect(summary.avgConfidence).toBeCloseTo(0.8, 5);
  });

  it('identifies first zone with label', () => {
    expect(summary.firstZone).not.toBeNull();
    expect(summary.firstZone!.zoneId).toBe('A');
    expect(summary.firstZone!.label).toBe('A');
  });

  it('firstZone is null when no zones visited', () => {
    const s = buildAttentionSummary({ A: zm(0, 0, 0, 0) }, [zd('A')]);
    expect(s.firstZone).toBeNull();
  });

  it('empty metrics → all zeros', () => {
    const s = buildAttentionSummary({}, []);
    expect(s.totalZones).toBe(0);
    expect(s.visitedZones).toBe(0);
    expect(s.totalDwellMs).toBe(0);
    expect(s.totalFixations).toBe(0);
    expect(s.avgConfidence).toBe(0);
    expect(s.firstZone).toBeNull();
  });

  it('uses zone labels from definitions', () => {
    const s = buildAttentionSummary(
      { hero: zm(100, 1, 0, 1) },
      [zd('hero', 'Hero Image')],
    );
    expect(s.firstZone!.label).toBe('Hero Image');
  });
});

// ---------------------------------------------------------------------------
// formatDwellTime
// ---------------------------------------------------------------------------

describe('formatDwellTime', () => {
  it('milliseconds below 1s', () => {
    expect(formatDwellTime(500)).toBe('500ms');
    expect(formatDwellTime(0)).toBe('0ms');
    expect(formatDwellTime(999)).toBe('999ms');
  });

  it('seconds at or above 1s', () => {
    expect(formatDwellTime(1000)).toBe('1.0s');
    expect(formatDwellTime(1500)).toBe('1.5s');
    expect(formatDwellTime(2300)).toBe('2.3s');
  });

  it('large values', () => {
    expect(formatDwellTime(10500)).toBe('10.5s');
    expect(formatDwellTime(60000)).toBe('60.0s');
  });

  it('fractional ms rounded', () => {
    expect(formatDwellTime(123.7)).toBe('124ms');
  });
});

// ---------------------------------------------------------------------------
// formatPercent
// ---------------------------------------------------------------------------

describe('formatPercent', () => {
  it('values >= 10 rounded to integer', () => {
    expect(formatPercent(45.3)).toBe('45%');
    expect(formatPercent(100)).toBe('100%');
    expect(formatPercent(10)).toBe('10%');
  });

  it('values < 10 show one decimal', () => {
    expect(formatPercent(5.5)).toBe('5.5%');
    expect(formatPercent(0.3)).toBe('0.3%');
    expect(formatPercent(9.99)).toBe('10.0%');
  });

  it('zero', () => {
    expect(formatPercent(0)).toBe('0.0%');
  });
});

// ---------------------------------------------------------------------------
// Integration: standard session through full pipeline
// ---------------------------------------------------------------------------

describe('eyeTrackingV2 — integration', () => {
  it('standard metrics produce consistent results across all functions', () => {
    const metrics = standardMetrics();
    const zones = standardZones();

    const bars = buildDwellBars(metrics, zones);
    const first = firstZoneObserved(metrics);
    const order = explorationOrder(metrics, zones);
    const conf = avgConfidence(metrics);
    const summary = buildAttentionSummary(metrics, zones);

    // Bars
    expect(bars).toHaveLength(3);
    expect(bars[0].zoneId).toBe('A');

    // First zone
    expect(first!.zoneId).toBe('A');

    // Order
    expect(order).toHaveLength(2);
    expect(order[0].zoneId).toBe('A');
    expect(order[1].zoneId).toBe('B');

    // Confidence
    expect(conf).toBeCloseTo(0.8, 5);

    // Summary aggregates correctly
    expect(summary.totalDwellMs).toBe(bars.reduce((s, b) => s + b.dwellMs, 0));
    expect(summary.visitedZones).toBe(order.length);
    expect(summary.firstZone!.zoneId).toBe(first!.zoneId);
  });

  it('V1 data (no zoneMass) correctly detected', () => {
    expect(hasV2ZoneData({ heatmapData: [{ x: 100, y: 200, duration: 300 }] })).toBe(false);
  });

  it('V2 data correctly detected', () => {
    expect(hasV2ZoneData({ zoneMass: { A: 0.6, B: 0.4 } })).toBe(true);
  });
});
