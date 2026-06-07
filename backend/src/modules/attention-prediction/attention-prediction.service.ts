/**
 * Attention Prediction Service
 * Uses TranSalNet (ONNX) to generate visual saliency maps from images.
 * Input: image file path → Output: heatmap data points [{x, y, value}]
 */

import * as ort from 'onnxruntime-node';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

// Model constants — configurable for different architectures
// TranSalNet: 384×288, SUM: 256×256
const MODEL_WIDTH = parseInt(process.env.SALIENCY_WIDTH || '384', 10);
const MODEL_HEIGHT = parseInt(process.env.SALIENCY_HEIGHT || '288', 10);
const IMAGENET_MEAN = [0.485, 0.456, 0.406];
const IMAGENET_STD = [0.229, 0.224, 0.225];

// Configurable model file — defaults to transalnet_res.onnx
// Set SALIENCY_MODEL env var to switch: transalnet_dense.onnx, sum_model.onnx, etc.
const MODEL_FILE = process.env.SALIENCY_MODEL || 'transalnet_res.onnx';

// Singleton session — loaded once, reused for all predictions
let session: ort.InferenceSession | null = null;
let loadedModelFile = '';

/**
 * Resolves the ONNX model path.
 * Looks in backend/models/ relative to the project root.
 */
const getModelPath = (): string => {
    const candidates = [
        path.join(process.cwd(), 'models', MODEL_FILE),
        path.join(__dirname, '..', '..', '..', 'models', MODEL_FILE),
    ];

    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }

    throw new Error(
        `ONNX model not found: ${MODEL_FILE}. Searched: ${candidates.join(', ')}. ` +
        `Place ${MODEL_FILE} in backend/models/`
    );
};

/**
 * Loads the ONNX model session (lazy singleton).
 * Reloads if SALIENCY_MODEL env var changed (supports hot-swapping).
 */
const getSession = async (): Promise<ort.InferenceSession> => {
    if (session && loadedModelFile === MODEL_FILE) return session;

    const modelPath = getModelPath();
    console.log(`[Saliency] Loading model: ${MODEL_FILE} from ${modelPath}`);
    session = await ort.InferenceSession.create(modelPath, {
        executionProviders: ['cpu'],
        graphOptimizationLevel: 'all',
    });
    loadedModelFile = MODEL_FILE;

    return session;
};

/**
 * Preprocesses a sharp instance for the model.
 * Flattens the pipeline via buffer to guarantee exact MODEL_WIDTH x MODEL_HEIGHT output.
 */
const preprocessSharp = async (img: sharp.Sharp): Promise<ort.Tensor> => {
    const flattened = await img.toBuffer();
    const { data, info } = await sharp(flattened)
        .resize(MODEL_WIDTH, MODEL_HEIGHT, { fit: 'fill' })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const { width, height, channels } = info;
    if (width !== MODEL_WIDTH || height !== MODEL_HEIGHT || channels !== 3) {
        throw new Error(
            `Preprocess size mismatch: got ${width}x${height}x${channels}, ` +
            `expected ${MODEL_WIDTH}x${MODEL_HEIGHT}x3`,
        );
    }

    const pixelCount = MODEL_WIDTH * MODEL_HEIGHT;
    const float32Data = new Float32Array(channels * pixelCount);
    for (let i = 0; i < pixelCount; i++) {
        for (let c = 0; c < channels; c++) {
            const pixelValue = data[i * channels + c] / 255.0;
            const normalized = (pixelValue - IMAGENET_MEAN[c]) / IMAGENET_STD[c];
            float32Data[c * pixelCount + i] = normalized;
        }
    }

    return new ort.Tensor('float32', float32Data, [1, 3, MODEL_HEIGHT, MODEL_WIDTH]);
};

const preprocessImage = async (imagePath: string): Promise<ort.Tensor> => {
    return preprocessSharp(sharp(imagePath));
};

// ─── Test-Time Augmentation (TTA) ───────────────────────────────────

/**
 * Generates 3 augmented versions of an image for averaging.
 * Returns sharp instances: [original, h-flip, brightness boost]
 */
const generateAugmentations = (imagePath: string): sharp.Sharp[] => {
    return [
        sharp(imagePath),
        sharp(imagePath).flop(),
        sharp(imagePath).modulate({ brightness: 1.08 }),
    ];
};

/**
 * Runs inference on a single augmentation and returns the raw saliency map.
 */
const inferSaliencyRaw = async (
    sess: ort.InferenceSession,
    img: sharp.Sharp
): Promise<Float32Array> => {
    const inputTensor = await preprocessSharp(img);
    const inputName = sess.inputNames[0];
    const results = await sess.run({ [inputName]: inputTensor });
    const outputName = sess.outputNames[0];
    return results[outputName].data as Float32Array;
};

