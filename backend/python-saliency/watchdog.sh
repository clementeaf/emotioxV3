#!/bin/bash
# Cron watchdog: restart TASED-Net service when not running.
# Usage: */5 * * * * bash ~/emotioxv3/backend/python-saliency/watchdog.sh
DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$DIR/pid.txt"

[ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null && exit 0

echo "$(date): Process not running — restarting" >> "$DIR/logs/watchdog.log"
bash "$DIR/start.sh"
