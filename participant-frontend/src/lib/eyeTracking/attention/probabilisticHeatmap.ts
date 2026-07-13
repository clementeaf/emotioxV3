/**
 * Probabilistic heatmap accumulator with anisotropic Gaussian splat.
 *
 * Each gaze frame contributes an elliptical 2D Gaussian to a density grid.
 * The density unit is **seconds of expected attention** — the integral over
 * the grid approximates the effective tracking duration.
 *
 * AOI integration is optional: when AOI rects are provided, the accumulator
 * also tracks per-AOI expected dwell time and first-attention timestamp.
 */

import type { DensityGrid, FrameUncertainty, AOIAttention } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default grid columns. Rows computed from aspect ratio. */
const DEFAULT_GRID_COLS = 64;

/** Truncate Gaussian splat at 3σ (exp(-4.5) ≈ 0.011 — negligible beyond). */
const SPLAT_RADIUS_SIGMAS = 3;

// ---------------------------------------------------------------------------
// ProbabilisticHeatmap
// ---------------------------------------------------------------------------

export class ProbabilisticHeatmap {
  private readonly data: Float64Array;
  readonly cols: number;
  readonly rows: number;
  readonly cellW: number;
  readonly cellH: number;
  // AOI tracking (optional)
  private aoiDwell: Map<string, { dwell: number; firstMs: number | null; peak: number; label: string }> = new Map();

  /** Total seconds accumulated. */
  totalDurationS = 0;

  constructor(stimulusWidth: number, stimulusHeight: number, cols = DEFAULT_GRID_COLS) {
    this.cols = cols;
    this.rows = Math.max(1, Math.round(cols * stimulusHeight / stimulusWidth));
    this.cellW = stimulusWidth / this.cols;
    this.cellH = stimulusHeight / this.rows;
    this.data = new Float64Array(this.rows * this.cols);
  }

  /**
   * Add one gaze sample as an anisotropic Gaussian splat.
   *
   * @param gazeX — gaze X in stimulus pixel coordinates
   * @param gazeY — gaze Y in stimulus pixel coordinates
   * @param uncertainty — per-frame ellipse with pre-computed Σ⁻¹ components (a, b, c)
   * @param dtS — frame duration in seconds (typically ~0.033 at 30fps)
   * @param timestampMs — session-relative timestamp (for AOI first-attention tracking)
   * @param aois — optional list of AOI rects for per-AOI tracking
   */
  addSample(
    gazeX: number,
    gazeY: number,
    uncertainty: FrameUncertainty,
    dtS: number,
    timestampMs?: number,
    aois?: readonly { id: string; label: string; x: number; y: number; width: number; height: number }[],
  ): void {
    // Splat bounding box (3σ of major axis)
    const maxSigma = Math.max(uncertainty.sigma1, uncertainty.sigma2);
    const splatRadius = maxSigma * SPLAT_RADIUS_SIGMAS;

    // Cell range to iterate
    const c0 = Math.max(0, Math.floor((gazeX - splatRadius) / this.cellW));
    const c1 = Math.min(this.cols - 1, Math.ceil((gazeX + splatRadius) / this.cellW));
    const r0 = Math.max(0, Math.floor((gazeY - splatRadius) / this.cellH));
    const r1 = Math.min(this.rows - 1, Math.ceil((gazeY + splatRadius) / this.cellH));

    const { a, b, c } = uncertainty;

    // Two-pass splat: compute raw kernel weights, then normalize so total = dt.
    // This ensures every frame contributes exactly dtS seconds to the grid
    // regardless of σ size or truncation.

    // Pass 1: compute raw Gaussian weights and their sum
    const numCols = c1 - c0 + 1;
    const numRows = r1 - r0 + 1;
    const weights = new Float64Array(numRows * numCols);
    let kernelSum = 0;

    for (let r = r0; r <= r1; r++) {
      const cy = (r + 0.5) * this.cellH;
      const dy = cy - gazeY;
      const rowOff = (r - r0) * numCols;
      for (let col = c0; col <= c1; col++) {
        const cx = (col + 0.5) * this.cellW;
        const dx = cx - gazeX;
        const mahal = a * dx * dx + 2 * b * dx * dy + c * dy * dy;
        if (mahal > 9) continue; // 3σ cutoff
        const w = Math.exp(-0.5 * mahal);
        weights[rowOff + (col - c0)] = w;
        kernelSum += w;
      }
    }

    // Pass 2: add normalized weights × dt to the grid
    // Only count duration for frames that actually contribute mass to the grid
    if (kernelSum > 0) {
      this.totalDurationS += dtS;
      const scale = dtS / kernelSum;
      for (let r = r0; r <= r1; r++) {
        const rowOff = (r - r0) * numCols;
        const gridRowOff = r * this.cols;
        for (let col = c0; col <= c1; col++) {
          const w = weights[rowOff + (col - c0)];
          if (w > 0) this.data[gridRowOff + col] += w * scale;
        }
      }
    }

    // AOI tracking (uses same normalized kernel)
    if (aois && timestampMs !== undefined && kernelSum > 0) {
      this.updateAOIs(gazeX, gazeY, uncertainty, dtS, kernelSum, timestampMs, aois);
    }
  }