/**
 * Fuses multiple saliency maps in logit space.
 * logit = log(s / (1 - s)) → average → sigmoid
 * This produces a more stable combined prediction than simple averaging.
 */
const fuseInLogitSpace = (maps: Float32Array[]): Float32Array => {
    const len = maps[0].length;
    const fused = new Float32Array(len);
    const n = maps.length;

    for (let i = 0; i < len; i++) {
        let logitSum = 0;
        for (const map of maps) {
            // Clamp to avoid log(0) or log(inf)
            const s = Math.max(1e-6, Math.min(1 - 1e-6, map[i]));
            logitSum += Math.log(s / (1 - s));
        }
        // Average logit → sigmoid
        const avgLogit = logitSum / n;
        fused[i] = 1 / (1 + Math.exp(-avgLogit));
    }

    return fused;
};

// ─── Post-processing ────────────────────────────────────────────────

/**
 * Applies center bias correction — light center weight to reflect natural viewing tendency.
 * Uses a mild gaussian (not dominant) so peripheral content isn't suppressed.
 */
const applyCenterBias = (map: Float32Array, w: number, h: number, sigma = 0.5): Float32Array => {
    const result = new Float32Array(map.length);
    const cx = w / 2;
    const cy = h / 2;
    const sx = w * sigma;
    const sy = h * sigma;

    for (let row = 0; row < h; row++) {
        for (let col = 0; col < w; col++) {
            const dx = (col - cx) / sx;
            const dy = (row - cy) / sy;
            const gaussian = Math.exp(-0.5 * (dx * dx + dy * dy));
            // Mild bias: floor at 0.6 so periphery retains 60% of its value
            result[row * w + col] = map[row * w + col] * (0.6 + 0.4 * gaussian);
        }
    }
    return result;
};

/**
 * Focal equalization — counteracts TranSalNet's over-concentration on center.
 * Uses the semantic map as a guide: areas with high semantic weight but low saliency
 * get boosted, while over-saturated center areas get attenuated.
 * This produces a distribution closer to real eye-tracking data.
 */
export const applyFocalEqualization = (
    saliencyMap: Float32Array,
    semanticMap: Float32Array | null,
    w: number,
    h: number
): Float32Array => {
    const result = new Float32Array(saliencyMap.length);

    // Step 1: Compute center-distance weight — periphery gets a boost factor
    const cx = w / 2;
    const cy = h / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);

    for (let row = 0; row < h; row++) {
        for (let col = 0; col < w; col++) {
            const idx = row * w + col;
            const dist = Math.sqrt((col - cx) ** 2 + (row - cy) ** 2) / maxDist;

            // Peripheral boost: 1.0 at center → up to 1.5 at edges
            const peripheralBoost = 1.0 + dist * 0.5;

            // Semantic boost: if semantic map says this area is important, boost more
            const semanticWeight = semanticMap ? semanticMap[idx] : 0.5;
            const semanticBoost = 0.7 + semanticWeight * 0.6; // 0.7 to 1.3

            // Center attenuation: reduce over-saturated center values
            const centerAttenuation = 0.7 + dist * 0.3; // 0.7 at center → 1.0 at edges

            result[idx] = saliencyMap[idx] * peripheralBoost * semanticBoost * centerAttenuation;
        }
    }

    return result;
};

/**
 * Applies gaussian blur to the saliency map.
 * Uses a simple box-blur approximation (3 passes ≈ gaussian).
 */
const applyBlur = (map: Float32Array, w: number, h: number, radius: number): Float32Array => {
    if (radius <= 0) return map;
    let current = map;

    // 3 passes of box blur ≈ gaussian blur
    for (let pass = 0; pass < 3; pass++) {
        // Horizontal pass
        const hBlur = new Float32Array(current.length);
        for (let row = 0; row < h; row++) {
            for (let col = 0; col < w; col++) {
                let sum = 0;
                let count = 0;
                for (let k = -radius; k <= radius; k++) {
                    const c = col + k;
                    if (c >= 0 && c < w) {
                        sum += current[row * w + c];
                        count++;
                    }
                }
                hBlur[row * w + col] = sum / count;
            }
        }
        // Vertical pass
        const vBlur = new Float32Array(hBlur.length);
        for (let col = 0; col < w; col++) {
            for (let row = 0; row < h; row++) {
                let sum = 0;
                let count = 0;
                for (let k = -radius; k <= radius; k++) {
                    const r = row + k;
                    if (r >= 0 && r < h) {
                        sum += hBlur[r * w + col];
                        count++;
                    }
                }
                vBlur[row * w + col] = sum / count;
            }
        }
        current = vBlur;
    }

    return current;
};

/**
 * Normalizes a saliency map to [0, 1] range.
 */
