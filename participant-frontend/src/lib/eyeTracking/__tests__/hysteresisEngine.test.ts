import { describe, it, expect, beforeEach } from 'vitest';
import {
  HysteresisEngine,
  DEFAULT_SWITCH_THRESHOLD_MS,
  type HysteresisResult,
} from '../hysteresisEngine';
import type { ZoneProbability } from '../zoneClassifier';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Shortcut to build a single-zone probability array. */
const prob = (zoneId: string, confidence = 0.8): ZoneProbability[] => [
  { zoneId, confidence, distance: 0 },
];

/** Build multi-zone probabilities. */
const probs = (...entries: [string, number][]): ZoneProbability[] =>
  entries
    .map(([zoneId, confidence]) => ({ zoneId, confidence, distance: 0 }))
    .sort((a, b) => b.confidence - a.confidence);

/** Feed N identical samples spaced by `stepMs`. Returns last result. */
const feedN = (
  engine: HysteresisEngine,
  zoneId: string,
  count: number,
  startMs: number,
  stepMs = 50,
  confidence = 0.8,
): HysteresisResult => {
  let result: HysteresisResult = { zone: null, changed: false, confidence: 0 };
  for (let i = 0; i < count; i++) {
    result = engine.update(prob(zoneId, confidence), startMs + i * stepMs);
  }
  return result;
};

/** Feed empty probabilities (gaze outside all zones). */
const feedNull = (engine: HysteresisEngine, ts: number): HysteresisResult =>
  engine.update([], ts);

// ---------------------------------------------------------------------------
// First sample behavior
// ---------------------------------------------------------------------------

describe('HysteresisEngine — first sample', () => {
  let engine: HysteresisEngine;

  beforeEach(() => {
    engine = new HysteresisEngine();
  });

  it('assigns zone immediately on first sample', () => {
    const result = engine.update(prob('A'), 0);
    expect(result.zone).toBe('A');
    expect(result.changed).toBe(true);
    expect(result.confidence).toBe(0.8);
  });

  it('first sample with empty probabilities assigns null', () => {
    const result = feedNull(engine, 0);
    expect(result.zone).toBeNull();
    expect(result.changed).toBe(false);
    // null→null is not a "change"
  });

  it('getZone reflects first sample immediately', () => {
    engine.update(prob('X'), 0);
    expect(engine.getZone()).toBe('X');
    expect(engine.getConfidence()).toBe(0.8);
  });
});

// ---------------------------------------------------------------------------
// Stable zone — no switching
// ---------------------------------------------------------------------------

describe('HysteresisEngine — stable zone', () => {
  let engine: HysteresisEngine;

  beforeEach(() => {
    engine = new HysteresisEngine();
    engine.update(prob('A'), 0);
  });

  it('repeated same zone → no change events', () => {
    for (let t = 50; t <= 500; t += 50) {
      const result = engine.update(prob('A'), t);
      expect(result.zone).toBe('A');
      expect(result.changed).toBe(false);
    }
  });

  it('confidence updates on each sample', () => {
    engine.update(prob('A', 0.6), 50);
    expect(engine.getConfidence()).toBe(0.6);

    engine.update(prob('A', 0.95), 100);
    expect(engine.getConfidence()).toBe(0.95);
  });

  it('stable zone clears any pending candidate', () => {
    // Start candidate B
    engine.update(prob('B'), 50);
    // Return to A — candidate should be cleared
    engine.update(prob('A'), 100);
    // B again for 150ms (not enough)
    engine.update(prob('B'), 150);
    engine.update(prob('B'), 200);
    engine.update(prob('B'), 250);
    // Not switched because candidate timer restarted at t=150
    expect(engine.getZone()).toBe('A');
  });
});

// ---------------------------------------------------------------------------
// Zone switching — threshold behavior
// ---------------------------------------------------------------------------

