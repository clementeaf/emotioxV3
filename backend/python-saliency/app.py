"""
FastAPI application for video saliency prediction.

Endpoints:
    GET  /health         — readiness check
    POST /predict-video  — TASED-Net streaming saliency prediction (JSON-lines)
    POST /render-video   — DINO heatmap video render (JSON-lines progress + MP4)
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

import torch
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse

from inference import InferenceConfig, predict_video_saliency, saliency_to_base64
from model import TASED_v2, load_weights
from renderer import RenderConfig, make_dino_extractor, render_video
from schemas import (
    HealthResponse,
    PredictVideoRequest,
    ProgressEvent,
    RenderFrameData,
    RenderGridCell,
    RenderVideoRequest,
    RenderVideoResultEvent,
    ResultEvent,
)

logger = logging.getLogger("saliency-service")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

# ---------------------------------------------------------------------------
# Model singletons
# ---------------------------------------------------------------------------

TASED_WEIGHT_PATH = os.environ.get(
    "TASED_WEIGHT_PATH",
    str(Path(__file__).resolve().parent.parent / "models" / "tased_net.pth"),
)
DINO_MODEL_NAME = os.environ.get("DINO_MODEL_NAME", "facebook/dino-vitb16")
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

_tased_model: TASED_v2 | None = None
_dino_model = None
_dino_extractor_fn = None
_dino_feature_extractor = None


def get_tased_model() -> TASED_v2:
    """Return loaded TASED-Net singleton."""
    assert _tased_model is not None, "TASED model not loaded"
    return _tased_model


def get_dino_extractor():
    """Return DINO attention extractor callable."""
    assert _dino_extractor_fn is not None, "DINO model not loaded"
    return _dino_extractor_fn


def _load_tased() -> TASED_v2 | None:
    """Load TASED-Net. Returns None if weights missing (non-fatal)."""
    path = Path(TASED_WEIGHT_PATH)
    has_weights = path.is_file()
    logger.info("TASED-Net weights %s: %s", "found" if has_weights else "missing", path)

    return None if not has_weights else _do_load_tased(path)


def _do_load_tased(path: Path) -> TASED_v2:
    model = TASED_v2()
    load_weights(model, str(path))
    model = model.to(DEVICE)
    model.eval()
    logger.info("TASED-Net loaded on %s", DEVICE)
    return model


def _load_dino() -> tuple:
    """Load DINO ViT-B/16 from HuggingFace."""
    from transformers import AutoImageProcessor, AutoModel

    logger.info("Loading DINO model: %s", DINO_MODEL_NAME)
    feature_extractor = AutoImageProcessor.from_pretrained(DINO_MODEL_NAME)
    model = AutoModel.from_pretrained(DINO_MODEL_NAME)
    model.eval()
    extractor_fn = make_dino_extractor(model, feature_extractor)
    logger.info("DINO model loaded")
    return model, feature_extractor, extractor_fn


# ---------------------------------------------------------------------------
# App lifecycle
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _tased_model, _dino_model, _dino_feature_extractor, _dino_extractor_fn

    _tased_model = _load_tased()
    _dino_model, _dino_feature_extractor, _dino_extractor_fn = _load_dino()

    yield

    _tased_model = None
    _dino_model = None
    _dino_feature_extractor = None
    _dino_extractor_fn = None


app = FastAPI(
    title="Video Saliency Service",
    version="2.0.0",
    lifespan=lifespan,
)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="ok",
        model_loaded=_tased_model is not None,
        dino_loaded=_dino_extractor_fn is not None,
        device=str(DEVICE),
    )


@app.post("/predict-video")
async def predict_video(request: PredictVideoRequest):
    """Run TASED-Net inference on video frames. Streams JSON-lines progress."""
    assert _tased_model is not None, "TASED model not available"
    _validate_predict_request(request)

    config = InferenceConfig(
        output_width=request.output_width,
        output_height=request.output_height,
    )

    return StreamingResponse(
        _stream_prediction(request, config),
        media_type="text/plain",
    )


@app.post("/render-video")
async def render_video_endpoint(request: RenderVideoRequest):
    """Render video with DINO attention heatmap. Streams JSON-lines progress + result."""
    assert _dino_extractor_fn is not None, "DINO model not available"
    assert Path(request.video_path).is_file(), f"Video not found: {request.video_path}"

    return StreamingResponse(
        _stream_render(request),
        media_type="text/plain",
    )


# ---------------------------------------------------------------------------
# Streaming generators
# ---------------------------------------------------------------------------

async def _stream_prediction(request: PredictVideoRequest, config: InferenceConfig):
    """Yield JSON-lines: progress events then final result."""
    model = get_tased_model()
    progress_events: list[str] = []

    def on_progress(current: int, total: int) -> None:
        event = ProgressEvent(frame=current, total=total)
        progress_events.append(event.model_dump_json() + "\n")

    results = predict_video_saliency(
        model=model,
        frame_paths=request.frame_paths,
        timestamps=request.timestamps,
        device=DEVICE,
        config=config,
        on_progress=on_progress,
    )

    for event_line in progress_events:
        yield event_line

    result_event = ResultEvent(
        maps=[saliency_to_base64(r.saliency_map) for r in results],
        timestamps=[r.timestamp for r in results],
        width=config.output_width,
        height=config.output_height,
    )
    yield result_event.model_dump_json() + "\n"


async def _stream_render(request: RenderVideoRequest):
    """Yield JSON-lines: progress events then render result.

    render_video is CPU-bound (DINO inference), so it runs in a thread
    to avoid blocking uvicorn's event loop and killing the HTTP socket.
    """
    import asyncio

    extractor = get_dino_extractor()
    queue: asyncio.Queue[str | None] = asyncio.Queue()
    loop = asyncio.get_event_loop()

    def on_progress(current: int, total: int) -> None:
        event = ProgressEvent(frame=current, total=total)
        loop.call_soon_threadsafe(queue.put_nowait, event.model_dump_json() + "\n")

    config = RenderConfig(
        grid_rows=request.grid_rows,
        grid_cols=request.grid_cols,
        overlay_alpha=request.overlay_alpha,
        rotation=request.rotation,
        flip_heatmap_v=request.flip_heatmap_v,
        logo_path=request.logo_path,
        footer_height=request.footer_height,
        sample_interval_s=request.sample_interval_s,
    )

    async def _run_in_thread():
        result = await asyncio.to_thread(
            render_video,
            request.video_path,
            extractor,
            config,
            request.output_path,
            on_progress,
        )
        # Signal completion via queue
        result_event = RenderVideoResultEvent(
            output_path=result.output_path,
            duration_s=result.duration_s,
            fps=result.fps,
            total_frames=result.total_frames,
            processed_frames=result.processed_frames,
            frames=[
                RenderFrameData(
                    timestamp=fr.timestamp,
                    cells=[RenderGridCell(label=c.label, percentage=c.percentage) for c in fr.cells],
                )
                for fr in result.frame_results
            ],
        )
        await queue.put(result_event.model_dump_json() + "\n")
        await queue.put(None)  # sentinel

    task = asyncio.create_task(_run_in_thread())

    while True:
        item = await queue.get()
        if item is None:
            break
        yield item

    await task  # propagate exceptions
    yield result_event.model_dump_json() + "\n"


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

def _validate_predict_request(request: PredictVideoRequest) -> None:
    """Guard clauses for predict-video request consistency."""
    mismatched_lengths = len(request.frame_paths) != len(request.timestamps)
    missing_files = [p for p in request.frame_paths if not Path(p).is_file()]

    errors = {
        "frame_paths and timestamps must have equal length": mismatched_lengths,
        f"Files not found: {missing_files}": bool(missing_files),
    }

    messages = [msg for msg, failed in errors.items() if failed]

    for first_error in messages[:1]:
        raise HTTPException(status_code=422, detail=first_error)
