import simpleheat from 'simpleheat';
import { heatmapPointToPixel, type SpotlightHeatmapPoint } from './spotlightRender';

export interface ColdMapRenderParams {
    intensity: number;
    blur: number;
    threshold: number;
}

type HeatPoint = [number, number, number];

/** Green→cyan gradient for cold map (ignored/low-attention zones) */
export const COLD_MAP_GRADIENT: Record<number, string> = {
    0.35: '#44cc88',
    0.55: '#22bbaa',
    0.75: '#00aacc',
    1.0: '#0088aa',
};

/**
 * Builds simpleheat points with inverted saliency (cold = ignored zones).
 * @param points - Hotspot centroids from prediction
 * @param w - Canvas width
 * @param h - Canvas height
 * @param threshold - Minimum cold weight on 0-100 scale
 * @returns Points for simpleheat and the peak saliency value
 */
function buildInvertedColdPoints(
    points: SpotlightHeatmapPoint[],
    w: number,
    h: number,
    threshold: number,
): { heatPoints: HeatPoint[] } {
    if (points.length === 0) {
        return { heatPoints: [] };
    }

    const maxVal = Math.max(...points.map((point) => point.value ?? 1), 0.01);
    const minCold = threshold / 100;
    const isDense = points.length > 100 && points.some((point) => point.value != null && point.value < 1);

    if (isDense) {
        const gridCols = 32;
        const gridRows = Math.round(gridCols * (h / w));
        const cellW = w / gridCols;
        const cellH = h / gridRows;
        const grid = new Map<string, { sumX: number; sumY: number; sumVal: number; maxVal: number }>();

        for (const point of points) {
            const { px, py, val } = heatmapPointToPixel(point, w, h);
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

        const heatPoints: HeatPoint[] = [];
        for (const cell of grid.values()) {
            const coldWeight = 1 - cell.maxVal / maxVal;
            if (coldWeight < minCold) {
                continue;
            }
            heatPoints.push([
                cell.sumX / cell.sumVal,
                cell.sumY / cell.sumVal,
                0.12 + coldWeight * 0.88,
            ]);
        }
        return { heatPoints };
    }

    const heatPoints: HeatPoint[] = [];
    for (const point of points) {
        const { px, py, val } = heatmapPointToPixel(point, w, h);
        const coldWeight = 1 - val / maxVal;
        if (coldWeight < minCold) {
            continue;
        }
        heatPoints.push([px, py, 0.12 + coldWeight * 0.88]);
    }
    return { heatPoints };
}

/**
 * Renders cold-map overlay on a canvas (image or video frame).
 * @param targetCtx - Destination canvas context
 * @param source - Stimulus image or video frame
 * @param w - Canvas width
 * @param h - Canvas height
 * @param points - Hotspot centroids from prediction
 * @param params - Cold map tuning parameters
 * @param heatCanvasRef - Reusable offscreen canvas for simpleheat
 */
export function renderColdMapComposite(
    targetCtx: CanvasRenderingContext2D,
    source: CanvasImageSource,
    w: number,
    h: number,
    points: SpotlightHeatmapPoint[],
    params: ColdMapRenderParams,
    heatCanvasRef: { current: HTMLCanvasElement | null },
): void {
    const { intensity, blur, threshold } = params;

    targetCtx.clearRect(0, 0, w, h);
    targetCtx.drawImage(source, 0, 0, w, h);

    const ambientAlpha = Math.min(0.35, (intensity / 100) * 0.22);
    targetCtx.fillStyle = `rgba(10, 40, 72, ${ambientAlpha})`;
    targetCtx.fillRect(0, 0, w, h);

    if (!heatCanvasRef.current || heatCanvasRef.current.width !== w || heatCanvasRef.current.height !== h) {
        heatCanvasRef.current = document.createElement('canvas');
        heatCanvasRef.current.width = w;
        heatCanvasRef.current.height = h;
    }
    const heatCanvas = heatCanvasRef.current;
    const heatCtx = heatCanvas.getContext('2d', { willReadFrequently: true });
    if (heatCtx) {
        heatCtx.clearRect(0, 0, w, h);
    }

    const { heatPoints } = buildInvertedColdPoints(points, w, h, threshold);
    if (heatPoints.length === 0) {
        return;
    }

    const heat = simpleheat(heatCanvas);
    const minDim = Math.min(w, h);
    const radius = Math.max(12, Math.round(minDim * 0.038));
    const blurFraction = Math.min(0.5, Math.max(0.22, blur / 22));
    heat.radius(radius, Math.round(radius * blurFraction));
    heat.gradient(COLD_MAP_GRADIENT);
    heat.data(heatPoints);
    heat.max(Math.max(2, Math.ceil(heatPoints.length * 0.07)));
    heat.draw(0.08);

    targetCtx.globalAlpha = Math.min(0.92, (intensity / 100) * 0.82);
    targetCtx.drawImage(heatCanvas, 0, 0);
    targetCtx.globalAlpha = 1;
}
