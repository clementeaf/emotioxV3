"""
TASED-Net v2 — Temporal Aggregation for Saliency Detection.

Architecture: S3D encoder (3D separable convolutions) + U-Net decoder with
unpooling. Produces a single 2D saliency map from a clip of 32 RGB frames.

Paper: "TASED-Net: Temporally-Aggregating Spatial Encoder-Decoder Network
        for Video Saliency Detection" (ICCV 2019)
License: MIT
Source: https://github.com/MichiganCOG/TASED-Net
"""

import torch
from torch import nn


class BasicConv3d(nn.Module):
    """3D convolution + batch norm + ReLU."""

    def __init__(
        self,
        in_planes: int,
        out_planes: int,
        kernel_size: int,
        stride: int,
        padding: int = 0,
    ):
        super().__init__()
        self.conv = nn.Conv3d(
            in_planes, out_planes,
            kernel_size=kernel_size, stride=stride, padding=padding, bias=False,
        )
        self.bn = nn.BatchNorm3d(out_planes, eps=1e-3, momentum=0.001, affine=True)
        self.relu = nn.ReLU()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.relu(self.bn(self.conv(x)))


class SepConv3d(nn.Module):
    """Separable 3D convolution: spatial (1×k×k) then temporal (k×1×1)."""

    def __init__(
        self,
        in_planes: int,
        out_planes: int,
        kernel_size: int,
        stride: int,
        padding: int = 0,
    ):
        super().__init__()
        self.conv_s = nn.Conv3d(
            in_planes, out_planes,
            kernel_size=(1, kernel_size, kernel_size),
            stride=(1, stride, stride),
            padding=(0, padding, padding),
            bias=False,
        )
        self.bn_s = nn.BatchNorm3d(out_planes, eps=1e-3, momentum=0.001, affine=True)
        self.relu_s = nn.ReLU()

        self.conv_t = nn.Conv3d(
            out_planes, out_planes,
            kernel_size=(kernel_size, 1, 1),
            stride=(stride, 1, 1),
            padding=(padding, 0, 0),
            bias=False,
        )
        self.bn_t = nn.BatchNorm3d(out_planes, eps=1e-3, momentum=0.001, affine=True)
        self.relu_t = nn.ReLU()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.relu_s(self.bn_s(self.conv_s(x)))
        return self.relu_t(self.bn_t(self.conv_t(x)))


# ---------------------------------------------------------------------------
# Inception-style Mixed modules (encoder blocks)
# ---------------------------------------------------------------------------

def _mixed_forward(branch0, branch1, branch2, branch3, x: torch.Tensor) -> torch.Tensor:
    return torch.cat((branch0(x), branch1(x), branch2(x), branch3(x)), 1)


class Mixed_3b(nn.Module):
    def __init__(self):
        super().__init__()
        self.branch0 = nn.Sequential(BasicConv3d(192, 64, 1, 1))
        self.branch1 = nn.Sequential(BasicConv3d(192, 96, 1, 1), SepConv3d(96, 128, 3, 1, 1))
        self.branch2 = nn.Sequential(BasicConv3d(192, 16, 1, 1), SepConv3d(16, 32, 3, 1, 1))
        self.branch3 = nn.Sequential(nn.MaxPool3d(3, stride=1, padding=1), BasicConv3d(192, 32, 1, 1))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return _mixed_forward(self.branch0, self.branch1, self.branch2, self.branch3, x)


class Mixed_3c(nn.Module):
    def __init__(self):
        super().__init__()
        self.branch0 = nn.Sequential(BasicConv3d(256, 128, 1, 1))
        self.branch1 = nn.Sequential(BasicConv3d(256, 128, 1, 1), SepConv3d(128, 192, 3, 1, 1))
        self.branch2 = nn.Sequential(BasicConv3d(256, 32, 1, 1), SepConv3d(32, 96, 3, 1, 1))
        self.branch3 = nn.Sequential(nn.MaxPool3d(3, stride=1, padding=1), BasicConv3d(256, 64, 1, 1))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return _mixed_forward(self.branch0, self.branch1, self.branch2, self.branch3, x)


