import { describe, it, expect } from 'vitest';
import {
  detectFixationsIDT,
  mapFixationsToImageCoords,
  IDT_DEFAULT_DISPERSION_THRESHOLD_PX,
  IDT_DEFAULT_MIN_DURATION_MS,
  IDT_MAX_SAMPLE_GAP_MS,
} from '../fixationDetector';
import type { GazeSample, DetectedFixation } from '../fixationDetector';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sample = (x: number, y: number, t: number): GazeSample => ({ x, y, t });

function makeDOMRect(
  left: number,
  top: number,
  width: number,
  height: number,
): DOMRect {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  };
}

function makeFixation(
  x: number,
  y: number,
  duration: number,
  timestamp: number,
  pointCount: number,
): DetectedFixation {
  return { x, y, duration, timestamp, pointCount };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('exported constants', () => {
  it('IDT_DEFAULT_DISPERSION_THRESHOLD_PX is 70', () => {
    expect(IDT_DEFAULT_DISPERSION_THRESHOLD_PX).toBe(70);
  });

  it('IDT_DEFAULT_MIN_DURATION_MS is 120', () => {
    expect(IDT_DEFAULT_MIN_DURATION_MS).toBe(120);
  });

  it('IDT_MAX_SAMPLE_GAP_MS is 300', () => {
    expect(IDT_MAX_SAMPLE_GAP_MS).toBe(300);
  });
});

// ---------------------------------------------------------------------------
// detectFixationsIDT
// ---------------------------------------------------------------------------

describe('detectFixationsIDT — edge cases', () => {
  it('empty array returns empty', () => {
    expect(detectFixationsIDT([])).toEqual([]);
  });

  it('single sample returns empty (need >= 2)', () => {
    expect(detectFixationsIDT([sample(100, 200, 0)])).toEqual([]);
  });
});

describe('detectFixationsIDT — basic fixation detection', () => {
  it('tight cluster with sufficient duration produces one fixation', () => {
    // 5 samples at roughly the same spot, spanning 200ms
    const samples: GazeSample[] = [
      sample(100, 200, 0),
      sample(102, 198, 50),
      sample(101, 201, 100),
      sample(103, 199, 150),
      sample(100, 200, 200),
    ];
    const result = detectFixationsIDT(samples);
    expect(result).toHaveLength(1);

    const fix = result[0];
    // centroid: mean x = (100+102+101+103+100)/5 = 101.2 -> 101
    //           mean y = (200+198+201+199+200)/5 = 199.6 -> 200
    expect(fix.x).toBe(101);
    expect(fix.y).toBe(200);
    expect(fix.duration).toBe(200);
    expect(fix.timestamp).toBe(0);
    expect(fix.pointCount).toBe(5);
  });

  it('two separate clusters produce two fixations', () => {
    // Cluster 1 at ~(100,100) from 0-200ms
    // Gap, then Cluster 2 at ~(500,500) from 500-700ms
    const samples: GazeSample[] = [
      sample(100, 100, 0),
      sample(102, 101, 50),
      sample(101, 99, 100),
      sample(100, 100, 150),
      sample(101, 101, 200),
      // Big spatial jump — dispersion will exceed threshold
      sample(500, 500, 250),
      sample(501, 499, 300),
      sample(500, 501, 350),
      sample(502, 500, 400),
      sample(500, 500, 450),
      sample(501, 501, 500),
    ];
    const result = detectFixationsIDT(samples);
    expect(result).toHaveLength(2);
    // First fixation near (100, 100)
    expect(result[0].x).toBeCloseTo(101, 0);
    expect(result[0].y).toBeCloseTo(100, 0);
    // Second fixation near (500, 500)
    expect(result[1].x).toBeCloseTo(501, 0);
    expect(result[1].y).toBeCloseTo(500, 0);
  });

  it('high dispersion points produce no fixation', () => {
    // Points spread far apart — dispersion will exceed 70px threshold
    const samples: GazeSample[] = [
      sample(0, 0, 0),
      sample(100, 100, 50),
      sample(200, 200, 100),
      sample(300, 300, 150),
      sample(400, 400, 200),
    ];
    const result = detectFixationsIDT(samples);
    expect(result).toHaveLength(0);
  });

  it('duration below minimum produces no fixation', () => {
    // Tight cluster but only spans 50ms (< 120ms minimum)
    const samples: GazeSample[] = [
      sample(100, 100, 0),
      sample(101, 101, 25),
      sample(100, 100, 50),
    ];
    const result = detectFixationsIDT(samples);
    expect(result).toHaveLength(0);
  });
});

describe('detectFixationsIDT — temporal gap splitting', () => {
  it('gap > IDT_MAX_SAMPLE_GAP_MS splits fixation window', () => {
    // Cluster 1: 0-200ms, then gap of 400ms (> 300ms), then Cluster 2: 600-800ms
    const samples: GazeSample[] = [
      sample(100, 100, 0),
      sample(101, 101, 50),
      sample(100, 100, 100),
      sample(101, 100, 150),
      sample(100, 101, 200),
      // 400ms gap here (> 300ms threshold)
      sample(100, 100, 600),
      sample(101, 101, 650),
      sample(100, 100, 700),
      sample(101, 100, 750),
      sample(100, 101, 800),
    ];
    const result = detectFixationsIDT(samples);
    // Should produce two fixations (gap splits the window)
    expect(result).toHaveLength(2);
    expect(result[0].timestamp).toBe(0);
    expect(result[1].timestamp).toBe(600);
  });
});

describe('detectFixationsIDT — output properties', () => {
  it('centroid is Math.round of mean x and y', () => {
    // Mean x = (10+20+30)/3 = 20, mean y = (11+21+31)/3 = 21
    const samples: GazeSample[] = [
      sample(10, 11, 0),
      sample(20, 21, 70),
      sample(30, 31, 140),
    ];
    // dispersion = (30-10) + (31-11) = 40 — under default 70
    const result = detectFixationsIDT(samples);
    expect(result).toHaveLength(1);
    expect(result[0].x).toBe(20);
    expect(result[0].y).toBe(21);
  });

  it('centroid rounds fractional values', () => {
    // Mean x = (10+11+10+11)/4 = 10.5 -> Math.round(10.5) = 11
    // Mean y = (20+21+20+21)/4 = 20.5 -> Math.round(20.5) = 21
    const samples: GazeSample[] = [
      sample(10, 20, 0),
      sample(11, 21, 60),
      sample(10, 20, 120),
      sample(11, 21, 180),
    ];
    const result = detectFixationsIDT(samples);
    expect(result).toHaveLength(1);
    expect(result[0].x).toBe(11);
    expect(result[0].y).toBe(21);
  });

  it('duration equals last.t - first.t of the window', () => {
    const samples: GazeSample[] = [
      sample(100, 100, 1000),
      sample(101, 101, 1050),
      sample(100, 100, 1100),
      sample(101, 100, 1150),
      sample(100, 101, 1200),
    ];
    const result = detectFixationsIDT(samples);
    expect(result).toHaveLength(1);
    expect(result[0].duration).toBe(200); // 1200 - 1000
    expect(result[0].timestamp).toBe(1000);
  });

  it('pointCount matches number of samples in the fixation', () => {
    const samples: GazeSample[] = [
      sample(100, 100, 0),
      sample(101, 101, 40),
      sample(100, 100, 80),
      sample(101, 100, 120),
    ];
    const result = detectFixationsIDT(samples);
    expect(result).toHaveLength(1);
    expect(result[0].pointCount).toBe(4);
  });
});

describe('detectFixationsIDT — custom thresholds', () => {
  it('lower dispersion threshold produces fewer fixations', () => {
    // Dispersion = (15-5) + (15-5) = 20
    // With threshold 10 -> too large, no fixation
    // With default 70 -> fixation detected
    const samples: GazeSample[] = [
      sample(5, 5, 0),
      sample(15, 15, 60),
      sample(5, 5, 120),
      sample(15, 15, 180),
    ];
    const withDefault = detectFixationsIDT(samples);
    const withLow = detectFixationsIDT(samples, 10);
    expect(withDefault.length).toBeGreaterThan(0);
    expect(withLow).toHaveLength(0);
  });

  it('custom minDuration filters short fixations', () => {
    // Duration = 200ms. With minDuration 250 -> filtered out
    const samples: GazeSample[] = [
      sample(100, 100, 0),
      sample(101, 101, 50),
      sample(100, 100, 100),
      sample(101, 100, 150),
      sample(100, 101, 200),
    ];
    const withDefault = detectFixationsIDT(samples);
    const withHighMin = detectFixationsIDT(samples, IDT_DEFAULT_DISPERSION_THRESHOLD_PX, 250);
    expect(withDefault).toHaveLength(1);
    expect(withHighMin).toHaveLength(0);
  });
});

describe('detectFixationsIDT — expanding window', () => {
  it('tight cluster that gradually expands stops when dispersion exceeds threshold', () => {
    // Start tight, progressively get further apart
    const samples: GazeSample[] = [
      sample(100, 100, 0),
      sample(102, 101, 50),
      sample(104, 102, 100),
      sample(106, 103, 150),
      sample(108, 104, 200),
      // Now jump far — dispersion will break threshold
      sample(200, 200, 250),
      sample(202, 201, 300),
      sample(204, 202, 350),
      sample(206, 203, 400),
      sample(208, 204, 450),
    ];
    const result = detectFixationsIDT(samples);
    // First cluster should be detected, second cluster should be separate
    expect(result.length).toBeGreaterThanOrEqual(1);
    // First fixation should only contain the tight cluster samples
    expect(result[0].x).toBeLessThan(150);
    expect(result[0].y).toBeLessThan(150);
  });
});

describe('detectFixationsIDT — tail-end fixation (samples exhausted before min duration)', () => {
  it('fixation formed from remaining samples when they meet duration threshold', () => {
    // 3 tight samples at end, spanning exactly 120ms (= minDuration)
    // preceded by a dispersed point that forces i to advance
    const samples: GazeSample[] = [
      sample(0, 0, 0),       // lone dispersed point
      sample(500, 500, 50),   // big spatial jump
      sample(100, 100, 200),  // tight cluster starts
      sample(101, 101, 260),
      sample(100, 100, 320),  // 320 - 200 = 120ms = minDuration
    ];
    const result = detectFixationsIDT(samples);
    const tailFix = result.find(f => f.x === 100 && f.timestamp >= 200);
    expect(tailFix).toBeDefined();
    expect(tailFix!.duration).toBe(120);
    expect(tailFix!.pointCount).toBe(3);
  });

  it('no fixation from remaining samples when below min duration', () => {
    // Remaining samples span only 50ms < 120ms
    const samples: GazeSample[] = [
      sample(0, 0, 0),
      sample(500, 500, 50),
      sample(100, 100, 200),
      sample(101, 101, 250), // 250 - 200 = 50ms < 120ms
    ];
    const result = detectFixationsIDT(samples);
    const tailFix = result.find(f => f.timestamp >= 200);
    expect(tailFix).toBeUndefined();
  });

  it('no fixation from remaining samples when dispersion too high', () => {
    // Remaining samples span 200ms but are too dispersed
    const samples: GazeSample[] = [
      sample(0, 0, 0),
      sample(500, 500, 50),
      sample(100, 100, 200),
      sample(200, 200, 350), // dispersion = 100+100 = 200 > 70
    ];
    const result = detectFixationsIDT(samples);
    const tailFix = result.find(f => f.timestamp >= 200);
    expect(tailFix).toBeUndefined();
  });

  it('exactly 2 samples at end form fixation when meeting all criteria', () => {
    const samples: GazeSample[] = [
      sample(500, 500, 0),
      sample(0, 0, 50),     // big jump, advances i
      sample(100, 100, 200),
      sample(101, 100, 320), // 120ms, dispersion = 1+0 = 1
    ];
    const result = detectFixationsIDT(samples);
    const tailFix = result.find(f => f.timestamp >= 200);
    expect(tailFix).toBeDefined();
    expect(tailFix!.pointCount).toBe(2);
  });
});

describe('detectFixationsIDT — boundary precision', () => {
  it('exactly 2 samples returns fixation when criteria met', () => {
    const samples: GazeSample[] = [
      sample(100, 100, 0),
      sample(101, 101, 120), // duration = 120ms = minDuration, dispersion = 1+1 = 2
    ];
    const result = detectFixationsIDT(samples);
    expect(result).toHaveLength(1);
    expect(result[0].duration).toBe(120);
  });

  it('gap exactly at IDT_MAX_SAMPLE_GAP_MS does NOT split', () => {
    const samples: GazeSample[] = [
      sample(100, 100, 0),
      sample(101, 101, 50),
      sample(100, 100, 50 + IDT_MAX_SAMPLE_GAP_MS), // gap = exactly 300ms
      sample(101, 101, 50 + IDT_MAX_SAMPLE_GAP_MS + 50),
      sample(100, 100, 50 + IDT_MAX_SAMPLE_GAP_MS + 100),
    ];
    // Gap of exactly 300ms should NOT split (condition is > 300, not >=)
    const result = detectFixationsIDT(samples);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it('gap one ms over IDT_MAX_SAMPLE_GAP_MS splits', () => {
    const samples: GazeSample[] = [
      sample(100, 100, 0),
      sample(101, 101, 50),
      sample(100, 100, 100),
      sample(101, 101, 150),
      sample(100, 100, 150 + IDT_MAX_SAMPLE_GAP_MS + 1), // gap = 301ms
      sample(101, 101, 150 + IDT_MAX_SAMPLE_GAP_MS + 51),
      sample(100, 100, 150 + IDT_MAX_SAMPLE_GAP_MS + 101),
      sample(101, 101, 150 + IDT_MAX_SAMPLE_GAP_MS + 151),
      sample(100, 100, 150 + IDT_MAX_SAMPLE_GAP_MS + 201),
    ];
    const result = detectFixationsIDT(samples);
    expect(result).toHaveLength(2);
  });

  it('dispersion exactly at threshold still produces fixation', () => {
    // dispersion = (threshold) + 0 = threshold — should be <= threshold
    const threshold = 70;
    const samples: GazeSample[] = [
      sample(0, 100, 0),
      sample(threshold, 100, 60),
      sample(0, 100, 120),
      sample(threshold, 100, 180),
    ];
    const result = detectFixationsIDT(samples, threshold);
    expect(result).toHaveLength(1);
  });

  it('dispersion one pixel over threshold produces no fixation', () => {
    const threshold = 70;
    const samples: GazeSample[] = [
      sample(0, 100, 0),
      sample(threshold + 1, 100, 60),
      sample(0, 100, 120),
      sample(threshold + 1, 100, 180),
    ];
    const result = detectFixationsIDT(samples, threshold);
    expect(result).toHaveLength(0);
  });

  it('expanding window stops at exact dispersion threshold boundary', () => {
    // Start tight, expand. The fixation should include points up to the threshold.
    const samples: GazeSample[] = [
      sample(100, 100, 0),
      sample(100, 100, 50),
      sample(100, 100, 100),
      sample(100, 100, 150), // dispersion so far = 0
      sample(135, 100, 200), // dispersion = 35+0 = 35 (under 70)
      sample(100, 100, 250), // dispersion = 35+0 = 35 (still under)
      sample(170, 100, 300), // dispersion = 70+0 = 70 (= threshold, still included)
      sample(171, 100, 350), // dispersion = 71+0 = 71 (> threshold, excluded)
    ];
    const result = detectFixationsIDT(samples);
    expect(result.length).toBeGreaterThanOrEqual(1);
    // The first fixation should NOT include the sample at x=171
    expect(result[0].pointCount).toBeLessThanOrEqual(7);
  });
});

// ---------------------------------------------------------------------------
// mapFixationsToImageCoords
// ---------------------------------------------------------------------------

describe('mapFixationsToImageCoords — edge cases', () => {
  it('empty fixations returns empty', () => {
    const rect = makeDOMRect(100, 50, 800, 600);
    expect(mapFixationsToImageCoords([], rect, 1920, 1080)).toEqual([]);
  });

  it('imgRect with zero width returns empty', () => {
    const rect = makeDOMRect(100, 50, 0, 600);
    const fixations = [makeFixation(150, 200, 200, 0, 5)];
    expect(mapFixationsToImageCoords(fixations, rect, 1920, 1080)).toEqual([]);
  });

  it('imgRect with zero height returns empty', () => {
    const rect = makeDOMRect(100, 50, 800, 0);
    const fixations = [makeFixation(150, 200, 200, 0, 5)];
    expect(mapFixationsToImageCoords(fixations, rect, 1920, 1080)).toEqual([]);
  });
});

describe('mapFixationsToImageCoords — filtering', () => {
  const rect = makeDOMRect(100, 50, 800, 600); // left=100, top=50, right=900, bottom=650

  it('fixation outside image bounds (left) is filtered out', () => {
    const fixations = [makeFixation(50, 300, 200, 0, 5)]; // x=50 < left=100
    expect(mapFixationsToImageCoords(fixations, rect, 1920, 1080)).toEqual([]);
  });

  it('fixation outside image bounds (right) is filtered out', () => {
    const fixations = [makeFixation(950, 300, 200, 0, 5)]; // x=950 > right=900
    expect(mapFixationsToImageCoords(fixations, rect, 1920, 1080)).toEqual([]);
  });

  it('fixation outside image bounds (top) is filtered out', () => {
    const fixations = [makeFixation(500, 30, 200, 0, 5)]; // y=30 < top=50
    expect(mapFixationsToImageCoords(fixations, rect, 1920, 1080)).toEqual([]);
  });

  it('fixation outside image bounds (bottom) is filtered out', () => {
    const fixations = [makeFixation(500, 700, 200, 0, 5)]; // y=700 > bottom=650
    expect(mapFixationsToImageCoords(fixations, rect, 1920, 1080)).toEqual([]);
  });

  it('multiple fixations — some inside, some outside — filters correctly', () => {
    const fixations = [
      makeFixation(50, 300, 200, 0, 5),    // outside (left)
      makeFixation(500, 300, 200, 100, 5),  // inside
      makeFixation(950, 300, 200, 200, 5),  // outside (right)
      makeFixation(200, 100, 200, 300, 5),  // inside
    ];
    const result = mapFixationsToImageCoords(fixations, rect, 1920, 1080);
    expect(result).toHaveLength(2);
  });
});

describe('mapFixationsToImageCoords — coordinate mapping', () => {
  it('fixation inside is mapped proportionally to natural dimensions', () => {
    // imgRect: left=100, top=50, width=800, height=600
    // natural: 1920 x 1080
    // fixation at viewport (500, 350)
    // image-relative: x = ((500-100)/800)*1920 = (400/800)*1920 = 960
    //                 y = ((350-50)/600)*1080  = (300/600)*1080  = 540
    const rect = makeDOMRect(100, 50, 800, 600);
    const fixations = [makeFixation(500, 350, 200, 0, 5)];
    const result = mapFixationsToImageCoords(fixations, rect, 1920, 1080);

    expect(result).toHaveLength(1);
    expect(result[0].x).toBe(960);
    expect(result[0].y).toBe(540);
    expect(result[0].duration).toBe(200);
    expect(result[0].timestamp).toBe(0);
    expect(result[0].pointCount).toBe(5);
  });

  it('fixation on image edge (top-left corner) is included', () => {
    // Fixation exactly at imgRect origin
    const rect = makeDOMRect(100, 50, 800, 600);
    const fixations = [makeFixation(100, 50, 200, 0, 5)];
    const result = mapFixationsToImageCoords(fixations, rect, 1920, 1080);

    expect(result).toHaveLength(1);
    // x = ((100-100)/800)*1920 = 0
    // y = ((50-50)/600)*1080   = 0
    expect(result[0].x).toBe(0);
    expect(result[0].y).toBe(0);
  });

  it('fixation on image edge (bottom-right corner) is included', () => {
    const rect = makeDOMRect(100, 50, 800, 600);
    // right=900, bottom=650
    const fixations = [makeFixation(900, 650, 200, 0, 5)];
    const result = mapFixationsToImageCoords(fixations, rect, 1920, 1080);

    expect(result).toHaveLength(1);
    // x = ((900-100)/800)*1920 = 1920
    // y = ((650-50)/600)*1080  = 1080
    expect(result[0].x).toBe(1920);
    expect(result[0].y).toBe(1080);
  });

  it('output uses Math.round for fractional coordinates', () => {
    // imgRect: left=0, top=0, width=300, height=300
    // natural: 100 x 100
    // fixation at (100, 100)
    // x = (100/300)*100 = 33.333... -> 33
    // y = (100/300)*100 = 33.333... -> 33
    const rect = makeDOMRect(0, 0, 300, 300);
    const fixations = [makeFixation(100, 100, 200, 0, 5)];
    const result = mapFixationsToImageCoords(fixations, rect, 100, 100);

    expect(result).toHaveLength(1);
    expect(result[0].x).toBe(33);
    expect(result[0].y).toBe(33);
  });

  it('imgRect with negative width returns empty', () => {
    const rect = makeDOMRect(100, 50, -1, 600);
    const fixations = [makeFixation(150, 200, 200, 0, 5)];
    expect(mapFixationsToImageCoords(fixations, rect, 1920, 1080)).toEqual([]);
  });

  it('imgRect with negative height returns empty', () => {
    const rect = makeDOMRect(100, 50, 800, -1);
    const fixations = [makeFixation(150, 200, 200, 0, 5)];
    expect(mapFixationsToImageCoords(fixations, rect, 1920, 1080)).toEqual([]);
  });

  it('preserves duration, timestamp, and pointCount in mapped fixation', () => {
    const rect = makeDOMRect(0, 0, 400, 400);
    const fixations = [makeFixation(200, 200, 350, 5000, 12)];
    const result = mapFixationsToImageCoords(fixations, rect, 800, 800);

    expect(result).toHaveLength(1);
    expect(result[0].duration).toBe(350);
    expect(result[0].timestamp).toBe(5000);
    expect(result[0].pointCount).toBe(12);
    // x = (200/400)*800 = 400
    expect(result[0].x).toBe(400);
    expect(result[0].y).toBe(400);
  });
});
