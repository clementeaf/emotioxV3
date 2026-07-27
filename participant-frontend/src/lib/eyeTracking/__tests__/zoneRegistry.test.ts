import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ZoneRegistry, generateGrid, type ZoneRect, type Zone } from '../zoneRegistry';
import { HYBRID_AOI_GRID } from '../hybridZoneGrid';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a plain rect (no DOM element). */
const rect = (x: number, y: number, w: number, h: number): ZoneRect => ({
  x, y, width: w, height: h,
});

/** Build a mock HTMLElement whose getBoundingClientRect returns a fixed rect. */
function mockElement(r: ZoneRect): HTMLElement {
  return {
    getBoundingClientRect: () => ({
      x: r.x, y: r.y, width: r.width, height: r.height,
      top: r.y, left: r.x, right: r.x + r.width, bottom: r.y + r.height,
      toJSON: () => ({}),
    }),
  } as unknown as HTMLElement;
}

// ---------------------------------------------------------------------------
// generateGrid
// ---------------------------------------------------------------------------

describe('generateGrid', () => {
  const container = rect(0, 0, 900, 600);

  it('produces rows × cols zones', () => {
    const zones = generateGrid(4, 5, container);
    expect(zones).toHaveLength(20);
  });

  it('zones tile the container without gaps or overlaps', () => {
    const zones = generateGrid(3, 3, container);
    const totalArea = zones.reduce((sum, z) => sum + z.rect.width * z.rect.height, 0);
    expect(totalArea).toBeCloseTo(container.width * container.height, 5);

    // No two zones share interior area — check corners don't overlap centers
    zones.forEach((a, i) => {
      zones.forEach((b, j) => {
        if (i < j) {
          expectNoInteriorOverlap(a, b);
        }
      });
    });
  });

  it('IDs follow r{row}c{col} pattern', () => {
    const zones = generateGrid(2, 4, container);
    expect(zones.map((z) => z.id)).toEqual([
      'r0c0', 'r0c1', 'r0c2', 'r0c3',
      'r1c0', 'r1c1', 'r1c2', 'r1c3',
    ]);
  });

  describe('3×3 backward compatibility with HYBRID_AOI_GRID', () => {
    const zones = generateGrid(3, 3, container);

    it('produces exactly 9 zones', () => {
      expect(zones).toHaveLength(9);
    });

    it('IDs match HYBRID_AOI_GRID IDs', () => {
      const gridIds = HYBRID_AOI_GRID.map((z) => z.id);
      const generatedIds = zones.map((z) => z.id);
      expect(generatedIds).toEqual(gridIds);
    });

    it('labels match HYBRID_AOI_GRID labels', () => {
      const gridLabels = HYBRID_AOI_GRID.map((z) => z.label);
      const generatedLabels = zones.map((z) => z.label);
      expect(generatedLabels).toEqual(gridLabels);
    });
  });

  it('cell dimensions are uniform', () => {
    const zones = generateGrid(5, 5, rect(10, 20, 500, 500));
    const widths = new Set(zones.map((z) => Math.round(z.rect.width * 1000)));
    const heights = new Set(zones.map((z) => Math.round(z.rect.height * 1000)));
    expect(widths.size).toBe(1);
    expect(heights.size).toBe(1);
  });

  it('respects container offset', () => {
    const offset = rect(100, 200, 300, 300);
    const zones = generateGrid(3, 3, offset);
    expect(zones[0].rect.x).toBe(100);
    expect(zones[0].rect.y).toBe(200);
    const last = zones[zones.length - 1];
    expect(last.rect.x + last.rect.width).toBeCloseTo(400, 5);
    expect(last.rect.y + last.rect.height).toBeCloseTo(500, 5);
  });

  it('all zones have priority 0', () => {
    const zones = generateGrid(3, 3, container);
    zones.forEach((z) => expect(z.priority).toBe(0));
  });
});

// ---------------------------------------------------------------------------
// ZoneRegistry — registration
// ---------------------------------------------------------------------------

