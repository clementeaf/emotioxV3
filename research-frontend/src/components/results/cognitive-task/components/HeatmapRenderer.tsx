import { useEffect, useRef, useState } from 'react';
import simpleheat from 'simpleheat';
import { loadCachedStimulusImage } from '../../../../utils/stimulusImageCache';
import {
    computeStimulusDisplaySize,
    type StimulusDisplaySize,
} from '../../../../utils/attentionPrediction.utils';

interface HeatmapPoint {
    x: number;
    y: number;
    value?: number;
    isCorrect?: boolean;
    timestamp?: number;
}

export type HeatmapGranularity = 'precise' | 'smooth';

interface HeatmapRendererProps {
    imageUrl: string;
    data: HeatmapPoint[];
    className?: string;
    canvasClassName?: string;
    borderless?: boolean;
    radius?: number;
    blur?: number;
    opacity?: number;
    threshold?: number;
    /** precise = discrete hotspots; smooth = legacy diffuse blobs */
    granularity?: HeatmapGranularity;
    /** Coordinate system of data points. When set, skips auto-detection.
     *  - 'pixel': absolute image pixel coords (e.g. 0-1920)
     *  - 'percent': percentage coords (0-100)
     *  - 'normalized': normalized coords (0-1)
     */
    coordSystem?: 'pixel' | 'percent' | 'normalized';
    /** When set with borderless, sizes canvas to fit container without upscaling */
    fitMaxHeightPx?: number;
}

