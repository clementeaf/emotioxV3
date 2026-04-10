import { useState, useRef, useCallback, useEffect } from 'react';
import type { RefObject } from 'react';
import { WebEyeTrack } from 'webeyetrack';
import type { GazeResult } from 'webeyetrack';
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

/** Mild horizontal bias correction in normalized space (positive = shift right on screen). */
const X_OFFSET = 0.03;

/**
 * Vertical normalized coord scale — webcam gaze often undershoots top/bottom; slight stretch helps
 * corner rows without changing horizontal mapping.
 */
const Y_NORM_SCALE = 1.1;

// --- One-Euro Filter defaults (Casiez et al. 2012) tuned for webcam gaze ---
/** Low minCutoff = very smooth during fixation (Hz). */
const DEFAULT_ONE_EURO_MIN_CUTOFF = 1.5;
/** Beta controls lag reduction during saccades; higher = snappier transitions. */
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
    /** Same frame mapping as gazePos but without EMA — use for live AOI highlight. */
    const [rawGazePos, setRawGazePos] = useState<{ x: number; y: number } | null>(null);
    const [gazeState, setGazeState] = useState<'open' | 'closed'>('closed');
    const [calibrationCount, setCalibrationCount] = useState(0);

    const trackerRef = useRef<WebEyeTrack | null>(null);
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
            const tracker = new WebEyeTrack(MAX_POINTS, CLICK_TTL);
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

    /** Instant calibrate — stores click for lazy adaptation in tracking loop. */
    const calibrate = useCallback((normX: number, normY: number): void => {
        const tracker = trackerRef.current;
        if (!tracker) return;
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

                setRawGazePos({ x: sx, y: sy });

                // One-Euro adaptive filter: smooth during fixation, responsive during saccade
                const tSec = performance.now() / 1000;
                const fx = filterXRef.current;
                const fy = filterYRef.current;
                if (fx && fy) {
                    const smoothed = {
                        x: Math.max(0, Math.min(vw, fx.filter(sx, tSec))),
                        y: Math.max(0, Math.min(vh, fy.filter(sy, tSec))),
                    };
                    setGazePos(smoothed);
                } else {
                    setGazePos({ x: sx, y: sy });
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
