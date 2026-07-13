/**
 * Model-agnostic ONNX gaze predictor.
 *
 * Loads any gaze estimation ONNX model via a ModelAdapter that defines:
 *   - How to extract crops from video + landmarks (preprocessing)
 *   - ONNX input tensor names, shapes, normalization
 *   - How to parse output tensors into a gaze vector
 *
 * The predictor handles:
 *   - ONNX session lifecycle (load, infer, dispose)
 *   - Calibration (gaze vector → screen coords via affine least squares)
 *   - LOOCV error estimation
 *   - Caching last inference result for sync predict()
 *
 * To add a new model: implement ModelAdapter, register in modelAdapters map.
 */

import type { GazePredictor, GazePredictorInput } from './gazePredictor';

// ---------------------------------------------------------------------------
// ONNX Runtime — lazy loaded
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// ONNX Runtime — loaded from CDN to avoid Vite WASM bundling issues.
// The npm package `onnxruntime-web` has complex WASM worker internals
// that Vite's ESM transform breaks. CDN script sets `window.ort` globally.
// ---------------------------------------------------------------------------

interface OrtModule {
  InferenceSession: {
    create(buffer: ArrayBuffer, options?: Record<string, unknown>): Promise<OrtSession>;
  };
  Tensor: new (type: string, data: Float32Array, dims: number[]) => OrtTensor;
  env: { wasm: { numThreads: number; wasmPaths: string } };
}
interface OrtSession {
  run(feeds: Record<string, OrtTensor>): Promise<Record<string, OrtTensor>>;
}
interface OrtTensor {
  data: Float32Array;
}

let ortLoaded: OrtModule | null = null;

async function loadOrt(): Promise<OrtModule> {
  if (ortLoaded) return ortLoaded;

  // Check if already loaded (e.g. via <script> tag)
  if ((window as unknown as Record<string, unknown>).ort) {
    ortLoaded = (window as unknown as Record<string, unknown>).ort as OrtModule;
    ortLoaded.env.wasm.numThreads = 1;
    return ortLoaded;
  }

  // Load from CDN
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/ort.min.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load onnxruntime-web from CDN'));
    document.head.appendChild(script);
  });

  ortLoaded = (window as unknown as Record<string, unknown>).ort as OrtModule;
  ortLoaded.env.wasm.numThreads = 1;
  return ortLoaded;
}

// ---------------------------------------------------------------------------
// ModelAdapter interface
// ---------------------------------------------------------------------------

/** Context passed to the adapter each frame. */
export interface FrameContext {
  video: HTMLVideoElement;
  landmarks: Array<{ x: number; y: number; z?: number }>;
  /** Head pose [pitch, yaw, roll] in degrees, if available. */
  headPose?: [number, number, number];
}

/** One named ONNX input tensor. */
export interface TensorSpec {
  name: string;
  data: Float32Array;
  dims: number[];
}

/** Parsed model output — a low-dimensional gaze representation. */
export interface GazeVector {
  /** Values used for calibration mapping. Typically [pitch, yaw] or [x, y]. */
  values: number[];
  /** Human-readable labels for each value. */
  labels: string[];
}

/**
 * Adapter for a specific ONNX gaze model.
 *
 * Each model family (ETH-XGaze, EyeTheia, MobileGaze, etc.) implements this
 * interface to handle its unique input format, preprocessing, and output parsing.
 */
export interface ModelAdapter {
  /** Human-readable name. */
  readonly name: string;
  /** Expected ONNX model file path (relative to public/). */
  readonly modelPath: string;
  /** Model size category for UI display. */
  readonly sizeHint: string;

  /**
   * Extract crops from the video frame and prepare ONNX input tensors.
   * Called every frame. Return null to skip inference (bad crop, occluded, etc.).
   */
  prepareInputs(ctx: FrameContext): TensorSpec[] | null;

  /**
   * Parse ONNX output tensors into a gaze vector for calibration/prediction.
   * @param outputs — map of output tensor name → Float32Array
   */
  parseOutput(outputs: Map<string, Float32Array>): GazeVector | null;
}

// ---------------------------------------------------------------------------
// Crop helpers — shared by adapters
// ---------------------------------------------------------------------------

/**
 * Extract a square crop from video, resized to targetSize.
 * Coordinates in pixel space of the video frame.
 */
export function extractCrop(
  video: HTMLVideoElement,
  cx: number, cy: number, halfSide: number,
  targetSize: number,
): ImageData | null {
  const w = video.videoWidth;
  const h = video.videoHeight;
  const x0 = Math.max(0, Math.round(cx - halfSide));
  const y0 = Math.max(0, Math.round(cy - halfSide));
  const side = Math.min(Math.round(halfSide * 2), w - x0, h - y0);
  if (side < 10) return null;

  const canvas = new OffscreenCanvas(targetSize, targetSize);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(video, x0, y0, side, side, 0, 0, targetSize, targetSize);
  return ctx.getImageData(0, 0, targetSize, targetSize);
}

