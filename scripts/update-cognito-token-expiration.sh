#!/bin/bash
set -e

echo "🔧 Actualizando expiración de tokens de Cognito a 24 horas..."

# Verificar que AWS CLI está instalado
if ! command -v aws &> /dev/null; then
    echo "❌ Error: AWS CLI no está instalado"
    exit 1
fi

# Verificar que jq está instalado
if ! command -v jq &> /dev/null; then
    echo "❌ Error: jq no está instalado (necesario para procesar JSON)"
    echo "Instala con: brew install jq"
    exit 1
fi

# Obtener configuración desde SSM o variables de entorno
REGION="${AWS_REGION:-us-east-1}"
STAGE="${API_STAGE:-production}"

echo "📡 Obteniendo configuración de Cognito desde SSM (stage: $STAGE)..."

# Intentar obtener desde SSM
USER_POOL_ID=$(aws ssm get-parameter \
    --name "/emotioxv3/${STAGE}/COGNITO_USER_POOL_ID" \
    --region "$REGION" \
    --query 'Parameter.Value' \
    --output text 2>/dev/null || echo "")

CLIENT_ID=$(aws ssm get-parameter \
    --name "/emotioxv3/${STAGE}/COGNITO_CLIENT_ID" \
    --region "$REGION" \
    --query 'Parameter.Value' \
    --output text 2>/dev/null || echo "")

# Fallback a variables de entorno
if [ -z "$USER_POOL_ID" ]; then
    USER_POOL_ID="${COGNITO_USER_POOL_ID}"
fi

if [ -z "$CLIENT_ID" ]; then
    CLIENT_ID="${COGNITO_CLIENT_ID}"
fi

if [ -z "$USER_POOL_ID" ] || [ -z "$CLIENT_ID" ]; then
    echo "❌ Error: No se pudo obtener USER_POOL_ID o CLIENT_ID"
    echo "   Asegúrate de tener configurado SSM o variables de entorno:"
    echo "   - COGNITO_USER_POOL_ID"
    echo "   - COGNITO_CLIENT_ID"
    exit 1
fi

echo "✅ User Pool ID: $USER_POOL_ID"
echo "✅ Client ID: $CLIENT_ID"
echo ""

# 24 horas en segundos
TOKEN_VALIDITY=86400

echo "🔄 Actualizando App Client con expiración de tokens de 24 horas ($TOKEN_VALIDITY segundos)..."

# Obtener configuración actual del client
CURRENT_CONFIG=$(aws cognito-idp describe-user-pool-client \
    --user-pool-id "$USER_POOL_ID" \
    --client-id "$CLIENT_ID" \
    --region "$REGION" \
    --output json)

# Crear archivo temporal con la configuración actualizada usando jq
TEMP_CONFIG=$(mktemp)

# Usar jq para construir el JSON correctamente, preservando toda la configuración actual
jq --argjson tokenValidity "$TOKEN_VALIDITY" \
    '.UserPoolClient | 
    {
        "UserPoolId": .UserPoolId,
        "ClientId": .ClientId,
        "ClientName": .ClientName,
        "ExplicitAuthFlows": .ExplicitAuthFlows,
        "SupportedIdentityProviders": .SupportedIdentityProviders,
        "CallbackURLs": .CallbackURLs,
        "LogoutURLs": .LogoutURLs,
        "AllowedOAuthFlows": .AllowedOAuthFlows,
        "AllowedOAuthScopes": .AllowedOAuthScopes,
        "AllowedOAuthFlowsUserPoolClient": .AllowedOAuthFlowsUserPoolClient,
        "PreventUserExistenceErrors": (.PreventUserExistenceErrors // "ENABLED"),
        "AccessTokenValidity": $tokenValidity,
        "IdTokenValidity": $tokenValidity,
        "RefreshTokenValidity": $tokenValidity
    }' <<< "$CURRENT_CONFIG" > "$TEMP_CONFIG"

# Actualizar el App Client
aws cognito-idp update-user-pool-client \
    --user-pool-id "$USER_POOL_ID" \
    --client-id "$CLIENT_ID" \
    --region "$REGION" \
    --cli-input-json "file://$TEMP_CONFIG" \
    --output json > /dev/null

rm -f "$TEMP_CONFIG"

echo "✅ App Client actualizado exitosamente!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Configuración de Tokens:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Access Token Validity: 24 horas ($TOKEN_VALIDITY segundos)"
echo "ID Token Validity:    24 horas ($TOKEN_VALIDITY segundos)"
echo "Refresh Token Validity: 24 horas ($TOKEN_VALIDITY segundos)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  Nota: Los tokens existentes seguirán con su expiración original."
echo "   Los nuevos tokens tendrán la nueva expiración de 24 horas."
echo ""
