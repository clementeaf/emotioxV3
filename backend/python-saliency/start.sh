#!/bin/bash
# Start TASED-Net saliency service on localhost:8001
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

source venv/bin/activate

mkdir -p logs

nohup uvicorn app:app \
  --host 127.0.0.1 \
  --port "${TASED_PORT:-8001}" \
  --workers 1 \
  --timeout-keep-alive 300 \
  >> logs/uvicorn.log 2>&1 &

echo $! > pid.txt
echo "Started TASED-Net service PID $(cat pid.txt) on port ${TASED_PORT:-8001}"
