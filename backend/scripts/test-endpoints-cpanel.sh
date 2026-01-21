#!/bin/bash

# Script para probar TODOS los endpoints en cPanel
# Usa curl para hacer requests directos

API_BASE="https://emotio.cx/api"
TOTAL=0
SUCCESS=0
ERROR=0
SKIPPED=0

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Probando TODOS los endpoints en cPanel${NC}"
echo "=================================================="
echo ""

# Función para probar un endpoint
test_endpoint() {
    local name=$1
    local method=$2
    local path=$3
    local auth=$4
    local expected=$5
    local body=$6
    
    TOTAL=$((TOTAL + 1))
    
    local url="${API_BASE}${path}"
    local headers=()
    
    if [ "$auth" = "true" ]; then
        if [ -z "$AUTH_TOKEN" ]; then
            echo -e "${YELLOW}⏭️  ${name} - SKIPPED (no auth token)${NC}"
            SKIPPED=$((SKIPPED + 1))
            return
        fi
        headers+=(-H "Authorization: Bearer $AUTH_TOKEN")
    fi
    
    headers+=(-H "Content-Type: application/json")
    
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
    
    if [ "$status_code" = "$expected" ] || ([ "$status_code" -ge 200 ] && [ "$status_code" -lt 300 ]); then
        echo -e "${GREEN}✅ ${name} [${status_code}]${NC}"
        SUCCESS=$((SUCCESS + 1))
    elif [ "$status_code" = "401" ] && [ "$auth" = "true" ] && [ -z "$AUTH_TOKEN" ]; then
        echo -e "${YELLOW}⏭️  ${name} [${status_code}] - SKIPPED (no auth)${NC}"
        SKIPPED=$((SKIPPED + 1))
    elif [ "$status_code" = "404" ] && [[ "$path" == *":id"* ]]; then
        echo -e "${YELLOW}⚠️  ${name} [${status_code}] - Expected (no ID provided)${NC}"
        SKIPPED=$((SKIPPED + 1))
    else
        echo -e "${RED}❌ ${name} [${status_code}]${NC}"
        if [ ${#response_body} -lt 200 ]; then
            echo "   Response: $response_body"
        fi
        ERROR=$((ERROR + 1))
    fi
}

# 1. Endpoints públicos (no requieren auth)
echo -e "${BLUE}📋 Endpoints Públicos${NC}"
echo "----------------------------------------"
test_endpoint "Health Check" "GET" "/health" "false" "200"
test_endpoint "Config" "GET" "/config" "false" "200"
echo ""

# 2. Intentar autenticación si hay credenciales
if [ -n "$TEST_EMAIL" ] && [ -n "$TEST_PASSWORD" ]; then
    echo -e "${BLUE}🔐 Autenticando...${NC}"
    AUTH_RESPONSE=$(curl -s -X POST "${API_BASE}/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
    
    AUTH_TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    
    if [ -n "$AUTH_TOKEN" ]; then
        echo -e "${GREEN}✅ Autenticación exitosa${NC}"
        echo ""
    else
        echo -e "${YELLOW}⚠️  No se pudo autenticar${NC}"
        echo ""
    fi
else
    echo -e "${YELLOW}⚠️  TEST_EMAIL y TEST_PASSWORD no configurados${NC}"
    echo -e "${YELLOW}   Los endpoints que requieren auth serán omitidos${NC}"
    echo ""
fi

# 3. Endpoints que requieren autenticación
echo -e "${BLUE}📋 Endpoints con Autenticación${NC}"
echo "----------------------------------------"

# Auth
test_endpoint "Auth Me" "GET" "/auth/me" "true" "200"
test_endpoint "Auth Refresh" "POST" "/auth/refresh" "false" "200"

# Research Types
test_endpoint "List Research Types" "GET" "/research-types" "true" "200"
test_endpoint "Get Research Type" "GET" "/research-types/test-id" "true" "200"
test_endpoint "Get Research Type Techniques" "GET" "/research-types/test-id/techniques" "true" "200"
test_endpoint "Get Research Type Module Assignments" "GET" "/research-types/test-id/module-assignments" "true" "200"

# Research Techniques
test_endpoint "List Research Techniques" "GET" "/research-techniques" "true" "200"
test_endpoint "Get Research Technique" "GET" "/research-techniques/test-id" "true" "200"

# Enterprises
test_endpoint "List Enterprises" "GET" "/enterprises" "true" "200"
test_endpoint "Get Enterprise" "GET" "/enterprises/test-id" "true" "200"

# Research
test_endpoint "List Researches" "GET" "/research" "true" "200"
test_endpoint "Get Research" "GET" "/research/test-id" "true" "200"
test_endpoint "Get Research Metrics" "GET" "/research/test-id/metrics" "true" "200"
test_endpoint "Get Research Participants Status" "GET" "/research/test-id/participants/status" "true" "200"

# Stage Templates
test_endpoint "List Stage Templates" "GET" "/stage-templates" "true" "200"
test_endpoint "Get Stage Template" "GET" "/stage-templates/test-id" "true" "200"

# Module Templates
test_endpoint "List Module Templates" "GET" "/module-templates" "true" "200"
test_endpoint "Get Module Template" "GET" "/module-templates/test-id" "true" "200"
test_endpoint "Get Module Template Usage" "GET" "/module-templates/test-id/usage" "true" "200"

# Analytics
test_endpoint "Get SmartVOC Analytics" "GET" "/analytics/research/test-id/smartvoc" "true" "200"
test_endpoint "Get Cognitive Tasks Analytics" "GET" "/analytics/research/test-id/cognitive-tasks" "true" "200"
test_endpoint "Get Navigation Flow Analytics" "GET" "/analytics/research/test-id/navigation-flow/test-module-id" "true" "200"
test_endpoint "Get Preference Test Analytics" "GET" "/analytics/research/test-id/preference-test/test-module-id" "true" "200"
test_endpoint "Get Text Responses Analytics" "GET" "/analytics/research/test-id/text-responses/test-module-id" "true" "200"
test_endpoint "Get Choice Responses Analytics" "GET" "/analytics/research/test-id/choice-responses/test-module-id" "true" "200"
test_endpoint "Get Scale Responses Analytics" "GET" "/analytics/research/test-id/scale-responses/test-module-id" "true" "200"
test_endpoint "Get Ranking Responses Analytics" "GET" "/analytics/research/test-id/ranking-responses/test-module-id" "true" "200"

# Analysis
test_endpoint "List Analysis Modules" "GET" "/analysis/modules" "true" "200"

# Responses
test_endpoint "Get Research Responses" "GET" "/responses/research/test-id" "true" "200"
test_endpoint "Get Participant Responses" "GET" "/responses/research/test-id/participant/test-participant-id" "true" "200"

# Cache
test_endpoint "Get Cache Stats" "GET" "/cache/stats" "true" "200"

# Public endpoints
test_endpoint "Get Public Research" "GET" "/public/research/test-id" "false" "200"
test_endpoint "Get Public Media by Key" "GET" "/public/media/by-key?key=test" "false" "200"

echo ""
echo "=================================================="
echo -e "${BLUE}📊 RESUMEN${NC}"
echo "=================================================="
echo -e "${GREEN}✅ Exitosos: ${SUCCESS}${NC}"
echo -e "${RED}❌ Errores: ${ERROR}${NC}"
echo -e "${YELLOW}⏭️  Omitidos: ${SKIPPED}${NC}"
echo -e "${BLUE}📊 Total: ${TOTAL}${NC}"
echo ""

if [ $ERROR -gt 0 ]; then
    echo -e "${RED}⚠️  Hay ${ERROR} endpoint(s) con errores${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Todos los endpoints probados funcionan correctamente${NC}"
    exit 0
fi
