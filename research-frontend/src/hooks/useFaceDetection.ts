import { useState, useRef, useCallback, useEffect } from 'react';
import type { FaceLandmarker, NormalizedLandmark } from '@mediapipe/tasks-vision';
import { createFaceLandmarker, extractGazeFeatures } from '../lib/eyeTracking';

/**
 * Minimal hook: loads MediaPipe Face Landmarker and runs detection each frame.
 * Exposes landmark + feature-ready refs for the FaceDetectionOverlay canvas.
 * No gaze mapping, no calibration, no regression.
 */
export function useFaceDetection(videoRef: React.RefObject<HTMLVideoElement | null>) {
    const [isModelLoaded, setIsModelLoaded] = useState(false);

    const landmarkerRef = useRef<FaceLandmarker | null>(null);
    const rafRef = useRef(0);
    const lastTsMsRef = useRef(0);

    const landmarksRef = useRef<NormalizedLandmark[] | null>(null);
    const featuresReadyRef = useRef(false);

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

    const start = useCallback(() => {
        const tick = () => {
            const video = videoRef.current;
            const landmarker = landmarkerRef.current;

            if (video && landmarker && video.readyState >= 2) {
                const tsMs = Math.max(performance.now(), lastTsMsRef.current + 0.001);
                lastTsMsRef.current = tsMs;

                const result = landmarker.detectForVideo(video, tsMs);
                const lm = result.faceLandmarks?.[0] ?? null;
                const matrix = result.facialTransformationMatrixes?.[0];
                const features = lm
                    ? extractGazeFeatures(lm as NormalizedLandmark[], matrix ?? null)
                    : null;

                landmarksRef.current = lm as NormalizedLandmark[] | null;
                featuresReadyRef.current = features !== null;
            } else {
                landmarksRef.current = null;
                featuresReadyRef.current = false;
            }

            rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);
    }, [videoRef]);

    const stop = useCallback(() => {
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = 0;
        }
        landmarksRef.current = null;
        featuresReadyRef.current = false;
    }, []);

    useEffect(() => {
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    return {
        isModelLoaded,
        landmarksRef,
        featuresReadyRef,
        start,
        stop,
    };
}
