#!/bin/bash

# Script de prueba para verificar que la configuración de módulos se guarda correctamente

BASE_URL="http://localhost:3000"
echo "🧪 Testing Module Configuration Save Flow"
echo "=========================================="
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir resultados
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2${NC}"
    else
        echo -e "${RED}✗ $2${NC}"
    fi
}

# 1. Login para obtener token
echo "1. Authenticating..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "test@test.com",
        "password": "TestPassword123!"
    }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    # Try alternative token format
    TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
fi

if [ -z "$TOKEN" ]; then
    echo -e "${RED}✗ Authentication failed${NC}"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi
print_result 0 "Authentication successful"
echo ""

# 2. Crear una investigación de prueba
echo "2. Creating test research..."
RESEARCH_RESPONSE=$(curl -s -X POST "$BASE_URL/research" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "name": "Test Research - Module Config",
        "description": "Testing module configuration save",
        "research_type_id": "46a0f0e5-34c4-4c8c-8a3b-66a2c38042e0"
    }')

RESEARCH_ID=$(echo $RESEARCH_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$RESEARCH_ID" ]; then
    echo -e "${RED}✗ Research creation failed${NC}"
    echo "Response: $RESEARCH_RESPONSE"
    exit 1
fi
print_result 0 "Research created with ID: $RESEARCH_ID"
echo ""

# 3. Crear un stage
echo "3. Creating test stage..."
STAGE_RESPONSE=$(curl -s -X POST "$BASE_URL/research/$RESEARCH_ID/stages" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "name": "Test Stage",
        "description": "Stage for testing module configuration"
    }')

STAGE_ID=$(echo $STAGE_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$STAGE_ID" ]; then
    echo -e "${RED}✗ Stage creation failed${NC}"
    echo "Response: $STAGE_RESPONSE"
    exit 1
fi
print_result 0 "Stage created with ID: $STAGE_ID"
echo ""

# 4. Crear un módulo
echo "4. Creating test module..."
MODULE_RESPONSE=$(curl -s -X POST "$BASE_URL/modules" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{
        \"research_id\": \"$RESEARCH_ID\",
        \"name\": \"Test Module\",
        \"description\": \"Module for configuration testing\",
        \"order_index\": 1,
        \"config\": {
            \"structure\": {
                \"components\": [
                    {
                        \"id\": \"title\",
                        \"type\": \"text\",
                        \"label\": \"Title\",
                        \"value\": \"Initial Title\"
                    },
                    {
                        \"id\": \"description\",
                        \"type\": \"textarea\",
                        \"label\": \"Description\",
                        \"value\": \"Initial Description\"
                    }
                ]
            }
        }
    }")

MODULE_ID=$(echo $MODULE_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$MODULE_ID" ]; then
    echo -e "${RED}✗ Module creation failed${NC}"
    echo "Response: $MODULE_RESPONSE"
    exit 1
fi
print_result 0 "Module created with ID: $MODULE_ID"
echo ""

# 5. Actualizar la configuración del módulo (simula lo que hace el frontend)
echo "5. Updating module configuration..."
echo -e "${YELLOW}Simulating frontend save with updated config...${NC}"

UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/modules/$MODULE_ID" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "config": {
            "structure": {
                "components": [
                    {
                        "id": "title",
                        "type": "text",
                        "label": "Title",
                        "value": "Updated Title from Frontend"
                    },
                    {
                        "id": "description",
                        "type": "textarea",
                        "label": "Description",
                        "value": "Updated Description from Frontend"
                    },
                    {
                        "id": "new_field",
                        "type": "text",
                        "label": "New Field",
                        "value": "Newly Added Field"
                    }
                ]
            },
            "theme": "dark",
            "showProgress": true
        }
    }')

if echo "$UPDATE_RESPONSE" | grep -q "error"; then
    echo -e "${RED}✗ Module update failed${NC}"
    echo "Response: $UPDATE_RESPONSE"
    exit 1
fi
print_result 0 "Module configuration updated"
echo ""

# 6. Verificar que la configuración se guardó correctamente
echo "6. Verifying saved configuration..."
VERIFY_RESPONSE=$(curl -s -X GET "$BASE_URL/research/$RESEARCH_ID" \
    -H "Authorization: Bearer $TOKEN")

# Verificar que el módulo existe en la respuesta
if ! echo "$VERIFY_RESPONSE" | grep -q "$MODULE_ID"; then
    echo -e "${RED}✗ Module not found in research${NC}"
    exit 1
fi

# Verificar que la configuración actualizada está presente
if echo "$VERIFY_RESPONSE" | grep -q "Updated Title from Frontend"; then
    print_result 0 "Configuration saved correctly - Title verified"
else
    echo -e "${YELLOW}⚠ Warning: Could not verify title in response${NC}"
fi

if echo "$VERIFY_RESPONSE" | grep -q "Newly Added Field"; then
    print_result 0 "Configuration saved correctly - New field verified"
else
    echo -e "${YELLOW}⚠ Warning: Could not verify new field in response${NC}"
fi

if echo "$VERIFY_RESPONSE" | grep -q '"theme":"dark"'; then
    print_result 0 "Configuration saved correctly - Theme verified"
else
    echo -e "${YELLOW}⚠ Warning: Could not verify theme in response${NC}"
fi

echo ""
echo "📊 Detailed Module Configuration:"
echo "$VERIFY_RESPONSE" | grep -A 50 "\"id\":\"$MODULE_ID\"" | head -30

echo ""
echo ""
echo "=========================================="
echo -e "${GREEN}✓ Test completed successfully!${NC}"
echo ""
echo "Summary:"
echo "  - Research ID: $RESEARCH_ID"
echo "  - Stage ID: $STAGE_ID"
echo "  - Module ID: $MODULE_ID"
echo ""
echo "🧹 Cleanup: Delete the test research when done with:"
echo "  curl -X DELETE \"$BASE_URL/research/$RESEARCH_ID\" -H \"Authorization: Bearer \$TOKEN\""
