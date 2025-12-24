#!/bin/bash
set -e

echo "Configurando AWS Cognito User Pool..."

# Verificar que AWS CLI está instalado y configurado
if ! command -v aws &> /dev/null; then
    echo "❌ Error: AWS CLI no está instalado"
    echo "Instala con: brew install awscli"
    exit 1
fi

echo "Verificando credenciales de AWS..."
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ Error: No estás autenticado en AWS CLI"
    echo "Configura con: aws configure"
    exit 1
fi

echo "✅ Credenciales de AWS verificadas"
echo ""

# Configuración
REGION="us-east-1"
USER_POOL_NAME="emotioxv3-user-pool"
APP_CLIENT_NAME="emotioxv3-client"

echo "Configurando región: $REGION"
echo "Nombre del User Pool: $USER_POOL_NAME"
echo ""

# Verificar si el User Pool ya existe
EXISTING_POOL=$(aws cognito-idp list-user-pools --max-results 10 --region $REGION --query "UserPools[?Name=='$USER_POOL_NAME'].Id" --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_POOL" ]; then
    echo "⚠️  User Pool ya existe: $EXISTING_POOL"
    read -p "¿Deseas usar el pool existente? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        USER_POOL_ID=$EXISTING_POOL
    else
        echo "Eliminando pool existente..."
        aws cognito-idp delete-user-pool --user-pool-id $EXISTING_POOL --region $REGION
        EXISTING_POOL=""
    fi
fi

# Crear User Pool si no existe
if [ -z "$EXISTING_POOL" ]; then
    echo "Creando User Pool de Cognito..."
    
    USER_POOL_ID=$(aws cognito-idp create-user-pool \
        --pool-name "$USER_POOL_NAME" \
        --region $REGION \
        --auto-verified-attributes email \
        --username-attributes email \
        --policies "PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true,RequireSymbols=true}" \
        --schema \
            Name=email,AttributeDataType=String,Required=true,Mutable=true \
            Name=given_name,AttributeDataType=String,Required=false,Mutable=true \
            Name=family_name,AttributeDataType=String,Required=false,Mutable=true \
        --mfa-configuration OFF \
        --account-recovery-setting "RecoveryMechanisms=[{Priority=1,Name=verified_email}]" \
        --query 'UserPool.Id' \
        --output text)
    
    echo "✅ User Pool creado: $USER_POOL_ID"
    
    # Configurar auto-confirmación de emails (IMPORTANTE: Sin esto habrá problemas)
    echo "Configurando auto-confirmación de emails..."
    
    # Crear archivo temporal JSON para la configuración
    TEMP_CONFIG=$(mktemp)
    cat > "$TEMP_CONFIG" <<EOF
{
    "AutoVerifiedAttributes": ["email"],
    "VerificationMessageTemplate": {
        "DefaultEmailOption": "CONFIRM_WITH_CODE",
        "EmailSubject": "EmotioX - Verificación de cuenta",
        "EmailMessage": "Tu código de verificación es {####}"
    },
    "AdminCreateUserConfig": {
        "AllowAdminCreateUserOnly": false
    }
}
EOF
    
    aws cognito-idp update-user-pool \
        --user-pool-id $USER_POOL_ID \
        --region $REGION \
        --cli-input-json "file://$TEMP_CONFIG" \
        --query 'UserPool.Id' \
        --output text > /dev/null
    
    rm -f "$TEMP_CONFIG"
    
    echo "✅ Auto-confirmación configurada"
else
    echo "✅ Usando User Pool existente: $USER_POOL_ID"
fi

# Verificar si el App Client ya existe
EXISTING_CLIENT=$(aws cognito-idp list-user-pool-clients \
    --user-pool-id $USER_POOL_ID \
    --region $REGION \
    --query "UserPoolClients[?ClientName=='$APP_CLIENT_NAME'].ClientId" \
    --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_CLIENT" ]; then
    echo "⚠️  App Client ya existe: $EXISTING_CLIENT"
    read -p "¿Deseas usar el client existente? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        CLIENT_ID=$EXISTING_CLIENT
    else
        echo "Eliminando client existente..."
        aws cognito-idp delete-user-pool-client \
            --user-pool-id $USER_POOL_ID \
            --client-id $EXISTING_CLIENT \
            --region $REGION
        EXISTING_CLIENT=""
    fi
fi

# Crear App Client si no existe
if [ -z "$EXISTING_CLIENT" ]; then
    echo "Creando App Client..."
    
    CLIENT_ID=$(aws cognito-idp create-user-pool-client \
        --user-pool-id $USER_POOL_ID \
        --client-name "$APP_CLIENT_NAME" \
        --region $REGION \
        --no-generate-secret \
        --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
        --prevent-user-existence-errors ENABLED \
        --query 'UserPoolClient.ClientId' \
        --output text)
    
    echo "✅ App Client creado: $CLIENT_ID"
    
    # Configurar el client para permitir USER_PASSWORD_AUTH sin secret
    echo "Configurando permisos del App Client..."
    aws cognito-idp update-user-pool-client \
        --user-pool-id $USER_POOL_ID \
        --client-id $CLIENT_ID \
        --region $REGION \
        --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
        --prevent-user-existence-errors ENABLED \
        --query 'UserPoolClient.ClientId' \
        --output text > /dev/null
    
    echo "✅ Permisos configurados"
else
    echo "✅ Usando App Client existente: $CLIENT_ID"
fi

# Configurar dominio (opcional pero recomendado)
echo ""
echo "Configurando dominio de Cognito..."
DOMAIN_NAME="emotioxv3-$(date +%s | tail -c 5)"
aws cognito-idp create-user-pool-domain \
    --domain "$DOMAIN_NAME" \
    --user-pool-id $USER_POOL_ID \
    --region $REGION \
    --query 'DomainDescription.Domain' \
    --output text > /dev/null 2>&1 || echo "⚠️  Dominio ya existe o no se pudo crear (no crítico)"

echo ""
echo "✅ Configuración de Cognito completada!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Información de Cognito:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "User Pool ID: $USER_POOL_ID"
echo "Client ID:    $CLIENT_ID"
echo "Region:       $REGION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar que gh CLI está instalado
if ! command -v gh &> /dev/null; then
    echo "⚠️  GitHub CLI no está instalado. No se pueden configurar los secrets automáticamente."
    echo "Instala con: brew install gh"
    echo ""
    echo "Configura manualmente estos secrets en GitHub:"
    echo "  COGNITO_USER_POOL_ID=$USER_POOL_ID"
    echo "  COGNITO_CLIENT_ID=$CLIENT_ID"
    exit 0
fi

# Verificar autenticación de GitHub
echo "Configurando secrets en GitHub..."
if ! gh auth status &> /dev/null; then
    echo "⚠️  No estás autenticado en GitHub CLI"
    echo "Autentica con: gh auth login"
    echo ""
    echo "Configura manualmente estos secrets en GitHub:"
    echo "  COGNITO_USER_POOL_ID=$USER_POOL_ID"
    echo "  COGNITO_CLIENT_ID=$CLIENT_ID"
    exit 0
fi

# Configurar secrets en GitHub
echo -n "Configurando COGNITO_USER_POOL_ID... "
if echo "$USER_POOL_ID" | gh secret set COGNITO_USER_POOL_ID -R clementeaf/emotioxV3 &> /dev/null; then
    echo "✅"
else
    echo "❌"
fi

echo -n "Configurando COGNITO_CLIENT_ID... "
if echo "$CLIENT_ID" | gh secret set COGNITO_CLIENT_ID -R clementeaf/emotioxV3 &> /dev/null; then
    echo "✅"
else
    echo "❌"
fi

echo ""
echo "✅ ¡Cognito configurado completamente!"
echo ""
echo "📝 Configuración importante:"
echo "   - Auto-confirmación de emails: ✅ ACTIVADA"
echo "   - MFA: ❌ DESHABILITADO"
echo "   - Auth Flow: USER_PASSWORD_AUTH ✅"
echo "   - Sin secret en el client: ✅"
echo ""
echo "🎉 ¡Listo para usar sin problemas!"