export const HeatmapRenderer = ({
    imageUrl,
    data,
    className = '',
    canvasClassName,
    borderless = false,
    radius: radiusProp,
    blur: blurProp,
    opacity: opacityProp,
    threshold: thresholdProp,
    granularity = 'precise',
    coordSystem,
    fitMaxHeightPx,
}: HeatmapRendererProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fitContainerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);
    const heatCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
    const [displaySize, setDisplaySize] = useState<StimulusDisplaySize | null>(null);

    useEffect(() => {
        let cancelled = false;
        setImageLoaded(false);

        void loadCachedStimulusImage(imageUrl)
            .then((img) => {
                if (cancelled) return;
                setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
                imgRef.current = img;
                setImageLoaded(true);
            })
            .catch(() => {
                if (!cancelled) setImageLoaded(false);
            });

        return () => {
            cancelled = true;
            imgRef.current = null;
        };
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

        ctx.drawImage(img, 0, 0);

        const overlayOpacity = opacityProp != null ? (opacityProp / 100) * 0.35 : 0.15;
        ctx.fillStyle = `rgba(0, 0, 0, ${overlayOpacity})`;
        ctx.fillRect(0, 0, w, h);

        if (!heatCanvasRef.current || heatCanvasRef.current.width !== w || heatCanvasRef.current.height !== h) {
            heatCanvasRef.current = document.createElement('canvas');
            heatCanvasRef.current.width = w;
            heatCanvasRef.current.height = h;
        }
        const heatCanvas = heatCanvasRef.current;
        const heatCtx = heatCanvas.getContext('2d', { willReadFrequently: true });
        if (heatCtx) heatCtx.clearRect(0, 0, w, h);

        const heat = simpleheat(heatCanvas);
        const isPrecise = granularity === 'precise';
        const isDenseSaliency = data.length > 100 && data.some(p => p.value != null && p.value < 1);

        const minDim = Math.min(w, h);
        const r = radiusProp ?? (isPrecise
            ? Math.max(14, Math.round(minDim * (isDenseSaliency ? 0.05 : 0.042)))
            : isDenseSaliency
                ? Math.max(40, Math.round(minDim * 0.12))
                : Math.max(12, Math.round(minDim * 0.035)));

        const blurFraction = blurProp != null
            ? (isPrecise
                ? Math.min(0.45, Math.max(0.2, blurProp / 24))
                : Math.max(isDenseSaliency ? 0.5 : 0.3, blurProp / 20))
            : (isPrecise ? 0.35 : (isDenseSaliency ? 1.2 : 0.8));
        const b = Math.round(r * blurFraction);
        heat.radius(r, b);

        heat.gradient({
            0.15: '#0f0',
            0.35: '#8f0',
            0.5: '#ff0',
            0.7: '#f80',
            0.85: '#f00',
            1.0: '#f00',
        });

        const toPixel = (point: HeatmapPoint): [number, number, number] => {
            let x = point.x;
            let y = point.y;
            if (coordSystem === 'pixel') { /* already pixels */ }
            else if (coordSystem === 'percent') { x = (x / 100) * w; y = (y / 100) * h; }
            else if (coordSystem === 'normalized') { x *= w; y *= h; }
            else if (x <= 1 && y <= 1) { x *= w; y *= h; }
            else if (x <= 100 && y <= 100) { x = (x / 100) * w; y = (y / 100) * h; }
            return [x, y, point.value ?? 1];
        };

        let points: Array<[number, number, number]>;

        if (isDenseSaliency) {
            const gridCols = isPrecise ? 36 : 32;
            const gridRows = Math.round(gridCols * (h / w));
            const cellW = w / gridCols;
            const cellH = h / gridRows;
            const grid = new Map<string, { sumX: number; sumY: number; sumVal: number; maxVal: number }>();

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
                } else {
                    grid.set(key, { sumX: px * val, sumY: py * val, sumVal: val, maxVal: val });
                }
            }

            const cellThreshold = isPrecise
                ? (thresholdProp != null ? thresholdProp / 100 : 0.52)
                : (thresholdProp != null ? thresholdProp / 100 : 0.4);
            points = [];
            for (const cell of grid.values()) {
                if (cell.maxVal < cellThreshold) continue;
                points.push([cell.sumX / cell.sumVal, cell.sumY / cell.sumVal, cell.maxVal]);
            }
        } else {
            points = data.map(toPixel);
        }

        heat.data(points);
        heat.max(isPrecise
            ? Math.max(2, Math.ceil(points.length * 0.08))
            : isDenseSaliency
                ? Math.max(1, points.length * 0.04)
                : Math.max(3, Math.ceil(points.length * 0.05)));
        const minOpacity = isPrecise
            ? (thresholdProp != null ? thresholdProp / 100 : 0.12)
            : isDenseSaliency ? 0.03 : (thresholdProp != null ? thresholdProp / 100 : 0.05);
        heat.draw(minOpacity);

        const heatAlpha = opacityProp != null ? 0.45 + (opacityProp / 100) * 0.45 : 0.65;
        ctx.globalAlpha = heatAlpha;
        ctx.drawImage(heatCanvas, 0, 0);
        ctx.globalAlpha = 1;

    }, [imageLoaded, naturalSize, data, imageUrl, radiusProp, blurProp, opacityProp, thresholdProp, coordSystem, granularity]);

    useEffect(() => {
        if (!borderless || !fitMaxHeightPx || naturalSize.width <= 0) {
            setDisplaySize(null);
            return;
        }

        const container = fitContainerRef.current;
        if (!container) {
            return;
        }

        const updateDisplaySize = (): void => {
            const measuredWidth = container.clientWidth || container.parentElement?.clientWidth || 0;
            const maxWidth = measuredWidth > 0
                ? measuredWidth
                : Math.min(typeof window !== 'undefined' ? window.innerWidth - 96 : 800, 1200);
            setDisplaySize(
                computeStimulusDisplaySize(
                    naturalSize.width,
                    naturalSize.height,
                    maxWidth,
                    fitMaxHeightPx,
                ),
            );
        };

        updateDisplaySize();
        const frame = requestAnimationFrame(updateDisplaySize);
        const observer = new ResizeObserver(updateDisplaySize);
        observer.observe(container);
        window.addEventListener('resize', updateDisplaySize);

        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
            window.removeEventListener('resize', updateDisplaySize);
        };
    }, [borderless, fitMaxHeightPx, naturalSize.width, naturalSize.height]);

    if (!imageUrl) return <div className="bg-gray-200 h-64 flex items-center justify-center">No Image URL</div>;

    const wrapperClass = borderless
        ? `relative block w-full max-w-full leading-[0] ${className}`.trim()
        : `relative overflow-hidden rounded-lg shadow-sm border ${className}`;

    const canvasFitClass = canvasClassName ?? 'w-full h-auto block';
    const fallbackMaxWidth = typeof window !== 'undefined'
        ? Math.min(window.innerWidth - 96, 1200)
        : 800;
    const resolvedDisplaySize = borderless && fitMaxHeightPx && naturalSize.width > 0
        ? (displaySize ?? computeStimulusDisplaySize(
            naturalSize.width,
            naturalSize.height,
            fallbackMaxWidth,
            fitMaxHeightPx,
        ))
        : null;
    const useFitSizing = resolvedDisplaySize != null && resolvedDisplaySize.width > 0;

    return (
        <div ref={fitContainerRef} className={wrapperClass}>
            {useFitSizing ? (
                <div
                    className="relative mx-auto"
                    style={{ width: resolvedDisplaySize.width, height: resolvedDisplaySize.height }}
                >
                    <canvas ref={canvasRef} className="block h-full w-full" />
                </div>
            ) : (
                <canvas ref={canvasRef} className={canvasFitClass} />
            )}
            {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 min-h-[12rem]">
                    <span className="text-gray-400">Loading image...</span>
                </div>
            )}
        </div>
    );
};