const normalizeMap = (map: Float32Array): Float32Array => {
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < map.length; i++) {
        if (map[i] < min) min = map[i];
        if (map[i] > max) max = map[i];
    }
    const range = max - min;
    if (range === 0) return map;

    const result = new Float32Array(map.length);
    for (let i = 0; i < map.length; i++) {
        result[i] = (map[i] - min) / range;
    }
    return result;
};

/**
 * Adds controlled stochastic jitter to break mechanical symmetry.
 * Simulates inter-subject variability in eye movements.
 *
 * Uses Box-Muller transform for gaussian noise, then smooths the noise
 * field to create organic-looking perturbations (not per-pixel noise).
 *
 * @param jitter - Intensity 0-1 (0 = no jitter, 0.15 = subtle, 0.3 = moderate)
 */
export const applyStochasticJitter = (
    map: Float32Array,
    w: number,
    h: number,
    jitter = 0.15
): Float32Array => {
    if (jitter <= 0) return map;

    const result = new Float32Array(map.length);

    // Generate smooth noise field at lower resolution, then interpolate
    const noiseW = Math.ceil(w / 8);
    const noiseH = Math.ceil(h / 8);
    const noiseField = new Float32Array(noiseW * noiseH);

    // Box-Muller gaussian noise
    for (let i = 0; i < noiseField.length; i += 2) {
        const u1 = Math.max(1e-10, Math.random());
        const u2 = Math.random();
        const mag = Math.sqrt(-2 * Math.log(u1));
        noiseField[i] = mag * Math.cos(2 * Math.PI * u2);
        if (i + 1 < noiseField.length) {
            noiseField[i + 1] = mag * Math.sin(2 * Math.PI * u2);
        }
    }

    // Apply jitter: perturb saliency values using interpolated noise
    for (let row = 0; row < h; row++) {
        for (let col = 0; col < w; col++) {
            // Bilinear interpolation from noise grid
            const nx = (col / w) * (noiseW - 1);
            const ny = (row / h) * (noiseH - 1);
            const x0 = Math.floor(nx);
            const y0 = Math.floor(ny);
            const x1 = Math.min(x0 + 1, noiseW - 1);
            const y1 = Math.min(y0 + 1, noiseH - 1);
            const fx = nx - x0;
            const fy = ny - y0;

            const n = noiseField[y0 * noiseW + x0] * (1 - fx) * (1 - fy)
                + noiseField[y0 * noiseW + x1] * fx * (1 - fy)
                + noiseField[y1 * noiseW + x0] * (1 - fx) * fy
                + noiseField[y1 * noiseW + x1] * fx * fy;

            const idx = row * w + col;
            const original = map[idx];
            // Scale noise by local saliency — high saliency areas get more variation
            const perturbation = n * jitter * original;
            result[idx] = Math.max(0, Math.min(1, original + perturbation));
        }
    }

    return result;
};

/**
 * Context-aware scan pattern overlay.
 * Multiplies the saliency map by a scan pattern mask that reflects real
 * eye-movement behavior for the given context type.
 *
 * Patterns are based on eye-tracking literature:
 * - Shelf: horizontal sweep at eye-level, row-by-row (Chandon et al. 2009)
 * - App: thumb-zone bias, top-down flow (Steven Hoober 2013)
 * - Web: F-pattern with strong top-left bias (Nielsen 2006)
 * - Ad/Print: Z-pattern diagonal (Gutenberg diagram)
 * - General: mild center bias only
 */
