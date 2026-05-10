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
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        const img = imgRef.current;
        const w = naturalSize.width;
        const h = naturalSize.height;
        canvas.width = w;
        canvas.height = h;

        // 1. Draw background image
        ctx.drawImage(img, 0, 0);

        // 2. Light dark overlay — just enough contrast for heatmap visibility
        const overlayOpacity = opacityProp != null ? (opacityProp / 100) * 0.4 : 0.18;
        ctx.fillStyle = `rgba(0, 0, 0, ${overlayOpacity})`;
        ctx.fillRect(0, 0, w, h);

        // 3. Render heatmap via simpleheat
        {
            if (!heatCanvasRef.current || heatCanvasRef.current.width !== w || heatCanvasRef.current.height !== h) {
                heatCanvasRef.current = document.createElement('canvas');
                heatCanvasRef.current.width = w;
                heatCanvasRef.current.height = h;
            }
            const heatCanvas = heatCanvasRef.current;
            const heatCtx = heatCanvas.getContext('2d', { willReadFrequently: true });
            if (heatCtx) heatCtx.clearRect(0, 0, w, h);

            const heat = simpleheat(heatCanvas);
            const isDenseSaliency = data.length > 100 && data.some(p => p.value != null && p.value < 1);

            const r = radiusProp ?? (isDenseSaliency
                ? Math.max(40, Math.round(Math.min(w, h) * 0.12))
                : Math.max(12, Math.round(Math.min(w, h) * 0.035)));
            const b = blurProp ?? Math.round(r * (isDenseSaliency ? 1.2 : 0.8));
            heat.radius(r, b);

            heat.gradient({
                0.15: '#0f0',
                0.35: '#8f0',
                0.5: '#ff0',
                0.7: '#f80',
                0.85: '#f00',
                1.0: '#f00',
            });

            // Convert all points to pixel coords first
            const toPixel = (point: HeatmapPoint): [number, number, number] => {
                let x = point.x, y = point.y;
                if (coordSystem === 'pixel') { /* already pixels */ }
                else if (coordSystem === 'percent') { x = (x / 100) * w; y = (y / 100) * h; }
                else if (coordSystem === 'normalized') { x *= w; y *= h; }
                else if (x <= 1 && y <= 1) { x *= w; y *= h; }
                else if (x <= 100 && y <= 100) { x = (x / 100) * w; y = (y / 100) * h; }
                return [x, y, point.value ?? 1];
            };

            let points: Array<[number, number, number]>;

            if (isDenseSaliency) {
                // Grid-based downsampling: divide image into cells, compute peak per cell.
                // This produces ~20-80 focused hotspot centroids instead of thousands of overlapping points.
                const gridCols = 32;
                const gridRows = Math.round(gridCols * (h / w));
                const cellW = w / gridCols;
                const cellH = h / gridRows;
                const grid = new Map<string, { sumX: number; sumY: number; sumVal: number; maxVal: number; count: number }>();

                for (const point of data) {
                    const [px, py, val] = toPixel(point);
                    const col = Math.min(gridCols - 1, Math.floor(px / cellW));
                    const row = Math.min(gridRows - 1, Math.floor(py / cellH));
                    const key = `${col},${row}`;
                    const cell = grid.get(key);
                    if (cell) {
                        cell.sumX += px * val;
                        cell.sumY += py * val;
                        cell.sumVal += val;
                        cell.maxVal = Math.max(cell.maxVal, val);
                        cell.count++;
                    } else {
                        grid.set(key, { sumX: px * val, sumY: py * val, sumVal: val, maxVal: val, count: 1 });
                    }
                }

                // Extract centroids weighted by saliency, filter low-energy cells
                const threshold = thresholdProp != null ? thresholdProp / 100 : 0.4;
                points = [];
                for (const cell of grid.values()) {
                    if (cell.maxVal < threshold) continue;
                    const cx = cell.sumX / cell.sumVal;
                    const cy = cell.sumY / cell.sumVal;
                    points.push([cx, cy, cell.maxVal]);
                }
            } else {
                points = data.map(toPixel);
            }

            heat.data(points);
            heat.max(isDenseSaliency ? Math.max(1, points.length * 0.04) : Math.max(3, Math.ceil(points.length * 0.05)));
            const minOpacity = isDenseSaliency ? 0.03 : (thresholdProp != null ? thresholdProp / 100 : 0.05);
            heat.draw(minOpacity);

            // Draw heatmap with controlled transparency so image shows through
            const heatAlpha = opacityProp != null ? 0.5 + (opacityProp / 100) * 0.5 : 0.7;
            ctx.globalAlpha = heatAlpha;
            ctx.drawImage(heatCanvas, 0, 0);
            ctx.globalAlpha = 1;
        }

    }, [imageLoaded, naturalSize, data, imageUrl, radiusProp, blurProp, opacityProp, thresholdProp, coordSystem]);

    if (!imageUrl) return <div className="bg-gray-200 h-64 flex items-center justify-center">No Image URL</div>;

    return (
        <div className={`relative overflow-hidden rounded-lg shadow-sm border ${className}`}>
            <canvas
                ref={canvasRef}
                className="max-h-[60vh] w-auto max-w-full block mx-auto"
            />
            {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <span className="text-gray-400">Loading image...</span>
                </div>
            )}
        </div>
    );
};
