#!/bin/bash

# Script de despliegue completo de EmotioX V3 a cPanel
# Ejecuta builds, compilaciones y despliegues de todas las aplicaciones

set -euo pipefail

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
SSH_HOST="cpanel-emotio"
REMOTE_USER="emotvehe"
REMOTE_BASE_DIR="~/emotioxv3"
REMOTE_PUBLIC_HTML="~/public_html"
LOCAL_PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${BLUE}🚀 Despliegue de EmotioX V3 a cPanel${NC}"
echo "=================================================="
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -d "$LOCAL_PROJECT_DIR/backend" ] || [ ! -d "$LOCAL_PROJECT_DIR/research-frontend" ] || [ ! -d "$LOCAL_PROJECT_DIR/participant-frontend" ]; then
    echo -e "${RED}❌ Error: No se encontraron los directorios del proyecto${NC}"
    echo "   Asegúrate de ejecutar este script desde la raíz del proyecto"
    exit 1
fi

# Verificar conexión SSH
echo -e "${BLUE}🔍 Verificando conexión SSH...${NC}"
if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "$SSH_HOST" "echo 'OK'" &>/dev/null; then
    echo -e "${RED}❌ Error: No se puede conectar a $SSH_HOST${NC}"
    echo "   Ejecuta: ./scripts/setup-ssh-agent.sh"
    exit 1
fi
echo -e "${GREEN}✅ Conexión SSH establecida${NC}"
echo ""

# Función para ejecutar comandos remotos
run_remote() {
    ssh "$SSH_HOST" "$@"
}

# Función para transferir archivos
transfer_files() {
    rsync -avz --delete "$1" "$SSH_HOST:$2"
}

# Paso 1: Crear estructura de directorios en servidor
echo -e "${BLUE}📁 Creando estructura de directorios...${NC}"
run_remote "mkdir -p $REMOTE_BASE_DIR/{backend,research-frontend,participant-frontend,scripts}"
run_remote "mkdir -p $REMOTE_PUBLIC_HTML/{research,participant,api}"
echo -e "${GREEN}✅ Estructura creada${NC}"
echo ""

# Paso 2: Transferir código fuente
echo -e "${BLUE}📦 Transferiendo código fuente...${NC}"

# Backend
echo "  → Backend..."
transfer_files "$LOCAL_PROJECT_DIR/backend/" "$REMOTE_BASE_DIR/backend/"

# Research Frontend
echo "  → Research Frontend..."
transfer_files "$LOCAL_PROJECT_DIR/research-frontend/" "$REMOTE_BASE_DIR/research-frontend/"

# Participant Frontend
echo "  → Participant Frontend..."
transfer_files "$LOCAL_PROJECT_DIR/participant-frontend/" "$REMOTE_BASE_DIR/participant-frontend/"

echo -e "${GREEN}✅ Código transferido${NC}"
echo ""

# Paso 3: Instalar dependencias y hacer build en servidor
echo -e "${BLUE}🔨 Compilando aplicaciones en servidor...${NC}"

# Backend
echo "  → Backend: Instalando dependencias..."
run_remote "cd $REMOTE_BASE_DIR/backend && npm install --production=false"
echo "  → Backend: Compilando TypeScript..."
run_remote "cd $REMOTE_BASE_DIR/backend && npm run build"

# Research Frontend
echo "  → Research Frontend: Instalando dependencias..."
run_remote "cd $REMOTE_BASE_DIR/research-frontend && npm install"
echo "  → Research Frontend: Building..."
run_remote "cd $REMOTE_BASE_DIR/research-frontend && npm run build"

# Participant Frontend
echo "  → Participant Frontend: Instalando dependencias..."
run_remote "cd $REMOTE_BASE_DIR/participant-frontend && npm install"
echo "  → Participant Frontend: Building..."
run_remote "cd $REMOTE_BASE_DIR/participant-frontend && npm run build"

echo -e "${GREEN}✅ Builds completados${NC}"
echo ""

