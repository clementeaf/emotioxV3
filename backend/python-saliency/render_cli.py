#!/usr/bin/env python3
"""
CLI entrypoint for video heatmap rendering.

Called as subprocess by Node.js — no HTTP, no uvicorn.
Writes MP4 + .meta.json, exits. Node reads the JSON.

Usage: python render_cli.py <video_path> <output_path> [--grid 3x3] [--rotate 1] [--flip]
"""

from __future__ import annotations

import argparse
import sys
import time

import torch
from transformers import AutoImageProcessor, AutoModel

from renderer import RenderConfig, make_dino_extractor, render_video


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
    args = parser.parse_args()

    rows, cols = (int(x) for x in args.grid.split("x"))

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
        video_path=args.video_path,
        extractor=extractor,
        config=config,
        output_path=args.output_path,
        on_progress=on_progress,
    )

    elapsed = time.time() - t1
    sys.stderr.write(f"Done: {result.processed_frames} frames in {elapsed:.1f}s\n")
    sys.stderr.write(f"Output: {result.output_path}\n")

    # Print JSON result to stdout (Node reads this)
    import json
    from dataclasses import asdict
    meta = {
        "output_path": result.output_path,
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
