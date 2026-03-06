#!/bin/bash

# Script para configurar y conectar a cPanel mediante SSH
# Usa la clave pública SSH proporcionada

set -euo pipefail

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Información de la clave pública
PUBLIC_KEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIP3oBv0Si31GyvDqO4VF9miqUSRw6ZoYuuAh9PKcSCn+ carriagadafalcone@gmail.com"
KEY_FINGERPRINT="SHA256:x5Nxf1voDWXzXow10relpuuxjkUAiaiMfOb9h8BFGe0"

echo -e "${BLUE}🔐 Configuración de conexión SSH a cPanel${NC}"
echo "=================================================="
echo ""

# Verificar si ssh-keygen está disponible
if ! command -v ssh-keygen &> /dev/null; then
    echo -e "${RED}❌ Error: ssh-keygen no está instalado${NC}"
    exit 1
fi

# Verificar la clave pública
echo -e "${GREEN}✅ Clave pública verificada:${NC}"
echo "   Tipo: ED25519"
echo "   Fingerprint: ${KEY_FINGERPRINT}"
echo "   Email: carriagadafalcone@gmail.com"
echo ""

# Solicitar información de conexión
echo -e "${YELLOW}📋 Información necesaria para la conexión:${NC}"
echo ""

read -p "Hostname del servidor cPanel (ej: server.emotiox.org o IP): " CPANEL_HOST
read -p "Usuario de cPanel: " CPANEL_USER
read -p "Puerto SSH (presiona Enter para usar 22): " CPANEL_PORT
CPANEL_PORT=${CPANEL_PORT:-22}

echo ""
echo -e "${BLUE}📝 Configurando conexión SSH...${NC}"
echo ""

# Crear directorio .ssh si no existe
SSH_DIR="$HOME/.ssh"
if [ ! -d "$SSH_DIR" ]; then
    mkdir -p "$SSH_DIR"
    chmod 700 "$SSH_DIR"
    echo -e "${GREEN}✅ Directorio .ssh creado${NC}"
fi

# Verificar si existe una clave privada correspondiente
PRIVATE_KEY_FOUND=false
for key_file in "$SSH_DIR"/id_ed25519 "$SSH_DIR"/id_rsa "$SSH_DIR"/id_ecdsa; do
    if [ -f "$key_file" ]; then
        # Verificar si la clave pública corresponde
        if ssh-keygen -y -f "$key_file" 2>/dev/null | grep -q "AAAAC3NzaC1lZDI1NTE5AAAAIP3oBv0Si31GyvDqO4VF9miqUSRw6ZoYuuAh9PKcSCn+"; then
            PRIVATE_KEY_FOUND=true
            PRIVATE_KEY="$key_file"
            echo -e "${GREEN}✅ Clave privada encontrada: $PRIVATE_KEY${NC}"
            break
        fi
    fi
done

if [ "$PRIVATE_KEY_FOUND" = false ]; then
    echo -e "${YELLOW}⚠️  No se encontró la clave privada correspondiente${NC}"
    echo ""
    echo "Para usar esta clave pública, necesitas:"
    echo "1. Tener la clave privada correspondiente en tu máquina"
    echo "2. O generar un nuevo par de claves SSH"
    echo ""
    read -p "¿Deseas generar un nuevo par de claves SSH? (s/n): " GENERATE_NEW
    
    if [ "$GENERATE_NEW" = "s" ] || [ "$GENERATE_NEW" = "S" ]; then
        KEY_PATH="$SSH_DIR/id_ed25519_cpanel"
        echo ""
        echo "Generando nuevo par de claves en: $KEY_PATH"
        ssh-keygen -t ed25519 -C "carriagadafalcone@gmail.com" -f "$KEY_PATH" -N ""
        PRIVATE_KEY="$KEY_PATH"
        PUBLIC_KEY=$(cat "${KEY_PATH}.pub")
        echo ""
        echo -e "${GREEN}✅ Nuevo par de claves generado${NC}"
        echo ""
        echo -e "${YELLOW}⚠️  IMPORTANTE: Debes agregar esta nueva clave pública a cPanel:${NC}"
        echo "$PUBLIC_KEY"
        echo ""
        read -p "Presiona Enter después de agregar la clave en cPanel..."
    else
        echo ""
        echo "Por favor, proporciona la ruta a tu clave privada:"
        read -p "Ruta a la clave privada: " PRIVATE_KEY
        if [ ! -f "$PRIVATE_KEY" ]; then
            echo -e "${RED}❌ Error: El archivo no existe${NC}"
            exit 1
        fi
    fi