/** Face bounding box from landmarks (normalized → pixels). */
export function faceBboxFromLandmarks(
  landmarks: Array<{ x: number; y: number }>,
  videoW: number, videoH: number,
  margin = 0.2,
): { cx: number; cy: number; halfSide: number } | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const lm of landmarks) {
    const px = lm.x * videoW;
    const py = lm.y * videoH;
    if (px < minX) minX = px; if (py < minY) minY = py;
    if (px > maxX) maxX = px; if (py > maxY) maxY = py;
  }
  const side = Math.max(maxX - minX, maxY - minY) * (1 + margin);
  if (side < 20) return null;
  return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, halfSide: side / 2 };
}

/** Eye center from specific landmark indices (pixel space). */
export function eyeCenterFromLandmarks(
  landmarks: Array<{ x: number; y: number }>,
  innerIdx: number, outerIdx: number, topIdx: number, bottomIdx: number,
  videoW: number, videoH: number,
): { cx: number; cy: number; halfSide: number } | null {
  const inner = landmarks[innerIdx];
  const outer = landmarks[outerIdx];
  const top = landmarks[topIdx];
  const bottom = landmarks[bottomIdx];
  if (!inner || !outer || !top || !bottom) return null;

  const cx = ((inner.x + outer.x) / 2) * videoW;
  const cy = ((top.y + bottom.y) / 2) * videoH;
  const eyeW = Math.abs(inner.x - outer.x) * videoW;
  const halfSide = Math.max(eyeW * 1.5, 30);
  return { cx, cy, halfSide };
}

/**
 * Convert ImageData RGBA → Float32 CHW tensor with per-channel normalization.
 * @param mean — [R, G, B] means (subtracted after /255)
 * @param std — [R, G, B] stds (divided after mean subtraction)
 */
export function imageDataToTensor(
  img: ImageData,
  mean: [number, number, number] = [0, 0, 0],
  std: [number, number, number] = [1, 1, 1],
): Float32Array {
  const { width, height, data } = img;
  const chSize = height * width;
  const tensor = new Float32Array(3 * chSize);
  for (let i = 0; i < chSize; i++) {
    const si = i * 4;
    tensor[i] = (data[si] / 255 - mean[0]) / std[0];
    tensor[chSize + i] = (data[si + 1] / 255 - mean[1]) / std[1];
    tensor[2 * chSize + i] = (data[si + 2] / 255 - mean[2]) / std[2];
  }
  return tensor;
}

// ---------------------------------------------------------------------------
// Affine calibration: gazeVector → screen coords
// ---------------------------------------------------------------------------

interface AffineCalib {
  // screenX = coeffsX[0] + coeffsX[1]*v[0] + coeffsX[2]*v[1] + ...
  coeffsX: number[];
  coeffsY: number[];
}

function fitAffine(
  samples: Array<{ v: number[]; tx: number; ty: number }>,
): AffineCalib {
  const n = samples.length;
  const dim = samples[0].v.length; // typically 2 (pitch, yaw)
  const cols = dim + 1; // +1 for intercept

  if (n < cols) {
    const avgTx = samples.reduce((s, p) => s + p.tx, 0) / n;
    const avgTy = samples.reduce((s, p) => s + p.ty, 0) / n;
    return { coeffsX: [avgTx, ...new Array(dim).fill(0)], coeffsY: [avgTy, ...new Array(dim).fill(0)] };
  }

  // Build X matrix [1, v0, v1, ...]
  const X: number[][] = samples.map(s => [1, ...s.v]);
  // Normal equations: (X^T X)^-1 X^T y — small matrix (cols × cols), direct solve
  const XtX = Array.from({ length: cols }, () => new Array(cols).fill(0));
  const XtYx = new Array(cols).fill(0);
  const XtYy = new Array(cols).fill(0);

  for (let i = 0; i < n; i++) {
    for (let a = 0; a < cols; a++) {
      for (let b = 0; b < cols; b++) XtX[a][b] += X[i][a] * X[i][b];
      XtYx[a] += X[i][a] * samples[i].tx;
      XtYy[a] += X[i][a] * samples[i].ty;
    }
  }

  // Add small regularization for stability
  for (let i = 0; i < cols; i++) XtX[i][i] += 1e-6;

  // Gauss-Jordan invert XtX
  const aug = XtX.map((row, i) => {
    const id = new Array(cols).fill(0); id[i] = 1;
    return [...row, ...id];
  });
  for (let col = 0; col < cols; col++) {
    let maxR = col;
    for (let r = col + 1; r < cols; r++) if (Math.abs(aug[r][col]) > Math.abs(aug[maxR][col])) maxR = r;
    [aug[col], aug[maxR]] = [aug[maxR], aug[col]];
    const pivot = aug[col][col];
    if (Math.abs(pivot) < 1e-12) continue;
    for (let j = 0; j < 2 * cols; j++) aug[col][j] /= pivot;
    for (let r = 0; r < cols; r++) {
      if (r === col) continue;
      const f = aug[r][col];
      for (let j = 0; j < 2 * cols; j++) aug[r][j] -= f * aug[col][j];
    }
  }
  const inv = aug.map(row => row.slice(cols));

  const coeffsX = inv.map(row => row.reduce((s, v, j) => s + v * XtYx[j], 0));
  const coeffsY = inv.map(row => row.reduce((s, v, j) => s + v * XtYy[j], 0));

  return { coeffsX, coeffsY };
}

