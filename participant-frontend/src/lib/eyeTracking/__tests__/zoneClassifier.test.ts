import { describe, it, expect } from 'vitest';
import {
  classifyGaze,
  topZone,
  UNCERTAINTY_RADIUS_DESKTOP,
  UNCERTAINTY_RADIUS_MOBILE,
  MIN_CONFIDENCE_THRESHOLD,
} from '../zoneClassifier';
import type { Zone } from '../zoneRegistry';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const zone = (id: string, x: number, y: number, w: number, h: number, priority = 0): Zone => ({
  id,
  label: id,
  rect: { x, y, width: w, height: h },
  priority,
});

const sumConfidence = (probs: { confidence: number }[]): number =>
  probs.reduce((s, p) => s + p.confidence, 0);

/** Build a uniform 3×3 grid of 100×100 zones starting at (0,0). */
const grid3x3 = (): Zone[] => {
  const zones: Zone[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      zones.push(zone(`r${row}c${col}`, col * 100, row * 100, 100, 100));
    }
  }
  return zones;
};

// ---------------------------------------------------------------------------
// classifyGaze — basic behavior
// ---------------------------------------------------------------------------

describe('classifyGaze — basic behavior', () => {
  it('point centered in a single zone yields confidence ~1.0', () => {
    const zones = [zone('only', 0, 0, 200, 200)];
    const result = classifyGaze(100, 100, UNCERTAINTY_RADIUS_DESKTOP, zones);

    expect(result).toHaveLength(1);
    expect(result[0].zoneId).toBe('only');
    expect(result[0].confidence).toBeCloseTo(1.0, 2);
    expect(result[0].distance).toBe(0);
  });

  it('returns empty array when no zones provided', () => {
    const result = classifyGaze(100, 100, UNCERTAINTY_RADIUS_DESKTOP, []);
    expect(result).toEqual([]);
  });

  it('falls back to nearest zone when all zones are outside radius', () => {
    const zones = [zone('far', 1000, 1000, 100, 100)];
    const result = classifyGaze(0, 0, 50, zones);
    expect(result).toHaveLength(1);
    expect(result[0].zoneId).toBe('far');
    expect(result[0].confidence).toBeLessThan(0.5); // reduced confidence for fallback
    expect(result[0].confidence).toBeGreaterThan(0); // but not zero
  });

  it('results are sorted by confidence descending', () => {
    const zones = grid3x3();
    const result = classifyGaze(50, 50, UNCERTAINTY_RADIUS_DESKTOP, zones);

    for (let i = 1; i < result.length; i++) {
      expect(result[i].confidence).toBeLessThanOrEqual(result[i - 1].confidence);
    }
  });

  it('all confidences sum to ~1.0', () => {
    const zones = grid3x3();
    const result = classifyGaze(150, 150, UNCERTAINTY_RADIUS_DESKTOP, zones);
    expect(sumConfidence(result)).toBeCloseTo(1.0, 2);
  });

  it('confidences are always non-negative', () => {
    const zones = grid3x3();
    const result = classifyGaze(50, 50, UNCERTAINTY_RADIUS_DESKTOP, zones);
    result.forEach((p) => expect(p.confidence).toBeGreaterThanOrEqual(0));
  });
});

// ---------------------------------------------------------------------------
// classifyGaze — spatial reasoning
// ---------------------------------------------------------------------------

