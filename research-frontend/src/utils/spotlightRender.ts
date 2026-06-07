export interface SpotlightHeatmapPoint {
    x: number;
    y: number;
    value?: number;
}

export interface SpotlightRenderParams {
    blurPx: number;
    revealRadius: number;
    dimOpacity: number;
    threshold: number;
}

interface PixelPoint {
    px: number;
    py: number;
    val: number;
}

/**
 * Converts a heatmap point to pixel coordinates on the stimulus canvas.
 * @param point - Heatmap point in percent, normalized, or pixel coords
 * @param w - Canvas width in pixels
 * @param h - Canvas height in pixels
 * @returns Pixel position and saliency value
 */
export function heatmapPointToPixel(
    point: SpotlightHeatmapPoint,
    w: number,
    h: number,
): PixelPoint {
    let x = point.x;
    let y = point.y;
    const val = point.value ?? 1;
    if (x <= 1 && y <= 1) {
        x *= w;
        y *= h;
    } else if (x <= 100 && y <= 100) {
        x = (x / 100) * w;
        y = (y / 100) * h;
    }
    return { px: x, py: y, val };
}

/**
 * Filters heatmap points below the saliency threshold.
 * @param points - Raw heatmap points
 * @param threshold - Threshold on 0-100 scale
 * @returns Points above threshold
 */
function filterSpotlightPoints(
    points: SpotlightHeatmapPoint[],
    threshold: number,
): SpotlightHeatmapPoint[] {
    const minVal = threshold / 100;
    return points.filter((point) => (point.value ?? 1) >= minVal);
}

/**
 * Builds a cache key for the reveal mask canvas.
 * @param points - Heatmap points
 * @param w - Canvas width
 * @param h - Canvas height
 * @param revealRadius - Reveal radius on 0-100 scale
 * @param threshold - Saliency threshold on 0-100 scale
 * @returns Cache key string
 */
export function buildSpotlightMaskKey(
    points: SpotlightHeatmapPoint[],
    w: number,
    h: number,
    revealRadius: number,
    threshold: number,
): string {
    const sample = points
        .slice(0, 8)
        .map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)},${(point.value ?? 1).toFixed(2)}`)
        .join('|');
    return `${w}x${h}-${revealRadius}-${threshold}-${points.length}-${sample}`;
}

/**
 * Paints a white radial mask from saliency hotspot centroids.
 * @param maskCanvas - Offscreen mask canvas
 * @param points - Heatmap points
 * @param w - Canvas width
 * @param h - Canvas height
 * @param revealRadius - Reveal radius on 0-100 scale
 * @param threshold - Saliency threshold on 0-100 scale
 */
export function renderSpotlightMask(
    maskCanvas: HTMLCanvasElement,
    points: SpotlightHeatmapPoint[],
    w: number,
    h: number,
    revealRadius: number,
    threshold: number,
): void {
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) {
        return;
    }
    maskCtx.clearRect(0, 0, w, h);

    const filtered = filterSpotlightPoints(points, threshold);
    if (filtered.length === 0) {
        return;
    }

    const maxVal = Math.max(...filtered.map((point) => point.value ?? 1), 0.01);
    const baseR = (revealRadius / 100) * Math.min(w, h) * 0.1;

    for (const point of filtered) {
        const { px, py, val } = heatmapPointToPixel(point, w, h);
        const valScale = 0.4 + (val / maxVal) * 0.6;
        const r = baseR * valScale;

        const gradient = maskCtx.createRadialGradient(px, py, 0, px, py, r);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.7, 'rgba(255,255,255,0.6)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        maskCtx.fillStyle = gradient;
        maskCtx.fillRect(px - r, py - r, r * 2, r * 2);
    }
}

/**
 * Composites blurred+d dimmed base with sharp revealed hotspots.
 * @param targetCtx - Destination canvas context
 * @param source - Stimulus image or video frame
 * @param w - Canvas width
 * @param h - Canvas height
 * @param points - Heatmap points
 * @param params - Spotlight tuning parameters
 * @param offscreenRef - Reusable sharp-image canvas
 * @param maskRef - Reusable mask canvas
 * @param cachedMaskKeyRef - Mask cache key holder
 */
export function renderSpotlightComposite(
    targetCtx: CanvasRenderingContext2D,
    source: CanvasImageSource,
    w: number,
    h: number,
    points: SpotlightHeatmapPoint[],
    params: SpotlightRenderParams,
    offscreenRef: { current: HTMLCanvasElement | null },
    maskRef: { current: HTMLCanvasElement | null },
    cachedMaskKeyRef: { current: string },
): void {
    const { blurPx, revealRadius, dimOpacity, threshold } = params;

    targetCtx.clearRect(0, 0, w, h);
    targetCtx.filter = `blur(${blurPx}px)`;
    targetCtx.drawImage(source, 0, 0, w, h);
    targetCtx.filter = 'none';
    targetCtx.fillStyle = `rgba(0, 0, 0, ${dimOpacity})`;
    targetCtx.fillRect(0, 0, w, h);

    if (!offscreenRef.current || offscreenRef.current.width !== w || offscreenRef.current.height !== h) {
        offscreenRef.current = document.createElement('canvas');
        offscreenRef.current.width = w;
        offscreenRef.current.height = h;
    }
    const offCtx = offscreenRef.current.getContext('2d');
    if (!offCtx) {
        return;
    }
    offCtx.clearRect(0, 0, w, h);
    offCtx.drawImage(source, 0, 0, w, h);

    if (!maskRef.current || maskRef.current.width !== w || maskRef.current.height !== h) {
        maskRef.current = document.createElement('canvas');
        maskRef.current.width = w;
        maskRef.current.height = h;
        cachedMaskKeyRef.current = '';
    }

    const maskKey = buildSpotlightMaskKey(points, w, h, revealRadius, threshold);
    if (cachedMaskKeyRef.current !== maskKey) {
        cachedMaskKeyRef.current = maskKey;
        renderSpotlightMask(maskRef.current, points, w, h, revealRadius, threshold);
    }

    offCtx.globalCompositeOperation = 'destination-in';
    offCtx.drawImage(maskRef.current, 0, 0);
    offCtx.globalCompositeOperation = 'source-over';

    targetCtx.drawImage(offscreenRef.current, 0, 0);
}
