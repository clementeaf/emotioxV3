"""
Convert TranSalNet PyTorch weights to ONNX format.

Usage:
  1. Clone TranSalNet repo:
     git clone https://github.com/LJOVO/TranSalNet.git /tmp/TranSalNet

  2. Download pretrained weights from the repo's Google Drive links:
     - TranSalNet_Dense: place as /tmp/TranSalNet/pretrained_models/TranSalNet_Dense.pth
     - TranSalNet_Res:   place as /tmp/TranSalNet/pretrained_models/TranSalNet_Res.pth

  3. Install dependencies:
     pip install torch torchvision onnx onnxruntime

  4. Run this script:
     python scripts/convert-transalnet-to-onnx.py --variant dense --output backend/models/transalnet_dense.onnx
     python scripts/convert-transalnet-to-onnx.py --variant res --output backend/models/transalnet_res_v2.onnx

  5. Update .env to use the new model:
     SALIENCY_MODEL=transalnet_dense.onnx

  6. Deploy:
     ./scripts/deploy-backend-cpanel.sh
"""

import argparse
import sys
import os

def convert(variant: str, output_path: str, repo_path: str):
    # Add TranSalNet repo to path
    sys.path.insert(0, repo_path)

    import torch

    # Input dimensions expected by TranSalNet
    MODEL_WIDTH = 384
    MODEL_HEIGHT = 288

    if variant == 'dense':
        from TranSalNet_Dense import TranSalNet  # type: ignore
        weights_path = os.path.join(repo_path, 'pretrained_models', 'TranSalNet_Dense.pth')
    elif variant == 'res':
        from TranSalNet_Res import TranSalNet  # type: ignore
        weights_path = os.path.join(repo_path, 'pretrained_models', 'TranSalNet_Res.pth')
    else:
        print(f"Unknown variant: {variant}. Use 'dense' or 'res'.")
        sys.exit(1)

    if not os.path.exists(weights_path):
        print(f"Weights not found: {weights_path}")
        print(f"Download from the TranSalNet repo's Google Drive links.")
        sys.exit(1)

    print(f"Loading {variant} model from {weights_path}...")
    model = TranSalNet()
    model.load_state_dict(torch.load(weights_path, map_location='cpu'))
    model.eval()

    # Dummy input: batch=1, channels=3, height=288, width=384
    dummy_input = torch.randn(1, 3, MODEL_HEIGHT, MODEL_WIDTH)

    print(f"Exporting to ONNX: {output_path}...")
    os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)

    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        export_params=True,
        opset_version=18,
        do_constant_folding=True,
        input_names=['input'],
        output_names=['output'],
        dynamo=False,
    )

    # Verify
    import onnx
    onnx_model = onnx.load(output_path)
    onnx.checker.check_model(onnx_model)

    file_size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"Conversion complete: {output_path} ({file_size_mb:.1f} MB)")
    print(f"\nTo use: set SALIENCY_MODEL={os.path.basename(output_path)} in backend/.env")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Convert TranSalNet to ONNX')
    parser.add_argument('--variant', choices=['dense', 'res'], default='dense',
                        help='Model variant: dense (DenseNet-161) or res (ResNet-50)')
    parser.add_argument('--output', default='backend/models/transalnet_dense.onnx',
                        help='Output ONNX file path')
    parser.add_argument('--repo', default='/tmp/TranSalNet',
                        help='Path to cloned TranSalNet repo')
    args = parser.parse_args()
    convert(args.variant, args.output, args.repo)
