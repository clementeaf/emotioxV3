#!/bin/bash
cd "$(dirname "$0")/../.."
# Silenciar dotenv para evitar mensajes en stdout (MCP requiere solo JSON)
source .env 2>/dev/null || true
export DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD
# Ejecutar el servidor MCP (stdout solo JSON, stderr para logs)
exec node backend/mcp-server/dist/index.js

