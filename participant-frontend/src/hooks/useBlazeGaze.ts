import { useState, useRef, useCallback, useEffect } from 'react';
import type { RefObject } from 'react';
interface GazeResult {
    gazeState: 'open' | 'closed';
    normPog?: number[];
}

type WebEyeTrackInstance = {
    loaded: boolean;
    latestMouseClick: unknown;
    initialize(): Promise<void>;
    step(imageData: ImageData, timestamp: number): Promise<GazeResult>;
    handleClick(normX: number, normY: number): void;
};
import { OneEuroFilter1D } from '../lib/eyeTracking';

/**
 * BlazeGaze gaze prediction hook (WebEyeTrack CNN on full video frames).
 *
 * Hardware sets a rough ceiling: small eye region in the image means limited angular detail per frame.
 * The model raises quality within that envelope; One-Euro filter and calibration improve stability and mapping.
 *
 * - One `tracker.step(imageData)` per rAF tick while running (~display refresh rate).
 * - maxPoints 100, clickTTL 24h (calibration points persist for the session).
 * - calibrate() wires handleClick for lazy adaptation in the tracking loop.
 * - gazePos: One-Euro filtered screen coords (adaptive: smooth during fixation, responsive during saccade).
 * - rawGazePos: same mapping without filtering (snappier live UI).
 */

const MAX_POINTS = 100;
const CLICK_TTL = 86400;

/** Horizontal bias — IDW calibration field handles per-user correction. */
const X_OFFSET = 0;

/** Vertical scale — 1.0 = no pre-scaling. Zone classification uses Voronoi on
 *  raw gaze space (nearest calibration centroid), bypassing coordinate transforms. */
const Y_NORM_SCALE = 1.0;

// --- One-Euro Filter defaults (Casiez et al. 2012) tuned for webcam gaze ---
// Kalman handles primary smoothing; One-Euro adds adaptive layer on top.
/** Low minCutoff = smooth during fixation (Hz).
 *  0.6 Hz balances jitter reduction with responsiveness — avoids directional lag. */
const DEFAULT_ONE_EURO_MIN_CUTOFF = 0.6;
/** Beta controls lag reduction during saccades; higher = snappier transitions.
 *  0.007 tracks saccades without over-smoothing into directional bias. */
const DEFAULT_ONE_EURO_BETA = 0.007;
/** Derivative cutoff — smooths velocity estimate. */
const DEFAULT_ONE_EURO_D_CUTOFF = 1.0;

/** Optional tuning for calmer gaze output (e.g. hybrid lab page). */
export interface UseBlazeGazeOptions {
    /**
     * One-Euro minCutoff (Hz): lower = smoother at rest. Default 1.5.
     * For calmer output (e.g. hybrid lab), use ~0.8.
     */
    oneEuroMinCutoff?: number;
    /** One-Euro beta: higher = less lag during fast eye movement. Default 0.007. */
    oneEuroBeta?: number;
    /** @deprecated Use oneEuroMinCutoff/oneEuroBeta instead. Ignored when One-Euro params are set. */
    smoothAlpha?: number;
}

/** Counters for tracking loop quality (Eyedid-style: drops vs valid gaze). Reset on each start(). */
export interface BlazeGazeFrameStats {
    /** captureFrame returned null or threw */
    invalidFrames: number;
    /** Frame arrived but eyes closed or missing normPog */
    noValidGazeFrames: number;
    /** Open eyes with valid POG */
    validGazeFrames: number;
    /**
     * Last video frame width/height (px) passed to the model as ImageData — debug signal for capture quality.
     * null until a frame with positive videoWidth/videoHeight is read.
     */
    captureWidthPx: number | null;
    captureHeightPx: number | null;
}

