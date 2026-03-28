import { useState, useRef, useCallback, useEffect } from 'react';
import type { FaceLandmarker, NormalizedLandmark } from '@mediapipe/tasks-vision';
import {
    aggregateValidationMetrics,
    averageFeatureVectors,
    buildValidationPointMetrics,
    calibrationPercentToScreenTarget,
    clampViewportClientCoords,
    createFaceLandmarker,
    DEFAULT_CALIBRATION_POINTS,
    DEFAULT_CAPTURE_INTERVAL_MS,
    DEFAULT_FRAMES_PER_POINT,
    DEFAULT_RIDGE_LAMBDA,
    extractGazeFeatures,
    LANDMARK_INDICES,
    type ValidationMetrics,
    type ValidationPointMetrics,
    RidgeRegression,
} from '../lib/eyeTracking';

export type EyeTrackingState =
    | 'idle'
    | 'calibrating'
    | 'collecting'
    | 'validating'
    | 'validating_collecting'
    | 'tracking';

const CALIBRATION_POINTS = DEFAULT_CALIBRATION_POINTS;
const VALIDATION_POINTS = DEFAULT_CALIBRATION_POINTS;
const FRAMES_PER_POINT = DEFAULT_FRAMES_PER_POINT;
const CAPTURE_INTERVAL = DEFAULT_CAPTURE_INTERVAL_MS;

