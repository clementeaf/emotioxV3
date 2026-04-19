import { useEffect, useRef, useState, useCallback } from 'react';

interface HeatmapPoint {
    x: number;
    y: number;
    value?: number;
}

interface AttentionVideoPlayerProps {
    imageUrl: string;
    data: HeatmapPoint[];
    className?: string;
    /** Duration in seconds (default 5) */
    duration?: number;
}

/**
 * Builds a 256-entry color LUT (same gradient as HeatmapRenderer).
 */
const buildColorLUT = (): Array<[number, number, number]> => {
    const stops = [
        { pos: 0.00, r: 0, g: 0, b: 0 },
        { pos: 0.15, r: 0, g: 255, b: 0 },
        { pos: 0.35, r: 136, g: 255, b: 0 },
        { pos: 0.50, r: 255, g: 255, b: 0 },
        { pos: 0.70, r: 255, g: 136, b: 0 },
        { pos: 0.85, r: 255, g: 0, b: 0 },
        { pos: 1.00, r: 255, g: 255, b: 255 },
    ];

    const lut: Array<[number, number, number]> = [];
    for (let i = 0; i < 256; i++) {
        const t = i / 255;
        let lo = stops[0], hi = stops[stops.length - 1];
        for (let s = 0; s < stops.length - 1; s++) {
            if (t >= stops[s].pos && t <= stops[s + 1].pos) {
                lo = stops[s];
                hi = stops[s + 1];
                break;
            }
        }
        const range = hi.pos - lo.pos;
        const f = range > 0 ? (t - lo.pos) / range : 0;
        lut.push([
            Math.round(lo.r + (hi.r - lo.r) * f),
            Math.round(lo.g + (hi.g - lo.g) * f),
            Math.round(lo.b + (hi.b - lo.b) * f),
        ]);
    }
    return lut;
};

const COLOR_LUT = buildColorLUT();

/**
 * Progressive attention reveal animation.
 * Points are sorted by saliency (highest first = first fixation).
 * Each frame reveals more of the heatmap, simulating a scanpath.
 */
