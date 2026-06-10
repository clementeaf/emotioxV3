import { useCallback, useEffect, useRef, useState } from 'react';
import type { AiAnalysisResult } from '../../types/aiAnalysis.types';

type GazeFixation = AiAnalysisResult['gazePath'][number];

interface GazeScanpathPlayerProps {
    imageUrl: string;
    gazePath: GazeFixation[];
    className?: string;
    duration?: number;
    routeColor?: string;
    /** When true, canvas is transparent — no background image or dim overlay drawn. */
    transparent?: boolean;
}

const DURATION_RADIUS: Record<string, number> = {
    brief: 0.018,
    moderate: 0.024,
    long: 0.03,
};

/**
 * Returns a high-contrast color for fixation markers.
 * @param index - Fixation index in path
 * @param total - Total fixations
 * @param routeColor - Optional fixed route color
 * @returns CSS color string
 */
const getMarkerColor = (index: number, total: number, routeColor?: string): string => {
    if (routeColor) return routeColor;
    const t = total <= 1 ? 0 : index / (total - 1);
    const r = Math.round(t < 0.5 ? 0 : (t - 0.5) * 2 * 255);
    const g = Math.round(t < 0.5 ? t * 2 * 255 : (1 - t) * 2 * 255);
    const b = Math.round(t < 0.5 ? (1 - t * 2) * 255 : 0);
    return `rgb(${r},${g},${b})`;
};

/**
 * Converts percentage fixation coordinates to canvas pixels.
 * @param point - Fixation with x/y in percent
 * @param width - Canvas width
 * @param height - Canvas height
 * @returns Pixel coordinates
 */
const toPixelCoords = (
    point: GazeFixation,
    width: number,
    height: number,
): { px: number; py: number } => ({
    px: (point.x / 100) * width,
    py: (point.y / 100) * height,
});

/**
 * Animated scanpath player that reveals LLM-predicted fixations in chronological order.
 * @param props - Image URL, gaze path, duration, and optional route color
 * @returns Canvas player with playback controls
 */
