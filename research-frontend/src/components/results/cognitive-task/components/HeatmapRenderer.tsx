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
    /** Coordinate system of data points. When set, skips auto-detection.
     *  - 'pixel': absolute image pixel coords (e.g. 0-1920)
     *  - 'percent': percentage coords (0-100)
     *  - 'normalized': normalized coords (0-1)
     */
    coordSystem?: 'pixel' | 'percent' | 'normalized';
}

export const HeatmapRenderer = ({
    imageUrl,
    data,
    className = '',
    radius: radiusProp,
    blur: blurProp,
    opacity: opacityProp,
    threshold: thresholdProp,
    coordSystem,
}: HeatmapRendererProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);
    const heatCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

    // Single image load — cached in ref, cleaned up on URL change
    useEffect(() => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = imageUrl;
        img.onload = () => {
            setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
            imgRef.current = img;
            setImageLoaded(true);
        };
        return () => { img.onload = null; img.src = ''; imgRef.current = null; setImageLoaded(false); };
    }, [imageUrl]);

    useEffect(() => {
        if (!imageLoaded || !canvasRef.current || !imgRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = imgRef.current;
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

        // 3. Always use simpleheat for focused Gaussian blobs (matching industry-standard heatmaps).
        // The old LUT saliency approach painted every pixel — simpleheat creates focused hotspots.
        {
            // Reuse simpleheat canvas across renders
            if (!heatCanvasRef.current || heatCanvasRef.current.width !== w || heatCanvasRef.current.height !== h) {
                heatCanvasRef.current = document.createElement('canvas');
                heatCanvasRef.current.width = w;
                heatCanvasRef.current.height = h;
            }
            const heatCanvas = heatCanvasRef.current;
            const heatCtx = heatCanvas.getContext('2d');
            if (heatCtx) heatCtx.clearRect(0, 0, w, h);

                const heat = simpleheat(heatCanvas);

                // Detect if this is dense saliency data (TranSalNet) vs sparse click data
                const isDenseSaliency = data.length > 100 && data.some(p => p.value != null && p.value < 1);

                // For dense saliency: larger radius for focused blobs, filter low-intensity
                const r = radiusProp ?? (isDenseSaliency
                    ? Math.max(20, Math.round(Math.min(w, h) * 0.06))
                    : Math.max(12, Math.round(Math.min(w, h) * 0.035)));
                const b = blurProp ?? Math.round(r * 0.8);
                heat.radius(r, b);

                heat.gradient({
                    0.15: '#0f0',
                    0.35: '#8f0',
                    0.5: '#ff0',
                    0.7: '#f80',
                    0.85: '#f00',
                    1.0: '#fff',
                });

                // For dense saliency: only keep the top hotspot points to create focused blobs
                const minVal = isDenseSaliency ? (thresholdProp != null ? thresholdProp / 100 : 0.55) : 0;

                const points: Array<[number, number, number]> = [];
                for (const point of data) {
                    const val = point.value ?? 1;
                    if (val < minVal) continue;

                    let x = point.x;
                    let y = point.y;
                    if (coordSystem === 'pixel') {
                        // Already image pixels — use as-is (canvas matches natural size)
                    } else if (coordSystem === 'percent') {
                        x = (x / 100) * w;
                        y = (y / 100) * h;
                    } else if (coordSystem === 'normalized') {
                        x *= w;
                        y *= h;
                    } else if (x <= 1 && y <= 1) {
                        x *= w;
                        y *= h;
                    } else if (x <= 100 && y <= 100) {
                        x = (x / 100) * w;
                        y = (y / 100) * h;
                    }
                    // else: absolute image pixels — use as-is
                    points.push([x, y, val]);
                }

                heat.data(points);
                // Dense saliency: max must be very high relative to point count to avoid
                // saturating the entire surface. Only the densest clusters should reach red.
                heat.max(isDenseSaliency ? Math.max(20, Math.ceil(points.length * 0.15)) : Math.max(3, Math.ceil(points.length * 0.05)));
                const minOpacity = isDenseSaliency ? 0.01 : (thresholdProp != null ? thresholdProp / 100 : 0.05);
                heat.draw(minOpacity);

                ctx.drawImage(heatCanvas, 0, 0);
            }

    }, [imageLoaded, naturalSize, data, imageUrl, radiusProp, blurProp, opacityProp, thresholdProp, coordSystem]);

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
