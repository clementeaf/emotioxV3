#!/bin/bash

# Script para actualizar la configuración CORS del bucket S3
# Uso: ./scripts/update-s3-cors.sh [BUCKET_NAME]

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${YELLOW}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Obtener el nombre del bucket desde variable de entorno o argumento
S3_BUCKET_NAME=${1:-${S3_BUCKET_NAME}}

if [ -z "$S3_BUCKET_NAME" ]; then
    print_error "Error: S3_BUCKET_NAME no está definido"
    echo "Uso: ./scripts/update-s3-cors.sh [BUCKET_NAME]"
    echo "O define la variable de entorno: export S3_BUCKET_NAME=tu-bucket"
    exit 1
fi

print_step "Actualizando configuración CORS para bucket: $S3_BUCKET_NAME"

# Verificar que el archivo cors.json existe
CORS_FILE="backend/cors.json"
if [ ! -f "$CORS_FILE" ]; then
    print_error "Error: No se encontró el archivo $CORS_FILE"
    exit 1
fi

# Aplicar configuración CORS
if aws s3api put-bucket-cors \
    --bucket "$S3_BUCKET_NAME" \
    --cors-configuration "file://$CORS_FILE"; then
    print_success "Configuración CORS actualizada exitosamente"
    
    # Verificar la configuración aplicada
    print_step "Verificando configuración CORS aplicada..."
    aws s3api get-bucket-cors --bucket "$S3_BUCKET_NAME"
else
    print_error "Error al actualizar la configuración CORS"
    exit 1
fi

print_success "Proceso completado"
