#!/bin/bash

# Script para obtener una URL fresca de un archivo en S3
# Uso: ./get-fresh-url.sh <s3_key>
# Ejemplo: ./get-fresh-url.sh "research/c5f810e7-6487-4870-b933-00ba7d476134/1765466862777-IMG_3015.jpg"

S3_KEY="$1"
API_URL="${API_URL:-http://localhost:3000}"

if [ -z "$S3_KEY" ]; then
    echo "Error: Debes proporcionar el s3_key"
    echo "Uso: $0 <s3_key>"
    echo "Ejemplo: $0 'research/c5f810e7-6487-4870-b933-00ba7d476134/1765466862777-IMG_3015.jpg'"
    exit 1
fi

# Necesitas tu token de autenticación
if [ -z "$AUTH_TOKEN" ]; then
    echo "Error: Debes exportar tu AUTH_TOKEN"
    echo "Ejemplo: export AUTH_TOKEN='tu_token_aqui'"
    exit 1
fi

echo "Obteniendo URL fresca para s3_key: $S3_KEY"
echo ""

# URL encode el s3_key
ENCODED_S3_KEY=$(printf '%s' "$S3_KEY" | jq -sRr @uri)

RESPONSE=$(curl -s -X GET \
    "$API_URL/media/by-key?s3_key=$ENCODED_S3_KEY" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json")

echo "Respuesta:"
echo "$RESPONSE" | jq '.'

# Extraer la información
MEDIA_ID=$(echo "$RESPONSE" | jq -r '.id')
URL=$(echo "$RESPONSE" | jq -r '.url')
EXPIRES_IN=$(echo "$RESPONSE" | jq -r '.expires_in')

if [ "$URL" != "null" ] && [ "$URL" != "" ]; then
    echo ""
    echo "✓ Éxito!"
    echo "Media ID: $MEDIA_ID"
    echo "Expira en: $EXPIRES_IN segundos (1 hora)"
    echo ""
    echo "URL fresca:"
    echo "$URL"
else
    echo ""
    echo "✗ Error: No se pudo obtener la URL"
    exit 1
fi
