#!/bin/bash

# Script para ejecutar los seeds de MySQL en cPanel
# Uso: bash run_seeds_cpanel.sh

echo "🌱 Ejecutando seeds de MySQL para EmotioX V3..."
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: Debes ejecutar este script desde el directorio backend/"
    exit 1
fi

# Verificar que las variables de entorno estén configuradas
if [ -z "$DB_HOST" ] || [ -z "$DB_NAME" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
    echo "⚠️  Advertencia: Variables de entorno de base de datos no encontradas."
    echo "   Asegúrate de tener configuradas: DB_HOST, DB_NAME, DB_USER, DB_PASSWORD"
    echo ""
    echo "   Puedes exportarlas antes de ejecutar:"
    echo "   export DB_HOST=tu_host"
    echo "   export DB_NAME=emotiox"
    echo "   export DB_USER=tu_usuario"
    echo "   export DB_PASSWORD=tu_password"
    echo "   export DB_PORT=3306"
    echo "   export DB_SSL=false"
    echo ""
    read -p "¿Continuar de todas formas? (s/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        exit 1
    fi
fi

# Ejecutar el script maestro
echo "📝 Ejecutando seed_all_mysql.ts..."
npx tsx scripts/seed_all_mysql.ts

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Seeds ejecutados exitosamente!"
else
    echo ""
    echo "❌ Error al ejecutar los seeds"
    exit 1
fi
