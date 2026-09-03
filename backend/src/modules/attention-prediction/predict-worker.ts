import * as ort from 'onnxruntime-node';
import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';

const MODEL_FILE = process.env.SALIENCY_MODEL || 'transalnet_res.onnx';
const MODEL_WIDTH = parseInt(process.env.SALIENCY_WIDTH || '384', 10);
const MODEL_HEIGHT = parseInt(process.env.SALIENCY_HEIGHT || '288', 10);
const IMAGENET_MEAN = [0.485, 0.456, 0.406];
const IMAGENET_STD = [0.229, 0.224, 0.225];

const getModelPath = (): string => {
    const candidates = [
        path.join(process.cwd(), 'models', MODEL_FILE),
        path.join(__dirname, '..', '..', '..', 'models', MODEL_FILE),
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }
    throw new Error(`ONNX model not found: ${MODEL_FILE}`);
};

const preprocess = async (imagePath: string): Promise<ort.Tensor> => {
    const { data, info } = await sharp(imagePath)
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .toColorspace('srgb')
        .resize(MODEL_WIDTH, MODEL_HEIGHT, { fit: 'fill' })
        .raw()
        .toBuffer({ resolveWithObject: true });

    const pixels = info.width * info.height;
    const float32 = new Float32Array(3 * pixels);
    for (let i = 0; i < pixels; i++) {
        float32[i] = (data[i * 3] / 255 - IMAGENET_MEAN[0]) / IMAGENET_STD[0];
        float32[pixels + i] = (data[i * 3 + 1] / 255 - IMAGENET_MEAN[1]) / IMAGENET_STD[1];
        float32[2 * pixels + i] = (data[i * 3 + 2] / 255 - IMAGENET_MEAN[2]) / IMAGENET_STD[2];
    }
    return new ort.Tensor('float32', float32, [1, 3, MODEL_HEIGHT, MODEL_WIDTH]);
};

(async () => {
    const imagePath = process.argv[2];
    if (!imagePath || !fs.existsSync(imagePath)) {
        process.send?.({ error: `Image not found: ${imagePath}` });
        process.exit(1);
    }

    try {
        const modelPath = getModelPath();
        const session = await ort.InferenceSession.create(modelPath, {
            executionProviders: ['cpu'],
            graphOptimizationLevel: 'all',
            intraOpNumThreads: 2,
            interOpNumThreads: 1,
        });

        const inputTensor = await preprocess(imagePath);
        const results = await session.run({ [session.inputNames[0]]: inputTensor });
        const map = results[session.outputNames[0]].data as Float32Array;

        await session.release();

        process.send?.({
            map: Buffer.from(map.buffer).toString('base64'),
            width: MODEL_WIDTH,
            height: MODEL_HEIGHT,
        });
    } catch (err) {
        process.send?.({ error: err instanceof Error ? err.message : 'Prediction failed' });
    }

    process.exit(0);
})();
