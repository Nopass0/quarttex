#!/bin/bash
# Improved deployment script with Neon database support and better error handling

set -e

# Color codes for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${CYAN}==>${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Header
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              QUATTREX DEPLOYMENT SCRIPT (NEON)              ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed!"
        echo "Please run: bash scripts/install-docker.sh"
        exit 1
    fi
    log_success "Docker is installed"
    
    # Check Docker access
    if ! docker ps &> /dev/null; then
        log_error "Cannot access Docker daemon!"
        echo "Please ensure Docker is running and you have permissions."
        echo "Try: sudo usermod -aG docker $USER && newgrp docker"
        echo "Or run this script with sudo: sudo bash $0"
        exit 1
    fi
    log_success "Docker daemon is accessible"
    
    # Check .env file
    if [ ! -f .env ]; then
        log_warn ".env file not found!"
        if [ -f .env.example ]; then
            log_info "Creating .env from .env.example..."
            cp .env.example .env
            log_warn "Please update .env file with your actual values"
            exit 1
        else
            log_error "Neither .env nor .env.example found!"
            echo "Please create .env file with required variables:"
            echo "  DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require"
            echo "  JWT_SECRET=your-secret-key"
            echo "  SUPER_ADMIN_KEY=your-admin-key"
            echo "  ADMIN_IPS=127.0.0.1,your.ip.here"
            exit 1
        fi
    fi
    log_success ".env file exists"
    
    # Check if DATABASE_URL is for Neon
    if grep -q "DATABASE_URL.*neon\.tech" .env; then
        log_info "Detected Neon database configuration"
        
        # Add Neon-specific environment variables
        if ! grep -q "PRISMA_MIGRATE_SKIP_ADVISORY_LOCK" .env; then
            echo "" >> .env
            echo "# Neon-specific configuration" >> .env
            echo "PRISMA_MIGRATE_SKIP_ADVISORY_LOCK=1" >> .env
            log_info "Added Neon-specific configuration to .env"
        fi
    fi
}

# Function to prepare SSL certificates
prepare_ssl() {
    log_step "Checking SSL certificates..."
    
    if [ -f "ssl/ensure-fullchain.sh" ]; then
        bash ssl/ensure-fullchain.sh
        if [ $? -eq 0 ]; then
            log_success "SSL certificates are ready"
        else
            log_warn "SSL certificate setup failed - continuing without SSL"
        fi
    else
        log_warn "SSL certificate script not found - deploying without SSL"
    fi
}

# Function to stop existing containers
stop_containers() {
    log_step "Stopping existing containers..."
    
    # Stop using docker-compose
    docker compose -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true
    
    # Force remove any remaining containers
    local containers=$(docker ps -a --filter "name=quattrex_" --format "{{.Names}}" 2>/dev/null)
    if [ -n "$containers" ]; then
        echo "$containers" | xargs -r docker rm -f 2>/dev/null || true
    fi
    
    log_success "Existing containers stopped"
}

# Function to clean up resources
cleanup_resources() {
    log_step "Cleaning up Docker resources..."
    
    # Remove unused images
    docker image prune -f > /dev/null 2>&1 || true
    
    # Remove build cache
    docker builder prune -f > /dev/null 2>&1 || true
    
    # Remove unused volumes (be careful!)
    # docker volume prune -f > /dev/null 2>&1 || true
    
    log_success "Docker resources cleaned"
}

# Function to build containers
build_containers() {
    log_step "Building containers..."
    
    # Build with BuildKit for better performance
    export DOCKER_BUILDKIT=1
    
    if docker compose -f docker-compose.prod.yml build --no-cache; then
        log_success "Containers built successfully"
    else
        log_error "Failed to build containers"
        exit 1
    fi
}

# Function to start containers
start_containers() {
    log_step "Starting containers..."
    
    if docker compose -f docker-compose.prod.yml up -d; then
        log_success "Containers started"
    else
        log_error "Failed to start containers"
        docker compose -f docker-compose.prod.yml logs
        exit 1
    fi
}

# Function to wait for backend
wait_for_backend() {
    log_step "Waiting for backend to be ready..."
    
    local max_attempts=60
    local attempt=0
    local backend_ready=false
    
    while [ $attempt -lt $max_attempts ]; do
        # Check if container is running
        if ! docker ps | grep -q "quattrex_backend"; then
            log_error "Backend container is not running!"
            docker compose -f docker-compose.prod.yml logs backend --tail=50
            return 1
        fi
        
        # Check health endpoint
        if docker compose -f docker-compose.prod.yml exec -T backend \
           curl -f http://localhost:3001/api/health >/dev/null 2>&1; then
            backend_ready=true
            break
        fi
        
        attempt=$((attempt + 1))
        if [ $((attempt % 10)) -eq 0 ]; then
            echo "Still waiting... ($attempt/$max_attempts)"
        fi
        sleep 3
    done
    
    if [ "$backend_ready" = true ]; then
        log_success "Backend is ready and healthy"
        return 0
    else
        log_error "Backend failed to become ready"
        return 1
    fi
}

