#!/bin/bash

# Script para desplegar research-frontend a cPanel
# Construye el frontend y lo despliega en ~/public_html/research

set -e

SSH_HOST="cpanel-emotio"
REMOTE_RESEARCH_DIR="~/public_html/research"
LOCAL_RESEARCH_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../research-frontend" && pwd)"

# Configurar ControlMaster para reutilizar conexiones SSH (evita múltiples passphrases)
SSH_CONTROL_PATH="/tmp/ssh-control-%r@%h:%p"
SSH_OPTS="-o ControlMaster=auto -o ControlPath=$SSH_CONTROL_PATH -o ControlPersist=300"

# Función para limpiar el socket de control al finalizar
cleanup_ssh() {
    ssh -O exit "$SSH_HOST" 2>/dev/null || true
}
trap cleanup_ssh EXIT

# Verificar si la clave está en ssh-agent, si no, agregarla automáticamente
if ! ssh-add -l 2>/dev/null | grep -q "cpanel"; then
    echo "🔑 Agregando clave SSH al agente..."
    SSH_KEY="$HOME/.ssh/cpanel_cursor"
    SSH_PASSPHRASE="clemente"
    if [ -f "$SSH_KEY" ]; then
        # Usar sshpass para agregar la clave automáticamente
        SSHPASS="$SSH_PASSPHRASE" sshpass -P "passphrase" -e ssh-add "$SSH_KEY" 2>/dev/null || {
            echo "⚠️  No se pudo agregar la clave automáticamente."
            echo "   Ejecuta manualmente: ssh-add ~/.ssh/cpanel_cursor"
        }
    fi
fi

echo "🚀 Desplegando Research Frontend a cPanel"
echo "=========================================="
echo ""

# Verificar que existe el directorio local
if [ ! -d "$LOCAL_RESEARCH_DIR" ]; then
    echo "❌ Error: No se encontró el directorio research-frontend"
    exit 1
fi

cd "$LOCAL_RESEARCH_DIR"

# 1. Actualizar runtime-config.json
echo "1. Configurando runtime-config.json..."
cat > public/runtime-config.json << 'EOF'
{
  "apiBaseUrl": "https://emotio.cx/api"
}
EOF
echo "   ✅ runtime-config.json actualizado"

# 2. Instalar dependencias si es necesario
if [ ! -d "node_modules" ]; then
    echo ""
    echo "2. Instalando dependencias..."
    npm install
    echo "   ✅ Dependencias instaladas"
else
    echo ""
    echo "2. Dependencias ya instaladas"
fi

# 3. Construir para producción
echo ""
echo "3. Construyendo para producción..."
npm run build
echo "   ✅ Build completado"

# 4. Verificar que existe el directorio dist
if [ ! -d "dist" ]; then
    echo "❌ Error: No se generó el directorio dist"
    exit 1
fi

# 5. Crear backup del directorio remoto si existe
echo ""
echo "4. Creando backup del directorio remoto..."
ssh $SSH_OPTS "$SSH_HOST" '
    REMOTE_DIR="$HOME/public_html/research"
    if [ -d "$REMOTE_DIR" ]; then
        BACKUP_DIR="${REMOTE_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
        cp -r "$REMOTE_DIR" "$BACKUP_DIR"
        echo "   ✅ Backup creado: $BACKUP_DIR"
    else
        mkdir -p "$REMOTE_DIR"
        echo "   ✅ Directorio creado"
    fi
'

# 6. Limpiar directorio remoto (excepto .well-known si existe)
echo ""
echo "5. Limpiando directorio remoto..."
ssh $SSH_OPTS "$SSH_HOST" '
    REMOTE_DIR="$HOME/public_html/research"
    cd "$REMOTE_DIR" || exit 1
    find . -mindepth 1 ! -name ".well-known" -exec rm -rf {} + 2>/dev/null || true
    echo "   ✅ Directorio limpiado"
'

# 7. Copiar archivos construidos
echo ""
echo "6. Copiando archivos construidos..."
rsync -avz --delete -e "ssh $SSH_OPTS" \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='src' \
    --exclude='*.ts' \
    --exclude='*.tsx' \
    --exclude='tsconfig*.json' \
    --exclude='vite.config.ts' \
    --exclude='package*.json' \
    --exclude='.env*' \
    --exclude='.gitignore' \
    --exclude='eslint.config.js' \
    --exclude='tailwind.config.js' \
    --exclude='postcss.config.js' \
    "$LOCAL_RESEARCH_DIR/dist/" "$SSH_HOST:$REMOTE_RESEARCH_DIR/"

# Copiar runtime-config.json
scp $SSH_OPTS "$LOCAL_RESEARCH_DIR/public/runtime-config.json" "$SSH_HOST:$REMOTE_RESEARCH_DIR/runtime-config.json"

echo "   ✅ Archivos copiados"

# 8. Verificar despliegue
echo ""
echo "7. Verificando despliegue..."
REMOTE_FILES=$(ssh $SSH_OPTS "$SSH_HOST" 'ls -1 "$HOME/public_html/research" 2>/dev/null | wc -l')
echo "   Archivos en remoto: $REMOTE_FILES"

if [ "$REMOTE_FILES" -gt 0 ]; then
    echo "   ✅ Despliegue exitoso"
else
    echo "   ⚠️  Advertencia: No se encontraron archivos en el directorio remoto"
fi

echo ""
echo "=========================================="
echo "✅ Despliegue completado"
echo "=========================================="
echo ""
echo "📋 Resumen:"
echo "   - Directorio local: $LOCAL_RESEARCH_DIR"
echo "   - Directorio remoto: $REMOTE_RESEARCH_DIR"
echo "   - API Base URL: https://emotio.cx"
echo ""
echo "🌐 URLs:"
echo "   - Research Frontend: https://emotio.cx/research"
echo "   - Backend API: https://emotio.cx"
echo ""
echo "📝 Próximos pasos:"
echo "   1. Verificar que el frontend carga correctamente"
echo "   2. Probar autenticación con Google"
echo "   3. Verificar que las peticiones al backend funcionan"
echo ""
