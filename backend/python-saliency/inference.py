"""
Video saliency inference pipeline using TASED-Net v2.

Pure functions for frame loading, preprocessing, sliding-window inference,
and postprocessing. No side effects, no file I/O in core functions.
"""

from __future__ import annotations

import base64
from dataclasses import dataclass
from typing import Callable

import cv2
import numpy as np
import torch
from scipy.ndimage import gaussian_filter

from model import TASED_v2

TEMPORAL_LENGTH = 32
INPUT_HEIGHT = 224
INPUT_WIDTH = 384
GAUSSIAN_SIGMA = 35


@dataclass(frozen=True)
class SaliencyResult:
    """Per-frame saliency map with metadata."""
    timestamp: float
    saliency_map: np.ndarray  # (H, W), float32, [0, 1]


@dataclass(frozen=True)
class InferenceConfig:
    """Inference parameters."""
    output_width: int = INPUT_WIDTH
    output_height: int = INPUT_HEIGHT
    gaussian_sigma: float = GAUSSIAN_SIGMA


# ---------------------------------------------------------------------------
# Frame loading
# ---------------------------------------------------------------------------

def load_frame(path: str) -> np.ndarray:
    """Load a single frame as RGB uint8 (224, 384, 3)."""
    img = cv2.imread(path)
    resized = cv2.resize(img, (INPUT_WIDTH, INPUT_HEIGHT))
    return resized[..., ::-1].copy()  # BGR -> RGB


def load_frames(paths: list[str]) -> list[np.ndarray]:
    """Load multiple frames from disk paths."""
    return [load_frame(p) for p in paths]


# ---------------------------------------------------------------------------
# Padding
# ---------------------------------------------------------------------------

def pad_to_temporal_length(frames: list[np.ndarray]) -> tuple[list[np.ndarray], int]:
    """Pad frame list to TEMPORAL_LENGTH by repeating the last frame.

    Returns padded list and original count.
    """
    original_count = len(frames)
    padding_needed = max(0, TEMPORAL_LENGTH - original_count)
    padded = frames + [frames[-1]] * padding_needed
    return padded, original_count


# ---------------------------------------------------------------------------
# Preprocessing
# ---------------------------------------------------------------------------

def preprocess_clip(frames: list[np.ndarray]) -> torch.Tensor:
    """Convert list of 32 RGB uint8 frames to model input tensor.

    Input:  list of 32 x (224, 384, 3) uint8 arrays
    Output: (1, 3, 32, 224, 384) float32 tensor, normalized to [-1, 1]
    """
    stacked = np.concatenate(frames, axis=-1)  # (224, 384, 96)
    tensor = torch.from_numpy(stacked).permute(2, 0, 1).contiguous().float()
    tensor = tensor.mul_(2.0).sub_(255).div_(255)
    return tensor.view(1, -1, 3, tensor.size(1), tensor.size(2)).permute(0, 2, 1, 3, 4)


# ---------------------------------------------------------------------------
# Postprocessing
# ---------------------------------------------------------------------------

def postprocess_saliency(raw: np.ndarray, sigma: float = GAUSSIAN_SIGMA) -> np.ndarray:
    """Apply gaussian blur and normalize to [0, 1].

    Input:  (H, W) float array from model sigmoid output
    Output: (H, W) float32 in [0, 1]
    """
    scaled = (raw * 255.0).astype(np.int32) / 255.0
    blurred = gaussian_filter(scaled, sigma=sigma)
    peak = np.max(blurred)
    normalized = np.divide(blurred, peak, out=np.zeros_like(blurred), where=peak > 0)
    return normalized.astype(np.float32)


def saliency_to_base64(smap: np.ndarray) -> str:
    """Encode float32 saliency map to base64 string."""
    return base64.b64encode(smap.tobytes()).decode("ascii")


# ---------------------------------------------------------------------------
# Sliding window
# ---------------------------------------------------------------------------

def compute_window_ranges(
    total_frames: int,
    window_size: int = TEMPORAL_LENGTH,
    stride: int = 16,
) -> list[tuple[int, int]]:
    """Compute (start, end) ranges for sliding window inference.

    Single window: total_frames <= window_size
    Multiple windows: stride-based overlap, last window anchored to end
    """
    ranges: list[tuple[int, int]] = []

    start = 0
    while start + window_size <= total_frames:
        ranges.append((start, start + window_size))
        start += stride

    last_start = total_frames - window_size
    last_entry = (last_start, total_frames)
    already_covered = any(r == last_entry for r in ranges)

    return ranges + ([] if already_covered else [last_entry])