export const applyScanPattern = (
    map: Float32Array,
    w: number,
    h: number,
    context?: string,
): Float32Array => {
    if (!context || context === 'general') return map;

    const result = new Float32Array(map.length);

    for (let row = 0; row < h; row++) {
        for (let col = 0; col < w; col++) {
            const nx = col / w; // 0..1 normalized x
            const ny = row / h; // 0..1 normalized y
            let weight = 1.0;

            switch (context) {
                case 'shelf':
                case 'packaging': {
                    // Horizontal sweep: eye-level rows (30-60% height) get boost
                    // Each row scanned left-to-right with mild left bias
                    const eyeLevel = 1.0 - 2.0 * Math.abs(ny - 0.45); // peak at 45% height
                    const rowWeight = Math.max(0.3, eyeLevel);
                    const leftBias = 1.0 - nx * 0.15; // slight left-to-right decay
                    // Reduce center blob: attenuate center-x concentration
                    const centerX = Math.abs(nx - 0.5);
                    const antiCenterX = 0.6 + centerX * 0.8; // boost edges, attenuate center
                    weight = rowWeight * leftBias * antiCenterX;
                    break;
                }
                case 'app': {
                    // Thumb zone: bottom-center reachable, top-down content flow
                    const thumbReach = 1.0 - Math.abs(nx - 0.5) * 0.8; // center-x preferred
                    const topDown = 0.5 + ny * 0.5; // bottom half preferred for interaction
                    const contentFlow = 1.0 - ny * 0.3; // top content still important
                    weight = thumbReach * Math.max(topDown * 0.6, contentFlow);
                    break;
                }
                case 'web':
                case 'dashboard': {
                    // F-pattern: strong top-left, horizontal sweeps decay downward
                    const fTopBias = Math.max(0.3, 1.0 - ny * 0.8); // top row strongest
                    const fLeftBias = Math.max(0.4, 1.0 - nx * 0.5); // left side preferred
                    // Horizontal sweep bands (simulates the 3 horizontal movements of F)
                    const band1 = Math.exp(-((ny - 0.15) ** 2) / 0.01) * 0.3;
                    const band2 = Math.exp(-((ny - 0.40) ** 2) / 0.02) * 0.2;
                    weight = fTopBias * fLeftBias + band1 + band2;
                    break;
                }
                case 'advertisement':
                case 'print':
                case 'social_media': {
                    // Z-pattern: TL → TR → BL → BR diagonal
                    const zTop = Math.max(0.4, 1.0 - ny * 0.6); // top preference
                    // Diagonal boost: TL-to-BR
                    const diagDist = Math.abs(nx - ny);
                    const diagBoost = 1.0 + (1.0 - diagDist) * 0.3;
                    // Corner anchors
                    const tlDist = Math.sqrt(nx * nx + ny * ny);
                    const trDist = Math.sqrt((1 - nx) ** 2 + ny * ny);
                    const cornerBoost = Math.exp(-tlDist * 3) * 0.2 + Math.exp(-trDist * 3) * 0.15;
                    weight = zTop * diagBoost + cornerBoost;
                    break;
                }
            }

            const idx = row * w + col;
            result[idx] = map[idx] * Math.max(0.2, weight); // floor 0.2 — never fully suppress
        }
    }

    return result;
};

/**
 * Percentile-based normalization — prevents over-saturation.
 * Instead of min-max (where one hot pixel → everything else dark),
 * clips at the given percentile so the distribution is more readable.
 */
export const normalizePercentile = (
    map: Float32Array,
    percentile = 95,
): Float32Array => {
    // Find the percentile value
    const sorted = Float32Array.from(map).sort();
    const pIdx = Math.min(Math.floor(sorted.length * percentile / 100), sorted.length - 1);
    const pValue = sorted[pIdx];
    const minValue = sorted[Math.floor(sorted.length * 0.02)]; // 2nd percentile as floor

    const range = pValue - minValue;
    if (range <= 0) return map;

    const result = new Float32Array(map.length);
    for (let i = 0; i < map.length; i++) {
        result[i] = Math.max(0, Math.min(1, (map[i] - minValue) / range));
    }
    return result;
};

/** Manual AOI rectangle in percentage coordinates (0-100). */
export interface ManualAoiRect {
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Boosts semantic grid cells that overlap researcher-defined AOIs.
 * @param grid - Semantic attention grid (rows × cols)
 * @param rows - Grid row count
 * @param cols - Grid column count
 * @param aois - Manual AOI regions in percentage coordinates
 * @param boost - Amount added to cell weight (capped at 1)
 * @returns Grid with boosted cells inside manual AOIs
 */
export const boostSemanticGridForManualAois = (
    grid: number[][],
    rows: number,
    cols: number,
    aois: ManualAoiRect[],
    boost = 0.25,
): number[][] => {
    if (aois.length === 0) return grid;

    const result = grid.map((row) => [...row]);
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cellX = ((c + 0.5) / cols) * 100;
            const cellY = ((r + 0.5) / rows) * 100;
            for (const aoi of aois) {
                const inside =
                    cellX >= aoi.x &&
                    cellX <= aoi.x + aoi.width &&
                    cellY >= aoi.y &&
                    cellY <= aoi.y + aoi.height;
                if (inside) {
                    result[r][c] = Math.min(1, result[r][c] + boost);
                }
            }
        }
    }
    return result;
};

/**
 * Boosts saliency values inside manual AOI rectangles with soft edge falloff.
 * @param map - Saliency map (mapWidth × mapHeight)
 * @param width - Map width in pixels
 * @param height - Map height in pixels
 * @param aois - Manual AOI regions in percentage coordinates
 * @param boostStrength - Max multiplicative boost at AOI center (0.35 = +35%)
 * @returns Map with elevated attention inside manual AOIs
 */
