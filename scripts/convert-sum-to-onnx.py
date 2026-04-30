"""
Convert SUM (Saliency Unification through Mamba) PyTorch weights to ONNX format.

Note: SUM uses 256x256 input (different from TranSalNet's 384x288).
      The attention-prediction.service.ts will need MODEL_WIDTH/HEIGHT adjustment
      if using SUM. Consider making these configurable via env vars.

Usage:
  1. Clone SUM repo:
     git clone https://github.com/Arhosseini77/SUM.git /tmp/SUM

  2. Download pretrained weights from Google Drive:
     https://drive.google.com/file/d/14ma_hLe8DrVNuHCSKoOz41Q-rB1Hbg6A
     Place as /tmp/SUM/net/pre_trained_weights/sum_model.pth

  3. Download VMamba encoder weights:
     Place as /tmp/SUM/net/pre_trained_weights/vssmsmall_dp03_ckpt_epoch_238.pth

  4. Install dependencies:
     pip install torch torchvision onnx onnxruntime mamba-ssm causal-conv1d

  5. Run:
     python scripts/convert-sum-to-onnx.py --output backend/models/sum_model.onnx

  6. Update .env:
     SALIENCY_MODEL=sum_model.onnx
     SALIENCY_WIDTH=256
     SALIENCY_HEIGHT=256
"""

import argparse
import sys
import os

def convert(output_path: str, repo_path: str, condition: int):
    sys.path.insert(0, repo_path)

    import torch

    # SUM input dimensions
    MODEL_SIZE = 256

    try:
        from net.SUM import SUM  # type: ignore
    except ImportError:
        print("Failed to import SUM model. Make sure the repo is cloned and dependencies installed.")
        print("Required: pip install mamba-ssm causal-conv1d")
        sys.exit(1)

    weights_path = os.path.join(repo_path, 'net', 'pre_trained_weights', 'sum_model.pth')
    if not os.path.exists(weights_path):
        print(f"Weights not found: {weights_path}")
        sys.exit(1)

    print(f"Loading SUM model (condition={condition})...")
    model = SUM()
    model.load_state_dict(torch.load(weights_path, map_location='cpu'))
    model.eval()

    dummy_input = torch.randn(1, 3, MODEL_SIZE, MODEL_SIZE)
    dummy_condition = torch.tensor([condition])

    print(f"Exporting to ONNX: {output_path}...")
    os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)

    torch.onnx.export(
        model,
        (dummy_input, dummy_condition),
        output_path,
        export_params=True,
        opset_version=13,
        do_constant_folding=True,
        input_names=['input', 'condition'],
        output_names=['output'],
    )

    file_size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"Conversion complete: {output_path} ({file_size_mb:.1f} MB)")
    print(f"\nNote: SUM uses {MODEL_SIZE}x{MODEL_SIZE} input. Set SALIENCY_WIDTH=256 SALIENCY_HEIGHT=256 in .env")
    print(f"Condition codes: 0=SALICON, 1=eye-tracking, 2=e-commerce, 3=UI")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Convert SUM to ONNX')
    parser.add_argument('--output', default='backend/models/sum_model.onnx')
    parser.add_argument('--repo', default='/tmp/SUM')
    parser.add_argument('--condition', type=int, default=2,
                        help='Condition code: 0=SALICON, 1=eye-tracking, 2=e-commerce, 3=UI')
    args = parser.parse_args()
    convert(args.output, args.repo, args.condition)
