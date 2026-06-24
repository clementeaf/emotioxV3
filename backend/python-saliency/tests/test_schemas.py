"""Tests for Pydantic schemas."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from schemas import HealthResponse, PredictVideoRequest, ProgressEvent, ResultEvent


class TestPredictVideoRequest:
    def test_valid_request(self):
        req = PredictVideoRequest(
            frame_paths=["/tmp/f1.png", "/tmp/f2.png"],
            timestamps=[0.0, 2.0],
        )
        assert len(req.frame_paths) == 2
        assert req.output_width == 384
        assert req.output_height == 224

    def test_rejects_empty_paths(self):
        with pytest.raises(ValidationError):
            PredictVideoRequest(frame_paths=[], timestamps=[])

    def test_custom_dimensions(self):
        req = PredictVideoRequest(
            frame_paths=["/tmp/f1.png"],
            timestamps=[0.0],
            output_width=192,
            output_height=112,
        )
        assert req.output_width == 192
        assert req.output_height == 112

    def test_rejects_negative_dimensions(self):
        with pytest.raises(ValidationError):
            PredictVideoRequest(
                frame_paths=["/tmp/f1.png"],
                timestamps=[0.0],
                output_width=-1,
            )


class TestProgressEvent:
    def test_type_is_progress(self):
        event = ProgressEvent(frame=5, total=15)
        assert event.type == "progress"
        assert event.frame == 5

    def test_serialization(self):
        event = ProgressEvent(frame=1, total=10)
        data = event.model_dump()
        assert data == {"type": "progress", "frame": 1, "total": 10}


class TestResultEvent:
    def test_type_is_result(self):
        event = ResultEvent(
            maps=["abc123"],
            timestamps=[0.0],
            width=384,
            height=224,
        )
        assert event.type == "result"
        assert len(event.maps) == 1

    def test_serialization_roundtrip(self):
        event = ResultEvent(
            maps=["map1", "map2"],
            timestamps=[0.0, 2.0],
            width=384,
            height=224,
        )
        json_str = event.model_dump_json()
        restored = ResultEvent.model_validate_json(json_str)
        assert restored.maps == event.maps


class TestHealthResponse:
    def test_fields(self):
        resp = HealthResponse(status="ok", model_loaded=True, device="cpu")
        assert resp.status == "ok"
        assert resp.model_loaded is True
