/**
 * Probabilistic Zone Classifier
 *
 * Transforms a gaze point + uncertainty radius into a probability distribution
 * over registered zones. Uses 2D Gaussian overlap: zones closer to the gaze
 * point receive higher confidence, modulated by how much of the zone falls
 * within the uncertainty radius.
 *
 * Pure functions — no side effects, no DOM access.
 */

import type { Zone, ZoneRect } from './zoneRegistry';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ZoneProbability {
  readonly zoneId: string;
  readonly confidence: number; // [0, 1]
  readonly distance: number;   // px from gaze to nearest zone edge (0 = inside)
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const UNCERTAINTY_RADIUS_DESKTOP = 120;
export const UNCERTAINTY_RADIUS_MOBILE  = 200;
export const UNCERTAINTY_RADIUS_TABLET  = 160;

/** Zones with confidence below this are excluded from results. */
export const MIN_CONFIDENCE_THRESHOLD = 0.02;

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Euclidean distance from point to nearest edge of rect.
 * Returns 0 when inside.
 */
const distanceToRect = (r: ZoneRect, px: number, py: number): number => {
  const cx = Math.max(r.x, Math.min(px, r.x + r.width));
  const cy = Math.max(r.y, Math.min(py, r.y + r.height));
  const dx = px - cx;
  const dy = py - cy;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Distance from point to the center of a rect.
 */
const distanceToCenter = (r: ZoneRect, px: number, py: number): number => {
  const cx = r.x + r.width / 2;
  const cy = r.y + r.height / 2;
  const dx = px - cx;
  const dy = py - cy;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Gaussian weight: exp(-d² / (2σ²))
 * σ = radius / 2 — so at the edge of the radius, weight ≈ 0.135
 */
const gaussianWeight = (distance: number, radius: number): number => {
  const sigma = radius / 2;
  return Math.exp(-(distance * distance) / (2 * sigma * sigma));
};

/**
 * Approximate area of overlap between a circle (gaze + radius) and a rect (zone).
 * Uses a sampling-free geometric approximation:
 * - Fully inside circle → zone area
 * - Partially overlapping → zone area × Gaussian falloff from gaze to zone center
 * - No overlap → 0
 *
 * The Gaussian modulation captures both proximity and zone size naturally:
 * larger zones have more area, closer zones have higher weight.
 */
const overlapScore = (
  gazeX: number,
  gazeY: number,
  radius: number,
  zone: ZoneRect,
): number => {
  const edgeDist = distanceToRect(zone, gazeX, gazeY);

  // Zone entirely outside the uncertainty radius — no contribution
  const isOutside = edgeDist > radius;
  return isOutside ? 0 : gaussianWeight(distanceToCenter(zone, gazeX, gazeY), radius) * zone.width * zone.height;
};

// ---------------------------------------------------------------------------
// Main classifier
// ---------------------------------------------------------------------------

/**
 * Classify a gaze point into a probability distribution over zones.
 *
 * When the gaze falls within the uncertainty radius of at least one zone,
 * uses Gaussian overlap scoring. When outside all zones (common with webcam
 * jitter), falls back to the nearest zone with distance-decayed confidence.
 *
 * @param gazeX   - Viewport X coordinate of gaze
 * @param gazeY   - Viewport Y coordinate of gaze
 * @param radius  - Uncertainty radius in pixels
 * @param zones   - Available zones to classify against
 * @returns Array of ZoneProbability sorted by confidence descending.
 *          Always returns at least one zone when zones is non-empty (nearest fallback).
 */
export function classifyGaze(
  gazeX: number,
  gazeY: number,
  radius: number,
  zones: readonly Zone[],
): ZoneProbability[] {
  if (zones.length === 0) return [];

  const scored = zones.map((z) => ({
    zoneId: z.id,
    raw: overlapScore(gazeX, gazeY, radius, z.rect),
    distance: distanceToRect(z.rect, gazeX, gazeY),
  }));

  const totalRaw = scored.reduce((sum, s) => sum + s.raw, 0);

  if (totalRaw > 0) {
    // Normal path: gaze within radius of at least one zone
    return scored
      .map((s) => ({
        zoneId: s.zoneId,
        confidence: s.raw / totalRaw,
        distance: s.distance,
      }))
      .filter((s) => s.confidence >= MIN_CONFIDENCE_THRESHOLD)
      .sort((a, b) => b.confidence - a.confidence);
  }

  // Fallback: gaze outside all zones — assign nearest zone with decayed confidence.
  // Without this, webcam jitter causes frequent "no zone" gaps that break fixation detection.
  // ponytail: nearest-zone fallback, confidence decays with distance beyond radius.
  const nearest = scored.reduce((best, s) => s.distance < best.distance ? s : best, scored[0]);
  // Confidence decays from 0.4 at zone edge to 0.1 at 2× radius away
  const fallbackConfidence = Math.max(0.1, 0.4 * Math.exp(-nearest.distance / radius));
  return [{
    zoneId: nearest.zoneId,
    confidence: fallbackConfidence,
    distance: nearest.distance,
  }];
}

/**
 * Extract the top zone from a classification result.
 * Returns null when no zone meets the minimum confidence.
 */
export function topZone(
  probabilities: readonly ZoneProbability[],
  minConfidence = 0.15,
): ZoneProbability | null {
  const top = probabilities[0];
  return (top && top.confidence >= minConfidence) ? top : null;
}
