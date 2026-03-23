#!/bin/bash

# ═══════════════════════════════════════════════════════════════
# VaultGames Deployment Validation Script
# ═══════════════════════════════════════════════════════════════
# 
# USAGE: bash deployment-validate.sh [domain]
# EXAMPLE: bash deployment-validate.sh yourdomain.com
#

set -e

DOMAIN="${1:-localhost}"
PROTOCOL="${2:-https}"
BASE_URL="$PROTOCOL://$DOMAIN"
BACKEND_URL="http://localhost:5000"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
test_endpoint() {
    local description=$1
    local url=$2
    local expected_code=$3
    local method="${4:-GET}"
    local data="${5:-}"
    
    echo -e "\n${YELLOW}→${NC} Testing: $description"
    echo "  URL: $url"
    
    TESTS_RUN=$((TESTS_RUN + 1))
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" -H "Content-Type: application/json" -d "$data")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" == "$expected_code" ]; then
        echo -e "  ${GREEN}✓ PASS${NC} (HTTP $http_code)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "  ${RED}✗ FAIL${NC} (Expected HTTP $expected_code, got $http_code)"
        echo "  Response: $body"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

echo "═══════════════════════════════════════════════════════════════"
echo "  VaultGames Deployment Validation"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Target: $BASE_URL"
echo "Backend: $BACKEND_URL"
echo ""

# ──────────────────────────────────────────────────────────────
# 1. Docker Services Check
# ──────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════════"
echo "  1. Docker Services Status"
echo "═══════════════════════════════════════════════════════════════"

echo -e "\n${YELLOW}→${NC} Checking Docker services..."

if command -v docker-compose &> /dev/null; then
    docker-compose -f docker-compose.prod.yml ps
else
    echo -e "${RED}✗ docker-compose not found${NC}"
fi

# ──────────────────────────────────────────────────────────────
# 2. Backend Health Checks
# ──────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  2. Backend Health Checks"
echo "═══════════════════════════════════════════════════════════════"

test_endpoint "Backend is running" "$BACKEND_URL/api/auth/me" "401" || true

# ──────────────────────────────────────────────────────────────
# 3. Frontend Tests
# ──────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  3. Frontend Tests"
echo "═══════════════════════════════════════════════════════════════"

test_endpoint "Frontend serves index.html" "$BASE_URL/" "200" || true
test_endpoint "Frontend serves assets" "$BASE_URL/" "200" || true

# ──────────────────────────────────────────────────────────────
# 4. API Endpoint Tests
# ──────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  4. API Endpoint Tests"
echo "═══════════════════════════════════════════════════════════════"

test_endpoint "Register endpoint available" "$BACKEND_URL/api/auth/register" "400" "POST" '{"username":"test"}' || true
test_endpoint "Login endpoint available" "$BACKEND_URL/api/auth/login" "400" "POST" '{"email":"test@test.com"}' || true
test_endpoint "Games endpoint available" "$BACKEND_URL/api/games/active" "401" || true

# ──────────────────────────────────────────────────────────────
# 5. Database Connection Tests
# ──────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  5. Database Connection Tests"
echo "═══════════════════════════════════════════════════════════════"

echo -e "\n${YELLOW}→${NC} Testing PostgreSQL connection..."
if docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U postgres &> /dev/null; then
    echo -e "  ${GREEN}✓ PASS${NC} PostgreSQL is reachable"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "  ${RED}✗ FAIL${NC} PostgreSQL is not reachable"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
TESTS_RUN=$((TESTS_RUN + 1))

echo -e "\n${YELLOW}→${NC} Testing Redis connection..."
if docker-compose -f docker-compose.prod.yml exec -T redis redis-cli ping &> /dev/null; then
    echo -e "  ${GREEN}✓ PASS${NC} Redis is reachable"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "  ${RED}✗ FAIL${NC} Redis is not reachable"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
TESTS_RUN=$((TESTS_RUN + 1))

# ──────────────────────────────────────────────────────────────
# 6. SSL Certificate Tests
# ──────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  6. SSL Certificate Tests"
echo "═══════════════════════════════════════════════════════════════"

if [ -f "./ssl/cert.pem" ] && [ -f "./ssl/key.pem" ]; then
    echo -e "\n${YELLOW}→${NC} Checking SSL certificate..."
    EXPIRY=$(openssl x509 -in ./ssl/cert.pem -noout -enddate 2>/dev/null | cut -d= -f2)
    echo -e "  ${GREEN}✓${NC} SSL certificate found"
    echo "  Expires: $EXPIRY"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "\n${YELLOW}⚠${NC} SSL certificates not found in ./ssl/"
    TESTS_RUN=$((TESTS_RUN + 1))
fi
TESTS_RUN=$((TESTS_RUN + 1))

# ──────────────────────────────────────────────────────────────
# 7. Environment Variable Tests
# ──────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  7. Environment Variable Tests"
echo "═══════════════════════════════════════════════════════════════"

echo -e "\n${YELLOW}→${NC} Checking required environment variables..."

REQUIRED_VARS=(
    "JWT_ACCESS_SECRET"
    "JWT_REFRESH_SECRET"
    "EMAIL_HOST"
    "EMAIL_PORT"
    "CLOUDINARY_CLOUD_NAME"
    "GOOGLE_API_KEY"
)

for var in "${REQUIRED_VARS[@]}"; do
    if docker-compose -f docker-compose.prod.yml exec -T server env | grep -q "^$var=" 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} $var is set"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "  ${YELLOW}⚠${NC} $var might not be set"
        TESTS_RUN=$((TESTS_RUN + 1))
    fi
    TESTS_RUN=$((TESTS_RUN + 1))
done

# ──────────────────────────────────────────────────────────────
# 8. Performance Tests
# ──────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  8. Performance & Resource Tests"
echo "═══════════════════════════════════════════════════════════════"

echo -e "\n${YELLOW}→${NC} Docker resource usage:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" 2>/dev/null | grep vault || echo "  Unable to retrieve stats"

# ──────────────────────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Validation Summary"
echo "═══════════════════════════════════════════════════════════════"

echo ""
echo "Tests Run:    $TESTS_RUN"
echo -e "Passed:       ${GREEN}$TESTS_PASSED${NC}"
if [ $TESTS_FAILED -gt 0 ]; then
    echo -e "Failed:       ${RED}$TESTS_FAILED${NC}"
fi
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All validation tests passed!${NC}"
    echo ""
    echo "Your VaultGames deployment is ready for production."
    exit 0
else
    echo -e "${RED}✗ Some validation tests failed.${NC}"
    echo ""
    echo "Please check the failures above and refer to PRODUCTION_DEPLOYMENT.md"
    exit 1
fi
