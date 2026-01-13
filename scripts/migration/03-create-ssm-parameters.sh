#!/bin/bash

set -euo pipefail

echo "⚙️  EmotioX V3 - Crear Parámetros SSM en Nueva Cuenta"
echo "===================================================="
echo ""

PROFILE="cefal"
REGION="us-east-1"
STAGE="${1:-production}"  # Default: production, puede pasar "dev" como argumento

echo "📌 Configuración:"
echo "   Perfil AWS: $PROFILE"
echo "   Región: $REGION"
echo "   Stage: $STAGE"
echo ""

# Verificar que estamos en la cuenta correcta
ACCOUNT_ID=$(aws sts get-caller-identity --profile "$PROFILE" --query 'Account' --output text)
EXPECTED_ACCOUNT="058310292956"

if [ "$ACCOUNT_ID" != "$EXPECTED_ACCOUNT" ]; then
    echo "❌ Error: No estás en la cuenta correcta"
    echo "   Esperado: $EXPECTED_ACCOUNT"
    echo "   Actual: $ACCOUNT_ID"
    exit 1
fi

echo "✅ Cuenta verificada: $ACCOUNT_ID"
echo ""

# Función para crear o actualizar parámetro
create_or_update_parameter() {
    local name=$1
    local value=$2
    local type=${3:-String}  # String o SecureString
    
    echo "  → $name"
    
    aws ssm put-parameter \
        --name "$name" \
        --type "$type" \
        --value "$value" \
        --overwrite \
        --region "$REGION" \
        --profile "$PROFILE" \
        > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "    ✅ Creado/actualizado"
    else
        echo "    ❌ Error al crear/actualizar"
        return 1
    fi
}

echo "📝 Ingresa los valores para los parámetros de $STAGE"
echo "   (Presiona Enter para usar valores por defecto cuando aplique)"
echo ""

# Base de datos
echo "🗄️  Base de Datos"
read -p "DB_HOST [localhost]: " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "DB_PORT [5432]: " DB_PORT
DB_PORT=${DB_PORT:-5432}

read -p "DB_NAME [emotioxv3]: " DB_NAME
DB_NAME=${DB_NAME:-emotioxv3}

read -p "DB_USER [postgres]: " DB_USER
DB_USER=${DB_USER:-postgres}

read -sp "DB_PASSWORD: " DB_PASSWORD
echo ""

read -p "DB_SSL [true]: " DB_SSL
DB_SSL=${DB_SSL:-true}

# AWS y configuración
echo ""
echo "☁️  AWS y Configuración"
read -p "APP_AWS_REGION [us-east-1]: " APP_AWS_REGION
APP_AWS_REGION=${APP_AWS_REGION:-us-east-1}

read -p "S3_BUCKET_NAME [emotioxv3-media-production]: " S3_BUCKET_NAME
S3_BUCKET_NAME=${S3_BUCKET_NAME:-emotioxv3-media-production}

read -p "CORS_ORIGIN [https://research.emotiox.org]: " CORS_ORIGIN
CORS_ORIGIN=${CORS_ORIGIN:-https://research.emotiox.org}

# Cognito (estos deben ser obtenidos después de crear Cognito)
echo ""
echo "🔐 Cognito"
echo "   (Si aún no has creado Cognito, presiona Enter para omitir)"
read -p "COGNITO_USER_POOL_ID: " COGNITO_USER_POOL_ID
read -p "COGNITO_CLIENT_ID: " COGNITO_CLIENT_ID
read -sp "COGNITO_CLIENT_SECRET: " COGNITO_CLIENT_SECRET
echo ""
read -p "COGNITO_DOMAIN: " COGNITO_DOMAIN

echo ""
echo "📤 Creando parámetros en SSM..."
echo ""

PREFIX="/emotioxv3/$STAGE"

# Base de datos
echo "🗄️  Base de Datos"
create_or_update_parameter "$PREFIX/DB_HOST" "$DB_HOST" "String"
create_or_update_parameter "$PREFIX/DB_PORT" "$DB_PORT" "String"
create_or_update_parameter "$PREFIX/DB_NAME" "$DB_NAME" "String"
create_or_update_parameter "$PREFIX/DB_USER" "$DB_USER" "String"
create_or_update_parameter "$PREFIX/DB_PASSWORD" "$DB_PASSWORD" "SecureString"
create_or_update_parameter "$PREFIX/DB_SSL" "$DB_SSL" "String"

# AWS y configuración
echo ""
echo "☁️  AWS y Configuración"
create_or_update_parameter "$PREFIX/APP_AWS_REGION" "$APP_AWS_REGION" "String"
create_or_update_parameter "$PREFIX/S3_BUCKET_NAME" "$S3_BUCKET_NAME" "String"
create_or_update_parameter "$PREFIX/CORS_ORIGIN" "$CORS_ORIGIN" "String"

# Cognito (solo si se proporcionaron)
if [ -n "$COGNITO_USER_POOL_ID" ]; then
    echo ""
    echo "🔐 Cognito"
    create_or_update_parameter "$PREFIX/COGNITO_USER_POOL_ID" "$COGNITO_USER_POOL_ID" "String"
    
    if [ -n "$COGNITO_CLIENT_ID" ]; then
        create_or_update_parameter "$PREFIX/COGNITO_CLIENT_ID" "$COGNITO_CLIENT_ID" "String"
    fi
    
    if [ -n "$COGNITO_CLIENT_SECRET" ]; then
        create_or_update_parameter "$PREFIX/COGNITO_CLIENT_SECRET" "$COGNITO_CLIENT_SECRET" "SecureString"
    fi
    
    if [ -n "$COGNITO_DOMAIN" ]; then
        create_or_update_parameter "$PREFIX/COGNITO_DOMAIN" "$COGNITO_DOMAIN" "String"
    fi
fi

echo ""
echo "✅ Parámetros creados exitosamente"
echo ""
echo "📋 Para verificar:"
echo "   aws ssm get-parameters-by-path --path '$PREFIX' --profile $PROFILE --region $REGION"
echo ""
