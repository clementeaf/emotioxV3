/**
 * Eye-tracking library layer for the participant app.
 *
 * - **Detection**: `@mediapipe/tasks-vision` Face Landmarker (browser WASM).
 * - **Gaze mapping**: `RidgeRegression` on engineered features (iris-in-eye, head pose from 4x4 matrix, polynomials, iris×translation crosses).
 *
 * React integration lives in `hooks/useEyeTracking.ts`.
 */

export {
  MEDIAPIPE_TASKS_VISION_VERSION,
  FACE_LANDMARKER_MODEL_URL,
  getVisionTasksWasmBaseUrl,
  DEFAULT_CALIBRATION_POINTS,
  CALIBRATION_VIEWPORT_TOP_INSET_PX,
  calibrationPercentToScreenTarget,
  clampViewportClientCoords,
  DEFAULT_FRAMES_PER_POINT,
  DEFAULT_CAPTURE_INTERVAL_MS,
  MIN_IRIS_LANDMARK_VISIBILITY,
  MIN_IRIS_LANDMARK_PASS_COUNT,
  MIN_IRIS_CENTER_VISIBILITY,
  GAZE_FEATURE_DIMENSION,
  DEFAULT_RIDGE_LAMBDA,
  LANDMARK_INDICES,
} from './constants';

export type { NormalizedLandmark } from './types';

export { extractGazeFeatures, averageFeatureVectors } from './featureExtraction';

export { parseFacialTransformationMatrix } from './headPose';

export { RidgeRegression } from './ridgeRegression';

export { createFaceLandmarker } from './faceLandmarker';
