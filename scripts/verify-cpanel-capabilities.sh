#!/bin/bash

# Script para verificar capacidades de cPanel necesarias para emotioxV3
# Ejecutar desde SSH o desde el terminal del cPanel

set -euo pipefail

echo "🔍 Verificando capacidades de cPanel para emotioxV3"
echo "=================================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para verificar comandos
check_command() {
    if command -v "$1" &> /dev/null; then
        echo -e "${GREEN}✅ $1 está disponible${NC}"
        if [ "$1" = "node" ]; then
            NODE_VERSION=$(node --version 2>/dev/null || echo "No disponible")
            echo "   Versión: $NODE_VERSION"
        elif [ "$1" = "npm" ]; then
            NPM_VERSION=$(npm --version 2>/dev/null || echo "No disponible")
            echo "   Versión: $NPM_VERSION"
        elif [ "$1" = "python3" ]; then
            PYTHON_VERSION=$(python3 --version 2>/dev/null || echo "No disponible")
            echo "   Versión: $PYTHON_VERSION"
        fi
        return 0
    else
        echo -e "${RED}❌ $1 NO está disponible${NC}"
        return 1
    fi
}

# Función para verificar bases de datos
check_database() {
    echo ""
    echo "📊 Verificando bases de datos disponibles:"
    
    # Verificar PostgreSQL
    if command -v psql &> /dev/null; then
        echo -e "${GREEN}✅ PostgreSQL está instalado${NC}"
        PSQL_VERSION=$(psql --version 2>/dev/null | head -1 || echo "No disponible")
        echo "   Versión: $PSQL_VERSION"
    else
        echo -e "${YELLOW}⚠️  PostgreSQL no está instalado (puede estar disponible desde cPanel)${NC}"
    fi
    
    # Verificar MySQL
    if command -v mysql &> /dev/null; then
        echo -e "${GREEN}✅ MySQL está instalado${NC}"
        MYSQL_VERSION=$(mysql --version 2>/dev/null | head -1 || echo "No disponible")
        echo "   Versión: $MYSQL_VERSION"
    else
        echo -e "${YELLOW}⚠️  MySQL no está instalado (puede estar disponible desde cPanel)${NC}"
    fi
}

# Función para verificar Node.js apps en cPanel
check_nodejs_apps() {
    echo ""
    echo "📦 Verificando aplicaciones Node.js configuradas:"
    
    # Buscar directorios comunes de Node.js apps en cPanel
    if [ -d "$HOME/nodevenv" ] || [ -d "$HOME/nodejs" ]; then
        echo -e "${GREEN}✅ Directorio de Node.js apps encontrado${NC}"
        if [ -d "$HOME/nodevenv" ]; then
            echo "   Directorio: ~/nodevenv"
            ls -la "$HOME/nodevenv" 2>/dev/null | head -5 || true
        fi
        if [ -d "$HOME/nodejs" ]; then
            echo "   Directorio: ~/nodejs"
            ls -la "$HOME/nodejs" 2>/dev/null | head -5 || true
        fi
    else
        echo -e "${YELLOW}⚠️  No se encontraron aplicaciones Node.js configuradas${NC}"
        echo "   Puedes crear una desde cPanel → Setup Node.js App"
    fi
}

# Función para verificar permisos y directorios
check_permissions() {
    echo ""
    echo "🔐 Verificando permisos y directorios:"
    
    echo "   Usuario actual: $(whoami)"
    echo "   Directorio home: $HOME"
    echo "   Directorio actual: $(pwd)"
    
    # Verificar si podemos escribir en el home
    if [ -w "$HOME" ]; then
        echo -e "${GREEN}✅ Permisos de escritura en home: OK${NC}"
    else
        echo -e "${RED}❌ Sin permisos de escritura en home${NC}"
    fi
    
    # Verificar espacio en disco
    if command -v df &> /dev/null; then
        echo ""
        echo "💾 Espacio en disco:"
        df -h "$HOME" 2>/dev/null || df -h . 2>/dev/null || echo "   No disponible"
    fi
}

# Función para verificar WebSockets
check_websockets() {
    echo ""
    echo "🔌 Verificando soporte para WebSockets:"
    echo -e "${YELLOW}⚠️  WebSockets requiere verificación manual en cPanel${NC}"
    echo "   Revisa en cPanel → Setup Node.js App → Configuración de la app"
    echo "   O consulta con el soporte de Namecheap"
}

# Función para verificar PHP (por si acaso)
check_php() {
    echo ""
    echo "🐘 Verificando PHP (no necesario para emotioxV3, pero útil saber):"
    if command -v php &> /dev/null; then
        PHP_VERSION=$(php --version 2>/dev/null | head -1 || echo "No disponible")
        echo -e "${GREEN}✅ PHP está disponible${NC}"
        echo "   Versión: $PHP_VERSION"
    else
        echo -e "${YELLOW}⚠️  PHP no está disponible desde línea de comandos${NC}"
    fi
}

# Función para verificar variables de entorno
check_environment() {
    echo ""
    echo "🌍 Variables de entorno importantes:"
    echo "   HOME: ${HOME:-No definido}"
    echo "   PATH: ${PATH:-No definido}"
    echo "   USER: ${USER:-No definido}"
    
    if [ -n "${NODE_PATH:-}" ]; then
        echo "   NODE_PATH: $NODE_PATH"
    fi
}

# Función para obtener información del sistema
check_system() {
    echo ""
    echo "🖥️  Información del sistema:"
    
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        echo "   OS: $PRETTY_NAME"
    elif [ -f /etc/redhat-release ]; then
        echo "   OS: $(cat /etc/redhat-release)"
    elif [ -f /etc/debian_version ]; then
        echo "   OS: Debian $(cat /etc/debian_version)"
    fi
    
    if command -v uname &> /dev/null; then
        echo "   Kernel: $(uname -r)"
        echo "   Arquitectura: $(uname -m)"
    fi
}

# Ejecutar todas las verificaciones
echo "1️⃣ Verificando herramientas básicas:"
check_command "node"
check_command "npm"
check_command "git"
check_command "curl"
check_command "wget"

check_database
check_nodejs_apps
check_permissions
check_php
check_environment
check_system
check_websockets

echo ""
echo "=================================================="
echo "📋 Resumen y próximos pasos:"
echo ""
echo "✅ Si Node.js y npm están disponibles:"
echo "   → Puedes instalar dependencias con: npm install"
echo ""
echo "✅ Si PostgreSQL está disponible:"
echo "   → Puedes usar la base de datos actual"
echo ""
echo "⚠️  Si solo MySQL está disponible:"
echo "   → Necesitarás migrar el esquema de PostgreSQL a MySQL"
echo ""
echo "⚠️  Si no hay Node.js desde línea de comandos:"
echo "   → Usa cPanel → Setup Node.js App para crear una aplicación"
echo ""
echo "📝 Para más información, ejecuta este script y comparte el output"
echo ""
