/**
 * Zone Event Emitter — the public API layer for zone-based eye tracking.
 *
 * Integrates ZoneClassifier + HysteresisEngine to produce semantic events:
 *   onZoneEnter, onZoneLeave, onFixationStart, onFixationEnd
 *
 * The rest of the application consumes these events — never raw coordinates.
 *
 * Fixation detection at zone level: sustained gaze in the same zone for
 * >= MIN_ZONE_FIXATION_MS triggers a fixation. Simpler than pixel-level I-DT
 * and appropriate for zone-based analysis.
 */

import type { Zone } from './zoneRegistry';
import { classifyGaze } from './zoneClassifier';
import { HysteresisEngine, type HysteresisConfig } from './hysteresisEngine';
import type { EkmanEmotion } from './facsClassifier';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ZoneEventType = 'zone_enter' | 'zone_leave' | 'fixation_start' | 'fixation_end';

export interface ZoneEvent {
  readonly type: ZoneEventType;
  readonly zoneId: string | null;
  readonly confidence: number;
  readonly timestamp: number;
  /** Duration in ms — present on zone_leave and fixation_end. */
  readonly duration?: number;
  /** Emotion at the moment of the event, when available. */
  readonly emotion?: EkmanEmotion;
}

export interface ZoneState {
  readonly currentZone: string | null;
  readonly confidence: number;
  /** Time spent in current zone since last enter (ms). */
  readonly dwellTime: number;
  /** True when a fixation is active in the current zone. */
  readonly fixationActive: boolean;
  readonly emotion: EkmanEmotion | null;
}

export type ZoneEventListener = (event: ZoneEvent) => void;

export interface ZoneEventEmitterConfig extends Partial<HysteresisConfig> {
  /** Uncertainty radius in pixels for the zone classifier. */
  readonly uncertaintyRadius: number;
  /** Minimum dwell time in a zone to trigger fixation_start (ms). */
  readonly minFixationMs: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DEFAULT_UNCERTAINTY_RADIUS = 120;
export const DEFAULT_MIN_ZONE_FIXATION_MS = 150;

// ---------------------------------------------------------------------------
// Emitter
// ---------------------------------------------------------------------------

export class ZoneEventEmitter {
  private readonly hysteresis: HysteresisEngine;
  private readonly uncertaintyRadius: number;
  private readonly minFixationMs: number;

  private readonly listeners = new Map<ZoneEventType, Set<ZoneEventListener>>();

  // Zone dwell tracking
  private zoneEntryTimestamp = 0;
  private fixationActive = false;
  private fixationStartTimestamp = 0;
  private lastEmotion: EkmanEmotion | null = null;

  // Expose for state reads
  private currentZone: string | null = null;
  private currentConfidence = 0;
  private destroyed = false;

  constructor(config?: Partial<ZoneEventEmitterConfig>) {
    this.hysteresis = new HysteresisEngine({
      switchThresholdMs: config?.switchThresholdMs,
    });
    this.uncertaintyRadius = config?.uncertaintyRadius ?? DEFAULT_UNCERTAINTY_RADIUS;
    this.minFixationMs = config?.minFixationMs ?? DEFAULT_MIN_ZONE_FIXATION_MS;
  }

  // -- Event subscription --

  on(type: ZoneEventType, listener: ZoneEventListener): void {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
  }

