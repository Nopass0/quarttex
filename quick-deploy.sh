#!/bin/bash
# Quick deployment script for QUATTREX

echo "=== QUATTREX Quick Deploy ==="

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    sudo systemctl start docker
    sudo systemctl enable docker
    echo "Docker installed. Please log out and back in, then run this script again."
    exit 0
fi

# Check for .env file
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << 'EOF'
DATABASE_URL=postgresql://postgres:password@localhost:5432/quattrex_db
JWT_SECRET=your-super-secret-jwt-key-change-this
SUPER_ADMIN_KEY=your-super-admin-key
ADMIN_IPS=127.0.0.1
NODE_ENV=production
EOF
    echo "Please edit .env file with your configuration and run this script again."
    exit 0
fi

# Deploy
echo "Deploying QUATTREX..."
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build

echo "Deployment complete! Check status with: docker compose -f docker-compose.prod.yml ps"