"""Pydantic schemas for the video saliency prediction API."""

from __future__ import annotations

from pydantic import BaseModel, Field


class PredictVideoRequest(BaseModel):
    """Request body for POST /predict-video."""

    frame_paths: list[str] = Field(
        ...,
        min_length=1,
        description="Absolute paths to extracted video frame images.",
    )
    timestamps: list[float] = Field(
        ...,
        min_length=1,
        description="Timestamp in seconds for each frame.",
    )
    output_width: int = Field(default=384, ge=32, le=1920)
    output_height: int = Field(default=224, ge=32, le=1080)


class ProgressEvent(BaseModel):
    """Streaming progress event (JSON-lines)."""

    type: str = "progress"
    frame: int
    total: int


class ResultEvent(BaseModel):
    """Final result event with saliency maps (JSON-lines)."""

    type: str = "result"
    maps: list[str]  # base64-encoded float32 arrays
    timestamps: list[float]
    width: int
    height: int


class HealthResponse(BaseModel):
    """Response for GET /health."""

    status: str
    model_loaded: bool
    device: str
    dino_loaded: bool = False


# ---------------------------------------------------------------------------
# /render-video schemas
# ---------------------------------------------------------------------------

class RenderVideoRequest(BaseModel):
    """Request body for POST /render-video."""

    video_path: str = Field(..., description="Absolute path to the source video file.")
    grid_rows: int = Field(default=3, ge=2, le=10)
    grid_cols: int = Field(default=3, ge=2, le=10)
    overlay_alpha: float = Field(default=0.6, ge=0.1, le=1.0)
    rotation: int = Field(default=-1, description="cv2 rotation constant. -1 = none.")
    flip_heatmap_v: bool = Field(default=False)
    logo_path: str = Field(default="", description="Path to logo image for footer.")
    footer_height: int = Field(default=100, ge=0, le=300)
    output_path: str = Field(default="", description="Output MP4 path. Auto-generated if empty.")


class RenderGridCell(BaseModel):
    """Single grid cell in render result."""

    label: str
    percentage: float


class RenderFrameData(BaseModel):
    """Per-frame metadata from render."""

    timestamp: float
    cells: list[RenderGridCell]


class RenderVideoResultEvent(BaseModel):
    """Final result event for /render-video."""

    type: str = "result"
    output_path: str
    duration_s: float
    fps: float
    total_frames: int
    processed_frames: int
    frames: list[RenderFrameData]
