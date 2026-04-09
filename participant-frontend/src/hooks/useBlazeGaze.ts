import { useState, useRef, useCallback, useEffect } from 'react';
import { WebEyeTrack } from 'webeyetrack';
import type { GazeResult } from 'webeyetrack';

/**
 * BlazeGaze gaze prediction hook.
 * - maxPoints 100, clickTTL 24h (calibration persists during session)
 * - handleClick + immediate step() for proper eye-feature association
 * - Light smoothing (alpha 0.5) — optimized for zone-level detection
 */

const MAX_POINTS = 100;
const CLICK_TTL = 86400;
const X_OFFSET = 0.03; // compensate consistent left bias

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

    /** Capture a single frame and return raw gaze result. */
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

    /** Instant calibrate — stores click for lazy adaptation in tracking loop. */
    const calibrate = useCallback((normX: number, normY: number): void => {
        const tracker = trackerRef.current;
        if (!tracker) return;
        tracker.latestMouseClick = null;
        tracker.handleClick(normX, normY);
        setCalibrationCount(prev => prev + 1);
    }, []);

    // Tracking loop
    const start = useCallback(() => {
        if (runningRef.current) return;
        runningRef.current = true;

        const loop = async () => {
            if (!runningRef.current) return;

            const result = await captureFrame();
            if (result && result.gazeState === 'open' && result.normPog) {
                const screenX = (result.normPog[0] + X_OFFSET + 0.5) * window.innerWidth;
                const screenY = (result.normPog[1] + 0.5) * window.innerHeight;

                const prev = lastPosRef.current;
                if (prev) {
                    const alpha = 0.5;
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
    };
}
