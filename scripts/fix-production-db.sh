#!/bin/bash

# Script to fix production database schema issues
echo "🔧 Fixing production database schema..."

# Navigate to backend directory
cd /home/user/projects/quattrex/backend

# Set production environment variables
export NODE_ENV=production

# First, ensure we have the latest schema
echo "📋 Current database URL (hidden): ${DATABASE_URL:0:30}..."

# Generate Prisma client
echo "🔨 Generating Prisma client..."
bunx prisma generate

# Push database schema with accept-data-loss flag
echo "🚀 Pushing database schema to production..."
bunx prisma db push --accept-data-loss

# Run the service initialization script
echo "🔧 Initializing service records..."
bun run scripts/init-all-services.ts

echo "✅ Production database schema fixed!"