class Mixed_4b(nn.Module):
    def __init__(self):
        super().__init__()
        self.branch0 = nn.Sequential(BasicConv3d(480, 192, 1, 1))
        self.branch1 = nn.Sequential(BasicConv3d(480, 96, 1, 1), SepConv3d(96, 208, 3, 1, 1))
        self.branch2 = nn.Sequential(BasicConv3d(480, 16, 1, 1), SepConv3d(16, 48, 3, 1, 1))
        self.branch3 = nn.Sequential(nn.MaxPool3d(3, stride=1, padding=1), BasicConv3d(480, 64, 1, 1))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return _mixed_forward(self.branch0, self.branch1, self.branch2, self.branch3, x)


class Mixed_4c(nn.Module):
    def __init__(self):
        super().__init__()
        self.branch0 = nn.Sequential(BasicConv3d(512, 160, 1, 1))
        self.branch1 = nn.Sequential(BasicConv3d(512, 112, 1, 1), SepConv3d(112, 224, 3, 1, 1))
        self.branch2 = nn.Sequential(BasicConv3d(512, 24, 1, 1), SepConv3d(24, 64, 3, 1, 1))
        self.branch3 = nn.Sequential(nn.MaxPool3d(3, stride=1, padding=1), BasicConv3d(512, 64, 1, 1))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return _mixed_forward(self.branch0, self.branch1, self.branch2, self.branch3, x)


class Mixed_4d(nn.Module):
    def __init__(self):
        super().__init__()
        self.branch0 = nn.Sequential(BasicConv3d(512, 128, 1, 1))
        self.branch1 = nn.Sequential(BasicConv3d(512, 128, 1, 1), SepConv3d(128, 256, 3, 1, 1))
        self.branch2 = nn.Sequential(BasicConv3d(512, 24, 1, 1), SepConv3d(24, 64, 3, 1, 1))
        self.branch3 = nn.Sequential(nn.MaxPool3d(3, stride=1, padding=1), BasicConv3d(512, 64, 1, 1))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return _mixed_forward(self.branch0, self.branch1, self.branch2, self.branch3, x)


class Mixed_4e(nn.Module):
    def __init__(self):
        super().__init__()
        self.branch0 = nn.Sequential(BasicConv3d(512, 112, 1, 1))
        self.branch1 = nn.Sequential(BasicConv3d(512, 144, 1, 1), SepConv3d(144, 288, 3, 1, 1))
        self.branch2 = nn.Sequential(BasicConv3d(512, 32, 1, 1), SepConv3d(32, 64, 3, 1, 1))
        self.branch3 = nn.Sequential(nn.MaxPool3d(3, stride=1, padding=1), BasicConv3d(512, 64, 1, 1))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return _mixed_forward(self.branch0, self.branch1, self.branch2, self.branch3, x)


class Mixed_4f(nn.Module):
    def __init__(self):
        super().__init__()
        self.branch0 = nn.Sequential(BasicConv3d(528, 256, 1, 1))
        self.branch1 = nn.Sequential(BasicConv3d(528, 160, 1, 1), SepConv3d(160, 320, 3, 1, 1))
        self.branch2 = nn.Sequential(BasicConv3d(528, 32, 1, 1), SepConv3d(32, 128, 3, 1, 1))
        self.branch3 = nn.Sequential(nn.MaxPool3d(3, stride=1, padding=1), BasicConv3d(528, 128, 1, 1))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return _mixed_forward(self.branch0, self.branch1, self.branch2, self.branch3, x)


