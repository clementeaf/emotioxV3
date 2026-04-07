"""Convert TranSalNet_Res from PyTorch to ONNX format."""
import sys
import os

# Change to TranSalNet directory so relative paths work
script_dir = os.path.dirname(os.path.abspath(__file__))
transal_dir = os.path.join(script_dir, 'TranSalNet')
os.chdir(transal_dir)
sys.path.insert(0, transal_dir)

import torch
import onnx
from TranSalNet_Res import TranSalNet

print("Loading model...")
model = TranSalNet()
state_dict = torch.load(
    'pretrained_models/TranSalNet_Res.pth',
    map_location='cpu',
    weights_only=False
)
model.load_state_dict(state_dict)
model.eval()
print("Model loaded successfully")

# Input: batch=1, channels=3, height=288, width=384
dummy_input = torch.randn(1, 3, 288, 384)

print("Exporting to ONNX...")
output_path = os.path.join(script_dir, "transalnet_res.onnx")
torch.onnx.export(
    model,
    dummy_input,
    output_path,
    opset_version=14,
    input_names=["input"],
    output_names=["saliency_map"],
    dynamic_axes={
        "input": {0: "batch"},
        "saliency_map": {0: "batch"}
    },
    dynamo=False
)

# Verify
print("Verifying ONNX model...")
onnx_model = onnx.load(output_path)
onnx.checker.check_model(onnx_model)

size_mb = os.path.getsize(output_path) / (1024 * 1024)
print(f"Done! Model saved to {output_path} ({size_mb:.1f} MB)")
print(f"Input: [batch, 3, 288, 384] (RGB, normalized)")
print(f"Output: [batch, 1, 288, 384] (saliency map, 0-1)")
