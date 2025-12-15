#!/bin/bash

# EmotioxV3 - AWS Setup Script
# Este script configura todos los recursos de AWS necesarios

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Verificar que AWS CLI está instalado
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI no está instalado. Por favor instálalo primero."
    exit 1
fi

print_success "AWS CLI encontrado: $(aws --version)"

# Verificar credenciales de AWS
print_step "Verificando credenciales de AWS..."
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "No se pudieron verificar las credenciales de AWS."
    print_warning "Por favor ejecuta: aws configure"
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
print_success "Conectado a cuenta AWS: $ACCOUNT_ID"

# Configuración
PROJECT_NAME="emotioxv3"
REGION="us-east-1"

echo ""
print_step "Configuración del proyecto:"
echo "  Nombre: $PROJECT_NAME"
echo "  Región: $REGION"
echo ""

read -p "¿Continuar con esta configuración? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Setup cancelado."
    exit 0
fi

# ==========================================
# 1. CREAR S3 BUCKET
# ==========================================
echo ""
print_step "1. Creando S3 Bucket para media..."

S3_BUCKET_NAME="${PROJECT_NAME}-media-${ACCOUNT_ID}"

if aws s3 ls "s3://${S3_BUCKET_NAME}" 2>&1 | grep -q 'NoSuchBucket'; then
    aws s3api create-bucket \
        --bucket "$S3_BUCKET_NAME" \
        --region "$REGION" \
        --create-bucket-configuration LocationConstraint="$REGION" 2>/dev/null || \
    aws s3api create-bucket \
        --bucket "$S3_BUCKET_NAME" \
        --region "$REGION"
    
    print_success "Bucket S3 creado: $S3_BUCKET_NAME"
else
    print_warning "Bucket S3 ya existe: $S3_BUCKET_NAME"
fi

# Configurar CORS en S3
print_step "Configurando CORS en S3..."

# Usar el archivo cors.json del backend que incluye Content-Type y Content-Length en ExposeHeaders
if [ -f "backend/cors.json" ]; then
    aws s3api put-bucket-cors \
        --bucket "$S3_BUCKET_NAME" \
        --cors-configuration file://backend/cors.json
else
    # Fallback a configuración inline si no existe el archivo
    cat > /tmp/s3-cors.json <<EOF
{
  "CORSRules": [
    {
      "AllowedOrigins": ["http://localhost:5173", "http://localhost:5174", "https://*.emotioxv3.com"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": [
        "ETag",
        "Content-Type",
        "Content-Length",
        "x-amz-server-side-encryption",
        "x-amz-request-id",
        "x-amz-id-2",
        "x-amz-checksum-crc32",
        "x-amz-sdk-checksum-algorithm"
      ],
      "MaxAgeSeconds": 3000
    }
  ]
}
EOF
    aws s3api put-bucket-cors \
        --bucket "$S3_BUCKET_NAME" \
        --cors-configuration file:///tmp/s3-cors.json
fi

print_success "CORS configurado en S3"

# ==========================================
# 2. CREAR COGNITO USER POOL
# ==========================================
echo ""
print_step "2. Creando Cognito User Pool..."

# Verificar si ya existe
EXISTING_POOLS=$(aws cognito-idp list-user-pools --max-results 60 --query "UserPools[?Name=='${PROJECT_NAME}-users'].Id" --output text)

if [ -z "$EXISTING_POOLS" ]; then
    USER_POOL_ID=$(aws cognito-idp create-user-pool \
        --pool-name "${PROJECT_NAME}-users" \
        --policies '{
            "PasswordPolicy": {
                "MinimumLength": 8,
                "RequireUppercase": true,
                "RequireLowercase": true,
                "RequireNumbers": true,
                "RequireSymbols": false
            }
        }' \
        --auto-verified-attributes email \
        --username-attributes email \
        --mfa-configuration OFF \
        --email-configuration EmailSendingAccount=COGNITO_DEFAULT \
        --query 'UserPool.Id' \
        --output text)
    
    print_success "User Pool creado: $USER_POOL_ID"
else
    USER_POOL_ID="$EXISTING_POOLS"
    print_warning "User Pool ya existe: $USER_POOL_ID"
fi

# Crear App Client
print_step "Creando App Client de Cognito..."

CLIENT_ID=$(aws cognito-idp create-user-pool-client \
    --user-pool-id "$USER_POOL_ID" \
    --client-name "${PROJECT_NAME}-web-client" \
    --no-generate-secret \
    --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH ALLOW_USER_SRP_AUTH \
    --supported-identity-providers COGNITO \
    --callback-urls "http://localhost:5173" "http://localhost:5173/callback" \
    --logout-urls "http://localhost:5173" \
    --allowed-o-auth-flows code implicit \
    --allowed-o-auth-scopes openid email profile \
    --allowed-o-auth-flows-user-pool-client \
    --query 'UserPoolClient.ClientId' \
    --output text 2>/dev/null || \
    aws cognito-idp list-user-pool-clients \
        --user-pool-id "$USER_POOL_ID" \
        --query "UserPoolClients[?ClientName=='${PROJECT_NAME}-web-client'].ClientId" \
        --output text)

print_success "App Client creado: $CLIENT_ID"

# Crear dominio de Cognito
print_step "Creando dominio de Cognito..."

COGNITO_DOMAIN="${PROJECT_NAME}-auth-${ACCOUNT_ID:0:8}"

aws cognito-idp create-user-pool-domain \
    --domain "$COGNITO_DOMAIN" \
    --user-pool-id "$USER_POOL_ID" 2>/dev/null || \
    print_warning "Dominio de Cognito ya existe"

