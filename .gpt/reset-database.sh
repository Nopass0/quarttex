#!/bin/bash
# Reset database to clean state

echo "🔄 Resetting database..."
echo "⚠️  This will delete all data! Press Ctrl+C to cancel."
sleep 3

cd /home/user/projects/quattrex/backend

# Drop all tables
echo "Dropping existing schema..."
npx prisma migrate reset --force --skip-seed

# Run migrations
echo "Running migrations..."
npx prisma migrate deploy

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Seed data
echo "Seeding initial data..."
if [ -f "seed.ts" ]; then
    bun run seed.ts
fi

echo "✅ Database reset complete"