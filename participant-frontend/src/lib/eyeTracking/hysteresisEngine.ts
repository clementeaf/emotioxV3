/**
 * Hysteresis Engine — temporal stability for zone transitions.
 *
 * Prevents erratic zone switching caused by webcam jitter at zone
 * boundaries. A candidate zone must hold the top position for a
 * configurable duration before the engine commits the transition.
 *
 * Stateful class — one instance per viewing session.
 */

import type { ZoneProbability } from './zoneClassifier';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HysteresisResult {
  /** Stable zone after hysteresis. null = gaze outside all zones. */
  readonly zone: string | null;
  /** True when this update caused a zone transition. */
  readonly changed: boolean;
  /** Confidence of the current stable zone (0 when zone is null). */
  readonly confidence: number;
}

export interface HysteresisConfig {
  /** Milliseconds a candidate must hold top position before switching. */
  readonly switchThresholdMs: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DEFAULT_SWITCH_THRESHOLD_MS = 200;

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

/** Sentinel: no pending candidate (distinct from null = "null zone candidate"). */
const NO_CANDIDATE: unique symbol = Symbol('no-candidate');

export class HysteresisEngine {
  private currentZone: string | null = null;
  private currentConfidence = 0;
  private initialized = false;

  private candidateZone: string | null | typeof NO_CANDIDATE = NO_CANDIDATE;
  private candidateStart = 0;

  private readonly thresholdMs: number;

  constructor(config?: Partial<HysteresisConfig>) {
    this.thresholdMs = config?.switchThresholdMs ?? DEFAULT_SWITCH_THRESHOLD_MS;
  }

  /**
   * Feed a new classification result. Returns the stable zone after
   * applying hysteresis.
   *
   * @param probabilities — sorted desc by confidence (output of classifyGaze)
   * @param timestamp     — monotonic ms (e.g. performance.now or gaze timestamp)
   */
  update(probabilities: readonly ZoneProbability[], timestamp: number): HysteresisResult {
    const top = probabilities[0] ?? null;
    const topZone = top?.zoneId ?? null;
    const topConf = top?.confidence ?? 0;

    // First ever sample — assign immediately, no waiting
    return !this.initialized
      ? this.commitFirstSample(topZone, topConf)
      : this.evaluateCandidate(topZone, topConf, timestamp);
  }

  /** Current stable zone. */
  getZone(): string | null {
    return this.currentZone;
  }

  /** Current stable confidence. */
  getConfidence(): number {
    return this.currentConfidence;
  }

  /** Clear all state. Next update acts as first sample. */
  reset(): void {
    this.currentZone = null;
    this.currentConfidence = 0;
    this.candidateZone = NO_CANDIDATE;
    this.candidateStart = 0;

    this.initialized = false;
  }

  // -- Internal --

  private evaluateCandidate(
    topZone: string | null,
    topConf: number,
    timestamp: number,
  ): HysteresisResult {
    const isSameAsCurrent = topZone === this.currentZone;
    const hasCandidate = this.candidateZone !== NO_CANDIDATE;
    const isSameAsCandidate = hasCandidate && topZone === this.candidateZone;

    return isSameAsCurrent
      ? this.reinforce(topConf)
      : isSameAsCandidate
        ? this.advanceCandidate(topConf, timestamp)
        : this.startCandidate(topZone, topConf, timestamp);
  }

  private commitFirstSample(zoneId: string | null, confidence: number): HysteresisResult {
    this.initialized = true;
    return this.commitTransition(zoneId, confidence);
  }

  private reinforce(confidence: number): HysteresisResult {
    this.currentConfidence = confidence;
    this.candidateZone = NO_CANDIDATE;
    this.candidateStart = 0;

    return { zone: this.currentZone, changed: false, confidence };
  }

  private advanceCandidate(
    confidence: number,
    timestamp: number,
  ): HysteresisResult {

    const elapsed = Math.abs(timestamp - this.candidateStart);

    return elapsed >= this.thresholdMs
      ? this.commitTransition(this.candidateZone as string | null, confidence)
      : { zone: this.currentZone, changed: false, confidence: this.currentConfidence };
  }

  private startCandidate(
    zoneId: string | null,
    confidence: number,
    timestamp: number,
  ): HysteresisResult {
    // Threshold 0 → commit immediately without waiting
    return this.thresholdMs === 0
      ? this.commitTransition(zoneId, confidence)
      : this.parkCandidate(zoneId, confidence, timestamp);
  }

  private parkCandidate(
    zoneId: string | null,
    _confidence: number,
    timestamp: number,
  ): HysteresisResult {
    this.candidateZone = zoneId;
    this.candidateStart = timestamp;

    return { zone: this.currentZone, changed: false, confidence: this.currentConfidence };
  }

  private commitTransition(zoneId: string | null, confidence: number): HysteresisResult {
    const changed = zoneId !== this.currentZone;
    this.currentZone = zoneId;
    this.currentConfidence = confidence;
    this.candidateZone = NO_CANDIDATE;
    this.candidateStart = 0;

    return { zone: zoneId, changed, confidence };
  }
}
