#!/bin/bash

# Script para ejecutar en el servidor cPanel
# Prueba TODOS los endpoints usando acceso directo a la base de datos

cd ~/emotioxv3/backend || exit 1

API_BASE="https://emotio.cx/api"
TOTAL=0
SUCCESS=0
ERROR=0
SKIPPED=0
AUTH_TOKEN=""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Prueba Completa de TODOS los Endpoints${NC}"
echo "=================================================="
echo ""

# Función para probar endpoint
test_endpoint() {
    local name=$1
    local method=$2
    local path=$3
    local auth=$4
    local expected=$5
    local body=$6
    local accept_404=$7
    
    TOTAL=$((TOTAL + 1))
    
    local url="${API_BASE}${path}"
    local headers=(-H "Content-Type: application/json")
    
    if [ "$auth" = "true" ] && [ -n "$AUTH_TOKEN" ]; then
        headers+=(-H "Authorization: Bearer $AUTH_TOKEN")
    fi
    
    local response
    local status_code
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "${headers[@]}" "$url" 2>&1)
    elif [ "$method" = "POST" ]; then
        if [ -n "$body" ]; then
            response=$(curl -s -w "\n%{http_code}" "${headers[@]}" -d "$body" -X POST "$url" 2>&1)
        else
            response=$(curl -s -w "\n%{http_code}" "${headers[@]}" -X POST "$url" 2>&1)
        fi
    elif [ "$method" = "PUT" ]; then
        response=$(curl -s -w "\n%{http_code}" "${headers[@]}" -X PUT "$url" 2>&1)
    elif [ "$method" = "DELETE" ]; then
        response=$(curl -s -w "\n%{http_code}" "${headers[@]}" -X DELETE "$url" 2>&1)
    elif [ "$method" = "PATCH" ]; then
        response=$(curl -s -w "\n%{http_code}" "${headers[@]}" -X PATCH "$url" 2>&1)
    fi
    
    status_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | sed '$d')
    
    local is_success=false
    if [ "$status_code" = "$expected" ]; then
        is_success=true
    elif [ "$status_code" -ge 200 ] && [ "$status_code" -lt 300 ]; then
        is_success=true
    elif [ "$accept_404" = "true" ] && [ "$status_code" = "404" ]; then
        is_success=true
    fi
    
    if [ "$is_success" = true ]; then
        echo -e "${GREEN}✅ ${name} [${status_code}]${NC}"
        SUCCESS=$((SUCCESS + 1))
    elif [ "$status_code" = "401" ] && [ "$auth" = "true" ] && [ -z "$AUTH_TOKEN" ]; then
        echo -e "${YELLOW}⏭️  ${name} [${status_code}] - SKIPPED (no auth)${NC}"
        SKIPPED=$((SKIPPED + 1))
    else
        echo -e "${RED}❌ ${name} [${status_code}]${NC}"
        local error_msg=$(echo "$response_body" | grep -o '"error":"[^"]*' | cut -d'"' -f4 | head -1)
        if [ -n "$error_msg" ]; then
            echo "   Error: $error_msg"
        elif [ ${#response_body} -lt 150 ] && [ -n "$response_body" ]; then
            echo "   Response: $response_body"
        fi
        ERROR=$((ERROR + 1))
    fi
}

# 1. Endpoints públicos
echo -e "${BLUE}📋 1. Endpoints Públicos${NC}"
echo "----------------------------------------"
test_endpoint "Health Check" "GET" "/health" "false" "200"
test_endpoint "Config" "GET" "/config" "false" "200"
echo ""

# 2. Obtener email y crear token de prueba usando Node.js
echo -e "${BLUE}🔐 Obteniendo token de autenticación...${NC}"

AUTH_TOKEN=$(node -e "
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
require('dotenv').config();

(async () => {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT || '3306'),
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
        });
        
        // Obtener primer usuario activo con cognito_sub
        const [users] = await pool.query(
            'SELECT id, email, cognito_sub, role FROM users WHERE deleted_at IS NULL AND email IS NOT NULL AND cognito_sub IS NOT NULL LIMIT 1'
        );
        
        if (users.length === 0) {
            console.log('NO_USERS');
            await pool.end();
            return;
        }
        
        const user = users[0];
        
        if (!user.cognito_sub) {
            console.log('NO_COGNITO_SUB');
            await pool.end();
            return;
        }
        
        // Crear token JWT usando cognito_sub como 'sub' (igual que en login)
        const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';
        const payload = {
            sub: user.cognito_sub,  // CRÍTICO: debe ser cognito_sub, no id
            email: user.email,
            role: user.role || 'researcher'
        };
        
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
        
        console.log(token);
        await pool.end();
    } catch (error) {
        console.error('ERROR:', error.message);
        process.exit(1);
    }
})();
" 2>&1 | tail -1)