describe('classifyGaze — spatial reasoning', () => {
  const zones = grid3x3(); // 3×3 of 100×100 each, origin (0,0)

  it('point dead-center of top-left zone → that zone has highest confidence', () => {
    const result = classifyGaze(50, 50, UNCERTAINTY_RADIUS_DESKTOP, zones);
    expect(result[0].zoneId).toBe('r0c0');
  });

  it('point dead-center of center zone → center zone has highest confidence', () => {
    const result = classifyGaze(150, 150, UNCERTAINTY_RADIUS_DESKTOP, zones);
    expect(result[0].zoneId).toBe('r1c1');
  });

  it('point dead-center of bottom-right → that zone has highest confidence', () => {
    const result = classifyGaze(250, 250, UNCERTAINTY_RADIUS_DESKTOP, zones);
    expect(result[0].zoneId).toBe('r2c2');
  });

  it('point on exact border between two zones → both have significant confidence', () => {
    // Border between r0c0 and r0c1 at x=100, y=50
    const result = classifyGaze(100, 50, UNCERTAINTY_RADIUS_DESKTOP, zones);
    const ids = result.map((p) => p.zoneId);
    expect(ids).toContain('r0c0');
    expect(ids).toContain('r0c1');

    const conf0 = result.find((p) => p.zoneId === 'r0c0')!.confidence;
    const conf1 = result.find((p) => p.zoneId === 'r0c1')!.confidence;
    // Both should be substantial (within 2x of each other at the border)
    expect(Math.abs(conf0 - conf1)).toBeLessThan(0.3);
  });

  it('point at corner where 4 zones meet → all 4 have confidence', () => {
    // Corner at (100, 100) — meeting point of r0c0, r0c1, r1c0, r1c1
    const result = classifyGaze(100, 100, UNCERTAINTY_RADIUS_DESKTOP, zones);
    const ids = result.map((p) => p.zoneId);
    expect(ids).toContain('r0c0');
    expect(ids).toContain('r0c1');
    expect(ids).toContain('r1c0');
    expect(ids).toContain('r1c1');
  });

  it('adjacent zones have higher confidence than diagonal zones', () => {
    // From center of r0c0 (50,50), r0c1 and r1c0 are adjacent, r1c1 is diagonal
    const result = classifyGaze(50, 50, UNCERTAINTY_RADIUS_DESKTOP, zones);
    const adjacent = result.find((p) => p.zoneId === 'r0c1')!;
    const diagonal = result.find((p) => p.zoneId === 'r1c1');
    // diagonal might be filtered out or have lower confidence
    expect(
      !diagonal || adjacent.confidence > diagonal.confidence,
    ).toBe(true);
  });

  it('distance is 0 for zones containing the gaze point', () => {
    const result = classifyGaze(50, 50, UNCERTAINTY_RADIUS_DESKTOP, zones);
    const containing = result.find((p) => p.zoneId === 'r0c0')!;
    expect(containing.distance).toBe(0);
  });

  it('distance is positive for zones not containing the gaze point', () => {
    const result = classifyGaze(50, 50, UNCERTAINTY_RADIUS_DESKTOP, zones);
    const nonContaining = result.filter((p) => p.zoneId !== 'r0c0');
    nonContaining.forEach((p) => expect(p.distance).toBeGreaterThan(0));
  });
});

// ---------------------------------------------------------------------------
// classifyGaze — radius effects
// ---------------------------------------------------------------------------

describe('classifyGaze — radius effects', () => {
  const zones = grid3x3();

  it('smaller radius → fewer zones in result', () => {
    const wide = classifyGaze(50, 50, 300, zones);
    const narrow = classifyGaze(50, 50, 60, zones);
    expect(narrow.length).toBeLessThanOrEqual(wide.length);
  });

  it('larger radius → more distributed confidences', () => {
    const narrow = classifyGaze(50, 50, 40, zones);
    const wide = classifyGaze(50, 50, 300, zones);

    const narrowTop = narrow[0]?.confidence ?? 0;
    const wideTop = wide[0]?.confidence ?? 0;
    // Narrow radius concentrates confidence, wide distributes
    expect(narrowTop).toBeGreaterThanOrEqual(wideTop);
  });

  it('radius 0 includes only the zone containing the point', () => {
    // With radius 0, only zones at distance 0 (containing point) participate
    // But Gaussian with sigma=0 is degenerate. radius=1 is more practical.
    const result = classifyGaze(50, 50, 1, zones);
    expect(result).toHaveLength(1);
    expect(result[0].zoneId).toBe('r0c0');
    expect(result[0].confidence).toBeCloseTo(1.0, 2);
  });

  it('desktop radius produces different distribution than mobile', () => {
    const desktop = classifyGaze(150, 150, UNCERTAINTY_RADIUS_DESKTOP, zones);
    const mobile = classifyGaze(150, 150, UNCERTAINTY_RADIUS_MOBILE, zones);

    // Mobile has larger radius → more zones participate → top confidence lower
    const desktopTop = desktop[0].confidence;
    const mobileTop = mobile[0].confidence;
    expect(desktopTop).toBeGreaterThanOrEqual(mobileTop);
    expect(mobile.length).toBeGreaterThanOrEqual(desktop.length);
  });
});