class Mixed_5b(nn.Module):
    def __init__(self):
        super().__init__()
        self.branch0 = nn.Sequential(BasicConv3d(832, 256, 1, 1))
        self.branch1 = nn.Sequential(BasicConv3d(832, 160, 1, 1), SepConv3d(160, 320, 3, 1, 1))
        self.branch2 = nn.Sequential(BasicConv3d(832, 32, 1, 1), SepConv3d(32, 128, 3, 1, 1))
        self.branch3 = nn.Sequential(nn.MaxPool3d(3, stride=1, padding=1), BasicConv3d(832, 128, 1, 1))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return _mixed_forward(self.branch0, self.branch1, self.branch2, self.branch3, x)


class Mixed_5c(nn.Module):
    def __init__(self):
        super().__init__()
        self.branch0 = nn.Sequential(BasicConv3d(832, 384, 1, 1))
        self.branch1 = nn.Sequential(BasicConv3d(832, 192, 1, 1), SepConv3d(192, 384, 3, 1, 1))
        self.branch2 = nn.Sequential(BasicConv3d(832, 48, 1, 1), SepConv3d(48, 128, 3, 1, 1))
        self.branch3 = nn.Sequential(nn.MaxPool3d(3, stride=1, padding=1), BasicConv3d(832, 128, 1, 1))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return _mixed_forward(self.branch0, self.branch1, self.branch2, self.branch3, x)


# ---------------------------------------------------------------------------
# Main network
# ---------------------------------------------------------------------------

