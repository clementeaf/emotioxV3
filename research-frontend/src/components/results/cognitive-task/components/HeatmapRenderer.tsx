import { useEffect, useRef, useState } from 'react';
import simpleheat from 'simpleheat';

interface HeatmapPoint {
    x: number;
    y: number;
    value?: number;
    isCorrect?: boolean;
    timestamp?: number;
}

interface HeatmapRendererProps {
    imageUrl: string;
    data: HeatmapPoint[];
    className?: string;
    radius?: number;
    blur?: number;
    opacity?: number;
    threshold?: number;
}

/**
 * Builds a 256-entry color LUT (Hotjar-style gradient).
 * Each entry is [r, g, b]. Used for direct pixel coloring of saliency maps.
 * Based on OGAMA's palette approach (2000 entries) downscaled to 256.
 */
const buildColorLUT = (): Array<[number, number, number]> => {
    const stops: Array<{ pos: number; r: number; g: number; b: number }> = [
        { pos: 0.00, r: 0, g: 0, b: 0 },       // transparent/black (below threshold)
        { pos: 0.15, r: 0, g: 255, b: 0 },     // green
        { pos: 0.35, r: 136, g: 255, b: 0 },   // lime
        { pos: 0.50, r: 255, g: 255, b: 0 },   // yellow
        { pos: 0.70, r: 255, g: 136, b: 0 },   // orange
        { pos: 0.85, r: 255, g: 0, b: 0 },     // red
        { pos: 1.00, r: 255, g: 255, b: 255 }, // white
    ];

    const lut: Array<[number, number, number]> = [];
    for (let i = 0; i < 256; i++) {
        const t = i / 255;
        // Find surrounding stops
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

// Singleton LUT — computed once
const COLOR_LUT = buildColorLUT();

/**
 * Renders a saliency map using direct pixel-level colormap (OGAMA/OpenCV approach).
 * Each saliency value maps directly to a color via LUT — no Gaussian accumulation,
 * so distinct hotspot zones stay separated instead of merging into a single blob.
 */
const renderSaliencyMap = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    data: HeatmapPoint[],
    threshold: number,
): void => {
    // Create an offscreen canvas for the colormap
    const offscreen = document.createElement('canvas');
    offscreen.width = w;
    offscreen.height = h;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    const imageData = offCtx.createImageData(w, h);
    const pixels = imageData.data;

    // Compute cell size: backend grid is step=3 on 384×288,
    // scaled to image dimensions via percentage coords
    const cellW = Math.ceil(w / 128); // 384/3 ≈ 128 columns
    const cellH = Math.ceil(h / 96);  // 288/3 ≈ 96 rows

    for (const point of data) {
        const val = point.value ?? 0;
        if (val < threshold) continue;

        // Convert percentage coords to pixels
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

        // LUT index from saliency value
        const lutIdx = Math.min(255, Math.round(val * 255));
        const [r, g, b] = COLOR_LUT[lutIdx];

        // Quadratic alpha capped at 140 (~55%) so the image always shows through.
        // val=0.4→22, val=0.6→50, val=0.8→90, val=1.0→140
        const alpha = Math.round(val * val * 140);

        // Fill the grid cell
        const x0 = Math.max(0, Math.floor(px - cellW / 2));
        const y0 = Math.max(0, Math.floor(py - cellH / 2));
        const x1 = Math.min(w, x0 + cellW);
        const y1 = Math.min(h, y0 + cellH);

        for (let cy = y0; cy < y1; cy++) {
            for (let cx = x0; cx < x1; cx++) {
                const idx = (cy * w + cx) * 4;
                // Alpha-blend: if pixel already has color, composite
                const existingAlpha = pixels[idx + 3];
                if (existingAlpha > 0 && alpha > 0) {
                    // Keep the brighter (higher saliency) value
                    if (alpha > existingAlpha) {
                        pixels[idx] = r;
                        pixels[idx + 1] = g;
                        pixels[idx + 2] = b;
                        pixels[idx + 3] = alpha;
                    }
                } else {
                    pixels[idx] = r;
                    pixels[idx + 1] = g;
                    pixels[idx + 2] = b;
                    pixels[idx + 3] = alpha;
                }
            }
        }
    }

    offCtx.putImageData(imageData, 0, 0);

    // Light Gaussian blur to smooth cell edges (CSS filter on canvas)
    ctx.save();
    ctx.filter = `blur(${Math.max(1, Math.round(Math.min(w, h) * 0.002))}px)`;
    ctx.drawImage(offscreen, 0, 0);
    ctx.restore();
};

export const HeatmapRenderer = ({
    imageUrl,
    data,
    className = '',
    radius: radiusProp,
    blur: blurProp,
    opacity: opacityProp,
    threshold: thresholdProp,
}: HeatmapRendererProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const img = new Image();
        img.src = imageUrl;
        img.onload = () => {
            setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
            setImageLoaded(true);
        };
    }, [imageUrl]);

    useEffect(() => {
        if (!imageLoaded || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = imageUrl;
        img.onload = () => {
            const w = naturalSize.width;
            const h = naturalSize.height;
            canvas.width = w;
            canvas.height = h;

            // 1. Draw background image
            ctx.drawImage(img, 0, 0);

            // 2. Dark overlay
            const overlayOpacity = opacityProp != null ? opacityProp / 100 : 0.45;
            ctx.fillStyle = `rgba(0, 0, 0, ${overlayOpacity})`;
            ctx.fillRect(0, 0, w, h);

            // 3. Detect data type
            const isSaliency = data.length > 100 && data.some(p => p.value != null && p.value < 1);

            if (isSaliency) {
                // Direct pixel-level colormap — OGAMA/OpenCV approach
                const saliencyThreshold = thresholdProp != null ? thresholdProp / 100 : 0.4;
                renderSaliencyMap(ctx, w, h, data, saliencyThreshold);
            } else {
                // simpleheat for sparse click/fixation data
                const heatCanvas = document.createElement('canvas');
                heatCanvas.width = w;
                heatCanvas.height = h;

                const heat = simpleheat(heatCanvas);

                const r = radiusProp ?? Math.max(12, Math.round(Math.min(w, h) * 0.035));
                const b = blurProp ?? Math.round(r * 0.7);
                heat.radius(r, b);

                heat.gradient({
                    0.15: '#0f0',
                    0.35: '#8f0',
                    0.5: '#ff0',
                    0.7: '#f80',
                    0.85: '#f00',
                    1.0: '#fff',
                });

                const points: Array<[number, number, number]> = data.map(point => {
                    let x = point.x;
                    let y = point.y;
                    if (x > 1 && y > 1) {
                        x = (x / 100) * w;
                        y = (y / 100) * h;
                    } else if (x <= 1 && y <= 1) {
                        x *= w;
                        y *= h;
                    }
                    return [x, y, point.value ?? 1];
                });

                heat.data(points);
                heat.max(Math.max(3, Math.ceil(points.length * 0.05)));
                const minOpacity = thresholdProp != null ? thresholdProp / 100 : 0.05;
                heat.draw(minOpacity);

                ctx.drawImage(heatCanvas, 0, 0);
            }
        };

    }, [imageLoaded, naturalSize, data, imageUrl, radiusProp, blurProp, opacityProp, thresholdProp]);

    if (!imageUrl) return <div className="bg-gray-200 h-64 flex items-center justify-center">No Image URL</div>;

    return (
        <div className={`relative overflow-hidden rounded-lg shadow-sm border ${className}`}>
            <canvas
                ref={canvasRef}
                className="max-h-[560px] w-full block"
                style={{ maxHeight: '560px' }}
            />
            {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <span className="text-gray-400">Loading image...</span>
                </div>
            )}
        </div>
    );
};
