"""Tests for TASED-Net model architecture."""

from __future__ import annotations

import torch
import pytest

from model import TASED_v2, load_weights


class TestModelArchitecture:
    def test_output_shape(self):
        model = TASED_v2()
        model.eval()
        dummy = torch.randn(1, 3, 32, 224, 384)
        with torch.no_grad():
            output = model(dummy)
        assert output.shape == (1, 224, 384)

    def test_output_range_sigmoid(self):
        model = TASED_v2()
        model.eval()
        dummy = torch.randn(1, 3, 32, 224, 384)
        with torch.no_grad():
            output = model(dummy)
        assert output.min() >= 0.0
        assert output.max() <= 1.0

    def test_temporal_length_constant(self):
        assert TASED_v2.TEMPORAL_LENGTH == 32

    def test_input_dimensions_constants(self):
        assert TASED_v2.INPUT_HEIGHT == 224
        assert TASED_v2.INPUT_WIDTH == 384

    def test_deterministic_eval(self):
        model = TASED_v2()
        model.eval()
        torch.manual_seed(42)
        dummy = torch.randn(1, 3, 32, 224, 384)
        with torch.no_grad():
            out1 = model(dummy).clone()
            out2 = model(dummy).clone()
        torch.testing.assert_close(out1, out2)
