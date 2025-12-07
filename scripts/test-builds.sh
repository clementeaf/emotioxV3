#!/bin/bash

echo "=== Test de Builds Localmente ==="
echo ""

# Función para verificar el resultado del comando
check_result() {
    if [ $? -eq 0 ]; then
        echo "   ✅ $1 - EXITOSO"
    else
        echo "   ❌ $1 - FALLIDO"
        exit 1
    fi
}

echo "1. Verificando backend..."
cd backend
npm run build > /dev/null 2>&1
check_result "Build backend"

echo ""
echo "2. Verificando participant-frontend..."
cd ../participant-frontend
npm run build > /dev/null 2>&1
check_result "Build participant-frontend"

echo ""
echo "3. Verificando research-frontend..."
cd ../research-frontend
npm run build > /dev/null 2>&1
check_result "Build research-frontend"

echo ""
echo "=== Todos los builds fueron exitosos ==="
echo ""
echo "Siguientes pasos:"
echo "1. Verifica los secrets de GitHub con: gh secret list"
echo "2. Verifica permisos de IAM en AWS"
echo "3. Confirma que los buckets de S3 y CloudFront existan"