class TASED_v2(nn.Module):
    """TASED-Net v2: S3D encoder + unpooling decoder.

    Input:  (B, 3, 32, 224, 384) — batch of 32-frame RGB clips
    Output: (B, 224, 384) — one saliency map per clip, values in [0, 1]
    """

    TEMPORAL_LENGTH = 32
    INPUT_HEIGHT = 224
    INPUT_WIDTH = 384

    def __init__(self):
        super().__init__()

        # --- Encoder ---
        self.base1 = nn.Sequential(
            SepConv3d(3, 64, kernel_size=7, stride=2, padding=3),
            nn.MaxPool3d(kernel_size=(1, 3, 3), stride=(1, 2, 2), padding=(0, 1, 1)),
            BasicConv3d(64, 64, kernel_size=1, stride=1),
            SepConv3d(64, 192, kernel_size=3, stride=1, padding=1),
        )
        self.maxp2 = nn.MaxPool3d(kernel_size=(1, 3, 3), stride=(1, 2, 2), padding=(0, 1, 1))
        self.maxm2 = nn.MaxPool3d(kernel_size=(4, 1, 1), stride=(4, 1, 1))
        self.maxt2 = nn.MaxPool3d(kernel_size=(1, 3, 3), stride=(1, 2, 2), padding=(0, 1, 1), return_indices=True)

        self.base2 = nn.Sequential(Mixed_3b(), Mixed_3c())

        self.maxp3 = nn.MaxPool3d(kernel_size=(3, 3, 3), stride=(2, 2, 2), padding=(1, 1, 1))
        self.maxm3 = nn.MaxPool3d(kernel_size=(4, 1, 1), stride=(4, 1, 1))
        self.maxt3 = nn.MaxPool3d(kernel_size=(1, 3, 3), stride=(1, 2, 2), padding=(0, 1, 1), return_indices=True)

        self.base3 = nn.Sequential(Mixed_4b(), Mixed_4c(), Mixed_4d(), Mixed_4e(), Mixed_4f())

        self.maxt4 = nn.MaxPool3d(kernel_size=(2, 1, 1), stride=(2, 1, 1))
        self.maxp4 = nn.MaxPool3d(kernel_size=(1, 2, 2), stride=(1, 2, 2), return_indices=True)

        self.base4 = nn.Sequential(Mixed_5b(), Mixed_5c())

        # --- Decoder ---
        self.convtsp1 = nn.Sequential(
            nn.Conv3d(1024, 1024, kernel_size=1, stride=1, bias=False),
            nn.BatchNorm3d(1024, eps=1e-3, momentum=0.001, affine=True),
            nn.ReLU(),
            nn.ConvTranspose3d(1024, 832, kernel_size=(1, 3, 3), stride=1, padding=(0, 1, 1), bias=False),
            nn.BatchNorm3d(832, eps=1e-3, momentum=0.001, affine=True),
            nn.ReLU(),
        )
        self.unpool1 = nn.MaxUnpool3d(kernel_size=(1, 2, 2), stride=(1, 2, 2))

        self.convtsp2 = nn.Sequential(
            nn.ConvTranspose3d(832, 480, kernel_size=(1, 3, 3), stride=1, padding=(0, 1, 1), bias=False),
            nn.BatchNorm3d(480, eps=1e-3, momentum=0.001, affine=True),
            nn.ReLU(),
        )
        self.unpool2 = nn.MaxUnpool3d(kernel_size=(1, 3, 3), stride=(1, 2, 2), padding=(0, 1, 1))

        self.convtsp3 = nn.Sequential(
            nn.ConvTranspose3d(480, 192, kernel_size=(1, 3, 3), stride=1, padding=(0, 1, 1), bias=False),
            nn.BatchNorm3d(192, eps=1e-3, momentum=0.001, affine=True),
            nn.ReLU(),
        )
        self.unpool3 = nn.MaxUnpool3d(kernel_size=(1, 3, 3), stride=(1, 2, 2), padding=(0, 1, 1))

        self.convtsp4 = nn.Sequential(
            nn.ConvTranspose3d(192, 64, kernel_size=(1, 4, 4), stride=(1, 2, 2), padding=(0, 1, 1), bias=False),
            nn.BatchNorm3d(64, eps=1e-3, momentum=0.001, affine=True),
            nn.ReLU(),
            nn.Conv3d(64, 64, kernel_size=(2, 1, 1), stride=(2, 1, 1), bias=False),
            nn.BatchNorm3d(64, eps=1e-3, momentum=0.001, affine=True),
            nn.ReLU(),
            nn.ConvTranspose3d(64, 4, kernel_size=1, stride=1, bias=False),
            nn.BatchNorm3d(4, eps=1e-3, momentum=0.001, affine=True),
            nn.ReLU(),
            nn.Conv3d(4, 4, kernel_size=(2, 1, 1), stride=(2, 1, 1), bias=False),
            nn.BatchNorm3d(4, eps=1e-3, momentum=0.001, affine=True),
            nn.ReLU(),
            nn.ConvTranspose3d(4, 4, kernel_size=(1, 4, 4), stride=(1, 2, 2), padding=(0, 1, 1), bias=False),
            nn.Conv3d(4, 1, kernel_size=1, stride=1, bias=True),
            nn.Sigmoid(),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # Encoder with skip connections for unpooling indices
        y3 = self.base1(x)
        y = self.maxp2(y3)
        y3 = self.maxm2(y3)
        _, i2 = self.maxt2(y3)

        y2 = self.base2(y)
        y = self.maxp3(y2)
        y2 = self.maxm3(y2)
        _, i1 = self.maxt3(y2)

        y1 = self.base3(y)
        y = self.maxt4(y1)
        y, i0 = self.maxp4(y)

        y0 = self.base4(y)

        # Decoder with unpooling
        z = self.convtsp1(y0)
        z = self.unpool1(z, i0)
        z = self.convtsp2(z)
        z = self.unpool2(z, i1, y2.size())
        z = self.convtsp3(z)
        z = self.unpool3(z, i2, y3.size())
        z = self.convtsp4(z)

        return z.view(z.size(0), z.size(3), z.size(4))


def load_weights(model: TASED_v2, weight_path: str) -> TASED_v2:
    """Load pretrained weights, handling 'module.' prefix from DataParallel."""
    weight_dict = torch.load(weight_path, map_location="cpu", weights_only=False)
    model_dict = model.state_dict()

    cleaned = {
        (name.replace("module.", "", 1) if name.startswith("module.") else name): param
        for name, param in weight_dict.items()
    }

    compatible = {
        name: param
        for name, param in cleaned.items()
        if name in model_dict and param.size() == model_dict[name].size()
    }

    model_dict.update(compatible)
    model.load_state_dict(model_dict)
    return model
