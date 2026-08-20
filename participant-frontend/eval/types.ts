/**
 * Gaze evaluation types — shared across synthetic tests, Playwright E2E, and report generation.
 */

// ---------------------------------------------------------------------------
// Ground truth
// ---------------------------------------------------------------------------

export interface GroundTruthPoint {
  /** Start of fixation window (ms from session start). */
  startMs: number;
  /** End of fixation window. */
  endMs: number;
  /** Expected gaze X as fraction of viewport width [0,1]. */
  x: number;
  /** Expected gaze Y as fraction of viewport height [0,1]. */
  y: number;
  /** Expected zone ID (e.g. "left", "r0c0"). Optional. */
  zone?: string;
}

export interface GroundTruth {
  calibration: GroundTruthPoint[];
  evaluation: GroundTruthPoint[];
}

export interface DatasetMetadata {
  name: string;
  description?: string;
  /** Video resolution if using camera feed. */
  videoWidth?: number;
  videoHeight?: number;
  /** Duration in seconds. */
  durationS?: number;
}

// ---------------------------------------------------------------------------
// Eval metrics (per engine, per run)
// ---------------------------------------------------------------------------

export interface EvalMetrics {
  engine: string;
  /** Root mean square error vs ground truth (px). */
  rmsePx: number;
  /** Average frame-to-frame jitter (px). */
  jitterPx: number;
  /** Linear drift over session (px/s). */
  driftPxPerS: number;
  /** Fraction of frames with valid gaze [0,1]. */
  validFrameRatio: number;
  /** Zone changes that don't match ground truth transitions. */
  falseZoneChanges: number;
  /** Total zone changes observed. */
  totalZoneChanges: number;
  /** Average pipeline latency per frame (ms). */
  avgLatencyMs: number;
  /** Total evaluation frames. */
  totalFrames: number;
  /** Total fixations detected. */
  fixationCount: number;
}

// ---------------------------------------------------------------------------
// Run config
// ---------------------------------------------------------------------------

export interface EvalRunConfig {
  dataset: string;
  viewport: { width: number; height: number; label: string };
  repetition: number;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

export interface EvalRun {
  config: EvalRunConfig;
  metrics: EvalMetrics;
  timestamp: string;
}

export interface EvalReport {
  runs: EvalRun[];
  summary: {
    byEngine: Record<string, {
      avgRmsePx: number;
      avgJitterPx: number;
      avgDriftPxPerS: number;
      avgValidFrameRatio: number;
      avgFalseZoneChanges: number;
      avgLatencyMs: number;
    }>;
  };
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Synthetic gaze sample
// ---------------------------------------------------------------------------

export interface SyntheticGazeSample {
  /** Timestamp (ms). */
  t: number;
  /** Screen X (px). */
  x: number;
  /** Screen Y (px). */
  y: number;
  /** Whether eyes are open. */
  open: boolean;
}
