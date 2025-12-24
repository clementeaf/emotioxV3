#!/bin/bash
set -e

echo "Configurando GitHub Secrets..."

# Verificar que gh CLI está instalado y autenticado
if ! command -v gh &> /dev/null; then
    echo "❌ Error: GitHub CLI (gh) no está instalado"
    echo "Instala con: brew install gh"
    exit 1
fi

echo "Verificando autenticación de GitHub..."
if ! gh auth status &> /dev/null; then
    echo "❌ Error: No estás autenticado en GitHub CLI"
    echo "Autentica con: gh auth login"
    exit 1
fi

echo "✅ Autenticación verificada"
echo ""

# Extract AWS credentials
echo "Extrayendo credenciales de AWS..."
if [ ! -f ~/.aws/credentials ]; then
    echo "❌ Error: Archivo ~/.aws/credentials no encontrado"
    exit 1
fi

AWS_KEY=$(grep aws_access_key_id ~/.aws/credentials | head -1 | cut -d'=' -f2 | xargs)
AWS_SECRET=$(grep aws_secret_access_key ~/.aws/credentials | head -1 | cut -d'=' -f2 | xargs)

if [ -z "$AWS_KEY" ] || [ -z "$AWS_SECRET" ]; then
    echo "❌ Error: No se pudieron extraer las credenciales de AWS"
    exit 1
fi

echo "✅ Credenciales de AWS extraídas"
echo ""

# Función para establecer secret con feedback
set_secret() {
    local secret_name=$1
    local secret_value=$2
    echo -n "Configurando $secret_name... "
    if echo "$secret_value" | gh secret set "$secret_name" -R clementeaf/emotioxV3 &> /dev/null; then
        echo "✅"
    else
        echo "❌ Error al configurar $secret_name"
        return 1
    fi
}

# Set all secrets con feedback
set_secret "AWS_ACCESS_KEY_ID" "$AWS_KEY"
set_secret "AWS_SECRET_ACCESS_KEY" "$AWS_SECRET"
set_secret "AWS_REGION" "us-east-1"
set_secret "RESEARCH_FRONTEND_S3_BUCKET" "emotioxv3-research-frontend"
set_secret "PARTICIPANT_FRONTEND_S3_BUCKET" "emotioxv3-participant-frontend"
set_secret "S3_BUCKET_NAME" "emotioxv3-media"
set_secret "RESEARCH_FRONTEND_CLOUDFRONT_ID" "E3HBEQ4F8V5KO0"
set_secret "PARTICIPANT_FRONTEND_CLOUDFRONT_ID" "EAPLN65ZHVPFI"
set_secret "DB_HOST" "emotioxv3-db.cupsguy6sr11.us-east-1.rds.amazonaws.com"
set_secret "DB_PORT" "5432"
set_secret "DB_NAME" "emotioxv3"
set_secret "DB_USER" "emotioxadmin"
set_secret "DB_PASSWORD" "EmotioX2024SecurePass!"
echo "ℹ️  Skipping VITE_API_URL_PRODUCTION: frontends now use runtime-config.json published by backend deploy workflow"
set_secret "VITE_PARTICIPANT_FRONTEND_URL" "https://d2am10cly7c9kf.cloudfront.net"

echo ""
echo "✅ Todos los secrets configurados!"
echo ""
echo "Listando secrets configurados:"
gh secret list -R clementeaf/emotioxV3