function applyAffine(calib: AffineCalib, v: number[]): [number, number] {
  let x = calib.coeffsX[0];
  let y = calib.coeffsY[0];
  for (let i = 0; i < v.length; i++) {
    x += calib.coeffsX[i + 1] * v[i];
    y += calib.coeffsY[i + 1] * v[i];
  }
  return [x, y];
}

// ---------------------------------------------------------------------------
// OnnxGazePredictor — model-agnostic
// ---------------------------------------------------------------------------

export class OnnxGazePredictor implements GazePredictor {
  get name(): string { return `ONNX:${this.adapter.name}`; }

  private readonly adapter: ModelAdapter;
  private session: OrtSession | null = null;
  private calibSamples: Array<{ v: number[]; tx: number; ty: number }> = [];
  private calib: AffineCalib | null = null;
  private _ready = false;
  private lastGaze: number[] = [0, 0];

  /** Set by hook each frame — adapter reads these via FrameContext. */
  videoRef: HTMLVideoElement | null = null;
  landmarks: Array<{ x: number; y: number; z?: number }> | null = null;
  headPose: [number, number, number] | undefined = undefined;

  constructor(adapter: ModelAdapter) {
    this.adapter = adapter;
  }

  async loadModel(): Promise<void> {
    if (this.session) return;
    console.log(`[OnnxGaze] Loading ORT from CDN...`);
    const ortMod = await loadOrt();
    console.log(`[OnnxGaze] ORT ready. Fetching model: ${this.adapter.modelPath}`);

    const response = await fetch(this.adapter.modelPath);
    if (!response.ok) throw new Error(`Failed to fetch model: ${response.status} ${this.adapter.modelPath}`);
    const buffer = await response.arrayBuffer();
    console.log(`[OnnxGaze] Model fetched: ${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB. Creating session...`);

    this.session = await ortMod.InferenceSession.create(buffer, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    } as Record<string, unknown>);
    console.log(`[OnnxGaze] Session created. Model ready.`);
  }

  private infer(): number[] | null {
    if (!this.session || !this.videoRef || !this.landmarks) return null;

    const ctx: FrameContext = {
      video: this.videoRef,
      landmarks: this.landmarks,
      headPose: this.headPose,
    };

    const inputs = this.adapter.prepareInputs(ctx);
    if (!inputs) return null;

    const ortMod = ortLoaded!;
    const feeds: Record<string, OrtTensor> = {};
    for (const spec of inputs) {
      feeds[spec.name] = new ortMod.Tensor('float32', spec.data, spec.dims);
    }

    // Async inference with cached result for sync predict()
    void this.session.run(feeds).then(results => {
      const outputMap = new Map<string, Float32Array>();
      for (const [key, tensor] of Object.entries(results)) {
        outputMap.set(key, tensor.data as Float32Array);
      }
      const parsed = this.adapter.parseOutput(outputMap);
      if (parsed) this.lastGaze = parsed.values;
    });

    return this.lastGaze;
  }

  // -- GazePredictor interface --

  addCalibrationSample(_input: GazePredictorInput, target: [number, number]): void {
    const gaze = this.infer();
    if (!gaze) return;
    this.calibSamples.push({ v: [...gaze], tx: target[0], ty: target[1] });
  }

  async train(): Promise<void> {
    if (this.calibSamples.length < 2) return;
    this.calib = fitAffine(this.calibSamples);
    this._ready = true;
  }

  predict(/* _input */): [number, number] {
    if (!this.calib) return [0, 0];
    const gaze = this.infer() ?? this.lastGaze;
    const [x, y] = applyAffine(this.calib, gaze);
    return [
      Math.max(0, Math.min(window.innerWidth, x)),
      Math.max(0, Math.min(window.innerHeight, y)),
    ];
  }

  isReady(): boolean {
    return this._ready && this.session !== null;
  }

  get sampleCount(): number {
    return this.calibSamples.length;
  }

  get cvRmsePx(): number | null {
    if (this.calibSamples.length < 4 || !this.calib) return null;
    let totalSqErr = 0;
    for (let i = 0; i < this.calibSamples.length; i++) {
      const held = this.calibSamples[i];
      const rest = this.calibSamples.filter((_, j) => j !== i);
      const tempCalib = fitAffine(rest);
      const [px, py] = applyAffine(tempCalib, held.v);
      totalSqErr += (px - held.tx) ** 2 + (py - held.ty) ** 2;
    }
    return Math.sqrt(totalSqErr / this.calibSamples.length);
  }

  get diagnostics(): unknown {
    return {
      adapter: this.adapter.name,
      modelPath: this.adapter.modelPath,
      calibSamples: this.calibSamples.length,
      calib: this.calib,
      lastGaze: this.lastGaze,
    };
  }
}
