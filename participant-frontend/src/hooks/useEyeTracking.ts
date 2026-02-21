import { useState, useRef, useCallback, useEffect } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { RidgeRegression } from '../lib/ridgeRegression';

export type EyeTrackingState = 'idle' | 'calibrating' | 'collecting' | 'tracking';

/** 9 calibration points as viewport percentages (x%, y%) */
const CALIBRATION_POINTS: [number, number][] = [
  [10, 10], [50, 10], [90, 10],
  [10, 50], [50, 50], [90, 50],
  [10, 90], [50, 90], [90, 90],
];

const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';

/** How many frames to collect per calibration point */
const FRAMES_PER_POINT = 15;
/** Delay between frame captures (ms) */
const CAPTURE_INTERVAL = 40;

// MediaPipe landmark indices
const LEFT_IRIS_CENTER = 468;
const RIGHT_IRIS_CENTER = 473;
const LEFT_EYE_INNER = 133;
const LEFT_EYE_OUTER = 33;
const LEFT_EYE_TOP = 159;
const LEFT_EYE_BOTTOM = 145;
const RIGHT_EYE_INNER = 362;
const RIGHT_EYE_OUTER = 263;
const RIGHT_EYE_TOP = 386;
const RIGHT_EYE_BOTTOM = 374;
const NOSE_TIP = 1;

interface Landmark {
  x: number;
  y: number;
  z: number;
}

/**
 * Extract rich features from face landmarks:
 * - Relative iris position within each eye (invariant to head position)
 * - Head position (nose tip)
 * - Polynomial cross-terms for non-linearity
 */
function extractFeatures(landmarks: Landmark[]): number[] | null {
  if (landmarks.length < RIGHT_IRIS_CENTER + 1) return null;

  const leftIris = landmarks[LEFT_IRIS_CENTER];
  const rightIris = landmarks[RIGHT_IRIS_CENTER];
  const leftInner = landmarks[LEFT_EYE_INNER];
  const leftOuter = landmarks[LEFT_EYE_OUTER];
  const leftTop = landmarks[LEFT_EYE_TOP];
  const leftBottom = landmarks[LEFT_EYE_BOTTOM];
  const rightInner = landmarks[RIGHT_EYE_INNER];
  const rightOuter = landmarks[RIGHT_EYE_OUTER];
  const rightTop = landmarks[RIGHT_EYE_TOP];
  const rightBottom = landmarks[RIGHT_EYE_BOTTOM];
  const nose = landmarks[NOSE_TIP];

  // Relative iris position within eye bounding box (0-1 range)
  const leftEyeW = leftInner.x - leftOuter.x; // inner is more towards center
  const leftEyeH = leftBottom.y - leftTop.y;
  const rightEyeW = rightInner.x - rightOuter.x;
  const rightEyeH = rightBottom.y - rightTop.y;

  // Avoid division by zero
  if (Math.abs(leftEyeW) < 1e-6 || Math.abs(leftEyeH) < 1e-6 ||
      Math.abs(rightEyeW) < 1e-6 || Math.abs(rightEyeH) < 1e-6) {
    return null;
  }

  const lrx = (leftIris.x - leftOuter.x) / leftEyeW;
  const lry = (leftIris.y - leftTop.y) / leftEyeH;
  const rrx = (rightIris.x - rightOuter.x) / rightEyeW;
  const rry = (rightIris.y - rightTop.y) / rightEyeH;

  // Head position (normalized 0-1 from MediaPipe)
  const hx = nose.x;
  const hy = nose.y;

  // Average of both eyes for more stability
  const avgRx = (lrx + rrx) / 2;
  const avgRy = (lry + rry) / 2;

  return [
    // Base features (6)
    lrx, lry, rrx, rry, hx, hy,
    // Averaged eye features (2)
    avgRx, avgRy,
    // Polynomial terms for non-linearity (6)
    avgRx * avgRx,
    avgRy * avgRy,
    avgRx * avgRy,
    hx * avgRx,
    hy * avgRy,
    hx * hy,
  ];
}

/** Average multiple feature vectors element-wise */
function averageFeatures(featureSets: number[][]): number[] {
  const n = featureSets[0].length;
  const avg = new Array(n).fill(0);
  for (const f of featureSets) {
    for (let i = 0; i < n; i++) avg[i] += f[i];
  }
  const count = featureSets.length;
  for (let i = 0; i < n; i++) avg[i] /= count;
  return avg;
}

