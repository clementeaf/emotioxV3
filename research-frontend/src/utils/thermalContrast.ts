/**
 * Thermal heatmap contrast and colormap utilities.
 *
 * Exported as pure functions for testability and reuse across
 * image and video thermal renderers.
 */

/* ─── Contrast curve ─── */

/**
 * Attempt 1 (legacy): power-law gamma.
 * Problem: gamma 2.0 compresses mid-range values toward zero,
 * making most of the heatmap appear cold (blue/green).
 * A raw value of 0.5 becomes 0.25 — barely past navy.
 */
export const gammaContrast = (raw: number, gamma: number): number =>
    Math.pow(raw, gamma);

/**
 * Attempt 2: Centered sigmoid with adjustable steepness.
 *
 * Maps [0,1] → [0,1] with an S-curve centered at `midpoint`.
 * - Values below midpoint are pushed toward 0 (cold suppression)
 * - Values above midpoint are pushed toward 1 (hot amplification)
 * - Steepness controls how sharp the transition is (higher = more contrast)
 *
 * Formula: sigmoid(x) = 1 / (1 + exp(-steepness * (x - midpoint)))
 * Normalized so sigmoid(0)→0 and sigmoid(1)→1.
 */
export const sigmoidContrast = (
    raw: number,
    steepness = 8,
    midpoint = 0.48,
): number => {
    const s = (x: number) => 1 / (1 + Math.exp(-steepness * (x - midpoint)));
    const sMin = s(0);
    const sMax = s(1);
    return (s(raw) - sMin) / (sMax - sMin);
};

/* ─── Colormap LUT ─── */

export interface ColorStop {
    t: number;
    r: number;
    g: number;
    b: number;
}

/**
 * Builds a 256-entry RGB lookup table from color stops.
 * Linearly interpolates between consecutive stops.
 */
export const buildColorLUT = (stops: ColorStop[]): Array<[number, number, number]> =>
    Array.from({ length: 256 }, (_, i) => {
        const t = i / 255;
        const hiIdx = stops.findIndex(s => s.t >= t);
        const loIdx = Math.max(0, hiIdx - 1);
        const lo = stops[loIdx];
        const hi = stops[Math.max(hiIdx, 0)];
        const range = hi.t - lo.t;
        const f = range > 0 ? (t - lo.t) / range : 0;
        return [
            Math.round(lo.r + (hi.r - lo.r) * f),
            Math.round(lo.g + (hi.g - lo.g) * f),
            Math.round(lo.b + (hi.b - lo.b) * f),
        ] as [number, number, number];
    });

/**
 * Legacy thermal palette — wide cold range, narrow hot range.
 * 50% of the spectrum is blue/teal, hot colors start at 74%.
 */
export const LEGACY_THERMAL_STOPS: ColorStop[] = [
    { t: 0.00, r: 0,   g: 0,   b: 80  },
    { t: 0.10, r: 0,   g: 0,   b: 140 },
    { t: 0.25, r: 0,   g: 40,  b: 200 },
    { t: 0.40, r: 0,   g: 160, b: 160 },
    { t: 0.50, r: 0,   g: 200, b: 60  },
    { t: 0.62, r: 100, g: 220, b: 0   },
    { t: 0.74, r: 220, g: 220, b: 0   },
    { t: 0.85, r: 255, g: 140, b: 0   },
    { t: 0.95, r: 255, g: 40,  b: 0   },
    { t: 1.00, r: 255, g: 0,   b: 0   },
];

/**
 * Rebalanced thermal palette — compressed cold zone, expanded hot zone.
 * Cold (navy→blue→teal) occupies 0–30%.
 * Warm transition (green→yellow) occupies 30–55%.
 * Hot (orange→red) occupies 55–100%.
 */
/* ─── Saliency map decoding (from backend compressed format) ─── */

/**
 * Decodes a zlib-compressed base64 saliency map into a Uint8Array.
 * Uses native DecompressionStream API (supported in all modern browsers).
 *
 * Pipeline: base64 string → binary → inflate → Uint8Array (0-255 per pixel).
 */
