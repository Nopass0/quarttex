#!/usr/bin/env bash
# Setup script for Quattrex P2P Payment Platform development environment

set -e

echo "🚀 Quattrex P2P Platform - Development Environment Setup"
echo "===================================================="

# Colors for output
RED='\033[0;31m'
PURPLE='\033[0;35m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${PURPLE}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root!"
   print_info "Please run: sudo ./setup-dev-environment.sh"
   exit 1
fi

# Detect OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
else
    print_error "Unsupported OS: $OSTYPE"
    exit 1
fi

print_info "Detected OS: $OS"

# Step 1: Install PostgreSQL
print_info "Installing PostgreSQL..."
if [[ "$OS" == "linux" ]]; then
    # Ubuntu/Debian
    if command -v apt-get &> /dev/null; then
        apt-get update
        apt-get install -y postgresql postgresql-contrib
        print_success "PostgreSQL installed via apt"
        
        # Start PostgreSQL service
        systemctl start postgresql || service postgresql start
        systemctl enable postgresql || true
        
        # Wait for PostgreSQL to start
        sleep 2
        
    # CentOS/RHEL/Fedora
    elif command -v yum &> /dev/null; then
        yum install -y postgresql postgresql-server postgresql-contrib
        postgresql-setup initdb
        systemctl enable postgresql
        systemctl start postgresql
        print_success "PostgreSQL installed via yum"
    else
        print_error "Unsupported Linux distribution"
        exit 1
    fi
elif [[ "$OS" == "macos" ]]; then
    if command -v brew &> /dev/null; then
        brew install postgresql
        brew services start postgresql
        print_success "PostgreSQL installed via Homebrew"
    else
        print_error "Homebrew not found. Please install Homebrew first."
        exit 1
    fi
fi

# Step 2: Create database and user
print_info "Setting up PostgreSQL database..."

# Generate random password
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
DB_NAME="quattrex_dev"
DB_USER="quattrex_user"

# Create user and database
sudo -u postgres psql <<EOF
-- Create user
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';

-- Create database
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};

-- Connect to the database and set up extensions
\c ${DB_NAME}
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOF

print_success "Database '${DB_NAME}' created with user '${DB_USER}'"

# Step 3: Create project directories if they don't exist
print_info "Setting up project structure..."
mkdir -p backend
mkdir -p frontend
mkdir -p .gpt

# Step 4: Create .env files
print_info "Creating environment configuration files..."

# Root .env file
cat > .env <<EOF
# Quattrex P2P Platform - Root Environment Configuration
# Generated on $(date)

# Database
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"

# Environment
NODE_ENV=development
EOF

# Backend .env file
cat > backend/.env <<EOF
# Quattrex P2P Platform - Backend Environment Configuration
# Generated on $(date)

# Database
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"

# Server
PORT=3000
HOST=localhost

# JWT
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')

# Admin
ADMIN_KEY=admin-dev-$(openssl rand -hex 16)
SUPER_ADMIN_KEY=super-admin-dev-$(openssl rand -hex 16)

# File uploads
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=15728640

# Telegram Bot (optional - update with your values)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Email (optional - update with your SMTP settings)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@quattrex.local

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Development
LOG_LEVEL=debug
EOF

# Frontend .env.local file
cat > frontend/.env.local <<EOF
# Quattrex P2P Platform - Frontend Environment Configuration
# Generated on $(date)

# API URLs
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_WS_URL=ws://localhost:3000/api/ws

# App
NEXT_PUBLIC_APP_NAME="Quattrex P2P"
NEXT_PUBLIC_APP_URL=http://localhost:3001

# Features
NEXT_PUBLIC_ENABLE_WEBSOCKET=true
NEXT_PUBLIC_ENABLE_TELEGRAM=true
EOF

print_success "Environment files created"

# Step 5: Create .gitignore if it doesn't exist
if [ ! -f .gitignore ]; then
    cat > .gitignore <<EOF
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
.nyc_output

# Next.js
.next/
out/
build/
dist/

# Production
*.production
.env.production.local

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# Local env files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Project specific
uploads/
.gpt/logs/
*.log
*.pid
*.seed
*.pid.lock

# Database
*.sqlite
*.sqlite3
postgres-data/

# Temporary files
tmp/
temp/
EOF
    print_success ".gitignore created"
fi

# Step 6: Install dependencies
print_info "Installing project dependencies..."

# Install backend dependencies
if [ -f backend/package.json ]; then
    cd backend
    if command -v bun &> /dev/null; then
        bun install
        print_success "Backend dependencies installed with Bun"
    else
        npm install
        print_success "Backend dependencies installed with npm"
    fi
    cd ..
else
    print_info "Skipping backend dependencies (package.json not found)"
fi

# Install frontend dependencies
if [ -f frontend/package.json ]; then
    cd frontend
    npm install
    print_success "Frontend dependencies installed"
    cd ..
else
    print_info "Skipping frontend dependencies (package.json not found)"
fi

# Step 7: Run database migrations
if [ -f backend/prisma/schema.prisma ]; then
    print_info "Running database migrations..."
    cd backend
    npx prisma generate
    npx prisma migrate deploy
    print_success "Database migrations completed"
    cd ..
else
    print_info "Skipping migrations (Prisma schema not found)"
fi

# Step 8: Create helper scripts directory
print_info "Creating AI agent helper scripts..."
mkdir -p .gpt

# Create helper scripts (we'll add more later)
cat > .gpt/check-status.sh <<'EOF'
#!/usr/bin/env bash
echo "🔍 Checking project status..."
echo ""

# Check if backend is running
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo "✅ Backend is running"
else
    echo "❌ Backend is not running"
fi

# Check if frontend is running
if curl -s http://localhost:3001 > /dev/null; then
    echo "✅ Frontend is running"
else
    echo "❌ Frontend is not running"
fi

# Check database connection
echo ""
echo "📊 Database status:"
if PGPASSWORD="${DB_PASSWORD}" psql -h localhost -U ${DB_USER} -d ${DB_NAME} -c "SELECT 1" > /dev/null 2>&1; then
    echo "✅ Database is accessible"
else
    echo "❌ Database connection failed"
fi
EOF

chmod +x .gpt/check-status.sh

# Summary
echo ""
echo "===================================================="
print_success "Development environment setup completed!"
echo ""
echo "📋 Database Credentials:"
echo "   Database: ${DB_NAME}"
echo "   User: ${DB_USER}"
echo "   Password: ${DB_PASSWORD}"
echo "   Connection: postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"
echo ""
echo "🚀 Next steps:"
echo "   1. cd backend && bun dev"
echo "   2. cd frontend && npm run dev"
echo "   3. Access the app at http://localhost:3001"
echo ""
echo "💡 Use scripts in .gpt/ directory for development tasks"
echo ""