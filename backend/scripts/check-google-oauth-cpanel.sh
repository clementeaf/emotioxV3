#!/bin/bash

# Script para verificar la configuración de Google OAuth en el servidor cPanel

SSH_HOST="${CPANEL_SSH_USER}@${CPANEL_SSH_HOST}"
SSH_PORT="${CPANEL_SSH_PORT:-22}"
REMOTE_BACKEND_DIR="~/emotioxv3/backend"

echo "🔍 Verificando configuración de Google OAuth en cPanel..."
echo ""

# Verificar si el archivo existe
echo "1. Verificando archivo google-credentials.json:"
ssh -p "$SSH_PORT" "$SSH_HOST" "
    cd $REMOTE_BACKEND_DIR
    echo '   Directorio actual: \$(pwd)'
    echo '   Archivo google-credentials.json existe: \$(test -f google-credentials.json && echo 'SÍ' || echo 'NO')'
    if [ -f google-credentials.json ]; then
        echo '   Ruta completa: \$(pwd)/google-credentials.json'
        echo '   Tamaño: \$(ls -lh google-credentials.json | awk '{print \$5}')'
    fi
"

echo ""
echo "2. Verificando variables de entorno en .env:"
ssh -p "$SSH_PORT" "$SSH_HOST" "
    cd $REMOTE_BACKEND_DIR
    if [ -f .env ]; then
        echo '   GOOGLE_CREDENTIALS_PATH: \$(grep GOOGLE_CREDENTIALS_PATH .env | cut -d= -f2 || echo 'no configurado')'
        echo '   GOOGLE_CLIENT_ID: \$(grep GOOGLE_CLIENT_ID .env | cut -d= -f2 | head -c 20 || echo 'no configurado')...'
        echo '   GOOGLE_CLIENT_SECRET: \$(grep GOOGLE_CLIENT_SECRET .env | grep -v '^#' | cut -d= -f2 | head -c 10 || echo 'no configurado')...'
    else
        echo '   ⚠️  Archivo .env no encontrado'
    fi
"

echo ""
echo "3. Verificando logs recientes de Passenger (últimas 50 líneas):"
ssh -p "$SSH_PORT" "$SSH_HOST" "
    cd $REMOTE_BACKEND_DIR
    # Buscar logs de Passenger
    if [ -f tmp/restart.txt ]; then
        echo '   Última modificación de restart.txt: \$(stat -c %y tmp/restart.txt 2>/dev/null || stat -f %Sm tmp/restart.txt 2>/dev/null)'
    fi
    
    # Buscar logs de error
    if [ -f error_log ]; then
        echo '   Últimas líneas de error_log con Google OAuth:'
        tail -50 error_log | grep -i 'google\|oauth' | tail -10 || echo '   No se encontraron errores relacionados'
    fi
    
    # Buscar logs de aplicación
    if [ -d logs ]; then
        echo '   Logs en directorio logs/:'
        ls -lh logs/ 2>/dev/null | tail -5 || echo '   No hay logs'
    fi
"

echo ""
echo "4. Verificando proceso de Node.js:"
ssh -p "$SSH_PORT" "$SSH_HOST" "
    ps aux | grep -E 'node|passenger' | grep -v grep | head -5
"

echo ""
echo "✅ Verificación completada"
echo ""
echo "💡 Para ver logs en tiempo real, ejecuta:"
echo "   ssh -p $SSH_PORT $SSH_HOST 'cd $REMOTE_BACKEND_DIR && tail -f error_log'"
