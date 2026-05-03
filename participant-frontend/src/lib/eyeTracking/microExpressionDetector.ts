/**
 * Micro-Expression Detector
 *
 * Analyzes a timeline of EmotionSamples to detect transient facial expressions:
 * - brief: <200ms duration
 * - micro: 200-500ms duration
 *
 * A micro-expression is a short deviation from the baseline emotion that
 * returns to the original state. These involuntary flashes reveal concealed
 * emotions and are a key signal in UX/neuromarketing research.
 */

import type { EkmanEmotion, EmotionSample } from './facsClassifier';

export interface MicroExpression {
  /** Detected emotion during the transient */
  emotion: EkmanEmotion;
  /** Duration in milliseconds */
  durationMs: number;
  /** Timestamp of the first sample in the transient (ms from viewing start) */
  startTimestamp: number;
  /** Timestamp of the last sample in the transient */
  endTimestamp: number;
  /** Peak confidence observed during the transient */
  peakConfidence: number;
  /** Classification: brief (<200ms) or micro (200-500ms) */
  category: 'brief' | 'micro';
}

export interface MicroExpressionDetectorOptions {
  /** Minimum confidence to consider a sample valid (default 0.4) */
  minConfidence?: number;
  /** Maximum duration in ms to qualify as micro-expression (default 500) */
  maxDurationMs?: number;
  /** Threshold between brief and micro categories (default 200) */
  briefThresholdMs?: number;
}

/**
 * Detect micro-expressions from a sorted timeline of emotion samples.
 *
 * Algorithm:
 * 1. Establish baseline emotion (most frequent in surrounding window)
 * 2. When emotion changes from baseline, start tracking the transient
 * 3. When emotion returns to baseline, check duration
 * 4. If duration < maxDurationMs and confidence >= minConfidence → micro-expression
 */
export function detectMicroExpressions(
  samples: EmotionSample[],
  options: MicroExpressionDetectorOptions = {},
): MicroExpression[] {
  const {
    minConfidence = 0.4,
    maxDurationMs = 500,
    briefThresholdMs = 200,
  } = options;

  if (samples.length < 3) return [];

  const results: MicroExpression[] = [];

  // State machine: track transient deviations from baseline
  let transientStart: number | null = null;
  let transientEmotion: EkmanEmotion | null = null;
  let transientPeakConfidence = 0;
  let baselineEmotion: EkmanEmotion = samples[0].emotion;

  // Compute local baseline from a sliding window of ~1s (20 samples at 50ms)
  const getLocalBaseline = (index: number): EkmanEmotion => {
    const windowSize = 20;
    const start = Math.max(0, index - windowSize);
    const end = Math.min(samples.length, index + windowSize);
    const counts: Partial<Record<EkmanEmotion, number>> = {};

    for (let i = start; i < end; i++) {
      const e = samples[i].emotion;
      counts[e] = (counts[e] || 0) + 1;
    }

    let best: EkmanEmotion = 'neutral';
    let bestCount = 0;
    for (const [emotion, count] of Object.entries(counts)) {
      if (count! > bestCount) {
        bestCount = count!;
        best = emotion as EkmanEmotion;
      }
    }
    return best;
  };

  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];
    baselineEmotion = getLocalBaseline(i);

    if (transientStart === null) {
      // Not in a transient — check if emotion deviates from baseline
      if (sample.emotion !== baselineEmotion && sample.confidence >= minConfidence) {
        transientStart = i;
        transientEmotion = sample.emotion;
        transientPeakConfidence = sample.confidence;
      }
    } else {
      // In a transient — update or close it
      if (sample.emotion === transientEmotion) {
        // Continue the transient
        transientPeakConfidence = Math.max(transientPeakConfidence, sample.confidence);
      } else {
        // Transient ended (emotion changed back or to something else)
        const startTs = samples[transientStart].timestamp;
        const endTs = samples[i - 1].timestamp;
        const duration = endTs - startTs;

        if (duration > 0 && duration <= maxDurationMs && transientPeakConfidence >= minConfidence) {
          results.push({
            emotion: transientEmotion!,
            durationMs: duration,
            startTimestamp: startTs,
            endTimestamp: endTs,
            peakConfidence: transientPeakConfidence,
            category: duration < briefThresholdMs ? 'brief' : 'micro',
          });
        }

        // Check if current sample starts a new transient
        if (sample.emotion !== baselineEmotion && sample.confidence >= minConfidence) {
          transientStart = i;
          transientEmotion = sample.emotion;
          transientPeakConfidence = sample.confidence;
        } else {
          transientStart = null;
          transientEmotion = null;
          transientPeakConfidence = 0;
        }
      }
    }
  }

  return results;
}
