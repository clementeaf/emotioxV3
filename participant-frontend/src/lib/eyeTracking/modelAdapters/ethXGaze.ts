/**
 * ETH-XGaze ModelAdapter
 *
 * Model: ResNet-18 trained on ETH-XGaze (1M+ images, extreme head poses).
 * Input:  1×3×224×224 face crop, ImageNet normalization.
 * Output: 1×2 [pitch, yaw] in radians.
 * Size:   ~44MB (ONNX), ~22MB (INT8 quantized).
 * MAE:    4.5° without calibration, <3° with per-user affine calibration.
 *
 * Export .pth → .onnx:
 *   python3 -c "
 *   import torch
 *   from model import GazeNet  # from ETH-XGaze repo
 *   net = GazeNet(num_out=2)
 *   net.load_state_dict(torch.load('epoch_24_ckpt.pth.tar')['model_state'])
 *   net.eval()
 *   torch.onnx.export(net, torch.randn(1,3,224,224), 'ethxgaze_resnet18.onnx',
 *     input_names=['face'], output_names=['gaze'], opset_version=13)
 *   "
 *
 * License: CC BY-NC-SA 4.0
 */

import type { ModelAdapter, FrameContext, TensorSpec, GazeVector } from '../onnxGazePredictor';
import { faceBboxFromLandmarks, extractCrop, imageDataToTensor } from '../onnxGazePredictor';

const CROP_SIZE = 224;
const IMAGENET_MEAN: [number, number, number] = [0.485, 0.456, 0.406];
const IMAGENET_STD: [number, number, number] = [0.229, 0.224, 0.225];

export const ethXGazeAdapter: ModelAdapter = {
  name: 'ETH-XGaze',
  modelPath: '/models/ethxgaze_resnet18.onnx',
  sizeHint: '~44MB',

  prepareInputs(ctx: FrameContext): TensorSpec[] | null {
    const bbox = faceBboxFromLandmarks(ctx.landmarks, ctx.video.videoWidth, ctx.video.videoHeight, 0.2);
    if (!bbox) return null;

    const crop = extractCrop(ctx.video, bbox.cx, bbox.cy, bbox.halfSide, CROP_SIZE);
    if (!crop) return null;

    const tensor = imageDataToTensor(crop, IMAGENET_MEAN, IMAGENET_STD);
    return [{ name: 'face', data: tensor, dims: [1, 3, CROP_SIZE, CROP_SIZE] }];
  },

  parseOutput(outputs: Map<string, Float32Array>): GazeVector | null {
    // ETH-XGaze outputs a single tensor 'gaze' with [pitch, yaw] in radians
    const gaze = outputs.get('gaze') ?? outputs.values().next().value;
    if (!gaze || gaze.length < 2) return null;
    return { values: [gaze[0], gaze[1]], labels: ['pitch', 'yaw'] };
  },
};
