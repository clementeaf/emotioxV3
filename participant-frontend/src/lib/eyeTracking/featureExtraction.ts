import type { Matrix, NormalizedLandmark } from '@mediapipe/tasks-vision';
import { GAZE_FEATURE_DIMENSION, LANDMARK_INDICES } from './constants';
import { parseFacialTransformationMatrix } from './headPose';

/** Normalized eye box span below this is treated as degenerate (extreme pose or bad frame). */
const MIN_EYE_AXIS_SPAN = 1e-5;

const IRIS_VISIBILITY_INDICES: readonly number[] = [
  LANDMARK_INDICES.leftIrisCenter,
  LANDMARK_INDICES.rightIrisCenter,
  LANDMARK_INDICES.leftEyeInner,
  LANDMARK_INDICES.leftEyeOuter,
  LANDMARK_INDICES.leftEyeTop,
  LANDMARK_INDICES.leftEyeBottom,
  LANDMARK_INDICES.rightEyeInner,
  LANDMARK_INDICES.rightEyeOuter,
  LANDMARK_INDICES.rightEyeTop,
  LANDMARK_INDICES.rightEyeBottom,
];

/**
 * True when iris + eye contour points exist with finite coords. Visibility is ignored: MediaPipe often sets visibility to 0 on webcams while x/y are still usable.
 * @param landmarks - One face's normalized landmarks
 * @returns Whether all required indices are present
 */
function irisLandmarksHaveFiniteCoords(landmarks: NormalizedLandmark[]): boolean {
  for (const i of IRIS_VISIBILITY_INDICES) {
    const lm = landmarks[i];
    if (lm === undefined || !Number.isFinite(lm.x) || !Number.isFinite(lm.y)) {
      return false;
    }
  }
  return true;
}

/**
 * Approximate head pose when MediaPipe omits or invalidates the 4x4 facial matrix (identity rotation + nose-centered translation).
 * @param landmarks - One face's normalized landmarks
 * @returns Rotation (9) and translation (3) compatible with ridge features
 */
function buildFallbackHeadPose(landmarks: NormalizedLandmark[]): {
  rotationRowMajor: [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  translation: [number, number, number];
} {
  const nose = landmarks[LANDMARK_INDICES.noseTip];
  const tx = nose ? nose.x - 0.5 : 0;
  const ty = nose ? nose.y - 0.5 : 0;
  const tz = 0;
  return {
    rotationRowMajor: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    translation: [tx, ty, tz],
  };
}

/**
 * Builds the gaze feature vector: iris-in-eye ratios, head pose from facial transform, polynomials, and iris×translation crosses.
 * Head pose uses the 4x4 matrix from MediaPipe (explicit rotation + translation) so the ridge mapper can separate gaze from head motion.
 * @param landmarks - Normalized landmarks for one face
 * @param facialMatrix - Optional 4x4 from `facialTransformationMatrixes[0]`; if missing or invalid, a nose-based fallback is used
 * @returns Fixed-length feature vector, or null if geometry or visibility is unusable
 */
export function extractGazeFeatures(
  landmarks: NormalizedLandmark[],
  facialMatrix: Matrix | undefined | null,
): number[] | null {
  const {
    leftIrisCenter: LI,
    rightIrisCenter: RI,
    leftEyeInner,
    leftEyeOuter,
    leftEyeTop,
    leftEyeBottom,
    rightEyeInner,
    rightEyeOuter,
    rightEyeTop,
    rightEyeBottom,
  } = LANDMARK_INDICES;

  if (landmarks.length < RI + 1) {
    return null;
  }

  if (!irisLandmarksHaveFiniteCoords(landmarks)) {
    return null;
  }

  let head = facialMatrix ? parseFacialTransformationMatrix(facialMatrix) : null;
  if (!head) {
    head = buildFallbackHeadPose(landmarks);
  }

  const leftIris = landmarks[LI];
  const rightIris = landmarks[RI];
  const leftInner = landmarks[leftEyeInner];
  const leftOuter = landmarks[leftEyeOuter];
  const leftTop = landmarks[leftEyeTop];
  const leftBottom = landmarks[leftEyeBottom];
  const rightInner = landmarks[rightEyeInner];
  const rightOuter = landmarks[rightEyeOuter];
  const rightTop = landmarks[rightEyeTop];
  const rightBottom = landmarks[rightEyeBottom];

  const leftEyeW = leftInner.x - leftOuter.x;
  const leftEyeH = leftBottom.y - leftTop.y;
  const rightEyeW = rightInner.x - rightOuter.x;
  const rightEyeH = rightBottom.y - rightTop.y;

  if (
    Math.abs(leftEyeW) < MIN_EYE_AXIS_SPAN ||
    Math.abs(leftEyeH) < MIN_EYE_AXIS_SPAN ||
    Math.abs(rightEyeW) < MIN_EYE_AXIS_SPAN ||
    Math.abs(rightEyeH) < MIN_EYE_AXIS_SPAN
  ) {
    return null;
  }

  const lrx = (leftIris.x - leftOuter.x) / leftEyeW;
  const lry = (leftIris.y - leftTop.y) / leftEyeH;
  const rrx = (rightIris.x - rightOuter.x) / rightEyeW;
  const rry = (rightIris.y - rightTop.y) / rightEyeH;

  const avgRx = (lrx + rrx) / 2;
  const avgRy = (lry + rry) / 2;

  const [tx, ty, tz] = head.translation;
  const R = head.rotationRowMajor;

  const poly1 = avgRx * avgRx;
  const poly2 = avgRy * avgRy;
  const poly3 = avgRx * avgRy;

  const out: number[] = [
    lrx,
    lry,
    rrx,
    rry,
    avgRx,
    avgRy,
    ...R,
    tx,
    ty,
    tz,
    poly1,
    poly2,
    poly3,
    avgRx * tx,
    avgRx * ty,
    avgRx * tz,
    avgRy * tx,
    avgRy * ty,
    avgRy * tz,
  ];

  if (out.length !== GAZE_FEATURE_DIMENSION) {
    return null;
  }

  return out;
}

/**
 * Element-wise average of multiple feature vectors (same length).
 * @param featureSets - Non-empty list of same-length vectors
 * @returns Averaged vector
 */
export function averageFeatureVectors(featureSets: number[][]): number[] {
  const n = featureSets[0].length;
  const avg = new Array(n).fill(0);
  for (const f of featureSets) {
    for (let i = 0; i < n; i++) avg[i] += f[i];
  }
  const count = featureSets.length;
  for (let i = 0; i < n; i++) avg[i] /= count;
  return avg;
}
