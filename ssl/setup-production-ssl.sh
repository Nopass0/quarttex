#!/bin/bash

# Setup Production SSL Certificate for Quattrex
# This script helps obtain and install a valid SSL certificate for production

set -e

SSL_DIR="/home/user/projects/quattrex/ssl"
DOMAIN="quattrex.pro"

echo "======================================"
echo "SSL Certificate Setup for Production"
echo "======================================"
echo ""

# Check if running as root (needed for certbot)
if [ "$EUID" -eq 0 ]; then 
   echo "✅ Running with sufficient privileges"
else
   echo "⚠️  This script should be run with sudo for certbot"
fi

echo ""
echo "Choose SSL certificate option:"
echo "1) Use Let's Encrypt (free, automatic renewal)"
echo "2) Install existing certificate from provider"
echo "3) Keep current self-signed certificate (development only)"
echo ""
read -p "Enter option (1-3): " option

case $option in
  1)
    echo ""
    echo "📋 Setting up Let's Encrypt certificate..."
    
    # Install certbot if not present
    if ! command -v certbot &> /dev/null; then
        echo "Installing certbot..."
        apt-get update
        apt-get install -y certbot
    fi
    
    # Stop nginx to free port 80
    echo "Stopping services..."
    docker-compose down 2>/dev/null || true
    
    # Obtain certificate
    echo "Requesting certificate for $DOMAIN and www.$DOMAIN..."
    certbot certonly --standalone \
        -d $DOMAIN \
        -d www.$DOMAIN \
        --non-interactive \
        --agree-tos \
        --email admin@$DOMAIN \
        --no-eff-email
    
    # Copy certificates to project SSL directory
    echo "Installing certificates..."
    cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem "$SSL_DIR/fullchain.crt"
    cp /etc/letsencrypt/live/$DOMAIN/privkey.pem "$SSL_DIR/certificate.key"
    cp /etc/letsencrypt/live/$DOMAIN/cert.pem "$SSL_DIR/certificate.crt"
    cp /etc/letsencrypt/live/$DOMAIN/chain.pem "$SSL_DIR/certificate_ca.crt"
    
    # Set permissions
    chmod 644 "$SSL_DIR/fullchain.crt"
    chmod 644 "$SSL_DIR/certificate.crt"
    chmod 644 "$SSL_DIR/certificate_ca.crt"
    chmod 600 "$SSL_DIR/certificate.key"
    
    echo "✅ Let's Encrypt certificate installed successfully!"
    
    # Setup auto-renewal
    echo "Setting up auto-renewal..."
    cat > /etc/cron.d/certbot-renewal <<EOF
0 0,12 * * * root certbot renew --quiet --deploy-hook "cp /etc/letsencrypt/live/$DOMAIN/*.pem $SSL_DIR/ && docker-compose -f /home/user/projects/quattrex/docker-compose.yml restart nginx"
EOF
    
    echo "✅ Auto-renewal configured"
    ;;
    
  2)
    echo ""
    echo "📋 Manual certificate installation"
    echo ""
    echo "Please place your certificate files in the $SSL_DIR directory:"
    echo "  - certificate.crt (your domain certificate)"
    echo "  - certificate.key (private key)"
    echo "  - certificate_ca.crt (CA bundle/intermediate certificates)"
    echo ""
    echo "Current files in $SSL_DIR:"
    ls -la "$SSL_DIR" | grep -E '\.(crt|key)$'
    echo ""
    read -p "Have you placed the certificate files? (y/n): " confirm
    
    if [ "$confirm" = "y" ]; then
        # Create fullchain
        if [ -f "$SSL_DIR/certificate.crt" ] && [ -f "$SSL_DIR/certificate_ca.crt" ]; then
            cat "$SSL_DIR/certificate.crt" "$SSL_DIR/certificate_ca.crt" > "$SSL_DIR/fullchain.crt"
            chmod 644 "$SSL_DIR/fullchain.crt"
            echo "✅ Fullchain certificate created"
        fi
        
        # Set permissions
        chmod 644 "$SSL_DIR/certificate.crt" 2>/dev/null || true
        chmod 644 "$SSL_DIR/certificate_ca.crt" 2>/dev/null || true
        chmod 600 "$SSL_DIR/certificate.key" 2>/dev/null || true
        
        echo "✅ Certificate files configured"
    else
        echo "❌ Installation cancelled"
        exit 1
    fi
    ;;
    
  3)
    echo ""
    echo "⚠️  Keeping self-signed certificate"
    echo "Note: This is only suitable for development!"
    echo "For production, please use option 1 or 2"
    ;;
    
  *)
    echo "Invalid option"
    exit 1
    ;;
esac

echo ""
echo "📋 Verifying SSL configuration..."

# Check certificate validity
if [ -f "$SSL_DIR/certificate.crt" ]; then
    echo "Certificate details:"
    openssl x509 -in "$SSL_DIR/certificate.crt" -noout -subject -dates
fi

# Update nginx configuration if needed
echo ""
echo "📋 Updating Nginx configuration..."

# Restore SSL stapling for valid certificates
if [ "$option" != "3" ]; then
    sed -i 's/# ssl_stapling/ssl_stapling/g' /home/user/projects/quattrex/nginx/conf.d/quattrex.conf
    sed -i 's/# ssl_trusted_certificate/ssl_trusted_certificate/g' /home/user/projects/quattrex/nginx/conf.d/quattrex.conf
    echo "✅ SSL stapling enabled for production certificate"
fi

echo ""
echo "======================================"
echo "SSL Setup Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Commit the changes: git add -A && git commit -m '🔒 Update SSL configuration'"
echo "2. Push to repository: git push"
echo "3. Deploy: ./deploy-neon.sh"
echo ""
echo "The deployment will automatically use the configured SSL certificates."