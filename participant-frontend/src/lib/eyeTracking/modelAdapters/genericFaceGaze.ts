/**
 * Generic face→gaze ModelAdapter
 *
 * Works with any ONNX model that:
 *   - Takes a single face crop (any size — defaults to 112×112)
 *   - Outputs [pitch, yaw] or [x, y] as a 1×2 tensor
 *   - Uses [0,1] normalization (no ImageNet stats)
 *
 * This is the fallback adapter for unknown/custom models.
 * The placeholder model at /models/gaze_estimator.onnx uses this adapter.
 */

import type { ModelAdapter, FrameContext, TensorSpec, GazeVector } from '../onnxGazePredictor';
import { faceBboxFromLandmarks, extractCrop, imageDataToTensor } from '../onnxGazePredictor';

const CROP_SIZE = 112;

export const genericFaceGazeAdapter: ModelAdapter = {
  name: 'Generic',
  modelPath: '/models/gaze_estimator.onnx',
  sizeHint: '~93KB (placeholder)',

  prepareInputs(ctx: FrameContext): TensorSpec[] | null {
    const bbox = faceBboxFromLandmarks(ctx.landmarks, ctx.video.videoWidth, ctx.video.videoHeight, 0.2);
    if (!bbox) return null;

    const crop = extractCrop(ctx.video, bbox.cx, bbox.cy, bbox.halfSide, CROP_SIZE);
    if (!crop) return null;

    const tensor = imageDataToTensor(crop);
    return [{ name: 'face', data: tensor, dims: [1, 3, CROP_SIZE, CROP_SIZE] }];
  },

  parseOutput(outputs: Map<string, Float32Array>): GazeVector | null {
    const output = outputs.get('gaze') ?? outputs.values().next().value;
    if (!output || output.length < 2) return null;
    return { values: [output[0], output[1]], labels: ['v0', 'v1'] };
  },
};
