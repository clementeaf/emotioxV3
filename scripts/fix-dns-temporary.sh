#!/bin/bash

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}Para cambiar el DNS temporalmente:${NC}"
echo ""
echo "1. Ve a System Preferences (Preferencias del Sistema)"
echo "2. Click en 'Network' (Red)"
echo "3. Selecciona tu conexión (Wi-Fi o Ethernet)"
echo "4. Click en 'Advanced' (Avanzado)"
echo "5. Ve a la pestaña 'DNS'"
echo "6. Click en el botón '+' para agregar un servidor DNS"
echo "7. Agrega: ${GREEN}8.8.8.8${NC}"
echo "8. Agrega otro: ${GREEN}8.8.4.4${NC}"
echo "9. Arrastra estos dos servidores al principio de la lista"
echo "10. Click en 'OK' y luego 'Apply'"
echo ""
echo -e "${YELLOW}Después de cambiar el DNS, espera 10 segundos y prueba:${NC}"
echo "  https://research.emotiox.org"
echo "  https://participant.emotiox.org"
echo ""
echo -e "${BLUE}Para revertir después:${NC}"
echo "Simplemente elimina los servidores 8.8.8.8 y 8.8.4.4 de la lista"