# Function to check migration status
check_migrations() {
    log_step "Checking migration status..."
    
    # Check for migration errors in logs
    local logs=$(docker compose -f docker-compose.prod.yml logs backend --tail=200 2>&1)
    
    if echo "$logs" | grep -q "Migrations applied successfully\|Schema pushed successfully"; then
        log_success "Migrations completed successfully"
        return 0
    elif echo "$logs" | grep -q "All migration strategies failed\|Migration process failed"; then
        log_error "Migrations failed!"
        echo "$logs" | grep -A5 -B5 "migration\|Migration" | tail -20
        return 1
    else
        log_warn "Migration status unclear - checking database..."
        
        # Try to verify schema directly
        if docker compose -f docker-compose.prod.yml exec -T backend \
           bunx prisma migrate status 2>&1 | grep -q "Database schema is up to date"; then
            log_success "Database schema is up to date"
            return 0
        else
            log_warn "Could not verify migration status"
            return 0  # Don't fail deployment
        fi
    fi
}

# Function to verify all services
verify_services() {
    log_step "Verifying all services..."
    
    local all_good=true
    
    # Check backend
    if docker ps | grep -q "quattrex_backend.*Up"; then
        log_success "Backend is running"
    else
        log_error "Backend is not running!"
        all_good=false
    fi
    
    # Check frontend
    if docker ps | grep -q "quattrex_frontend.*Up"; then
        log_success "Frontend is running"
    else
        log_error "Frontend is not running!"
        all_good=false
    fi
    
    # Check nginx
    if docker ps | grep -q "quattrex_nginx.*Up"; then
        log_success "Nginx is running"
    else
        log_error "Nginx is not running!"
        all_good=false
    fi
    
    if [ "$all_good" = false ]; then
        return 1
    fi
    return 0
}

# Function to run post-deployment tasks
post_deployment() {
    log_step "Running post-deployment tasks..."
    
    # Initialize service records
    docker compose -f docker-compose.prod.yml exec -T backend \
        bun run scripts/init-all-services.ts 2>/dev/null || \
        log_warn "Service initialization failed (may already be initialized)"
    
    # Disable emulator services in production
    docker compose -f docker-compose.prod.yml exec -T backend \
        bun run scripts/disable-emulator-services.ts 2>/dev/null || \
        log_warn "Could not disable emulator services (may already be disabled)"
    
    log_success "Post-deployment tasks completed"
}

# Function to show deployment summary
show_summary() {
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              DEPLOYMENT COMPLETED SUCCESSFULLY!             ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Show container status
    echo "Container Status:"
    docker compose -f docker-compose.prod.yml ps
    
    echo ""
    echo "Access URLs:"
    echo "  - HTTP:  http://your-server-ip"
    
    if [ -f "/quattrex/ssl/fullchain.crt" ] || [ -f "ssl/fullchain.crt" ]; then
        echo "  - HTTPS: https://quattrex.pro"
    fi
    
    echo ""
    echo "Useful commands:"
    echo "  - View logs:        docker compose -f docker-compose.prod.yml logs -f"
    echo "  - Restart backend:  docker compose -f docker-compose.prod.yml restart backend"
    echo "  - Stop all:         docker compose -f docker-compose.prod.yml down"
    echo "  - Database console: docker compose -f docker-compose.prod.yml exec backend bunx prisma studio"
    echo ""
}

# Main deployment flow
main() {
    # Track deployment time
    start_time=$(date +%s)
    
    # Run deployment steps
    check_prerequisites
    echo ""
    
    prepare_ssl
    echo ""
    
    stop_containers
    cleanup_resources
    echo ""
    
    build_containers
    echo ""
    
    start_containers
    echo ""
    
    # Wait for backend and check migrations
    if wait_for_backend; then
        check_migrations || log_warn "Migration check failed - continuing"
    else
        log_error "Backend failed to start properly"
        echo ""
        echo "Recent backend logs:"
        docker compose -f docker-compose.prod.yml logs backend --tail=100
        exit 1
    fi
    echo ""
    
    # Verify all services
    if ! verify_services; then
        log_error "Not all services are running!"
        echo ""
        echo "Docker status:"
        docker ps -a --filter "name=quattrex_"
        exit 1
    fi
    echo ""
    
    post_deployment
    echo ""
    
    # Calculate deployment time
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    minutes=$((duration / 60))
    seconds=$((duration % 60))
    
    show_summary
    echo "Deployment completed in ${minutes}m ${seconds}s"
}

# Handle script interruption
trap 'echo -e "\n${RED}Deployment interrupted!${NC}"; exit 1' INT TERM

# Run main function
main "$@"