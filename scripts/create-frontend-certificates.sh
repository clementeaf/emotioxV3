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
log_info "Creando certificados SSL para frontends"
echo ""

RESEARCH_DOMAIN="${1:-research.emotiox.org}"
PARTICIPANT_DOMAIN="${2:-participant.emotiox.org}"
REGION="us-east-1"

if ! command -v aws &> /dev/null; then
  log_error "AWS CLI no está instalado"
  exit 1
fi

log_info "Dominios a certificar:"
log_info "  Research: $RESEARCH_DOMAIN"
log_info "  Participant: $PARTICIPANT_DOMAIN"
log_info "  Región: $REGION (requerida para CloudFront)"
echo ""

log_info "Paso 1: Verificando certificados existentes..."
echo ""

RESEARCH_EXISTING=$(aws acm list-certificates \
  --region "$REGION" \
  --query "CertificateSummaryList[?DomainName=='$RESEARCH_DOMAIN'].CertificateArn" \
  --output text)

PARTICIPANT_EXISTING=$(aws acm list-certificates \
  --region "$REGION" \
  --query "CertificateSummaryList[?DomainName=='$PARTICIPANT_DOMAIN'].CertificateArn" \
  --output text)

if [ -n "$RESEARCH_EXISTING" ] && [ "$RESEARCH_EXISTING" != "None" ]; then
  log_warning "Ya existe un certificado para $RESEARCH_DOMAIN"
  log_info "ARN: $RESEARCH_EXISTING"
  
  STATUS=$(aws acm describe-certificate \
    --certificate-arn "$RESEARCH_EXISTING" \
    --region "$REGION" \
    --query 'Certificate.Status' \
    --output text)
  
  log_info "Estado: $STATUS"
  
  if [ "$STATUS" != "ISSUED" ]; then
    log_warning "El certificado no está emitido. Verifica la validación DNS."
  else
    log_success "Certificado válido encontrado"
  fi
  echo ""
else
  log_info "Paso 2: Solicitando certificado para $RESEARCH_DOMAIN..."
  
  RESEARCH_CERT_ARN=$(aws acm request-certificate \
    --domain-name "$RESEARCH_DOMAIN" \
    --validation-method DNS \
    --region "$REGION" \
    --query 'CertificateArn' \
    --output text)
  
  log_success "Certificado solicitado: $RESEARCH_CERT_ARN"
  echo ""
fi

if [ -n "$PARTICIPANT_EXISTING" ] && [ "$PARTICIPANT_EXISTING" != "None" ]; then
  log_warning "Ya existe un certificado para $PARTICIPANT_DOMAIN"
  log_info "ARN: $PARTICIPANT_EXISTING"
  
  STATUS=$(aws acm describe-certificate \
    --certificate-arn "$PARTICIPANT_EXISTING" \
    --region "$REGION" \
    --query 'Certificate.Status' \
    --output text)
  
  log_info "Estado: $STATUS"
  
  if [ "$STATUS" != "ISSUED" ]; then
    log_warning "El certificado no está emitido. Verifica la validación DNS."
  else
    log_success "Certificado válido encontrado"
  fi
  echo ""
else
  log_info "Paso 3: Solicitando certificado para $PARTICIPANT_DOMAIN..."
  
  PARTICIPANT_CERT_ARN=$(aws acm request-certificate \
    --domain-name "$PARTICIPANT_DOMAIN" \
    --validation-method DNS \
    --region "$REGION" \
    --query 'CertificateArn' \
    --output text)
  
  log_success "Certificado solicitado: $PARTICIPANT_CERT_ARN"
  echo ""
fi

log_info "Paso 4: Obteniendo registros DNS de validación..."
echo ""

if [ -n "$RESEARCH_EXISTING" ] && [ "$RESEARCH_EXISTING" != "None" ]; then
  RESEARCH_CERT_ARN="$RESEARCH_EXISTING"
else
  RESEARCH_CERT_ARN="$RESEARCH_CERT_ARN"
fi

if [ -n "$PARTICIPANT_EXISTING" ] && [ "$PARTICIPANT_EXISTING" != "None" ]; then
  PARTICIPANT_CERT_ARN="$PARTICIPANT_EXISTING"
else
  PARTICIPANT_CERT_ARN="$PARTICIPANT_CERT_ARN"
fi

log_info "Registros DNS de validación para $RESEARCH_DOMAIN:"
echo ""

RESEARCH_VALIDATION=$(aws acm describe-certificate \
  --certificate-arn "$RESEARCH_CERT_ARN" \
  --region "$REGION" \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord' \
  --output json)

RESEARCH_NAME=$(echo "$RESEARCH_VALIDATION" | jq -r '.Name')
RESEARCH_VALUE=$(echo "$RESEARCH_VALIDATION" | jq -r '.Value')

log_info "  Type: CNAME"
log_info "  Name: $RESEARCH_NAME"
log_info "  Value: $RESEARCH_VALUE"
echo ""

log_info "Registros DNS de validación para $PARTICIPANT_DOMAIN:"
echo ""

PARTICIPANT_VALIDATION=$(aws acm describe-certificate \
  --certificate-arn "$PARTICIPANT_CERT_ARN" \
  --region "$REGION" \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord' \
  --output json)

PARTICIPANT_NAME=$(echo "$PARTICIPANT_VALIDATION" | jq -r '.Name')
PARTICIPANT_VALUE=$(echo "$PARTICIPANT_VALIDATION" | jq -r '.Value')

log_info "  Type: CNAME"
log_info "  Name: $PARTICIPANT_NAME"
log_info "  Value: $PARTICIPANT_VALUE"
echo ""

log_success "Certificados solicitados exitosamente"
echo ""
log_warning "IMPORTANTE: Agrega los registros CNAME de validación en Namecheap"
log_info "1. Ve a Namecheap → Domain List → emotiox.org → Advanced DNS"
log_info "2. Agrega los registros CNAME mostrados arriba"
log_info "3. Espera 5-30 minutos para que el certificado se valide"
log_info "4. Verifica el estado con:"
echo ""
echo "  aws acm describe-certificate \\"
echo "    --certificate-arn $RESEARCH_CERT_ARN \\"
echo "    --region $REGION \\"
echo "    --query 'Certificate.Status'"
echo ""

log_info "ARNs de certificados:"
log_info "  Research: $RESEARCH_CERT_ARN"
log_info "  Participant: $PARTICIPANT_CERT_ARN"
echo ""

log_success "Script completado"

