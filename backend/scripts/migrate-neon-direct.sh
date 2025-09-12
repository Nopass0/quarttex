#!/bin/bash
# Script to run migrations directly on Neon database, bypassing the pooler
# This is useful when the pooler connection doesn't support advisory locks

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_step() {
    echo -e "${BLUE}→${NC} $1"
}

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}           Neon Database Direct Migration Script              ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Check if DATABASE_URL is provided
if [ -z "$1" ] && [ -z "$DATABASE_URL" ]; then
    log_error "No database URL provided!"
    echo ""
    echo "Usage:"
    echo "  $0 <DATABASE_URL>"
    echo "  or"
    echo "  DATABASE_URL=<url> $0"
    echo ""
    echo "For Neon databases, use the direct connection URL (without -pooler in hostname)"
    echo "Example: postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/dbname?sslmode=require"
    exit 1
fi

# Use provided URL or environment variable
DB_URL="${1:-$DATABASE_URL}"

# Check if it's a pooler URL and warn
if echo "$DB_URL" | grep -q "pooler\..*\.neon\.tech"; then
    log_warn "Detected pooler URL. Attempting to create direct connection..."
    DIRECT_URL=$(echo "$DB_URL" | sed 's/-pooler//')
    log_info "Using direct URL: $(echo $DIRECT_URL | sed -E 's|://[^@]*@|://***@|')"
    DB_URL="$DIRECT_URL"
fi

# Export for Prisma
export DATABASE_URL="$DB_URL"

# Function to check connection
check_connection() {
    log_step "Testing database connection..."
    if bunx prisma db execute --stdin <<< "SELECT version();" > /dev/null 2>&1; then
        log_info "Connection successful!"
        return 0
    else
        log_error "Connection failed!"
        return 1
    fi
}

# Function to fix known issues
fix_known_issues() {
    log_step "Fixing known migration issues..."
    
    # Fix AdminLog table
    bunx prisma db execute --stdin <<'SQL' 2>/dev/null || true
DO $$
BEGIN
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
    CREATE INDEX "AdminLog_adminId_idx" ON "AdminLog"("adminId");
    CREATE INDEX "AdminLog_createdAt_idx" ON "AdminLog"("createdAt");
  END IF;
END $$;
SQL
    
    # Fix Aggregator.callbackToken
    bunx prisma db execute --stdin <<'SQL' 2>/dev/null || true
DO $$
BEGIN
  IF to_regclass('"Aggregator"') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = 'Aggregator' 
        AND column_name = 'callbackToken'
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
  END IF;
END $$;
SQL
    
    # Fix stuck migrations
    bunx prisma db execute --stdin <<'SQL' 2>/dev/null || true
UPDATE "_prisma_migrations"
SET finished_at = NOW(), 
    applied_steps_count = COALESCE(applied_steps_count, 1)
WHERE migration_name = '20250711000001_add_admin_log' 
  AND finished_at IS NULL;
SQL
    
    log_info "Known issues fixed"
}

# Function to run migrations
run_migrations() {
    log_step "Checking migration status..."
    
    # Show current status
    bunx prisma migrate status || true
    
    echo ""
    log_step "Applying migrations..."
    
    # Try to run migrations with timeout
    if timeout 120 bunx prisma migrate deploy; then
        log_info "Migrations applied successfully!"
        return 0
    else
        log_error "Migration deploy failed"
        return 1
    fi
}

# Function to verify schema
verify_schema() {
    log_step "Verifying database schema..."
    
    # Check for critical tables
    local tables=$(bunx prisma db execute --stdin <<'SQL' 2>/dev/null || echo "ERROR"
SELECT COUNT(*) as count 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'User', 'Transaction', 'Payout', 
    'Notification', 'Device', 'Card'
  );
SQL
)
    
    if echo "$tables" | grep -q "ERROR"; then
        log_error "Could not verify schema"
        return 1
    else
        log_info "Schema verification complete"
        return 0
    fi
}

# Main execution
main() {
    echo ""
    
    # Step 1: Check connection
    if ! check_connection; then
        log_error "Cannot connect to database. Please check your connection string."
        exit 1
    fi
    
    echo ""
    
    # Step 2: Fix known issues
    fix_known_issues
    
    echo ""
    
    # Step 3: Run migrations
    if ! run_migrations; then
        log_warn "Migration deploy failed. Trying alternative approach..."
        
        # Try with skip advisory lock
        export PRISMA_MIGRATE_SKIP_ADVISORY_LOCK=1
        if ! run_migrations; then
            log_error "All migration attempts failed!"
            
            echo ""
            read -p "Do you want to try 'prisma db push' instead? (y/n) " -n 1 -r
            echo ""
            
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                log_step "Running prisma db push..."
                if bunx prisma db push --skip-generate; then
                    log_info "Schema pushed successfully"
                else
                    log_error "Schema push also failed"
                    exit 1
                fi
            else
                exit 1
            fi
        fi
    fi
    
    echo ""
    
    # Step 4: Generate client
    log_step "Generating Prisma client..."
    if bunx prisma generate; then
        log_info "Prisma client generated"
    else
        log_error "Failed to generate Prisma client"
    fi
    
    echo ""
    
    # Step 5: Verify schema
    verify_schema
    
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}                    Migration Complete!                        ${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

# Run main function
main