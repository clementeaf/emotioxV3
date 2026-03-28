import { useState, useRef, useCallback, useEffect } from 'react';
import { WebEyeTrack } from 'webeyetrack';

/**
 * BlazeGaze gaze prediction — single pipeline, no duplicate MediaPipe.
 * Camera starts immediately; model loads in parallel.
 * The rAF loop runs from start() but only processes frames once the model is ready.
 */
export function useBlazeGaze(videoRef: React.RefObject<HTMLVideoElement | null>) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [gazePos, setGazePos] = useState<{ x: number; y: number } | null>(null);
    const [gazeState, setGazeState] = useState<'open' | 'closed'>('closed');

    const trackerRef = useRef<WebEyeTrack | null>(null);
    const rafRef = useRef(0);
    const canvasRef = useRef<OffscreenCanvas | null>(null);
    const runningRef = useRef(false);
    const lastPosRef = useRef<{ x: number; y: number } | null>(null);

    // Load model on mount (parallel with camera)
    useEffect(() => {
        let cancelled = false;

        async function init() {
            const tracker = new WebEyeTrack(20, 300);
            await tracker.initialize();
            if (cancelled) return;
            trackerRef.current = tracker;
            setIsLoaded(true);
        }

        void init();

        return () => {
            cancelled = true;
        };
    }, []);

    const start = useCallback(() => {
        if (runningRef.current) return;
        runningRef.current = true;

        const loop = async () => {
            if (!runningRef.current) return;

            const video = videoRef.current;
            const tracker = trackerRef.current;

            // Process frames only when both video and model are ready
            if (video && tracker && tracker.loaded && video.readyState >= 2) {
                const w = video.videoWidth;
                const h = video.videoHeight;

                if (!canvasRef.current || canvasRef.current.width !== w || canvasRef.current.height !== h) {
                    canvasRef.current = new OffscreenCanvas(w, h);
                }
                const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
                if (ctx) {
                    ctx.drawImage(video, 0, 0, w, h);
                    const imageData = ctx.getImageData(0, 0, w, h);

                    try {
                        const result = await tracker.step(imageData, performance.now());

                        // Only update gaze when eyes are open — ignore 'closed' frames
                        // to avoid jumping to center (WebEyeTrack returns [0,0] on blink)
                        if (result.gazeState === 'open' && result.normPog) {
                            const screenX = (result.normPog[0] + 0.5) * window.innerWidth;
                            const screenY = (result.normPog[1] + 0.5) * window.innerHeight;

                            // Adaptive smoothing: small movements get heavy smoothing (noise),
                            // large movements get lighter smoothing (intentional gaze shift)
                            const prev = lastPosRef.current;
                            if (prev) {
                                const dist = Math.hypot(screenX - prev.x, screenY - prev.y);

                                // Deadzone: ignore jitter under 4px
                                if (dist < 4) {
                                    setGazeState('open');
                                    if (runningRef.current) rafRef.current = requestAnimationFrame(loop);
                                    return;
                                }

                                // alpha: 0.12 for small moves → 0.4 for large moves (more reactive)
                                const alpha = Math.min(0.4, 0.12 + (dist / 300) * 0.28);
                                const sx = prev.x + alpha * (screenX - prev.x);
                                const sy = prev.y + alpha * (screenY - prev.y);
                                const smoothed = { x: sx, y: sy };
                                lastPosRef.current = smoothed;
                                setGazePos(smoothed);
                            } else {
                                lastPosRef.current = { x: screenX, y: screenY };
                                setGazePos({ x: screenX, y: screenY });
                            }
                            setGazeState('open');
                        }
                        // On 'closed', keep last position — don't update
                    } catch {
                        // skip frame
                    }
                }
            }

            if (runningRef.current) {
                rafRef.current = requestAnimationFrame(loop);
            }
        };

        rafRef.current = requestAnimationFrame(loop);
    }, [videoRef]);

    const stop = useCallback(() => {
        runningRef.current = false;
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = 0;
        }
    }, []);

    /**
     * Feed a calibration point. Bypasses handleClick debounce by setting
     * latestMouseClick timestamp to 0 before calling.
     */
    const calibrate = useCallback((normX: number, normY: number) => {
        const tracker = trackerRef.current;
        if (!tracker) return;
        // Reset debounce so every click registers
        tracker.latestMouseClick = null;
        tracker.handleClick(normX, normY);
    }, []);

    useEffect(() => {
        return () => {
            runningRef.current = false;
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    return { isLoaded, gazePos, gazeState, start, stop, calibrate };
}