export const applyManualAoiBoost = (
    map: Float32Array,
    width: number,
    height: number,
    aois: ManualAoiRect[],
    boostStrength = 0.35,
): Float32Array => {
    if (aois.length === 0) return map;

    const result = new Float32Array(map);
    for (const aoi of aois) {
        const x0 = (aoi.x / 100) * width;
        const y0 = (aoi.y / 100) * height;
        const x1 = ((aoi.x + aoi.width) / 100) * width;
        const y1 = ((aoi.y + aoi.height) / 100) * height;
        const cx = (x0 + x1) / 2;
        const cy = (y0 + y1) / 2;
        const halfW = Math.max((x1 - x0) / 2, 1);
        const halfH = Math.max((y1 - y0) / 2, 1);

        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                const dx = Math.abs(col - cx) / halfW;
                const dy = Math.abs(row - cy) / halfH;
                const dist = Math.max(dx, dy);
                if (dist <= 1) {
                    const soft = 1 - dist * dist;
                    const idx = row * width + col;
                    result[idx] = result[idx] * (1 + boostStrength * soft);
                }
            }
        }
    }
    return result;
};

/**
 * Un-flips a horizontally flipped saliency map back to original orientation.
 */
const unflipHorizontal = (map: Float32Array, w: number, h: number): Float32Array => {
    const result = new Float32Array(map.length);
    for (let row = 0; row < h; row++) {
        for (let col = 0; col < w; col++) {
            result[row * w + col] = map[row * w + (w - 1 - col)];
        }
    }
    return result;
};

/**
 * Converts the saliency map output to heatmap data points.
 * Returns an array of {x, y, value} in percentage coordinates (0-100).
 *
 * Strategy: normalize values relative to min/max so the heatmap shows
 * contrast between cold and hot zones, even when the model produces
 * uniformly high values. Only emits points above the relative threshold.
 */
const postprocessSaliencyMap = (
    output: ort.Tensor,
    threshold: number = 0.3
): Array<{ x: number; y: number; value: number }> => {
    const data = output.data as Float32Array;
    const points: Array<{ x: number; y: number; value: number }> = [];

    // Output shape: [1, 1, 288, 384]
    const h = MODEL_HEIGHT;
    const w = MODEL_WIDTH;

    // Find min/max for relative normalization
    let minVal = Infinity;
    let maxVal = 0;
    for (let i = 0; i < data.length; i++) {
        if (data[i] > maxVal) maxVal = data[i];
        if (data[i] < minVal) minVal = data[i];
    }
    const range = maxVal - minVal;
    if (range === 0) return points;

    // Subsample with step=3 (~12K candidates) and normalize relative to range
    // This ensures there's always contrast between the coldest and hottest zones
    const step = 3;
    for (let row = 0; row < h; row += step) {
        for (let col = 0; col < w; col += step) {
            const rawValue = data[row * w + col];
            // Relative normalization: 0 = coldest in this image, 1 = hottest
            const relativeValue = (rawValue - minVal) / range;

            if (relativeValue >= threshold) {
                points.push({
                    x: (col / w) * 100,
                    y: (row / h) * 100,
                    value: relativeValue,
                });
            }
        }
    }

    return points;
};

/**
 * Generates a saliency prediction for a single image using TTA (Test-Time Augmentation).
 *
 * Pipeline:
 * 1. Generate 4 augmented versions (original, h-flip, brightness+10%, center crop 95%)
 * 2. Run TranSalNet inference on each
 * 3. Un-augment results (flip back the h-flip map)
 * 4. Fuse in logit space for stability
 * 5. Post-process: center bias correction → gaussian blur → normalize
 *
 * @param imagePath - Absolute path to the image file
 * @param threshold - Minimum saliency value to include (0-1, default 0.3)
 * @returns Array of heatmap data points in percentage coordinates
 */
export const predictAttention = async (
    imagePath: string,
    threshold: number = 0.3
): Promise<{
    points: Array<{ x: number; y: number; value: number }>;
    autoPresets: ReturnType<typeof computeAutoPresets>;
    griddedAOIs: ReturnType<typeof computeGriddedAOIs>;
}> => {
    if (!fs.existsSync(imagePath)) {
        throw new Error(`Image not found: ${imagePath}`);
    }

    const sess = await getSession();

    // Step 1: Run 3 augmentations and average (not logit — preserves natural distribution)
    const augmentations = generateAugmentations(imagePath);
    const rawMaps: Float32Array[] = [];

    for (let i = 0; i < augmentations.length; i++) {
        const map = await inferSaliencyRaw(sess, augmentations[i]);
        // Un-augment: flip back the h-flip result (index 1)
        rawMaps.push(i === 1 ? unflipHorizontal(map, MODEL_WIDTH, MODEL_HEIGHT) : map);
    }

    // Step 2: Simple average of 3 maps
    const len = rawMaps[0].length;
    let averaged = new Float32Array(len);
    for (let i = 0; i < len; i++) {
        let sum = 0;
        for (const m of rawMaps) sum += m[i];
        averaged[i] = sum / rawMaps.length;
    }

    // Step 3: Light center bias + blur + normalize
    const biased = applyCenterBias(averaged, MODEL_WIDTH, MODEL_HEIGHT, 0.5);
    const blurred = applyBlur(biased, MODEL_WIDTH, MODEL_HEIGHT, 5);
    const normalized = normalizeMap(blurred);

    // Step 4: Stochastic jitter — break mechanical symmetry
    const jittered = applyStochasticJitter(normalized, MODEL_WIDTH, MODEL_HEIGHT, 0.15);
    const final_ = normalizeMap(jittered);

    // Compute auto-presets and gridded AOIs from the final map
    const autoPresets = computeAutoPresets(final_);
    const griddedAOIs = computeGriddedAOIs(final_, MODEL_WIDTH, MODEL_HEIGHT);

    // Convert to heatmap data points
    const points = extractHeatmapPoints(final_, MODEL_WIDTH, MODEL_HEIGHT, {
        minAbsolute: Math.max(0.4, threshold),
    });
    return { points, autoPresets, griddedAOIs };
};