fi

# Configurar SSH config
SSH_CONFIG="$SSH_DIR/config"
CONFIG_ENTRY="Host cpanel-emotio
    HostName $CPANEL_HOST
    User $CPANEL_USER
    Port $CPANEL_PORT
    IdentityFile $PRIVATE_KEY
    IdentitiesOnly yes
    ServerAliveInterval 60
    ServerAliveCountMax 3"

echo ""
echo -e "${BLUE}📝 Agregando configuración a ~/.ssh/config...${NC}"

# Verificar si ya existe una entrada para este host
if grep -q "Host cpanel-emotio" "$SSH_CONFIG" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Ya existe una entrada 'cpanel-emotio' en ~/.ssh/config${NC}"
    read -p "¿Deseas reemplazarla? (s/n): " REPLACE
    if [ "$REPLACE" = "s" ] || [ "$REPLACE" = "S" ]; then
        # Eliminar entrada existente
        sed -i.bak '/^Host cpanel-emotio$/,/^$/d' "$SSH_CONFIG" 2>/dev/null || true
        echo "" >> "$SSH_CONFIG"
        echo "$CONFIG_ENTRY" >> "$SSH_CONFIG"
        echo -e "${GREEN}✅ Configuración actualizada${NC}"
    fi
else
    echo "" >> "$SSH_CONFIG"
    echo "$CONFIG_ENTRY" >> "$SSH_CONFIG"
    chmod 600 "$SSH_CONFIG"
    echo -e "${GREEN}✅ Configuración agregada${NC}"
fi

echo ""
echo -e "${GREEN}✅ Configuración completada${NC}"
echo ""
echo "=================================================="
echo -e "${BLUE}📋 Instrucciones para agregar la clave pública en cPanel:${NC}"
echo ""
echo "1. Inicia sesión en cPanel"
echo "2. Ve a: Seguridad → Acceso SSH"
echo "3. En la sección 'Claves autorizadas', haz clic en 'Administrar'"
echo "4. Haz clic en 'Agregar nueva clave'"
echo "5. Pega la siguiente clave pública:"
echo ""
echo -e "${YELLOW}$PUBLIC_KEY${NC}"
echo ""
echo "6. Guarda la clave"
echo ""
echo "=================================================="
echo -e "${BLUE}🔌 Para conectarte, usa:${NC}"
echo ""
echo "  ssh cpanel-emotio"
echo ""
echo "O directamente:"
echo "  ssh -i $PRIVATE_KEY -p $CPANEL_PORT $CPANEL_USER@$CPANEL_HOST"
echo ""
read -p "¿Deseas probar la conexión ahora? (s/n): " TEST_CONNECTION

if [ "$TEST_CONNECTION" = "s" ] || [ "$TEST_CONNECTION" = "S" ]; then
    echo ""
    echo -e "${BLUE}🔍 Probando conexión...${NC}"
    echo ""
    
    if ssh -i "$PRIVATE_KEY" -p "$CPANEL_PORT" -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$CPANEL_USER@$CPANEL_HOST" "echo 'Conexión exitosa!'" 2>&1; then
        echo ""
        echo -e "${GREEN}✅ Conexión exitosa!${NC}"
        echo ""
        echo "Puedes conectarte con: ssh cpanel-emotio"
    else
        echo ""
        echo -e "${RED}❌ Error al conectar${NC}"
        echo ""
        echo "Posibles causas:"
        echo "1. La clave pública no ha sido agregada en cPanel"
        echo "2. El hostname o puerto son incorrectos"
        echo "3. El usuario no tiene permisos SSH habilitados"
        echo "4. El servidor no está accesible desde tu ubicación"
        echo ""
        echo "Verifica:"
        echo "- Que la clave pública esté agregada en cPanel → Seguridad → Acceso SSH"
        echo "- Que el usuario tenga SSH habilitado en cPanel"
        echo "- Que puedas hacer ping al servidor: ping $CPANEL_HOST"
    fi
fi

echo ""
echo -e "${GREEN}✅ Script completado${NC}"