  private updateAOIs(
    gazeX: number, gazeY: number,
    unc: FrameUncertainty, dtS: number, kernelSum: number, timestampMs: number,
    aois: readonly { id: string; label: string; x: number; y: number; width: number; height: number }[],
  ): void {
    for (const aoi of aois) {
      // Normalized probability at AOI center: raw_gaussian / kernelSum
      const cx = aoi.x + aoi.width / 2;
      const cy = aoi.y + aoi.height / 2;
      const dx = cx - gazeX;
      const dy = cy - gazeY;
      const mahal = unc.a * dx * dx + 2 * unc.b * dx * dy + unc.c * dy * dy;
      const rawProb = mahal > 9 ? 0 : Math.exp(-0.5 * mahal);
      const normProb = rawProb / kernelSum;

      let state = this.aoiDwell.get(aoi.id);
      if (!state) {
        state = { dwell: 0, firstMs: null, peak: 0, label: aoi.label };
        this.aoiDwell.set(aoi.id, state);
      }

      state.dwell += normProb * dtS;
      if (normProb > state.peak) state.peak = normProb;
      if (state.firstMs === null && normProb > 0.01) {
        state.firstMs = timestampMs;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Query
  // ---------------------------------------------------------------------------

  /** Get the raw density grid. */
  getDensityGrid(): DensityGrid {
    return {
      data: new Float64Array(this.data), // copy
      cols: this.cols,
      rows: this.rows,
      cellW: this.cellW,
      cellH: this.cellH,
    };
  }

  /** Get normalized [0,1] values for heatmap visualization. */
  getNormalizedGrid(): Float64Array {
    const max = this.data.reduce((m, v) => Math.max(m, v), 0);
    if (max <= 0) return new Float64Array(this.data.length);
    const norm = new Float64Array(this.data.length);
    for (let i = 0; i < this.data.length; i++) norm[i] = this.data[i] / max;
    return norm;
  }

  /** Get per-AOI attention metrics. */
  getAOIMetrics(): AOIAttention[] {
    const totalDwell = Array.from(this.aoiDwell.values()).reduce((s, v) => s + v.dwell, 0);
    const result: AOIAttention[] = [];

    for (const [id, state] of this.aoiDwell) {
      result.push({
        aoiId: id,
        label: state.label,
        expectedDwellS: state.dwell,
        attentionShare: totalDwell > 0 ? state.dwell / totalDwell : 0,
        firstAttentionMs: state.firstMs,
        peakProbability: state.peak,
      });
    }

    return result.sort((a, b) => b.expectedDwellS - a.expectedDwellS);
  }

  /** Reset all accumulated data. */
  reset(): void {
    this.data.fill(0);
    this.aoiDwell.clear();
    this.totalDurationS = 0;
  }
}