/**
 * Generates the raw fused TranSalNet saliency map (TTA pipeline) as Float32Array.
 * Useful for hybrid fusion with semantic saliency.
 */
/**
 * Generates the raw averaged TranSalNet saliency map (3 augmentations).
 * Used by hybrid fusion pipeline.
 */
export const predictAttentionRaw = async (
    imagePath: string
): Promise<{ map: Float32Array; width: number; height: number }> => {
    if (!fs.existsSync(imagePath)) {
        throw new Error(`Image not found: ${imagePath}`);
    }

    const sess = await getSession();
    const augmentations = generateAugmentations(imagePath);
    const rawMaps: Float32Array[] = [];

    for (let i = 0; i < augmentations.length; i++) {
        const map = await inferSaliencyRaw(sess, augmentations[i]);
        rawMaps.push(i === 1 ? unflipHorizontal(map, MODEL_WIDTH, MODEL_HEIGHT) : map);
    }

    // Simple average
    const len = rawMaps[0].length;
    let averaged = new Float32Array(len);
    for (let i = 0; i < len; i++) {
        let sum = 0;
        for (const m of rawMaps) sum += m[i];
        averaged[i] = sum / rawMaps.length;
    }

    // Light post-processing (no heavy center bias — hybrid will apply focal equalization)
    const blurredRaw = applyBlur(averaged, MODEL_WIDTH, MODEL_HEIGHT, 4);
    const normalizedRaw = normalizeMap(blurredRaw);

    return { map: normalizedRaw, width: MODEL_WIDTH, height: MODEL_HEIGHT };
};

/**
 * Fast single-pass saliency prediction — no augmentations.
 * ~3x faster than predictAttentionRaw. Designed for video frames where
 * temporal averaging across many frames replaces spatial augmentation.
 */
export const predictAttentionFast = async (
    imagePath: string
): Promise<{ map: Float32Array; width: number; height: number }> => {
    if (!fs.existsSync(imagePath)) {
        throw new Error(`Image not found: ${imagePath}`);
    }

    const sess = await getSession();
    const inputTensor = await preprocessImage(imagePath);
    const inputName = sess.inputNames[0];
    const results = await sess.run({ [inputName]: inputTensor });
    const outputName = sess.outputNames[0];
    const map = results[outputName].data as Float32Array;

    const blurred = applyBlur(map, MODEL_WIDTH, MODEL_HEIGHT, 4);
    const normalized = normalizeMap(blurred);

    return { map: normalized, width: MODEL_WIDTH, height: MODEL_HEIGHT };
};

/**
 * Converts a raw saliency Float32Array to heatmap data points.
 */
/**
 * Analyzes saliency map distribution and recommends visualization presets.
 * Returns optimal blur, opacity, threshold based on map characteristics.
 */
export const computeAutoPresets = (data: Float32Array): {
    blur: number;
    opacity: number;
    threshold: number;
    concentration: number;
    coverage: number;
    mode: 'precise' | 'smooth';
} => {
    const len = data.length;
    if (len === 0) {
        return { blur: 8, opacity: 55, threshold: 58, concentration: 0.5, coverage: 0.5, mode: 'precise' };
    }

    let sum = 0, sumSq = 0;
    let above30 = 0, above60 = 0;
    for (let i = 0; i < len; i++) {
        sum += data[i];
        sumSq += data[i] * data[i];
        if (data[i] > 0.3) above30++;
        if (data[i] > 0.6) above60++;
    }

    const mean = sum / len;
    const variance = sumSq / len - mean * mean;
    const std = Math.sqrt(Math.max(0, variance));

    const coverage = above30 / len;
    const concentration = above30 > 0 ? above60 / above30 : 0;

    // Precise presets: smaller blur, higher UI threshold — separate hotspots, cold zones stay cold
    const blur = Math.round(5 + coverage * 6 + std * 4);
    const opacity = Math.round(52 + coverage * 18);
    const threshold = Math.round(52 + (1 - concentration) * 12 + coverage * 8);

    return {
        blur: Math.max(4, Math.min(14, blur)),
        opacity: Math.max(48, Math.min(72, opacity)),
        threshold: Math.max(50, Math.min(68, threshold)),
        concentration,
        coverage,
        mode: 'precise',
    };
};

