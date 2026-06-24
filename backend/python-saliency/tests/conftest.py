"""Shared fixtures for TASED-Net tests."""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pytest

# Allow imports from parent directory
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


@pytest.fixture
def rgb_frame() -> np.ndarray:
    """Single 224x384x3 uint8 RGB frame (gradient pattern)."""
    h, w = 224, 384
    r = np.linspace(0, 255, w, dtype=np.uint8)
    g = np.linspace(0, 255, h, dtype=np.uint8)
    frame = np.zeros((h, w, 3), dtype=np.uint8)
    frame[:, :, 0] = r[np.newaxis, :]
    frame[:, :, 1] = g[:, np.newaxis]
    frame[:, :, 2] = 128
    return frame


@pytest.fixture
def frame_batch(rgb_frame: np.ndarray) -> list[np.ndarray]:
    """List of 15 identical frames (typical video extraction)."""
    return [rgb_frame.copy() for _ in range(15)]


@pytest.fixture
def large_frame_batch(rgb_frame: np.ndarray) -> list[np.ndarray]:
    """List of 40 frames for sliding window tests."""
    return [rgb_frame.copy() for _ in range(40)]


@pytest.fixture
def saliency_map() -> np.ndarray:
    """Synthetic 224x384 saliency map with a single hotspot."""
    h, w = 224, 384
    y, x = np.ogrid[:h, :w]
    cx, cy = w // 2, h // 2
    dist = np.sqrt((x - cx) ** 2 + (y - cy) ** 2)
    peak = np.exp(-dist**2 / (2 * 80**2))
    return peak.astype(np.float32)


@pytest.fixture
def tmp_frames(tmp_path: Path, frame_batch: list[np.ndarray]) -> list[str]:
    """Write frame_batch to disk as PNGs and return paths."""
    import cv2

    paths = []
    for i, frame in enumerate(frame_batch):
        path = tmp_path / f"frame_{i:04d}.png"
        bgr = frame[..., ::-1].copy()
        cv2.imwrite(str(path), bgr)
        paths.append(str(path))
    return paths
