#!/bin/bash

set -e

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
log_info "Configurando dominios personalizados para frontends"
echo ""

RESEARCH_DIST_ID="${1:-$RESEARCH_FRONTEND_CLOUDFRONT_ID}"
PARTICIPANT_DIST_ID="${2:-$PARTICIPANT_FRONTEND_CLOUDFRONT_ID}"
RESEARCH_DOMAIN="${3:-research.emotiox.org}"
PARTICIPANT_DOMAIN="${4:-participant.emotiox.org}"

if [ -z "$RESEARCH_DIST_ID" ] || [ -z "$PARTICIPANT_DIST_ID" ]; then
  log_error "Faltan IDs de distribuciones CloudFront"
  echo ""
  echo "Uso: $0 <RESEARCH_DIST_ID> <PARTICIPANT_DIST_ID> [RESEARCH_DOMAIN] [PARTICIPANT_DOMAIN]"
  echo ""
  echo "O configura las variables de entorno:"
  echo "  RESEARCH_FRONTEND_CLOUDFRONT_ID"
  echo "  PARTICIPANT_FRONTEND_CLOUDFRONT_ID"
  exit 1
fi

log_info "Research Frontend Distribution ID: $RESEARCH_DIST_ID"
log_info "Participant Frontend Distribution ID: $PARTICIPANT_DIST_ID"
log_info "Research Domain: $RESEARCH_DOMAIN"
log_info "Participant Domain: $PARTICIPANT_DOMAIN"
echo ""

if ! command -v aws &> /dev/null; then
  log_error "AWS CLI no está instalado"
  exit 1
fi

if ! command -v jq &> /dev/null; then
  log_error "jq no está instalado. Instálalo con: brew install jq"
  exit 1
fi

log_info "Paso 1: Obteniendo certificados SSL de ACM..."
echo ""

RESEARCH_CERT_ARN=$(aws acm list-certificates \
  --region us-east-1 \
  --query "CertificateSummaryList[?DomainName=='$RESEARCH_DOMAIN'].CertificateArn" \
  --output text)

PARTICIPANT_CERT_ARN=$(aws acm list-certificates \
  --region us-east-1 \
  --query "CertificateSummaryList[?DomainName=='$PARTICIPANT_DOMAIN'].CertificateArn" \
  --output text)

if [ -z "$RESEARCH_CERT_ARN" ] || [ "$RESEARCH_CERT_ARN" == "None" ]; then
  log_error "No se encontró certificado para $RESEARCH_DOMAIN"
  log_info "Crea el certificado primero con:"
  echo "  aws acm request-certificate \\"
  echo "    --domain-name $RESEARCH_DOMAIN \\"
  echo "    --validation-method DNS \\"
  echo "    --region us-east-1"
  exit 1
fi

if [ -z "$PARTICIPANT_CERT_ARN" ] || [ "$PARTICIPANT_CERT_ARN" == "None" ]; then
  log_error "No se encontró certificado para $PARTICIPANT_DOMAIN"
  log_info "Crea el certificado primero con:"
  echo "  aws acm request-certificate \\"
  echo "    --domain-name $PARTICIPANT_DOMAIN \\"
  echo "    --validation-method DNS \\"
  echo "    --region us-east-1"
  exit 1
fi

log_success "Certificado Research: $RESEARCH_CERT_ARN"
log_success "Certificado Participant: $PARTICIPANT_CERT_ARN"
echo ""

log_info "Paso 2: Obteniendo configuración actual de CloudFront..."
echo ""

RESEARCH_ETAG=$(aws cloudfront get-distribution-config \
  --id "$RESEARCH_DIST_ID" \
  --query 'ETag' \
  --output text)

PARTICIPANT_ETAG=$(aws cloudfront get-distribution-config \
  --id "$PARTICIPANT_DIST_ID" \
  --query 'ETag' \
  --output text)

aws cloudfront get-distribution-config \
  --id "$RESEARCH_DIST_ID" \
  --query 'DistributionConfig' > /tmp/research-config.json

aws cloudfront get-distribution-config \
  --id "$PARTICIPANT_DIST_ID" \
  --query 'DistributionConfig' > /tmp/participant-config.json

log_info "Paso 3: Actualizando configuración con dominios personalizados..."
echo ""

jq --arg domain "$RESEARCH_DOMAIN" \
   --arg cert "$RESEARCH_CERT_ARN" \
   '.Aliases.Quantity = 1 | 
    .Aliases.Items = [$domain] |
    .ViewerCertificate = {
      "ACMCertificateArn": $cert,
      "SSLSupportMethod": "sni-only",
      "MinimumProtocolVersion": "TLSv1.2_2021"
    }' \
  /tmp/research-config.json > /tmp/research-config-updated.json

jq --arg domain "$PARTICIPANT_DOMAIN" \
   --arg cert "$PARTICIPANT_CERT_ARN" \
   '.Aliases.Quantity = 1 | 
    .Aliases.Items = [$domain] |
    .ViewerCertificate = {
      "ACMCertificateArn": $cert,
      "SSLSupportMethod": "sni-only",
      "MinimumProtocolVersion": "TLSv1.2_2021"
    }' \
  /tmp/participant-config.json > /tmp/participant-config-updated.json

log_info "Paso 4: Aplicando cambios a CloudFront..."
echo ""

log_info "Actualizando Research Frontend..."
aws cloudfront update-distribution \
  --id "$RESEARCH_DIST_ID" \
  --distribution-config file:///tmp/research-config-updated.json \
  --if-match "$RESEARCH_ETAG" > /dev/null

log_success "Research Frontend actualizado"

log_info "Actualizando Participant Frontend..."
aws cloudfront update-distribution \
  --id "$PARTICIPANT_DIST_ID" \
  --distribution-config file:///tmp/participant-config-updated.json \
  --if-match "$PARTICIPANT_ETAG" > /dev/null

log_success "Participant Frontend actualizado"
echo ""

log_info "Paso 5: Obteniendo CloudFront Domain Names para DNS..."
echo ""

RESEARCH_CLOUDFRONT_DOMAIN=$(aws cloudfront get-distribution \
  --id "$RESEARCH_DIST_ID" \
  --query 'Distribution.DomainName' \
  --output text)

PARTICIPANT_CLOUDFRONT_DOMAIN=$(aws cloudfront get-distribution \
  --id "$PARTICIPANT_DIST_ID" \
  --query 'Distribution.DomainName' \
  --output text)

log_success "Configuración completada"
echo ""
log_warning "IMPORTANTE: Los cambios de CloudFront pueden tomar 15-30 minutos en propagarse"
echo ""
log_info "Configura los siguientes registros CNAME en Namecheap:"
echo ""
echo "  Type: CNAME"
echo "  Host: research"
echo "  Value: $RESEARCH_CLOUDFRONT_DOMAIN"
echo "  TTL: Automatic"
echo ""
echo "  Type: CNAME"
echo "  Host: participant"
echo "  Value: $PARTICIPANT_CLOUDFRONT_DOMAIN"
echo "  TTL: Automatic"
echo ""

rm -f /tmp/research-config.json /tmp/research-config-updated.json
rm -f /tmp/participant-config.json /tmp/participant-config-updated.json

log_success "Script completado"