export interface ExtractHeatmapPointsOptions {
    /** Minimum saliency relative to map peak (0-1). Default 0.55 */
    minRelative?: number;
    /** Absolute floor on normalized map (0-1). Default 0.42 */
    minAbsolute?: number;
    /** Grid columns for peak clustering. Default 24 */
    gridCols?: number;
    /** Max hotspot centroids to export. Default 80 */
    maxPoints?: number;
    /** NMS distance in grid cells. Default 2 */
    nmsCells?: number;
}

/**
 * Exports saliency map as discrete hotspot centroids for granular heatmap rendering.
 * Uses grid peak detection + NMS instead of dense threshold subsampling.
 * @param map - Normalized saliency map (w × h)
 * @param w - Map width
 * @param h - Map height
 * @param options - Extraction tuning
 * @returns Percentage-coordinate heatmap points with saliency values
 */
export const extractHeatmapPoints = (
    map: Float32Array,
    w: number,
    h: number,
    options: ExtractHeatmapPointsOptions = {},
): Array<{ x: number; y: number; value: number }> => {
    const minRelative = options.minRelative ?? 0.55;
    const minAbsolute = options.minAbsolute ?? 0.42;
    const gridCols = options.gridCols ?? 24;
    const maxPoints = options.maxPoints ?? 80;
    const nmsCells = options.nmsCells ?? 2;

    let peak = 0;
    for (let i = 0; i < map.length; i++) {
        if (map[i] > peak) peak = map[i];
    }
    if (peak <= 0) return [];

    const cutAbsolute = Math.max(minAbsolute, peak * minRelative);
    const gridRows = Math.max(1, Math.round(gridCols * (h / w)));
    const cellW = w / gridCols;
    const cellH = h / gridRows;

    interface PeakCell {
        col: number;
        row: number;
        cx: number;
        cy: number;
        maxVal: number;
    }

    const cells: PeakCell[] = [];

    for (let gr = 0; gr < gridRows; gr++) {
        for (let gc = 0; gc < gridCols; gc++) {
            const startCol = Math.floor(gc * cellW);
            const endCol = Math.min(w, Math.floor((gc + 1) * cellW));
            const startRow = Math.floor(gr * cellH);
            const endRow = Math.min(h, Math.floor((gr + 1) * cellH));

            let maxVal = 0;
            let sumX = 0;
            let sumY = 0;
            let sumV = 0;

            for (let row = startRow; row < endRow; row++) {
                for (let col = startCol; col < endCol; col++) {
                    const v = map[row * w + col];
                    if (v > maxVal) maxVal = v;
                    if (v >= cutAbsolute * 0.92) {
                        sumX += col * v;
                        sumY += row * v;
                        sumV += v;
                    }
                }
            }

            if (maxVal >= cutAbsolute && sumV > 0) {
                cells.push({
                    col: gc,
                    row: gr,
                    cx: (sumX / sumV / w) * 100,
                    cy: (sumY / sumV / h) * 100,
                    maxVal,
                });
            }
        }
    }

    cells.sort((a, b) => b.maxVal - a.maxVal);

    const selected: PeakCell[] = [];
    for (const cell of cells) {
        if (selected.length >= maxPoints) break;
        const tooClose = selected.some(s =>
            Math.abs(s.col - cell.col) <= nmsCells && Math.abs(s.row - cell.row) <= nmsCells,
        );
        if (!tooClose) selected.push(cell);
    }

    return selected.map(c => ({
        x: c.cx,
        y: c.cy,
        value: c.maxVal,
    }));
};

/**
 * Generates gridded AOIs from the saliency map.
 * Divides the image into a grid (default 4×4), computes average attention per cell,
 * then identifies clusters of high-attention cells as AOIs.
 * Inspired by EyeMap paper's Gridded AOI approach.
 *
 * @returns Array of detected AOIs with bounding boxes and attention scores
 */
