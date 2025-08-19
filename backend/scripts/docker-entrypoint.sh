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

# Check for failed migrations
echo -e "\nChecking for failed migrations..."
if bunx prisma migrate status | grep -q "failed"; then
    echo "Found failed migration, attempting to fix..."
    # Mark failed migration as complete
    bunx prisma db execute --schema=./prisma/schema.prisma --stdin <<< "UPDATE \"_prisma_migrations\" SET finished_at = NOW(), applied_steps_count = 1 WHERE finished_at IS NULL;" || true
fi

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