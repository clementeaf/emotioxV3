#!/bin/bash

# Script para configurar headers de CloudFront para EmotioXV2 Frontend
# Agrega headers COEP necesarios para Seeso.io

set -e

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo ""
log_info "🔧 Configurando headers COEP en CloudFront..."
echo ""

# ID de la distribución de CloudFront del frontend
CLOUDFRONT_DISTRIBUTION_ID="${1:-E3VQKZ8EXAMPLE}"

if [ "$CLOUDFRONT_DISTRIBUTION_ID" = "E3VQKZ8EXAMPLE" ]; then
  log_warning "⚠️  No se proporcionó ID de distribución CloudFront"
  log_info "💡 Uso: $0 <CLOUDFRONT_DISTRIBUTION_ID>"
  log_info "📋 Para obtener el ID, ejecuta:"
  echo "   aws cloudfront list-distributions --query 'DistributionList.Items[*].[Id,DomainName]' --output table"
  exit 1
fi

log_info "📡 Distribución CloudFront: $CLOUDFRONT_DISTRIBUTION_ID"

# Crear política de headers
log_info "🔨 Creando Response Headers Policy..."

POLICY_ID=$(aws cloudfront create-response-headers-policy \
  --response-headers-policy-config file://cloudfront-headers-config.json \
  --query 'ResponseHeadersPolicy.Id' \
  --output text 2>&1)

if [ $? -eq 0 ]; then
  log_success "✅ Política creada con ID: $POLICY_ID"

  log_info "🔗 Asociando política a la distribución..."
  log_warning "⚠️  Este paso requiere actualizar manualmente la distribución en la consola AWS"
  log_info "📝 Instrucciones:"
  echo "   1. Ve a CloudFront → Distributions → $CLOUDFRONT_DISTRIBUTION_ID"
  echo "   2. Edita el Behavior (normalmente el Default)"
  echo "   3. En 'Response headers policy', selecciona: emotioxv2-frontend-security-headers"
  echo "   4. Guarda los cambios"

else
  log_error "❌ Error al crear la política"
  log_info "💡 Si la política ya existe, puedes actualizarla en la consola AWS"
fi

echo ""
log_info "📋 Política configurada con los siguientes headers:"
echo "   • Cross-Origin-Opener-Policy: same-origin"
echo "   • Cross-Origin-Embedder-Policy: credentialless"
echo "   • Strict-Transport-Security"
echo "   • X-Content-Type-Options"
echo "   • X-Frame-Options"
echo "   • X-XSS-Protection"
echo ""
log_success "✅ Configuración completada!"
echo ""
