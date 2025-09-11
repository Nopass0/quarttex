#!/bin/bash
set -e

echo "=== QUATTREX Deployment Script ==="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed!"
    echo "Please run: bash scripts/install-docker.sh"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "ERROR: .env file not found!"
    echo "Please create .env file with required variables:"
    echo "  DATABASE_URL=postgresql://user:pass@localhost:5432/quattrex_db"
    echo "  JWT_SECRET=your-secret-key"
    echo "  SUPER_ADMIN_KEY=your-admin-key"
    echo "  ADMIN_IPS=127.0.0.1,your.ip.here"
    exit 1
fi

# Ensure SSL certificates are ready
echo "Checking SSL certificates..."
if [ -f "ssl/ensure-fullchain.sh" ]; then
    bash ssl/ensure-fullchain.sh
    if [ $? -ne 0 ]; then
        echo "ERROR: SSL certificate setup failed!"
        exit 1
    fi
else
    echo "WARNING: SSL certificate script not found, skipping SSL check"
fi

# Stop existing containers
echo "Stopping existing containers..."
docker compose -f docker-compose.prod.yml down || true

# Build and start containers
echo "Building containers..."
docker compose -f docker-compose.prod.yml build --no-cache

echo "Starting containers..."
docker compose -f docker-compose.prod.yml up -d

# Wait for backend to be ready
echo "Waiting for backend to be ready..."
sleep 30

# Check container status
echo "Container status:"
docker compose -f docker-compose.prod.yml ps

# Show logs
echo "Backend logs:"
docker compose -f docker-compose.prod.yml logs backend --tail=50

echo "=== Deployment completed ==="
echo "Access the application at: http://your-server-ip"
echo "Or if you have SSL configured: https://quattrex.pro"