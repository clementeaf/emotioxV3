#!/bin/bash

set -euo pipefail

echo "🚀 EmotioX V3 - Configuración de AWS CLI para Nueva Cuenta"
echo "=========================================================="
echo ""

# Credenciales
ACCESS_KEY_ID="YOUR_AWS_ACCESS_KEY_ID_HERE"
SECRET_ACCESS_KEY="YOUR_AWS_SECRET_ACCESS_KEY_HERE"
REGION="us-east-1"
ACCOUNT_ID="058310292956"

echo "📋 Configurando perfil AWS 'cefal'..."

# Configurar perfil cefal
aws configure set aws_access_key_id "$ACCESS_KEY_ID" --profile cefal
aws configure set aws_secret_access_key "$SECRET_ACCESS_KEY" --profile cefal
aws configure set region "$REGION" --profile cefal
aws configure set output "json" --profile cefal

echo "✅ Perfil 'cefal' configurado"
echo ""

# Verificar configuración
echo "🔍 Verificando configuración..."
CALLER_IDENTITY=$(aws sts get-caller-identity --profile cefal)
RETRIEVED_ACCOUNT=$(echo "$CALLER_IDENTITY" | jq -r '.Account')

echo "$CALLER_IDENTITY" | jq '.'

if [ "$RETRIEVED_ACCOUNT" != "$ACCOUNT_ID" ]; then
    echo "❌ Error: Account ID no coincide"
    echo "   Esperado: $ACCOUNT_ID"
    echo "   Obtenido: $RETRIEVED_ACCOUNT"
    exit 1
fi

echo ""
echo "✅ Configuración verificada exitosamente"
echo ""
echo "📌 Para usar este perfil en comandos AWS CLI:"
echo "   aws <comando> --profile cefal"
echo ""
echo "📌 O establecer como perfil por defecto:"
echo "   export AWS_PROFILE=cefal"
echo ""
