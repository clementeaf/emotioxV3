/**
 * Attention Inference Engine — shared types.
 */

/** Learned elliptical uncertainty at a calibration anchor point. */
export interface CalibrationEllipse {
  /** Normalized position on stimulus [0,1]. */
  u: number;
  v: number;
  /** Major axis std (px). */
  sigma1: number;
  /** Minor axis std (px). */
  sigma2: number;
  /** Rotation of major axis (radians, from X axis). */
  theta: number;
  /** Number of residual samples used to fit this ellipse. */
  sampleCount: number;
}

/** Per-frame uncertainty ellipse (after IDW interpolation + dynamic scaling). */
export interface FrameUncertainty {
  sigma1: number;
  sigma2: number;
  theta: number;
  /** Pre-computed Σ⁻¹ components for fast Gaussian splat: w = exp(-0.5*(a*dx²+2b*dx*dy+c*dy²)) */
  a: number;
  b: number;
  c: number;
}

/** Dynamic scaling inputs — all already available in the pipeline. */
export interface UncertaintyInputs {
  gazeX: number;
  gazeY: number;
  /** Gaze velocity in px/frame. */
  velocity: number;
  /** Head pose [pitch, yaw] in degrees. */
  pitch: number;
  yaw: number;
  /** Eye Aspect Ratio (avg of both eyes). */
  ear: number;
  /** Stimulus bounding rect. */
  rect: { left: number; top: number; width: number; height: number };
}

/** Accumulated heatmap density grid. */
export interface DensityGrid {
  /** Row-major flat array of density values (seconds of expected attention). */
  data: Float64Array;
  cols: number;
  rows: number;
  cellW: number;
  cellH: number;
}

/** Per-AOI attention metrics. */
export interface AOIAttention {
  aoiId: string;
  label: string;
  /** Expected dwell time (seconds) — integral of density within AOI. */
  expectedDwellS: number;
  /** Share of total attention (0-1). */
  attentionShare: number;
  /** Time to first attention (ms from session start), or null if never attended. */
  firstAttentionMs: number | null;
  /** Peak single-frame probability observed. */
  peakProbability: number;
}

/** Session-level quality and confidence. */
export interface SessionConfidence {
  /** Overall confidence [0,1]. */
  score: number;
  /** Component: calibration quality [0,1]. */
  calibrationQuality: number;
  /** Component: fraction of frames with valid gaze [0,1]. */
  validFrameRatio: number;
  /** Component: head stability [0,1]. */
  headStability: number;
  /** Effective tracking duration (seconds, only frames with open eyes). */
  effectiveDurationS: number;
  /** Spatial coverage: fraction of grid cells with >0.1s density. */
  spatialCoverage: number;
}
