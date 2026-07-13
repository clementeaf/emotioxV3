/**
 * MobileGaze ModelAdapter
 *
 * Model: MobileNetV2 trained on Gaze360 with 90-bin classification.
 * Input:  1×3×224×224 face crop, [0,1] normalization (no ImageNet stats).
 * Output: 1×180 (90 pitch bins + 90 yaw bins) — softmax → expectation → angle.
 * Size:   ~9MB (ONNX).
 * MAE:    ~13° on Gaze360 (full 360° range — not optimized for webcam).
 *
 * Download:
 *   https://github.com/yakhyo/gaze-estimation/releases
 *   File: mobilenetv2_gaze360.onnx → rename to /models/mobilegaze_v2.onnx
 *
 * License: MIT
 */

import type { ModelAdapter, FrameContext, TensorSpec, GazeVector } from '../onnxGazePredictor';
import { faceBboxFromLandmarks, extractCrop, imageDataToTensor } from '../onnxGazePredictor';

const CROP_SIZE = 224;
const NUM_BINS = 90;
const BIN_WIDTH = 4; // degrees per bin (360° / 90 bins)
/** Decode binned classification → angle in radians via softmax expectation. */
function decodeBins(logits: Float32Array, offset: number): number {
  // Softmax
  let maxVal = -Infinity;
  for (let i = 0; i < NUM_BINS; i++) maxVal = Math.max(maxVal, logits[offset + i]);
  let sumExp = 0;
  const probs = new Float32Array(NUM_BINS);
  for (let i = 0; i < NUM_BINS; i++) {
    probs[i] = Math.exp(logits[offset + i] - maxVal);
    sumExp += probs[i];
  }
  for (let i = 0; i < NUM_BINS; i++) probs[i] /= sumExp;

  // Expectation → angle in degrees → radians
  let angle = 0;
  for (let i = 0; i < NUM_BINS; i++) {
    angle += probs[i] * (i * BIN_WIDTH + BIN_WIDTH / 2 - 180);
  }
  return angle * Math.PI / 180;
}

export const mobileGazeAdapter: ModelAdapter = {
  name: 'MobileGaze',
  modelPath: '/models/mobilegaze_v2.onnx',
  sizeHint: '~9MB',

  prepareInputs(ctx: FrameContext): TensorSpec[] | null {
    const bbox = faceBboxFromLandmarks(ctx.landmarks, ctx.video.videoWidth, ctx.video.videoHeight, 0.2);
    if (!bbox) return null;

    const crop = extractCrop(ctx.video, bbox.cx, bbox.cy, bbox.halfSide, CROP_SIZE);
    if (!crop) return null;

    // MobileGaze uses [0,1] normalization — no ImageNet mean/std
    const tensor = imageDataToTensor(crop, [0, 0, 0], [1, 1, 1]);
    return [{ name: 'input', data: tensor, dims: [1, 3, CROP_SIZE, CROP_SIZE] }];
  },

  parseOutput(outputs: Map<string, Float32Array>): GazeVector | null {
    // MobileGaze outputs a single tensor with 180 values: [90 pitch bins, 90 yaw bins]
    const output = outputs.get('output') ?? outputs.values().next().value;
    if (!output || output.length < NUM_BINS * 2) {
      // Fallback: model might output [pitch, yaw] directly (regression variant)
      if (output && output.length === 2) {
        return { values: [output[0], output[1]], labels: ['pitch', 'yaw'] };
      }
      return null;
    }

    const pitch = decodeBins(output, 0);
    const yaw = decodeBins(output, NUM_BINS);
    return { values: [pitch, yaw], labels: ['pitch', 'yaw'] };
  },
};
