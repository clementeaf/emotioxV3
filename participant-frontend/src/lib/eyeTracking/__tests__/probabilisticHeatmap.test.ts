import { describe, it, expect } from 'vitest';
import { ProbabilisticHeatmap } from '../attention/probabilisticHeatmap';
import type { FrameUncertainty } from '../attention/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create an isotropic uncertainty (circular Gaussian) for simple tests. */
function isoUncertainty(sigma: number): FrameUncertainty {
  const inv = 1 / (sigma * sigma);
  return { sigma1: sigma, sigma2: sigma, theta: 0, a: inv, b: 0, c: inv };
}

/** Sum all values in a Float64Array. */
function arraySum(arr: Float64Array): number {
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += arr[i];
  return s;
}

/** Get maximum value in a Float64Array. */
function arrayMax(arr: Float64Array): number {
  let m = -Infinity;
  for (let i = 0; i < arr.length; i++) if (arr[i] > m) m = arr[i];
  return m;
}

// ---------------------------------------------------------------------------
// Constructor
// ---------------------------------------------------------------------------

describe('ProbabilisticHeatmap constructor', () => {
  it('computes cols x rows matching aspect ratio', () => {
    const hm = new ProbabilisticHeatmap(800, 600, 64);
    expect(hm.cols).toBe(64);
    // rows = round(64 * 600/800) = round(48) = 48
    expect(hm.rows).toBe(48);
  });

  it('computes correct cell dimensions', () => {
    const hm = new ProbabilisticHeatmap(800, 600, 64);
    expect(hm.cellW).toBeCloseTo(800 / 64, 5);
    expect(hm.cellH).toBeCloseTo(600 / 48, 5);
  });

  it('handles square stimulus', () => {
    const hm = new ProbabilisticHeatmap(500, 500, 50);
    expect(hm.cols).toBe(50);
    expect(hm.rows).toBe(50);
  });

  it('ensures at least 1 row', () => {
    // Very wide stimulus → rows would round to 0, clamped to 1
    const hm = new ProbabilisticHeatmap(10000, 1, 10);
    expect(hm.rows).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Fresh heatmap state
// ---------------------------------------------------------------------------

describe('fresh heatmap', () => {
  it('starts with zero totalDurationS', () => {
    const hm = new ProbabilisticHeatmap(800, 600);
    expect(hm.totalDurationS).toBe(0);
  });

  it('has all-zero density grid', () => {
    const hm = new ProbabilisticHeatmap(800, 600);
    const grid = hm.getDensityGrid();
    expect(arraySum(grid.data)).toBe(0);
  });

  it('has no temporal data', () => {
    const hm = new ProbabilisticHeatmap(800, 600);
    expect(hm.hasTemporalData).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// addSample — basic behavior
// ---------------------------------------------------------------------------

describe('addSample', () => {
  it('concentrates density around center when gaze is at center', () => {
    const hm = new ProbabilisticHeatmap(800, 600, 32);
    const unc = isoUncertainty(50);
    hm.addSample(400, 300, unc, 0.033);

    const grid = hm.getDensityGrid();
    const centerCol = Math.floor(400 / grid.cellW);
    const centerRow = Math.floor(300 / grid.cellH);
    const centerIdx = centerRow * grid.cols + centerCol;

    // Center cell should have density
    expect(grid.data[centerIdx]).toBeGreaterThan(0);

    // Center cell should be the peak
    const maxVal = arrayMax(grid.data);
    expect(grid.data[centerIdx]).toBeCloseTo(maxVal, 10);
  });

  it('accumulates totalDurationS across multiple samples', () => {
    const hm = new ProbabilisticHeatmap(800, 600, 32);
    const unc = isoUncertainty(50);
    hm.addSample(400, 300, unc, 0.033);
    hm.addSample(200, 150, unc, 0.033);
    expect(hm.totalDurationS).toBeCloseTo(0.066, 5);
  });

  it('does not increment duration when kernelSum = 0 (gaze outside grid)', () => {
    const hm = new ProbabilisticHeatmap(800, 600, 32);
    const unc = isoUncertainty(20); // small sigma
    // Gaze far outside grid
    hm.addSample(-5000, -5000, unc, 0.033);
    expect(hm.totalDurationS).toBe(0);
  });

  it('produces Gaussian shape: closer cells have higher density', () => {
    const hm = new ProbabilisticHeatmap(800, 600, 32);
    const unc = isoUncertainty(80);
    hm.addSample(400, 300, unc, 1.0);

    const grid = hm.getDensityGrid();
    const centerCol = Math.floor(400 / grid.cellW);
    const centerRow = Math.floor(300 / grid.cellH);

    const centerDensity = grid.data[centerRow * grid.cols + centerCol];
    // A cell further away should have less density
    const farCol = Math.min(centerCol + 5, grid.cols - 1);
    const farDensity = grid.data[centerRow * grid.cols + farCol];
    expect(centerDensity).toBeGreaterThan(farDensity);
  });

  it('total density approximately equals dtS (integral conservation)', () => {
    const hm = new ProbabilisticHeatmap(800, 600, 64);
    const unc = isoUncertainty(80);
    const dt = 0.5;
    hm.addSample(400, 300, unc, dt);

    const grid = hm.getDensityGrid();
    const total = arraySum(grid.data);
    // With normalization, total should be approximately dt
    expect(total).toBeCloseTo(dt, 1);
  });
});

// ---------------------------------------------------------------------------
// getNormalizedGrid
// ---------------------------------------------------------------------------

describe('getNormalizedGrid', () => {
  it('returns all zeros for empty heatmap', () => {
    const hm = new ProbabilisticHeatmap(800, 600, 16);
    const norm = hm.getNormalizedGrid();
    expect(arrayMax(norm)).toBe(0);
  });

  it('has max value of 1.0 after normalization', () => {
    const hm = new ProbabilisticHeatmap(800, 600, 32);
    const unc = isoUncertainty(60);
    hm.addSample(400, 300, unc, 0.5);
    const norm = hm.getNormalizedGrid();
    expect(arrayMax(norm)).toBeCloseTo(1.0, 5);
  });

  it('other cells are proportional to max', () => {
    const hm = new ProbabilisticHeatmap(800, 600, 16);
    const unc = isoUncertainty(60);
    hm.addSample(400, 300, unc, 1.0);
    const norm = hm.getNormalizedGrid();
    // All values between 0 and 1
    for (let i = 0; i < norm.length; i++) {
      expect(norm[i]).toBeGreaterThanOrEqual(0);
      expect(norm[i]).toBeLessThanOrEqual(1.0 + 1e-10);
    }
  });
});

// ---------------------------------------------------------------------------
// reset
// ---------------------------------------------------------------------------

describe('reset', () => {
  it('clears all accumulated data', () => {
    const hm = new ProbabilisticHeatmap(800, 600, 16);
    const unc = isoUncertainty(60);
    hm.addSample(400, 300, unc, 0.5, 100, [
      { id: 'aoi1', label: 'Zone A', x: 350, y: 250, width: 100, height: 100 },
    ], 1.5);

    expect(hm.totalDurationS).toBeGreaterThan(0);
    expect(hm.hasTemporalData).toBe(true);

    hm.reset();

    expect(hm.totalDurationS).toBe(0);
    expect(hm.hasTemporalData).toBe(false);
    expect(arraySum(hm.getDensityGrid().data)).toBe(0);
    expect(hm.getAOIMetrics()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// AOI tracking
// ---------------------------------------------------------------------------

describe('AOI tracking', () => {
  it('tracks dwell time for AOIs near gaze', () => {
    const hm = new ProbabilisticHeatmap(800, 600, 32);
    const unc = isoUncertainty(60);
    const aois = [
      { id: 'aoi1', label: 'Near', x: 370, y: 270, width: 60, height: 60 },
    ];
    // Multiple samples at center → dwell accumulates
    hm.addSample(400, 300, unc, 0.033, 0, aois);
    hm.addSample(400, 300, unc, 0.033, 33, aois);
    hm.addSample(400, 300, unc, 0.033, 66, aois);

    const metrics = hm.getAOIMetrics();
    expect(metrics).toHaveLength(1);
    expect(metrics[0].aoiId).toBe('aoi1');
    expect(metrics[0].expectedDwellS).toBeGreaterThan(0);
  });

  it('assigns low/zero dwell to AOI far from gaze', () => {
    const hm = new ProbabilisticHeatmap(800, 600, 32);
    const unc = isoUncertainty(40); // small sigma
    const aois = [
      { id: 'near', label: 'Near', x: 380, y: 280, width: 40, height: 40 },
      { id: 'far', label: 'Far', x: 0, y: 0, width: 30, height: 30 },
    ];
    hm.addSample(400, 300, unc, 1.0, 0, aois);

    const metrics = hm.getAOIMetrics();
    const near = metrics.find(m => m.aoiId === 'near')!;
    const far = metrics.find(m => m.aoiId === 'far')!;
    expect(near.expectedDwellS).toBeGreaterThan(far.expectedDwellS);
  });

  it('sets firstAttentionMs on first significant intersection', () => {
    const hm = new ProbabilisticHeatmap(800, 600, 32);
    const unc = isoUncertainty(80);
    const aois = [
      { id: 'aoi1', label: 'Zone A', x: 370, y: 270, width: 60, height: 60 },
    ];
    hm.addSample(400, 300, unc, 0.033, 500, aois);
    hm.addSample(400, 300, unc, 0.033, 533, aois);

    const metrics = hm.getAOIMetrics();
    expect(metrics[0].firstAttentionMs).toBe(500);
  });

  it('sorts AOIs by dwell time descending', () => {
    const hm = new ProbabilisticHeatmap(800, 600, 32);
    const unc = isoUncertainty(60);
    const aois = [
      { id: 'less', label: 'Less', x: 100, y: 100, width: 40, height: 40 },
      { id: 'more', label: 'More', x: 380, y: 280, width: 40, height: 40 },
    ];
    // Gaze near 'more' AOI
    hm.addSample(400, 300, unc, 1.0, 0, aois);

    const metrics = hm.getAOIMetrics();
    expect(metrics.length).toBe(2);
    expect(metrics[0].aoiId).toBe('more');
    expect(metrics[0].expectedDwellS).toBeGreaterThan(metrics[1].expectedDwellS);
  });
});

// ---------------------------------------------------------------------------
// Temporal (video) data
// ---------------------------------------------------------------------------

describe('temporal data', () => {
  it('remains false without videoTimeS', () => {
    const hm = new ProbabilisticHeatmap(800, 600, 16);
    const unc = isoUncertainty(60);
    hm.addSample(400, 300, unc, 0.033, 0);
    expect(hm.hasTemporalData).toBe(false);
  });

  it('becomes true with videoTimeS', () => {
    const hm = new ProbabilisticHeatmap(800, 600, 16);
    const unc = isoUncertainty(60);
    hm.addSample(400, 300, unc, 0.033, 0, undefined, 1.5);
    expect(hm.hasTemporalData).toBe(true);
  });

  it('stores earliest videoTime per cell in firstAttention', () => {
    const hm = new ProbabilisticHeatmap(800, 600, 16);
    const unc = isoUncertainty(60);
    // First sample at t=5.0
    hm.addSample(400, 300, unc, 0.033, 0, undefined, 5.0);
    // Second sample at t=2.0 (earlier)
    hm.addSample(400, 300, unc, 0.033, 33, undefined, 2.0);

    const fa = hm.getFirstAttentionGrid();
    const grid = hm.getDensityGrid();
    const centerCol = Math.floor(400 / grid.cellW);
    const centerRow = Math.floor(300 / grid.cellH);
    const idx = centerRow * grid.cols + centerCol;
    expect(fa[idx]).toBe(2.0);
  });

  it('stores time of highest contribution per cell in peakTime', () => {
    const hm = new ProbabilisticHeatmap(800, 600, 16);
    const unc = isoUncertainty(60);
    // Small contribution at t=1.0
    hm.addSample(400, 300, unc, 0.01, 0, undefined, 1.0);
    // Large contribution at t=3.0
    hm.addSample(400, 300, unc, 1.0, 33, undefined, 3.0);

    const pt = hm.getPeakTimeGrid();
    const grid = hm.getDensityGrid();
    const centerCol = Math.floor(400 / grid.cellW);
    const centerRow = Math.floor(300 / grid.cellH);
    const idx = centerRow * grid.cols + centerCol;
    expect(pt[idx]).toBe(3.0);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  it('does not crash with negative gaze coordinates', () => {
    const hm = new ProbabilisticHeatmap(800, 600, 16);
    const unc = isoUncertainty(30);
    expect(() => hm.addSample(-100, -100, unc, 0.033)).not.toThrow();
    // Should not add duration since gaze is outside the grid
    expect(hm.totalDurationS).toBe(0);
  });

  it('handles very large sigma without crashing', () => {
    const hm = new ProbabilisticHeatmap(800, 600, 16);
    const unc = isoUncertainty(500);
    expect(() => hm.addSample(400, 300, unc, 0.033)).not.toThrow();
    expect(hm.totalDurationS).toBeGreaterThan(0);
  });

  it('works correctly with small grid (cols=4)', () => {
    const hm = new ProbabilisticHeatmap(800, 600, 4);
    expect(hm.cols).toBe(4);
    // rows = round(4 * 600/800) = round(3) = 3
    expect(hm.rows).toBe(3);

    const unc = isoUncertainty(100);
    hm.addSample(400, 300, unc, 0.5);

    const grid = hm.getDensityGrid();
    expect(grid.data.length).toBe(4 * 3);
    expect(arraySum(grid.data)).toBeCloseTo(0.5, 1);
  });
});
