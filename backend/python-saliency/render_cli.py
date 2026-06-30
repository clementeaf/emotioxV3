#!/usr/bin/env python3
"""
CLI entrypoint for video heatmap rendering.

Called as subprocess by Node.js — no HTTP, no uvicorn.
Writes MP4 + .meta.json, exits. Node reads the JSON.

Usage: python render_cli.py <video_path> <output_path> [--grid 3x3] [--rotate 1] [--flip]
"""

from __future__ import annotations

import argparse
import os
import sys
import time

# ponytail: cPanel LVE kills processes that spawn too many threads.
# Force single-threaded execution before importing torch/cv2.
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["VECLIB_MAXIMUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"
os.environ["OPENCV_THREAD_COUNT"] = "0"

def _maybe_downscale(video_path: str, max_dim: int) -> str:
    """Downscale video if larger than max_dim. Returns path (original or temp)."""
    import cv2
    import tempfile

    cap = cv2.VideoCapture(video_path)
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)

    largest = max(w, h)
    cap.release()

    # No downscale needed
    if largest <= max_dim:
        sys.stderr.write(f"Video {w}x{h} within {max_dim}px limit\n")
        return video_path

    scale = max_dim / largest
    new_w = int(w * scale) & ~1  # even dimensions for codec
    new_h = int(h * scale) & ~1

    sys.stderr.write(f"Downscaling {w}x{h} -> {new_w}x{new_h} (max_dim={max_dim})\n")

    tmp = tempfile.NamedTemporaryFile(suffix='.mp4', delete=False)
    tmp.close()

    cap = cv2.VideoCapture(video_path)
    writer = cv2.VideoWriter(tmp.name, cv2.VideoWriter_fourcc(*'mp4v'), fps, (new_w, new_h))

    while True:
        ok, frame = cap.read()
        if not ok:
            break
        writer.write(cv2.resize(frame, (new_w, new_h)))

    cap.release()
    writer.release()
    sys.stderr.write(f"Downscaled video: {tmp.name}\n")
    return tmp.name


def main() -> None:
    parser = argparse.ArgumentParser(description="Render video with DINO attention heatmap")
    parser.add_argument("video_path", help="Absolute path to source video")
    parser.add_argument("output_path", help="Absolute path for output MP4")
    parser.add_argument("--grid", default="3x3", help="Grid size (e.g. 3x3)")
    parser.add_argument("--rotation", type=int, default=-1, help="cv2 rotation code (-1=none)")
    parser.add_argument("--flip", action="store_true", help="Flip heatmap vertically")
    parser.add_argument("--alpha", type=float, default=0.6, help="Overlay alpha")
    parser.add_argument("--sample", type=float, default=2.0, help="Seconds between keyframes")
    parser.add_argument("--logo", default="", help="Logo image path")
    parser.add_argument("--footer", type=int, default=100, help="Footer height px")
    parser.add_argument("--maxdim", type=int, default=640, help="Max dimension (width or height) — downscale large videos")
    args = parser.parse_args()

    rows, cols = (int(x) for x in args.grid.split("x"))

    # Downscale BEFORE importing torch/transformers — they use ~400MB
    actual_video = _maybe_downscale(args.video_path, args.maxdim)

    # ponytail: lazy imports — torch/transformers only after downscale frees the large source frames
    import torch
    torch.set_num_threads(1)
    from transformers import AutoImageProcessor, AutoModel
    from renderer import RenderConfig, make_dino_extractor, render_video

    # Load DINO
    t0 = time.time()
    sys.stderr.write("Loading DINO model...\n")
    model_name = "facebook/dino-vitb16"
    processor = AutoImageProcessor.from_pretrained(model_name)
    model = AutoModel.from_pretrained(model_name)
    model.eval()
    extractor = make_dino_extractor(model, processor)
    sys.stderr.write(f"DINO loaded in {time.time() - t0:.1f}s\n")

    config = RenderConfig(
        grid_rows=rows,
        grid_cols=cols,
        overlay_alpha=args.alpha,
        rotation=args.rotation,
        flip_heatmap_v=args.flip,
        logo_path=args.logo,
        footer_height=args.footer,
        sample_interval_s=args.sample,
    )

    def on_progress(current: int, total: int) -> None:
        sys.stderr.write(f"  keyframe {current}/{total}\n")

    t1 = time.time()
    result = render_video(
        video_path=actual_video,
        extractor=extractor,
        config=config,
        output_path=args.output_path,
        on_progress=on_progress,
    )

    elapsed = time.time() - t1
    sys.stderr.write(f"Done: {result.processed_frames} frames in {elapsed:.1f}s\n")

    # ponytail: NO H.264 re-encode here — Python + ffmpeg together exceed cPanel LVE memory.
    # Node handles re-encode after this process exits and frees all memory.

    # Print JSON result to stdout (Node reads this)
    import json
    from dataclasses import asdict
    meta = {
        "output_path": result.output_path,
        "overlay_only_path": result.overlay_only_path,
        "duration_s": result.duration_s,
        "fps": result.fps,
        "total_frames": result.total_frames,
        "processed_frames": result.processed_frames,
        "frames": [
            {"timestamp": fr.timestamp, "cells": [asdict(c) for c in fr.cells]}
            for fr in result.frame_results
        ],
    }
    sys.stdout.write(json.dumps(meta))


main()
