#!/bin/bash
# Comprehensive health check for all services

echo "🏥 Running health checks..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Backend health
echo -n "Backend API: "
if curl -s http://localhost:3000/api/health | jq . > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Healthy${NC}"
    curl -s http://localhost:3000/api/health | jq .
else
    echo -e "${RED}✗ Unhealthy${NC}"
fi

echo ""

# Frontend health
echo -n "Frontend: "
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001 | grep -q "200\|304"; then
    echo -e "${GREEN}✓ Healthy${NC}"
else
    echo -e "${RED}✗ Unhealthy${NC}"
fi

echo ""

# Database health
echo -n "Database: "
if cd /home/user/projects/quattrex/backend && bun run src/scripts/test-db.ts 2>/dev/null; then
    echo -e "${GREEN}✓ Connected${NC}"
else
    echo -e "${RED}✗ Connection failed${NC}"
fi

echo ""

# Check background services
echo "Background Services:"
if [ -f /tmp/backend.log ]; then
    if grep -q "PayoutMonitorService.*started" /tmp/backend.log; then
        echo -e "  PayoutMonitorService: ${GREEN}✓ Running${NC}"
    else
        echo -e "  PayoutMonitorService: ${RED}✗ Not running${NC}"
    fi
    
    if grep -q "PayoutExpiryService.*started" /tmp/backend.log; then
        echo -e "  PayoutExpiryService: ${GREEN}✓ Running${NC}"
    else
        echo -e "  PayoutExpiryService: ${RED}✗ Not running${NC}"
    fi
fi

echo ""

# Port status
echo "Port Status:"
if lsof -i:3000 > /dev/null 2>&1; then
    echo -e "  Port 3000 (Backend): ${GREEN}✓ In use${NC}"
else
    echo -e "  Port 3000 (Backend): ${RED}✗ Free${NC}"
fi

if lsof -i:3001 > /dev/null 2>&1; then
    echo -e "  Port 3001 (Frontend): ${GREEN}✓ In use${NC}"
else
    echo -e "  Port 3001 (Frontend): ${RED}✗ Free${NC}"
fi