// ---------------------------------------------------------------------------
// classifyGaze — zone size effects
// ---------------------------------------------------------------------------

describe('classifyGaze — zone size effects', () => {
  it('larger zone gets more confidence than smaller zone at same distance', () => {
    const big = zone('big', 0, 0, 200, 200);
    const small = zone('small', 200, 0, 50, 50);
    // Point equidistant from both zone centers
    const midX = 175; // closer to the edge between them
    const result = classifyGaze(midX, 100, UNCERTAINTY_RADIUS_DESKTOP, [big, small]);

    const bigConf = result.find((p) => p.zoneId === 'big')!.confidence;
    const smallConf = result.find((p) => p.zoneId === 'small')?.confidence ?? 0;
    expect(bigConf).toBeGreaterThan(smallConf);
  });

  it('two equal zones symmetrically placed → equal confidence', () => {
    const left = zone('left', 0, 0, 100, 100);
    const right = zone('right', 200, 0, 100, 100);
    // Point exactly between them
    const result = classifyGaze(150, 50, UNCERTAINTY_RADIUS_DESKTOP, [left, right]);

    const leftConf = result.find((p) => p.zoneId === 'left')!.confidence;
    const rightConf = result.find((p) => p.zoneId === 'right')!.confidence;
    expect(leftConf).toBeCloseTo(rightConf, 5);
  });

  it('very large zone far away has lower confidence than small zone nearby', () => {
    const nearby = zone('near', 0, 0, 50, 50);
    const faraway = zone('far', 500, 500, 1000, 1000);
    const result = classifyGaze(25, 25, UNCERTAINTY_RADIUS_DESKTOP, [nearby, faraway]);

    // Only 'near' should be within radius (far starts at 500px away)
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].zoneId).toBe('near');
  });
});

// ---------------------------------------------------------------------------
// classifyGaze — overlapping zones
// ---------------------------------------------------------------------------

describe('classifyGaze — overlapping zones', () => {
  it('fully overlapping zones of same size get equal confidence', () => {
    const a = zone('a', 0, 0, 200, 200);
    const b = zone('b', 0, 0, 200, 200);
    const result = classifyGaze(100, 100, UNCERTAINTY_RADIUS_DESKTOP, [a, b]);

    expect(result).toHaveLength(2);
    const confA = result.find((p) => p.zoneId === 'a')!.confidence;
    const confB = result.find((p) => p.zoneId === 'b')!.confidence;
    expect(confA).toBeCloseTo(confB, 5);
    expect(confA).toBeCloseTo(0.5, 2);
  });

  it('nested zones — outer and inner both participate', () => {
    const outer = zone('outer', 0, 0, 400, 400);
    const inner = zone('inner', 150, 150, 100, 100);
    const result = classifyGaze(200, 200, UNCERTAINTY_RADIUS_DESKTOP, [outer, inner]);

    expect(result).toHaveLength(2);
    // Outer is larger → more area → higher raw score, but inner is closer to center
    const outerConf = result.find((p) => p.zoneId === 'outer')!.confidence;
    const innerConf = result.find((p) => p.zoneId === 'inner')!.confidence;
    expect(outerConf + innerConf).toBeCloseTo(1.0, 2);
  });

  it('partially overlapping zones both get confidence', () => {
    const a = zone('a', 0, 0, 150, 100);
    const b = zone('b', 100, 0, 150, 100);
    // Overlap region: x=[100,150], y=[0,100]
    // Point in overlap area
    const result = classifyGaze(125, 50, UNCERTAINTY_RADIUS_DESKTOP, [a, b]);

    const ids = result.map((p) => p.zoneId);
    expect(ids).toContain('a');
    expect(ids).toContain('b');
  });
});