print_success "Dominio de Cognito: $COGNITO_DOMAIN"

# ==========================================
# 3. CREAR RDS (OPCIONAL - PREGUNTA AL USUARIO)
# ==========================================
echo ""
print_step "3. Configuración de RDS PostgreSQL"
print_warning "RDS tiene costo (~\$15/mes para db.t3.micro)"
echo ""
echo "Opciones:"
echo "  1) Crear RDS en AWS (Producción)"
echo "  2) Usar PostgreSQL local (Desarrollo)"
echo "  3) Saltar por ahora"
echo ""
read -p "Selecciona una opción (1/2/3): " -n 1 -r RDS_OPTION
echo ""

DB_HOST=""
DB_PORT="5432"
DB_NAME="emotioxv3"
DB_USER="postgres"
DB_PASSWORD=""

if [[ $RDS_OPTION == "1" ]]; then
    print_step "Creando RDS PostgreSQL..."
    
    # Generar password aleatorio
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    
    print_warning "Esto tomará ~10 minutos. Creando RDS instance..."
    
    aws rds create-db-instance \
        --db-instance-identifier "${PROJECT_NAME}-db" \
        --db-instance-class db.t3.micro \
        --engine postgres \
        --engine-version 15.4 \
        --master-username "$DB_USER" \
        --master-user-password "$DB_PASSWORD" \
        --allocated-storage 20 \
        --publicly-accessible true \
        --backup-retention-period 7 \
        --tags Key=Project,Value=EmotioxV3 \
        --no-deletion-protection 2>/dev/null || \
        print_warning "RDS instance ya existe"
    
    print_step "Esperando a que RDS esté disponible..."
    aws rds wait db-instance-available --db-instance-identifier "${PROJECT_NAME}-db"
    
    DB_HOST=$(aws rds describe-db-instances \
        --db-instance-identifier "${PROJECT_NAME}-db" \
        --query 'DBInstances[0].Endpoint.Address' \
        --output text)
    
    print_success "RDS creado: $DB_HOST"
    
elif [[ $RDS_OPTION == "2" ]]; then
    print_step "Configuración para PostgreSQL local"
    DB_HOST="localhost"
    DB_PASSWORD="postgres"
    
    print_warning "Asegúrate de tener PostgreSQL instalado localmente"
    print_warning "Puedes instalarlo con: brew install postgresql@15"
    
else
    print_warning "RDS saltado. Configúralo manualmente más tarde."
fi

# ==========================================
# 4. CREAR ARCHIVO .env
# ==========================================
echo ""
print_step "4. Creando archivo .env..."

cat > .env <<EOF
# Database
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD:-CHANGE_ME}

# AWS
AWS_REGION=${REGION}
S3_BUCKET_NAME=${S3_BUCKET_NAME}

# Cognito
COGNITO_USER_POOL_ID=${USER_POOL_ID}
COGNITO_CLIENT_ID=${CLIENT_ID}
COGNITO_DOMAIN=${COGNITO_DOMAIN}

# API
API_STAGE=dev
CORS_ORIGIN=http://localhost:5173,http://localhost:5174
EOF

print_success "Archivo .env creado"

# Crear .env.example
cp .env .env.example
sed -i '' 's/=.*/=CHANGE_ME/g' .env.example 2>/dev/null || sed -i 's/=.*/=CHANGE_ME/g' .env.example

print_success "Archivo .env.example creado"

# ==========================================
# 5. CREAR USUARIO ADMIN EN COGNITO
# ==========================================
echo ""
print_step "5. ¿Crear usuario admin en Cognito?"
read -p "Email del admin: " ADMIN_EMAIL

if [ ! -z "$ADMIN_EMAIL" ]; then
    read -s -p "Password del admin (mín 8 caracteres): " ADMIN_PASSWORD
    echo ""
    
    aws cognito-idp admin-create-user \
        --user-pool-id "$USER_POOL_ID" \
        --username "$ADMIN_EMAIL" \
        --user-attributes Name=email,Value="$ADMIN_EMAIL" Name=email_verified,Value=true \
        --message-action SUPPRESS 2>/dev/null || print_warning "Usuario ya existe"
    
    aws cognito-idp admin-set-user-password \
        --user-pool-id "$USER_POOL_ID" \
        --username "$ADMIN_EMAIL" \
        --password "$ADMIN_PASSWORD" \
        --permanent
    
    print_success "Usuario admin creado: $ADMIN_EMAIL"
fi

# ==========================================
# RESUMEN FINAL
# ==========================================
echo ""
echo "=========================================="
print_success "Setup de AWS completado!"
echo "=========================================="
echo ""
echo "Recursos creados:"
echo "  ✓ S3 Bucket: $S3_BUCKET_NAME"
echo "  ✓ Cognito User Pool: $USER_POOL_ID"
echo "  ✓ Cognito App Client: $CLIENT_ID"
echo "  ✓ Cognito Domain: https://${COGNITO_DOMAIN}.auth.${REGION}.amazoncognito.com"
if [ ! -z "$DB_HOST" ]; then
    echo "  ✓ Database: $DB_HOST"
fi
echo ""
echo "Archivos creados:"
echo "  ✓ .env (con credenciales)"
echo "  ✓ .env.example (template)"
echo ""
print_warning "IMPORTANTE: Guarda las credenciales de .env de forma segura"
print_warning "NO subas el archivo .env al repositorio"
echo ""
print_step "Próximos pasos:"
echo "  1. Revisar el archivo .env"
echo "  2. Crear las tablas de base de datos (migraciones)"
echo "  3. Hacer deploy del backend"
echo ""
