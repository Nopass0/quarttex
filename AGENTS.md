# AI Agents Development Guide

## Overview
This guide provides instructions for AI agents working on the Quattrex P2P payment platform project. It ensures consistent development practices, proper testing, and system stability.

## Project Structure
```
/home/user/projects/quattrex/
├── backend/          # Bun + Elysia backend
├── frontend/         # Next.js frontend  
├── .gpt/            # AI agent helper scripts
├── CLAUDE.md        # Project-specific instructions
└── AGENTS.md        # This file
```

## Working Principles

### 1. Always Test Changes
- Before making changes, ensure the project is running without errors
- After making changes, verify both backend and frontend compile and run correctly
- Use the helper scripts in `.gpt/` directory for testing

### 2. Development Workflow

#### Starting Development
```bash
# 1. Check current status
./.gpt/check-status.sh

# 2. Start services in background
./.gpt/start-services.sh

# 3. Verify services are running
./.gpt/health-check.sh
```

#### Making Changes
1. **Backend Changes**:
   - Always run `bun test` after modifications
   - Check for TypeScript errors: `cd backend && bun run typecheck`
   - Ensure Prisma schema is valid: `cd backend && npx prisma validate`

2. **Frontend Changes**:
   - Verify build: `cd frontend && npm run build`
   - Check for TypeScript errors: `cd frontend && npm run type-check`
   - Test affected pages by making HTTP requests

3. **Database Changes**:
   - Generate migrations: `cd backend && npx prisma migrate dev`
   - Update Prisma client: `cd backend && npx prisma generate`

#### Testing Changes
```bash
# Run comprehensive tests
./.gpt/run-tests.sh

# Test specific endpoints
./.gpt/test-endpoint.sh GET /api/health
./.gpt/test-endpoint.sh POST /api/merchant/payouts '{"amount": 1000}'

# Check frontend pages
./.gpt/test-frontend-page.sh /admin/payouts
```

### 3. Error Handling
- If backend fails to start, check logs: `tail -n 100 /tmp/backend.log`
- If frontend fails to build, check for import errors and missing dependencies
- Always fix errors before committing changes

### 4. Service Management

#### Background Services
The project runs several background services:
- PayoutMonitorService - Monitors and distributes unassigned payouts
- PayoutExpiryService - Handles expired payouts
- DeviceHealthService - Monitors device health
- NotificationService - Handles push notifications

#### Commands
```bash
# Start all services
./.gpt/start-services.sh

# Stop all services  
./.gpt/stop-services.sh

# Restart services (useful after backend changes)
./.gpt/restart-services.sh

# Check service status
./.gpt/check-status.sh
```

### 5. Testing Endpoints

#### Health Checks
```bash
# Backend health
curl http://localhost:3000/api/health

# Frontend health  
curl http://localhost:3001/
```

#### API Testing
```bash
# Test merchant API
./.gpt/test-merchant-api.sh

# Test trader API
./.gpt/test-trader-api.sh

# Test admin API
./.gpt/test-admin-api.sh
```

### 6. Database Management
```bash
# Reset database to clean state
./.gpt/reset-database.sh

# Backup current database
./.gpt/backup-database.sh

# Restore database
./.gpt/restore-database.sh backup-file.sql
```

## Important Rules

1. **Never break the build**: Always ensure both backend and frontend compile successfully
2. **Test before committing**: Run the test suite before finalizing changes
3. **Handle errors gracefully**: If something fails, restore to working state
4. **Document changes**: Update CLAUDE.md if adding new patterns or commands
5. **Use helper scripts**: Leverage `.gpt/` scripts for consistent operations

## Helper Scripts Location
All AI agent helper scripts are located in:
```
/home/user/projects/quattrex/.gpt/
```

## Setup Instructions
For setting up a new development environment, run:
```bash
chmod +x setup-dev-environment.sh
./setup-dev-environment.sh
```

This will:
1. Install PostgreSQL
2. Create development database
3. Generate .env files
4. Install dependencies
5. Run initial migrations
6. Seed test data

## Debugging Tips

1. **Backend Issues**:
   ```bash
   # Check logs
   tail -f /tmp/backend.log
   
   # Test database connection
   ./.gpt/test-db-connection.sh
   ```

2. **Frontend Issues**:
   ```bash
   # Check build errors
   cd frontend && npm run build
   
   # Check for missing imports
   ./.gpt/check-imports.sh
   ```

3. **Service Issues**:
   ```bash
   # Check service health
   ./.gpt/check-services-health.sh
   
   # View service logs
   ./.gpt/view-service-logs.sh PayoutMonitorService
   ```

## Emergency Recovery
If the project is in a broken state:
```bash
# Stop all services
./.gpt/stop-services.sh

# Reset to last known good state
./.gpt/emergency-recovery.sh

# Restart services
./.gpt/start-services.sh
```