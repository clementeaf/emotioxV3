#!/bin/bash
set -e

echo "🧪 Probando flujo de autenticación con Cognito..."
echo ""

# Obtener URL de la API desde secrets o usar la de producción
API_URL="${VITE_API_URL_PRODUCTION:-https://udnl10lc5e.execute-api.us-east-1.amazonaws.com/production}"

echo "📍 API URL: $API_URL"
echo ""

# Generar email único para la prueba
TEST_EMAIL="test-$(date +%s)@emotiox.test"
TEST_PASSWORD="Test1234!@#"
TEST_FIRST_NAME="Test"
TEST_LAST_NAME="User"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  REGISTRO DE USUARIO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Email: $TEST_EMAIL"
echo "Password: $TEST_PASSWORD"
echo ""

REGISTER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"firstName\": \"$TEST_FIRST_NAME\",
    \"lastName\": \"$TEST_LAST_NAME\",
    \"role\": \"researcher\"
  }")

HTTP_CODE=$(echo "$REGISTER_RESPONSE" | tail -n1)
REGISTER_BODY=$(echo "$REGISTER_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 201 ]; then
    echo "✅ Registro exitoso!"
    echo "Respuesta: $REGISTER_BODY" | jq '.' 2>/dev/null || echo "$REGISTER_BODY"
    echo ""
    
    # Extraer información del usuario
    USER_ID=$(echo "$REGISTER_BODY" | jq -r '.data.user.id' 2>/dev/null || echo "N/A")
    USER_EMAIL=$(echo "$REGISTER_BODY" | jq -r '.data.user.email' 2>/dev/null || echo "N/A")
    
    echo "📋 Usuario creado:"
    echo "   ID: $USER_ID"
    echo "   Email: $USER_EMAIL"
    echo ""
else
    echo "❌ Error en el registro"
    echo "HTTP Code: $HTTP_CODE"
    echo "Respuesta: $REGISTER_BODY"
    exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  LOGIN (Verificando auto-confirmación)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Esperar un momento para que Cognito procese
sleep 2

LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
  }")

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -n1)
LOGIN_BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Login exitoso! (Usuario confirmado automáticamente)"
    echo ""
    
    # Extraer tokens
    ACCESS_TOKEN=$(echo "$LOGIN_BODY" | jq -r '.data.tokens.accessToken' 2>/dev/null || echo "")
    ID_TOKEN=$(echo "$LOGIN_BODY" | jq -r '.data.tokens.idToken' 2>/dev/null || echo "")
    REFRESH_TOKEN=$(echo "$LOGIN_BODY" | jq -r '.data.tokens.refreshToken' 2>/dev/null || echo "")
    
    if [ -n "$ACCESS_TOKEN" ] && [ "$ACCESS_TOKEN" != "null" ]; then
        echo "📋 Tokens obtenidos:"
        echo "   Access Token: ${ACCESS_TOKEN:0:50}..."
        echo "   ID Token: ${ID_TOKEN:0:50}..."
        echo "   Refresh Token: ${REFRESH_TOKEN:0:50}..."
        echo ""
        
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "3️⃣  VERIFICAR PERFIL (Validar token)"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        
        ME_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/auth/me" \
          -H "Content-Type: application/json" \
          -H "Authorization: Bearer $ACCESS_TOKEN")
        
        HTTP_CODE=$(echo "$ME_RESPONSE" | tail -n1)
        ME_BODY=$(echo "$ME_RESPONSE" | sed '$d')
        
        if [ "$HTTP_CODE" -eq 200 ]; then
            echo "✅ Token válido! Perfil obtenido:"
            echo "$ME_BODY" | jq '.' 2>/dev/null || echo "$ME_BODY"
            echo ""
            
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "4️⃣  VERIFICAR EN COGNITO"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo ""
            
            # Verificar estado del usuario en Cognito
            USER_POOL_ID=$(gh secret get COGNITO_USER_POOL_ID -R clementeaf/emotioxV3 2>/dev/null || echo "")
            if [ -n "$USER_POOL_ID" ]; then
                COGNITO_USER=$(aws cognito-idp admin-get-user \
                    --user-pool-id "$USER_POOL_ID" \
                    --username "$TEST_EMAIL" \
                    --region us-east-1 \
                    --query 'UserStatus' \
                    --output text 2>/dev/null || echo "N/A")
                
                echo "Estado del usuario en Cognito: $COGNITO_USER"
                if [ "$COGNITO_USER" = "CONFIRMED" ]; then
                    echo "✅ Usuario CONFIRMADO en Cognito (auto-confirmación funcionando)"
                else
                    echo "⚠️  Estado: $COGNITO_USER"
                fi
            else
                echo "⚠️  No se pudo obtener User Pool ID para verificación"
            fi
            
            echo ""
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "✅ FLUJO COMPLETO EXITOSO"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo ""
            echo "🎉 Resumen:"
            echo "   ✅ Usuario registrado"
            echo "   ✅ Usuario confirmado automáticamente"
            echo "   ✅ Login exitoso"
            echo "   ✅ Token válido"
            echo "   ✅ Perfil accesible"
            echo ""
            echo "📧 Usuario de prueba creado: $TEST_EMAIL"
            echo "   (Puedes eliminarlo manualmente si lo deseas)"
            
        else
            echo "❌ Error al obtener perfil"
            echo "HTTP Code: $HTTP_CODE"
            echo "Respuesta: $ME_BODY"
            exit 1
        fi
    else
        echo "❌ No se obtuvieron tokens válidos"
        echo "Respuesta: $LOGIN_BODY"
        exit 1
    fi
else
    echo "❌ Error en el login"
    echo "HTTP Code: $HTTP_CODE"
    echo "Respuesta: $LOGIN_BODY"
    echo ""
    echo "⚠️  Esto podría indicar que:"
    echo "   - El usuario no se confirmó automáticamente"
    echo "   - Hay un problema con las credenciales de Cognito"
    echo "   - El backend no está configurado correctamente"
    exit 1
fi