// ---------------------------------------------------------------------------
// classifyGaze — threshold filtering
// ---------------------------------------------------------------------------

describe('classifyGaze — confidence threshold filtering', () => {
  it('zones below MIN_CONFIDENCE_THRESHOLD are excluded', () => {
    // Many zones, most very far from gaze → their raw confidence is negligible
    const zones: Zone[] = [];
    for (let i = 0; i < 50; i++) {
      zones.push(zone(`z${i}`, i * 100, 0, 100, 100));
    }
    const result = classifyGaze(50, 50, UNCERTAINTY_RADIUS_DESKTOP, zones);

    // Should not have all 50 — far zones are below threshold
    expect(result.length).toBeLessThan(50);
    result.forEach((p) => expect(p.confidence).toBeGreaterThanOrEqual(MIN_CONFIDENCE_THRESHOLD));
  });

  it('all confidences above threshold still sum to ~1.0', () => {
    const zones = grid3x3();
    const result = classifyGaze(150, 150, UNCERTAINTY_RADIUS_DESKTOP, zones);

    // Some zones may be filtered, so sum might be slightly less than 1.0
    // but should be very close since we only remove negligible values
    expect(sumConfidence(result)).toBeGreaterThan(0.95);
    expect(sumConfidence(result)).toBeLessThanOrEqual(1.001);
  });
});

// ---------------------------------------------------------------------------
// classifyGaze — edge cases
// ---------------------------------------------------------------------------

describe('classifyGaze — edge cases', () => {
  it('gaze at negative coordinates with zone at origin', () => {
    const zones = [zone('origin', 0, 0, 100, 100)];
    const result = classifyGaze(-10, -10, UNCERTAINTY_RADIUS_DESKTOP, zones);
    // Zone edge is 14.14px away — within radius
    expect(result).toHaveLength(1);
    expect(result[0].distance).toBeCloseTo(Math.sqrt(200), 1);
  });

  it('very large radius captures all zones', () => {
    const zones = grid3x3();
    const result = classifyGaze(150, 150, 10000, zones);
    expect(result).toHaveLength(9);
  });

  it('identical gaze coordinates produce identical results', () => {
    const zones = grid3x3();
    const r1 = classifyGaze(123.456, 78.9, UNCERTAINTY_RADIUS_DESKTOP, zones);
    const r2 = classifyGaze(123.456, 78.9, UNCERTAINTY_RADIUS_DESKTOP, zones);
    expect(r1).toEqual(r2);
  });

  it('zone with very small area has proportionally low confidence', () => {
    const big = zone('big', 0, 0, 200, 200);
    const tiny = zone('tiny', 90, 90, 2, 2); // 4 sq px vs 40000 sq px
    const result = classifyGaze(100, 100, UNCERTAINTY_RADIUS_DESKTOP, [big, tiny]);

    const bigConf = result.find((p) => p.zoneId === 'big')!.confidence;
    const tinyConf = result.find((p) => p.zoneId === 'tiny')?.confidence ?? 0;
    expect(bigConf).toBeGreaterThan(tinyConf * 10);
  });

  it('single zone exactly at radius boundary is included', () => {
    // Zone edge is exactly at radius distance
    const zones = [zone('edge', 120, 0, 100, 100)];
    const result = classifyGaze(0, 50, 120, zones);
    // Distance to nearest edge = 120 = radius → just at boundary
    expect(result).toHaveLength(1);
  });

  it('single zone just beyond radius boundary falls back to nearest', () => {
    const zones = [zone('beyond', 121, 0, 100, 100)];
    const result = classifyGaze(0, 50, 120, zones);
    expect(result).toHaveLength(1);
    expect(result[0].zoneId).toBe('beyond');
    expect(result[0].confidence).toBeLessThan(0.5); // reduced confidence
  });
});

