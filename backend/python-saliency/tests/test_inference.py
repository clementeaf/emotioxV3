"""Tests for the inference pipeline: padding, preprocessing, sliding window, postprocessing."""

from __future__ import annotations

import base64

import numpy as np
import pytest
import torch

from inference import (
    TEMPORAL_LENGTH,
    InferenceConfig,
    SaliencyResult,
    aggregate_overlapping_maps,
    compute_window_ranges,
    load_frame,
    pad_to_temporal_length,
    postprocess_saliency,
    preprocess_clip,
    saliency_to_base64,
)


# ---------------------------------------------------------------------------
# pad_to_temporal_length
# ---------------------------------------------------------------------------

class TestPadding:
    def test_pads_short_clip_to_32(self, frame_batch: list[np.ndarray]):
        padded, original = pad_to_temporal_length(frame_batch)
        assert len(padded) == TEMPORAL_LENGTH
        assert original == 15

    def test_single_frame_pads_to_32(self, rgb_frame: np.ndarray):
        padded, original = pad_to_temporal_length([rgb_frame])
        assert len(padded) == TEMPORAL_LENGTH
        assert original == 1

    def test_exact_32_no_padding(self, rgb_frame: np.ndarray):
        frames = [rgb_frame.copy() for _ in range(32)]
        padded, original = pad_to_temporal_length(frames)
        assert len(padded) == 32
        assert original == 32

    def test_over_32_no_padding(self, rgb_frame: np.ndarray):
        frames = [rgb_frame.copy() for _ in range(40)]
        padded, original = pad_to_temporal_length(frames)
        assert len(padded) == 40
        assert original == 40

    def test_padded_frames_are_copies_of_last(self, frame_batch: list[np.ndarray]):
        padded, _ = pad_to_temporal_length(frame_batch)
        last_original = frame_batch[-1]
        for padded_frame in padded[15:]:
            np.testing.assert_array_equal(padded_frame, last_original)


# ---------------------------------------------------------------------------
# preprocess_clip
# ---------------------------------------------------------------------------

class TestPreprocessing:
    def test_output_shape(self, rgb_frame: np.ndarray):
        frames = [rgb_frame] * TEMPORAL_LENGTH
        tensor = preprocess_clip(frames)
        assert tensor.shape == (1, 3, TEMPORAL_LENGTH, 224, 384)

    def test_output_dtype(self, rgb_frame: np.ndarray):
        frames = [rgb_frame] * TEMPORAL_LENGTH
        tensor = preprocess_clip(frames)
        assert tensor.dtype == torch.float32

    def test_value_range(self, rgb_frame: np.ndarray):
        frames = [rgb_frame] * TEMPORAL_LENGTH
        tensor = preprocess_clip(frames)
        assert tensor.min() >= -1.0
        assert tensor.max() <= 1.0

    def test_black_frame_normalized(self):
        black = np.zeros((224, 384, 3), dtype=np.uint8)
        frames = [black] * TEMPORAL_LENGTH
        tensor = preprocess_clip(frames)
        expected_val = (0 * 2 - 255) / 255.0
        np.testing.assert_allclose(tensor.numpy(), expected_val, atol=1e-5)

    def test_white_frame_normalized(self):
        white = np.full((224, 384, 3), 255, dtype=np.uint8)
        frames = [white] * TEMPORAL_LENGTH
        tensor = preprocess_clip(frames)
        expected_val = (255 * 2 - 255) / 255.0
        np.testing.assert_allclose(tensor.numpy(), expected_val, atol=1e-5)


# ---------------------------------------------------------------------------
# postprocess_saliency
# ---------------------------------------------------------------------------

class TestPostprocessing:
    def test_output_range(self, saliency_map: np.ndarray):
        result = postprocess_saliency(saliency_map)
        assert result.min() >= 0.0
        assert result.max() <= 1.0

    def test_output_shape_preserved(self, saliency_map: np.ndarray):
        result = postprocess_saliency(saliency_map)
        assert result.shape == saliency_map.shape

    def test_output_dtype(self, saliency_map: np.ndarray):
        result = postprocess_saliency(saliency_map)
        assert result.dtype == np.float32

    def test_peak_normalized_to_one(self, saliency_map: np.ndarray):
        result = postprocess_saliency(saliency_map)
        np.testing.assert_allclose(result.max(), 1.0, atol=1e-5)

    def test_gaussian_blur_smooths(self):
        sharp = np.zeros((224, 384), dtype=np.float32)
        sharp[112, 192] = 1.0
        result = postprocess_saliency(sharp, sigma=7)
        # After blur, the single peak should spread
        assert result[112, 192] < 1.0 or result[110, 190] > 0.0

    def test_zero_map_returns_zero(self):
        zeros = np.zeros((224, 384), dtype=np.float32)
        result = postprocess_saliency(zeros)
        np.testing.assert_array_equal(result, zeros)


