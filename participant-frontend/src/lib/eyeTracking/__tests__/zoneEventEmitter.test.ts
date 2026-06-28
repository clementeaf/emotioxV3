import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ZoneEventEmitter,
  DEFAULT_MIN_ZONE_FIXATION_MS,
  type ZoneEvent,
  type ZoneEventType,
} from '../zoneEventEmitter';
import type { Zone } from '../zoneRegistry';
import type { EkmanEmotion } from '../facsClassifier';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a zone. */
const zone = (id: string, x: number, y: number, w: number, h: number): Zone => ({
  id, label: id, rect: { x, y, width: w, height: h }, priority: 0,
});

/** Standard 2-zone layout: left and right, no gap. */
const twoZones = (): Zone[] => [
  zone('left',  0,   0, 200, 400),
  zone('right', 200, 0, 200, 400),
];

/** Collect all events of given types. */
function collectEvents(emitter: ZoneEventEmitter, ...types: ZoneEventType[]): ZoneEvent[] {
  const collected: ZoneEvent[] = [];
  types.forEach((type) => emitter.on(type, (e) => collected.push(e)));
  return collected;
}

/** Feed N samples at the same position, spaced by stepMs. */
function feedN(
  emitter: ZoneEventEmitter,
  gazeX: number, gazeY: number,
  zones: readonly Zone[],
  count: number,
  startMs: number,
  stepMs = 50,
  emotion?: EkmanEmotion,
): void {
  for (let i = 0; i < count; i++) {
    emitter.feed(gazeX, gazeY, startMs + i * stepMs, zones, emotion);
  }
}

// ---------------------------------------------------------------------------
// Zone enter/leave events
// ---------------------------------------------------------------------------

describe('ZoneEventEmitter — zone enter/leave', () => {
  let emitter: ZoneEventEmitter;
  let zones: Zone[];

  beforeEach(() => {
    emitter = new ZoneEventEmitter({ switchThresholdMs: 0, uncertaintyRadius: 50 });
    zones = twoZones();
  });

  it('emits zone_enter on first feed into a zone', () => {
    const events = collectEvents(emitter, 'zone_enter');
    emitter.feed(100, 200, 0, zones);
    expect(events).toHaveLength(1);
    expect(events[0].zoneId).toBe('left');
    expect(events[0].timestamp).toBe(0);
  });

  it('does NOT emit zone_enter when staying in same zone', () => {
    const events = collectEvents(emitter, 'zone_enter');
    feedN(emitter, 100, 200, zones, 10, 0);
    expect(events).toHaveLength(1); // only the first
  });

  it('emits zone_leave + zone_enter on transition', () => {
    const enters = collectEvents(emitter, 'zone_enter');
    const leaves = collectEvents(emitter, 'zone_leave');

    emitter.feed(100, 200, 0, zones);   // enter left
    emitter.feed(300, 200, 100, zones); // enter right

    expect(leaves).toHaveLength(1);
    expect(leaves[0].zoneId).toBe('left');
    expect(leaves[0].duration).toBe(100);

    expect(enters).toHaveLength(2);
    expect(enters[1].zoneId).toBe('right');
  });

  it('zone_leave has correct duration', () => {
    const leaves = collectEvents(emitter, 'zone_leave');
    emitter.feed(100, 200, 0, zones);
    emitter.feed(100, 200, 500, zones); // dwell 500ms
    emitter.feed(300, 200, 600, zones); // transition

    expect(leaves[0].duration).toBe(600);
  });

  it('multiple transitions produce paired enter/leave events', () => {
    const enters = collectEvents(emitter, 'zone_enter');
    const leaves = collectEvents(emitter, 'zone_leave');

    emitter.feed(100, 200, 0, zones);    // left
    emitter.feed(300, 200, 100, zones);  // right
    emitter.feed(100, 200, 200, zones);  // left again

    expect(enters).toHaveLength(3);
    expect(leaves).toHaveLength(2);
    expect(enters.map((e) => e.zoneId)).toEqual(['left', 'right', 'left']);
    expect(leaves.map((e) => e.zoneId)).toEqual(['left', 'right']);
  });

  it('does not emit zone_leave for null → zone transition', () => {
    const leaves = collectEvents(emitter, 'zone_leave');
    // First feed at a position outside all zones (very far)
    emitter.feed(9999, 9999, 0, zones);
    // Then move into a zone
    emitter.feed(100, 200, 100, zones);
    // No leave for "null" zone
    expect(leaves).toHaveLength(0);
  });

  it('emits zone_leave when transitioning to null (outside all zones)', () => {
    const leaves = collectEvents(emitter, 'zone_leave');
    emitter.feed(100, 200, 0, zones);      // enter left
    emitter.feed(9999, 9999, 100, zones);  // leave to null

    expect(leaves).toHaveLength(1);
    expect(leaves[0].zoneId).toBe('left');
  });
});

