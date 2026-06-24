"""Tests for renderer.py — pure functions + integration."""

from __future__ import annotations

import numpy as np
import cv2
import pytest
from pathlib import Path

from renderer import (
    GridCell,
    RenderConfig,
    build_footer,
    build_heatmap,
    compute_grid_cells,
    draw_grid,
    normalize,
    output_dimensions,
    process_frame,
    render_video,
    rotated_dims,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def uniform_14x14():
    return np.ones((14, 14), dtype=np.float32)


@pytest.fixture
def gradient_14x14():
    y = np.linspace(1, 0, 14, dtype=np.float32)
    x = np.linspace(1, 0, 14, dtype=np.float32)
    return np.outer(y, x)


@pytest.fixture
def gradient_300x300():
    y = np.linspace(1, 0, 300, dtype=np.float32)
    x = np.linspace(1, 0, 300, dtype=np.float32)
    return np.outer(y, x)


@pytest.fixture
def bgr_frame():
    return np.random.randint(0, 256, (240, 320, 3), dtype=np.uint8)


@pytest.fixture
def mock_extractor():
    """Returns a fixed top-left gradient attention map."""
    def _extract(image):
        y = np.linspace(1, 0, 14, dtype=np.float32)
        x = np.linspace(1, 0, 14, dtype=np.float32)
        return np.outer(y, x)
    return _extract


@pytest.fixture
def tiny_video(tmp_path):
    """10-frame 160x120 synthetic video."""
    path = str(tmp_path / "test.mp4")
    writer = cv2.VideoWriter(path, cv2.VideoWriter_fourcc(*"mp4v"), 10, (160, 120))
    for i in range(10):
        frame = np.full((120, 160, 3), i * 25, dtype=np.uint8)
        writer.write(frame)
    writer.release()
    return path


@pytest.fixture
def tiny_logo(tmp_path):
    """40x80 red logo PNG with alpha channel."""
    path = str(tmp_path / "logo.png")
    logo = np.zeros((40, 80, 4), dtype=np.uint8)
    logo[:, :, 2] = 200  # red channel
    logo[:, :, 3] = 255  # fully opaque
    cv2.imwrite(path, logo)
    return path


# ---------------------------------------------------------------------------
# normalize
# ---------------------------------------------------------------------------

class TestNormalize:
    def test_output_range(self):
        arr = np.array([1.0, 3.0, 5.0])
        result = normalize(arr)
        assert result.min() == pytest.approx(0.0)
        assert result.max() == pytest.approx(1.0)

    def test_constant_returns_zeros(self):
        arr = np.full((5, 5), 3.14)
        result = normalize(arr)
        assert np.all(result == 0)

    def test_preserves_shape(self):
        arr = np.random.rand(14, 14).astype(np.float32)
        assert normalize(arr).shape == (14, 14)

    def test_dtype_float32(self):
        arr = np.array([1.0, 2.0, 3.0])
        assert normalize(arr).dtype == np.float32


# ---------------------------------------------------------------------------
# build_heatmap
# ---------------------------------------------------------------------------

class TestBuildHeatmap:
    def test_colored_shape(self, uniform_14x14):
        colored, _ = build_heatmap(uniform_14x14, 320, 240)
        assert colored.shape == (240, 320, 3)

    def test_resized_shape(self, gradient_14x14):
        _, resized = build_heatmap(gradient_14x14, 100, 80)
        assert resized.shape == (80, 100)

    def test_colored_is_uint8(self, gradient_14x14):
        colored, _ = build_heatmap(gradient_14x14, 100, 100)
        assert colored.dtype == np.uint8

    def test_resized_near_unit_range(self, gradient_14x14):
        """Cubic interpolation can overshoot slightly — allow small ringing."""
        _, resized = build_heatmap(gradient_14x14, 50, 50)
        assert resized.min() >= -0.05
        assert resized.max() <= 1.05


# ---------------------------------------------------------------------------
# compute_grid_cells
# ---------------------------------------------------------------------------

class TestComputeGridCells:
    def test_nine_cells(self, uniform_14x14):
        cells = compute_grid_cells(uniform_14x14, 3, 3)
        assert len(cells) == 9

    def test_labels_q1_to_q9(self, uniform_14x14):
        cells = compute_grid_cells(uniform_14x14, 3, 3)
        labels = [c.label for c in cells]
        assert labels == [f"Q{i}" for i in range(1, 10)]

    def test_percentages_sum_to_100(self, gradient_300x300):
        cells = compute_grid_cells(gradient_300x300, 3, 3)
        total = sum(c.percentage for c in cells)
        assert total == pytest.approx(100.0, abs=1.0)

    def test_uniform_all_positive(self, uniform_14x14):
        """14 not divisible by 3 — last row/col cells are larger. All must be positive."""
        cells = compute_grid_cells(uniform_14x14, 3, 3)
        for cell in cells:
            assert cell.percentage > 0.0

    def test_gradient_q1_highest(self, gradient_300x300):
        cells = compute_grid_cells(gradient_300x300, 3, 3)
        q1 = cells[0]
        for cell in cells[1:]:
            assert q1.percentage > cell.percentage

    def test_custom_grid_4x4(self, uniform_14x14):
        cells = compute_grid_cells(uniform_14x14, 4, 4)
        assert len(cells) == 16
        assert cells[0].label == "Q1"
        assert cells[15].label == "Q16"

    def test_bounds_cover_full_image(self, gradient_300x300):
        cells = compute_grid_cells(gradient_300x300, 3, 3)
        # last row / last col bounds reach image edge
        assert cells[8].bounds[2] == 300  # x2 of Q9
        assert cells[8].bounds[3] == 300  # y2 of Q9

    def test_all_percentages_positive(self, gradient_300x300):
        cells = compute_grid_cells(gradient_300x300, 3, 3)
        for cell in cells:
            assert cell.percentage >= 0.0


# ---------------------------------------------------------------------------
# draw_grid
# ---------------------------------------------------------------------------

class TestDrawGrid:
    def test_preserves_shape(self, bgr_frame):
        attn = np.ones((240, 320), dtype=np.float32)
        cells = compute_grid_cells(attn, 3, 3)
        result = draw_grid(bgr_frame, cells, 3, 3)
        assert result.shape == bgr_frame.shape

    def test_does_not_mutate_input(self, bgr_frame):
        original = bgr_frame.copy()
        attn = np.ones((240, 320), dtype=np.float32)
        cells = compute_grid_cells(attn, 3, 3)
        draw_grid(bgr_frame, cells, 3, 3)
        assert np.array_equal(bgr_frame, original)

    def test_output_differs_from_input(self, bgr_frame):
        attn = np.ones((240, 320), dtype=np.float32)
        cells = compute_grid_cells(attn, 3, 3)
        result = draw_grid(bgr_frame, cells, 3, 3)
        assert not np.array_equal(result, bgr_frame)


# ---------------------------------------------------------------------------
# build_footer
# ---------------------------------------------------------------------------

class TestBuildFooter:
    def test_dimensions_no_logo(self):
        footer = build_footer(640, 100, None)
        assert footer.shape == (100, 640, 3)

    def test_all_black_no_logo(self):
        footer = build_footer(640, 100, None)
        assert np.all(footer == 0)

    def test_with_logo_not_all_black(self, tiny_logo):
        from renderer import load_logo
        logo = load_logo(tiny_logo, 80)
        footer = build_footer(640, 100, logo)
        assert footer.shape == (100, 640, 3)
        assert not np.all(footer == 0)

    def test_dimensions_with_logo(self, tiny_logo):
        from renderer import load_logo
        logo = load_logo(tiny_logo, 80)
        footer = build_footer(400, 80, logo)
        assert footer.shape == (80, 400, 3)


# ---------------------------------------------------------------------------
# rotated_dims
# ---------------------------------------------------------------------------

class TestRotatedDims:
    def test_no_rotation(self):
        assert rotated_dims(320, 240, -1) == (320, 240)

    def test_90_clockwise_swaps(self):
        assert rotated_dims(320, 240, cv2.ROTATE_90_CLOCKWISE) == (240, 320)

    def test_90_counter_swaps(self):
        assert rotated_dims(320, 240, cv2.ROTATE_90_COUNTERCLOCKWISE) == (240, 320)

    def test_180_preserves(self):
        assert rotated_dims(320, 240, cv2.ROTATE_180) == (320, 240)


# ---------------------------------------------------------------------------
# output_dimensions
# ---------------------------------------------------------------------------

class TestOutputDimensions:
    def test_no_rotation_no_footer(self):
        config = RenderConfig(rotation=-1, logo_path="")
        w, h = output_dimensions(320, 240, config)
        assert w == 640
        assert h == 240

    def test_rotation_swaps(self):
        config = RenderConfig(rotation=cv2.ROTATE_90_CLOCKWISE, logo_path="")
        w, h = output_dimensions(320, 240, config)
        assert w == 480  # 240 * 2
        assert h == 320

    def test_with_footer(self):
        config = RenderConfig(rotation=-1, logo_path="logo.png", footer_height=100)
        w, h = output_dimensions(320, 240, config)
        assert w == 640
        assert h == 340


# ---------------------------------------------------------------------------
# process_frame
# ---------------------------------------------------------------------------

class TestProcessFrame:
    def test_side_by_side_doubles_width(self, bgr_frame, mock_extractor):
        config = RenderConfig()
        combined, _, _, _ = process_frame(bgr_frame, mock_extractor, config, 0.0)
        assert combined.shape[1] == bgr_frame.shape[1] * 2
        assert combined.shape[0] == bgr_frame.shape[0]

    def test_metadata_has_nine_cells(self, bgr_frame, mock_extractor):
        config = RenderConfig()
        _, _, _, meta = process_frame(bgr_frame, mock_extractor, config, 1.5)
        assert meta.timestamp == 1.5
        assert len(meta.cells) == 9

    def test_cells_sum_to_100(self, bgr_frame, mock_extractor):
        config = RenderConfig()
        _, _, _, meta = process_frame(bgr_frame, mock_extractor, config, 0.0)
        total = sum(c.percentage for c in meta.cells)
        assert total == pytest.approx(100.0, abs=1.0)

    def test_rotation_changes_dimensions(self, mock_extractor):
        frame = np.random.randint(0, 256, (240, 320, 3), dtype=np.uint8)
        config = RenderConfig(rotation=cv2.ROTATE_90_CLOCKWISE)
        combined, _, _, _ = process_frame(frame, mock_extractor, config, 0.0)
        # after 90 rotation: 240w x 320h, side-by-side: 480w x 320h
        assert combined.shape == (320, 480, 3)


# ---------------------------------------------------------------------------
# render_video (integration)
# ---------------------------------------------------------------------------

class TestRenderVideo:
    def test_produces_output_file(self, tiny_video, mock_extractor, tmp_path):
        output = str(tmp_path / "output.mp4")
        result = render_video(tiny_video, mock_extractor, RenderConfig(), output_path=output)
        assert Path(output).exists()
        assert Path(output).stat().st_size > 0

    def test_frame_count(self, tiny_video, mock_extractor, tmp_path):
        output = str(tmp_path / "output.mp4")
        result = render_video(tiny_video, mock_extractor, RenderConfig(), output_path=output)
        assert result.processed_frames == 10
        assert result.total_frames == 10

    def test_fps_preserved(self, tiny_video, mock_extractor, tmp_path):
        output = str(tmp_path / "output.mp4")
        result = render_video(tiny_video, mock_extractor, RenderConfig(), output_path=output)
        assert result.fps == pytest.approx(10.0)

    def test_all_frames_have_metadata(self, tiny_video, mock_extractor, tmp_path):
        output = str(tmp_path / "output.mp4")
        result = render_video(tiny_video, mock_extractor, RenderConfig(), output_path=output)
        assert len(result.frame_results) == 10
        assert all(len(fr.cells) == 9 for fr in result.frame_results)

    def test_timestamps_sequential(self, tiny_video, mock_extractor, tmp_path):
        output = str(tmp_path / "output.mp4")
        result = render_video(tiny_video, mock_extractor, RenderConfig(), output_path=output)
        timestamps = [fr.timestamp for fr in result.frame_results]
        assert timestamps == sorted(timestamps)
        assert timestamps[0] == pytest.approx(0.0)

    def test_progress_callback(self, tiny_video, mock_extractor, tmp_path):
        """Progress fires per keyframe, not per video frame."""
        output = str(tmp_path / "output.mp4")
        calls: list[tuple[int, int]] = []
        # sample_interval=0.5s at 10fps → sample_gap=5 → 2 keyframes (0, 5)
        config = RenderConfig(sample_interval_s=0.5)
        render_video(
            tiny_video, mock_extractor, config,
            output_path=output,
            on_progress=lambda c, t: calls.append((c, t)),
        )
        assert len(calls) == 2
        assert calls[0] == (1, 2)
        assert calls[-1] == (2, 2)

    def test_output_video_dimensions(self, tiny_video, mock_extractor, tmp_path):
        output = str(tmp_path / "output.mp4")
        render_video(tiny_video, mock_extractor, RenderConfig(), output_path=output)
        cap = cv2.VideoCapture(output)
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        cap.release()
        assert w == 320  # 160 * 2
        assert h == 120

    def test_output_with_footer(self, tiny_video, mock_extractor, tmp_path, tiny_logo):
        output = str(tmp_path / "output.mp4")
        config = RenderConfig(logo_path=tiny_logo, footer_height=50)
        render_video(tiny_video, mock_extractor, config, output_path=output)
        cap = cv2.VideoCapture(output)
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        cap.release()
        assert w == 320
        assert h == 170  # 120 + 50

    def test_default_output_path(self, tiny_video, mock_extractor):
        result = render_video(tiny_video, mock_extractor, RenderConfig())
        expected = str(Path(tiny_video).with_suffix(".heatmap.webm"))
        assert result.output_path == expected
        assert Path(expected).exists()
        # cleanup
        Path(expected).unlink(missing_ok=True)
        Path(result.overlay_only_path).unlink(missing_ok=True)

    def test_duration_matches(self, tiny_video, mock_extractor, tmp_path):
        output = str(tmp_path / "output.mp4")
        result = render_video(tiny_video, mock_extractor, RenderConfig(), output_path=output)
        assert result.duration_s == pytest.approx(1.0)  # 10 frames / 10 fps

    def test_overlay_intermediate_frames_differ(self, tmp_path, mock_extractor):
        """Overlay-only video: intermediate frames must show current content, not frozen keyframe."""
        # 6 frames, each a different solid color. sample_interval=10s → only frame 0 is keyframe.
        vid_path = str(tmp_path / "src.mp4")
        writer = cv2.VideoWriter(vid_path, cv2.VideoWriter_fourcc(*"mp4v"), 10, (160, 120))
        for i in range(6):
            writer.write(np.full((120, 160, 3), i * 50, dtype=np.uint8))
        writer.release()

        output = str(tmp_path / "out.mp4")
        config = RenderConfig(sample_interval_s=10.0)  # single keyframe
        result = render_video(vid_path, mock_extractor, config, output_path=output)

        # Read back overlay-only video frames
        cap = cv2.VideoCapture(result.overlay_only_path)
        frames = []
        while True:
            ok, f = cap.read()
            if not ok:
                break
            frames.append(f)
        cap.release()

        assert len(frames) == 6
        # Each source frame has different brightness → overlay frames must also differ.
        # If the old bug were present, frames 1-5 would be identical to frame 0.
        for i in range(1, 6):
            assert not np.array_equal(frames[0], frames[i]), (
                f"Frame {i} is identical to frame 0 — overlay is frozen instead of blending current content"
            )

    def test_sidebyside_right_half_updates(self, tmp_path, mock_extractor):
        """Side-by-side video: right half (heatmap) must reflect current frame content."""
        vid_path = str(tmp_path / "src.mp4")
        writer = cv2.VideoWriter(vid_path, cv2.VideoWriter_fourcc(*"mp4v"), 10, (160, 120))
        for i in range(4):
            writer.write(np.full((120, 160, 3), i * 80, dtype=np.uint8))
        writer.release()

        output = str(tmp_path / "out.mp4")
        config = RenderConfig(sample_interval_s=10.0)  # single keyframe
        render_video(vid_path, mock_extractor, config, output_path=output)

        cap = cv2.VideoCapture(output)
        frames = []
        while True:
            ok, f = cap.read()
            if not ok:
                break
            frames.append(f)
        cap.release()

        # Right half of frame 0 vs frame 3 must differ (different source brightness)
        w = frames[0].shape[1] // 2
        right_0 = frames[0][:, w:]
        right_3 = frames[3][:, w:]
        assert not np.array_equal(right_0, right_3), (
            "Right half (heatmap overlay) is frozen — not blending onto current frame"
        )

    def test_output_preserves_input_resolution(self, tmp_path, mock_extractor):
        """render_video must not downscale — output matches input dimensions."""
        vid_path = str(tmp_path / "hd.mp4")
        writer = cv2.VideoWriter(vid_path, cv2.VideoWriter_fourcc(*"mp4v"), 10, (640, 480))
        for i in range(3):
            writer.write(np.full((480, 640, 3), i * 80, dtype=np.uint8))
        writer.release()

        output = str(tmp_path / "out.mp4")
        render_video(vid_path, mock_extractor, RenderConfig(), output_path=output)

        cap = cv2.VideoCapture(output)
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        cap.release()
        # side-by-side doubles width, height preserved
        assert w == 1280  # 640 * 2
        assert h == 480


# ---------------------------------------------------------------------------
# _maybe_downscale (render_cli)
# ---------------------------------------------------------------------------

class TestMaxdimConfig:
    def test_default_maxdim_is_1280(self):
        """render_cli.py must default --maxdim to 1280 (not 640)."""
        source = Path(__file__).parent.parent.joinpath("render_cli.py").read_text()
        assert 'default=1280' in source, "render_cli.py --maxdim default must be 1280"
        assert 'default=640' not in source, "render_cli.py still has old 640 default"

    def test_node_passes_maxdim_1280(self):
        """video-prediction.service.ts must pass --maxdim 1280 explicitly."""
        svc = Path(__file__).parents[2] / "src" / "modules" / "attention-prediction" / "video-prediction.service.ts"
        source = svc.read_text()
        assert "'--maxdim'" in source and "'1280'" in source, (
            "video-prediction.service.ts must pass --maxdim 1280 to render_cli.py"
        )
