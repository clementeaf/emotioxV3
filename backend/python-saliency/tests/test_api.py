"""Tests for FastAPI endpoints."""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import numpy as np
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def mock_model():
    """Mock TASED_v2 model that returns a fixed saliency map."""
    model = MagicMock()
    model.eval = MagicMock(return_value=model)
    model.to = MagicMock(return_value=model)

    fake_output = np.random.rand(1, 224, 384).astype(np.float32)
    import torch
    model.return_value = torch.from_numpy(fake_output)
    return model


@pytest.fixture
def client(mock_model):
    """TestClient with mocked model loading."""
    with patch("app._load_model", return_value=mock_model):
        from app import app
        with TestClient(app) as c:
            yield c


class TestHealthEndpoint:
    def test_returns_ok(self, client: TestClient):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["model_loaded"] is True

    def test_includes_device(self, client: TestClient):
        response = client.get("/health")
        data = response.json()
        assert "device" in data


class TestPredictVideoEndpoint:
    def test_rejects_empty_frame_paths(self, client: TestClient):
        response = client.post("/predict-video", json={
            "frame_paths": [],
            "timestamps": [],
        })
        assert response.status_code == 422

    def test_rejects_mismatched_lengths(self, client: TestClient, tmp_frames: list[str]):
        response = client.post("/predict-video", json={
            "frame_paths": tmp_frames[:3],
            "timestamps": [0.0, 2.0],
        })
        assert response.status_code == 422

    def test_rejects_missing_files(self, client: TestClient):
        response = client.post("/predict-video", json={
            "frame_paths": ["/nonexistent/frame.png"],
            "timestamps": [0.0],
        })
        assert response.status_code == 422

    def test_streams_json_lines(self, client: TestClient, tmp_frames: list[str]):
        timestamps = [i * 2.0 for i in range(len(tmp_frames))]
        response = client.post("/predict-video", json={
            "frame_paths": tmp_frames,
            "timestamps": timestamps,
        })
        assert response.status_code == 200

        lines = [
            json.loads(line)
            for line in response.text.strip().split("\n")
            if line.strip()
        ]
        assert len(lines) >= 2  # at least one progress + one result

        progress_lines = [l for l in lines if l["type"] == "progress"]
        result_lines = [l for l in lines if l["type"] == "result"]

        assert len(progress_lines) >= 1
        assert len(result_lines) == 1

    def test_result_contains_maps(self, client: TestClient, tmp_frames: list[str]):
        timestamps = [i * 2.0 for i in range(len(tmp_frames))]
        response = client.post("/predict-video", json={
            "frame_paths": tmp_frames,
            "timestamps": timestamps,
        })

        lines = [json.loads(l) for l in response.text.strip().split("\n") if l.strip()]
        result = next(l for l in lines if l["type"] == "result")

        assert len(result["maps"]) == len(tmp_frames)
        assert len(result["timestamps"]) == len(tmp_frames)
        assert result["width"] == 384
        assert result["height"] == 224

    def test_result_maps_are_base64(self, client: TestClient, tmp_frames: list[str]):
        timestamps = [i * 2.0 for i in range(len(tmp_frames))]
        response = client.post("/predict-video", json={
            "frame_paths": tmp_frames[:3],
            "timestamps": timestamps[:3],
        })

        lines = [json.loads(l) for l in response.text.strip().split("\n") if l.strip()]
        result = next(l for l in lines if l["type"] == "result")

        import base64
        decoded = base64.b64decode(result["maps"][0])
        arr = np.frombuffer(decoded, dtype=np.float32)
        assert arr.shape[0] == 224 * 384
