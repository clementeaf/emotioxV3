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

echo -e "${YELLOW}📋 Deploy using AWS SSM Parameter Store (no .env required)${NC}"
echo -e "${YELLOW}   This will read configuration from /emotioxv3/${API_STAGE:-dev}/* in SSM.${NC}"

echo -e "${YELLOW}🔍 Verificando AWS credentials y parámetros SSM...${NC}"
if ! aws sts get-caller-identity >/dev/null 2>&1; then
    echo -e "${RED}❌ Error: AWS CLI no tiene credenciales válidas (aws sts get-caller-identity falló)${NC}"
    exit 1
fi

STAGE="${API_STAGE:-dev}"
REGION="${AWS_REGION:-us-east-1}"
PREFIX="/emotioxv3/${STAGE}"

REQUIRED_PARAMS=(
  "DB_HOST"
  "DB_PORT"
  "DB_NAME"
  "DB_USER"
  "DB_PASSWORD"
  "DB_SSL"
  "S3_BUCKET_NAME"
  "JWT_SECRET"
  "JWT_REFRESH_SECRET"
)

MISSING_PARAMS=()
for key in "${REQUIRED_PARAMS[@]}"; do
  if ! aws ssm get-parameter --region "$REGION" --name "${PREFIX}/${key}" >/dev/null 2>&1; then
    MISSING_PARAMS+=("${PREFIX}/${key}")
  fi
done

if [ ${#MISSING_PARAMS[@]} -ne 0 ]; then
    echo -e "${RED}❌ Error: faltan parámetros en SSM:${NC}"
    printf '  - %s\n' "${MISSING_PARAMS[@]}"
    echo ""
    echo "Crea estos parámetros en SSM (SecureString para secrets) y reintenta."
    exit 1
fi

echo -e "${GREEN}  ✓${NC} AWS creds OK, SSM parameters OK"

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
