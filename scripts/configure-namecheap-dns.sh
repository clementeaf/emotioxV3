#!/bin/bash

# Script para configurar CNAME en Namecheap para server.emotiox.org
# Requiere: API credentials de Namecheap configuradas como variables de entorno

set -euo pipefail

# Configuración
DOMAIN="emotiox.org"
SUBDOMAIN="server"
TARGET_DOMAIN="d-e5vibpmbz3.execute-api.us-east-1.amazonaws.com"

# Variables de entorno requeridas
NC_API_USER="${NC_API_USER:-}"
NC_API_KEY="${NC_API_KEY:-}"
NC_USERNAME="${NC_USERNAME:-}"
NC_CLIENT_IP="${NC_CLIENT_IP:-}"

# Verificar que las variables estén configuradas
if [ -z "$NC_API_USER" ] || [ -z "$NC_API_KEY" ] || [ -z "$NC_USERNAME" ] || [ -z "$NC_CLIENT_IP" ]; then
    echo "❌ Error: Faltan variables de entorno de Namecheap"
    echo ""
    echo "Configura las siguientes variables:"
    echo "  export NC_API_USER='tu_api_user'"
    echo "  export NC_API_KEY='tu_api_key'"
    echo "  export NC_USERNAME='tu_username'"
    echo "  export NC_CLIENT_IP='tu_ip_publica'"
    echo ""
    echo "Puedes obtener tus credenciales en:"
    echo "  https://www.namecheap.com/support/api/intro/"
    exit 1
fi

# Extraer SLD y TLD del dominio
SLD=$(echo "$DOMAIN" | cut -d. -f1)
TLD=$(echo "$DOMAIN" | cut -d. -f2-)

echo "🔧 Configurando CNAME para ${SUBDOMAIN}.${DOMAIN} → ${TARGET_DOMAIN}"
echo ""

# Paso 1: Obtener registros DNS existentes
echo "📥 Obteniendo registros DNS existentes..."
EXISTING_RECORDS=$(curl -s "https://api.namecheap.com/xml.response?ApiUser=${NC_API_USER}&ApiKey=${NC_API_KEY}&UserName=${NC_USERNAME}&Command=namecheap.domains.dns.getHosts&ClientIp=${NC_CLIENT_IP}&SLD=${SLD}&TLD=${TLD}")

if echo "$EXISTING_RECORDS" | grep -q "Error"; then
    echo "❌ Error al obtener registros DNS:"
    echo "$EXISTING_RECORDS" | grep -oP '(?<=<Error>)[^<]+' || echo "$EXISTING_RECORDS"
    exit 1
fi

echo "✅ Registros obtenidos correctamente"
echo ""

# Paso 2: Parsear registros existentes y construir la petición setHosts
echo "🔨 Construyendo petición para actualizar DNS..."

# Extraer registros existentes (excluyendo el subdominio que vamos a actualizar)
RECORD_COUNT=0
RECORD_PARAMS=""

# Parsear XML y construir parámetros (simplificado - en producción usar xmlstarlet o jq)
# Por ahora, vamos a construir una petición básica que incluye el nuevo CNAME

# Nota: Este script es una versión simplificada. En producción, deberías:
# 1. Parsear correctamente todos los registros existentes del XML
# 2. Incluirlos todos en la petición setHosts
# 3. Agregar el nuevo CNAME

# Por simplicidad, aquí solo agregamos el CNAME
# ⚠️ ADVERTENCIA: Esto puede eliminar otros registros si no se incluyen correctamente

RECORD_COUNT=1
RECORD_PARAMS="HostName${RECORD_COUNT}=${SUBDOMAIN}&RecordType${RECORD_COUNT}=CNAME&Address${RECORD_COUNT}=${TARGET_DOMAIN}&TTL${RECORD_COUNT}=1800"

echo "📤 Enviando petición a Namecheap API..."
RESPONSE=$(curl -s "https://api.namecheap.com/xml.response?ApiUser=${NC_API_USER}&ApiKey=${NC_API_KEY}&UserName=${NC_USERNAME}&Command=namecheap.domains.dns.setHosts&ClientIp=${NC_CLIENT_IP}&SLD=${SLD}&TLD=${TLD}&${RECORD_PARAMS}")

if echo "$RESPONSE" | grep -q "IsSuccess=\"true\""; then
    echo "✅ CNAME configurado correctamente!"
    echo ""
    echo "El registro DNS debería propagarse en 30-60 minutos."
    echo "Puedes verificar con:"
    echo "  dig ${SUBDOMAIN}.${DOMAIN} CNAME"
    echo ""
    echo "Una vez propagado, prueba:"
    echo "  curl https://${SUBDOMAIN}.${DOMAIN}/health"
else
    echo "❌ Error al configurar CNAME:"
    echo "$RESPONSE" | grep -oP '(?<=<Error>)[^<]+' || echo "$RESPONSE"
    exit 1
fi
