#!/bin/bash

# Script para deployment a AWS Lambda
# Carga variables desde .env

# Cargar .env excluyendo credenciales AWS (Lambda las rechaza)
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | grep -v '^AWS_ACCESS' | grep -v '^AWS_SECRET' | xargs)
fi

# Verificar variables requeridas
required_vars=(
    "DB_HOST"
    "DB_PORT"
    "DB_NAME"
    "DB_USER"
    "DB_PASSWORD"
    "AWS_REGION"
    "S3_BUCKET_NAME"
)

missing_vars=()
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo "❌ Error: Faltan las siguientes variables de entorno:"
    for var in "${missing_vars[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "Por favor exporta estas variables antes de ejecutar este script:"
    echo "export DB_HOST=your-db-host"
    echo "export DB_PORT=5432"
    echo "export DB_NAME=your-db-name"
    echo "export DB_USER=your-db-user"
    echo "export DB_PASSWORD=your-db-password"
    echo "export AWS_REGION=us-east-1"
    echo "export S3_BUCKET_NAME=your-bucket-name"
    exit 1
fi

echo "✓ Todas las variables de entorno están configuradas"
echo ""
echo "Compilando TypeScript..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Error: Falló la compilación"
    exit 1
fi

echo "✓ Compilación exitosa"
echo ""
echo "Desplegando a AWS Lambda..."
npm run deploy

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Deployment exitoso!"
else
    echo ""
    echo "❌ Error en el deployment"
    exit 1
fi
