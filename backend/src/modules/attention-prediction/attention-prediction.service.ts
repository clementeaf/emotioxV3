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
 * Resizes to 384x288, normalizes with ImageNet mean/std, converts to CHW float32.
 */
const preprocessSharp = async (img: sharp.Sharp): Promise<ort.Tensor> => {
    const { data, info } = await img
        .resize(MODEL_WIDTH, MODEL_HEIGHT, { fit: 'fill' })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const { width, height, channels } = info;
    const pixelCount = width * height;

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
 * Generates augmented versions of an image for TTA.
 * Returns sharp instances: [original, h-flip, brightness+, crop95%]
 * Note: crop is applied after initial resize to MODEL dimensions so coordinates are predictable.
 */
const generateAugmentations = (imagePath: string): sharp.Sharp[] => {
    const cropMargin = Math.round(MODEL_WIDTH * 0.025);
    const cropW = MODEL_WIDTH - cropMargin * 2;
    const cropH = MODEL_HEIGHT - cropMargin * 2;

    return [
        sharp(imagePath),                                          // original
        sharp(imagePath).flop(),                                   // horizontal flip
        sharp(imagePath).modulate({ brightness: 1.1 }),            // brightness +10%
        sharp(imagePath)                                           // center crop 95%
            .resize(MODEL_WIDTH, MODEL_HEIGHT, { fit: 'fill' })
            .extract({ left: cropMargin, top: Math.round(MODEL_HEIGHT * 0.025), width: cropW, height: cropH }),
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
 * Applies center bias correction — multiplies by a 2D gaussian centered on the image.
 * Reflects the natural tendency of viewers to look at the center of images.
 */
const applyCenterBias = (map: Float32Array, w: number, h: number, sigma = 0.4): Float32Array => {
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
            result[row * w + col] = map[row * w + col] * (0.3 + 0.7 * gaussian);
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
): Promise<Array<{ x: number; y: number; value: number }>> => {
    if (!fs.existsSync(imagePath)) {
        throw new Error(`Image not found: ${imagePath}`);
    }

    const sess = await getSession();

    // Step 1-2: Generate augmentations and run inference on each
    const augmentations = generateAugmentations(imagePath);
    const rawMaps: Float32Array[] = [];

    for (let i = 0; i < augmentations.length; i++) {
        const map = await inferSaliencyRaw(sess, augmentations[i]);

        // Step 3: Un-augment — flip back the h-flip result (index 1)
        if (i === 1) {
            rawMaps.push(unflipHorizontal(map, MODEL_WIDTH, MODEL_HEIGHT));
        } else {
            rawMaps.push(map);
        }
    }

    // Step 4: Fuse in logit space
    let fused = fuseInLogitSpace(rawMaps);

    // Step 5: Post-processing
    fused = applyCenterBias(fused, MODEL_WIDTH, MODEL_HEIGHT, 0.4);
    fused = applyBlur(fused, MODEL_WIDTH, MODEL_HEIGHT, 5);
    fused = normalizeMap(fused);

    // Convert to heatmap data points
    return saliencyMapToPoints(fused, threshold);
};

/**
 * Generates the raw fused TranSalNet saliency map (TTA pipeline) as Float32Array.
 * Useful for hybrid fusion with semantic saliency.
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
        if (i === 1) {
            rawMaps.push(unflipHorizontal(map, MODEL_WIDTH, MODEL_HEIGHT));
        } else {
            rawMaps.push(map);
        }
    }

    let fused = fuseInLogitSpace(rawMaps);
    fused = applyCenterBias(fused, MODEL_WIDTH, MODEL_HEIGHT, 0.4);
    fused = applyBlur(fused, MODEL_WIDTH, MODEL_HEIGHT, 5);
    fused = normalizeMap(fused);

    return { map: fused, width: MODEL_WIDTH, height: MODEL_HEIGHT };
};

/**
 * Converts a raw saliency Float32Array to heatmap data points.
 */
const saliencyMapToPoints = (
    data: Float32Array,
    threshold: number
): Array<{ x: number; y: number; value: number }> => {
    const points: Array<{ x: number; y: number; value: number }> = [];
    const h = MODEL_HEIGHT;
    const w = MODEL_WIDTH;

    const step = 3;
    for (let row = 0; row < h; row += step) {
        for (let col = 0; col < w; col += step) {
            const value = data[row * w + col];
            if (value >= threshold) {
                points.push({
                    x: (col / w) * 100,
                    y: (row / h) * 100,
                    value,
                });
            }
        }
    }

    return points;
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

    // TTA pipeline — same as predictAttention
    const augmentations = generateAugmentations(imagePath);
    const rawMaps: Float32Array[] = [];

    for (let i = 0; i < augmentations.length; i++) {
        const map = await inferSaliencyRaw(sess, augmentations[i]);
        if (i === 1) {
            rawMaps.push(unflipHorizontal(map, MODEL_WIDTH, MODEL_HEIGHT));
        } else {
            rawMaps.push(map);
        }
    }

    let fused = fuseInLogitSpace(rawMaps);
    fused = applyCenterBias(fused, MODEL_WIDTH, MODEL_HEIGHT, 0.4);
    fused = applyBlur(fused, MODEL_WIDTH, MODEL_HEIGHT, 5);
    fused = normalizeMap(fused);

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