describe('HysteresisEngine — zone switching', () => {
  let engine: HysteresisEngine;

  beforeEach(() => {
    engine = new HysteresisEngine();
    engine.update(prob('A'), 0);
  });

  it('switches after candidate holds for threshold duration', () => {
    engine.update(prob('B'), 100);  // candidate starts
    engine.update(prob('B'), 200);  // 100ms elapsed — not enough
    const result = engine.update(prob('B'), 300); // 200ms elapsed — switches
    expect(result.zone).toBe('B');
    expect(result.changed).toBe(true);
  });

  it('does NOT switch when candidate holds for less than threshold', () => {
    engine.update(prob('B'), 100);
    const result = engine.update(prob('B'), 299); // 199ms — just under
    expect(result.zone).toBe('A');
    expect(result.changed).toBe(false);
  });

  it('switches at exact threshold boundary', () => {
    engine.update(prob('B'), 100);
    const result = engine.update(prob('B'), 100 + DEFAULT_SWITCH_THRESHOLD_MS);
    expect(result.zone).toBe('B');
    expect(result.changed).toBe(true);
  });

  it('changed is true only on the transition frame', () => {
    engine.update(prob('B'), 100);
    const switchResult = engine.update(prob('B'), 300);
    expect(switchResult.changed).toBe(true);

    // Subsequent B samples — no more changes
    const next = engine.update(prob('B'), 350);
    expect(next.changed).toBe(false);
    expect(next.zone).toBe('B');
  });

  it('getZone reflects new zone after switch', () => {
    engine.update(prob('B'), 100);
    engine.update(prob('B'), 300);
    expect(engine.getZone()).toBe('B');
  });

  it('confidence reflects candidate confidence on switch', () => {
    engine.update(prob('B', 0.9), 100);
    engine.update(prob('B', 0.85), 300);
    expect(engine.getConfidence()).toBe(0.85);
  });
});

// ---------------------------------------------------------------------------
// Hysteresis rejection — oscillation patterns
// ---------------------------------------------------------------------------

describe('HysteresisEngine — oscillation rejection', () => {
  let engine: HysteresisEngine;

  beforeEach(() => {
    engine = new HysteresisEngine();
    engine.update(prob('A'), 0);
  });

  it('fast A-B-A switch does NOT change zone (single interruption)', () => {
    engine.update(prob('B'), 100);  // candidate B starts
    engine.update(prob('A'), 150);  // back to A — candidate cleared
    expect(engine.getZone()).toBe('A');
  });

  it('rapid A-B-A-B oscillation every 50ms stays on A', () => {
    for (let t = 50; t <= 500; t += 50) {
      const zone = t % 100 === 50 ? 'B' : 'A';
      engine.update(prob(zone), t);
    }
    // Each B candidate lasts only 50ms (< 200ms threshold)
    expect(engine.getZone()).toBe('A');
  });

  it('rapid 3-way oscillation A-B-C every 60ms stays on A', () => {
    const pattern = ['B', 'C', 'A', 'B', 'C', 'A', 'B', 'C'];
    pattern.forEach((z, i) => {
      engine.update(prob(z), 50 + i * 60);
    });
    // No candidate holds for 200ms → stays on A
    expect(engine.getZone()).toBe('A');
  });

  it('brief interruption resets candidate timer', () => {
    engine.update(prob('B'), 100);  // B candidate at t=100
    engine.update(prob('B'), 200);  // B held 100ms
    engine.update(prob('C'), 250);  // C interrupts — B candidate dies
    engine.update(prob('B'), 300);  // B restarts at t=300
    engine.update(prob('B'), 400);  // B held 100ms from t=300
    // Still not enough — 100ms < 200ms
    expect(engine.getZone()).toBe('A');

    // Now hold B long enough from its restart
    engine.update(prob('B'), 500); // 200ms from t=300 → switches
    expect(engine.getZone()).toBe('B');
  });

  it('glitch frame does not cause transition', () => {
    // 1 frame of B in a sea of A
    for (let t = 50; t <= 400; t += 50) {
      engine.update(prob(t === 200 ? 'B' : 'A'), t);
    }
    expect(engine.getZone()).toBe('A');
  });
});

// ---------------------------------------------------------------------------
// Null zone (gaze outside all zones)
// ---------------------------------------------------------------------------

