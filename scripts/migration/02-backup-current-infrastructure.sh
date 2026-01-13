#!/bin/bash

set -euo pipefail

echo "💾 EmotioX V3 - Backup de Infraestructura Actual"
echo "================================================"
echo ""

# Crear directorio de backups
BACKUP_DIR="migration-backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📁 Directorio de backup: $BACKUP_DIR"
echo ""

# Backup de SSM Parameters
echo "📥 Exportando parámetros de SSM..."
echo "  → Production parameters"
aws ssm get-parameters-by-path \
    --path "/emotioxv3/production" \
    --with-decryption \
    --region us-east-1 \
    > "$BACKUP_DIR/ssm_production.json" 2>/dev/null || echo "  ⚠️  No se pudieron obtener parámetros de production"

echo "  → Dev parameters"
aws ssm get-parameters-by-path \
    --path "/emotioxv3/dev" \
    --with-decryption \
    --region us-east-1 \
    > "$BACKUP_DIR/ssm_dev.json" 2>/dev/null || echo "  ⚠️  No se pudieron obtener parámetros de dev"

# Backup de Cognito
echo ""
echo "📥 Exportando configuración de Cognito..."

# Obtener User Pool ID de SSM
USER_POOL_ID=$(aws ssm get-parameter \
    --name "/emotioxv3/production/COGNITO_USER_POOL_ID" \
    --query 'Parameter.Value' \
    --output text \
    --region us-east-1 2>/dev/null || echo "")

if [ -n "$USER_POOL_ID" ]; then
    echo "  → User Pool: $USER_POOL_ID"
    
    aws cognito-idp describe-user-pool \
        --user-pool-id "$USER_POOL_ID" \
        --region us-east-1 \
        > "$BACKUP_DIR/cognito_user_pool.json" 2>/dev/null || echo "  ⚠️  No se pudo obtener configuración de User Pool"
    
    # Obtener Client ID
    CLIENT_ID=$(aws ssm get-parameter \
        --name "/emotioxv3/production/COGNITO_CLIENT_ID" \
        --query 'Parameter.Value' \
        --output text \
        --region us-east-1 2>/dev/null || echo "")
    
    if [ -n "$CLIENT_ID" ]; then
        echo "  → Client: $CLIENT_ID"
        
        aws cognito-idp describe-user-pool-client \
            --user-pool-id "$USER_POOL_ID" \
            --client-id "$CLIENT_ID" \
            --region us-east-1 \
            > "$BACKUP_DIR/cognito_client.json" 2>/dev/null || echo "  ⚠️  No se pudo obtener configuración de Client"
    fi
    
    # Listar usuarios (solo primeros 60)
    echo "  → Exportando usuarios..."
    aws cognito-idp list-users \
        --user-pool-id "$USER_POOL_ID" \
        --limit 60 \
        --region us-east-1 \
        > "$BACKUP_DIR/cognito_users.json" 2>/dev/null || echo "  ⚠️  No se pudieron listar usuarios"
else
    echo "  ⚠️  No se encontró User Pool ID en SSM"
fi

# Backup de CloudFront
echo ""
echo "📥 Exportando configuración de CloudFront..."

RESEARCH_CF_ID="E3HBEQ4F8V5KO0"
PARTICIPANT_CF_ID="EAPLN65ZHVPFI"

echo "  → Research Frontend: $RESEARCH_CF_ID"
aws cloudfront get-distribution \
    --id "$RESEARCH_CF_ID" \
    > "$BACKUP_DIR/cloudfront_research.json" 2>/dev/null || echo "  ⚠️  No se pudo obtener distribución de research"

echo "  → Participant Frontend: $PARTICIPANT_CF_ID"
aws cloudfront get-distribution \
    --id "$PARTICIPANT_CF_ID" \
    > "$BACKUP_DIR/cloudfront_participant.json" 2>/dev/null || echo "  ⚠️  No se pudo obtener distribución de participant"

# Backup de S3 configuration
echo ""
echo "📥 Exportando configuración de S3..."

RESEARCH_BUCKET="emotioxv3-research-frontend"
PARTICIPANT_BUCKET="emotioxv3-participant-frontend"

echo "  → Research bucket: $RESEARCH_BUCKET"
aws s3api get-bucket-policy \
    --bucket "$RESEARCH_BUCKET" \
    > "$BACKUP_DIR/s3_research_policy.json" 2>/dev/null || echo "  ⚠️  No se pudo obtener policy"

aws s3api get-bucket-cors \
    --bucket "$RESEARCH_BUCKET" \
    > "$BACKUP_DIR/s3_research_cors.json" 2>/dev/null || echo "  ⚠️  No se pudo obtener CORS"

aws s3api get-bucket-website \
    --bucket "$RESEARCH_BUCKET" \
    > "$BACKUP_DIR/s3_research_website.json" 2>/dev/null || echo "  ⚠️  No se pudo obtener website config"

echo "  → Participant bucket: $PARTICIPANT_BUCKET"
aws s3api get-bucket-policy \
    --bucket "$PARTICIPANT_BUCKET" \
    > "$BACKUP_DIR/s3_participant_policy.json" 2>/dev/null || echo "  ⚠️  No se pudo obtener policy"

aws s3api get-bucket-cors \
    --bucket "$PARTICIPANT_BUCKET" \
    > "$BACKUP_DIR/s3_participant_cors.json" 2>/dev/null || echo "  ⚠️  No se pudo obtener CORS"

aws s3api get-bucket-website \
    --bucket "$PARTICIPANT_BUCKET" \
    > "$BACKUP_DIR/s3_participant_website.json" 2>/dev/null || echo "  ⚠️  No se pudo obtener website config"

# Backup de CloudFormation stacks
echo ""
echo "📥 Exportando stacks de CloudFormation..."

STACK_PROD="emotioxv3-backend-production"
STACK_DEV="emotioxv3-backend-dev"

echo "  → Production stack: $STACK_PROD"
aws cloudformation describe-stacks \
    --stack-name "$STACK_PROD" \
    > "$BACKUP_DIR/cloudformation_production.json" 2>/dev/null || echo "  ⚠️  No se pudo obtener stack de production"

echo "  → Dev stack: $STACK_DEV"
aws cloudformation describe-stacks \
    --stack-name "$STACK_DEV" \
    > "$BACKUP_DIR/cloudformation_dev.json" 2>/dev/null || echo "  ⚠️  No se pudo obtener stack de dev"

# Resumen
echo ""
echo "✅ Backup completado"
echo ""
echo "📋 Archivos generados en: $BACKUP_DIR"
ls -lh "$BACKUP_DIR"
echo ""
echo "⚠️  IMPORTANTE: Backup de base de datos debe hacerse manualmente:"
echo "   pg_dump -h <db_host> -U <db_user> -d emotioxv3 -F c -f $BACKUP_DIR/database.dump"
echo ""
