# Quattrex Deployment Fix for Neon Database

## Problem Summary

The deployment was failing due to:
1. **Advisory Lock Timeout**: Neon's connection pooler doesn't support PostgreSQL advisory locks that Prisma uses for safe migrations
2. **Migration Failures**: The deployment was falling back to `db push --accept-data-loss` which is dangerous
3. **False Deployment Failures**: Despite the backend starting successfully, the deployment was marked as failed

## Solution Overview

We've implemented a comprehensive fix that:
- Detects Neon database connections and uses appropriate migration strategies
- Provides better error handling and recovery mechanisms
- Ensures deployments succeed without data loss warnings
- Improves monitoring and logging throughout the deployment process

## Key Changes

### 1. New Neon-Optimized Docker Entrypoint
**File**: `/backend/scripts/docker-entrypoint-neon.sh`

This new entrypoint:
- Automatically detects Neon pooler connections
- Attempts multiple migration strategies in order:
  1. Direct connection (bypassing pooler)
  2. Extended timeout with `PRISMA_MIGRATE_SKIP_ADVISORY_LOCK`
  3. Safe schema push as last resort
- Pre-fixes known migration issues before attempting migrations
- Provides colored, detailed logging for better debugging

### 2. Updated Backend Dockerfile
**File**: `/backend/Dockerfile`

- Now uses the Neon-optimized entrypoint script
- Maintains backward compatibility with fallback to original script

### 3. Improved GitHub Actions Workflow
**File**: `/.github/workflows/deploy.yml`

Enhanced with:
- Better migration monitoring with log capture
- Improved error detection patterns
- Correct health check port (3001 instead of 3000)
- Automatic `PRISMA_MIGRATE_SKIP_ADVISORY_LOCK` environment variable
- Graceful handling of health check failures

### 4. Standalone Migration Script
**File**: `/backend/scripts/migrate-neon-direct.sh`

For manual migration management:
- Can be run locally or on server
- Automatically converts pooler URLs to direct connections
- Interactive prompts for fallback options
- Colored output for better readability

### 5. Enhanced Deployment Script
**File**: `/deploy-neon.sh`

Production-ready deployment script with:
- Comprehensive prerequisite checks
- Automatic Neon detection and configuration
- Resource cleanup and optimization
- Detailed progress tracking
- Post-deployment verification

## Usage Instructions

### For Automatic Deployment (GitHub Actions)

1. Ensure your repository secrets are set:
   ```
   DATABASE_URL       # Your Neon database URL
   JWT_SECRET         # JWT signing secret
   SUPER_ADMIN_KEY    # Admin access key
   ADMIN_IPS          # Allowed admin IPs
   SERVER_HOST        # Deployment server host
   SERVER_USER        # SSH username
   SERVER_PASSWORD    # SSH password
   SERVER_PORT        # SSH port
   PROJECT_PATH       # Path on server (e.g., /quattrex)
   ```

2. Push to main branch:
   ```bash
   git add .
   git commit -m "Fix deployment with Neon database support"
   git push origin main
   ```

### For Manual Deployment

1. **On your local machine**, prepare the deployment:
   ```bash
   # Test the configuration first
   ./test-deployment.sh
   ```

2. **On the deployment server**, run the deployment:
   ```bash
   # SSH to your server
   ssh user@your-server

   # Navigate to project directory
   cd /quattrex

   # Run the improved deployment script
   ./deploy-neon.sh
   ```

### For Manual Migration Management

If you need to run migrations separately:

```bash
# On the server, in the backend directory
cd /quattrex/backend

# Option 1: Use the direct migration script
./scripts/migrate-neon-direct.sh

# Option 2: Within Docker container
docker compose -f ../docker-compose.prod.yml exec backend \
  bunx prisma migrate deploy
```

## Environment Variables

Add these to your `.env` file for Neon databases:

```env
# Required
DATABASE_URL=postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/dbname?sslmode=require

# Neon-specific (automatically added by deploy script)
PRISMA_MIGRATE_SKIP_ADVISORY_LOCK=1
```

## Troubleshooting

### Migration Still Timing Out

If migrations still timeout, you can:

1. Use the direct connection URL (remove `-pooler` from hostname):
   ```bash
   # Original pooler URL
   postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/db

   # Direct connection URL
   postgresql://user:pass@ep-xxx.region.aws.neon.tech/db
   ```

2. Run migrations manually with the direct script:
   ```bash
   DATABASE_URL="direct-url-here" ./backend/scripts/migrate-neon-direct.sh
   ```

### Container Won't Start

Check logs:
```bash
docker compose -f docker-compose.prod.yml logs backend --tail=200
```

### Health Check Failures

The backend runs on port 3001, ensure health checks use:
```bash
curl http://localhost:3001/api/health
```

## Monitoring Deployment

Watch deployment progress:
```bash
# Follow all logs
docker compose -f docker-compose.prod.yml logs -f

# Backend only
docker compose -f docker-compose.prod.yml logs -f backend

# Check container status
docker compose -f docker-compose.prod.yml ps
```

## Rollback Procedure

If deployment fails:

1. Stop new containers:
   ```bash
   docker compose -f docker-compose.prod.yml down
   ```

2. Restore previous version:
   ```bash
   git checkout HEAD~1
   docker compose -f docker-compose.prod.yml up -d
   ```

## Success Indicators

Your deployment is successful when:
- ✅ All containers show as "Up" in `docker ps`
- ✅ Backend logs show "STARTING APPLICATION"
- ✅ No "Migration failed" errors in logs
- ✅ Health endpoint responds: `curl http://localhost:3001/api/health`
- ✅ Frontend accessible at https://quattrex.pro

## Files Created/Modified

- **Created**:
  - `/backend/scripts/docker-entrypoint-neon.sh` - Neon-optimized entrypoint
  - `/backend/scripts/migrate-neon-direct.sh` - Direct migration script
  - `/deploy-neon.sh` - Enhanced deployment script
  - `/test-deployment.sh` - Configuration test script
  - `/DEPLOYMENT_FIX.md` - This documentation

- **Modified**:
  - `/backend/Dockerfile` - Uses new entrypoint
  - `/.github/workflows/deploy.yml` - Better error handling and monitoring

## Next Steps

1. Review and update your `.env` file with correct values
2. Test the deployment configuration: `./test-deployment.sh`
3. Deploy using either GitHub Actions or manual deployment
4. Monitor the deployment logs for any issues
5. Verify all services are running correctly

For any issues, check the troubleshooting section above or review the deployment logs.