  off(type: ZoneEventType, listener: ZoneEventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  // -- Main feed --

  /**
   * Feed a gaze sample. Call every ~50ms from the viewing phase.
   *
   * @param gazeX     — viewport X
   * @param gazeY     — viewport Y
   * @param timestamp — monotonic ms
   * @param zones     — current zone layout (from ZoneRegistry.getZones())
   * @param emotion   — current detected emotion (optional)
   */
  feed(
    gazeX: number,
    gazeY: number,
    timestamp: number,
    zones: readonly Zone[],
    emotion?: EkmanEmotion,
  ): void {
    // Inert after destroy
    if (!this.destroyed) {
      this.processFeed(gazeX, gazeY, timestamp, zones, emotion);
    }
  }

  private processFeed(
    gazeX: number,
    gazeY: number,
    timestamp: number,
    zones: readonly Zone[],
    emotion?: EkmanEmotion,
  ): void {
    this.lastEmotion = emotion ?? null;

    const probabilities = classifyGaze(gazeX, gazeY, this.uncertaintyRadius, zones);
    const result = this.hysteresis.update(probabilities, timestamp);

    this.currentConfidence = result.confidence;

    if (result.changed) {
      this.handleTransition(result.zone, result.confidence, timestamp);
    } else {
      this.handleDwell(timestamp);
    }
  }

  // -- State access --

  getState(): ZoneState {
    return {
      currentZone: this.currentZone,
      confidence: this.currentConfidence,
      dwellTime: this.currentZone !== null && this.zoneEntryTimestamp > 0
        ? Date.now() - this.zoneEntryTimestamp
        : 0,
      fixationActive: this.fixationActive,
      emotion: this.lastEmotion,
    };
  }

  /** All events emitted since construction or last reset. */
  getZone(): string | null {
    return this.currentZone;
  }

  getConfidence(): number {
    return this.currentConfidence;
  }

  // -- Lifecycle --

  reset(): void {
    this.endActiveFixation(Date.now());
    this.hysteresis.reset();
    this.currentZone = null;
    this.currentConfidence = 0;
    this.zoneEntryTimestamp = 0;
    this.fixationActive = false;
    this.fixationStartTimestamp = 0;
    this.lastEmotion = null;
  }

  destroy(): void {
    this.reset();
    this.listeners.clear();
    this.destroyed = true;
  }

  // -- Internal --

  private handleTransition(
    newZone: string | null,
    confidence: number,
    timestamp: number,
  ): void {
    const previousZone = this.currentZone;

    // End fixation in previous zone
    this.endActiveFixation(timestamp);

    // Leave previous zone
    if (previousZone !== null) {
      this.emit({
        type: 'zone_leave',
        zoneId: previousZone,
        confidence: this.currentConfidence,
        timestamp,
        duration: timestamp - this.zoneEntryTimestamp,
        emotion: this.lastEmotion ?? undefined,
      });
    }

    // Enter new zone
    this.currentZone = newZone;
    this.currentConfidence = confidence;
    this.zoneEntryTimestamp = timestamp;

    if (newZone !== null) {
      this.emit({
        type: 'zone_enter',
        zoneId: newZone,
        confidence,
        timestamp,
        emotion: this.lastEmotion ?? undefined,
      });
    }
  }

  private handleDwell(timestamp: number): void {
    const dwellMs = timestamp - this.zoneEntryTimestamp;

    // Check fixation start
    if (!this.fixationActive && this.currentZone !== null && dwellMs >= this.minFixationMs) {
      this.startFixation();
    }
  }

  private startFixation(): void {
    this.fixationActive = true;
    this.fixationStartTimestamp = this.zoneEntryTimestamp;

    this.emit({
      type: 'fixation_start',
      zoneId: this.currentZone,
      confidence: this.currentConfidence,
      timestamp: this.fixationStartTimestamp,
      emotion: this.lastEmotion ?? undefined,
    });
  }

  private endActiveFixation(timestamp: number): void {
    if (this.fixationActive) {
      this.emit({
        type: 'fixation_end',
        zoneId: this.currentZone,
        confidence: this.currentConfidence,
        timestamp,
        duration: timestamp - this.fixationStartTimestamp,
        emotion: this.lastEmotion ?? undefined,
      });
    }

    this.fixationActive = false;
    this.fixationStartTimestamp = 0;
  }

  private emit(event: ZoneEvent): void {
    this.listeners.get(event.type)?.forEach((listener) => listener(event));
  }
}
