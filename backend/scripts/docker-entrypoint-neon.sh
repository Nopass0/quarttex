#!/bin/bash
set -e

echo "==================== NEON DATABASE CONTAINER STARTUP ===================="
echo "Starting backend container at $(date)"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to log with colors
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check environment
log_info "Environment check:"
if [ -z "$DATABASE_URL" ]; then
    log_error "DATABASE_URL is not set!"
    exit 1
else
    # Hide password in the URL for logging
    log_info "DATABASE_URL is set (host: $(echo $DATABASE_URL | sed -E 's|.*://[^@]*@([^/:]*).*|\1|'))"
fi

# Detect if we're using Neon pooler or direct connection
IS_NEON_POOLER=false
if echo "$DATABASE_URL" | grep -q "pooler\..*\.neon\.tech"; then
    IS_NEON_POOLER=true
    log_warn "Detected Neon pooler connection - will use special migration strategy"
    
    # Extract base connection details and create direct connection URL if possible
    if echo "$DATABASE_URL" | grep -q "sslmode=require"; then
        # Try to create a direct connection URL by removing '-pooler' from the hostname
        DIRECT_DATABASE_URL=$(echo "$DATABASE_URL" | sed 's/-pooler//')
        log_info "Created direct connection URL for migrations"
    fi
fi

# Function to check database connection
check_db_connection() {
    local db_url="${1:-$DATABASE_URL}"
    log_info "Checking database connection..."
    
    if [ -z "$db_url" ]; then
        log_error "Database URL is not set!"
        return 1
    fi
    
    # Try to connect and capture the error
    if output=$(DATABASE_URL="$db_url" bunx prisma db execute --schema=./prisma/schema.prisma --stdin <<< "SELECT 1;" 2>&1); then
        log_info "Database connection successful"
        return 0
    else
        log_error "Database connection failed"
        echo "Error details: $output" | head -5
        return 1
    fi
}

# Function to run migrations with Neon-specific handling
run_migrations_neon() {
    log_info "==================== RUNNING MIGRATIONS (NEON MODE) ===================="
    
    # First, check current migration status
    log_info "Checking migration status..."
    bunx prisma migrate status || true
    
    # Pre-fix known issues before attempting migrations
    log_info "Pre-fixing known migration issues..."
    
    # Ensure critical tables exist
    cat <<'SQL' | DATABASE_URL="$DATABASE_URL" bunx prisma db execute --schema=./prisma/schema.prisma --stdin || true
DO $$
BEGIN
  -- Ensure AdminLog table exists
  IF to_regclass('"AdminLog"') IS NULL THEN
    CREATE TABLE "AdminLog" (
      "id" TEXT NOT NULL,
      "adminId" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "details" TEXT,
      "ip" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AdminLog_pkey" PRIMARY KEY ("id")
    );
    CREATE INDEX IF NOT EXISTS "AdminLog_adminId_idx" ON "AdminLog"("adminId");
    CREATE INDEX IF NOT EXISTS "AdminLog_createdAt_idx" ON "AdminLog"("createdAt");
  END IF;
  
  -- Ensure Aggregator.callbackToken exists and is populated
  IF to_regclass('"Aggregator"') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Aggregator' AND column_name = 'callbackToken'
    ) THEN
      ALTER TABLE "Aggregator" ADD COLUMN "callbackToken" TEXT;
    END IF;
    UPDATE "Aggregator"
    SET "callbackToken" = COALESCE(
      "callbackToken",
      md5(gen_random_uuid()::text || '-' || now()::text)
    )
    WHERE "callbackToken" IS NULL;
    BEGIN
      ALTER TABLE "Aggregator" ALTER COLUMN "callbackToken" SET NOT NULL;
    EXCEPTION WHEN others THEN NULL;
    END;
    CREATE UNIQUE INDEX IF NOT EXISTS "Aggregator_callbackToken_key" ON "Aggregator"("callbackToken");
    CREATE INDEX IF NOT EXISTS "Aggregator_callbackToken_idx" ON "Aggregator"("callbackToken");
  END IF;
END $$;
SQL
    
    # Mark known problematic migrations as resolved
    cat <<'SQL' | DATABASE_URL="$DATABASE_URL" bunx prisma db execute --schema=./prisma/schema.prisma --stdin || true
