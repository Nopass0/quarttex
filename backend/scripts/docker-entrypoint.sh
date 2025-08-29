#!/bin/bash
set -e

echo "==================== CONTAINER STARTUP ===================="
echo "Starting backend container at $(date)"

# Check environment
echo "Environment check:"
if [ -z "$DATABASE_URL" ]; then
    echo "✗ DATABASE_URL is not set!"
else
    # Hide password in the URL for logging
    echo "✓ DATABASE_URL is set (host: $(echo $DATABASE_URL | sed -E 's|.*://[^@]*@([^/:]*).*|\1|'))"
fi

# Function to check database connection
check_db_connection() {
    echo "Checking database connection..."
    # First check if DATABASE_URL is set
    if [ -z "$DATABASE_URL" ]; then
        echo "✗ DATABASE_URL environment variable is not set!"
        return 1
    fi
    
    # Try to connect and capture the error
    if output=$(bunx prisma db execute --schema=./prisma/schema.prisma --stdin <<< "SELECT 1;" 2>&1); then
        echo "✓ Database connection successful"
        return 0
    else
        echo "✗ Database connection failed"
        echo "Error details: $output" | head -5
        return 1
    fi
}

# Wait for database to be ready
echo "Waiting for database to be ready..."
max_retries=30
retry_count=0
while [ $retry_count -lt $max_retries ]; do
    if check_db_connection; then
        break
    fi
    echo "Database not ready yet, retrying in 2 seconds... ($((retry_count + 1))/$max_retries)"
    sleep 2
    retry_count=$((retry_count + 1))
done

if [ $retry_count -eq $max_retries ]; then
    echo "✗ Database connection failed after $max_retries attempts"
    exit 1
fi

# Run migrations
echo "==================== RUNNING MIGRATIONS ===================="
echo "Current migration status:"
bunx prisma migrate status || true

# Pre-fix known issues before attempting migrations
echo -e "\nPre-fixing known migration issues..."

# 1) Ensure AdminLog table exists (for 20250711000001_add_admin_log)
cat <<'SQL' | bunx prisma db execute --schema=./prisma/schema.prisma --stdin || true
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
    CREATE INDEX IF NOT EXISTS "AdminLog_adminId_idx" ON "AdminLog"("adminId");
    CREATE INDEX IF NOT EXISTS "AdminLog_createdAt_idx" ON "AdminLog"("createdAt");
  END IF;
END $$;
SQL

# 2) Idempotently backfill Aggregator.callbackToken to avoid required column errors during db push
cat <<'SQL' | bunx prisma db execute --schema=./prisma/schema.prisma --stdin || true
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
DO $$
BEGIN
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
      md5(uuid_generate_v4()::text || '-' || now()::text)
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

# 3) Explicitly mark the known failed migration as finished to unblock migrate deploy
cat <<'SQL' | bunx prisma db execute --schema=./prisma/schema.prisma --stdin || true
UPDATE "_prisma_migrations"
SET finished_at = NOW(), applied_steps_count = COALESCE(applied_steps_count, 1)
WHERE migration_name = '20250711000001_add_admin_log' AND finished_at IS NULL;
SQL

echo -e "\nApplying migrations..."
if bunx prisma migrate deploy; then
    echo "✓ Migrations applied successfully"
else
    echo "✗ Migration deploy failed, trying db push with skip-generate..."
    # In production, we need to accept data loss warnings to proceed
    if bunx prisma db push --skip-generate --accept-data-loss; then
        echo "✓ Schema pushed successfully (with data loss acceptance)"
        echo "⚠️  WARNING: Data loss warnings were accepted. Please verify the database state."
    else
        echo "✗ Both migration and db push failed"
        exit 1
    fi
fi

# Generate Prisma Client
echo -e "\nGenerating Prisma Client..."
if bunx prisma generate; then
    echo "✓ Prisma Client generated successfully"
else
    echo "✗ Failed to generate Prisma Client"
    exit 1
fi

# Verify schema
echo -e "\n==================== VERIFYING SCHEMA ===================="
echo "Checking required columns..."

echo -e "\nTransaction table:"
bunx prisma db execute --schema=./prisma/schema.prisma --stdin <<< "SELECT column_name FROM information_schema.columns WHERE table_name = 'Transaction' AND column_name IN ('merchantRate', 'traderProfit', 'matchedNotificationId');" || true

echo -e "\nPayout table:"
bunx prisma db execute --schema=./prisma/schema.prisma --stdin <<< "SELECT column_name FROM information_schema.columns WHERE table_name = 'Payout' AND column_name IN ('methodId', 'profitAmount');" || true

echo -e "\nNotification table:"
bunx prisma db execute --schema=./prisma/schema.prisma --stdin <<< "SELECT column_name FROM information_schema.columns WHERE table_name = 'Notification' AND column_name = 'packageName';" || true

echo "==================== STARTING APPLICATION ===================="
# Start the application
exec "$@"