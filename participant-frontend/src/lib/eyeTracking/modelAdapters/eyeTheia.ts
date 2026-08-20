/**
 * EyeTheia ModelAdapter (iTracker-inspired)
 *
 * Model: Multi-input CNN (shared eye CNN + face CNN + face grid FC).
 * Inputs: left_eye 1×3×224×224, right_eye 1×3×224×224,
 *         face 1×3×224×224, face_grid 1×625 (25×25 flattened).
 * Output: 1×2 [x, y] in cm from camera (not angles).
 * Size:   ~16MB (ONNX estimated).
 * MAE:    ~2.5cm laptop, <1.5cm with 13-point fine-tuning.
 *
 * Export .pth → .onnx:
 *   python3 -c "
 *   import torch
 *   from model import ITrackerModel
 *   net = ITrackerModel()
 *   net.load_state_dict(torch.load('eyetheia_best.pth'))
 *   net.eval()
 *   torch.onnx.export(net,
 *     (torch.randn(1,3,224,224), torch.randn(1,3,224,224),
 *      torch.randn(1,3,224,224), torch.randn(1,625)),
 *     'eyetheia.onnx',
 *     input_names=['left_eye','right_eye','face','face_grid'],
 *     output_names=['gaze'], opset_version=13)
 *   "
 *
 * License: CAPES-COFECUB / Research
 */

import type { ModelAdapter, FrameContext, TensorSpec, GazeVector } from '../onnxGazePredictor';
import { faceBboxFromLandmarks, eyeCenterFromLandmarks, extractCrop, imageDataToTensor } from '../onnxGazePredictor';

const CROP_SIZE = 224;
const GRID_SIZE = 25;
const NORM_MEAN: [number, number, number] = [0.485, 0.456, 0.406];
const NORM_STD: [number, number, number] = [0.229, 0.224, 0.225];

// MediaPipe landmark indices for eye corners
const LEFT_EYE = { inner: 133, outer: 33, top: 159, bottom: 145 };
const RIGHT_EYE = { inner: 362, outer: 263, top: 386, bottom: 374 };

/** Build 25×25 binary face grid: 1 where face is, 0 elsewhere. */
function buildFaceGrid(
  landmarks: Array<{ x: number; y: number }>,
  videoW: number, videoH: number,
): Float32Array {
  const bbox = faceBboxFromLandmarks(landmarks, videoW, videoH, 0);
  if (!bbox) return new Float32Array(GRID_SIZE * GRID_SIZE);

  const grid = new Float32Array(GRID_SIZE * GRID_SIZE);
  const x0 = (bbox.cx - bbox.halfSide) / videoW;
  const y0 = (bbox.cy - bbox.halfSide) / videoH;
  const x1 = (bbox.cx + bbox.halfSide) / videoW;
  const y1 = (bbox.cy + bbox.halfSide) / videoH;

  for (let r = 0; r < GRID_SIZE; r++) {
    const gy = r / GRID_SIZE;
    for (let c = 0; c < GRID_SIZE; c++) {
      const gx = c / GRID_SIZE;
      grid[r * GRID_SIZE + c] = (gx >= x0 && gx <= x1 && gy >= y0 && gy <= y1) ? 1 : 0;
    }
  }
  return grid;
}

export const eyeTheiaAdapter: ModelAdapter = {
  name: 'EyeTheia',
  modelPath: '/models/eyetheia.onnx',
  sizeHint: '~16MB',

  prepareInputs(ctx: FrameContext): TensorSpec[] | null {
    const w = ctx.video.videoWidth;
    const h = ctx.video.videoHeight;

    // Face crop
    const faceBbox = faceBboxFromLandmarks(ctx.landmarks, w, h, 0.1);
    if (!faceBbox) return null;
    const faceCrop = extractCrop(ctx.video, faceBbox.cx, faceBbox.cy, faceBbox.halfSide, CROP_SIZE);
    if (!faceCrop) return null;

    // Left eye crop
    const leftEyeBox = eyeCenterFromLandmarks(ctx.landmarks, LEFT_EYE.inner, LEFT_EYE.outer, LEFT_EYE.top, LEFT_EYE.bottom, w, h);
    if (!leftEyeBox) return null;
    const leftCrop = extractCrop(ctx.video, leftEyeBox.cx, leftEyeBox.cy, leftEyeBox.halfSide, CROP_SIZE);
    if (!leftCrop) return null;

    // Right eye crop
    const rightEyeBox = eyeCenterFromLandmarks(ctx.landmarks, RIGHT_EYE.inner, RIGHT_EYE.outer, RIGHT_EYE.top, RIGHT_EYE.bottom, w, h);
    if (!rightEyeBox) return null;
    const rightCrop = extractCrop(ctx.video, rightEyeBox.cx, rightEyeBox.cy, rightEyeBox.halfSide, CROP_SIZE);
    if (!rightCrop) return null;

    // Face grid
    const faceGrid = buildFaceGrid(ctx.landmarks, w, h);

    return [
      { name: 'left_eye', data: imageDataToTensor(leftCrop, NORM_MEAN, NORM_STD), dims: [1, 3, CROP_SIZE, CROP_SIZE] },
      { name: 'right_eye', data: imageDataToTensor(rightCrop, NORM_MEAN, NORM_STD), dims: [1, 3, CROP_SIZE, CROP_SIZE] },
      { name: 'face', data: imageDataToTensor(faceCrop, NORM_MEAN, NORM_STD), dims: [1, 3, CROP_SIZE, CROP_SIZE] },
      { name: 'face_grid', data: faceGrid, dims: [1, GRID_SIZE * GRID_SIZE] },
    ];
  },

  parseOutput(outputs: Map<string, Float32Array>): GazeVector | null {
    // EyeTheia outputs [x, y] in cm from camera
    const gaze = outputs.get('gaze') ?? outputs.values().next().value;
    if (!gaze || gaze.length < 2) return null;
    // ponytail: cm output is already a 2D gaze representation — affine calibration maps to screen
    return { values: [gaze[0], gaze[1]], labels: ['x_cm', 'y_cm'] };
  },
};
