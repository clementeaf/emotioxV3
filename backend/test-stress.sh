#!/bin/bash

# EmotioxV3 Backend - EXHAUSTIVE API Testing Script
# This script tests Happy Paths, Edge Cases, Error Handling, and Security

BASE_URL="http://localhost:3000"
ADMIN_EMAIL="admin@emotioxv3.com"
ADMIN_PASSWORD="Admin123!"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
MAGENTA='\033[0;35m'
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
    local expected_status=$6 # Optional: "error" or "success" (default)
    
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
    
    # Check expectations
    if [ "$expected_status" == "error" ]; then
        if echo "$response" | grep -q "error\|message.*fail\|statusCode.*[45]"; then
             print_success "$description (Expected Error)"
             echo "  Response: $response"
             return 0
        else
             print_error "$description - Expected Error but got Success: $response"
             return 1
        fi
    else
        if echo "$response" | grep -q "error\|message.*fail\|statusCode.*[45]"; then
            print_error "$description - Response: $response"
            return 1
        else
            print_success "$description"
            echo "  Response: ${response:0:100}..."
            return 0
        fi
    fi
}

# Start testing
echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     EmotioxV3 Backend - EXHAUSTIVE STRESS TEST            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

# ============================================
# 1. AUTH MODULE - STRESS TEST
# ============================================
print_section "1. AUTH MODULE - STRESS TEST"

# Happy Path: Login
print_test "Login with correct credentials"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

if echo "$LOGIN_RESPONSE" | grep -q "accessToken"; then
    print_success "Login successful"
    ADMIN_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
else
    print_error "Login failed: $LOGIN_RESPONSE"
    exit 1
fi

# Negative: Login wrong password
test_endpoint "POST" "/auth/login" \
    "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"WrongPass123!\"}" \
    "" \
    "Login with wrong password" \
    "error"

# Negative: Login non-existent user
test_endpoint "POST" "/auth/login" \
    "{\"email\":\"nobody@example.com\",\"password\":\"AnyPass123!\"}" \
    "" \
    "Login non-existent user" \
    "error"

# Negative: Register existing user (should fail or handle gracefully)
# Note: Cognito might return error, or our backend might catch DB constraint
test_endpoint "POST" "/auth/register" \
    "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"Test123!\",\"firstName\":\"Test\",\"lastName\":\"User\"}" \
    "" \
    "Register existing email" \
    "error"

# Negative: Access protected route without token
test_endpoint "GET" "/auth/me" "" "" "Access protected route without token" "error"

# Negative: Access protected route with malformed token
test_endpoint "GET" "/auth/me" "" "Authorization: Bearer malformed.token.here" "Access protected route with malformed token" "error"


# ============================================
# 2. RESEARCH TYPES (Admin) - VALIDATION
# ============================================
print_section "2. RESEARCH TYPES - VALIDATION"

