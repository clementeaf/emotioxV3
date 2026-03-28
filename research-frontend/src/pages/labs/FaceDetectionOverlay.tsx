import { useRef, useEffect, type ReactElement } from 'react';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { drawFaceOverlay } from '../../lib/eyeTracking/drawFaceOverlay';

interface FaceDetectionOverlayProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    landmarksRef: React.MutableRefObject<NormalizedLandmark[] | null>;
    featuresReadyRef: React.MutableRefObject<boolean>;
    mirrored: boolean;
}

/**
 * Canvas synced to video; reads landmark refs each frame (no React state at 60fps).
 */
export function FaceDetectionOverlay({
    videoRef,
    landmarksRef,
    featuresReadyRef,
    mirrored,
}: FaceDetectionOverlayProps): ReactElement {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;

        const resize = (): void => {
            const video = videoRef.current;
            if (!video || !canvas) return;
            const w = video.clientWidth;
            const h = video.clientHeight;
            if (w < 2 || h < 2) return;
            const dpr = window.devicePixelRatio ?? 1;
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        const ro = new ResizeObserver(resize);
        ro.observe(container);
        resize();

        let rafId = 0;
        function tick(): void {
            const video = videoRef.current;
            const c = canvasRef.current;
            const ctx = c?.getContext('2d');
            if (video && ctx && c) {
                const w = video.clientWidth;
                const h = video.clientHeight;
                const lm = landmarksRef.current;
                const fr = featuresReadyRef.current;
                if (lm && lm.length > 0 && w >= 2 && h >= 2) {
                    drawFaceOverlay(ctx, lm, w, h, mirrored, fr, video);
                } else if (w >= 2 && h >= 2) {
                    ctx.clearRect(0, 0, w, h);
                }
            }
            rafId = requestAnimationFrame(tick);
        }
        rafId = requestAnimationFrame(tick);

        return () => {
            ro.disconnect();
            cancelAnimationFrame(rafId);
        };
    }, [videoRef, landmarksRef, featuresReadyRef, mirrored]);

    return (
        <div ref={containerRef} className="pointer-events-none absolute inset-0">
            <canvas ref={canvasRef} className="absolute left-0 top-0 h-full w-full" aria-hidden />
        </div>
    );
}
