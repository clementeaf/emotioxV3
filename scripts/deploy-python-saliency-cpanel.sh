#!/bin/bash

# Deploy TASED-Net Python saliency service to cPanel.
# Syncs code, reinstalls deps if requirements changed, restarts service.
#
# Usage: ./scripts/deploy-python-saliency-cpanel.sh

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SSH_HOST="cpanel-emotio"
LOCAL_PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCAL_SALIENCY_DIR="$LOCAL_PROJECT_DIR/backend/python-saliency"
REMOTE_SALIENCY_DIR="~/emotioxv3/backend/python-saliency"
REMOTE_MODELS_DIR="~/emotioxv3/backend/models"

echo -e "${BLUE}TASED-Net Saliency Service — Deploy to cPanel${NC}"
echo "=================================================="

# Verify local source exists
[ -d "$LOCAL_SALIENCY_DIR" ] || {
    echo -e "${RED}Error: $LOCAL_SALIENCY_DIR not found${NC}"
    exit 1
}

# Verify SSH connection
echo -e "${BLUE}Verifying SSH...${NC}"
ssh -o ConnectTimeout=5 -o BatchMode=yes "$SSH_HOST" "echo 'OK'" &>/dev/null || {
    echo -e "${RED}Cannot connect to $SSH_HOST${NC}"
    exit 1
}
echo -e "${GREEN}OK${NC}"

# Sync source code (exclude venv, logs, pid, __pycache__)
echo -e "${BLUE}Syncing source code...${NC}"
rsync -avz \
    --exclude 'venv/' \
    --exclude 'logs/' \
    --exclude 'pid.txt' \
    --exclude '__pycache__/' \
    --exclude '.pytest_cache/' \
    --exclude 'tests/' \
    "$LOCAL_SALIENCY_DIR/" "$SSH_HOST:$REMOTE_SALIENCY_DIR/"
echo -e "${GREEN}OK${NC}"

# Check if requirements changed and reinstall
echo -e "${BLUE}Checking dependencies...${NC}"
NEEDS_INSTALL=$(ssh "$SSH_HOST" "
    cd $REMOTE_SALIENCY_DIR
    [ -f venv/requirements.hash ] || echo 'yes'
    [ -f venv/requirements.hash ] && {
        NEW_HASH=\$(md5sum requirements.txt | cut -d' ' -f1)
        OLD_HASH=\$(cat venv/requirements.hash)
        [ \"\$NEW_HASH\" != \"\$OLD_HASH\" ] && echo 'yes' || echo 'no'
    }
" | tail -1)

[ "$NEEDS_INSTALL" = "yes" ] && {
    echo -e "${YELLOW}Dependencies changed — reinstalling...${NC}"
    ssh "$SSH_HOST" "
        cd $REMOTE_SALIENCY_DIR
        source venv/bin/activate
        pip install -r requirements.txt --quiet
        md5sum requirements.txt | cut -d' ' -f1 > venv/requirements.hash
    "
    echo -e "${GREEN}OK${NC}"
} || echo -e "${GREEN}Dependencies up to date${NC}"

# Sync TASED-Net weights (if local copy exists and remote doesn't)
LOCAL_WEIGHTS="$LOCAL_PROJECT_DIR/backend/models/tased_net.pth"
[ -f "$LOCAL_WEIGHTS" ] && {
    echo -e "${BLUE}Checking model weights...${NC}"
    WEIGHTS_EXIST=$(ssh "$SSH_HOST" "test -f $REMOTE_MODELS_DIR/tased_net.pth && echo 'yes' || echo 'no'")
    [ "$WEIGHTS_EXIST" = "no" ] && {
        echo -e "${YELLOW}Uploading TASED-Net weights (~82MB)...${NC}"
        ssh "$SSH_HOST" "mkdir -p $REMOTE_MODELS_DIR"
        rsync -avz --progress "$LOCAL_WEIGHTS" "$SSH_HOST:$REMOTE_MODELS_DIR/tased_net.pth"
        echo -e "${GREEN}OK${NC}"
    } || echo -e "${GREEN}Weights already on server${NC}"
} || echo -e "${YELLOW}No local weights — skipping sync${NC}"

# Restart service
echo -e "${BLUE}Restarting service...${NC}"
ssh "$SSH_HOST" "
    cd $REMOTE_SALIENCY_DIR
    # Stop existing process
    [ -f pid.txt ] && kill \$(cat pid.txt) 2>/dev/null || true
    sleep 1
    # Start fresh
    bash start.sh
"
echo -e "${GREEN}OK${NC}"

# Health check
echo -e "${BLUE}Health check...${NC}"
sleep 2
HEALTH=$(ssh "$SSH_HOST" "curl -s http://localhost:8001/health 2>/dev/null || echo 'FAILED'")
echo "$HEALTH" | grep -q '"status":"ok"' && {
    echo -e "${GREEN}Service healthy: $HEALTH${NC}"
} || {
    echo -e "${RED}Health check failed: $HEALTH${NC}"
    echo -e "${YELLOW}Check logs: ssh $SSH_HOST 'tail -20 $REMOTE_SALIENCY_DIR/logs/uvicorn.log'${NC}"
}

echo ""
echo -e "${GREEN}Deploy complete.${NC}"
