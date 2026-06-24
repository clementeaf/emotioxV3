"""
Video attention heatmap renderer.

Produces side-by-side MP4: original (left) | attention heatmap + 3x3 grid (right),
with optional logo footer. Uses DINO ViT-B/16 for per-frame attention extraction.

Faithfully reproduces the pipeline from docs/heatmap_con_cuadrantes.py.
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import partial
from pathlib import Path
from typing import Callable, Protocol

import cv2
import numpy as np
from PIL import Image


# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class GridCell:
    """Single cell in the attention grid."""

    label: str
    percentage: float
    bounds: tuple[int, int, int, int]  # x1, y1, x2, y2


@dataclass(frozen=True)
class FrameResult:
    """Attention metadata for one rendered frame."""

    timestamp: float
    cells: tuple[GridCell, ...]


@dataclass(frozen=True)
class RenderResult:
    """Output of a complete video render."""

    output_path: str
    duration_s: float
    fps: float
    total_frames: int
    processed_frames: int
    frame_results: tuple[FrameResult, ...]


@dataclass(frozen=True)
class RenderConfig:
    """Rendering parameters."""

    grid_rows: int = 3
    grid_cols: int = 3
    overlay_alpha: float = 0.6
    rotation: int = -1  # cv2 rotation constant; negative = identity
    flip_heatmap_v: bool = False
    logo_path: str = ""
    footer_height: int = 100
    sample_interval_s: float = 2.0  # seconds between DINO keyframes; intermediates reuse last overlay


class AttentionExtractor(Protocol):
    """Callable that converts a PIL Image to a 2-D attention ndarray."""

    def __call__(self, image: Image.Image) -> np.ndarray: ...


# ---------------------------------------------------------------------------
# Rotation dispatch (no branching in hot path)
# ---------------------------------------------------------------------------

_IDENTITY: Callable[[np.ndarray], np.ndarray] = lambda f: f

_ROTATORS: dict[int, Callable[[np.ndarray], np.ndarray]] = {
    cv2.ROTATE_90_CLOCKWISE: partial(cv2.rotate, rotateCode=cv2.ROTATE_90_CLOCKWISE),
    cv2.ROTATE_90_COUNTERCLOCKWISE: partial(cv2.rotate, rotateCode=cv2.ROTATE_90_COUNTERCLOCKWISE),
    cv2.ROTATE_180: partial(cv2.rotate, rotateCode=cv2.ROTATE_180),
}

_SWAPS_DIMS: set[int] = {cv2.ROTATE_90_CLOCKWISE, cv2.ROTATE_90_COUNTERCLOCKWISE}


def rotated_dims(w: int, h: int, rotation: int) -> tuple[int, int]:
    """Return (width, height) after rotation."""
    return (h, w) if rotation in _SWAPS_DIMS else (w, h)


# ---------------------------------------------------------------------------
# DINO extractor factory
# ---------------------------------------------------------------------------

def make_dino_extractor(model, feature_extractor) -> AttentionExtractor:
    """Create an attention extractor bound to a loaded DINO model."""
    import torch

    @torch.no_grad()
    def extract(image: Image.Image) -> np.ndarray:
        inputs = feature_extractor(images=image, return_tensors="pt")
        hidden = model(**inputs).last_hidden_state
        patches = hidden[0, 1:]  # drop CLS token
        attention = patches.mean(dim=-1)
        side = int(attention.shape[0] ** 0.5)
        return attention[: side * side].reshape(side, side).numpy()

    return extract


# ---------------------------------------------------------------------------
# Pure: normalization
# ---------------------------------------------------------------------------

def normalize(arr: np.ndarray) -> np.ndarray:
    """Scale array to [0, 1]. Constant input maps to zeros."""
    lo, hi = float(arr.min()), float(arr.max())
    span = hi - lo
    return np.zeros_like(arr, dtype=np.float32) * (span == 0) + \
           ((arr - lo) / max(span, 1e-12)).astype(np.float32) * (span != 0)


# ---------------------------------------------------------------------------
# Pure: heatmap
# ---------------------------------------------------------------------------

def build_heatmap(
    attention: np.ndarray,
    width: int,
    height: int,
) -> tuple[np.ndarray, np.ndarray]:
    """Normalize + resize + JET colormap. Returns (BGR heatmap, float attention)."""
    normed = normalize(attention)
    resized = cv2.resize(normed, (width, height), interpolation=cv2.INTER_CUBIC)
    colored = cv2.applyColorMap(np.uint8(resized * 255), cv2.COLORMAP_JET)
    return colored, resized


# ---------------------------------------------------------------------------
# Pure: grid cells
# ---------------------------------------------------------------------------

def compute_grid_cells(
    attention: np.ndarray,
    rows: int = 3,
    cols: int = 3,
) -> tuple[GridCell, ...]:
    """Divide attention into rows x cols cells with percentage labels."""
    h, w = attention.shape
    total = float(np.sum(attention)) or 1.0
    cell_h, cell_w = h // rows, w // cols

    def _cell(idx: int) -> GridCell:
        r, c = divmod(idx, cols)
        y1, y2 = r * cell_h, (h if r == rows - 1 else (r + 1) * cell_h)
        x1, x2 = c * cell_w, (w if c == cols - 1 else (c + 1) * cell_w)
        pct = float(np.sum(attention[y1:y2, x1:x2])) / total * 100
        return GridCell(label=f"Q{idx + 1}", percentage=round(pct, 1), bounds=(x1, y1, x2, y2))

    return tuple(_cell(i) for i in range(rows * cols))


# ---------------------------------------------------------------------------
# Pure: draw grid overlay
# ---------------------------------------------------------------------------

_WHITE = (255, 255, 255)
_GREEN = (0, 255, 0)
_BLACK = (0, 0, 0)
_FONT = cv2.FONT_HERSHEY_SIMPLEX
_FONT_SCALE = 0.8
_THICKNESS = 2


def draw_grid(
    frame: np.ndarray,
    cells: tuple[GridCell, ...],
    rows: int = 3,
    cols: int = 3,
) -> np.ndarray:
    """Draw grid lines and Q-labels with percentages. Does not mutate input."""
    canvas = frame.copy()
    h, w = canvas.shape[:2]
    cell_h, cell_w = h // rows, w // cols

    # horizontal lines
    for i in range(1, rows):
        cv2.line(canvas, (0, i * cell_h), (w, i * cell_h), _WHITE, 2)

    # vertical lines
    for j in range(1, cols):
        cv2.line(canvas, (j * cell_w, 0), (j * cell_w, h), _WHITE, 2)

    # labels
    for cell in cells:
        _draw_cell_label(canvas, cell)

    return canvas


def _draw_cell_label(canvas: np.ndarray, cell: GridCell) -> None:
    """Stamp one Q-label with black background onto canvas. Mutates canvas."""
    x1, y1, x2, y2 = cell.bounds
    cx, by = (x1 + x2) // 2, y2 - 10
    text = f"{cell.label}: {cell.percentage}%"
    (tw, th), _ = cv2.getTextSize(text, _FONT, _FONT_SCALE, _THICKNESS)
    cv2.rectangle(canvas, (cx - tw // 2 - 5, by - th - 5), (cx + tw // 2 + 5, by + 5), _BLACK, -1)
    cv2.putText(canvas, text, (cx - tw // 2, by), _FONT, _FONT_SCALE, _GREEN, _THICKNESS)


# ---------------------------------------------------------------------------
# Pure: logo footer
# ---------------------------------------------------------------------------

def load_logo(path: str, max_height: int) -> tuple[np.ndarray, np.ndarray] | None:
    """Load logo, resize to fit, return (bgr, alpha). Alpha is 255 if opaque."""
    raw = cv2.imread(path, cv2.IMREAD_UNCHANGED)
    assert raw is not None, f"Cannot load logo: {path}"

    has_alpha = raw.ndim == 3 and raw.shape[2] == 4
    bgr = raw[:, :, :3]
    alpha = raw[:, :, 3] if has_alpha else np.full(bgr.shape[:2], 255, dtype=np.uint8)

    scale = min(1.0, max_height / bgr.shape[0])
    new_size = (int(bgr.shape[1] * scale), int(bgr.shape[0] * scale))
    return cv2.resize(bgr, new_size), cv2.resize(alpha, new_size)


def build_footer(
    width: int,
    height: int,
    logo: tuple[np.ndarray, np.ndarray] | None = None,
) -> np.ndarray:
    """Black footer strip with centered logo (alpha-blended)."""
    footer = np.zeros((height, width, 3), dtype=np.uint8)

    # no logo -> plain black strip
    return footer if logo is None else _stamp_logo(footer, logo)


def _stamp_logo(footer: np.ndarray, logo: tuple[np.ndarray, np.ndarray]) -> np.ndarray:
    """Center logo on footer via alpha blend. Returns footer (mutated)."""
    bgr, alpha = logo
    fh, fw = footer.shape[:2]
    lh, lw = bgr.shape[:2]
    x, y = (fw - lw) // 2, (fh - lh) // 2

    # logo larger than footer -> return as-is
    assert x >= 0 and y >= 0, f"Logo {lw}x{lh} exceeds footer {fw}x{fh}"

    a = alpha.astype(np.float32)[:, :, np.newaxis] / 255.0
    region = footer[y : y + lh, x : x + lw].astype(np.float32)
    blended = region * (1.0 - a) + bgr.astype(np.float32) * a
    footer[y : y + lh, x : x + lw] = blended.astype(np.uint8)
    return footer


# ---------------------------------------------------------------------------
# Frame processing
# ---------------------------------------------------------------------------

def process_frame(
    frame_bgr: np.ndarray,
    extractor: AttentionExtractor,
    config: RenderConfig,
    timestamp: float,
) -> tuple[np.ndarray, FrameResult]:
    """Process one frame: rotate, extract attention, overlay, grid. Returns (combined, metadata)."""
    rotate_fn = _ROTATORS.get(config.rotation, _IDENTITY)
    frame = rotate_fn(frame_bgr)
    h, w = frame.shape[:2]

    # attention
    img_pil = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    attention = extractor(img_pil)

    # heatmap + optional vertical flip
    heatmap, attention_resized = build_heatmap(attention, w, h)
    flip = np.flip if config.flip_heatmap_v else _IDENTITY
    heatmap = np.ascontiguousarray(flip(heatmap, 0)) if config.flip_heatmap_v else heatmap
    attention_resized = np.ascontiguousarray(flip(attention_resized, 0)) if config.flip_heatmap_v else attention_resized

    # grid
    cells = compute_grid_cells(attention_resized, config.grid_rows, config.grid_cols)

    # compose: overlay then grid
    alpha = config.overlay_alpha
    overlay = cv2.addWeighted(frame, 1.0 - alpha, heatmap, alpha, 0)
    overlay = draw_grid(overlay, cells, config.grid_rows, config.grid_cols)

    # side by side
    combined = np.hstack((frame, overlay))
    return combined, FrameResult(timestamp=timestamp, cells=cells)


# ---------------------------------------------------------------------------
# Video render
# ---------------------------------------------------------------------------

def output_dimensions(orig_w: int, orig_h: int, config: RenderConfig) -> tuple[int, int]:
    """Final output (width, height) including side-by-side + optional footer."""
    fw, fh = rotated_dims(orig_w, orig_h, config.rotation)
    content_w = fw * 2  # side by side
    footer_h = config.footer_height if config.logo_path else 0
    return content_w, fh + footer_h


def render_video(
    video_path: str,
    extractor: AttentionExtractor,
    config: RenderConfig = RenderConfig(),
    output_path: str = "",
    on_progress: Callable[[int, int], None] | None = None,
) -> RenderResult:
    """
    Render video with per-frame DINO attention heatmap.

    Output: side-by-side MP4 (original | heatmap+grid) + optional logo footer.
    """
    cap = cv2.VideoCapture(video_path)
    assert cap.isOpened(), f"Cannot open video: {video_path}"

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    orig_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    orig_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    final_w, final_h = output_dimensions(orig_w, orig_h, config)
    out_path = output_path or str(Path(video_path).with_suffix(".heatmap.mp4"))

    writer = cv2.VideoWriter(out_path, cv2.VideoWriter_fourcc(*"mp4v"), fps, (final_w, final_h))
    assert writer.isOpened(), f"Cannot create output: {out_path}"

    # pre-build static footer (computed once)
    logo = load_logo(config.logo_path, config.footer_height - 20) if config.logo_path else None
    footer = build_footer(final_w, config.footer_height, logo) if config.logo_path else None

    # compositing strategy: pick once, call N times (no branching per frame)
    compose = _make_compositor(footer, final_w, final_h, config)
    notify = on_progress or (lambda _c, _t: None)

    # Sample interval: run DINO every N seconds, reuse overlay for intermediate frames
    sample_gap = max(1, round(fps * config.sample_interval_s))
    keyframe_count = max(1, total_frames // sample_gap)

    results: list[FrameResult] = []
    last_overlay: np.ndarray | None = None
    last_meta: FrameResult | None = None
    idx = 0

    while True:
        ok, raw_frame = cap.read()
        if not ok:
            break

        is_keyframe = (idx % sample_gap == 0)
        timestamp = idx / max(fps, 1.0)

        # Keyframes: run DINO; intermediates: reuse last overlay
        content: np.ndarray
        meta: FrameResult
        rotate_fn = _ROTATORS.get(config.rotation, _IDENTITY)
        frame = rotate_fn(raw_frame)

        combined: np.ndarray
        if is_keyframe or last_overlay is None:
            combined, meta = process_frame(raw_frame, extractor, config, timestamp)
            last_overlay = combined
            last_meta = meta
            notify(min(idx // sample_gap + 1, keyframe_count), keyframe_count)
        else:
            # Reuse last heatmap overlay on right half, fresh original on left
            combined = last_overlay.copy()
            h, w = frame.shape[:2]
            # Replace left half (original) with current frame
            _ensure_left_half(combined, frame, w)
            meta = FrameResult(timestamp=timestamp, cells=last_meta.cells if last_meta else ())

        writer.write(compose(combined))
        results.append(meta)
        idx += 1

    cap.release()
    writer.release()

    return RenderResult(
        output_path=out_path,
        duration_s=idx / max(fps, 1.0),
        fps=fps,
        total_frames=total_frames,
        processed_frames=idx,
        frame_results=tuple(results),
    )


def _ensure_left_half(combined: np.ndarray, frame: np.ndarray, frame_w: int) -> None:
    """Replace the left half of a side-by-side frame with the current original. Mutates combined."""
    ch, cw = combined.shape[:2]
    fh, fw = frame.shape[:2]
    # ponytail: resize frame to match left half dimensions only when needed
    target = combined[:, :frame_w]
    resized = cv2.resize(frame, (target.shape[1], target.shape[0])) if (fh != ch or fw != frame_w) else frame
    combined[:, :frame_w] = resized


def _make_compositor(
    footer: np.ndarray | None,
    final_w: int,
    final_h: int,
    config: RenderConfig,
) -> Callable[[np.ndarray], np.ndarray]:
    """Return a compositing function that adds footer + ensures correct dimensions."""
    content_h = final_h - (config.footer_height if footer is not None else 0)

    def _with_footer(content: np.ndarray) -> np.ndarray:
        resized = _ensure_size(content, final_w, content_h)
        return np.vstack((resized, footer))

    def _without_footer(content: np.ndarray) -> np.ndarray:
        return _ensure_size(content, final_w, final_h)

    return _with_footer if footer is not None else _without_footer


def _ensure_size(frame: np.ndarray, w: int, h: int) -> np.ndarray:
    """Resize only when dimensions differ."""
    fh, fw = frame.shape[:2]
    return cv2.resize(frame, (w, h)) if fw != w or fh != h else frame