# Paso 4: Desplegar frontends a public_html
echo -e "${BLUE}📤 Desplegando frontends...${NC}"

# Research Frontend
echo "  → Research Frontend → public_html/research/"
run_remote "rsync -avz --delete $REMOTE_BASE_DIR/research-frontend/dist/ $REMOTE_PUBLIC_HTML/research/"

# Participant Frontend
echo "  → Participant Frontend → public_html/participant/"
run_remote "rsync -avz --delete $REMOTE_BASE_DIR/participant-frontend/dist/ $REMOTE_PUBLIC_HTML/participant/"

echo -e "${GREEN}✅ Frontends desplegados${NC}"
echo ""

# Paso 5: Configurar runtime-config.json
echo -e "${BLUE}⚙️  Configurando runtime-config.json...${NC}"

# Obtener URL del backend (preguntar al usuario o usar default)
read -p "URL del backend API (ej: https://emotio.cx/api): " API_URL
API_URL=${API_URL:-"https://emotio.cx/api"}

RUNTIME_CONFIG="{\"apiBaseUrl\":\"$API_URL\"}"

run_remote "echo '$RUNTIME_CONFIG' > $REMOTE_PUBLIC_HTML/research/runtime-config.json"
run_remote "echo '$RUNTIME_CONFIG' > $REMOTE_PUBLIC_HTML/participant/runtime-config.json"

echo -e "${GREEN}✅ runtime-config.json configurado${NC}"
echo ""

# Paso 6: Configurar backend para Passenger (si es necesario)
echo -e "${BLUE}🔧 Configurando backend para Passenger...${NC}"

# Verificar si existe passenger_wsgi.py
if [ -f "$LOCAL_PROJECT_DIR/backend/passenger_wsgi.py" ]; then
    echo "  → Copiando passenger_wsgi.py..."
    transfer_files "$LOCAL_PROJECT_DIR/backend/passenger_wsgi.py" "$REMOTE_BASE_DIR/backend/"
    run_remote "chmod +x $REMOTE_BASE_DIR/backend/passenger_wsgi.py"
fi

echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
echo "   1. Configura las variables de entorno en $REMOTE_BASE_DIR/backend/.env"
echo "   2. Configura Passenger en cPanel → Applications → Node.js"
echo "   3. Apunta Passenger a: $REMOTE_BASE_DIR/backend/passenger_wsgi.py"
echo ""

# Paso 7: Verificar despliegue
echo -e "${BLUE}✅ Verificando despliegue...${NC}"

# Verificar que los archivos existen
if run_remote "test -f $REMOTE_PUBLIC_HTML/research/index.html && test -f $REMOTE_PUBLIC_HTML/participant/index.html"; then
    echo -e "${GREEN}✅ Frontends desplegados correctamente${NC}"
else
    echo -e "${RED}❌ Error: Algunos archivos no se encontraron${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Despliegue completado${NC}"
echo ""
echo "=================================================="
echo -e "${BLUE}📋 Próximos pasos:${NC}"
echo ""
echo "1. Configurar variables de entorno del backend:"
echo "   ssh $SSH_HOST"
echo "   nano $REMOTE_BASE_DIR/backend/.env"
echo ""
echo "2. Configurar Passenger en cPanel:"
echo "   - Ir a: Applications → Node.js"
echo "   - Crear nueva aplicación"
echo "   - Node.js version: 24.12.0"
echo "   - Application root: $REMOTE_BASE_DIR/backend"
echo "   - Application URL: /api"
echo "   - Application startup file: passenger_wsgi.py"
echo ""
echo "3. Verificar que el backend esté corriendo:"
echo "   ssh $SSH_HOST 'cd $REMOTE_BASE_DIR/backend && npm start'"
echo ""
echo "4. Probar las aplicaciones:"
echo "   - Research: https://emotio.cx/research"
echo "   - Participant: https://emotio.cx/participant"
echo "   - API: https://emotio.cx/api/health"
echo ""
