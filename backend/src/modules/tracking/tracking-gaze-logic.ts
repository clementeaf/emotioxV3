/**
 * Website Tracking gaze logic — pure functions, no DOM, no MediaPipe.
 *
 * Cursor = primary attention signal. Iris displacement = validation.
 * No calibration needed — uses relative iris-in-eye ratios for direction.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IrisDisplacement {
  /** Horizontal displacement: negative = left, positive = right */
  rx: number;
  /** Vertical displacement: negative = up, positive = down */
  ry: number;
}

export interface GazeDirection {
  horizontal: 'left' | 'center' | 'right';
  vertical: 'up' | 'center' | 'down';
}

export type AttentionState = 'engaged' | 'distracted' | 'away';

export type GazeQuadrant =
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_EYE_SPAN = 1e-5;
const HORIZONTAL_THRESHOLD = 0.08;
const VERTICAL_THRESHOLD = 0.06;
const HEAD_DISTRACTED_DEG = 30;

// ---------------------------------------------------------------------------
// Iris displacement
// ---------------------------------------------------------------------------

/**
 * Compute iris displacement relative to eye center, normalized by eye width.
 * Works with MediaPipe normalized landmarks (0-1).
 */
export function computeIrisDisplacement(
  irisX: number, irisY: number,
  eyeOuterX: number, eyeOuterY: number,
  eyeInnerX: number, eyeInnerY: number,
  eyeTopY: number,
  eyeBottomY: number,
): IrisDisplacement {
  const eyeW = Math.abs(eyeInnerX - eyeOuterX);
  const eyeH = Math.abs(eyeTopY - eyeBottomY);

  if (eyeW < MIN_EYE_SPAN || eyeH < MIN_EYE_SPAN) {
    return { rx: 0, ry: 0 };
  }

  const centerX = (eyeInnerX + eyeOuterX) / 2;
  const centerY = (eyeTopY + eyeBottomY) / 2;

  return {
    rx: (irisX - centerX) / eyeW,
    ry: (irisY - centerY) / eyeH,
  };
}

// ---------------------------------------------------------------------------
// Gaze direction
// ---------------------------------------------------------------------------

/**
 * Estimate gaze direction from averaged iris displacement of both eyes.
 * No calibration — uses fixed thresholds on normalized displacement.
 */
export function estimateGazeDirection(
  leftEye: IrisDisplacement,
  rightEye: IrisDisplacement,
): GazeDirection {
  const avgRx = (leftEye.rx + rightEye.rx) / 2;
  const avgRy = (leftEye.ry + rightEye.ry) / 2;

  const horizontal: GazeDirection['horizontal'] =
    avgRx < -HORIZONTAL_THRESHOLD ? 'left' :
    avgRx > HORIZONTAL_THRESHOLD ? 'right' : 'center';

  const vertical: GazeDirection['vertical'] =
    avgRy < -VERTICAL_THRESHOLD ? 'up' :
    avgRy > VERTICAL_THRESHOLD ? 'down' : 'center';

  return { horizontal, vertical };
}

// ---------------------------------------------------------------------------
// Probabilistic quadrant distribution
// ---------------------------------------------------------------------------

export type QuadrantProbabilities = Record<GazeQuadrant, number>;

const QUADRANT_CENTROIDS: Array<{ q: GazeQuadrant; cx: number; cy: number }> = [
  { q: 'top-left',      cx: -0.16, cy: -0.12 },
  { q: 'top-center',    cx:  0.00, cy: -0.12 },
  { q: 'top-right',     cx:  0.16, cy: -0.12 },
  { q: 'center-left',   cx: -0.16, cy:  0.00 },
  { q: 'center',        cx:  0.00, cy:  0.00 },
  { q: 'center-right',  cx:  0.16, cy:  0.00 },
  { q: 'bottom-left',   cx: -0.16, cy:  0.12 },
  { q: 'bottom-center', cx:  0.00, cy:  0.12 },
  { q: 'bottom-right',  cx:  0.16, cy:  0.12 },
];

// ponytail: σ = threshold — at zone boundary weight ≈ 0.6, decays smoothly
const SIGMA_X = HORIZONTAL_THRESHOLD;
const SIGMA_Y = VERTICAL_THRESHOLD;