// ---------------------------------------------------------------------------
// classifyGaze — performance
// ---------------------------------------------------------------------------

describe('classifyGaze — performance', () => {
  it('1000 classifications with 20 zones completes under 200ms', () => {
    const zones: Zone[] = [];
    for (let i = 0; i < 20; i++) {
      zones.push(zone(`z${i}`, (i % 5) * 100, Math.floor(i / 5) * 100, 100, 100));
    }

    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      classifyGaze(
        Math.random() * 500,
        Math.random() * 400,
        UNCERTAINTY_RADIUS_DESKTOP,
        zones,
      );
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(200);
  });

  it('classification is pure — same input always same output', () => {
    const zones = grid3x3();
    const runs = Array.from({ length: 10 }, () =>
      classifyGaze(123, 456, UNCERTAINTY_RADIUS_DESKTOP, zones),
    );
    runs.forEach((r) => expect(r).toEqual(runs[0]));
  });
});

// ---------------------------------------------------------------------------
// topZone
// ---------------------------------------------------------------------------

describe('topZone', () => {
  const zones = grid3x3();

  it('returns top zone when confidence exceeds threshold', () => {
    const probs = classifyGaze(50, 50, UNCERTAINTY_RADIUS_DESKTOP, zones);
    const top = topZone(probs);
    expect(top).not.toBeNull();
    expect(top!.zoneId).toBe('r0c0');
  });

  it('returns null when probabilities array is empty', () => {
    expect(topZone([])).toBeNull();
  });

  it('returns null when top confidence is below custom threshold', () => {
    // Use a very high threshold
    const probs = classifyGaze(150, 150, 10000, zones);
    // With huge radius, confidence is distributed ~equally (~0.11 each)
    const top = topZone(probs, 0.5);
    expect(top).toBeNull();
  });

  it('returns zone when confidence meets exact threshold', () => {
    const probs = [{ zoneId: 'test', confidence: 0.15, distance: 0 }];
    expect(topZone(probs, 0.15)).not.toBeNull();
  });

  it('returns null when confidence is just below threshold', () => {
    const probs = [{ zoneId: 'test', confidence: 0.149, distance: 0 }];
    expect(topZone(probs, 0.15)).toBeNull();
  });

  it('default minConfidence is 0.15', () => {
    const above = [{ zoneId: 'a', confidence: 0.16, distance: 0 }];
    const below = [{ zoneId: 'b', confidence: 0.14, distance: 0 }];
    expect(topZone(above)).not.toBeNull();
    expect(topZone(below)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// classifyGaze — invariants across many random inputs
// ---------------------------------------------------------------------------

describe('classifyGaze — statistical invariants', () => {
  const zones = grid3x3();

  it('confidence sum is ≤ 1.0 for 100 random gaze points', () => {
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * 400 - 50; // some outside grid
      const y = Math.random() * 400 - 50;
      const result = classifyGaze(x, y, UNCERTAINTY_RADIUS_DESKTOP, zones);
      expect(sumConfidence(result)).toBeLessThanOrEqual(1.001);
    }
  });

  it('top zone confidence is always highest in result', () => {
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * 300;
      const y = Math.random() * 300;
      const result = classifyGaze(x, y, UNCERTAINTY_RADIUS_DESKTOP, zones);
      const top = result[0];
      result.forEach((p) => expect(p.confidence).toBeLessThanOrEqual(top.confidence));
    }
  });

  it('distance is monotonically related to zone position', () => {
    // For gaze at (0,0), zones further from origin should have larger distance
    const result = classifyGaze(0, 0, 500, zones);
    const r0c0 = result.find((p) => p.zoneId === 'r0c0')!;
    const r2c2 = result.find((p) => p.zoneId === 'r2c2')!;
    expect(r0c0.distance).toBeLessThan(r2c2.distance);
  });
});
