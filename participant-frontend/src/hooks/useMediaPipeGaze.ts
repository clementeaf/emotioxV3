import { useState, useRef, useCallback, useEffect } from 'react';
import type { RefObject } from 'react';
import type { FaceLandmarker } from '@mediapipe/tasks-vision';
import { createFaceLandmarker } from '../lib/eyeTracking/faceLandmarker';
import { extractGazeFeatures } from '../lib/eyeTracking/featureExtraction';
import { type RffConfig } from '../lib/eyeTracking/ridgeRegression';
import { OneEuroFilter1D } from '../lib/eyeTracking/oneEuroFilter';
import {
  parseFacialTransformationMatrix,
  extractEulerAngles,
  compensateHeadPose,
} from '../lib/eyeTracking/headPose';
import { DEFAULT_RIDGE_LAMBDA, LANDMARK_INDICES } from '../lib/eyeTracking/constants';
import { RidgeGazePredictor, type GazePredictor } from '../lib/eyeTracking/gazePredictor';

// ---------------------------------------------------------------------------
// Defaults — MediaPipe signal is cleaner than WebEyeTrack, so less smoothing
// ---------------------------------------------------------------------------

const DEFAULT_MIN_CUTOFF = 1.2;   // Hz — higher than BlazeGaze's 0.6
const DEFAULT_BETA = 0.05;        // snappier saccade tracking
const DEFAULT_D_CUTOFF = 1.0;

/** Throttle setState to ~5fps — fast enough for UI, avoids re-render storm. */
const STATE_THROTTLE_MS = 200;

/** Minimum eye-open ratio to consider gaze valid (EAR threshold). */
const EAR_OPEN_THRESHOLD = 0.18;

// EAR landmark indices from MediaPipe 478
const LEFT_EYE_EAR = { top: 159, bottom: 145, inner: 133, outer: 33 } as const;
const RIGHT_EYE_EAR = { top: 386, bottom: 374, inner: 362, outer: 263 } as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseMediaPipeGazeOptions {
  oneEuroMinCutoff?: number;
  oneEuroBeta?: number;
  /** Ridge regression lambda. Default 10. */
  ridgeLambda?: number;
  /** Random Fourier Features config. false = linear ridge (default). */
  rff?: RffConfig | false;
  /** Custom GazePredictor instance. When provided, ridgeLambda and rff are ignored. */
  predictor?: GazePredictor;
  /**
   * Enable explicit head pose compensation (linear yaw/pitch correction).
   * Default false — RidgeRegression features already include the full 3×3
   * rotation matrix + translation, so the regression absorbs head pose.
   * Enabling this double-counts pose and injects angular noise as jitter.
   */
  headPoseCompensation?: boolean;
}

