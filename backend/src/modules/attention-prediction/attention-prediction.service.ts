/**
 * Attention Prediction Service
 * Uses TranSalNet (ONNX) to generate visual saliency maps from images.
 * Input: image file path → Output: heatmap data points [{x, y, value}]
 */

import * as ort from 'onnxruntime-node';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

// Model constants
const MODEL_WIDTH = 384;
const MODEL_HEIGHT = 288;
const IMAGENET_MEAN = [0.485, 0.456, 0.406];
const IMAGENET_STD = [0.229, 0.224, 0.225];

// Singleton session — loaded once, reused for all predictions
let session: ort.InferenceSession | null = null;

/**
 * Resolves the ONNX model path.
 * Looks in backend/models/ relative to the project root.
 */
const getModelPath = (): string => {
    // Try multiple possible locations
    const candidates = [
        path.join(process.cwd(), 'models', 'transalnet_res.onnx'),
        path.join(__dirname, '..', '..', '..', 'models', 'transalnet_res.onnx'),
    ];

    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }

    throw new Error(
        `ONNX model not found. Searched: ${candidates.join(', ')}. ` +
        'Place transalnet_res.onnx in backend/models/'
    );
};

/**
 * Loads the ONNX model session (lazy singleton).
 */
const getSession = async (): Promise<ort.InferenceSession> => {
    if (session) return session;

    const modelPath = getModelPath();
    console.log(`[AttentionPrediction] Loading model from ${modelPath}...`);

    session = await ort.InferenceSession.create(modelPath, {
        executionProviders: ['cpu'],
        graphOptimizationLevel: 'all',
    });

    console.log('[AttentionPrediction] Model loaded successfully');
    console.log('[AttentionPrediction] Input names:', session.inputNames);
    console.log('[AttentionPrediction] Output names:', session.outputNames);

    return session;
};

/**
 * Preprocesses an image for the model.
 * Resizes to 384x288, normalizes with ImageNet mean/std, converts to CHW float32.
 */
const preprocessImage = async (imagePath: string): Promise<ort.Tensor> => {
    // Read and resize image to model dimensions
    const { data, info } = await sharp(imagePath)
        .resize(MODEL_WIDTH, MODEL_HEIGHT, { fit: 'fill' })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const { width, height, channels } = info;
    const pixelCount = width * height;

    // Convert HWC uint8 → CHW float32 with ImageNet normalization
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
 * Generates a saliency prediction for a single image.
 * @param imagePath - Absolute path to the image file
 * @param threshold - Minimum saliency value to include (0-1, default 0.1)
 * @returns Array of heatmap data points in percentage coordinates
 */
export const predictAttention = async (
    imagePath: string,
    threshold: number = 0.5
): Promise<Array<{ x: number; y: number; value: number }>> => {
    if (!fs.existsSync(imagePath)) {
        throw new Error(`Image not found: ${imagePath}`);
    }

    const startTime = Date.now();

    // Load model (cached after first call)
    const sess = await getSession();

    // Preprocess image
    const inputTensor = await preprocessImage(imagePath);

    // Run inference
    const inputName = sess.inputNames[0];
    const results = await sess.run({ [inputName]: inputTensor });
    const outputName = sess.outputNames[0];
    const saliencyMap = results[outputName];

    // Postprocess to heatmap points
    const heatmapData = postprocessSaliencyMap(saliencyMap, threshold);

    const elapsed = Date.now() - startTime;
    console.log(
        `[AttentionPrediction] Processed in ${elapsed}ms — ${heatmapData.length} points above threshold ${threshold}`
    );

    return heatmapData;
};

/**
 * Generates the raw saliency map as a grayscale PNG buffer.
 * Useful for debugging or serving the map as an image.
 */
export const predictAttentionAsImage = async (
    imagePath: string
): Promise<Buffer> => {
    if (!fs.existsSync(imagePath)) {
        throw new Error(`Image not found: ${imagePath}`);
    }

    const sess = await getSession();
    const inputTensor = await preprocessImage(imagePath);
    const inputName = sess.inputNames[0];
    const results = await sess.run({ [inputName]: inputTensor });
    const outputName = sess.outputNames[0];
    const saliencyMap = results[outputName];

    const data = saliencyMap.data as Float32Array;

    // Normalize to 0-255 grayscale
    let maxVal = 0;
    for (let i = 0; i < data.length; i++) {
        if (data[i] > maxVal) maxVal = data[i];
    }

    const uint8Data = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
        uint8Data[i] = maxVal > 0 ? Math.round((data[i] / maxVal) * 255) : 0;
    }

    // Create grayscale PNG with sharp, resize to original-ish dimensions
    return sharp(Buffer.from(uint8Data), {
        raw: { width: MODEL_WIDTH, height: MODEL_HEIGHT, channels: 1 },
    })
        .png()
        .toBuffer();
};
