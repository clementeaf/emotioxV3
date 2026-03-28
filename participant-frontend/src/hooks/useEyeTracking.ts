import { useState, useRef, useCallback, useEffect } from 'react';
import type { FaceLandmarker, NormalizedLandmark } from '@mediapipe/tasks-vision';
import {
  averageFeatureVectors,
  clampViewportClientCoords,
  createFaceLandmarker,
  DEFAULT_CALIBRATION_POINTS,
  DEFAULT_CAPTURE_INTERVAL_MS,
  DEFAULT_FRAMES_PER_POINT,
  DEFAULT_RIDGE_LAMBDA,
  extractGazeFeatures,
  RidgeRegression,
} from '../lib/eyeTracking';

export type EyeTrackingState = 'idle' | 'calibrating' | 'collecting' | 'tracking';

const CALIBRATION_POINTS = DEFAULT_CALIBRATION_POINTS;
const FRAMES_PER_POINT = DEFAULT_FRAMES_PER_POINT;
const CAPTURE_INTERVAL = DEFAULT_CAPTURE_INTERVAL_MS;

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
  const lastDetectTimestampMsRef = useRef(0);
  const calibrationTargetRef = useRef<[number, number]>([0, 0]);

  useEffect(() => {
    let cancelled = false;

    async function init(): Promise<void> {
      const landmarker = await createFaceLandmarker();
      if (cancelled) {
        landmarker.close();
        return;
      }
      landmarkerRef.current = landmarker;
      setIsModelLoaded(true);
    }

    void init();

    return () => {
      cancelled = true;
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
    };
  }, []);

  const extractCurrentFeatures = useCallback((): number[] | null => {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !landmarker || video.readyState < 2) return null;

    const tsMs = Math.max(performance.now(), lastDetectTimestampMsRef.current + 0.001);
    lastDetectTimestampMsRef.current = tsMs;
    const result = landmarker.detectForVideo(video, tsMs);
    if (!result.faceLandmarks || result.faceLandmarks.length === 0) return null;

    return extractGazeFeatures(
      result.faceLandmarks[0] as NormalizedLandmark[],
      result.facialTransformationMatrixes?.[0] ?? null,
    );
  }, [videoRef]);

  const onCalibrationCompleteRef = useRef<(() => void) | null>(null);

  const recordCalibrationPoint = useCallback(
    (screenTarget: [number, number], onAllComplete?: () => void) => {
      if (state !== 'calibrating') return;
      if (onAllComplete) onCalibrationCompleteRef.current = onAllComplete;
      calibrationTargetRef.current = clampViewportClientCoords(screenTarget[0], screenTarget[1]);

      setState('collecting');
      setCollectProgress(0);

      const collectedFrames: number[][] = [];
      const dotIndexAtStart = currentDotIndex;

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

          const avgFeatures = averageFeatureVectors(collectedFrames);
          const [screenX, screenY] = calibrationTargetRef.current;

          regressionRef.current.addSample(avgFeatures, [screenX, screenY]);

          const nextIndex = dotIndexAtStart + 1;
          setCalibrationProgress(nextIndex);

          if (nextIndex >= CALIBRATION_POINTS.length) {
            regressionRef.current.train(DEFAULT_RIDGE_LAMBDA);
            setIsCalibrated(true);
            setState('idle');
            onCalibrationCompleteRef.current?.();
          } else {
            setCurrentDotIndex(nextIndex);
            setState('calibrating');
          }
        }
      }, CAPTURE_INTERVAL);
    },
    [state, currentDotIndex, extractCurrentFeatures],
  );

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

    smoothGazeRef.current = [window.innerWidth / 2, window.innerHeight / 2];

    const loop = () => {
      const features = extractCurrentFeatures();
      if (features) {
        const [px, py] = regressionRef.current.predict(features);

        const clampedX = Math.max(0, Math.min(window.innerWidth, px));
        const clampedY = Math.max(0, Math.min(window.innerHeight, py));

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