if [ -z "$AUTH_TOKEN" ] || [ "$AUTH_TOKEN" = "NO_USERS" ] || [[ "$AUTH_TOKEN" == *"ERROR"* ]]; then
    echo -e "${YELLOW}⚠️  No se pudo obtener token${NC}"
    echo -e "${YELLOW}   Probando endpoints sin autenticación...${NC}"
    AUTH_TOKEN=""
else
    echo -e "${GREEN}✅ Token obtenido${NC}"
fi
echo ""

# 3. Obtener IDs reales
RESEARCH_TYPE_ID=""
RESEARCH_ID=""
ENTERPRISE_ID=""

if [ -n "$AUTH_TOKEN" ]; then
    echo -e "${BLUE}🔍 Obteniendo IDs reales...${NC}"
    
    RT_RESPONSE=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" "${API_BASE}/research-types")
    RESEARCH_TYPE_ID=$(echo "$RT_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    
    R_RESPONSE=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" "${API_BASE}/research")
    if echo "$R_RESPONSE" | grep -q '"researches"'; then
        RESEARCH_ID=$(echo "$R_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    fi
    
    E_RESPONSE=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" "${API_BASE}/enterprises")
    if echo "$E_RESPONSE" | grep -q '"enterprises"'; then
        ENTERPRISE_ID=$(echo "$E_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    fi
    
    # Obtener research technique ID
    RTECH_RESPONSE=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" "${API_BASE}/research-techniques")
    if echo "$RTECH_RESPONSE" | grep -q '"researchTechniques"'; then
        RESEARCH_TECHNIQUE_ID=$(echo "$RTECH_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    fi
    
    echo -e "${GREEN}✅ IDs: RT=${RESEARCH_TYPE_ID:-N/A} R=${RESEARCH_ID:-N/A} E=${ENTERPRISE_ID:-N/A} RTech=${RESEARCH_TECHNIQUE_ID:-N/A}${NC}"
    echo ""
fi

# 4. Probar TODOS los endpoints
echo -e "${BLUE}📋 2. Auth${NC}"
echo "----------------------------------------"
test_endpoint "Auth Me" "GET" "/auth/me" "true" "200"
test_endpoint "Auth Refresh" "POST" "/auth/refresh" "false" "200" "" "false"
echo ""

echo -e "${BLUE}📋 3. Research Types${NC}"
echo "----------------------------------------"
test_endpoint "List Research Types" "GET" "/research-types" "true" "200"
if [ -n "$RESEARCH_TYPE_ID" ]; then
    test_endpoint "Get Research Type" "GET" "/research-types/${RESEARCH_TYPE_ID}" "true" "200"
    test_endpoint "Get Research Type Techniques" "GET" "/research-types/${RESEARCH_TYPE_ID}/techniques" "true" "200"
    test_endpoint "Get Research Type Module Assignments" "GET" "/research-types/${RESEARCH_TYPE_ID}/module-assignments" "true" "200"
else
    test_endpoint "Get Research Type" "GET" "/research-types/test-id" "true" "200" "" "true"
    test_endpoint "Get Research Type Techniques" "GET" "/research-types/test-id/techniques" "true" "200" "" "true"
    test_endpoint "Get Research Type Module Assignments" "GET" "/research-types/test-id/module-assignments" "true" "200" "" "true"
fi
echo ""

echo -e "${BLUE}📋 4. Research Techniques${NC}"
echo "----------------------------------------"
test_endpoint "List Research Techniques" "GET" "/research-techniques" "true" "200"
test_endpoint "Get Research Technique" "GET" "/research-techniques/test-id" "true" "200" "" "true"
echo ""

echo -e "${BLUE}📋 5. Enterprises${NC}"
echo "----------------------------------------"
test_endpoint "List Enterprises" "GET" "/enterprises" "true" "200"
if [ -n "$ENTERPRISE_ID" ]; then
    test_endpoint "Get Enterprise" "GET" "/enterprises/${ENTERPRISE_ID}" "true" "200"
else
    test_endpoint "Get Enterprise" "GET" "/enterprises/test-id" "true" "200" "" "true"
fi
echo ""

echo -e "${BLUE}📋 6. Research${NC}"
echo "----------------------------------------"
test_endpoint "List Researches" "GET" "/research" "true" "200"
if [ -n "$RESEARCH_ID" ]; then
    test_endpoint "Get Research" "GET" "/research/${RESEARCH_ID}" "true" "200"
    test_endpoint "Get Research Metrics" "GET" "/research/${RESEARCH_ID}/metrics" "true" "200"
    test_endpoint "Get Research Participants Status" "GET" "/research/${RESEARCH_ID}/participants/status" "true" "200"
else
    test_endpoint "Get Research" "GET" "/research/test-id" "true" "200" "" "true"
    test_endpoint "Get Research Metrics" "GET" "/research/test-id/metrics" "true" "200" "" "true"
    test_endpoint "Get Research Participants Status" "GET" "/research/test-id/participants/status" "true" "200" "" "true"
fi
echo ""

echo -e "${BLUE}📋 7. Stage Templates${NC}"
echo "----------------------------------------"
test_endpoint "List Stage Templates" "GET" "/stage-templates" "true" "200"
test_endpoint "Get Stage Template" "GET" "/stage-templates/test-id" "true" "200" "" "true"
echo ""

echo -e "${BLUE}📋 8. Module Templates${NC}"
echo "----------------------------------------"
test_endpoint "List Module Templates" "GET" "/module-templates" "true" "200"
test_endpoint "Get Module Template" "GET" "/module-templates/test-id" "true" "200" "" "true"
test_endpoint "Get Module Template Usage" "GET" "/module-templates/test-id/usage" "true" "200" "" "true"
echo ""

echo -e "${BLUE}📋 9. Analytics${NC}"
echo "----------------------------------------"
if [ -n "$RESEARCH_ID" ]; then
    test_endpoint "Get SmartVOC Analytics" "GET" "/analytics/research/${RESEARCH_ID}/smartvoc" "true" "200"
    test_endpoint "Get Cognitive Tasks Analytics" "GET" "/analytics/research/${RESEARCH_ID}/cognitive-tasks" "true" "200"
else
    test_endpoint "Get SmartVOC Analytics" "GET" "/analytics/research/test-id/smartvoc" "true" "200" "" "true"
    test_endpoint "Get Cognitive Tasks Analytics" "GET" "/analytics/research/test-id/cognitive-tasks" "true" "200" "" "true"
fi
echo ""

echo -e "${BLUE}📋 10. Analysis${NC}"
echo "----------------------------------------"
test_endpoint "List Analysis Modules" "GET" "/analysis/modules" "true" "200"
echo ""

echo -e "${BLUE}📋 11. Responses${NC}"
echo "----------------------------------------"
if [ -n "$RESEARCH_ID" ]; then
    test_endpoint "Get Research Responses" "GET" "/responses/research/${RESEARCH_ID}" "true" "200"
else
    test_endpoint "Get Research Responses" "GET" "/responses/research/test-id" "true" "200" "" "true"
fi
echo ""

echo -e "${BLUE}📋 12. Cache${NC}"
echo "----------------------------------------"
test_endpoint "Get Cache Stats" "GET" "/cache/stats" "true" "200"
echo ""

echo -e "${BLUE}📋 13. Public${NC}"
echo "----------------------------------------"
test_endpoint "Get Public Research" "GET" "/public/research/test-id" "false" "200" "" "true"
echo ""

# Reporte
echo ""
echo "=================================================="
echo -e "${BLUE}📊 REPORTE FINAL${NC}"
echo "=================================================="
echo -e "${GREEN}✅ Exitosos: ${SUCCESS}${NC}"
echo -e "${RED}❌ Errores: ${ERROR}${NC}"
echo -e "${YELLOW}⏭️  Omitidos: ${SKIPPED}${NC}"
echo -e "${BLUE}📊 Total: ${TOTAL}${NC}"

if [ $((TOTAL - SKIPPED)) -gt 0 ]; then
    SUCCESS_RATE=$((SUCCESS * 100 / (TOTAL - SKIPPED)))
    echo -e "${BLUE}📈 Tasa de éxito: ${SUCCESS_RATE}%${NC}"
fi
echo ""

if [ $ERROR -gt 0 ]; then
    echo -e "${RED}⚠️  ${ERROR} endpoint(s) con errores${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Todos los endpoints funcionan correctamente${NC}"
    exit 0
fi
