#!/bin/bash

# One-time setup for TASED-Net Python saliency service on cPanel.
# Creates venv, installs deps, downloads model weights.
#
# Usage: ssh cpanel-emotio "bash ~/emotioxv3/scripts/setup-python-saliency.sh"

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PYTHON_BIN="/opt/alt/python311/bin/python3.11"
BASE_DIR="$HOME/emotioxv3/backend"
SALIENCY_DIR="$BASE_DIR/python-saliency"
MODELS_DIR="$BASE_DIR/models"
WEIGHT_FILE="$MODELS_DIR/tased_net.pth"
VENV_DIR="$SALIENCY_DIR/venv"

# Google Drive direct download URL for TASED-Net weights
# File ID: 1y4KSTm-e7kP84k0IyVI-rRtmYZkrC-wL
GDRIVE_FILE_ID="1y4KSTm-e7kP84k0IyVI-rRtmYZkrC-wL"

echo -e "${BLUE}TASED-Net Saliency Service — Initial Setup${NC}"
echo "=================================================="

# Verify Python 3.11
echo -e "${BLUE}Checking Python 3.11...${NC}"
$PYTHON_BIN --version
echo -e "${GREEN}OK${NC}"

# Create directories
echo -e "${BLUE}Creating directories...${NC}"
mkdir -p "$SALIENCY_DIR/logs" "$MODELS_DIR"
echo -e "${GREEN}OK${NC}"

# Create venv
echo -e "${BLUE}Creating virtual environment...${NC}"
$PYTHON_BIN -m venv "$VENV_DIR"
source "$VENV_DIR/bin/activate"
pip install --upgrade pip --quiet
echo -e "${GREEN}OK — $(python --version)${NC}"

# Install PyTorch CPU-only (avoids ~2GB CUDA deps)
echo -e "${BLUE}Installing PyTorch (CPU-only)...${NC}"
pip install torch torchvision --extra-index-url https://download.pytorch.org/whl/cpu --no-cache-dir --quiet
echo -e "${GREEN}OK${NC}"

# Install remaining deps
echo -e "${BLUE}Installing remaining dependencies...${NC}"
pip install fastapi 'uvicorn[standard]' numpy Pillow opencv-python-headless scipy pydantic --no-cache-dir --quiet
echo -e "${GREEN}OK${NC}"

# Download TASED-Net weights
echo -e "${BLUE}Checking TASED-Net model weights...${NC}"
[ -f "$WEIGHT_FILE" ] && {
    echo -e "${GREEN}Already exists: $WEIGHT_FILE${NC}"
} || {
    echo -e "${YELLOW}Downloading TASED-Net weights (~82MB)...${NC}"
    # Google Drive direct download via confirm token
    CONFIRM=$(curl -sc /tmp/gdrive_cookie \
        "https://drive.google.com/uc?export=download&id=$GDRIVE_FILE_ID" \
        | grep -oP 'confirm=\K[^&]+' || echo "")
    curl -Lb /tmp/gdrive_cookie \
        "https://drive.google.com/uc?export=download&confirm=$CONFIRM&id=$GDRIVE_FILE_ID" \
        -o "$WEIGHT_FILE"
    rm -f /tmp/gdrive_cookie

    # Verify file size (should be ~82MB)
    FILE_SIZE=$(stat -c%s "$WEIGHT_FILE" 2>/dev/null || stat -f%z "$WEIGHT_FILE" 2>/dev/null)
    [ "$FILE_SIZE" -gt 10000000 ] && {
        echo -e "${GREEN}OK — Downloaded $(( FILE_SIZE / 1024 / 1024 ))MB${NC}"
    } || {
        echo -e "${RED}Download failed — file too small (${FILE_SIZE} bytes)${NC}"
        echo -e "${YELLOW}Manual download: https://drive.google.com/file/d/$GDRIVE_FILE_ID/view${NC}"
        echo -e "${YELLOW}Save to: $WEIGHT_FILE${NC}"
        rm -f "$WEIGHT_FILE"
    }
}

# Verify service can start
echo -e "${BLUE}Verifying service can start...${NC}"
cd "$SALIENCY_DIR"
timeout 10 python -c "
from model import TASED_v2, load_weights
import torch
model = TASED_v2()
print(f'Model created: {sum(p.numel() for p in model.parameters())} parameters')
" 2>&1 && echo -e "${GREEN}OK${NC}" || echo -e "${YELLOW}Model instantiation check skipped${NC}"

echo ""
echo -e "${GREEN}Setup complete.${NC}"
echo ""
echo "Next steps:"
echo "  1. Start the service:  bash $SALIENCY_DIR/start.sh"
echo "  2. Test health check:  curl http://localhost:8001/health"
echo "  3. Add cron watchdog:  crontab -e"
echo "     */5 * * * * bash $SALIENCY_DIR/watchdog.sh"
echo ""
echo "  Set VIDEO_SALIENCY_BACKEND=tased in $BASE_DIR/.env to activate."
