/**
 * Model adapter registry.
 *
 * Each adapter defines how a specific ONNX gaze model preprocesses inputs
 * and parses outputs. The OnnxGazePredictor is model-agnostic — it loads
 * any adapter from this registry.
 *
 * Usage:
 *   import { getAdapter } from './modelAdapters';
 *   const adapter = getAdapter('eth-xgaze');
 *   const predictor = new OnnxGazePredictor(adapter);
 */

import type { ModelAdapter } from '../onnxGazePredictor';
import { ethXGazeAdapter } from './ethXGaze';
import { eyeTheiaAdapter } from './eyeTheia';
import { mobileGazeAdapter } from './mobileGaze';
import { genericFaceGazeAdapter } from './genericFaceGaze';

export type ModelAdapterId = 'eth-xgaze' | 'eyetheia' | 'mobilegaze' | 'generic';

const adapters: Record<ModelAdapterId, ModelAdapter> = {
  'eth-xgaze': ethXGazeAdapter,
  'eyetheia': eyeTheiaAdapter,
  'mobilegaze': mobileGazeAdapter,
  'generic': genericFaceGazeAdapter,
};

export function getAdapter(id: ModelAdapterId): ModelAdapter {
  const adapter = adapters[id];
  if (!adapter) throw new Error(`Unknown model adapter: ${id}`);
  return adapter;
}

/** List all registered adapters with metadata. */
export function listAdapters(): Array<{ id: ModelAdapterId; name: string; modelPath: string; sizeHint: string }> {
  return (Object.entries(adapters) as [ModelAdapterId, ModelAdapter][]).map(([id, a]) => ({
    id, name: a.name, modelPath: a.modelPath, sizeHint: a.sizeHint,
  }));
}

export { ethXGazeAdapter } from './ethXGaze';
export { eyeTheiaAdapter } from './eyeTheia';
export { mobileGazeAdapter } from './mobileGaze';
export { genericFaceGazeAdapter } from './genericFaceGaze';
