import { describe, it, expect } from 'vitest';
import { OneEuroFilter1D } from '../oneEuroFilter';

// ---------------------------------------------------------------------------
// Defaults used across tests
// ---------------------------------------------------------------------------

const DEFAULT_MIN_CUTOFF = 1.0;
const DEFAULT_BETA = 0.007;
const DEFAULT_D_CUTOFF = 1.0;

function createFilter(
  minCutoff = DEFAULT_MIN_CUTOFF,
  beta = DEFAULT_BETA,
  dCutoff = DEFAULT_D_CUTOFF,
): OneEuroFilter1D {
  return new OneEuroFilter1D(minCutoff, beta, dCutoff);
}

// ---------------------------------------------------------------------------
// First sample
// ---------------------------------------------------------------------------

describe('OneEuroFilter1D — first sample', () => {
  it('returns the input value unchanged on first call', () => {
    const f = createFilter();
    const result = f.filter(42.5, 0.0);
    expect(result).toBe(42.5);
  });

  it('returns negative input unchanged on first call', () => {
    const f = createFilter();
    expect(f.filter(-100, 1.0)).toBe(-100);
  });

  it('returns zero unchanged on first call', () => {
    const f = createFilter();
    expect(f.filter(0, 0.0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Constant input
// ---------------------------------------------------------------------------

describe('OneEuroFilter1D — constant input', () => {
  it('output converges to input value after repeated constant samples', () => {
    const f = createFilter();
    const target = 500;
    let result = 0;
    for (let i = 0; i < 100; i++) {
      result = f.filter(target, i * 0.016); // ~60 fps
    }
    expect(result).toBeCloseTo(target, 4);
  });

  it('output equals input exactly after many samples at same value', () => {
    const f = createFilter();
    const target = 123.456;
    let result = 0;
    for (let i = 0; i < 500; i++) {
      result = f.filter(target, i * 0.01);
    }
    // After 500 samples, should be extremely close
    expect(Math.abs(result - target)).toBeLessThan(1e-6);
  });
});

// ---------------------------------------------------------------------------
// Step response
// ---------------------------------------------------------------------------

describe('OneEuroFilter1D — step response', () => {
  it('smoothly transitions after a sudden jump', () => {
    const f = createFilter(1.0, 0.007, 1.0);

    // Settle at 0
    for (let i = 0; i < 50; i++) {
      f.filter(0, i * 0.016);
    }

    // Jump to 1000
    const postJump: number[] = [];
    for (let i = 0; i < 20; i++) {
      postJump.push(f.filter(1000, (50 + i) * 0.016));
    }

    // First output after jump should be between old (0) and new (1000)
    expect(postJump[0]).toBeGreaterThan(0);
    expect(postJump[0]).toBeLessThan(1000);

    // Second output should be closer to 1000 than the first
    expect(postJump[1]).toBeGreaterThan(postJump[0]);

    // Last outputs should be close to 1000
    expect(postJump[postJump.length - 1]).toBeGreaterThan(900);
  });

  it('output monotonically approaches target after step up', () => {
    const f = createFilter(1.0, 0.5, 1.0);

    for (let i = 0; i < 30; i++) f.filter(100, i * 0.016);

    // Step to 200
    const outputs: number[] = [];
    for (let i = 0; i < 30; i++) {
      outputs.push(f.filter(200, (30 + i) * 0.016));
    }

    // Should be monotonically increasing toward 200
    for (let i = 1; i < outputs.length; i++) {
      expect(outputs[i]).toBeGreaterThanOrEqual(outputs[i - 1] - 1e-10);
    }
  });
});

// ---------------------------------------------------------------------------
// High-frequency noise
// ---------------------------------------------------------------------------

describe('OneEuroFilter1D — noise smoothing', () => {
  it('produces more stable output than noisy input around a constant', () => {
    const f = createFilter(1.0, 0.0, 1.0); // beta=0 → pure low-pass

    const target = 500;
    const noiseAmplitude = 50;
    const rawVariances: number[] = [];
    const filteredValues: number[] = [];

    for (let i = 0; i < 200; i++) {
      const noise = noiseAmplitude * Math.sin(i * 2.3) * Math.cos(i * 7.1);
      const raw = target + noise;
      rawVariances.push(raw);
      filteredValues.push(f.filter(raw, i * 0.016));
    }

    // Skip first 20 samples for warm-up
    const rawSlice = rawVariances.slice(20);
    const filtSlice = filteredValues.slice(20);

    const rawVar = variance(rawSlice);
    const filtVar = variance(filtSlice);

    // Filtered variance should be strictly less than raw
    expect(filtVar).toBeLessThan(rawVar);
    // And significantly less — at least halved
    expect(filtVar).toBeLessThan(rawVar * 0.5);
  });
});

function variance(arr: number[]): number {
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
  return arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length;
}

// ---------------------------------------------------------------------------
// reset()
// ---------------------------------------------------------------------------

describe('OneEuroFilter1D — reset', () => {
  it('after reset, next sample acts as first sample (returned unchanged)', () => {
    const f = createFilter();

    // Process some values
    f.filter(100, 0.0);
    f.filter(200, 0.016);
    f.filter(300, 0.032);

    f.reset();

    // After reset, next call should return value unchanged (first-sample behavior)
    const result = f.filter(999, 1.0);
    expect(result).toBe(999);
  });

  it('reset clears internal state — filter behaves identically to fresh instance', () => {
    const f1 = createFilter();
    const f2 = createFilter();

    // Contaminate f1 with data
    for (let i = 0; i < 50; i++) {
      f1.filter(Math.random() * 1000, i * 0.016);
    }
    f1.reset();

    // Both should produce identical outputs from here
    const inputs = [100, 150, 200, 180, 170];
    const times = [0, 0.016, 0.032, 0.048, 0.064];
    const results1: number[] = [];
    const results2: number[] = [];

    for (let i = 0; i < inputs.length; i++) {
      results1.push(f1.filter(inputs[i], times[i]));
      results2.push(f2.filter(inputs[i], times[i]));
    }

    for (let i = 0; i < results1.length; i++) {
      expect(results1[i]).toBe(results2[i]);
    }
  });
});

// ---------------------------------------------------------------------------
// Beta behavior
// ---------------------------------------------------------------------------

describe('OneEuroFilter1D — beta parameter', () => {
  it('high beta reduces lag during fast motion', () => {
    const fLow = createFilter(1.0, 0.0, 1.0);   // beta=0: no speed adaptation
    const fHigh = createFilter(1.0, 10.0, 1.0);  // beta=10: aggressive speed adaptation

    // Settle both at 0
    for (let i = 0; i < 30; i++) {
      fLow.filter(0, i * 0.016);
      fHigh.filter(0, i * 0.016);
    }

    // Fast jump to 1000
    const lowResult = fLow.filter(1000, 30 * 0.016);
    const highResult = fHigh.filter(1000, 30 * 0.016);

    // High beta should track faster (closer to 1000)
    expect(highResult).toBeGreaterThan(lowResult);
  });

  it('beta=0 gives maximum smoothing regardless of velocity', () => {
    const f = createFilter(0.5, 0.0, 1.0);

    f.filter(0, 0.0);
    // Huge jump
    const result = f.filter(10000, 0.016);
    // With beta=0, cutoff = minCutoff regardless of speed → heavy filtering
    expect(result).toBeLessThan(5000);
  });
});

// ---------------------------------------------------------------------------
// Alpha behavior
// ---------------------------------------------------------------------------

describe('OneEuroFilter1D — alpha edge cases', () => {
  it('very small dt produces heavy smoothing (alpha near 0)', () => {
    const f = createFilter(1.0, 0.0, 1.0);
    f.filter(0, 0.0);

    // Very small time step → alpha → 0 → almost no update
    const result = f.filter(1000, 1e-8);
    // Output should barely move from 0
    expect(result).toBeLessThan(100);
  });

  it('large dt produces light smoothing (alpha near 1)', () => {
    const f = createFilter(1.0, 0.0, 1.0);
    f.filter(0, 0.0);

    // Large time step → alpha → 1 → output tracks input closely
    const result = f.filter(1000, 100.0);
    expect(result).toBeGreaterThan(900);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('OneEuroFilter1D — edge cases', () => {
  it('very small dt (1e-6) does not crash', () => {
    const f = createFilter();
    f.filter(0, 0.0);
    const result = f.filter(100, 1e-9); // dt clamped to 1e-6 internally
    expect(Number.isFinite(result)).toBe(true);
  });

  it('negative time delta handled (dt clamped to 1e-6)', () => {
    const f = createFilter();
    f.filter(100, 1.0);
    // Time goes backward — internally dt = max(tSec - tPrev, 1e-6)
    const result = f.filter(200, 0.5);
    expect(Number.isFinite(result)).toBe(true);
  });

  it('same timestamp twice uses clamped dt', () => {
    const f = createFilter();
    f.filter(100, 1.0);
    const result = f.filter(200, 1.0); // dt = 0 → clamped to 1e-6
    expect(Number.isFinite(result)).toBe(true);
  });

  it('very large values do not produce NaN or Infinity', () => {
    const f = createFilter();
    f.filter(0, 0.0);
    const result = f.filter(1e15, 0.016);
    expect(Number.isFinite(result)).toBe(true);
  });

  it('alternating large values remain finite', () => {
    const f = createFilter();
    let result = 0;
    for (let i = 0; i < 100; i++) {
      const val = i % 2 === 0 ? 1e6 : -1e6;
      result = f.filter(val, i * 0.016);
      expect(Number.isFinite(result)).toBe(true);
    }
  });
});
