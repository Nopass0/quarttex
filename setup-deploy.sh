#!/usr/bin/env bash
# Deploy script for Chase P2P Payment Platform

set -e

echo "🚀 Chase P2P Platform - Production Deployment"
echo "============================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

print_header() {
    echo -e "${BLUE}═══ $1 ═══${NC}"
}

# Check if running with appropriate permissions
SUDO=""
if [[ $EUID -ne 0 ]]; then
   if command -v sudo &> /dev/null; then
       SUDO="sudo"
       print_info "Running with sudo privileges..."
   else
       print_error "This script requires root privileges but sudo is not available!"
       exit 1
   fi
fi

# Parse command line arguments
PROJECT_DIR=""
DOMAIN=""
SKIP_BUILD=false
UPDATE_CERT=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        -d|--dir) PROJECT_DIR="$2"; shift ;;
        -h|--domain) DOMAIN="$2"; shift ;;
        --skip-build) SKIP_BUILD=true ;;
        --update-cert) UPDATE_CERT=true ;;
        -help|--help) 
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  -d, --dir <path>      Project directory path"
            echo "  -h, --domain <domain> Domain name for deployment"
            echo "  --skip-build          Skip building containers"
            echo "  --update-cert         Update SSL certificates after deployment"
            echo ""
            exit 0
            ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Validate required parameters
if [[ -z "$PROJECT_DIR" ]]; then
    print_error "Project directory not specified. Use -d or --dir option."
    exit 1
fi

if [[ ! -d "$PROJECT_DIR" ]]; then
    print_error "Project directory not found: $PROJECT_DIR"
    exit 1
fi

if [[ -z "$DOMAIN" ]]; then
    print_error "Domain not specified. Use -h or --domain option."
    exit 1
fi

# Navigate to project directory
cd "$PROJECT_DIR"
print_success "Working in directory: $(pwd)"

# Step 1: Validate environment
print_header "Environment Validation"