def aggregate_overlapping_maps(
    window_maps: list[tuple[range, list[np.ndarray]]],
    total_frames: int,
) -> list[np.ndarray]:
    """Average saliency maps for frames covered by multiple windows."""
    h, w = window_maps[0][1][0].shape
    accumulator = np.zeros((total_frames, h, w), dtype=np.float64)
    counts = np.zeros(total_frames, dtype=np.int32)

    for frame_range, maps in window_maps:
        for i, frame_idx in enumerate(frame_range):
            accumulator[frame_idx] += maps[i]
            counts[frame_idx] += 1

    return [
        (accumulator[i] / counts[i]).astype(np.float32)
        for i in range(total_frames)
    ]


# ---------------------------------------------------------------------------
# Main inference
# ---------------------------------------------------------------------------

@torch.no_grad()
def infer_clip(model: TASED_v2, clip: torch.Tensor, device: torch.device) -> np.ndarray:
    """Run model on a single clip tensor. Returns raw (H, W) saliency."""
    return model(clip.to(device)).cpu().numpy()[0]


def predict_video_saliency(
    model: TASED_v2,
    frame_paths: list[str],
    timestamps: list[float],
    device: torch.device,
    config: InferenceConfig = InferenceConfig(),
    on_progress: Callable[[int, int], None] | None = None,
) -> list[SaliencyResult]:
    """Full pipeline: load frames, run sliding window inference, postprocess.

    Args:
        model: Loaded TASED_v2 model in eval mode.
        frame_paths: Absolute paths to extracted video frames.
        timestamps: Timestamp (seconds) for each frame.
        device: torch device (cpu or cuda).
        config: Output dimensions and gaussian sigma.
        on_progress: Callback(current_frame, total_frames) for progress reporting.

    Returns:
        List of SaliencyResult, one per input frame (not padded frames).
    """
    raw_frames = load_frames(frame_paths)
    total = len(raw_frames)

    # Short videos: pad to 32 frames, single pass
    padded, original_count = pad_to_temporal_length(raw_frames)

    needs_sliding_window = total > TEMPORAL_LENGTH
    results: list[SaliencyResult]

    results = (
        _predict_sliding_window(model, raw_frames, timestamps, device, config, on_progress)
        if needs_sliding_window
        else _predict_single_pass(model, padded, original_count, timestamps, device, config, on_progress)
    )

    return results


def _predict_single_pass(
    model: TASED_v2,
    padded_frames: list[np.ndarray],
    original_count: int,
    timestamps: list[float],
    device: torch.device,
    config: InferenceConfig,
    on_progress: Callable[[int, int], None] | None,
) -> list[SaliencyResult]:
    """Single-pass inference for clips <= 32 frames."""
    clip = preprocess_clip(padded_frames[:TEMPORAL_LENGTH])
    raw_map = infer_clip(model, clip, device)
    processed = postprocess_saliency(raw_map, config.gaussian_sigma)

    results = []
    for i in range(original_count):
        results.append(SaliencyResult(
            timestamp=timestamps[i],
            saliency_map=processed,
        ))
        _notify_progress(on_progress, i + 1, original_count)

    return results


def _predict_sliding_window(
    model: TASED_v2,
    frames: list[np.ndarray],
    timestamps: list[float],
    device: torch.device,
    config: InferenceConfig,
    on_progress: Callable[[int, int], None] | None,
) -> list[SaliencyResult]:
    """Sliding window inference for clips > 32 frames."""
    total = len(frames)
    windows = compute_window_ranges(total)
    window_maps: list[tuple[range, list[np.ndarray]]] = []
    processed_count = 0

    for start, end in windows:
        clip = preprocess_clip(frames[start:end])
        raw_map = infer_clip(model, clip, device)
        processed = postprocess_saliency(raw_map, config.gaussian_sigma)

        frame_range = range(start, end)
        window_maps.append((frame_range, [processed] * (end - start)))

        processed_count += end - start
        _notify_progress(on_progress, min(processed_count, total), total)

    aggregated = aggregate_overlapping_maps(window_maps, total)

    return [
        SaliencyResult(timestamp=timestamps[i], saliency_map=aggregated[i])
        for i in range(total)
    ]


def _notify_progress(
    callback: Callable[[int, int], None] | None,
    current: int,
    total: int,
) -> None:
    """Fire progress callback when present."""
    callback and callback(current, total)
