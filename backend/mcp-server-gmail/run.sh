#!/bin/bash
cd "$(dirname "$0")/../.."
# Silenciar dotenv para evitar mensajes en stdout (MCP requiere solo JSON)
source .env 2>/dev/null || true
export GMAIL_CLIENT_ID GMAIL_CLIENT_SECRET GMAIL_REDIRECT_URI
# Ejecutar el servidor MCP (stdout solo JSON, stderr para logs)
exec node backend/mcp-server-gmail/dist/index.js