describe('HysteresisEngine — null zone transitions', () => {
  let engine: HysteresisEngine;

  beforeEach(() => {
    engine = new HysteresisEngine();
    engine.update(prob('A'), 0);
  });

  it('transitions to null after threshold when gaze leaves all zones', () => {
    feedNull(engine, 100);
    feedNull(engine, 200);
    const result = feedNull(engine, 300);
    expect(result.zone).toBeNull();
    expect(result.changed).toBe(true);
  });

  it('brief null does not transition', () => {
    feedNull(engine, 100);
    engine.update(prob('A'), 150);
    expect(engine.getZone()).toBe('A');
  });

  it('transitions from null back to zone after threshold', () => {
    // Go to null
    feedNull(engine, 100);
    feedNull(engine, 300);
    expect(engine.getZone()).toBeNull();

    // Come back to B
    engine.update(prob('B'), 400);
    engine.update(prob('B'), 600);
    expect(engine.getZone()).toBe('B');
  });
});

// ---------------------------------------------------------------------------
// Multi-zone probabilities
// ---------------------------------------------------------------------------

describe('HysteresisEngine — multi-zone probabilities', () => {
  let engine: HysteresisEngine;

  beforeEach(() => {
    engine = new HysteresisEngine();
  });

  it('uses top zone from sorted probabilities', () => {
    const result = engine.update(probs(['A', 0.6], ['B', 0.3], ['C', 0.1]), 0);
    expect(result.zone).toBe('A');
  });

  it('top zone change triggers candidate even with shared probabilities', () => {
    engine.update(probs(['A', 0.6], ['B', 0.4]), 0);
    engine.update(probs(['B', 0.55], ['A', 0.45]), 100);
    engine.update(probs(['B', 0.55], ['A', 0.45]), 300);
    expect(engine.getZone()).toBe('B');
  });

  it('confidence tracks top zone confidence, not sum', () => {
    engine.update(probs(['A', 0.7], ['B', 0.3]), 0);
    expect(engine.getConfidence()).toBe(0.7);
  });
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe('HysteresisEngine — reset', () => {
  it('clears zone and confidence', () => {
    const engine = new HysteresisEngine();
    engine.update(prob('A'), 0);
    engine.reset();

    expect(engine.getZone()).toBeNull();
    expect(engine.getConfidence()).toBe(0);
  });

  it('next sample after reset acts as first sample (immediate assign)', () => {
    const engine = new HysteresisEngine();
    engine.update(prob('A'), 0);
    engine.reset();

    const result = engine.update(prob('B'), 1000);
    expect(result.zone).toBe('B');
    expect(result.changed).toBe(true);
  });

  it('pending candidate is cleared on reset', () => {
    const engine = new HysteresisEngine();
    engine.update(prob('A'), 0);
    engine.update(prob('B'), 100); // candidate B started
    engine.reset();

    // B no longer has accumulated time
    engine.update(prob('B'), 200);
    // This is first sample after reset → immediate assign
    expect(engine.getZone()).toBe('B');
  });

  it('double reset is safe', () => {
    const engine = new HysteresisEngine();
    engine.update(prob('A'), 0);
    engine.reset();
    engine.reset();
    expect(engine.getZone()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Configurable threshold
// ---------------------------------------------------------------------------

describe('HysteresisEngine — configurable threshold', () => {
  it('150ms threshold switches faster than 250ms', () => {
    const fast = new HysteresisEngine({ switchThresholdMs: 150 });
    const slow = new HysteresisEngine({ switchThresholdMs: 250 });

    fast.update(prob('A'), 0);
    slow.update(prob('A'), 0);

    // Feed B for 160ms
    fast.update(prob('B'), 100);
    slow.update(prob('B'), 100);
    fast.update(prob('B'), 260);
    slow.update(prob('B'), 260);

    expect(fast.getZone()).toBe('B');  // 160ms >= 150ms → switched
    expect(slow.getZone()).toBe('A');  // 160ms < 250ms → still A
  });

  it('threshold 0 switches immediately on every change', () => {
    const engine = new HysteresisEngine({ switchThresholdMs: 0 });
    engine.update(prob('A'), 0);
    const result = engine.update(prob('B'), 50);
    expect(result.zone).toBe('B');
    expect(result.changed).toBe(true);
  });

  it('very large threshold prevents all switching', () => {
    const engine = new HysteresisEngine({ switchThresholdMs: 999999 });
    engine.update(prob('A'), 0);

    feedN(engine, 'B', 100, 100, 50);
    // 100 samples × 50ms = 5000ms total, still < 999999
    expect(engine.getZone()).toBe('A');
  });
});

// ---------------------------------------------------------------------------
// Timestamp handling
// ---------------------------------------------------------------------------

describe('HysteresisEngine — timestamp edge cases', () => {
  it('handles non-monotonic timestamps gracefully (uses abs diff)', () => {
    const engine = new HysteresisEngine();
    engine.update(prob('A'), 1000);

    // Timestamps go backward
    engine.update(prob('B'), 900);
    engine.update(prob('B'), 700); // abs(700-900) = 200ms → should switch
    expect(engine.getZone()).toBe('B');
  });

  it('handles very large timestamps', () => {
    const engine = new HysteresisEngine();
    const t0 = 1e12;
    engine.update(prob('A'), t0);
    engine.update(prob('B'), t0 + 100);
    engine.update(prob('B'), t0 + 300);
    expect(engine.getZone()).toBe('B');
  });

  it('handles timestamp 0 for all samples', () => {
    const engine = new HysteresisEngine();
    engine.update(prob('A'), 0);
    engine.update(prob('B'), 0);
    engine.update(prob('B'), 0);
    // elapsed = abs(0-0) = 0 < 200ms → no switch
    expect(engine.getZone()).toBe('A');
  });
});

// ---------------------------------------------------------------------------
// Complex sequences
// ---------------------------------------------------------------------------

describe('HysteresisEngine — complex sequences', () => {
  it('A(300ms) → B(50ms) → C(300ms) → ends on C', () => {
    const engine = new HysteresisEngine();
    // A for 300ms
    engine.update(prob('A'), 0);
    feedN(engine, 'A', 5, 50, 50); // t=50..250

    // B for 50ms — too short
    engine.update(prob('B'), 300);

    // C for 300ms
    engine.update(prob('C'), 350);
    feedN(engine, 'C', 5, 400, 50); // t=400..600

    expect(engine.getZone()).toBe('C');
  });

  it('gradual transition A→B with decreasing A confidence', () => {
    const engine = new HysteresisEngine();
    engine.update(probs(['A', 0.9], ['B', 0.1]), 0);

    // A still dominant
    engine.update(probs(['A', 0.6], ['B', 0.4]), 100);
    expect(engine.getZone()).toBe('A');

    // B takes over
    engine.update(probs(['B', 0.55], ['A', 0.45]), 200);
    // B candidate starts at t=200
    engine.update(probs(['B', 0.6], ['A', 0.4]), 400);
    // 200ms elapsed → switch
    expect(engine.getZone()).toBe('B');
  });

  it('5 zones cycling: only settles when one holds long enough', () => {
    const engine = new HysteresisEngine();
    const zones = ['A', 'B', 'C', 'D', 'E'];
    engine.update(prob('A'), 0);

    // Cycle through each for 30ms — never enough
    let t = 50;
    for (let cycle = 0; cycle < 3; cycle++) {
      zones.forEach((z) => {
        engine.update(prob(z), t);
        t += 30;
      });
    }
    expect(engine.getZone()).toBe('A'); // never switched

    // Now hold D for 250ms
    feedN(engine, 'D', 6, t, 50);
    expect(engine.getZone()).toBe('D');
  });

  it('double switch A→B→C with sufficient hold times', () => {
    const engine = new HysteresisEngine();
    engine.update(prob('A'), 0);

    // Switch to B
    engine.update(prob('B'), 100);
    engine.update(prob('B'), 300);
    expect(engine.getZone()).toBe('B');

    // Switch to C
    engine.update(prob('C'), 400);
    engine.update(prob('C'), 600);
    expect(engine.getZone()).toBe('C');
  });
});

// ---------------------------------------------------------------------------
// State isolation
// ---------------------------------------------------------------------------

describe('HysteresisEngine — instance isolation', () => {
  it('two engines do not share state', () => {
    const e1 = new HysteresisEngine();
    const e2 = new HysteresisEngine();

    e1.update(prob('A'), 0);
    e2.update(prob('X'), 0);

    expect(e1.getZone()).toBe('A');
    expect(e2.getZone()).toBe('X');
  });

  it('resetting one engine does not affect another', () => {
    const e1 = new HysteresisEngine();
    const e2 = new HysteresisEngine();

    e1.update(prob('A'), 0);
    e2.update(prob('A'), 0);

    e1.reset();
    expect(e1.getZone()).toBeNull();
    expect(e2.getZone()).toBe('A');
  });
});