export const computeGriddedAOIs = (
    data: Float32Array,
    w: number,
    h: number,
    gridCols = 4,
    gridRows = 4,
    attentionThreshold = 0.45
): Array<{
    label: string;
    x: number; y: number; width: number; height: number; // percentages 0-100
    attention: number; // average attention 0-1
    rank: number;
}> => {
    const cellW = Math.floor(w / gridCols);
    const cellH = Math.floor(h / gridRows);

    // Compute average saliency per grid cell
    const cellScores: Array<{ row: number; col: number; score: number }> = [];
    for (let gr = 0; gr < gridRows; gr++) {
        for (let gc = 0; gc < gridCols; gc++) {
            let sum = 0, count = 0;
            for (let r = gr * cellH; r < Math.min((gr + 1) * cellH, h); r++) {
                for (let c = gc * cellW; c < Math.min((gc + 1) * cellW, w); c++) {
                    sum += data[r * w + c];
                    count++;
                }
            }
            cellScores.push({ row: gr, col: gc, score: count > 0 ? sum / count : 0 });
        }
    }

    // Find high-attention cells
    const hotCells = cellScores.filter(c => c.score >= attentionThreshold);

    // Cluster adjacent hot cells into AOIs using simple flood-fill
    const visited = new Set<string>();
    const aois: Array<{
        label: string;
        x: number; y: number; width: number; height: number;
        attention: number;
        rank: number;
    }> = [];

    const getKey = (r: number, c: number) => `${r},${c}`;
    const hotSet = new Set(hotCells.map(c => getKey(c.row, c.col)));

    for (const cell of hotCells) {
        const key = getKey(cell.row, cell.col);
        if (visited.has(key)) continue;

        // Flood-fill to find cluster
        const cluster: typeof hotCells = [];
        const queue = [cell];
        while (queue.length > 0) {
            const current = queue.pop()!;
            const ck = getKey(current.row, current.col);
            if (visited.has(ck)) continue;
            visited.add(ck);
            cluster.push(current);

            // Check 4-connected neighbors
            for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
                const nr = current.row + dr;
                const nc = current.col + dc;
                const nk = getKey(nr, nc);
                if (hotSet.has(nk) && !visited.has(nk)) {
                    const neighbor = hotCells.find(c => c.row === nr && c.col === nc);
                    if (neighbor) queue.push(neighbor);
                }
            }
        }

        if (cluster.length === 0) continue;

        // Compute bounding box of cluster
        const minCol = Math.min(...cluster.map(c => c.col));
        const maxCol = Math.max(...cluster.map(c => c.col));
        const minRow = Math.min(...cluster.map(c => c.row));
        const maxRow = Math.max(...cluster.map(c => c.row));
        const avgScore = cluster.reduce((s, c) => s + c.score, 0) / cluster.length;

        aois.push({
            label: `Zone ${aois.length + 1}`,
            x: (minCol * cellW / w) * 100,
            y: (minRow * cellH / h) * 100,
            width: ((maxCol - minCol + 1) * cellW / w) * 100,
            height: ((maxRow - minRow + 1) * cellH / h) * 100,
            attention: Math.round(avgScore * 100) / 100,
            rank: 0,
        });
    }

    // Rank by attention score
    aois.sort((a, b) => b.attention - a.attention);
    aois.forEach((aoi, i) => { aoi.rank = i + 1; });

    return aois;
};

/**
 * Generates the raw saliency map as a grayscale PNG buffer using TTA pipeline.
 * Useful for debugging or serving the map as an image.
 */
export const predictAttentionAsImage = async (
    imagePath: string
): Promise<Buffer> => {
    if (!fs.existsSync(imagePath)) {
        throw new Error(`Image not found: ${imagePath}`);
    }

    const sess = await getSession();

    // 3-augmentation average pipeline — same as predictAttention
    const augmentations = generateAugmentations(imagePath);
    const rawMaps: Float32Array[] = [];

    for (let i = 0; i < augmentations.length; i++) {
        const map = await inferSaliencyRaw(sess, augmentations[i]);
        rawMaps.push(i === 1 ? unflipHorizontal(map, MODEL_WIDTH, MODEL_HEIGHT) : map);
    }

    const len = rawMaps[0].length;
    let averaged = new Float32Array(len);
    for (let i = 0; i < len; i++) {
        let sum = 0;
        for (const m of rawMaps) sum += m[i];
        averaged[i] = sum / rawMaps.length;
    }

    const biased = applyCenterBias(averaged, MODEL_WIDTH, MODEL_HEIGHT, 0.5);
    const blurred = applyBlur(biased, MODEL_WIDTH, MODEL_HEIGHT, 5);
    const normalized = normalizeMap(blurred);
    const fused = applyStochasticJitter(normalized, MODEL_WIDTH, MODEL_HEIGHT, 0.15);

    // Convert to 0-255 grayscale
    const uint8Data = new Uint8Array(fused.length);
    for (let i = 0; i < fused.length; i++) {
        uint8Data[i] = Math.round(fused[i] * 255);
    }

    return sharp(Buffer.from(uint8Data), {
        raw: { width: MODEL_WIDTH, height: MODEL_HEIGHT, channels: 1 },
    })
        .png()
        .toBuffer();
};