export function useEyeTracking(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [state, setState] = useState<EyeTrackingState>('idle');
  const [gazePosition, setGazePosition] = useState<[number, number]>([0, 0]);
  const [currentDotIndex, setCurrentDotIndex] = useState(0);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [collectProgress, setCollectProgress] = useState(0);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isCalibrated, setIsCalibrated] = useState(false);

  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const regressionRef = useRef(new RidgeRegression());
  const rafRef = useRef<number>(0);
  const collectTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const smoothGazeRef = useRef<[number, number]>([0, 0]);

  // Initialize FaceLandmarker
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
      if (cancelled) return;

      const landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });

      if (cancelled) {
        landmarker.close();
        return;
      }

      landmarkerRef.current = landmarker;
      setIsModelLoaded(true);
    }

    init();

    return () => {
      cancelled = true;
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
    };
  }, []);

  /** Extract features from current video frame */
  const extractCurrentFeatures = useCallback((): number[] | null => {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !landmarker || video.readyState < 2) return null;

    const result = landmarker.detectForVideo(video, performance.now());
    if (!result.faceLandmarks || result.faceLandmarks.length === 0) return null;

    return extractFeatures(result.faceLandmarks[0] as Landmark[]);
  }, [videoRef]);

  /**
   * Record a calibration point: collect FRAMES_PER_POINT frames,
   * average them, and add as a single training sample.
   */
  const onCalibrationCompleteRef = useRef<(() => void) | null>(null);

  const recordCalibrationPoint = useCallback((onAllComplete?: () => void) => {
    if (state !== 'calibrating') return;
    if (onAllComplete) onCalibrationCompleteRef.current = onAllComplete;

    setState('collecting');
    setCollectProgress(0);

    const collectedFrames: number[][] = [];

    collectTimerRef.current = setInterval(() => {
      const features = extractCurrentFeatures();
      if (features) {
        collectedFrames.push(features);
      }

      const progress = collectedFrames.length;
      setCollectProgress(progress);

      if (progress >= FRAMES_PER_POINT) {
        if (collectTimerRef.current) {
          clearInterval(collectTimerRef.current);
          collectTimerRef.current = null;
        }

        const avgFeatures = averageFeatures(collectedFrames);
        const [pctX, pctY] = CALIBRATION_POINTS[currentDotIndex];
        const screenX = (pctX / 100) * window.innerWidth;
        const screenY = (pctY / 100) * window.innerHeight;

        regressionRef.current.addSample(avgFeatures, [screenX, screenY]);

        const nextIndex = currentDotIndex + 1;
        setCalibrationProgress(nextIndex);

        if (nextIndex >= CALIBRATION_POINTS.length) {
          regressionRef.current.train(0.1);
          setIsCalibrated(true);
          setState('idle');
          onCalibrationCompleteRef.current?.();
        } else {
          setCurrentDotIndex(nextIndex);
          setState('calibrating');
        }
      }
    }, CAPTURE_INTERVAL);
  }, [state, currentDotIndex, extractCurrentFeatures]);

  const startCalibration = useCallback(() => {
    regressionRef.current = new RidgeRegression();
    setIsCalibrated(false);
    setCurrentDotIndex(0);
    setCalibrationProgress(0);
    setCollectProgress(0);
    setState('calibrating');
  }, []);

  const startTracking = useCallback(() => {
    if (!regressionRef.current.isReady()) return;
    setState('tracking');

    // Initialize smooth position to center
    smoothGazeRef.current = [window.innerWidth / 2, window.innerHeight / 2];

    const loop = () => {
      const features = extractCurrentFeatures();
      if (features) {
        const [px, py] = regressionRef.current.predict(features);

        const clampedX = Math.max(0, Math.min(window.innerWidth, px));
        const clampedY = Math.max(0, Math.min(window.innerHeight, py));

        // Heavier smoothing to reduce jitter
        const alpha = 0.15;
        smoothGazeRef.current = [
          smoothGazeRef.current[0] + alpha * (clampedX - smoothGazeRef.current[0]),
          smoothGazeRef.current[1] + alpha * (clampedY - smoothGazeRef.current[1]),
        ];

        setGazePosition([...smoothGazeRef.current]);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
  }, [extractCurrentFeatures]);

  const stopTracking = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    if (collectTimerRef.current) {
      clearInterval(collectTimerRef.current);
      collectTimerRef.current = null;
    }
    setState('idle');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (collectTimerRef.current) clearInterval(collectTimerRef.current);
    };
  }, []);

  return {
    state,
    gazePosition,
    currentDotIndex,
    currentDotPosition: CALIBRATION_POINTS[currentDotIndex] as [number, number] | undefined,
    calibrationProgress,
    collectProgress,
    framesPerPoint: FRAMES_PER_POINT,
    totalCalibrationPoints: CALIBRATION_POINTS.length,
    isModelLoaded,
    isCalibrated,
    startCalibration,
    recordCalibrationPoint,
    startTracking,
    stopTracking,
  };
}
