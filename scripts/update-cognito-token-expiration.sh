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

# 24 horas = 1440 minutos (para AccessToken e IdToken)
# Cognito usa minutos para AccessTokenValidity e IdTokenValidity (rango: 5-1440 minutos)
ACCESS_TOKEN_VALIDITY=1440
ID_TOKEN_VALIDITY=1440

# 24 horas = 1 día, pero RefreshTokenValidity debe ser mayor que AccessTokenValidity
# Por lo tanto, usamos 2 días para RefreshToken
REFRESH_TOKEN_VALIDITY=2

echo "🔄 Actualizando App Client con expiración de tokens..."
echo "   Access Token: $ACCESS_TOKEN_VALIDITY minutos (24 horas)"
echo "   ID Token: $ID_TOKEN_VALIDITY minutos (24 horas)"
echo "   Refresh Token: $REFRESH_TOKEN_VALIDITY día(s) (48 horas - mínimo requerido)"
echo ""

# Obtener configuración actual del client
CURRENT_CONFIG=$(aws cognito-idp describe-user-pool-client \
    --user-pool-id "$USER_POOL_ID" \
    --client-id "$CLIENT_ID" \
    --region "$REGION" \
    --output json)

# Crear archivo temporal
TEMP_CONFIG=$(mktemp)

# Paso 1: Actualizar RefreshTokenValidity primero (debe ser mayor que AccessTokenValidity)
echo "   Paso 1: Actualizando RefreshTokenValidity a $REFRESH_TOKEN_VALIDITY días..."
jq '.UserPoolClient | 
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
        "RefreshTokenValidity": '"$REFRESH_TOKEN_VALIDITY"'
    }' <<< "$CURRENT_CONFIG" > "$TEMP_CONFIG"

if aws cognito-idp update-user-pool-client \
    --user-pool-id "$USER_POOL_ID" \
    --client-id "$CLIENT_ID" \
    --region "$REGION" \
    --cli-input-json "file://$TEMP_CONFIG" \
    --output json > /dev/null 2>&1; then
    echo "   ✅ RefreshTokenValidity actualizado exitosamente"
else
    echo "   ❌ Error actualizando RefreshTokenValidity"
    rm -f "$TEMP_CONFIG"
    exit 1
fi

# Paso 2: Intentar actualizar AccessTokenValidity e IdTokenValidity
# Nota: Si AccessTokenValidity e IdTokenValidity son null en el User Pool,
# puede que no se puedan establecer a nivel de App Client
echo "   Paso 2: Intentando actualizar AccessTokenValidity e IdTokenValidity..."

# Obtener configuración actualizada
CURRENT_CONFIG=$(aws cognito-idp describe-user-pool-client \
    --user-pool-id "$USER_POOL_ID" \
    --client-id "$CLIENT_ID" \
    --region "$REGION" \
    --output json)

        # Intentar establecer AccessTokenValidity e IdTokenValidity junto con TokenValidityUnits
        jq --argjson accessTokenValidity "$ACCESS_TOKEN_VALIDITY" \
           --argjson idTokenValidity "$ID_TOKEN_VALIDITY" \
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
                "AccessTokenValidity": $accessTokenValidity,
                "IdTokenValidity": $idTokenValidity,
                "RefreshTokenValidity": .RefreshTokenValidity,
                "TokenValidityUnits": {
                    "AccessToken": "minutes",
                    "IdToken": "minutes",
                    "RefreshToken": "days"
                }
            }' <<< "$CURRENT_CONFIG" > "$TEMP_CONFIG"

# Intentar actualizar, pero no fallar si no funciona
if aws cognito-idp update-user-pool-client \
    --user-pool-id "$USER_POOL_ID" \
    --client-id "$CLIENT_ID" \
    --region "$REGION" \
    --cli-input-json "file://$TEMP_CONFIG" \
    --output json > /dev/null 2>&1; then
    echo "   ✅ AccessTokenValidity e IdTokenValidity actualizados exitosamente"
    ACCESS_TOKEN_UPDATED=true
else
    echo "   ⚠️  No se pudieron actualizar AccessTokenValidity e IdTokenValidity"
    echo "      (Puede que el User Pool use valores por defecto que no se pueden sobrescribir)"
    echo "      Los tokens seguirán usando la configuración del User Pool (probablemente 1 hora)"
    ACCESS_TOKEN_UPDATED=false
fi

rm -f "$TEMP_CONFIG"

# Paso 3: Si AccessTokenValidity e IdTokenValidity no se pudieron actualizar,
# intentar actualizar el User Pool directamente
if [ "$ACCESS_TOKEN_UPDATED" = false ]; then
    echo "   Paso 3: Intentando actualizar User Pool directamente..."
    
    # Primero establecer TokenValidityUnits si no está configurado
    if aws cognito-idp update-user-pool \
        --user-pool-id "$USER_POOL_ID" \
        --region "$REGION" \
        --token-validity-units AccessToken=minutes IdToken=minutes RefreshToken=days \
        --output json > /dev/null 2>&1; then
        echo "   ✅ TokenValidityUnits configurado en User Pool"
        
        # Ahora intentar actualizar el App Client nuevamente
        CURRENT_CONFIG=$(aws cognito-idp describe-user-pool-client \
            --user-pool-id "$USER_POOL_ID" \
            --client-id "$CLIENT_ID" \
            --region "$REGION" \
            --output json)
        
        jq --argjson accessTokenValidity "$ACCESS_TOKEN_VALIDITY" \
           --argjson idTokenValidity "$ID_TOKEN_VALIDITY" \
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
                "AccessTokenValidity": $accessTokenValidity,
                "IdTokenValidity": $idTokenValidity,
                "RefreshTokenValidity": .RefreshTokenValidity,
                "TokenValidityUnits": {
                    "AccessToken": "minutes",
                    "IdToken": "minutes",
                    "RefreshToken": "days"
                }
            }' <<< "$CURRENT_CONFIG" > "$TEMP_CONFIG"
        
        if aws cognito-idp update-user-pool-client \
            --user-pool-id "$USER_POOL_ID" \
            --client-id "$CLIENT_ID" \
            --region "$REGION" \
            --cli-input-json "file://$TEMP_CONFIG" \
            --output json > /dev/null 2>&1; then
            echo "   ✅ AccessTokenValidity e IdTokenValidity actualizados después de configurar TokenValidityUnits"
            ACCESS_TOKEN_UPDATED=true
        else
            echo "   ⚠️  Aún no se pudieron actualizar AccessTokenValidity e IdTokenValidity"
        fi
    else
        echo "   ⚠️  No se pudo configurar TokenValidityUnits en User Pool"
    fi
fi

rm -f "$TEMP_CONFIG"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Configuración de Tokens:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$ACCESS_TOKEN_UPDATED" = true ]; then
    echo "Access Token Validity: 24 horas ($ACCESS_TOKEN_VALIDITY minutos) ✅"
    echo "ID Token Validity:    24 horas ($ID_TOKEN_VALIDITY minutos) ✅"
else
    echo "Access Token Validity: Usando valor por defecto del User Pool (probablemente 1 hora) ⚠️"
    echo "ID Token Validity:    Usando valor por defecto del User Pool (probablemente 1 hora) ⚠️"
fi
echo "Refresh Token Validity: $REFRESH_TOKEN_VALIDITY día(s) (48 horas) ✅"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  Nota: Los tokens existentes seguirán con su expiración original."
echo "   Los nuevos tokens tendrán la nueva expiración configurada."
echo ""
