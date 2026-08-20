/**
 * Synthetic gaze coordinate generator.
 *
 * Produces sequences that simulate webcam eye tracking output with
 * configurable noise, saccades, drift, and blinks. No camera needed.
 *
 * Usage: feed output into OneEuroFilter → ZoneClassifier → etc.
 */

import type { SyntheticGazeSample, GroundTruthPoint } from '../types';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface SyntheticGazeConfig {
  /** Viewport width (px). */
  vw: number;
  /** Viewport height (px). */
  vh: number;
  /** Sample interval (ms). Default 33 (~30fps). */
  intervalMs?: number;
  /** Gaussian noise σ (px). Default 40. */
  noisePx?: number;
  /** Drift rate (px/s). Default 5. Simulates head pose drift. */
  driftPxPerS?: number;
  /** Drift direction (radians). Default 0.3 (~17°). */
  driftAngle?: number;
  /** Blink probability per frame [0,1]. Default 0.02. */
  blinkProb?: number;
  /** Blink duration (ms). Default 150. */
  blinkDurationMs?: number;
  /** Saccade transition duration (ms). Default 60. */
  saccadeDurationMs?: number;
  /** Random seed for reproducibility. Default undefined (random). */
  seed?: number;
}

// ---------------------------------------------------------------------------
// Seeded PRNG (xorshift32 — fast, repeatable, good enough for tests)
// ---------------------------------------------------------------------------

function createRng(seed?: number): () => number {
  let state = seed ?? (Date.now() ^ 0xDEADBEEF);
  return () => {
    state ^= state << 13;
    state ^= state >> 17;
    state ^= state << 5;
    return (state >>> 0) / 0xFFFFFFFF;
  };
}