/**
 * Compute probability distribution over 9 quadrants using 2D Gaussian.
 * Instead of hard-classifying to one zone, spreads probability across
 * neighboring zones based on iris displacement uncertainty.
 */
export function computeQuadrantProbabilities(
  leftEye: IrisDisplacement,
  rightEye: IrisDisplacement,
): QuadrantProbabilities {
  const avgRx = (leftEye.rx + rightEye.rx) / 2;
  const avgRy = (leftEye.ry + rightEye.ry) / 2;

  const weights: Record<string, number> = {};
  let total = 0;

  for (const { q, cx, cy } of QUADRANT_CENTROIDS) {
    const dx = avgRx - cx;
    const dy = avgRy - cy;
    const w = Math.exp(-(dx * dx) / (2 * SIGMA_X * SIGMA_X) - (dy * dy) / (2 * SIGMA_Y * SIGMA_Y));
    weights[q] = w;
    total += w;
  }

  const result = {} as QuadrantProbabilities;
  for (const { q } of QUADRANT_CENTROIDS) {
    result[q] = total > 0 ? Math.round(weights[q] / total * 1000) / 1000 : 0;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Quadrant (discrete — backward compat)
// ---------------------------------------------------------------------------

/**
 * Map gaze direction to a named quadrant (3×3 grid).
 */
export function classifyGazeQuadrant(direction: GazeDirection): GazeQuadrant {
  const { horizontal, vertical } = direction;
  if (vertical === 'center' && horizontal === 'center') return 'center';
  if (vertical === 'up') {
    if (horizontal === 'left') return 'top-left';
    if (horizontal === 'right') return 'top-right';
    return 'top-center';
  }
  if (vertical === 'down') {
    if (horizontal === 'left') return 'bottom-left';
    if (horizontal === 'right') return 'bottom-right';
    return 'bottom-center';
  }
  // vertical = center, horizontal != center
  if (horizontal === 'left') return 'center-left';
  return 'center-right';
}

// ---------------------------------------------------------------------------
// Attention state
// ---------------------------------------------------------------------------

/**
 * Estimate attention state from iris visibility and head pose.
 * - engaged: looking at screen (iris visible, head roughly forward)
 * - distracted: head turned significantly but iris still trackable
 * - away: no iris detected (looking away, eyes closed, left frame)
 */
export function estimateAttentionState(
  irisVisible: boolean,
  headYawDeg: number,
  headPitchDeg: number,
): AttentionState {
  if (!irisVisible) return 'away';
  if (Math.abs(headYawDeg) > HEAD_DISTRACTED_DEG || Math.abs(headPitchDeg) > HEAD_DISTRACTED_DEG) {
    return 'distracted';
  }
  return 'engaged';
}

// ---------------------------------------------------------------------------
// Cursor-gaze correlation
// ---------------------------------------------------------------------------

/**
 * Check if gaze direction roughly matches the viewport area where the cursor is.
 * Center gaze is permissive — matches any cursor position (person is looking at screen).
 */
export function gazeMatchesCursorArea(
  gaze: GazeDirection,
  cursorX: number, cursorY: number,
  viewportW: number, viewportH: number,
): boolean {
  if (gaze.horizontal === 'center' && gaze.vertical === 'center') return true;

  const cursorH: GazeDirection['horizontal'] =
    cursorX < viewportW / 3 ? 'left' :
    cursorX > viewportW * 2 / 3 ? 'right' : 'center';

  const cursorV: GazeDirection['vertical'] =
    cursorY < viewportH / 3 ? 'up' :
    cursorY > viewportH * 2 / 3 ? 'down' : 'center';

  const hMatch = gaze.horizontal === 'center' || gaze.horizontal === cursorH;
  const vMatch = gaze.vertical === 'center' || gaze.vertical === cursorV;

  return hMatch && vMatch;
}

// ---------------------------------------------------------------------------
// Attention score
// ---------------------------------------------------------------------------

/**
 * Combine attention state + cursor-gaze match into a 0-1 score.
 * - 1.0: engaged and looking where cursor is
 * - 0.7: engaged but looking elsewhere on screen
 * - 0.3: distracted (head turned)
 * - 0.0: away (not visible)
 */
export function computeAttentionScore(
  state: AttentionState,
  cursorMatch: boolean,
): number {
  if (state === 'away') return 0;
  if (state === 'distracted') return 0.3;
  return cursorMatch ? 1.0 : 0.7;
}