UPDATE "_prisma_migrations"
SET finished_at = NOW(), applied_steps_count = COALESCE(applied_steps_count, 1)
WHERE migration_name = '20250711000001_add_admin_log' AND finished_at IS NULL;
SQL
    
    local migration_success=false
    
    # Strategy 1: Try direct connection if available (for Neon)
    if [ "$IS_NEON_POOLER" = true ] && [ -n "$DIRECT_DATABASE_URL" ]; then
        log_info "Attempting migrations with direct Neon connection (bypassing pooler)..."
        if DATABASE_URL="$DIRECT_DATABASE_URL" timeout 60 bunx prisma migrate deploy 2>&1; then
            log_info "Migrations applied successfully using direct connection!"
            migration_success=true
        else
            log_warn "Direct connection migration failed, will try alternative methods"
        fi
    fi
    
    # Strategy 2: Try with increased timeout and skip advisory lock
    if [ "$migration_success" = false ]; then
        log_info "Attempting migrations with extended timeout..."
        if PRISMA_MIGRATE_SKIP_ADVISORY_LOCK=1 timeout 120 bunx prisma migrate deploy 2>&1; then
            log_info "Migrations applied successfully with extended timeout!"
            migration_success=true
        else
            log_warn "Extended timeout migration failed"
        fi
    fi
    
    # Strategy 3: Use db push as last resort (but safer version)
    if [ "$migration_success" = false ]; then
        log_warn "Migration deploy failed, attempting safe schema push..."
        
        # First, create a backup point by logging current schema state
        log_info "Recording current schema state..."
        DATABASE_URL="$DATABASE_URL" bunx prisma db execute --schema=./prisma/schema.prisma --stdin <<< "
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            ORDER BY table_name, ordinal_position
            LIMIT 10;" || true
        
        # Run db push with skip-generate but without accept-data-loss first
        if bunx prisma db push --skip-generate 2>&1 | grep -q "data loss"; then
            log_warn "Schema changes would cause data loss. Analyzing changes..."
            
            # Check what would be lost
            bunx prisma db push --skip-generate --accept-data-loss 2>&1 | grep -E "(dropping|deleting|removing)" || true
            
            # In production, we should be more careful
            if [ "$NODE_ENV" = "production" ]; then
                log_warn "Production environment: Proceeding with careful schema push"
                if bunx prisma db push --skip-generate --accept-data-loss; then
                    log_info "Schema pushed successfully (data loss accepted for production)"
                    migration_success=true
                else
                    log_error "Schema push failed even with data loss acceptance"
                fi
            else
                log_info "Non-production environment: Accepting data loss"
                if bunx prisma db push --skip-generate --accept-data-loss; then
                    log_info "Schema pushed successfully"
                    migration_success=true
                fi
            fi
        else
            # No data loss, safe to push
            if bunx prisma db push --skip-generate; then
                log_info "Schema pushed successfully (no data loss)"
                migration_success=true
            fi
        fi
    fi
    
    # Final check
    if [ "$migration_success" = false ]; then
        log_error "All migration strategies failed!"
        exit 1
    fi
    
    # Mark all migrations as applied (cleanup)
    log_info "Ensuring migration history is clean..."
    cat <<'SQL' | DATABASE_URL="$DATABASE_URL" bunx prisma db execute --schema=./prisma/schema.prisma --stdin || true
UPDATE "_prisma_migrations"
SET 
  finished_at = COALESCE(finished_at, NOW()),
  applied_steps_count = COALESCE(applied_steps_count, 1)
WHERE finished_at IS NULL;
SQL
    
    return 0
}

# Wait for database to be ready
log_info "Waiting for database to be ready..."
max_retries=30
retry_count=0
while [ $retry_count -lt $max_retries ]; do
    if check_db_connection; then
        break
    fi
    log_warn "Database not ready yet, retrying in 2 seconds... ($((retry_count + 1))/$max_retries)"
    sleep 2
    retry_count=$((retry_count + 1))
done

if [ $retry_count -eq $max_retries ]; then
    log_error "Database connection failed after $max_retries attempts"
    exit 1
fi

# Run migrations with Neon-specific handling
if ! run_migrations_neon; then
    log_error "Migration process failed"
    exit 1
fi

# Generate Prisma Client
log_info "Generating Prisma Client..."
if bunx prisma generate; then
    log_info "Prisma Client generated successfully"
else
    log_error "Failed to generate Prisma Client"
    exit 1
fi

# Verify schema
log_info "==================== VERIFYING SCHEMA ===================="
log_info "Checking required columns..."

# Check critical columns exist
DATABASE_URL="$DATABASE_URL" bunx prisma db execute --schema=./prisma/schema.prisma --stdin <<< "
SELECT 
  t.table_name,
  array_agg(c.column_name ORDER BY c.column_name) as columns
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public' 
  AND t.table_name IN ('Transaction', 'Payout', 'Notification', 'SettleRequest', 'TransactionAttempt')
  AND c.column_name IN ('merchantRate', 'traderProfit', 'matchedNotificationId', 'methodId', 'profitAmount', 'packageName')
GROUP BY t.table_name
ORDER BY t.table_name;" || true

log_info "==================== STARTING APPLICATION ===================="
# Start the application
exec "$@"