export function useBlazeGaze(
    videoRef: RefObject<HTMLVideoElement | null>,
    options?: UseBlazeGazeOptions,
) {
    const [isLoaded, setIsLoaded] = useState(false);
    /** Smoothed screen position (saved samples / stable analytics). */
    const [gazePos, setGazePos] = useState<{ x: number; y: number } | null>(null);
    /** Ref mirror of gazePos — updated every frame without triggering re-render. */
    const gazePosRef = useRef<{ x: number; y: number } | null>(null);
    /** Same frame mapping as gazePos but without EMA — use for live AOI highlight. */
    const [rawGazePos, setRawGazePos] = useState<{ x: number; y: number } | null>(null);
    /** Raw normPog from CNN — no mapping, no filter. For diagnostics only. */
    const normPogRef = useRef<{ x: number; y: number } | null>(null);
    /** Unfiltered screen coords (before One-Euro). For diagnostics. */
    const rawScreenRef = useRef<{ x: number; y: number } | null>(null);
    const [gazeState, setGazeState] = useState<'open' | 'closed'>('closed');
    const [calibrationCount, setCalibrationCount] = useState(0);
    /** Throttle setState calls to max ~4fps to avoid re-render storm during calibration. */
    const lastStateUpdateRef = useRef(0);
    const GAZE_STATE_THROTTLE_MS = 250;

    const trackerRef = useRef<WebEyeTrackInstance | null>(null);
    const rafRef = useRef(0);
    const canvasRef = useRef<OffscreenCanvas | null>(null);
    const runningRef = useRef(false);
    const filterXRef = useRef<OneEuroFilter1D | null>(null);
    const filterYRef = useRef<OneEuroFilter1D | null>(null);
    const frameStatsRef = useRef<Pick<BlazeGazeFrameStats, 'invalidFrames' | 'noValidGazeFrames' | 'validGazeFrames'>>({
        invalidFrames: 0,
        noValidGazeFrames: 0,
        validGazeFrames: 0,
    });
    /** Last dimensions of the bitmap fed to tracker.step (from HTMLVideoElement). */
    const lastCaptureDimensionsRef = useRef<{ w: number; h: number } | null>(null);
    const lastEmittedGazeStateRef = useRef<'open' | 'closed'>('closed');

    // Rebuild One-Euro filters when params change
    const oneEuroMinCutoff = options?.oneEuroMinCutoff ?? DEFAULT_ONE_EURO_MIN_CUTOFF;
    const oneEuroBeta = options?.oneEuroBeta ?? DEFAULT_ONE_EURO_BETA;
    useEffect(() => {
        filterXRef.current = new OneEuroFilter1D(oneEuroMinCutoff, oneEuroBeta, DEFAULT_ONE_EURO_D_CUTOFF);
        filterYRef.current = new OneEuroFilter1D(oneEuroMinCutoff, oneEuroBeta, DEFAULT_ONE_EURO_D_CUTOFF);
    }, [oneEuroMinCutoff, oneEuroBeta]);

    // Initialize model
    useEffect(() => {
        let cancelled = false;
        async function init() {
            const { WebEyeTrack } = await import('webeyetrack');
            const tracker = new WebEyeTrack(MAX_POINTS, CLICK_TTL) as unknown as WebEyeTrackInstance;
            await tracker.initialize();
            if (cancelled) return;
            trackerRef.current = tracker;
            setIsLoaded(true);
        }
        void init();
        return () => { cancelled = true; };
    }, []);

    /** Capture a single frame and return raw gaze result. */
    const captureFrame = useCallback(async (): Promise<GazeResult | null> => {
        const video = videoRef.current;
        const tracker = trackerRef.current;
        if (!video || !tracker || !tracker.loaded || video.readyState < 2) return null;

        const w = video.videoWidth;
        const h = video.videoHeight;
        if (w > 0 && h > 0) {
            lastCaptureDimensionsRef.current = { w, h };
        }
        if (!canvasRef.current || canvasRef.current.width !== w || canvasRef.current.height !== h) {
            canvasRef.current = new OffscreenCanvas(w, h);
        }
        const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
        if (!ctx) return null;

        ctx.drawImage(video, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);

        try {
            return await tracker.step(imageData, performance.now());
        } catch {
            return null;
        }
    }, [videoRef]);

    /** Calibrate — calls adapt() explicitly with 'calib' ptType for stronger correction. */
    const calibrate = useCallback((normX: number, normY: number): void => {
        const tracker = trackerRef.current;
        if (!tracker) return;
        // Use handleClick which internally calls adapt() with the latest gaze result.
        // Clear latestMouseClick to bypass debounce.
        tracker.latestMouseClick = null;
        tracker.handleClick(normX, normY);
        setCalibrationCount(prev => prev + 1);
    }, []);

    const getFrameStats = useCallback((): BlazeGazeFrameStats => {
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

        const loop = async () => {
            if (!runningRef.current) return;

            const result = await captureFrame();
            if (!result) {
                frameStatsRef.current.invalidFrames += 1;
                if (lastEmittedGazeStateRef.current !== 'closed') {
                    lastEmittedGazeStateRef.current = 'closed';
                    setGazeState('closed');
                }
            } else if (result.gazeState !== 'open' || !result.normPog) {
                frameStatsRef.current.noValidGazeFrames += 1;
                if (lastEmittedGazeStateRef.current !== 'closed') {
                    lastEmittedGazeStateRef.current = 'closed';
                    setGazeState('closed');
                }
            } else {
                frameStatsRef.current.validGazeFrames += 1;
                const vw = window.innerWidth;
                const vh = window.innerHeight;
                const nx = result.normPog[0];
                const nyScaled = result.normPog[1] * Y_NORM_SCALE;
                const screenX = (nx + X_OFFSET + 0.5) * vw;
                const screenY = (nyScaled + 0.5) * vh;

                const sx = Math.max(0, Math.min(vw, screenX));
                const sy = Math.max(0, Math.min(vh, screenY));

                // Diagnostic refs — raw values before any filtering
                normPogRef.current = { x: nx, y: result.normPog[1] };
                rawScreenRef.current = { x: sx, y: sy };

                // Reset One-Euro filter on blink-to-open transition
                // so first post-blink frame isn't pulled toward the drifted pre-blink position
                const wasBlinking = lastEmittedGazeStateRef.current !== 'open';
                if (wasBlinking) {
                    filterXRef.current?.reset();
                    filterYRef.current?.reset();
                }

                // One-Euro adaptive filter: smooth during fixation, responsive during saccade
                const tSec = performance.now() / 1000;
                const fx = filterXRef.current;
                const fy = filterYRef.current;
                const smoothed = (fx && fy)
                    ? { x: Math.max(0, Math.min(vw, fx.filter(sx, tSec))), y: Math.max(0, Math.min(vh, fy.filter(sy, tSec))) }
                    : { x: sx, y: sy };

                // Always update ref (no re-render, used by calibration & gaze collection)
                gazePosRef.current = smoothed;

                // Throttle setState to avoid re-render storm (~4fps instead of ~30fps)
                const now = performance.now();
                if (now - lastStateUpdateRef.current >= GAZE_STATE_THROTTLE_MS) {
                    lastStateUpdateRef.current = now;
                    setRawGazePos({ x: sx, y: sy });
                    setGazePos(smoothed);
                }
                if (lastEmittedGazeStateRef.current !== 'open') {
                    lastEmittedGazeStateRef.current = 'open';
                    setGazeState('open');
                }
            }

            if (runningRef.current) rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);
    }, [captureFrame]);

    const stop = useCallback(() => {
        runningRef.current = false;
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
        setRawGazePos(null);
        filterXRef.current?.reset();
        filterYRef.current?.reset();
    }, []);

    useEffect(() => {
        return () => { runningRef.current = false; if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, []);

    return {
        isLoaded,
        gazePos,
        /** Ref updated every frame without re-render. Use for real-time gaze reads. */
        gazePosRef,
        /** Raw normPog from CNN (no mapping, no filter). Diagnostic only. */
        normPogRef,
        /** Screen coords before One-Euro filter. Diagnostic only. */
        rawScreenRef,
        rawGazePos,
        gazeState,
        calibrationCount,
        start,
        stop,
        calibrate,
        getFrameStats,
        resetFrameStats,
    };
}