// ---------------------------------------------------------------------------
// Fixation start/end events
// ---------------------------------------------------------------------------

describe('ZoneEventEmitter — fixation events', () => {
  let emitter: ZoneEventEmitter;
  let zones: Zone[];

  beforeEach(() => {
    emitter = new ZoneEventEmitter({
      switchThresholdMs: 0,
      uncertaintyRadius: 50,
      minFixationMs: 150,
    });
    zones = twoZones();
  });

  it('emits fixation_start after minFixationMs dwell in a zone', () => {
    const fixStarts = collectEvents(emitter, 'fixation_start');

    emitter.feed(100, 200, 0, zones);
    expect(fixStarts).toHaveLength(0); // too early

    emitter.feed(100, 200, 100, zones);
    expect(fixStarts).toHaveLength(0); // 100ms < 150ms

    emitter.feed(100, 200, 150, zones);
    expect(fixStarts).toHaveLength(1);
    expect(fixStarts[0].zoneId).toBe('left');
    expect(fixStarts[0].timestamp).toBe(0); // timestamp = zone entry time
  });

  it('emits fixation_end when leaving zone with active fixation', () => {
    const fixEnds = collectEvents(emitter, 'fixation_end');

    feedN(emitter, 100, 200, zones, 5, 0, 50); // 200ms dwell → fixation active
    emitter.feed(300, 200, 300, zones);         // leave zone

    expect(fixEnds).toHaveLength(1);
    expect(fixEnds[0].zoneId).toBe('left');
    expect(fixEnds[0].duration).toBe(300); // from fixation start (t=0) to leave (t=300)
  });

  it('does NOT emit fixation_start if zone changes before threshold', () => {
    const fixStarts = collectEvents(emitter, 'fixation_start');

    emitter.feed(100, 200, 0, zones);   // enter left
    emitter.feed(300, 200, 100, zones); // leave at 100ms < 150ms

    expect(fixStarts).toHaveLength(0);
  });

  it('does NOT emit fixation_end if no fixation was active', () => {
    const fixEnds = collectEvents(emitter, 'fixation_end');

    emitter.feed(100, 200, 0, zones);   // enter left
    emitter.feed(300, 200, 50, zones);  // leave at 50ms — no fixation

    expect(fixEnds).toHaveLength(0);
  });

  it('emits only one fixation_start per zone visit', () => {
    const fixStarts = collectEvents(emitter, 'fixation_start');

    feedN(emitter, 100, 200, zones, 20, 0, 50); // 950ms dwell
    expect(fixStarts).toHaveLength(1); // only first crossing of threshold
  });

  it('new fixation starts on re-entry to same zone', () => {
    const fixStarts = collectEvents(emitter, 'fixation_start');

    // First visit — fixation
    feedN(emitter, 100, 200, zones, 5, 0, 50);
    // Leave
    emitter.feed(300, 200, 300, zones);
    // Re-enter
    feedN(emitter, 100, 200, zones, 5, 400, 50);

    expect(fixStarts).toHaveLength(2);
  });

  it('fixation_end duration matches actual fixation time', () => {
    const fixEnds = collectEvents(emitter, 'fixation_end');

    emitter.feed(100, 200, 1000, zones);  // enter at 1000
    emitter.feed(100, 200, 1200, zones);  // fixation starts (entry time = 1000)
    emitter.feed(100, 200, 1500, zones);  // still fixating
    emitter.feed(300, 200, 1800, zones);  // leave at 1800

    expect(fixEnds).toHaveLength(1);
    expect(fixEnds[0].duration).toBe(800); // 1800 - 1000
  });
});

// ---------------------------------------------------------------------------
// Emotion propagation
// ---------------------------------------------------------------------------