export const AttentionVideoPlayer = ({
    imageUrl,
    data,
    className = '',
    duration = 5,
}: AttentionVideoPlayerProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animRef = useRef<number>(0);
    const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
    const [imageLoaded, setImageLoaded] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const bgImageRef = useRef<HTMLImageElement | null>(null);
    // Reusable offscreen canvas + pixel buffer — avoids allocating per frame
    const offscreenRef = useRef<HTMLCanvasElement | null>(null);
    const pixelBufRef = useRef<ImageData | null>(null);

    // Sort data by value descending (highest saliency = first fixation)
    const sortedData = useRef<HeatmapPoint[]>([]);
    useEffect(() => {
        sortedData.current = [...data]
            .filter(p => (p.value ?? 0) > 0.25)
            .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    }, [data]);

    // Load image (cleanup previous on URL change)
    useEffect(() => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = imageUrl;
        img.onload = () => {
            setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
            bgImageRef.current = img;
            setImageLoaded(true);
        };
        return () => { img.onload = null; img.src = ''; bgImageRef.current = null; };
    }, [imageUrl]);

    // Render a single frame at given progress (0-1)
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

        // 1. Draw background
        ctx.drawImage(img, 0, 0);

        // 2. Dark overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, w, h);

        // 3. Draw heatmap up to current progress
        const points = sortedData.current;
        const visibleCount = Math.floor(t * points.length);
        if (visibleCount === 0) return;

        // Reuse offscreen canvas and pixel buffer across frames
        if (!offscreenRef.current || offscreenRef.current.width !== w || offscreenRef.current.height !== h) {
            offscreenRef.current = document.createElement('canvas');
            offscreenRef.current.width = w;
            offscreenRef.current.height = h;
            pixelBufRef.current = null;
        }
        const offCtx = offscreenRef.current.getContext('2d');
        if (!offCtx) return;

        if (!pixelBufRef.current || pixelBufRef.current.width !== w || pixelBufRef.current.height !== h) {
            pixelBufRef.current = offCtx.createImageData(w, h);
        }
        const imageData = pixelBufRef.current;
        // Clear pixel buffer for this frame
        imageData.data.fill(0);
        const pixels = imageData.data;

        const cellW = Math.ceil(w / 128);
        const cellH = Math.ceil(h / 96);

        for (let i = 0; i < visibleCount; i++) {
            const point = points[i];
            const val = point.value ?? 0;

            let px: number, py: number;
            if (point.x > 1 && point.y > 1) {
                px = (point.x / 100) * w;
                py = (point.y / 100) * h;
            } else if (point.x <= 1 && point.y <= 1) {
                px = point.x * w;
                py = point.y * h;
            } else {
                px = point.x;
                py = point.y;
            }

            const lutIdx = Math.min(255, Math.round(val * 255));
            const [r, g, b] = COLOR_LUT[lutIdx];

            // Fade in: points that just appeared are more transparent
            const pointProgress = i / visibleCount;
            const fadeFactor = Math.min(1, (1 - pointProgress) * 2 + 0.5);
            const alpha = Math.round(val * val * 140 * fadeFactor);

            const x0 = Math.max(0, Math.floor(px - cellW / 2));
            const y0 = Math.max(0, Math.floor(py - cellH / 2));
            const x1 = Math.min(w, x0 + cellW);
            const y1 = Math.min(h, y0 + cellH);

            for (let cy = y0; cy < y1; cy++) {
                for (let cx = x0; cx < x1; cx++) {
                    const idx = (cy * w + cx) * 4;
                    if (pixels[idx + 3] < alpha) {
                        pixels[idx] = r;
                        pixels[idx + 1] = g;
                        pixels[idx + 2] = b;
                        pixels[idx + 3] = alpha;
                    }
                }
            }
        }

        offCtx.putImageData(imageData, 0, 0);

        // Blur for smooth edges
        const blur = Math.max(4, Math.round(Math.min(w, h) * 0.008));
        ctx.save();
        ctx.filter = `blur(${blur}px)`;
        ctx.drawImage(offscreenRef.current!, 0, 0);
        ctx.restore();

        // 4. Draw scanpath circle on the latest fixation point
        if (visibleCount > 0) {
            const latest = points[Math.min(visibleCount - 1, points.length - 1)];
            let cx: number, cy: number;
            if (latest.x > 1 && latest.y > 1) {
                cx = (latest.x / 100) * w;
                cy = (latest.y / 100) * h;
            } else {
                cx = latest.x * w;
                cy = latest.y * h;
            }
            const radius = Math.round(Math.min(w, h) * 0.02);
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fill();
        }
    }, [naturalSize]);

    // Draw initial frame
    useEffect(() => {
        if (imageLoaded && !playing) {
            renderFrame(progress);
        }
    }, [imageLoaded, progress, playing, renderFrame]);

    // Animation loop
    const play = useCallback(() => {
        setPlaying(true);
        const startTime = performance.now();
        const durationMs = duration * 1000;
        const startProgress = progress;

        const animate = (now: number) => {
            const elapsed = now - startTime;
            const t = Math.min(1, startProgress + (elapsed / durationMs) * (1 - startProgress));
            setProgress(t);
            renderFrame(t);

            if (t < 1) {
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

    // Cleanup
    useEffect(() => {
        return () => cancelAnimationFrame(animRef.current);
    }, []);

    if (!imageUrl) {
        return <div className="bg-gray-200 h-64 flex items-center justify-center">No Image URL</div>;
    }

    const progressPercent = Math.round(progress * 100);
    const currentTime = (progress * duration).toFixed(1);

    return (
        <div className={`overflow-hidden rounded-lg shadow-sm border ${className}`}>
            <canvas
                ref={canvasRef}
                className="max-h-[560px] w-full block"
                style={{ maxHeight: '560px' }}
            />

            {/* Controls */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-t">
                {/* Play/Pause */}
                <button
                    type="button"
                    onClick={playing ? pause : play}
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors flex-shrink-0"
                >
                    {playing ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <rect x="6" y="4" width="4" height="16" />
                            <rect x="14" y="4" width="4" height="16" />
                        </svg>
                    ) : (
                        <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    )}
                </button>

                {/* Reset */}
                <button
                    type="button"
                    onClick={reset}
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors flex-shrink-0"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>

                {/* Progress bar */}
                <input
                    type="range"
                    min={0}
                    max={100}
                    value={progressPercent}
                    onChange={e => {
                        const t = Number(e.target.value) / 100;
                        setProgress(t);
                        if (!playing) renderFrame(t);
                    }}
                    className="flex-1 accent-blue-600"
                />

                {/* Time */}
                <span className="text-xs text-gray-500 font-mono w-16 text-right flex-shrink-0">
                    {currentTime}s / {duration}s
                </span>
            </div>

            {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <span className="text-gray-400">Loading image...</span>
                </div>
            )}
        </div>
    );
};