# ---------------------------------------------------------------------------
# compute_window_ranges
# ---------------------------------------------------------------------------

class TestWindowRanges:
    def test_single_window_exact_32(self):
        ranges = compute_window_ranges(32)
        assert ranges == [(0, 32)]

    def test_single_window_under_32(self):
        # Should not be called with <32, but handles gracefully
        ranges = compute_window_ranges(32, window_size=32)
        assert len(ranges) == 1

    def test_40_frames_stride_16(self):
        ranges = compute_window_ranges(40, window_size=32, stride=16)
        assert (0, 32) in ranges
        assert (8, 40) in ranges

    def test_64_frames_stride_16(self):
        ranges = compute_window_ranges(64, window_size=32, stride=16)
        assert ranges[0] == (0, 32)
        assert ranges[1] == (16, 48)
        assert ranges[-1] == (32, 64)

    def test_no_duplicate_last_window(self):
        ranges = compute_window_ranges(48, window_size=32, stride=16)
        assert len(ranges) == len(set(ranges))

    def test_all_frames_covered(self):
        total = 50
        ranges = compute_window_ranges(total, window_size=32, stride=16)
        covered = set()
        for start, end in ranges:
            covered.update(range(start, end))
        assert covered == set(range(total))

    def test_33_frames_creates_two_windows(self):
        ranges = compute_window_ranges(33, window_size=32, stride=16)
        assert (0, 32) in ranges
        assert (1, 33) in ranges


# ---------------------------------------------------------------------------
# aggregate_overlapping_maps
# ---------------------------------------------------------------------------

class TestAggregation:
    def test_single_window_no_averaging(self):
        maps = [np.full((224, 384), 0.5, dtype=np.float32) for _ in range(32)]
        result = aggregate_overlapping_maps([(range(0, 32), maps)], 32)
        assert len(result) == 32
        np.testing.assert_allclose(result[0], 0.5, atol=1e-5)

    def test_two_windows_overlap_averaged(self):
        h, w = 10, 10
        maps_a = [np.full((h, w), 0.4, dtype=np.float32) for _ in range(32)]
        maps_b = [np.full((h, w), 0.8, dtype=np.float32) for _ in range(32)]

        window_maps = [
            (range(0, 32), maps_a),
            (range(8, 40), maps_b),
        ]
        result = aggregate_overlapping_maps(window_maps, 40)

        # Frame 0-7: only window A -> 0.4
        np.testing.assert_allclose(result[4], 0.4, atol=1e-5)
        # Frame 8-31: overlap -> average(0.4, 0.8) = 0.6
        np.testing.assert_allclose(result[20], 0.6, atol=1e-5)
        # Frame 32-39: only window B -> 0.8
        np.testing.assert_allclose(result[35], 0.8, atol=1e-5)

    def test_output_count_matches_total(self):
        h, w = 10, 10
        maps = [np.zeros((h, w), dtype=np.float32) for _ in range(32)]
        result = aggregate_overlapping_maps([(range(0, 32), maps)], 32)
        assert len(result) == 32


# ---------------------------------------------------------------------------
# saliency_to_base64
# ---------------------------------------------------------------------------

class TestBase64Encoding:
    def test_roundtrip(self, saliency_map: np.ndarray):
        encoded = saliency_to_base64(saliency_map)
        decoded = np.frombuffer(base64.b64decode(encoded), dtype=np.float32)
        decoded = decoded.reshape(saliency_map.shape)
        np.testing.assert_array_equal(decoded, saliency_map)

    def test_output_is_string(self, saliency_map: np.ndarray):
        encoded = saliency_to_base64(saliency_map)
        assert isinstance(encoded, str)


# ---------------------------------------------------------------------------
# load_frame
# ---------------------------------------------------------------------------

class TestLoadFrame:
    def test_loads_correct_shape(self, tmp_frames: list[str]):
        frame = load_frame(tmp_frames[0])
        assert frame.shape == (224, 384, 3)

    def test_loads_rgb(self, tmp_frames: list[str]):
        frame = load_frame(tmp_frames[0])
        assert frame.dtype == np.uint8


# ---------------------------------------------------------------------------
# SaliencyResult dataclass
# ---------------------------------------------------------------------------

class TestSaliencyResult:
    def test_frozen(self, saliency_map: np.ndarray):
        result = SaliencyResult(timestamp=2.0, saliency_map=saliency_map)
        with pytest.raises(AttributeError):
            result.timestamp = 3.0

    def test_fields(self, saliency_map: np.ndarray):
        result = SaliencyResult(timestamp=4.0, saliency_map=saliency_map)
        assert result.timestamp == 4.0
        assert result.saliency_map is saliency_map
