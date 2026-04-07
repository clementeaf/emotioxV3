import { useState, useRef, useCallback, useEffect } from 'react';
import { WebEyeTrack } from 'webeyetrack';
import type { GazeResult } from 'webeyetrack';

/**
 * Enhanced BlazeGaze gaze prediction with improved calibration.
 *
 * Key improvements over default WebEyeTrack usage:
 * 1. maxPoints raised to 100 (default 5) — affine correction needs many points
 * 2. clickTTL set to 86400 (24h) — calibration data never expires during session
 * 3. Multi-frame sampling per calibration point (averages out noise)
 * 4. Uses adapt() directly with ptType='calib' and 5 gradient steps (default 1)
 * 5. Continuous refinement: clicks during tracking feed back as calibration data
 * 6. Adaptive smoothing with deadzone for stable output
 */

const MAX_POINTS = 100;
const CLICK_TTL = 86400; // 24h — effectively never expires
const FRAMES_PER_CAL_POINT = 4;
const FRAME_INTERVAL_MS = 80; // ~12fps sampling during calibration
const ADAPT_STEPS = 5;
const ADAPT_LR = 1e-4; // 10x higher than default for faster convergence

export function useBlazeGaze(videoRef: React.RefObject<HTMLVideoElement | null>) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [gazePos, setGazePos] = useState<{ x: number; y: number } | null>(null);
    const [gazeState, setGazeState] = useState<'open' | 'closed'>('closed');
    const [calibrationCount, setCalibrationCount] = useState(0);

    const trackerRef = useRef<WebEyeTrack | null>(null);
    const rafRef = useRef(0);
    const canvasRef = useRef<OffscreenCanvas | null>(null);
    const runningRef = useRef(false);
    const lastPosRef = useRef<{ x: number; y: number } | null>(null);

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

    /**
     * Capture a single frame and return the raw gaze result.
     * Used internally for multi-frame calibration sampling.
     */
    const captureFrame = useCallback(async (): Promise<GazeResult | null> => {
        const video = videoRef.current;
        const tracker = trackerRef.current;
        if (!video || !tracker || !tracker.loaded || video.readyState < 2) return null;

        const w = video.videoWidth;
        const h = video.videoHeight;
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

    /**
     * Calibrate with a screen point using multi-frame sampling + dedicated adapt().
     * normX, normY: normalized screen coords centered at 0 (range ~[-0.5, 0.5])
     */
    const calibrate = useCallback(async (normX: number, normY: number): Promise<boolean> => {
        const tracker = trackerRef.current;
        if (!tracker) return false;

        const eyePatches: ImageData[] = [];
        const headVectors: number[][] = [];
        const faceOrigins: number[][] = [];
        const targets: number[][] = [];

        // Collect multiple frames for this calibration point
        for (let i = 0; i < FRAMES_PER_CAL_POINT; i++) {
            const result = await captureFrame();
            if (result && result.gazeState === 'open' && result.eyePatch) {
                eyePatches.push(result.eyePatch);
                headVectors.push(result.headVector);
                faceOrigins.push(result.faceOrigin3D);
                targets.push([normX, normY]);
            }
            // Wait between frames to get diverse samples
            if (i < FRAMES_PER_CAL_POINT - 1) {
                await new Promise(r => setTimeout(r, FRAME_INTERVAL_MS));
            }
        }

        if (eyePatches.length === 0) return false;

        // Call adapt directly with 'calib' type (never expires) and more gradient steps
        tracker.adapt(eyePatches, headVectors, faceOrigins, targets, ADAPT_STEPS, ADAPT_LR, 'calib');
        setCalibrationCount(prev => prev + 1);
        return true;
    }, [captureFrame]);

    /**
     * Quick calibrate from a click during tracking (continuous refinement).
     * Uses fewer frames and 'click' type so it eventually expires.
     */
    const refinementCalibrate = useCallback(async (screenX: number, screenY: number) => {
        const tracker = trackerRef.current;
        if (!tracker) return;

        const normX = (screenX / window.innerWidth) - 0.5;
        const normY = (screenY / window.innerHeight) - 0.5;

        const result = await captureFrame();
        if (result && result.gazeState === 'open' && result.eyePatch) {
            tracker.adapt(
                [result.eyePatch],
                [result.headVector],
                [result.faceOrigin3D],
                [[normX, normY]],
                2, // fewer steps for quick refinement
                ADAPT_LR,
                'click',
            );
        }
    }, [captureFrame]);

    // Tracking loop
    const start = useCallback(() => {
        if (runningRef.current) return;
        runningRef.current = true;

        const loop = async () => {
            if (!runningRef.current) return;

            const result = await captureFrame();
            if (result && result.gazeState === 'open' && result.normPog) {
                const screenX = (result.normPog[0] + 0.5) * window.innerWidth;
                const screenY = (result.normPog[1] + 0.5) * window.innerHeight;

                const prev = lastPosRef.current;
                if (prev) {
                    const dist = Math.hypot(screenX - prev.x, screenY - prev.y);

                    // Deadzone: ignore jitter under 4px
                    if (dist < 4) {
                        setGazeState('open');
                        if (runningRef.current) rafRef.current = requestAnimationFrame(loop);
                        return;
                    }

                    // Adaptive smoothing: heavy for small moves (noise), light for large (saccade)
                    const alpha = Math.min(0.45, 0.10 + (dist / 250) * 0.35);
                    const smoothed = {
                        x: prev.x + alpha * (screenX - prev.x),
                        y: prev.y + alpha * (screenY - prev.y),
                    };
                    lastPosRef.current = smoothed;
                    setGazePos(smoothed);
                } else {
                    lastPosRef.current = { x: screenX, y: screenY };
                    setGazePos({ x: screenX, y: screenY });
                }
                setGazeState('open');
            }

            if (runningRef.current) rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);
    }, [captureFrame]);

    const stop = useCallback(() => {
        runningRef.current = false;
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
    }, []);

    useEffect(() => {
        return () => { runningRef.current = false; if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, []);

    return {
        isLoaded,
        gazePos,
        gazeState,
        calibrationCount,
        start,
        stop,
        calibrate,
        refinementCalibrate,
    };
}