export const GazeScanpathPlayer = ({
    imageUrl,
    gazePath,
    className = '',
    duration = 5,
    routeColor,
    transparent = false,
}: GazeScanpathPlayerProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animRef = useRef<number>(0);
    const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
    const [imageLoaded, setImageLoaded] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const bgImageRef = useRef<HTMLImageElement | null>(null);

    const sortedPath = useRef<GazeFixation[]>([]);
    useEffect(() => {
        sortedPath.current = [...gazePath].sort((a, b) => a.order - b.order);
    }, [gazePath]);

    useEffect(() => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = imageUrl;
        img.onload = () => {
            setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
            bgImageRef.current = img;
            setImageLoaded(true);
        };
        return () => {
            img.onload = null;
            img.src = '';
            bgImageRef.current = null;
        };
    }, [imageUrl]);

    const renderFrame = useCallback((t: number) => {
        const canvas = canvasRef.current;
        const img = bgImageRef.current;
        if (!canvas || !img) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = naturalSize.width;
        const h = naturalSize.height;
        canvas.width = w;
        canvas.height = h;

        ctx.clearRect(0, 0, w, h);
        if (!transparent) {
            ctx.drawImage(img, 0, 0);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
            ctx.fillRect(0, 0, w, h);
        }

        const path = sortedPath.current;
        if (path.length === 0) return;

        const visibleCount = Math.max(1, Math.ceil(t * path.length));
        const minDim = Math.min(w, h);

        for (let i = 1; i < visibleCount; i++) {
            const prev = toPixelCoords(path[i - 1], w, h);
            const curr = toPixelCoords(path[i], w, h);
            ctx.beginPath();
            ctx.moveTo(prev.px, prev.py);
            ctx.lineTo(curr.px, curr.py);
            ctx.strokeStyle = routeColor ? `${routeColor}cc` : 'rgba(255, 255, 255, 0.75)';
            ctx.lineWidth = Math.max(2, minDim * 0.003);
            ctx.setLineDash([minDim * 0.012, minDim * 0.008]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        for (let i = 0; i < visibleCount; i++) {
            const point = path[i];
            const { px, py } = toPixelCoords(point, w, h);
            const color = getMarkerColor(i, path.length, routeColor);
            const radiusFrac = DURATION_RADIUS[point.duration] ?? DURATION_RADIUS.moderate;
            const radius = Math.max(10, minDim * radiusFrac);
            const isLatest = i === visibleCount - 1;

            ctx.beginPath();
            ctx.arc(px, py, radius + 4, 0, Math.PI * 2);
            ctx.strokeStyle = isLatest ? 'rgba(255, 255, 255, 0.95)' : `${color}66`;
            ctx.lineWidth = isLatest ? 3 : 2;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(px, py, radius, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.globalAlpha = isLatest ? 1 : 0.9;
            ctx.fill();
            ctx.globalAlpha = 1;

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.lineWidth = 2;
            ctx.stroke();

            const fontSize = Math.max(12, radius * 0.9);
            ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.lineWidth = 3;
            ctx.strokeText(String(point.order), px, py);
            ctx.fillText(String(point.order), px, py);
        }
    }, [naturalSize, routeColor, transparent]);

    useEffect(() => {
        if (imageLoaded && !playing) {
            renderFrame(progress);
        }
    }, [imageLoaded, progress, playing, renderFrame]);

    const play = useCallback(() => {
        setPlaying(true);
        const startTime = performance.now();
        const durationMs = duration * 1000;
        const startProgress = progress;

        const animate = (now: number): void => {
            const elapsed = now - startTime;
            const nextT = Math.min(1, startProgress + (elapsed / durationMs) * (1 - startProgress));
            setProgress(nextT);
            renderFrame(nextT);

            if (nextT < 1) {
                animRef.current = requestAnimationFrame(animate);
            } else {
                setPlaying(false);
            }
        };

        animRef.current = requestAnimationFrame(animate);
    }, [duration, progress, renderFrame]);

    const pause = useCallback(() => {
        cancelAnimationFrame(animRef.current);
        setPlaying(false);
    }, []);

    const reset = useCallback(() => {
        cancelAnimationFrame(animRef.current);
        setPlaying(false);
        setProgress(0);
        renderFrame(0);
    }, [renderFrame]);

    useEffect(() => () => cancelAnimationFrame(animRef.current), []);

    if (!imageUrl) {
        return (
            <div className="flex h-64 items-center justify-center bg-gray-200">
                No Image URL
            </div>
        );
    }

    const progressPercent = Math.round(progress * 100);
    const currentTime = (progress * duration).toFixed(1);

    return (
        <div className={transparent
            ? `pointer-events-none ${className}`
            : `overflow-hidden rounded-lg border shadow-sm ${className}`
        }>
            <canvas
                ref={canvasRef}
                className={transparent
                    ? 'block w-full h-full pointer-events-none'
                    : 'block max-h-[560px] w-full'
                }
                style={transparent ? undefined : { maxHeight: '560px' }}
            />

            <div className={transparent
                ? 'absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/70 backdrop-blur-sm px-3 py-2 rounded-full z-10 pointer-events-auto'
                : 'flex items-center gap-3 border-t bg-gray-50 px-4 py-3'
            }>
                <button
                    type="button"
                    onClick={playing ? pause : play}
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700"
                >
                    {playing ? (
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                            <rect x="6" y="4" width="4" height="16" />
                            <rect x="14" y="4" width="4" height="16" />
                        </svg>
                    ) : (
                        <svg className="ml-0.5 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    )}
                </button>

                <button
                    type="button"
                    onClick={reset}
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-600 transition-colors hover:bg-gray-300"
                    title="Reset"
                >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>

                <input
                    type="range"
                    min={0}
                    max={100}
                    value={progressPercent}
                    onChange={(e) => {
                        const nextT = Number(e.target.value) / 100;
                        setProgress(nextT);
                        if (!playing) renderFrame(nextT);
                    }}
                    className="flex-1 accent-blue-600"
                />

                <span className={transparent
                    ? 'w-16 flex-shrink-0 text-right font-mono text-xs text-gray-300'
                    : 'w-16 flex-shrink-0 text-right font-mono text-xs text-gray-500'
                }>
                    {currentTime}s / {duration}s
                </span>
            </div>

            {!imageLoaded && !transparent && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <span className="text-gray-400">Loading image...</span>
                </div>
            )}
        </div>
    );
};