# Check for required files
REQUIRED_FILES=(
    "docker-compose.yml"
    "backend/Dockerfile"
    "frontend/Dockerfile"
    "nginx/nginx.conf"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        print_success "Found: $file"
    else
        print_error "Missing required file: $file"
        exit 1
    fi
done

# Check for .env files
if [[ ! -f ".env" ]]; then
    print_error "Missing .env file in root directory"
    exit 1
fi

if [[ ! -f "backend/.env" ]]; then
    print_error "Missing .env file in backend directory"
    exit 1
fi

# Step 2: Stop existing containers
print_header "Container Management"
print_info "Stopping existing containers..."
$SUDO docker-compose down || true
print_success "Containers stopped"

# Step 3: Build containers (unless skipped)
if [[ "$SKIP_BUILD" == false ]]; then
    print_header "Building Containers"
    
    # Build backend
    print_info "Building backend container..."
    $SUDO docker-compose build backend
    print_success "Backend container built"
    
    # Build frontend
    print_info "Building frontend container..."
    $SUDO docker-compose build frontend
    print_success "Frontend container built"
    
    # Build nginx
    print_info "Building nginx container..."
    $SUDO docker-compose build nginx
    print_success "Nginx container built"
else
    print_info "Skipping container build (--skip-build flag)"
fi

# Step 4: Start containers
print_header "Starting Services"
print_info "Starting all containers..."
$SUDO docker-compose up -d
print_success "All containers started"

# Wait for services to be ready
print_info "Waiting for services to initialize..."
sleep 10

# Step 5: Health check
print_header "Health Check"

# Check backend health
print_info "Checking backend health..."
BACKEND_URL="http://localhost:3000/api/health"
for i in {1..30}; do
    if curl -s "$BACKEND_URL" > /dev/null; then
        print_success "Backend is healthy"
        break
    fi
    if [[ $i -eq 30 ]]; then
        print_error "Backend health check failed"
        exit 1
    fi
    sleep 2
done

# Check frontend
print_info "Checking frontend..."
FRONTEND_URL="http://localhost:3001"
if curl -s "$FRONTEND_URL" > /dev/null; then
    print_success "Frontend is accessible"
else
    print_error "Frontend check failed"
fi

# Check nginx
print_info "Checking nginx..."
NGINX_URL="http://localhost"
if curl -s "$NGINX_URL" > /dev/null; then
    print_success "Nginx is accessible"
else
    print_error "Nginx check failed"
fi

# Step 6: Database migrations
print_header "Database Setup"
print_info "Running database migrations..."
$SUDO docker-compose exec -T backend npx prisma migrate deploy
print_success "Database migrations completed"

# Step 7: SSL Certificate Management
if [[ "$UPDATE_CERT" == true ]]; then
    print_header "SSL Certificate Management"
    
    # Check if certificates exist
    CERT_DIR="/etc/letsencrypt/live/$DOMAIN"
    if [[ -d "$CERT_DIR" ]]; then
        print_info "SSL certificates found for domain: $DOMAIN"
        
        # Display certificate info
        print_info "Certificate details:"
        $SUDO openssl x509 -in "$CERT_DIR/fullchain.pem" -noout -dates
        
        # Copy certificates to project directory if needed
        NGINX_CERT_DIR="$PROJECT_DIR/nginx/certs"
        if [[ ! -d "$NGINX_CERT_DIR" ]]; then
            $SUDO mkdir -p "$NGINX_CERT_DIR"
        fi
        
        print_info "Copying certificates to nginx directory..."
        $SUDO cp "$CERT_DIR/fullchain.pem" "$NGINX_CERT_DIR/"
        $SUDO cp "$CERT_DIR/privkey.pem" "$NGINX_CERT_DIR/"
        print_success "Certificates copied"
        
        # Restart nginx to apply new certificates
        print_info "Restarting nginx container..."
        $SUDO docker-compose restart nginx
        print_success "Nginx restarted with new certificates"
    else
        print_error "No SSL certificates found for domain: $DOMAIN"
        print_info "To obtain certificates, run: sudo certbot certonly --standalone -d $DOMAIN"
    fi
fi

# Step 8: Display container logs function
show_logs() {
    print_header "Container Logs (Last 50 lines)"
    echo ""
    echo "Backend logs:"
    $SUDO docker-compose logs --tail=50 backend
    echo ""
    echo "Frontend logs:"
    $SUDO docker-compose logs --tail=50 frontend
    echo ""
    echo "Nginx logs:"
    $SUDO docker-compose logs --tail=50 nginx
}

# Step 9: Summary
print_header "Deployment Summary"
echo ""
print_success "Deployment completed successfully!"
echo ""
echo "🔍 Service Status:"
$SUDO docker-compose ps
echo ""
echo "📌 Access URLs:"
echo "   - Frontend: https://$DOMAIN"
echo "   - Backend API: https://$DOMAIN/api"
echo "   - Health Check: https://$DOMAIN/api/health"
echo ""
echo "📊 Useful Commands:"
echo "   - View logs: docker-compose logs -f [service]"
echo "   - Restart services: docker-compose restart"
echo "   - Stop all: docker-compose down"
echo "   - Database shell: docker-compose exec postgres psql -U chase_user -d chase_prod"
echo ""

# Create post-deployment script
cat > "$PROJECT_DIR/.deploy-utils.sh" << 'EOF'
#!/usr/bin/env bash
# Utility functions for post-deployment management

# Function to update SSL certificates
update_ssl_cert() {
    local DOMAIN=$1
    if [[ -z "$DOMAIN" ]]; then
        echo "Usage: update_ssl_cert <domain>"
        return 1
    fi
    
    echo "Updating SSL certificate for $DOMAIN..."
    CERT_DIR="/etc/letsencrypt/live/$DOMAIN"
    
    if [[ -d "$CERT_DIR" ]]; then
        echo "Current certificate info:"
        sudo openssl x509 -in "$CERT_DIR/fullchain.pem" -noout -dates
        
        # Show certificate content
        echo ""
        echo "Certificate chain (fullchain.pem):"
        sudo cat "$CERT_DIR/fullchain.pem"
        
        # Restart nginx
        echo ""
        echo "Restarting nginx..."
        sudo docker-compose restart nginx
        echo "✓ SSL certificate updated and nginx restarted"
    else
        echo "No certificate found for $DOMAIN"
    fi
}

# Function to show all container logs
show_all_logs() {
    echo "=== Backend Logs ==="
    sudo docker-compose logs --tail=100 backend
    echo ""
    echo "=== Frontend Logs ==="
    sudo docker-compose logs --tail=100 frontend
    echo ""
    echo "=== Nginx Logs ==="
    sudo docker-compose logs --tail=100 nginx
    echo ""
    echo "=== Database Logs ==="
    sudo docker-compose logs --tail=100 postgres
}

# Function to backup database
backup_database() {
    local BACKUP_FILE="chase_backup_$(date +%Y%m%d_%H%M%S).sql"
    echo "Creating database backup: $BACKUP_FILE"
    sudo docker-compose exec -T postgres pg_dump -U chase_user chase_prod > "$BACKUP_FILE"
    echo "✓ Database backed up to: $BACKUP_FILE"
}

# Export functions for use
export -f update_ssl_cert
export -f show_all_logs
export -f backup_database
EOF

chmod +x "$PROJECT_DIR/.deploy-utils.sh"
print_success "Deployment utilities created: .deploy-utils.sh"

# Ask if user wants to see logs
echo ""
read -p "Would you like to see container logs? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    show_logs
fi

echo ""
print_info "To update SSL certificates later, run:"
echo "   cd $PROJECT_DIR && source .deploy-utils.sh && update_ssl_cert $DOMAIN"
echo ""