export interface MediaPipeGazeFrameStats {
  invalidFrames: number;
  noValidGazeFrames: number;
  validGazeFrames: number;
  captureWidthPx: number | null;
  captureHeightPx: number | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Eye Aspect Ratio — ratio of vertical to horizontal eye opening. */
function computeEAR(
  landmarks: { x: number; y: number }[],
  eye: { readonly top: number; readonly bottom: number; readonly inner: number; readonly outer: number },
): number {
  const top = landmarks[eye.top];
  const bot = landmarks[eye.bottom];
  const inn = landmarks[eye.inner];
  const out = landmarks[eye.outer];
  if (!top || !bot || !inn || !out) return 0;
  const vDist = Math.abs(top.y - bot.y);
  const hDist = Math.abs(inn.x - out.x);
  return hDist > 1e-6 ? vDist / hDist : 0;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * MediaPipe Face Landmarker gaze pipeline.
 *
 * Camera frame → FaceLandmarker (478 landmarks + iris + 4×4 matrix)
 *   → extractGazeFeatures (27-dim) → RidgeRegression → head pose compensation
 *   → One-Euro filter → screen coords.
 *
 * Same external shape as useBlazeGaze — drop-in for comparison.
 */
export function useMediaPipeGaze(
  videoRef: RefObject<HTMLVideoElement | null>,
  options?: UseMediaPipeGazeOptions,
) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [gazePos, setGazePos] = useState<{ x: number; y: number } | null>(null);
  const gazePosRef = useRef<{ x: number; y: number } | null>(null);
  const [rawGazePos, setRawGazePos] = useState<{ x: number; y: number } | null>(null);
  const rawScreenRef = useRef<{ x: number; y: number } | null>(null);
  const [gazeState, setGazeState] = useState<'open' | 'closed'>('closed');
  const [calibrationCount, setCalibrationCount] = useState(0);

  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const rffConfig = options?.rff;
  const predictorRef = useRef<GazePredictor>(
    options?.predictor ?? new RidgeGazePredictor(
      options?.ridgeLambda ?? DEFAULT_RIDGE_LAMBDA,
      rffConfig ? { rff: rffConfig } : undefined,
    ),
  );
  const filterXRef = useRef<OneEuroFilter1D | null>(null);
  const filterYRef = useRef<OneEuroFilter1D | null>(null);
  const rafRef = useRef(0);
  const runningRef = useRef(false);
  const lastStateUpdateRef = useRef(0);
  const lastEmittedGazeStateRef = useRef<'open' | 'closed'>('closed');
  const frameStatsRef = useRef<Pick<MediaPipeGazeFrameStats, 'invalidFrames' | 'noValidGazeFrames' | 'validGazeFrames'>>({
    invalidFrames: 0, noValidGazeFrames: 0, validGazeFrames: 0,
  });
  const lastCaptureDimensionsRef = useRef<{ w: number; h: number } | null>(null);

  // ponytail: store last features for calibrate() — avoids re-running detection
  const lastFeaturesRef = useRef<number[] | null>(null);

  /** Live EAR (Eye Aspect Ratio), avg of both eyes. Updated every valid frame. */
  const earRef = useRef(0.28);
  /** Live head pose angles (degrees). Updated every valid frame with facial matrix. */
  const headPoseRef = useRef<{ pitch: number; yaw: number }>({ pitch: 0, yaw: 0 });

  const minCutoff = options?.oneEuroMinCutoff ?? DEFAULT_MIN_CUTOFF;
  const beta = options?.oneEuroBeta ?? DEFAULT_BETA;
  const headPose = options?.headPoseCompensation ?? false;

  // Rebuild filters when params change
  useEffect(() => {
    filterXRef.current = new OneEuroFilter1D(minCutoff, beta, DEFAULT_D_CUTOFF);
    filterYRef.current = new OneEuroFilter1D(minCutoff, beta, DEFAULT_D_CUTOFF);
  }, [minCutoff, beta]);

  // Load MediaPipe FaceLandmarker (+ ONNX model if predictor is OnnxGazePredictor)
  useEffect(() => {
    let cancelled = false;
    async function init() {
      const lm = await createFaceLandmarker();
      if (cancelled) { lm.close(); return; }
      landmarkerRef.current = lm;

      // If predictor needs async initialization (ONNX model load)
      const pred = predictorRef.current;
      if ('loadModel' in pred && typeof (pred as { loadModel: () => Promise<void> }).loadModel === 'function') {
        await (pred as { loadModel: () => Promise<void> }).loadModel();
      }

      setIsLoaded(true);
    }
    void init();
    return () => {
      cancelled = true;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, []);

  // Calibrate — store sample for ridge regression
  const calibrate = useCallback((screenX: number, screenY: number): void => {
    const features = lastFeaturesRef.current;
    if (!features) return;
    predictorRef.current.addCalibrationSample({ features }, [screenX, screenY]);
    setCalibrationCount(prev => prev + 1);
  }, []);

  /** Train predictor after all calibration samples are collected. */
  const trainRidge = useCallback(async (): Promise<void> => {
    if (predictorRef.current.sampleCount >= 2) {
      await predictorRef.current.train();
    }
  }, []);

  const getFrameStats = useCallback((): MediaPipeGazeFrameStats => {
    const dim = lastCaptureDimensionsRef.current;
    return {
      ...frameStatsRef.current,
      captureWidthPx: dim?.w ?? null,
      captureHeightPx: dim?.h ?? null,
    };
  }, []);

  const resetFrameStats = useCallback((): void => {
    frameStatsRef.current = { invalidFrames: 0, noValidGazeFrames: 0, validGazeFrames: 0 };
    lastCaptureDimensionsRef.current = null;
  }, []);

  // Tracking loop
  const start = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    frameStatsRef.current = { invalidFrames: 0, noValidGazeFrames: 0, validGazeFrames: 0 };
    lastCaptureDimensionsRef.current = null;
    lastEmittedGazeStateRef.current = 'closed';
    filterXRef.current?.reset();
    filterYRef.current?.reset();

    const loop = () => {
      if (!runningRef.current) return;

      const video = videoRef.current;
      const lm = landmarkerRef.current;

      if (!video || !lm || video.readyState < 2) {
        frameStatsRef.current.invalidFrames += 1;
        if (lastEmittedGazeStateRef.current !== 'closed') {
          lastEmittedGazeStateRef.current = 'closed';
          setGazeState('closed');
        }
        if (runningRef.current) rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const w = video.videoWidth;
      const h = video.videoHeight;
      if (w > 0 && h > 0) lastCaptureDimensionsRef.current = { w, h };

      // Synchronous detection — FaceLandmarker in VIDEO mode
      const result = lm.detectForVideo(video, performance.now());
      const landmarks = result.faceLandmarks?.[0];

      if (!landmarks || landmarks.length < LANDMARK_INDICES.rightIrisCenter + 1) {
        frameStatsRef.current.noValidGazeFrames += 1;
        if (lastEmittedGazeStateRef.current !== 'closed') {
          lastEmittedGazeStateRef.current = 'closed';
          setGazeState('closed');
        }
        if (runningRef.current) rafRef.current = requestAnimationFrame(loop);
        return;
      }

      // Blink detection via EAR
      const earL = computeEAR(landmarks, LEFT_EYE_EAR);
      const earR = computeEAR(landmarks, RIGHT_EYE_EAR);
      const avgEar = (earL + earR) / 2;
      earRef.current = avgEar;
      const eyesOpen = avgEar >= EAR_OPEN_THRESHOLD;

      if (!eyesOpen) {
        frameStatsRef.current.noValidGazeFrames += 1;
        if (lastEmittedGazeStateRef.current !== 'closed') {
          lastEmittedGazeStateRef.current = 'closed';
          setGazeState('closed');
        }
        if (runningRef.current) rafRef.current = requestAnimationFrame(loop);
        return;
      }

      // Extract features
      const facialMatrix = result.facialTransformationMatrixes?.[0] ?? null;
      const features = extractGazeFeatures(landmarks, facialMatrix);

      if (!features) {
        frameStatsRef.current.noValidGazeFrames += 1;
        if (runningRef.current) rafRef.current = requestAnimationFrame(loop);
        return;
      }

      lastFeaturesRef.current = features;
      frameStatsRef.current.validGazeFrames += 1;

      // Extract head pose angles for uncertainty estimation (always, independent of compensation)
      if (facialMatrix) {
        const parsed = parseFacialTransformationMatrix(facialMatrix);
        if (parsed) {
          const angles = extractEulerAngles(parsed.rotationRowMajor);
          headPoseRef.current = { pitch: angles.pitch, yaw: angles.yaw };
        }
      }

      // Update ONNX predictor with current video + landmarks (if applicable)
      const pred = predictorRef.current;
      if ('videoRef' in pred) (pred as { videoRef: HTMLVideoElement | null }).videoRef = video;
      if ('landmarks' in pred) (pred as { landmarks: Array<{ x: number; y: number }> | null }).landmarks = landmarks;

      // If predictor not trained yet, update state but no screen coords
      if (!pred.isReady()) {
        if (lastEmittedGazeStateRef.current !== 'open') {
          lastEmittedGazeStateRef.current = 'open';
          setGazeState('open');
        }
        if (runningRef.current) rafRef.current = requestAnimationFrame(loop);
        return;
      }

      // Predict screen coords
      const [rawX, rawY] = predictorRef.current.predict({ features });
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let sx = Math.max(0, Math.min(vw, rawX));
      let sy = Math.max(0, Math.min(vh, rawY));

      // Head pose compensation
      if (headPose && facialMatrix) {
        const parsed = parseFacialTransformationMatrix(facialMatrix);
        if (parsed) {
          const angles = extractEulerAngles(parsed.rotationRowMajor);
          const compensated = compensateHeadPose(sx, sy, angles, vw, vh);
          sx = compensated.x;
          sy = compensated.y;
        }
      }

      rawScreenRef.current = { x: sx, y: sy };

      // Blink-to-open reset
      const wasBlinking = lastEmittedGazeStateRef.current !== 'open';
      if (wasBlinking) {
        filterXRef.current?.reset();
        filterYRef.current?.reset();
      }

      // One-Euro filter
      const tSec = performance.now() / 1000;
      const fx = filterXRef.current;
      const fy = filterYRef.current;
      const smoothed = (fx && fy)
        ? { x: Math.max(0, Math.min(vw, fx.filter(sx, tSec))), y: Math.max(0, Math.min(vh, fy.filter(sy, tSec))) }
        : { x: sx, y: sy };

      gazePosRef.current = smoothed;

      // Throttle setState
      const now = performance.now();
      if (now - lastStateUpdateRef.current >= STATE_THROTTLE_MS) {
        lastStateUpdateRef.current = now;
        setRawGazePos({ x: sx, y: sy });
        setGazePos(smoothed);
      }

      if (lastEmittedGazeStateRef.current !== 'open') {
        lastEmittedGazeStateRef.current = 'open';
        setGazeState('open');
      }

      if (runningRef.current) rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
  }, [videoRef, headPose]);

  const stop = useCallback(() => {
    runningRef.current = false;
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
    setRawGazePos(null);
    filterXRef.current?.reset();
    filterYRef.current?.reset();
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      runningRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return {
    isLoaded,
    gazePos,
    gazePosRef,
    rawScreenRef,
    rawGazePos,
    gazeState,
    calibrationCount,
    start,
    stop,
    /** Store a calibration sample: features → screen target. */
    calibrate,
    /** Train ridge regression after all calibration points collected. */
    trainRidge,
    /** Current feature vector (for diagnostics). */
    lastFeaturesRef,
    /** Predictor instance (for diagnostics — cvRmsePx, diagnostics). */
    predictorRef,
    /** Live EAR (avg both eyes), updated every valid frame. */
    earRef,
    /** Live head pose {pitch, yaw} in degrees, updated every valid frame. */
    headPoseRef,
    getFrameStats,
    resetFrameStats,
  };
}