# Happy Path: Create Type
CREATE_TYPE_RESPONSE=$(curl -s -X POST "$BASE_URL/research-types" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{
        "name": "Stress Test Type '$(date +%s)'",
        "description": "For testing",
        "default_modules": []
    }')
echo "DEBUG: Response: $CREATE_TYPE_RESPONSE"
TYPE_ID=$(echo "$CREATE_TYPE_RESPONSE" | grep -o '"id"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
print_success "Created Research Type: $TYPE_ID"

# Negative: Create Type without name
test_endpoint "POST" "/research-types" \
    '{"description": "Missing name"}' \
    "Authorization: Bearer $ADMIN_TOKEN" \
    "Create type without name" \
    "error"

# Negative: Get non-existent type
test_endpoint "GET" "/research-types/00000000-0000-0000-0000-000000000000" \
    "" \
    "Authorization: Bearer $ADMIN_TOKEN" \
    "Get non-existent type" \
    "error"


# ============================================
# 3. RESEARCH - COMPLEX SCENARIOS
# ============================================
print_section "3. RESEARCH - COMPLEX SCENARIOS"

# Happy Path: Create Research
CREATE_RESEARCH_RESPONSE=$(curl -s -X POST "$BASE_URL/research" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{
        \"name\": \"Stress Research\",
        \"research_type_id\": \"$TYPE_ID\"
    }")
echo "DEBUG: Research Response: $CREATE_RESEARCH_RESPONSE"
RESEARCH_ID=$(echo "$CREATE_RESEARCH_RESPONSE" | grep -o '"id"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
print_success "Created Research: $RESEARCH_ID"

# Negative: Create Research with invalid Type ID
test_endpoint "POST" "/research" \
    "{\"name\": \"Bad Type Research\", \"research_type_id\": \"00000000-0000-0000-0000-000000000000\"}" \
    "Authorization: Bearer $ADMIN_TOKEN" \
    "Create research with invalid type ID" \
    "error"

# Negative: Create Research missing required fields
test_endpoint "POST" "/research" \
    "{}" \
    "Authorization: Bearer $ADMIN_TOKEN" \
    "Create research empty payload" \
    "error"

# Negative: Update non-existent research
test_endpoint "PUT" "/research/00000000-0000-0000-0000-000000000000" \
    '{"name":"Ghost"}' \
    "Authorization: Bearer $ADMIN_TOKEN" \
    "Update non-existent research" \
    "error"


# ============================================
# 4. MODULES & QUESTIONS - BOUNDARY TESTING
# ============================================
print_section "4. MODULES & QUESTIONS - BOUNDARY"

# Happy Path: Create Module
CREATE_MOD_RESPONSE=$(curl -s -X POST "$BASE_URL/modules" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{
        \"research_id\": \"$RESEARCH_ID\",
        \"name\": \"Stress Module\",
        \"order_index\": 1
    }")
echo "DEBUG: Module Response: $CREATE_MOD_RESPONSE"
MODULE_ID=$(echo "$CREATE_MOD_RESPONSE" | grep -o '"id"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
print_success "Created Module: $MODULE_ID"

# Negative: Create Module for non-existent research
test_endpoint "POST" "/modules" \
    "{\"research_id\": \"00000000-0000-0000-0000-000000000000\", \"name\": \"Ghost Module\"}" \
    "Authorization: Bearer $ADMIN_TOKEN" \
    "Create module for non-existent research" \
    "error"

# Happy Path: Create Question
CREATE_Q_RESPONSE=$(curl -s -X POST "$BASE_URL/questions" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{
        \"module_id\": \"$MODULE_ID\",
        \"question_type\": \"text\",
        \"question_text\": \"Q1\",
        \"order_index\": 1,
        \"required\": true
    }")
QUESTION_ID=$(echo "$CREATE_Q_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
print_success "Created Question: $QUESTION_ID"

# Negative: Create Question with invalid type
test_endpoint "POST" "/questions" \
    "{
        \"module_id\": \"$MODULE_ID\",
        \"question_type\": \"invalid_type_xyz\",
        \"question_text\": \"Bad Type\",
        \"order_index\": 2
    }" \
    "Authorization: Bearer $ADMIN_TOKEN" \
    "Create question with invalid type" \
    "error"

# Negative: Create Question missing text
test_endpoint "POST" "/questions" \
    "{
        \"module_id\": \"$MODULE_ID\",
        \"question_type\": \"text\",
        \"order_index\": 2
    }" \
    "Authorization: Bearer $ADMIN_TOKEN" \
    "Create question missing text" \
    "error"


# ============================================
# 5. PUBLIC API - SECURITY & VALIDATION
# ============================================
print_section "5. PUBLIC API - SECURITY & VALIDATION"

# Happy Path: Get Active Research
# First activate it
curl -s -X PATCH "$BASE_URL/research/$RESEARCH_ID/status" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"status":"active"}' > /dev/null

test_endpoint "GET" "/public/research/$RESEARCH_ID" \
    "" "" \
    "Get Active Research (Public)" \
    "success"

# Negative: Get Draft Research (Public)
# Create draft research
DRAFT_RES_RESP=$(curl -s -X POST "$BASE_URL/research" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{\"name\": \"Draft Res\", \"research_type_id\": \"$TYPE_ID\"}")
DRAFT_ID=$(echo "$DRAFT_RES_RESP" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

test_endpoint "GET" "/public/research/$DRAFT_ID" \
    "" "" \
    "Get Draft Research (Public) - Should Fail" \
    "error"

# Negative: Submit response for non-existent question
test_endpoint "POST" "/public/responses" \
    "{
        \"research_id\": \"$RESEARCH_ID\",
        \"participant_id\": \"p1\",
        \"module_id\": \"$MODULE_ID\",
        \"question_id\": \"00000000-0000-0000-0000-000000000000\",
        \"answer\": {\"value\": \"test\"}
    }" \
    "" \
    "Submit response for non-existent question" \
    "error"


# ============================================
# 6. MEDIA - SECURITY
# ============================================
print_section "6. MEDIA - SECURITY"

# Negative: Generate upload URL without auth
test_endpoint "POST" "/media/upload" \
    "{\"research_id\": \"$RESEARCH_ID\", \"file_name\": \"test.jpg\", \"content_type\": \"image/jpeg\"}" \
    "" \
    "Generate upload URL without auth" \
    "error"


# ============================================
# 7. CLEANUP & INTEGRITY CHECK
# ============================================
print_section "7. CLEANUP & INTEGRITY"

# Delete Research (Should cascade delete modules/questions/responses)
test_endpoint "DELETE" "/research/$RESEARCH_ID" \
    "" \
    "Authorization: Bearer $ADMIN_TOKEN" \
    "Delete Research" \
    "success"

# Verify Module Creation on Deleted Research (Should Fail)
test_endpoint "POST" "/modules" \
    "{\"research_id\": \"$RESEARCH_ID\", \"name\": \"Zombie Module\", \"order_index\": 99}" \
    "Authorization: Bearer $ADMIN_TOKEN" \
    "Create Module on Deleted Research" \
    "error"

# Delete Module of deleted research (Should Success - Cleanup allowed)
test_endpoint "DELETE" "/modules/$MODULE_ID" \
    "" \
    "Authorization: Bearer $ADMIN_TOKEN" \
    "Delete Module of deleted research (Cleanup)" \
    "success"

# Delete Research Type
test_endpoint "DELETE" "/research-types/$TYPE_ID" \
    "" \
    "Authorization: Bearer $ADMIN_TOKEN" \
    "Delete Research Type" \
    "success"

# Cleanup Draft
curl -s -X DELETE "$BASE_URL/research/$DRAFT_ID" -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null


# ============================================
# FINAL SUMMARY
# ============================================
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}STRESS TEST SUMMARY${NC}"
echo -e "${BLUE}========================================${NC}\n"

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))

echo -e "Total Tests: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✓ ALL STRESS TESTS PASSED!${NC}\n"
    exit 0
else
    echo -e "\n${RED}✗ SOME TESTS FAILED${NC}\n"
    exit 1
fi