/** Box-Muller transform — normal(0, σ) from uniform. */
function gaussianNoise(rng: () => number, sigma: number): number {
  const u1 = Math.max(1e-10, rng());
  const u2 = rng();
  return sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

/**
 * Generate a synthetic gaze sequence from ground truth fixation points.
 *
 * Between fixation windows: saccade (linear interpolation over saccadeDurationMs).
 * During fixation: target + Gaussian noise + linear drift.
 * Blinks: random, set open=false for blinkDurationMs.
 */
export function generateSyntheticGaze(
  points: GroundTruthPoint[],
  config: SyntheticGazeConfig,
): SyntheticGazeSample[] {
  const {
    vw, vh,
    intervalMs = 33,
    noisePx = 40,
    driftPxPerS = 5,
    driftAngle = 0.3,
    blinkProb = 0.02,
    blinkDurationMs = 150,
    saccadeDurationMs = 60,
    seed,
  } = config;

  const rng = createRng(seed);
  const sorted = [...points].sort((a, b) => a.startMs - b.startMs);
  if (sorted.length === 0) return [];

  const endMs = sorted[sorted.length - 1].endMs;
  const samples: SyntheticGazeSample[] = [];
  const driftDx = driftPxPerS * Math.cos(driftAngle);
  const driftDy = driftPxPerS * Math.sin(driftAngle);

  let blinkUntil = 0;
  let currentPointIdx = 0;

  for (let t = 0; t <= endMs; t += intervalMs) {
    // Blink logic
    if (t >= blinkUntil && rng() < blinkProb) {
      blinkUntil = t + blinkDurationMs;
    }
    const open = t >= blinkUntil;

    // Find which fixation point we're in (or between)
    while (currentPointIdx < sorted.length - 1 && t >= sorted[currentPointIdx].endMs) {
      currentPointIdx++;
    }

    const pt = sorted[currentPointIdx];
    let targetX: number;
    let targetY: number;

    if (t < sorted[0].startMs) {
      // Before first point — hold at first target
      targetX = sorted[0].x * vw;
      targetY = sorted[0].y * vh;
    } else if (t >= pt.startMs && t <= pt.endMs) {
      // During fixation
      targetX = pt.x * vw;
      targetY = pt.y * vh;
    } else if (currentPointIdx < sorted.length - 1) {
      // Between fixations — saccade
      const next = sorted[currentPointIdx + 1];
      const gapStart = pt.endMs;
      const gapEnd = next.startMs;
      const saccadeEnd = Math.min(gapStart + saccadeDurationMs, gapEnd);

      if (t <= saccadeEnd) {
        const progress = Math.min(1, (t - gapStart) / Math.max(1, saccadeEnd - gapStart));
        // Smooth step (hermite)
        const s = progress * progress * (3 - 2 * progress);
        targetX = (pt.x * vw) + s * ((next.x - pt.x) * vw);
        targetY = (pt.y * vh) + s * ((next.y - pt.y) * vh);
      } else {
        // Holding at next target before its window starts
        targetX = next.x * vw;
        targetY = next.y * vh;
      }
    } else {
      // After last point
      targetX = pt.x * vw;
      targetY = pt.y * vh;
    }

    // Drift
    const driftT = t / 1000;
    const dx = driftDx * driftT;
    const dy = driftDy * driftT;

    // Noise
    const nx = gaussianNoise(rng, noisePx);
    const ny = gaussianNoise(rng, noisePx);

    const x = Math.max(0, Math.min(vw, targetX + dx + nx));
    const y = Math.max(0, Math.min(vh, targetY + dy + ny));

    samples.push({ t, x, y, open });
  }

  return samples;
}

// ---------------------------------------------------------------------------
// Preset sequences for common test scenarios
// ---------------------------------------------------------------------------

/** Fixation at center — tests noise rejection. */
export function presetCenterFixation(vw: number, vh: number, durationMs = 5000, seed = 42): {
  samples: SyntheticGazeSample[];
  groundTruth: GroundTruthPoint[];
} {
  const gt: GroundTruthPoint[] = [{ startMs: 0, endMs: durationMs, x: 0.5, y: 0.5 }];
  const samples = generateSyntheticGaze(gt, { vw, vh, seed, noisePx: 50, driftPxPerS: 0 });
  return { samples, groundTruth: gt };
}

/** Left→right saccade — tests transition speed and zone change accuracy. */
export function presetLeftRightSaccade(vw: number, vh: number, seed = 42): {
  samples: SyntheticGazeSample[];
  groundTruth: GroundTruthPoint[];
} {
  const gt: GroundTruthPoint[] = [
    { startMs: 0, endMs: 2000, x: 0.2, y: 0.5, zone: 'left' },
    { startMs: 2200, endMs: 4200, x: 0.8, y: 0.5, zone: 'right' },
    { startMs: 4400, endMs: 6400, x: 0.2, y: 0.5, zone: 'left' },
    { startMs: 6600, endMs: 8600, x: 0.8, y: 0.5, zone: 'right' },
  ];
  const samples = generateSyntheticGaze(gt, { vw, vh, seed, noisePx: 40, driftPxPerS: 3 });
  return { samples, groundTruth: gt };
}

/** 3×3 grid scan — tests all 9 zones. */
export function presetGridScan(vw: number, vh: number, seed = 42): {
  samples: SyntheticGazeSample[];
  groundTruth: GroundTruthPoint[];
} {
  const positions = [
    [0.17, 0.17], [0.5, 0.17], [0.83, 0.17],
    [0.17, 0.5], [0.5, 0.5], [0.83, 0.5],
    [0.17, 0.83], [0.5, 0.83], [0.83, 0.83],
  ];
  const gt: GroundTruthPoint[] = positions.map(([x, y], i) => ({
    startMs: i * 1500,
    endMs: i * 1500 + 1200,
    x, y,
    zone: `r${Math.floor(i / 3)}c${i % 3}`,
  }));
  const samples = generateSyntheticGaze(gt, { vw, vh, seed, noisePx: 35, driftPxPerS: 2 });
  return { samples, groundTruth: gt };
}

/** Drift stress test — high drift rate to test micro-recalibration. */
export function presetDriftStress(vw: number, vh: number, seed = 42): {
  samples: SyntheticGazeSample[];
  groundTruth: GroundTruthPoint[];
} {
  const gt: GroundTruthPoint[] = [
    { startMs: 0, endMs: 5000, x: 0.5, y: 0.5 },
    { startMs: 5500, endMs: 10000, x: 0.5, y: 0.5 },
  ];
  const samples = generateSyntheticGaze(gt, { vw, vh, seed, noisePx: 30, driftPxPerS: 15 });
  return { samples, groundTruth: gt };
}

/** Blink-heavy sequence — tests filter reset and gap fill. */
export function presetBlinkHeavy(vw: number, vh: number, seed = 42): {
  samples: SyntheticGazeSample[];
  groundTruth: GroundTruthPoint[];
} {
  const gt: GroundTruthPoint[] = [
    { startMs: 0, endMs: 3000, x: 0.3, y: 0.5, zone: 'left' },
    { startMs: 3500, endMs: 6500, x: 0.7, y: 0.5, zone: 'right' },
  ];
  const samples = generateSyntheticGaze(gt, { vw, vh, seed, noisePx: 40, blinkProb: 0.08, blinkDurationMs: 200 });
  return { samples, groundTruth: gt };
}
