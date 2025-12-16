#!/bin/bash
# Health check script for production deployment
# Can be used with monitoring tools like Nagios, Datadog, etc.

set -e

# Configuration
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
BACKEND_URL="${BACKEND_URL:-http://localhost:3001}"
TIMEOUT=10

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Counters
PASSED=0
FAILED=0

check_service() {
    local name="$1"
    local url="$2"
    local expected_status="${3:-200}"
    
    echo -n "Checking $name... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$url" || echo "000")
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✓ OK${NC} (HTTP $response)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (HTTP $response)"
        ((FAILED++))
        return 1
    fi
}

check_json_endpoint() {
    local name="$1"
    local url="$2"
    local json_key="$3"
    
    echo -n "Checking $name... "
    
    response=$(curl -s --max-time $TIMEOUT "$url" || echo "{}")
    
    if echo "$response" | jq -e ".$json_key" > /dev/null 2>&1; then
        value=$(echo "$response" | jq -r ".$json_key")
        echo -e "${GREEN}✓ OK${NC} ($json_key: $value)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (missing $json_key)"
        ((FAILED++))
        return 1
    fi
}

check_database() {
    echo -n "Checking database... "
    
    if docker ps | grep -q cnc-postgres; then
        if docker exec cnc-postgres pg_isready -U postgres > /dev/null 2>&1; then
            echo -e "${GREEN}✓ OK${NC}"
            ((PASSED++))
            return 0
        fi
    fi
    
    echo -e "${RED}✗ FAILED${NC}"
    ((FAILED++))
    return 1
}

check_docker_containers() {
    echo -n "Checking Docker containers... "
    
    local required_containers=("cnc-frontend" "cnc-backend" "cnc-postgres")
    local running=0
    
    for container in "${required_containers[@]}"; do
        if docker ps | grep -q "$container"; then
            ((running++))
        fi
    done
    
    if [ $running -eq ${#required_containers[@]} ]; then
        echo -e "${GREEN}✓ OK${NC} ($running/${#required_containers[@]} running)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} ($running/${#required_containers[@]} running)"
        ((FAILED++))
        return 1
    fi
}

echo "========================================="
echo "   CNC Simulator Health Check"
echo "========================================="
echo ""

# Frontend checks
echo "Frontend checks:"
check_service "Frontend homepage" "$FRONTEND_URL/front.html"
check_service "Service worker" "$FRONTEND_URL/service-worker.js"
check_service "PWA manifest" "$FRONTEND_URL/manifest.json"
echo ""

# Backend checks
echo "Backend checks:"
check_service "Backend health" "$BACKEND_URL/health"
check_json_endpoint "Backend API status" "$BACKEND_URL/api/status" "status"
echo ""

# Infrastructure checks (if using Docker)
if command -v docker &> /dev/null; then
    echo "Infrastructure checks:"
    check_docker_containers
    check_database
    echo ""
fi

# Summary
echo "========================================="
echo "Summary:"
echo -e "  ${GREEN}Passed:${NC} $PASSED"
echo -e "  ${RED}Failed:${NC} $FAILED"
echo "========================================="

# Exit with error if any checks failed
if [ $FAILED -gt 0 ]; then
    exit 1
fi

exit 0
