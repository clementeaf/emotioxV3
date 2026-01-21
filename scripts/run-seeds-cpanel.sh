#!/bin/bash

# Script para ejecutar los seeds de MySQL en cPanel vía SSH
# Usa la misma configuración que los scripts de despliegue

set -euo pipefail

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración (igual que deploy-backend-cpanel.sh)
SSH_HOST="cpanel-emotio"
REMOTE_BASE_DIR="~/emotioxv3"
REMOTE_BACKEND_DIR="$REMOTE_BASE_DIR/backend"
LOCAL_PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCAL_BACKEND_DIR="$LOCAL_PROJECT_DIR/backend"

echo -e "${BLUE}🌱 Ejecutando Seeds de MySQL en cPanel${NC}"
echo "=================================================="
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -d "$LOCAL_BACKEND_DIR" ]; then
    echo -e "${RED}❌ Error: No se encontró el directorio backend${NC}"
    exit 1
fi

# Verificar conexión SSH
echo -e "${BLUE}🔍 Verificando conexión SSH...${NC}"
if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "$SSH_HOST" "echo 'OK'" &>/dev/null; then
    echo -e "${RED}❌ Error: No se puede conectar a $SSH_HOST${NC}"
    echo "   Verifica tu configuración SSH en ~/.ssh/config"
    echo "   O ejecuta: ./scripts/connect-cpanel-ssh.sh"
    exit 1
fi
echo -e "${GREEN}✅ Conexión SSH establecida${NC}"
echo ""

# Función para ejecutar comandos remotos
run_remote() {
    ssh "$SSH_HOST" "$@"
}

# Paso 1: Transferir los scripts de seed al servidor
echo -e "${BLUE}📦 Transferiendo scripts de seed al servidor...${NC}"
rsync -avz \
    --exclude 'node_modules' \
    --exclude 'dist' \
    "$LOCAL_BACKEND_DIR/scripts/seed_research_techniques_mysql.ts" \
    "$LOCAL_BACKEND_DIR/scripts/seed_research_types_mysql.ts" \
    "$LOCAL_BACKEND_DIR/scripts/link_techniques_to_all_types_mysql.ts" \
    "$LOCAL_BACKEND_DIR/scripts/seed_all_mysql.ts" \
    "$SSH_HOST:$REMOTE_BACKEND_DIR/scripts/"
echo -e "${GREEN}✅ Scripts transferidos${NC}"
echo ""

# Paso 2: Verificar que existe .env en el servidor
echo -e "${BLUE}🔍 Verificando configuración...${NC}"
ENV_EXISTS=$(run_remote "test -f $REMOTE_BACKEND_DIR/.env && echo 'yes' || echo 'no'")

if [ "$ENV_EXISTS" = "no" ]; then
    echo -e "${RED}❌ Error: No se encontró .env en el servidor${NC}"
    echo "   Configura las variables de entorno primero:"
    echo "   ssh $SSH_HOST"
    echo "   cd $REMOTE_BACKEND_DIR"
    echo "   nano .env"
    exit 1
fi
echo -e "${GREEN}✅ Archivo .env encontrado${NC}"
echo ""

# Paso 3: Verificar que las dependencias estén instaladas
echo -e "${BLUE}🔍 Verificando dependencias...${NC}"
NODE_MODULES_EXISTS=$(run_remote "test -d $REMOTE_BACKEND_DIR/node_modules && echo 'yes' || echo 'no'")

if [ "$NODE_MODULES_EXISTS" = "no" ]; then
    echo -e "${YELLOW}⚠️  node_modules no encontrado, instalando dependencias...${NC}"
    run_remote "cd $REMOTE_BACKEND_DIR && npm install"
    echo -e "${GREEN}✅ Dependencias instaladas${NC}"
else
    echo -e "${GREEN}✅ Dependencias encontradas${NC}"
fi
echo ""

# Paso 4: Ejecutar el script maestro de seeds
echo -e "${BLUE}🌱 Ejecutando seeds de MySQL...${NC}"
echo -e "${YELLOW}   (Esto puede tomar unos segundos)${NC}"
echo ""

run_remote "cd $REMOTE_BACKEND_DIR && npx tsx scripts/seed_all_mysql.ts"

SEED_EXIT_CODE=$?

if [ $SEED_EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Seeds ejecutados exitosamente!${NC}"
    echo ""
    
    # Paso 5: Verificar resultados usando un script temporal que carga dotenv
    echo -e "${BLUE}🔍 Verificando resultados...${NC}"
    echo ""
    
    # Crear script temporal de verificación
    run_remote "cat > $REMOTE_BACKEND_DIR/scripts/verify_seeds_temp.ts << 'VERIFYEOF'
import path from 'path';
import dotenv from 'dotenv';
import { createPool } from 'mysql2/promise';

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

(async () => {
    try {
        // Check if is_active column exists
        const [columns] = await pool.query(\`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'research_techniques' 
            AND COLUMN_NAME = 'is_active'
        \`);
        const hasIsActive = Array.isArray(columns) && columns.length > 0;
        
        const techQuery = hasIsActive
            ? 'SELECT name FROM research_techniques WHERE is_active = true ORDER BY name'
            : 'SELECT name FROM research_techniques ORDER BY name';
        
        console.log('Técnicas de investigación:');
        const [techRows] = await pool.query(techQuery);
        if (Array.isArray(techRows) && techRows.length > 0) {
            techRows.forEach((row: any) => console.log(\`  - \${row.name}\`));
        } else {
            console.log('  (ninguna)');
        }
        
        console.log('');
        console.log('Tipos de investigación:');
        const [typeColumns] = await pool.query(\`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'research_types' 
            AND COLUMN_NAME = 'is_active'
        \`);
        const hasTypeIsActive = Array.isArray(typeColumns) && typeColumns.length > 0;
        
        const typeQuery = hasTypeIsActive
            ? 'SELECT name FROM research_types WHERE is_active = true ORDER BY name'
            : 'SELECT name FROM research_types ORDER BY name';
        
        const [typeRows] = await pool.query(typeQuery);
        if (Array.isArray(typeRows) && typeRows.length > 0) {
            typeRows.forEach((row: any) => console.log(\`  - \${row.name}\`));
        } else {
            console.log('  (ninguno)');
        }
        
        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        await pool.end();
        process.exit(1);
    }
})();
VERIFYEOF
"
    
    echo -e "${YELLOW}Resultados:${NC}"
    run_remote "cd $REMOTE_BACKEND_DIR && npx tsx scripts/verify_seeds_temp.ts" || echo "  (no se pudo verificar)"
    
    # Limpiar script temporal
    run_remote "rm -f $REMOTE_BACKEND_DIR/scripts/verify_seeds_temp.ts" 2>/dev/null || true
    
    echo ""
    echo -e "${GREEN}✅ Proceso completado${NC}"
else
    echo ""
    echo -e "${RED}❌ Error al ejecutar los seeds${NC}"
    echo "   Revisa los logs arriba para más detalles"
    exit 1
fi