describe('ZoneEventEmitter — emotion propagation', () => {
  let emitter: ZoneEventEmitter;
  let zones: Zone[];

  beforeEach(() => {
    emitter = new ZoneEventEmitter({ switchThresholdMs: 0, uncertaintyRadius: 50 });
    zones = twoZones();
  });

  it('zone_enter carries emotion', () => {
    const enters = collectEvents(emitter, 'zone_enter');
    emitter.feed(100, 200, 0, zones, 'joy');
    expect(enters[0].emotion).toBe('joy');
  });

  it('zone_leave carries last known emotion', () => {
    const leaves = collectEvents(emitter, 'zone_leave');
    emitter.feed(100, 200, 0, zones, 'joy');
    emitter.feed(100, 200, 50, zones, 'surprise'); // update emotion
    emitter.feed(300, 200, 100, zones, 'surprise');

    expect(leaves[0].emotion).toBe('surprise');
  });

  it('fixation events carry emotion', () => {
    const fixStarts = collectEvents(emitter, 'fixation_start');
    emitter.feed(100, 200, 0, zones, 'anger');
    emitter.feed(100, 200, 200, zones, 'anger');
    expect(fixStarts[0].emotion).toBe('anger');
  });

  it('events without emotion have undefined emotion field', () => {
    const enters = collectEvents(emitter, 'zone_enter');
    emitter.feed(100, 200, 0, zones);
    expect(enters[0].emotion).toBeUndefined();
  });

  it('state reflects latest emotion', () => {
    emitter.feed(100, 200, 0, zones, 'joy');
    expect(emitter.getState().emotion).toBe('joy');

    emitter.feed(100, 200, 50, zones, 'fear');
    expect(emitter.getState().emotion).toBe('fear');
  });
});

// ---------------------------------------------------------------------------
// Listener management
// ---------------------------------------------------------------------------