describe('ZoneRegistry — registration', () => {
  let registry: ZoneRegistry;

  beforeEach(() => {
    registry = new ZoneRegistry();
  });

  it('starts empty', () => {
    expect(registry.size).toBe(0);
    expect(registry.getZones()).toEqual([]);
  });

  it('registers a zone with a manual rect', () => {
    registry.register('hero', 'Hero Image', rect(0, 0, 400, 300));
    expect(registry.size).toBe(1);
    const zones = registry.getZones();
    expect(zones).toHaveLength(1);
    expect(zones[0].id).toBe('hero');
    expect(zones[0].label).toBe('Hero Image');
    expect(zones[0].rect).toEqual(rect(0, 0, 400, 300));
  });

  it('registers a zone with an HTMLElement', () => {
    const el = mockElement(rect(50, 50, 200, 100));
    registry.register('btn', 'Button', el);
    const zones = registry.getZones();
    expect(zones[0].rect).toEqual(rect(50, 50, 200, 100));
  });

  it('re-registering same ID replaces the previous entry', () => {
    registry.register('a', 'First', rect(0, 0, 100, 100));
    registry.register('a', 'Second', rect(50, 50, 200, 200));
    expect(registry.size).toBe(1);
    expect(registry.getZones()[0].label).toBe('Second');
    expect(registry.getZones()[0].rect.x).toBe(50);
  });

  it('unregisters a zone by ID', () => {
    registry.register('a', 'A', rect(0, 0, 100, 100));
    registry.register('b', 'B', rect(200, 0, 100, 100));
    registry.unregister('a');
    expect(registry.size).toBe(1);
    expect(registry.getZones()[0].id).toBe('b');
  });

  it('unregistering non-existent ID is a no-op', () => {
    registry.register('a', 'A', rect(0, 0, 100, 100));
    registry.unregister('nonexistent');
    expect(registry.size).toBe(1);
  });

  it('clear removes all zones', () => {
    registry.register('a', 'A', rect(0, 0, 100, 100));
    registry.register('b', 'B', rect(200, 0, 100, 100));
    registry.clear();
    expect(registry.size).toBe(0);
    expect(registry.getZones()).toEqual([]);
  });

  it('excludes zones with zero width', () => {
    registry.register('zero-w', 'ZeroW', rect(0, 0, 0, 100));
    expect(registry.getZones()).toEqual([]);
    expect(registry.size).toBe(1); // still registered, just filtered from snapshot
  });

  it('excludes zones with zero height', () => {
    registry.register('zero-h', 'ZeroH', rect(0, 0, 100, 0));
    expect(registry.getZones()).toEqual([]);
  });

  it('element removed from DOM returns zero-rect and is filtered', () => {
    const el = mockElement(rect(0, 0, 0, 0)); // simulates detached element
    registry.register('gone', 'Gone', el);
    expect(registry.getZones()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// ZoneRegistry — getZoneAt
// ---------------------------------------------------------------------------

describe('ZoneRegistry — getZoneAt', () => {
  let registry: ZoneRegistry;

  beforeEach(() => {
    registry = new ZoneRegistry();
    registry.register('left',  'Left Panel',  rect(0,   0, 200, 400));
    registry.register('right', 'Right Panel', rect(200, 0, 200, 400));
    registry.register('top',   'Top Bar',     rect(0,   0, 400, 50), 10);
  });

  it('returns the zone containing the point', () => {
    const match = registry.getZoneAt(100, 200);
    expect(match).not.toBeNull();
    expect(match!.zone.id).toBe('left');
    expect(match!.distance).toBe(0);
  });

  it('returns the correct zone for right panel', () => {
    const match = registry.getZoneAt(300, 200);
    expect(match!.zone.id).toBe('right');
  });

  it('returns null when point is outside all zones', () => {
    const match = registry.getZoneAt(500, 500);
    expect(match).toBeNull();
  });

  it('returns higher-priority zone when multiple zones overlap', () => {
    // Point (100, 25) is inside both 'left' (priority 0) and 'top' (priority 10)
    const match = registry.getZoneAt(100, 25);
    expect(match!.zone.id).toBe('top');
  });

  it('returns correct zone at exact boundary (inclusive)', () => {
    // Right edge of left panel = x:200, which is also left edge of right panel
    const match = registry.getZoneAt(200, 200);
    // Both contain x=200 — right panel starts at x=200 (inclusive)
    // left panel: 0 ≤ 200 ≤ 0+200=200 ✓
    // right panel: 200 ≤ 200 ≤ 200+200=400 ✓
    // Both contain it — same priority (0), first in sorted order wins
    expect(match).not.toBeNull();
  });

  it('returns null on empty registry', () => {
    const empty = new ZoneRegistry();
    expect(empty.getZoneAt(100, 100)).toBeNull();
  });

  it('handles point at exact corner of zone', () => {
    const match = registry.getZoneAt(0, 0);
    // Both 'left' and 'top' contain (0,0). 'top' has higher priority.
    expect(match!.zone.id).toBe('top');
  });

  it('handles negative coordinates (outside zones)', () => {
    expect(registry.getZoneAt(-10, -10)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ZoneRegistry — getNearestZone
// ---------------------------------------------------------------------------

describe('ZoneRegistry — getNearestZone', () => {
  let registry: ZoneRegistry;

  beforeEach(() => {
    registry = new ZoneRegistry();
    registry.register('a', 'Zone A', rect(0,   0, 100, 100));
    registry.register('b', 'Zone B', rect(200, 0, 100, 100));
  });

  it('returns distance 0 for point inside a zone', () => {
    const match = registry.getNearestZone(50, 50);
    expect(match!.zone.id).toBe('a');
    expect(match!.distance).toBe(0);
  });

  it('returns nearest zone for point between zones', () => {
    // Point at (120, 50) — 20px from A's right edge, 80px from B's left edge
    const match = registry.getNearestZone(120, 50);
    expect(match!.zone.id).toBe('a');
    expect(match!.distance).toBeCloseTo(20, 5);
  });

  it('returns nearest zone for point closer to B', () => {
    const match = registry.getNearestZone(180, 50);
    expect(match!.zone.id).toBe('b');
    expect(match!.distance).toBeCloseTo(20, 5);
  });

  it('returns null on empty registry', () => {
    const empty = new ZoneRegistry();
    expect(empty.getNearestZone(100, 100)).toBeNull();
  });

  it('handles point far from all zones', () => {
    const match = registry.getNearestZone(1000, 1000);
    expect(match).not.toBeNull();
    expect(match!.distance).toBeGreaterThan(0);
  });

  it('euclidean distance is correct for diagonal offset', () => {
    // Zone A ends at (100, 100). Point at (103, 104) — dx=3, dy=4 → dist=5
    const match = registry.getNearestZone(103, 104);
    expect(match!.zone.id).toBe('a');
    expect(match!.distance).toBeCloseTo(5, 5);
  });
});

// ---------------------------------------------------------------------------
// ZoneRegistry — priority ordering
// ---------------------------------------------------------------------------

describe('ZoneRegistry — priority ordering', () => {
  let registry: ZoneRegistry;

  beforeEach(() => {
    registry = new ZoneRegistry();
  });

  it('getZones returns zones sorted by priority descending', () => {
    registry.register('low',  'Low',  rect(0, 0, 100, 100), 1);
    registry.register('high', 'High', rect(0, 0, 100, 100), 10);
    registry.register('mid',  'Mid',  rect(0, 0, 100, 100), 5);

    const ids = registry.getZones().map((z) => z.id);
    expect(ids).toEqual(['high', 'mid', 'low']);
  });

  it('same priority preserves insertion stability', () => {
    registry.register('first',  'First',  rect(0, 0, 50, 50));
    registry.register('second', 'Second', rect(50, 0, 50, 50));
    registry.register('third',  'Third',  rect(100, 0, 50, 50));

    const zones = registry.getZones();
    // All priority 0 — sort is stable, insertion order preserved
    expect(zones.map((z) => z.id)).toEqual(['first', 'second', 'third']);
  });
});

// ---------------------------------------------------------------------------
// ZoneRegistry — element tracking & updateAll
// ---------------------------------------------------------------------------

describe('ZoneRegistry — element tracking', () => {
  it('reflects updated element rect after updateAll', () => {
    const registry = new ZoneRegistry();
    let currentRect = rect(0, 0, 100, 100);
    const el = {
      getBoundingClientRect: () => ({
        ...currentRect,
        top: currentRect.y, left: currentRect.x,
        right: currentRect.x + currentRect.width,
        bottom: currentRect.y + currentRect.height,
        toJSON: () => ({}),
      }),
    } as unknown as HTMLElement;

    registry.register('dynamic', 'Dynamic', el);
    expect(registry.getZones()[0].rect.width).toBe(100);

    // Simulate layout change
    currentRect = rect(10, 10, 300, 200);
    registry.updateAll();
    expect(registry.getZones()[0].rect.width).toBe(300);
    expect(registry.getZones()[0].rect.x).toBe(10);
  });

  it('ResizeObserver callback invalidates cache', () => {
    // We test this indirectly: after registering an element,
    // mutating the mock rect, then triggering observer → getZones returns fresh data.
    // Since ResizeObserver is mocked in jsdom, we test via updateAll as proxy.
    const registry = new ZoneRegistry();
    let w = 100;
    const el = {
      getBoundingClientRect: () => ({
        x: 0, y: 0, width: w, height: 100,
        top: 0, left: 0, right: w, bottom: 100,
        toJSON: () => ({}),
      }),
    } as unknown as HTMLElement;

    registry.register('resizing', 'Resizing', el);
    const snap1 = registry.getZones();
    expect(snap1[0].rect.width).toBe(100);

    w = 250;
    // Cache still returns old value
    expect(registry.getZones()[0].rect.width).toBe(100);

    // updateAll invalidates
    registry.updateAll();
    expect(registry.getZones()[0].rect.width).toBe(250);
  });
});

// ---------------------------------------------------------------------------
// ZoneRegistry — destroy
// ---------------------------------------------------------------------------

describe('ZoneRegistry — destroy', () => {
  it('clears all state and disconnects observer', () => {
    const registry = new ZoneRegistry();
    registry.register('a', 'A', rect(0, 0, 100, 100));
    registry.destroy();

    expect(registry.size).toBe(0);
    expect(registry.getZones()).toEqual([]);
    expect(registry.getZoneAt(50, 50)).toBeNull();
  });

  it('double destroy is safe', () => {
    const registry = new ZoneRegistry();
    registry.destroy();
    expect(() => registry.destroy()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// ZoneRegistry — stress & edge cases
// ---------------------------------------------------------------------------

describe('ZoneRegistry — edge cases', () => {
  it('handles many zones (100+) without degradation', () => {
    const registry = new ZoneRegistry();
    const count = 100;
    for (let i = 0; i < count; i++) {
      registry.register(`z${i}`, `Zone ${i}`, rect(i * 10, 0, 10, 10));
    }
    expect(registry.getZones()).toHaveLength(count);

    // Point lookup still works
    const match = registry.getZoneAt(55, 5);
    expect(match!.zone.id).toBe('z5');
  });

  it('zones with fractional coordinates work correctly', () => {
    const registry = new ZoneRegistry();
    registry.register('frac', 'Fractional', rect(0.5, 0.5, 99.7, 49.3));
    const match = registry.getZoneAt(50, 25);
    expect(match!.zone.id).toBe('frac');
  });

  it('very large coordinates do not cause errors', () => {
    const registry = new ZoneRegistry();
    registry.register('huge', 'Huge', rect(0, 0, 1e6, 1e6));
    const match = registry.getZoneAt(500000, 500000);
    expect(match!.zone.id).toBe('huge');
  });

  it('register → unregister → re-register same ID works', () => {
    const registry = new ZoneRegistry();
    registry.register('flip', 'V1', rect(0, 0, 50, 50));
    registry.unregister('flip');
    registry.register('flip', 'V2', rect(100, 100, 50, 50));

    expect(registry.size).toBe(1);
    expect(registry.getZones()[0].label).toBe('V2');
    expect(registry.getZones()[0].rect.x).toBe(100);
  });

  it('concurrent manual and element zones coexist', () => {
    const registry = new ZoneRegistry();
    registry.register('manual', 'Manual', rect(0, 0, 100, 100));
    registry.register('elem', 'Element', mockElement(rect(200, 0, 100, 100)));

    expect(registry.getZones()).toHaveLength(2);
    expect(registry.getZoneAt(50, 50)!.zone.id).toBe('manual');
    expect(registry.getZoneAt(250, 50)!.zone.id).toBe('elem');
  });
});

// ---------------------------------------------------------------------------
// ZoneRegistry — cache behavior
// ---------------------------------------------------------------------------

describe('ZoneRegistry — snapshot cache', () => {
  it('returns same array reference on consecutive calls without mutation', () => {
    const registry = new ZoneRegistry();
    registry.register('a', 'A', rect(0, 0, 100, 100));

    const snap1 = registry.getZones();
    const snap2 = registry.getZones();
    expect(snap1).toBe(snap2); // same reference = cache hit
  });

  it('returns new array after register', () => {
    const registry = new ZoneRegistry();
    registry.register('a', 'A', rect(0, 0, 100, 100));
    const snap1 = registry.getZones();

    registry.register('b', 'B', rect(200, 0, 100, 100));
    const snap2 = registry.getZones();
    expect(snap1).not.toBe(snap2);
    expect(snap2).toHaveLength(2);
  });

  it('returns new array after unregister', () => {
    const registry = new ZoneRegistry();
    registry.register('a', 'A', rect(0, 0, 100, 100));
    const snap1 = registry.getZones();

    registry.unregister('a');
    const snap2 = registry.getZones();
    expect(snap1).not.toBe(snap2);
  });

  it('returns new array after updateAll', () => {
    const registry = new ZoneRegistry();
    registry.register('a', 'A', rect(0, 0, 100, 100));
    const snap1 = registry.getZones();

    registry.updateAll();
    const snap2 = registry.getZones();
    expect(snap1).not.toBe(snap2);
  });
});

// ---------------------------------------------------------------------------
// ZoneRegistry — getNearestZone with overlapping zones
// ---------------------------------------------------------------------------

describe('ZoneRegistry — getNearestZone with overlaps', () => {
  it('prefers inside zone over nearby zone', () => {
    const registry = new ZoneRegistry();
    registry.register('big',   'Big',   rect(0, 0, 500, 500));
    registry.register('small', 'Small', rect(100, 100, 50, 50));

    // Point inside 'small' — both contain it, both distance 0
    // getNearestZone picks first in priority-sorted list (same priority = insertion order)
    const match = registry.getNearestZone(125, 125);
    expect(match!.distance).toBe(0);
  });

  it('returns closest zone when point is outside all', () => {
    const registry = new ZoneRegistry();
    registry.register('a', 'A', rect(0, 0, 100, 100));
    registry.register('b', 'B', rect(300, 300, 100, 100));

    // Point at (150, 150) — equidistant calculation:
    // A: nearest edge point is (100,100), dist = sqrt(50²+50²) ≈ 70.71
    // B: nearest edge point is (300,300), dist = sqrt(150²+150²) ≈ 212.13
    const match = registry.getNearestZone(150, 150);
    expect(match!.zone.id).toBe('a');
    expect(match!.distance).toBeCloseTo(Math.sqrt(50 * 50 + 50 * 50), 2);
  });
});

// ---------------------------------------------------------------------------
// generateGrid — edge cases
// ---------------------------------------------------------------------------

describe('generateGrid — edge cases', () => {
  it('1×1 grid produces single zone covering entire container', () => {
    const c = rect(0, 0, 800, 600);
    const zones = generateGrid(1, 1, c);
    expect(zones).toHaveLength(1);
    expect(zones[0].id).toBe('r0c0');
    expect(zones[0].rect).toEqual(c);
  });

  it('10×10 grid produces 100 zones', () => {
    const zones = generateGrid(10, 10, rect(0, 0, 1000, 1000));
    expect(zones).toHaveLength(100);
    expect(zones[99].id).toBe('r9c9');
  });

  it('asymmetric grid (2 rows, 5 cols) has correct dimensions', () => {
    const c = rect(0, 0, 500, 200);
    const zones = generateGrid(2, 5, c);
    expect(zones).toHaveLength(10);
    expect(zones[0].rect.width).toBeCloseTo(100, 5);
    expect(zones[0].rect.height).toBeCloseTo(100, 5);
  });

  it('container with offset produces correctly positioned cells', () => {
    const c = rect(50, 100, 300, 300);
    const zones = generateGrid(3, 3, c);
    // First cell
    expect(zones[0].rect.x).toBe(50);
    expect(zones[0].rect.y).toBe(100);
    // Last cell should end at container boundary
    const last = zones[8];
    expect(last.rect.x + last.rect.width).toBeCloseTo(350, 5);
    expect(last.rect.y + last.rect.height).toBeCloseTo(400, 5);
  });
});

// ---------------------------------------------------------------------------
// Assertion helpers
// ---------------------------------------------------------------------------

/** Verify two zones don't share interior area (edges can touch). */
function expectNoInteriorOverlap(a: Zone, b: Zone): void {
  const overlapX = Math.max(0,
    Math.min(a.rect.x + a.rect.width, b.rect.x + b.rect.width)
    - Math.max(a.rect.x, b.rect.x),
  );
  const overlapY = Math.max(0,
    Math.min(a.rect.y + a.rect.height, b.rect.y + b.rect.height)
    - Math.max(a.rect.y, b.rect.y),
  );
  const overlapArea = overlapX * overlapY;
  const tolerance = a.rect.width * a.rect.height * 0.001;
  expect(overlapArea).toBeLessThanOrEqual(tolerance);
}

// ---------------------------------------------------------------------------
// Zone boundaries — which zone owns a gaze landing exactly on an edge
//
// This is the pipeline's central claim: given a point, name the zone. Every
// assertion below pins a decision that was previously left to insertion order.
// ---------------------------------------------------------------------------

describe('ZoneRegistry — edge containment', () => {
  let registry: ZoneRegistry;

  beforeEach(() => {
    registry = new ZoneRegistry();
    registry.register('solo', 'Solo', rect(100, 100, 200, 200));
  });

  it('a point on the left edge belongs to the zone', () => {
    expect(registry.getZoneAt(100, 200)?.zone.id).toBe('solo');
  });

  it('a point on the right edge belongs to the zone', () => {
    // Right edge = x + width = 300. Excluding it would drop every gaze landing
    // on the far edge of the last column of a grid.
    expect(registry.getZoneAt(300, 200)?.zone.id).toBe('solo');
  });

  it('a point on the top edge belongs to the zone', () => {
    expect(registry.getZoneAt(200, 100)?.zone.id).toBe('solo');
  });

  it('a point on the bottom edge belongs to the zone', () => {
    expect(registry.getZoneAt(200, 300)?.zone.id).toBe('solo');
  });

  it('all four corners belong to the zone', () => {
    expect(registry.getZoneAt(100, 100)?.zone.id).toBe('solo');
    expect(registry.getZoneAt(300, 100)?.zone.id).toBe('solo');
    expect(registry.getZoneAt(100, 300)?.zone.id).toBe('solo');
    expect(registry.getZoneAt(300, 300)?.zone.id).toBe('solo');
  });

  it('a point one pixel past each edge belongs to no zone', () => {
    expect(registry.getZoneAt(99, 200)).toBeNull();
    expect(registry.getZoneAt(301, 200)).toBeNull();
    expect(registry.getZoneAt(200, 99)).toBeNull();
    expect(registry.getZoneAt(200, 301)).toBeNull();
  });

  it('a sub-pixel offset past an edge belongs to no zone', () => {
    expect(registry.getZoneAt(300.01, 200)).toBeNull();
    expect(registry.getZoneAt(200, 300.01)).toBeNull();
  });
});

describe('ZoneRegistry — shared-edge tie-breaking', () => {
  // Adjacent zones both contain a point on the edge they share. Which one is
  // reported must be deterministic, or the same gaze yields different zones
  // across runs.
  it('resolves a shared vertical edge to the first-registered zone', () => {
    const registry = new ZoneRegistry();
    registry.register('left', 'Left', rect(0, 0, 200, 400));
    registry.register('right', 'Right', rect(200, 0, 200, 400));

    expect(registry.getZoneAt(200, 200)?.zone.id).toBe('left');
  });

  it('resolves a shared horizontal edge to the first-registered zone', () => {
    const registry = new ZoneRegistry();
    registry.register('upper', 'Upper', rect(0, 0, 400, 200));
    registry.register('lower', 'Lower', rect(0, 200, 400, 200));

    expect(registry.getZoneAt(200, 200)?.zone.id).toBe('upper');
  });

  it('priority still outranks registration order on a shared edge', () => {
    const registry = new ZoneRegistry();
    registry.register('left', 'Left', rect(0, 0, 200, 400));
    registry.register('right', 'Right', rect(200, 0, 200, 400), 5);

    expect(registry.getZoneAt(200, 200)?.zone.id).toBe('right');
  });

  it('a gaze on an internal grid line resolves to the earlier cell', () => {
    const registry = new ZoneRegistry();
    for (const zone of generateGrid(3, 3, rect(0, 0, 300, 300))) {
      registry.register(zone.id, zone.label, zone.rect);
    }

    // x=100 is the r0c0 / r0c1 boundary, y=100 is the r0 / r1 boundary
    expect(registry.getZoneAt(100, 50)?.zone.id).toBe('r0c0');
    expect(registry.getZoneAt(50, 100)?.zone.id).toBe('r0c0');
    expect(registry.getZoneAt(100, 100)?.zone.id).toBe('r0c0');
  });
});

describe('ZoneRegistry — getNearestZone tie-breaking', () => {
  it('returns the first-registered zone when two are equidistant', () => {
    const registry = new ZoneRegistry();
    registry.register('a', 'A', rect(0, 0, 100, 100));
    registry.register('b', 'B', rect(200, 0, 100, 100));

    // x=150 sits 50px from both zones
    const match = registry.getNearestZone(150, 50);
    expect(match?.zone.id).toBe('a');
    expect(match?.distance).toBe(50);
  });

  it('keeps the tie-break stable regardless of registration count', () => {
    const registry = new ZoneRegistry();
    registry.register('a', 'A', rect(0, 0, 100, 100));
    registry.register('b', 'B', rect(200, 0, 100, 100));
    registry.register('c', 'C', rect(150, 200, 100, 100));

    expect(registry.getNearestZone(150, 50)?.zone.id).toBe('a');
  });
});

// ---------------------------------------------------------------------------
// Grid labels — the zone names a researcher reads in the results panel
// ---------------------------------------------------------------------------

describe('generateGrid — labels', () => {
  const labelOf = (zones: Zone[], row: number, col: number): string =>
    zones.find(z => z.id === `r${row}c${col}`)!.label;

  it('names every row and column of a 10×10 grid', () => {
    const zones = generateGrid(10, 10, rect(0, 0, 1000, 1000));

    const expected = [
      'Superior izquierda',
      'Centro superior centro izquierda',
      'Centro centro',
      'Centro inferior centro derecha',
      'Inferior derecha',
      'Fila 5 col 5',
      'Fila 6 col 6',
      'Fila 7 col 7',
      'Fila 8 col 8',
      'Fila 9 col 9',
    ];

    expected.forEach((label, i) => {
      expect(labelOf(zones, i, i)).toBe(label);
    });
  });

  it('names the corners of a 5×5 grid', () => {
    const zones = generateGrid(5, 5, rect(0, 0, 500, 500));

    expect(labelOf(zones, 0, 0)).toBe('Superior izquierda');
    expect(labelOf(zones, 0, 4)).toBe('Superior derecha');
    expect(labelOf(zones, 4, 0)).toBe('Inferior izquierda');
    expect(labelOf(zones, 4, 4)).toBe('Inferior derecha');
    expect(labelOf(zones, 2, 2)).toBe('Centro centro');
  });

  it('uses the HYBRID_AOI_GRID wording only for a true 3×3 grid', () => {
    expect(labelOf(generateGrid(3, 3, rect(0, 0, 300, 300)), 1, 1)).toBe('Centro');
  });

  it('does not apply 3×3 wording to a 3-row grid with other column counts', () => {
    expect(labelOf(generateGrid(3, 5, rect(0, 0, 500, 300)), 1, 1))
      .toBe('Centro superior centro izquierda');
  });

  it('does not apply 3×3 wording to a 3-column grid with other row counts', () => {
    expect(labelOf(generateGrid(5, 3, rect(0, 0, 300, 500)), 1, 1))
      .toBe('Centro superior centro izquierda');
  });

  it('falls back to numbered rows beyond the named set', () => {
    const zones = generateGrid(11, 11, rect(0, 0, 1100, 1100));

    expect(labelOf(zones, 0, 0)).toBe('Fila 0 Col 0');
    expect(labelOf(zones, 10, 10)).toBe('Fila 10 Col 10');
  });

  it('falls back per axis — named rows with numbered columns', () => {
    const zones = generateGrid(5, 11, rect(0, 0, 1100, 500));

    expect(labelOf(zones, 0, 0)).toBe('Superior Col 0');
    expect(labelOf(zones, 4, 10)).toBe('Inferior Col 10');
  });

  it('never produces an empty label', () => {
    for (const [rows, cols] of [[1, 1], [3, 3], [5, 5], [10, 10], [12, 12]]) {
      for (const zone of generateGrid(rows, cols, rect(0, 0, 600, 600))) {
        expect(zone.label.trim()).not.toBe('');
      }
    }
  });
});

// ---------------------------------------------------------------------------
// ResizeObserver lifecycle
//
// jsdom ships no ResizeObserver, so the registry silently runs with
// `observer === null` and none of this wiring executes under test. Stubbing it
// is the only way these paths are exercised at all.
// ---------------------------------------------------------------------------

class MockResizeObserver {
  static instances: MockResizeObserver[] = [];
  readonly observed: Element[] = [];
  readonly unobserved: Element[] = [];
  disconnected = false;

  constructor(private readonly callback: () => void) {
    MockResizeObserver.instances.push(this);
  }

  observe(el: Element): void { this.observed.push(el); }
  unobserve(el: Element): void { this.unobserved.push(el); }
  disconnect(): void { this.disconnected = true; }
  /** Simulate the browser reporting a size change. */
  fire(): void { this.callback(); }
}

describe('ZoneRegistry — ResizeObserver wiring', () => {
  beforeEach(() => {
    MockResizeObserver.instances = [];
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const observerOf = (): MockResizeObserver => MockResizeObserver.instances[0];

  it('observes element-backed zones', () => {
    const registry = new ZoneRegistry();
    const el = mockElement(rect(0, 0, 100, 100));

    registry.register('el', 'Element', el);

    expect(observerOf().observed).toContain(el);
  });

  it('does not observe zones backed by a manual rect', () => {
    const registry = new ZoneRegistry();

    registry.register('manual', 'Manual', rect(0, 0, 100, 100));

    expect(observerOf().observed).toHaveLength(0);
  });

  it('stops observing an element when its zone is unregistered', () => {
    const registry = new ZoneRegistry();
    const el = mockElement(rect(0, 0, 100, 100));
    registry.register('el', 'Element', el);

    registry.unregister('el');

    expect(observerOf().unobserved).toContain(el);
  });

  it('stops observing the previous element when an ID is re-registered', () => {
    const registry = new ZoneRegistry();
    const first = mockElement(rect(0, 0, 100, 100));
    const second = mockElement(rect(0, 0, 200, 200));
    registry.register('el', 'Element', first);

    registry.register('el', 'Element', second);

    expect(observerOf().unobserved).toContain(first);
    expect(observerOf().observed).toContain(second);
  });

  it('does not attempt to unobserve a manual-rect zone', () => {
    const registry = new ZoneRegistry();
    registry.register('manual', 'Manual', rect(0, 0, 100, 100));

    registry.unregister('manual');

    expect(observerOf().unobserved).toHaveLength(0);
  });

  it('stops observing every element on clear', () => {
    const registry = new ZoneRegistry();
    const a = mockElement(rect(0, 0, 100, 100));
    const b = mockElement(rect(100, 0, 100, 100));
    registry.register('a', 'A', a);
    registry.register('b', 'B', b);
    registry.register('manual', 'Manual', rect(0, 200, 100, 100));

    registry.clear();

    expect(observerOf().unobserved).toEqual([a, b]);
  });

  it('disconnects the observer on destroy', () => {
    const registry = new ZoneRegistry();
    registry.register('el', 'Element', mockElement(rect(0, 0, 100, 100)));

    registry.destroy();

    expect(observerOf().disconnected).toBe(true);
  });

  it('refreshes zone rects when the observer reports a resize', () => {
    const registry = new ZoneRegistry();
    let width = 100;
    const el = {
      getBoundingClientRect: () => ({
        x: 0, y: 0, width, height: 100,
        top: 0, left: 0, right: width, bottom: 100,
        toJSON: () => ({}),
      }),
    } as unknown as HTMLElement;

    registry.register('el', 'Element', el);
    expect(registry.getZones()[0].rect.width).toBe(100);

    width = 250;
    // Cache still holds the stale value until the observer fires.
    expect(registry.getZones()[0].rect.width).toBe(100);

    observerOf().fire();

    expect(registry.getZones()[0].rect.width).toBe(250);
  });
});

describe('ZoneRegistry — without ResizeObserver support', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('still registers and resolves element-backed zones', () => {
    const registry = new ZoneRegistry();
    const el = mockElement(rect(0, 0, 100, 100));

    expect(() => registry.register('el', 'Element', el)).not.toThrow();
    expect(registry.getZoneAt(50, 50)?.zone.id).toBe('el');
  });

  it('unregister, clear and destroy stay safe with no observer', () => {
    const registry = new ZoneRegistry();
    registry.register('el', 'Element', mockElement(rect(0, 0, 100, 100)));

    expect(() => {
      registry.unregister('el');
      registry.register('el2', 'Element 2', mockElement(rect(0, 0, 50, 50)));
      registry.clear();
      registry.destroy();
    }).not.toThrow();
  });
});
