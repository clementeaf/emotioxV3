import { useState, useRef, useCallback, useEffect } from 'react';
import type { RefObject } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { FACE_LANDMARKER_MODEL_URL, getVisionTasksWasmBaseUrl } from '../lib/eyeTracking';

/**
 * Parallel MediaPipe FaceLandmarker that runs alongside BlazeGaze (WebEyeTrack).
 * BlazeGaze handles gaze prediction; this hook extracts facial landmarks for FACS emotion recognition.
 * Both read from the same webcam stream — no duplicate camera access.
 *
 * Samples landmarks at ~20fps (every 50ms) during the viewing phase.
 * All processing is client-side — zero images/video transmitted to server.
 */

export interface UseFaceLandmarksOptions {
  /** The same video ref used by useBlazeGaze */
  videoRef: RefObject<HTMLVideoElement | null>;
  /** Whether emotion recognition is enabled for this module */
  enabled?: boolean;
  /** Sampling interval in ms (default 50ms = 20fps) */
  sampleIntervalMs?: number;
}

export interface FaceLandmarksFrame {
  /** Milliseconds from when tracking started */
  timestamp: number;
  /** 468 normalized landmarks, or null if face not detected */
  landmarks: NormalizedLandmark[] | null;
  /** Whether a face was detected in this frame */
  faceDetected: boolean;
}

export function useFaceLandmarks({
  videoRef,
  enabled = false,
  sampleIntervalMs = 50,
}: UseFaceLandmarksOptions) {
  const [isLoaded, setIsLoaded] = useState(false);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const runningRef = useRef(false);
  const lastSampleRef = useRef<number>(0);
  const framesRef = useRef<FaceLandmarksFrame[]>([]);

  // Initialize FaceLandmarker
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function init() {
      try {
        const vision = await FilesetResolver.forVisionTasks(getVisionTasksWasmBaseUrl());
        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: FACE_LANDMARKER_MODEL_URL },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
        });
        if (!cancelled) {
          landmarkerRef.current = landmarker;
          setIsLoaded(true);
        }
      } catch (err) {
        console.error('[useFaceLandmarks] Failed to initialize FaceLandmarker:', err);
      }
    }

    void init();
    return () => {
      cancelled = true;
      landmarkerRef.current?.close();
    };
  }, [enabled]);

  /** Sample landmarks from current video frame. */
  const sampleFrame = useCallback((): FaceLandmarksFrame | null => {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !landmarker || video.readyState < 2) return null;

    const now = performance.now();
    // Throttle to sampleIntervalMs
    if (now - lastSampleRef.current < sampleIntervalMs) return null;
    lastSampleRef.current = now;

    try {
      const result = landmarker.detectForVideo(video, now);
      const faceDetected = result.faceLandmarks && result.faceLandmarks.length > 0;
      const landmarks = faceDetected ? result.faceLandmarks[0] : null;

      const frame: FaceLandmarksFrame = {
        timestamp: now,
        landmarks,
        faceDetected,
      };

      if (runningRef.current) {
        framesRef.current.push(frame);
      }

      return frame;
    } catch (err) {
      console.warn('[useFaceLandmarks] Detection error:', err);
      return null;
    }
  }, [videoRef, sampleIntervalMs]);

  /** Start continuous landmark sampling via RAF. */
  const start = useCallback(() => {
    if (runningRef.current || !landmarkerRef.current) return;
    runningRef.current = true;
    framesRef.current = [];
    lastSampleRef.current = 0;

    const loop = () => {
      if (!runningRef.current) return;
      sampleFrame();
      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }, [sampleFrame]);

  /** Stop landmark sampling. */
  const stop = useCallback(() => {
    runningRef.current = false;
  }, []);

  /** Get all collected frames. */
  const getFrames = useCallback((): FaceLandmarksFrame[] => {
    return [...framesRef.current];
  }, []);

  /** Clear collected frames. */
  const reset = useCallback(() => {
    framesRef.current = [];
  }, []);

  return {
    isLoaded,
    sampleFrame,
    start,
    stop,
    getFrames,
    reset,
  };
}
