#!/bin/bash
# Test script to verify deployment configuration

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}         Deployment Configuration Test Script           ${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -n "Testing: $test_name... "
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASSED${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Function to check file
check_file() {
    local file="$1"
    local description="$2"
    
    run_test "$description" "[ -f '$file' ]"
}

# Function to check executable
check_executable() {
    local file="$1"
    local description="$2"
    
    run_test "$description" "[ -x '$file' ]"
}

echo -e "${YELLOW}1. Checking deployment scripts...${NC}"
check_file "deploy-neon.sh" "Main deployment script exists"
check_executable "deploy-neon.sh" "Main deployment script is executable"
check_file "backend/scripts/docker-entrypoint-neon.sh" "Neon entrypoint exists"
check_executable "backend/scripts/docker-entrypoint-neon.sh" "Neon entrypoint is executable"
check_file "backend/scripts/migrate-neon-direct.sh" "Direct migration script exists"
check_executable "backend/scripts/migrate-neon-direct.sh" "Direct migration script is executable"
echo ""

echo -e "${YELLOW}2. Checking Docker configuration...${NC}"
check_file "docker-compose.prod.yml" "Production docker-compose exists"
check_file "backend/Dockerfile" "Backend Dockerfile exists"
check_file "frontend/Dockerfile" "Frontend Dockerfile exists"
check_file "nginx/Dockerfile" "Nginx Dockerfile exists"

# Check if Dockerfile uses correct entrypoint
echo -n "Testing: Backend uses Neon entrypoint... "
if grep -q "docker-entrypoint-neon.sh" backend/Dockerfile; then
    echo -e "${GREEN}✓ PASSED${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ FAILED${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

echo -e "${YELLOW}3. Checking environment configuration...${NC}"
check_file ".env" ".env file exists"

# Check for Neon-specific config if using Neon
echo -n "Testing: Neon config if using Neon database... "
if grep -q "neon\.tech" .env 2>/dev/null; then
    if grep -q "PRISMA_MIGRATE_SKIP_ADVISORY_LOCK" .env 2>/dev/null; then
        echo -e "${GREEN}✓ PASSED${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${YELLOW}⚠ WARNING: Using Neon but missing PRISMA_MIGRATE_SKIP_ADVISORY_LOCK${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
else
    echo -e "${GREEN}✓ N/A (not using Neon)${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi
echo ""

echo -e "${YELLOW}4. Checking GitHub Actions workflow...${NC}"
check_file ".github/workflows/deploy.yml" "Deploy workflow exists"

# Check workflow improvements
echo -n "Testing: Workflow has improved migration monitoring... "
if grep -q "STARTING APPLICATION" .github/workflows/deploy.yml 2>/dev/null; then
    echo -e "${GREEN}✓ PASSED${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ FAILED${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo -n "Testing: Workflow has better error detection... "
if grep -q "All migration strategies failed" .github/workflows/deploy.yml 2>/dev/null; then
    echo -e "${GREEN}✓ PASSED${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ FAILED${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

echo -e "${YELLOW}5. Checking Prisma configuration...${NC}"
check_file "backend/prisma/schema.prisma" "Prisma schema exists"
check_file "backend/package.json" "Backend package.json exists"

# Check for migrations directory
echo -n "Testing: Migrations directory exists... "
if [ -d "backend/prisma/migrations" ]; then
    echo -e "${GREEN}✓ PASSED${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    
    # Count migrations
    migration_count=$(ls -1 backend/prisma/migrations | grep -E "^[0-9]{8}" | wc -l)
    echo "  Found $migration_count migrations"
else
    echo -e "${RED}✗ FAILED${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

echo -e "${YELLOW}6. Testing Docker commands (dry run)...${NC}"

# Test docker compose config
echo -n "Testing: Docker compose config is valid... "
if docker compose -f docker-compose.prod.yml config > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASSED${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ FAILED${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

echo -e "${YELLOW}7. Checking for common issues...${NC}"

# Check for hardcoded database URLs
echo -n "Testing: No hardcoded DATABASE_URLs in code... "
if grep -r "postgresql://.*@.*neon\.tech" backend/src --include="*.ts" --include="*.js" 2>/dev/null | grep -v "example\|test"; then
    echo -e "${RED}✗ FAILED (found hardcoded URLs)${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
else
    echo -e "${GREEN}✓ PASSED${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi

# Check for proper env variable usage
echo -n "Testing: Backend uses DATABASE_URL from env... "
if grep -q "process\.env\.DATABASE_URL\|env(\"DATABASE_URL\")" backend/prisma/schema.prisma; then
    echo -e "${GREEN}✓ PASSED${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ FAILED${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# Summary
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                    TEST SUMMARY                        ${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed! Deployment configuration is ready.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Ensure your .env file has correct values"
    echo "2. Run: ./deploy-neon.sh"
    echo "3. Or for GitHub Actions: git push to main branch"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please fix the issues above.${NC}"
    echo ""
    echo "Common fixes:"
    echo "- Run: chmod +x *.sh backend/scripts/*.sh"
    echo "- Ensure all required files exist"
    echo "- Check your .env configuration"
    exit 1
fi