describe('ZoneEventEmitter — listener management', () => {
  let emitter: ZoneEventEmitter;
  let zones: Zone[];

  beforeEach(() => {
    emitter = new ZoneEventEmitter({ switchThresholdMs: 0, uncertaintyRadius: 50 });
    zones = twoZones();
  });

  it('multiple listeners receive the same event', () => {
    const log1: string[] = [];
    const log2: string[] = [];
    emitter.on('zone_enter', (e) => log1.push(e.zoneId!));
    emitter.on('zone_enter', (e) => log2.push(e.zoneId!));

    emitter.feed(100, 200, 0, zones);

    expect(log1).toEqual(['left']);
    expect(log2).toEqual(['left']);
  });

  it('off removes a specific listener', () => {
    const log: string[] = [];
    const listener = (e: ZoneEvent) => log.push(e.zoneId!);

    emitter.on('zone_enter', listener);
    emitter.feed(100, 200, 0, zones);
    expect(log).toHaveLength(1);

    emitter.off('zone_enter', listener);
    emitter.feed(300, 200, 100, zones);
    emitter.feed(100, 200, 200, zones);
    // No new events after off
    expect(log).toHaveLength(1);
  });

  it('off for unregistered listener is a no-op', () => {
    const listener = vi.fn();
    expect(() => emitter.off('zone_enter', listener)).not.toThrow();
  });

  it('listeners for different event types are independent', () => {
    const enters = vi.fn();
    const leaves = vi.fn();
    emitter.on('zone_enter', enters);
    emitter.on('zone_leave', leaves);

    emitter.feed(100, 200, 0, zones);
    expect(enters).toHaveBeenCalledTimes(1);
    expect(leaves).toHaveBeenCalledTimes(0);
  });

  it('adding same listener twice does not duplicate events', () => {
    const log: string[] = [];
    const listener = (e: ZoneEvent) => log.push(e.zoneId!);

    emitter.on('zone_enter', listener);
    emitter.on('zone_enter', listener); // duplicate — Set deduplicates

    emitter.feed(100, 200, 0, zones);
    expect(log).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// State access
// ---------------------------------------------------------------------------

describe('ZoneEventEmitter — state access', () => {
  let emitter: ZoneEventEmitter;
  let zones: Zone[];

  beforeEach(() => {
    emitter = new ZoneEventEmitter({ switchThresholdMs: 0, uncertaintyRadius: 50 });
    zones = twoZones();
  });

  it('initial state is null zone, zero confidence', () => {
    expect(emitter.getZone()).toBeNull();
    expect(emitter.getConfidence()).toBe(0);
  });

  it('getZone reflects current zone after feed', () => {
    emitter.feed(100, 200, 0, zones);
    expect(emitter.getZone()).toBe('left');

    emitter.feed(300, 200, 100, zones);
    expect(emitter.getZone()).toBe('right');
  });

  it('getConfidence reflects classification confidence', () => {
    emitter.feed(100, 200, 0, zones);
    expect(emitter.getConfidence()).toBeGreaterThan(0);
  });

  it('getState returns complete snapshot', () => {
    emitter.feed(100, 200, 0, zones, 'joy');
    const state = emitter.getState();
    expect(state.currentZone).toBe('left');
    expect(state.confidence).toBeGreaterThan(0);
    expect(state.emotion).toBe('joy');
  });
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe('ZoneEventEmitter — reset', () => {
  it('clears zone and fixation state', () => {
    const emitter = new ZoneEventEmitter({ switchThresholdMs: 0, uncertaintyRadius: 50 });
    const zones = twoZones();

    feedN(emitter, 100, 200, zones, 10, 0);
    emitter.reset();

    expect(emitter.getZone()).toBeNull();
    expect(emitter.getConfidence()).toBe(0);
    expect(emitter.getState().fixationActive).toBe(false);
    expect(emitter.getState().emotion).toBeNull();
  });

  it('emits fixation_end on reset if fixation was active', () => {
    const emitter = new ZoneEventEmitter({ switchThresholdMs: 0, uncertaintyRadius: 50 });
    const zones = twoZones();
    const fixEnds = collectEvents(emitter, 'fixation_end');

    feedN(emitter, 100, 200, zones, 5, 0, 50); // 200ms dwell → fixation active
    emitter.reset();

    expect(fixEnds).toHaveLength(1);
  });

  it('next feed after reset acts as first sample', () => {
    const emitter = new ZoneEventEmitter({ switchThresholdMs: 0, uncertaintyRadius: 50 });
    const zones = twoZones();
    const enters = collectEvents(emitter, 'zone_enter');

    emitter.feed(100, 200, 0, zones);
    emitter.reset();
    emitter.feed(300, 200, 1000, zones);

    expect(enters).toHaveLength(2);
    expect(enters[1].zoneId).toBe('right');
  });
});

// ---------------------------------------------------------------------------
// Destroy
// ---------------------------------------------------------------------------

describe('ZoneEventEmitter — destroy', () => {
  it('clears all listeners and state', () => {
    const emitter = new ZoneEventEmitter({ switchThresholdMs: 0, uncertaintyRadius: 50 });
    const zones = twoZones();
    const listener = vi.fn();

    emitter.on('zone_enter', listener);
    emitter.feed(100, 200, 0, zones);
    expect(listener).toHaveBeenCalledTimes(1);

    emitter.destroy();

    // Feed after destroy — no events
    emitter.feed(300, 200, 100, zones);
    expect(listener).toHaveBeenCalledTimes(1); // no new calls
    expect(emitter.getZone()).toBeNull();
  });

  it('double destroy is safe', () => {
    const emitter = new ZoneEventEmitter();
    emitter.destroy();
    expect(() => emitter.destroy()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Hysteresis integration
// ---------------------------------------------------------------------------

describe('ZoneEventEmitter — hysteresis integration', () => {
  it('with default threshold, brief zone visit does not trigger enter', () => {
    const emitter = new ZoneEventEmitter({ uncertaintyRadius: 50 }); // default 200ms threshold
    const zones = twoZones();
    const enters = collectEvents(emitter, 'zone_enter');

    emitter.feed(100, 200, 0, zones); // first sample → immediate enter
    // Brief visit to right (< 200ms hysteresis threshold)
    emitter.feed(300, 200, 50, zones);
    emitter.feed(300, 200, 100, zones);
    emitter.feed(100, 200, 150, zones); // back to left

    // Only 1 enter (the initial one) — the brief right visit was rejected
    expect(enters).toHaveLength(1);
    expect(enters[0].zoneId).toBe('left');
  });

  it('sustained visit beyond threshold triggers enter', () => {
    const emitter = new ZoneEventEmitter({ uncertaintyRadius: 50 }); // 200ms
    const zones = twoZones();
    const enters = collectEvents(emitter, 'zone_enter');

    emitter.feed(100, 200, 0, zones);   // enter left
    emitter.feed(300, 200, 100, zones); // candidate right
    emitter.feed(300, 200, 300, zones); // 200ms → commit right

    expect(enters).toHaveLength(2);
    expect(enters[1].zoneId).toBe('right');
  });
});

// ---------------------------------------------------------------------------
// Complex sequences
// ---------------------------------------------------------------------------

describe('ZoneEventEmitter — complex sequences', () => {
  let emitter: ZoneEventEmitter;
  let zones: Zone[];

  beforeEach(() => {
    emitter = new ZoneEventEmitter({
      switchThresholdMs: 0,
      uncertaintyRadius: 50,
      minFixationMs: 100,
    });
    zones = twoZones();
  });

  it('full lifecycle: enter → fixation_start → fixation_end → leave → enter', () => {
    const allEvents: ZoneEvent[] = [];
    const types: ZoneEventType[] = ['zone_enter', 'zone_leave', 'fixation_start', 'fixation_end'];
    types.forEach((t) => emitter.on(t, (e) => allEvents.push(e)));

    // Enter left, dwell for fixation
    emitter.feed(100, 200, 0, zones);    // zone_enter left
    emitter.feed(100, 200, 100, zones);  // fixation_start left
    emitter.feed(100, 200, 300, zones);  // still fixating

    // Move to right
    emitter.feed(300, 200, 400, zones);  // fixation_end left, zone_leave left, zone_enter right

    const eventTypes = allEvents.map((e) => `${e.type}:${e.zoneId}`);
    expect(eventTypes).toEqual([
      'zone_enter:left',
      'fixation_start:left',
      'fixation_end:left',
      'zone_leave:left',
      'zone_enter:right',
    ]);
  });

  it('rapid zone changes produce only enter/leave pairs, no fixations', () => {
    const fixStarts = collectEvents(emitter, 'fixation_start');

    for (let t = 0; t < 500; t += 50) {
      const x = t % 100 === 0 ? 100 : 300; // alternate left/right every 50ms
      emitter.feed(x, 200, t, zones);
    }

    // Each zone visit is 50ms < 100ms minFixationMs
    expect(fixStarts).toHaveLength(0);
  });

  it('event ordering: fixation_end before zone_leave on transition', () => {
    const order: string[] = [];
    emitter.on('fixation_end', () => order.push('fixation_end'));
    emitter.on('zone_leave', () => order.push('zone_leave'));
    emitter.on('zone_enter', () => order.push('zone_enter'));

    feedN(emitter, 100, 200, zones, 5, 0, 50); // fixation in left
    emitter.feed(300, 200, 300, zones);         // transition

    expect(order).toEqual(['zone_enter', 'fixation_end', 'zone_leave', 'zone_enter']);
  });

  it('empty zones array produces no events after initial null', () => {
    const events = collectEvents(emitter, 'zone_enter', 'zone_leave');

    emitter.feed(100, 200, 0, []);
    emitter.feed(100, 200, 50, []);
    emitter.feed(100, 200, 100, []);

    // No zones to enter → no enter/leave events
    expect(events).toHaveLength(0);
  });

  it('many zone transitions accumulate correct event count', () => {
    const enters = collectEvents(emitter, 'zone_enter');
    const leaves = collectEvents(emitter, 'zone_leave');

    const n = 20;
    for (let i = 0; i < n; i++) {
      const x = i % 2 === 0 ? 100 : 300;
      emitter.feed(x, 200, i * 100, zones);
    }

    // enters = n (each feed triggers a transition due to threshold=0)
    // leaves = n - 1 (first enter has no prior leave; first null→zone also has no leave)
    expect(enters.length).toBe(n);
    expect(leaves.length).toBe(n - 1);
  });
});

// ---------------------------------------------------------------------------
// Config defaults
// ---------------------------------------------------------------------------

describe('ZoneEventEmitter — config defaults', () => {
  it('default minFixationMs matches constant', () => {
    const emitter = new ZoneEventEmitter({ switchThresholdMs: 0, uncertaintyRadius: 50 });
    const zones = twoZones();
    const fixStarts = collectEvents(emitter, 'fixation_start');

    emitter.feed(100, 200, 0, zones);
    emitter.feed(100, 200, DEFAULT_MIN_ZONE_FIXATION_MS - 1, zones);
    expect(fixStarts).toHaveLength(0);

    emitter.feed(100, 200, DEFAULT_MIN_ZONE_FIXATION_MS, zones);
    expect(fixStarts).toHaveLength(1);
  });

  it('custom minFixationMs is respected', () => {
    const emitter = new ZoneEventEmitter({
      switchThresholdMs: 0,
      uncertaintyRadius: 50,
      minFixationMs: 500,
    });
    const zones = twoZones();
    const fixStarts = collectEvents(emitter, 'fixation_start');

    feedN(emitter, 100, 200, zones, 8, 0, 50); // 350ms
    expect(fixStarts).toHaveLength(0);

    emitter.feed(100, 200, 500, zones); // 500ms → fixation
    expect(fixStarts).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Instance isolation
// ---------------------------------------------------------------------------

describe('ZoneEventEmitter — instance isolation', () => {
  it('two emitters produce independent events', () => {
    const e1 = new ZoneEventEmitter({ switchThresholdMs: 0, uncertaintyRadius: 50 });
    const e2 = new ZoneEventEmitter({ switchThresholdMs: 0, uncertaintyRadius: 50 });
    const zones = twoZones();

    const log1 = collectEvents(e1, 'zone_enter');
    const log2 = collectEvents(e2, 'zone_enter');

    e1.feed(100, 200, 0, zones);
    e2.feed(300, 200, 0, zones);

    expect(log1[0].zoneId).toBe('left');
    expect(log2[0].zoneId).toBe('right');
  });
});