export function useEyeTracking(videoRef: React.RefObject<HTMLVideoElement | null>) {
    const [state, setState] = useState<EyeTrackingState>('idle');
    const [gazePosition, setGazePosition] = useState<[number, number]>([0, 0]);
    const [currentDotIndex, setCurrentDotIndex] = useState(0);
    const [calibrationProgress, setCalibrationProgress] = useState(0);
    const [collectProgress, setCollectProgress] = useState(0);
    const [validationIndex, setValidationIndex] = useState(0);
    const [validationCollectProgress, setValidationCollectProgress] = useState(0);
    const [validationMetrics, setValidationMetrics] = useState<ValidationMetrics | null>(null);
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [isCalibrated, setIsCalibrated] = useState(false);
    const [previewUi, setPreviewUi] = useState<{
        hasFace: boolean;
        featuresReady: boolean;
        irisRx: number | null;
        irisRy: number | null;
        noseX: number | null;
        noseY: number | null;
    }>({
        hasFace: false,
        featuresReady: false,
        irisRx: null,
        irisRy: null,
        noseX: null,
        noseY: null,
    });

    const landmarkerRef = useRef<FaceLandmarker | null>(null);
    const regressionRef = useRef(new RidgeRegression());
    const rafRef = useRef<number>(0);
    const smoothGazeRef = useRef<[number, number]>([0, 0]);

    const landmarksPreviewRef = useRef<NormalizedLandmark[] | null>(null);
    const featuresReadyPreviewRef = useRef(false);
    const lastPreviewUiRef = useRef<{
        hasFace: boolean;
        featuresReady: boolean;
        irisRx: number | null;
        irisRy: number | null;
        noseX: number | null;
        noseY: number | null;
    }>({
        hasFace: false,
        featuresReady: false,
        irisRx: null,
        irisRy: null,
        noseX: null,
        noseY: null,
    });

    const currentDotIndexRef = useRef(0);
    const isCollectingRef = useRef(false);
    const collectBufferRef = useRef<number[][]>([]);
    const lastCaptureAtRef = useRef(0);
    /** MediaPipe requires strictly increasing timestamps (ms) per call; reuse risks dropped frames. */
    const lastDetectTimestampMsRef = useRef(0);

    /** Ridge target for the current calibration sample — set from the user's click when mode is `click`. */
    const calibrationTargetRef = useRef<[number, number]>([0, 0]);
    /** `click`: use {@link calibrationTargetRef}; `percent`: use grid position via {@link calibrationPercentToScreenTarget}. */
    const calibrationTargetModeRef = useRef<'click' | 'percent'>('percent');
    /** Ground truth for validation error — click position for the current validation dot. */
    const validationTargetRef = useRef<[number, number]>([0, 0]);

    const validationIndexRef = useRef(0);
    const validationBufferRef = useRef<number[]>([]);
    const validationResultsRef = useRef<ValidationPointMetrics[]>([]);
    const lastValidationCaptureAtRef = useRef(0);
    /** Stops the validation rAF loop from appending after `processValidationSample` until the next user click. */
    const validationCollectingActiveRef = useRef(false);

    const onCalibrationCompleteRef = useRef<(() => void) | null>(null);
    const onValidationCompleteRef = useRef<((metrics: ValidationMetrics) => void) | null>(null);

    useEffect(() => {
        currentDotIndexRef.current = currentDotIndex;
    }, [currentDotIndex]);

    useEffect(() => {
        validationIndexRef.current = validationIndex;
    }, [validationIndex]);

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

    const updatePreviewRefs = useCallback(
        (landmarks: NormalizedLandmark[] | null, features: number[] | null): void => {
            landmarksPreviewRef.current = landmarks;
            featuresReadyPreviewRef.current = features !== null;

            const hasFace = landmarks !== null && landmarks.length > 0;
            const featuresReady = features !== null;

            // Extract iris ratios from features vector: [lrx, lry, rrx, rry, avgRx, avgRy, ...]
            let irisRx: number | null = null;
            let irisRy: number | null = null;
            let noseX: number | null = null;
            let noseY: number | null = null;

            if (features) {
                irisRx = features[4]; // avgRx
                irisRy = features[5]; // avgRy
            }
            if (landmarks && landmarks.length > LANDMARK_INDICES.noseTip) {
                const nose = landmarks[LANDMARK_INDICES.noseTip];
                if (nose) {
                    noseX = nose.x;
                    noseY = nose.y;
                }
            }

            const prev = lastPreviewUiRef.current;
            if (
                prev.hasFace !== hasFace ||
                prev.featuresReady !== featuresReady ||
                prev.irisRx !== irisRx ||
                prev.irisRy !== irisRy
            ) {
                const next = { hasFace, featuresReady, irisRx, irisRy, noseX, noseY };
                lastPreviewUiRef.current = next;
                setPreviewUi(next);
            }
        },
        [],
    );

    const runDetection = useCallback((): {
        landmarks: NormalizedLandmark[] | null;
        features: number[] | null;
    } => {
        const video = videoRef.current;
        const landmarker = landmarkerRef.current;
        if (!video || !landmarker || video.readyState < 2) {
            return { landmarks: null, features: null };
        }

        const tsMs = Math.max(performance.now(), lastDetectTimestampMsRef.current + 0.001);
        lastDetectTimestampMsRef.current = tsMs;
        const result = landmarker.detectForVideo(video, tsMs);
        const landmarks = result.faceLandmarks?.[0] ?? null;
        const matrix = result.facialTransformationMatrixes?.[0];
        const features = landmarks
            ? extractGazeFeatures(landmarks as NormalizedLandmark[], matrix ?? null)
            : null;

        return { landmarks: landmarks as NormalizedLandmark[] | null, features };
    }, [videoRef]);

    const processCalibrationSample = useCallback((): void => {
        const raw = collectBufferRef.current;
        const collected = raw.slice();
        raw.length = 0;
        isCollectingRef.current = false;
        lastCaptureAtRef.current = 0;

        if (collected.length < FRAMES_PER_POINT) return;

        const avgFeatures = averageFeatureVectors(collected);
        const idx = currentDotIndexRef.current;
        const [pctX, pctY] = CALIBRATION_POINTS[idx];
        const [screenX, screenY] =
            calibrationTargetModeRef.current === 'click'
                ? calibrationTargetRef.current
                : calibrationPercentToScreenTarget(pctX, pctY);

        regressionRef.current.addSample(avgFeatures, [screenX, screenY]);

        const nextIndex = idx + 1;
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
    }, []);

    const processValidationSample = useCallback((): void => {
        validationCollectingActiveRef.current = false;
        const errors = validationBufferRef.current.slice();
        validationBufferRef.current = [];
        lastValidationCaptureAtRef.current = 0;
        setState('validating');

        if (errors.length < FRAMES_PER_POINT) return;

        const idx = validationIndexRef.current;
        const [pctX, pctY] = VALIDATION_POINTS[idx];
        const [tx, ty] = validationTargetRef.current;
        const pointMetrics = buildValidationPointMetrics([pctX, pctY], [tx, ty], errors);

        validationResultsRef.current.push(pointMetrics);

        const nextIndex = idx + 1;

        if (nextIndex >= VALIDATION_POINTS.length) {
            const summary = aggregateValidationMetrics(validationResultsRef.current);
            validationResultsRef.current = [];
            setValidationMetrics(summary);
            onValidationCompleteRef.current?.(summary);
            setState('idle');
        } else {
            setValidationIndex(nextIndex);
        }
    }, []);

    useEffect(() => {
        if (state !== 'calibrating' && state !== 'collecting') return;

        let cancelled = false;
        let rafId = 0;

        function tick(): void {
            if (cancelled) return;

            const { landmarks, features } = runDetection();
            updatePreviewRefs(landmarks, features);

            if (isCollectingRef.current) {
                const now = performance.now();
                if (features) {
                    const buf = collectBufferRef.current;
                    if (buf.length === 0 || now - lastCaptureAtRef.current >= CAPTURE_INTERVAL) {
                        lastCaptureAtRef.current = now;
                        buf.push(features);
                        setCollectProgress(buf.length);
                    }
                }

                if (collectBufferRef.current.length >= FRAMES_PER_POINT) {
                    processCalibrationSample();
                }
            }

            rafId = requestAnimationFrame(tick);
        }

        rafId = requestAnimationFrame(tick);

        return () => {
            cancelled = true;
            cancelAnimationFrame(rafId);
        };
    }, [state, runDetection, updatePreviewRefs, processCalibrationSample]);

    useEffect(() => {
        if (state !== 'validating' && state !== 'validating_collecting') return;

        let cancelled = false;
        let rafId = 0;

        function tick(): void {
            if (cancelled) return;

            const { landmarks, features } = runDetection();
            updatePreviewRefs(landmarks, features);

            if (validationCollectingActiveRef.current) {
                const now = performance.now();
                if (features && regressionRef.current.isReady()) {
                    const [px, py] = regressionRef.current.predict(features);
                    const [tx, ty] = validationTargetRef.current;
                    const err = Math.hypot(px - tx, py - ty);

                    const buf = validationBufferRef.current;
                    if (buf.length === 0 || now - lastValidationCaptureAtRef.current >= CAPTURE_INTERVAL) {
                        lastValidationCaptureAtRef.current = now;
                        buf.push(err);
                        setValidationCollectProgress(buf.length);
                    }
                }

                if (
                    validationCollectingActiveRef.current &&
                    validationBufferRef.current.length >= FRAMES_PER_POINT
                ) {
                    processValidationSample();
                }
            }

            rafId = requestAnimationFrame(tick);
        }

        rafId = requestAnimationFrame(tick);

        return () => {
            cancelled = true;
            cancelAnimationFrame(rafId);
        };
    }, [state, runDetection, updatePreviewRefs, processValidationSample]);

    /**
     * Starts collecting frames for the current dot. Pass the click position in viewport pixels — that is the gaze target.
     * @param screenTarget - [clientX, clientY] from the pointer event (where the user looked)
     * @param onAllComplete - Fires after the last calibration point is processed
     */
    const recordCalibrationPoint = useCallback(
        (screenTarget: [number, number], onAllComplete?: () => void) => {
            if (state !== 'calibrating') return;
            if (onAllComplete) onCalibrationCompleteRef.current = onAllComplete;
            calibrationTargetModeRef.current = 'click';
            calibrationTargetRef.current = clampViewportClientCoords(screenTarget[0], screenTarget[1]);

            isCollectingRef.current = true;
            collectBufferRef.current = [];
            lastCaptureAtRef.current = 0;
            setCollectProgress(0);
            setState('collecting');
        },
        [state],
    );

    /**
     * Begins post-calibration validation: same 9 targets as calibration; raw ridge error vs target in px.
     * @param onAllComplete - Called with aggregated metrics when all points are sampled
     */
    const startValidation = useCallback((onAllComplete?: (metrics: ValidationMetrics) => void) => {
        if (!regressionRef.current.isReady()) return;
        if (onAllComplete) onValidationCompleteRef.current = onAllComplete;
        validationResultsRef.current = [];
        validationBufferRef.current = [];
        validationCollectingActiveRef.current = false;
        setValidationMetrics(null);
        setValidationIndex(0);
        setValidationCollectProgress(0);
        setState('validating');
    }, []);

    /**
     * Starts sampling gaze error at the current validation dot; target is the click position (where the user looked).
     * @param screenTarget - [clientX, clientY] from the pointer event
     */
    const recordValidationPoint = useCallback((screenTarget: [number, number]) => {
        if (state !== 'validating') return;
        validationTargetRef.current = clampViewportClientCoords(screenTarget[0], screenTarget[1]);
        validationBufferRef.current = [];
        lastValidationCaptureAtRef.current = 0;
        validationCollectingActiveRef.current = true;
        setValidationCollectProgress(0);
        setState('validating_collecting');
    }, [state]);

    const startCalibration = useCallback(() => {
        calibrationTargetModeRef.current = 'percent';
        regressionRef.current = new RidgeRegression();
        setIsCalibrated(false);
        setValidationMetrics(null);
        setCurrentDotIndex(0);
        setCalibrationProgress(0);
        setCollectProgress(0);
        setValidationIndex(0);
        setValidationCollectProgress(0);
        setState('calibrating');
    }, []);

    const startTracking = useCallback(() => {
        if (!regressionRef.current.isReady()) return;
        setState('tracking');

        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        smoothGazeRef.current = [cx, cy];
        setGazePosition([cx, cy]);

        const loop = () => {
            const { landmarks, features } = runDetection();
            updatePreviewRefs(landmarks, features);

            if (features) {
                const [px, py] = regressionRef.current.predict(features);

                const clampedX = Math.max(0, Math.min(window.innerWidth, px));
                const clampedY = Math.max(0, Math.min(window.innerHeight, py));

                const alpha = 0.15;
                smoothGazeRef.current = [
                    smoothGazeRef.current[0] + alpha * (clampedX - smoothGazeRef.current[0]),
                    smoothGazeRef.current[1] + alpha * (clampedY - smoothGazeRef.current[1]),
                ];
            }

            setGazePosition([smoothGazeRef.current[0], smoothGazeRef.current[1]]);

            rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);
    }, [runDetection, updatePreviewRefs]);

    /**
     * Raw tracking mode — maps iris center positions directly to screen coordinates.
     * No calibration needed. Uses average of both iris centers (landmarks 468, 473).
     * Video is mirrored so X is inverted.
     */
    const startRawTracking = useCallback(() => {
        setState('tracking');

        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        smoothGazeRef.current = [cx, cy];
        setGazePosition([cx, cy]);

        const loop = () => {
            const { landmarks, features } = runDetection();
            updatePreviewRefs(landmarks, features);

            if (landmarks && landmarks.length > 473) {
                const leftIris = landmarks[LANDMARK_INDICES.leftIrisCenter];
                const rightIris = landmarks[LANDMARK_INDICES.rightIrisCenter];
                const leftEyeInner = landmarks[LANDMARK_INDICES.leftEyeInner];
                const leftEyeOuter = landmarks[LANDMARK_INDICES.leftEyeOuter];
                const leftEyeTop = landmarks[LANDMARK_INDICES.leftEyeTop];
                const leftEyeBottom = landmarks[LANDMARK_INDICES.leftEyeBottom];
                const rightEyeInner = landmarks[LANDMARK_INDICES.rightEyeInner];
                const rightEyeOuter = landmarks[LANDMARK_INDICES.rightEyeOuter];
                const rightEyeTop = landmarks[LANDMARK_INDICES.rightEyeTop];
                const rightEyeBottom = landmarks[LANDMARK_INDICES.rightEyeBottom];

                if (leftIris && rightIris && leftEyeInner && leftEyeOuter && rightEyeInner && rightEyeOuter) {
                    // Iris-in-eye ratios (0 = outer corner, 1 = inner corner)
                    const leftEyeW = leftEyeInner.x - leftEyeOuter.x;
                    const leftEyeH = leftEyeBottom.y - leftEyeTop.y;
                    const rightEyeW = rightEyeInner.x - rightEyeOuter.x;
                    const rightEyeH = rightEyeBottom.y - rightEyeTop.y;

                    if (Math.abs(leftEyeW) > 1e-5 && Math.abs(rightEyeW) > 1e-5 &&
                        Math.abs(leftEyeH) > 1e-5 && Math.abs(rightEyeH) > 1e-5) {
                        const lrx = (leftIris.x - leftEyeOuter.x) / leftEyeW;
                        const lry = (leftIris.y - leftEyeTop.y) / leftEyeH;
                        const rrx = (rightIris.x - rightEyeOuter.x) / rightEyeW;
                        const rry = (rightIris.y - rightEyeTop.y) / rightEyeH;

                        const avgRx = (lrx + rrx) / 2;
                        const avgRy = (lry + rry) / 2;

                        // Iris ratios typically range ~0.25–0.75; remap to full screen
                        // Invert X because video is mirrored (user looks left → iris ratio increases → dot goes left)
                        const normalizedX = 1 - (avgRx - 0.2) / 0.6;
                        const normalizedY = (avgRy - 0.15) / 0.7;

                        const rawX = normalizedX * window.innerWidth;
                        const rawY = normalizedY * window.innerHeight;

                        const clampedX = Math.max(0, Math.min(window.innerWidth, rawX));
                        const clampedY = Math.max(0, Math.min(window.innerHeight, rawY));

                        const alpha = 0.12;
                        smoothGazeRef.current = [
                            smoothGazeRef.current[0] + alpha * (clampedX - smoothGazeRef.current[0]),
                            smoothGazeRef.current[1] + alpha * (clampedY - smoothGazeRef.current[1]),
                        ];
                    }
                }
            }

            setGazePosition([smoothGazeRef.current[0], smoothGazeRef.current[1]]);
            rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);
    }, [runDetection, updatePreviewRefs]);

    const stopTracking = useCallback(() => {
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = 0;
        }
        isCollectingRef.current = false;
        setState('idle');
    }, []);

    useEffect(() => {
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
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
        validationIndex,
        currentValidationDotPosition: VALIDATION_POINTS[validationIndex] as [number, number] | undefined,
        validationCollectProgress,
        totalValidationPoints: VALIDATION_POINTS.length,
        validationMetrics,
        isModelLoaded,
        isCalibrated,
        startCalibration,
        recordCalibrationPoint,
        startValidation,
        recordValidationPoint,
        startTracking,
        startRawTracking,
        stopTracking,
        landmarksPreviewRef,
        featuresReadyPreviewRef,
        previewUi,
    };
}
