#!/bin/bash

# Script para ejecutar migración de placeholder NPS en cPanel
# Este script debe ejecutarse desde el servidor cPanel donde está desplegado el backend

set -e

echo "🔄 Ejecutando migración de placeholder NPS en cPanel..."
echo ""

# Navegar al directorio del backend
cd ~/emotioxv3-backend

# Verificar que el archivo de migración existe
if [ ! -f "scripts/update_nps_placeholder_mysql.ts" ]; then
    echo "❌ Error: No se encontró scripts/update_nps_placeholder_mysql.ts"
    exit 1
fi

echo "✓ Archivo de migración encontrado"
echo ""

# Ejecutar el script de migración
echo "▶️  Ejecutando script de migración..."
npx ts-node scripts/update_nps_placeholder_mysql.ts

echo ""
echo "✅ Migración completada"
echo ""
echo "📝 Notas:"
echo "- Los módulos NPS existentes ahora tienen el placeholder correcto"
echo "- Los nuevos módulos NPS ya se crean con el placeholder correcto (seed scripts actualizados)"
echo "- No es necesario reiniciar Passenger, los cambios están en la base de datos"