export const decodeSaliencyMap = async (
    encoded: string,
): Promise<Uint8Array> => {
    const binary = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    const ds = new DecompressionStream('deflate');
    const writer = ds.writable.getWriter();
    writer.write(binary);
    writer.close();
    const reader = ds.readable.getReader();
    const chunks: Uint8Array[] = [];
    let done = false;
    while (!done) {
        const result = await reader.read();
        done = result.done;
        if (result.value) chunks.push(result.value);
    }
    const totalLen = chunks.reduce((sum, c) => sum + c.length, 0);
    const out = new Uint8Array(totalLen);
    let offset = 0;
    chunks.forEach(c => { out.set(c, offset); offset += c.length; });
    return out;
};

/**
 * Decodes a raw (uncompressed) base64 saliency map into a Uint8Array.
 * Used for TASED-Net thermalMap field — no zlib, direct decode.
 */
export const decodeThermalMap = (encoded: string): Uint8Array =>
    Uint8Array.from(atob(encoded), c => c.charCodeAt(0));

/**
 * Renders a full saliency map (Uint8Array, 0-255 per pixel) to an ImageData.
 * Direct colormap lookup — no IDW interpolation needed.
 *
 * @param map      Quantized saliency values (width × height)
 * @param mapW     Map width (e.g., 384)
 * @param mapH     Map height (e.g., 288)
 * @param canvasW  Target canvas width
 * @param canvasH  Target canvas height
 * @param lut      Color lookup table (256 entries)
 * @param alpha    Global alpha (0-1)
 */
export const renderSaliencyMapDirect = (
    map: Uint8Array,
    mapW: number,
    mapH: number,
    canvasW: number,
    canvasH: number,
    lut: Array<[number, number, number]>,
    contrastFn: (raw: number) => number,
    alpha = 0.55,
): ImageData => {
    const imgData = new ImageData(canvasW, canvasH);
    const d = imgData.data;
    const a = Math.round(alpha * 255);
    const scaleX = mapW / canvasW;
    const scaleY = mapH / canvasH;

    for (let y = 0; y < canvasH; y++) {
        const my = Math.min(Math.floor(y * scaleY), mapH - 1);
        const rowOff = y * canvasW;
        for (let x = 0; x < canvasW; x++) {
            const mx = Math.min(Math.floor(x * scaleX), mapW - 1);
            const raw = map[my * mapW + mx] / 255;
            const intensity = contrastFn(raw);
            const idx = Math.min(255, Math.max(0, Math.round(intensity * 255)));
            const [r, g, b] = lut[idx];
            const off = (rowOff + x) * 4;
            d[off] = r;
            d[off + 1] = g;
            d[off + 2] = b;
            d[off + 3] = a;
        }
    }
    return imgData;
};

/** FLIR Rainbow/Jet palette — monotonic cold→hot.
 *  Muted green, fast transition to yellow/orange/red.
 *  0% = deep blue, 100% = dark red */
export const REBALANCED_THERMAL_STOPS: ColorStop[] = [
    { t: 0.00, r: 0,   g: 0,   b: 140 },  // deep blue
    { t: 0.15, r: 0,   g: 0,   b: 220 },  // blue
    { t: 0.28, r: 0,   g: 100, b: 220 },  // cyan-blue
    { t: 0.38, r: 0,   g: 180, b: 180 },  // teal
    { t: 0.46, r: 0,   g: 180, b: 50  },  // muted green
    { t: 0.54, r: 120, g: 200, b: 0   },  // yellow-green
    { t: 0.64, r: 220, g: 220, b: 0   },  // yellow
    { t: 0.74, r: 255, g: 160, b: 0   },  // orange
    { t: 0.85, r: 255, g: 60,  b: 0   },  // red-orange
    { t: 1.00, r: 180, g: 0,   b: 0   },  // dark red
];
