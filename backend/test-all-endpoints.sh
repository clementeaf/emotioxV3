#!/bin/bash

# EmotioxV3 Backend - Comprehensive API Testing Script
# This script tests ALL endpoints of the backend

BASE_URL="http://localhost:3000"
ADMIN_EMAIL="admin@emotioxv3.com"
ADMIN_PASSWORD="Admin123!"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
print_section() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_test() {
    echo -e "${YELLOW}Testing:${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓ PASS:${NC} $1"
    ((TESTS_PASSED++))
}

print_error() {
    echo -e "${RED}✗ FAIL:${NC} $1"
    ((TESTS_FAILED++))
}

# Test function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local headers=$4
    local description=$5
    
    print_test "$description"
    
    if [ -n "$data" ]; then
        if [ -n "$headers" ]; then
            response=$(curl -s -X $method "$BASE_URL$endpoint" \
                -H "Content-Type: application/json" \
                -H "$headers" \
                -d "$data")
        else
            response=$(curl -s -X $method "$BASE_URL$endpoint" \
                -H "Content-Type: application/json" \
                -d "$data")
        fi
    else
        if [ -n "$headers" ]; then
            response=$(curl -s -X $method "$BASE_URL$endpoint" \
                -H "$headers")
        else
            response=$(curl -s -X $method "$BASE_URL$endpoint")
        fi
    fi
    
    if echo "$response" | grep -q "error"; then
        print_error "$description - Response: $response"
        return 1
    else
        print_success "$description"
        echo "$response"
        return 0
    fi
}

# Start testing
echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     EmotioxV3 Backend - Comprehensive API Testing         ║"
echo "╔════════════════════════════════════════════════════════════╗"
echo -e "${NC}\n"

# ============================================
# 1. HEALTH CHECK
# ============================================
print_section "1. HEALTH CHECK"

test_endpoint "GET" "/health" "" "" "Health endpoint"

# ============================================
# 2. AUTH MODULE
# ============================================
print_section "2. AUTH MODULE"

# Register new user
NEW_USER_EMAIL="test_$(date +%s)@example.com"
print_test "Register new user"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$NEW_USER_EMAIL\",\"password\":\"Test123!\",\"firstName\":\"Test\",\"lastName\":\"User\"}")

if echo "$REGISTER_RESPONSE" | grep -q "error"; then
    print_error "Register - Response: $REGISTER_RESPONSE"
else
    print_success "Register new user"
    echo "$REGISTER_RESPONSE"
fi

# Login with admin
print_test "Login with admin credentials"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

if echo "$LOGIN_RESPONSE" | grep -q "error"; then
    print_error "Login - Response: $LOGIN_RESPONSE"
    exit 1
else
    print_success "Login with admin"
    ADMIN_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
    echo "Token obtained: ${ADMIN_TOKEN:0:50}..."
fi

# Get current user
test_endpoint "GET" "/auth/me" "" "Authorization: Bearer $ADMIN_TOKEN" "Get current user (me)"

# ============================================
# 3. RESEARCH TYPES MODULE (Admin Only)
# ============================================
print_section "3. RESEARCH TYPES MODULE (Admin Only)"

