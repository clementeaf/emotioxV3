const express = require('express');
const multer = require('multer');
const ort = require('onnxruntime-node');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 8080;
const SECRET = process.env.SALIENCY_SECRET || 'emotiox-saliency-2026';
const MODEL_FILE = process.env.SALIENCY_MODEL || 'transalnet_res.onnx';
const MODEL_WIDTH = parseInt(process.env.SALIENCY_WIDTH || '384', 10);
const MODEL_HEIGHT = parseInt(process.env.SALIENCY_HEIGHT || '288', 10);
const IMAGENET_MEAN = [0.485, 0.456, 0.406];
const IMAGENET_STD = [0.229, 0.224, 0.225];

let session = null;

async function getSession() {
  if (session) return session;
  const modelPath = path.join(__dirname, 'models', MODEL_FILE);
  if (!fs.existsSync(modelPath)) throw new Error(`Model not found: ${modelPath}`);
  console.log(`[Saliency] Loading ${MODEL_FILE}...`);
  const start = Date.now();
  session = await ort.InferenceSession.create(modelPath, {
    executionProviders: ['cpu'],
    graphOptimizationLevel: 'all',
    intraOpNumThreads: 2,
    interOpNumThreads: 1,
  });
  console.log(`[Saliency] Model loaded in ${Date.now() - start}ms`);
  return session;
}

async function preprocess(buffer) {
  const { data, info } = await sharp(buffer)
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
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const app = express();

app.post('/predict', upload.single('image'), async (req, res) => {
  if (req.headers['x-saliency-secret'] !== SECRET) {
    return res.status(403).json({ error: 'Invalid secret' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }

  try {
    const start = Date.now();
    const sess = await getSession();
    const inputTensor = await preprocess(req.file.buffer);
    const results = await sess.run({ [sess.inputNames[0]]: inputTensor });
    const map = results[sess.outputNames[0]].data;

    const mapBase64 = Buffer.from(map.buffer).toString('base64');
    console.log(`[Saliency] Predicted in ${Date.now() - start}ms`);

    res.json({
      map: mapBase64,
      width: MODEL_WIDTH,
      height: MODEL_HEIGHT,
    });
  } catch (err) {
    console.error('[Saliency] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (_, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`[Saliency] Listening on :${PORT}`));
