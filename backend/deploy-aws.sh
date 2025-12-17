#!/bin/bash

# ========================================
# Script de Deploy para Backend AWS Lambda
# ========================================
# Este script exporta todas las variables necesarias
# y despliega el backend a AWS usando Serverless Framework

set -e  # Exit on error

echo "🚀 EmotioxV3 Backend Deployment Script"
echo "======================================"
echo ""

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar que estamos en el directorio correcto
if [ ! -f "serverless.yml" ]; then
    echo -e "${RED}❌ Error: serverless.yml no encontrado${NC}"
    echo "Por favor ejecuta este script desde el directorio backend/"
    exit 1
fi

# Verificar que existe .env
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Error: Archivo .env no encontrado${NC}"
    echo "Crea un archivo .env con todas las variables necesarias"
    exit 1
fi

echo -e "${YELLOW}📋 Cargando variables de entorno desde .env...${NC}"

# Determinar qué archivo .env usar
if [ -f ".env.production" ]; then
    echo -e "${GREEN}  ✓ Usando .env.production (AWS)${NC}"
    ENV_FILE=".env.production"
else
    echo -e "${YELLOW}  ⚠️  .env.production no encontrado, usando .env${NC}"
    ENV_FILE=".env"
fi

# Exportar variables de entorno desde el archivo seleccionado
set -a
source $ENV_FILE
set +a

# Ensure Serverless dotenv plugin loads the same env file used above.
# This prevents .env (local) from overriding .env.production (AWS) during deploy.
export DOTENV_PATH="$ENV_FILE"

# Verificar variables críticas
REQUIRED_VARS=(
    "DB_HOST"
    "DB_PORT"
    "DB_NAME"
    "DB_USER"
    "DB_PASSWORD"
    "AWS_ACCESS_KEY_ID"
    "AWS_SECRET_ACCESS_KEY"
    "S3_BUCKET_NAME"
)

echo -e "${YELLOW}🔍 Verificando variables requeridas...${NC}"
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    else
        echo -e "${GREEN}  ✓${NC} $var está configurado"
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo -e "${RED}❌ Error: Faltan las siguientes variables en .env:${NC}"
    printf '  - %s\n' "${MISSING_VARS[@]}"
    exit 1
fi

echo ""
echo -e "${YELLOW}📦 Instalando dependencias...${NC}"
npm ci --legacy-peer-deps

echo ""
echo -e "${YELLOW}🔨 Compilando TypeScript...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error en la compilación${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}🚀 Desplegando a AWS...${NC}"
echo "   Region: ${APP_AWS_REGION:-us-east-1}"
echo "   Stage: ${API_STAGE:-dev}"
echo ""

# Deploy con serverless
npm run deploy

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ ¡Deployment exitoso!${NC}"
    echo ""
    echo -e "${YELLOW}📝 Próximos pasos:${NC}"
    echo "  1. Copia la URL del API Gateway que se muestra arriba"
    echo "  2. Actualiza VITE_API_URL en los frontends"
    echo "  3. Actualiza el GitHub Secret VITE_API_URL_PRODUCTION"
    echo ""
    
    # Mostrar info del stack
    echo -e "${YELLOW}📊 Información del stack:${NC}"
    serverless info
else
    echo -e "${RED}❌ Error en el deployment${NC}"
    exit 1
fi