# List research types
print_test "List all research types"
TYPES_RESPONSE=$(curl -s -X GET "$BASE_URL/research-types" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
print_success "List research types"
echo "$TYPES_RESPONSE"

# Get first research type ID
RESEARCH_TYPE_ID=$(echo "$TYPES_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "Using research type ID: $RESEARCH_TYPE_ID"

# Get single research type
test_endpoint "GET" "/research-types/$RESEARCH_TYPE_ID" "" "Authorization: Bearer $ADMIN_TOKEN" "Get single research type"

# Create new research type
print_test "Create new research type"
CREATE_TYPE_RESPONSE=$(curl -s -X POST "$BASE_URL/research-types" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{
        "name": "test_type_'$(date +%s)'",
        "description": "Test research type created by automated testing",
        "default_modules": [
            {
                "name": "Introduction",
                "description": "Welcome module",
                "order": 1,
                "config": {},
                "questions": [
                    {
                        "type": "text",
                        "text": "What is your name?",
                        "required": true,
                        "config": {}
                    }
                ]
            }
        ]
    }')

if echo "$CREATE_TYPE_RESPONSE" | grep -q "error"; then
    print_error "Create research type - Response: $CREATE_TYPE_RESPONSE"
else
    print_success "Create new research type"
    NEW_TYPE_ID=$(echo "$CREATE_TYPE_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    echo "Created type ID: $NEW_TYPE_ID"
fi

# ============================================
# 4. RESEARCH MODULE
# ============================================
print_section "4. RESEARCH MODULE"

# Create research
print_test "Create new research"
CREATE_RESEARCH_RESPONSE=$(curl -s -X POST "$BASE_URL/research" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{
        \"name\": \"Test Research $(date +%s)\",
        \"description\": \"Automated test research\",
        \"research_type_id\": \"$RESEARCH_TYPE_ID\",
        \"use_default_modules\": [\"interest\"],
        \"settings\": {}
    }")

if echo "$CREATE_RESEARCH_RESPONSE" | grep -q "error"; then
    print_error "Create research - Response: $CREATE_RESEARCH_RESPONSE"
else
    print_success "Create new research"
    RESEARCH_ID=$(echo "$CREATE_RESEARCH_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    echo "Created research ID: $RESEARCH_ID"
fi

# List researches
test_endpoint "GET" "/research" "" "Authorization: Bearer $ADMIN_TOKEN" "List all researches"

# Get research by ID
test_endpoint "GET" "/research/$RESEARCH_ID" "" "Authorization: Bearer $ADMIN_TOKEN" "Get research by ID with modules"

# Update research
test_endpoint "PUT" "/research/$RESEARCH_ID" \
    '{"name":"Updated Research Name","description":"Updated description"}' \
    "Authorization: Bearer $ADMIN_TOKEN" \
    "Update research"

# Update research status
test_endpoint "PATCH" "/research/$RESEARCH_ID/status" \
    '{"status":"active"}' \
    "Authorization: Bearer $ADMIN_TOKEN" \
    "Update research status to active"

# ============================================
# 5. MODULES MODULE
# ============================================
print_section "5. MODULES MODULE"

# Create module
print_test "Create new module"
CREATE_MODULE_RESPONSE=$(curl -s -X POST "$BASE_URL/modules" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{
        \"research_id\": \"$RESEARCH_ID\",
        \"name\": \"Test Module\",
        \"description\": \"Automated test module\",
        \"order_index\": 10,
        \"config\": {\"theme\": \"dark\"}
    }")

if echo "$CREATE_MODULE_RESPONSE" | grep -q "error"; then
    print_error "Create module - Response: $CREATE_MODULE_RESPONSE"
else
    print_success "Create new module"
    MODULE_ID=$(echo "$CREATE_MODULE_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    echo "Created module ID: $MODULE_ID"
fi

# Update module
test_endpoint "PUT" "/modules/$MODULE_ID" \
    '{"name":"Updated Module Name","config":{"theme":"light"}}' \
    "Authorization: Bearer $ADMIN_TOKEN" \
    "Update module"

# ============================================
# 6. QUESTIONS MODULE
# ============================================
print_section "6. QUESTIONS MODULE"

# Create text question
print_test "Create new text question"
CREATE_QUESTION_RESPONSE=$(curl -s -X POST "$BASE_URL/questions" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{
        \"module_id\": \"$MODULE_ID\",
        \"question_type\": \"text\",
        \"question_text\": \"What is your favorite color?\",
        \"order_index\": 1,
        \"required\": true,
        \"config\": {\"maxLength\": 100},
        \"validation\": {\"minLength\": 3}
    }")

if echo "$CREATE_QUESTION_RESPONSE" | grep -q "error"; then
    print_error "Create text question - Response: $CREATE_QUESTION_RESPONSE"
else
    print_success "Create new text question"
    QUESTION_ID=$(echo "$CREATE_QUESTION_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    echo "Created text question ID: $QUESTION_ID"
fi

# Create range question (for analysis)
print_test "Create new range question"
CREATE_RANGE_QUESTION_RESPONSE=$(curl -s -X POST "$BASE_URL/questions" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{
        \"module_id\": \"$MODULE_ID\",
        \"question_type\": \"range\",
        \"question_text\": \"Rate this feature\",
        \"order_index\": 2,
        \"required\": true,
        \"config\": {\"min\": 1, \"max\": 10}
    }")

if echo "$CREATE_RANGE_QUESTION_RESPONSE" | grep -q "error"; then
    print_error "Create range question - Response: $CREATE_RANGE_QUESTION_RESPONSE"
else
    print_success "Create new range question"
    RANGE_QUESTION_ID=$(echo "$CREATE_RANGE_QUESTION_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    echo "Created range question ID: $RANGE_QUESTION_ID"
fi

# Update question
test_endpoint "PUT" "/questions/$QUESTION_ID" \
    '{"question_text":"What is your favorite color? (Updated)","config":{"maxLength":200}}' \
    "Authorization: Bearer $ADMIN_TOKEN" \
    "Update question"

# ============================================
# 7. MEDIA MODULE
# ============================================
print_section "7. MEDIA MODULE"

# Generate upload URL
print_test "Generate presigned upload URL"
UPLOAD_URL_RESPONSE=$(curl -s -X POST "$BASE_URL/media/upload" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{
        \"research_id\": \"$RESEARCH_ID\",
        \"file_name\": \"test-image.jpg\",
        \"content_type\": \"image/jpeg\"
    }")

if echo "$UPLOAD_URL_RESPONSE" | grep -q "error"; then
    print_error "Generate upload URL - Response: $UPLOAD_URL_RESPONSE"
else
    print_success "Generate presigned upload URL"
    echo "$UPLOAD_URL_RESPONSE" | head -c 200
    echo "..."
fi

# ============================================
# 8. PUBLIC MODULE (No Auth)
# ============================================
print_section "8. PUBLIC MODULE (No Auth Required)"

# Get public research
test_endpoint "GET" "/public/research/$RESEARCH_ID" "" "" "Get public research (active)"

# Save public response (Text)
print_test "Save public response (Text)"
PUBLIC_RESPONSE=$(curl -s -X POST "$BASE_URL/public/responses" \
    -H "Content-Type: application/json" \
    -d "{
        \"research_id\": \"$RESEARCH_ID\",
        \"participant_id\": \"participant_$(date +%s)\",
        \"module_id\": \"$MODULE_ID\",
        \"question_id\": \"$QUESTION_ID\",
        \"answer\": {\"value\": \"Blue\"},
        \"metadata\": {\"device\": \"test\"}
    }")

if echo "$PUBLIC_RESPONSE" | grep -q "error"; then
    print_error "Save public response - Response: $PUBLIC_RESPONSE"
else
    print_success "Save public response"
    echo "$PUBLIC_RESPONSE"
fi

# Save public response (Range)
print_test "Save public response (Range)"
RANGE_RESPONSE=$(curl -s -X POST "$BASE_URL/public/responses" \
    -H "Content-Type: application/json" \
    -d "{
        \"research_id\": \"$RESEARCH_ID\",
        \"participant_id\": \"participant_$(date +%s)\",
        \"module_id\": \"$MODULE_ID\",
        \"question_id\": \"$RANGE_QUESTION_ID\",
        \"answer\": {\"value\": 8},
        \"metadata\": {\"device\": \"test\"}
    }")

if echo "$RANGE_RESPONSE" | grep -q "error"; then
    print_error "Save range response - Response: $RANGE_RESPONSE"
else
    print_success "Save range response"
    echo "$RANGE_RESPONSE"
fi

# ============================================
# 9. RESPONSES MODULE
# ============================================
print_section "9. RESPONSES MODULE"

# Get responses by research
test_endpoint "GET" "/responses/research/$RESEARCH_ID" "" "Authorization: Bearer $ADMIN_TOKEN" "Get all responses for research"

# ============================================
# 10. ANALYSIS MODULE
# ============================================
print_section "10. ANALYSIS MODULE"

# Get analysis modules
test_endpoint "GET" "/analysis/modules" "" "Authorization: Bearer $ADMIN_TOKEN" "Get available analysis modules"

# Run analysis on question
test_endpoint "POST" "/analysis/question/$RANGE_QUESTION_ID" \
    '{"module_type":"basic_stats"}' \
    "Authorization: Bearer $ADMIN_TOKEN" \
    "Run basic stats analysis on range question"

# ============================================
# CLEANUP & SUMMARY
# ============================================
print_section "CLEANUP"

# Delete module
test_endpoint "DELETE" "/modules/$MODULE_ID" "" "Authorization: Bearer $ADMIN_TOKEN" "Delete test module"

# Delete research
test_endpoint "DELETE" "/research/$RESEARCH_ID" "" "Authorization: Bearer $ADMIN_TOKEN" "Delete test research"

# Delete research type
if [ -n "$NEW_TYPE_ID" ]; then
    test_endpoint "DELETE" "/research-types/$NEW_TYPE_ID" "" "Authorization: Bearer $ADMIN_TOKEN" "Delete test research type"
fi

# ============================================
# FINAL SUMMARY
# ============================================
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}TESTING SUMMARY${NC}"
echo -e "${BLUE}========================================${NC}\n"

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))

echo -e "Total Tests: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✓ ALL TESTS PASSED!${NC}\n"
    exit 0
else
    echo -e "\n${RED}✗ SOME TESTS FAILED${NC}\n"
    exit 1
fi
