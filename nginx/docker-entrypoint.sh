#!/bin/sh
set -e

echo "Starting nginx SSL certificate setup..."

# Function to validate certificate
validate_cert() {
    local cert_file=$1
    if [ ! -f "$cert_file" ]; then
        return 1
    fi
    
    # Check if certificate is valid
    if ! openssl x509 -in "$cert_file" -noout >/dev/null 2>&1; then
        return 1
    fi
    
    # Check if certificate is not expired and valid for current date
    if ! openssl x509 -in "$cert_file" -checkend 0 -noout >/dev/null 2>&1; then
        echo "⚠️  Certificate is expired or not yet valid"
        # For self-signed certificates, we'll allow them
        if openssl x509 -in "$cert_file" -text -noout | grep -q "CA:TRUE"; then
            echo "✅ Self-signed certificate detected, allowing..."
            return 0
        fi
        return 1
    fi
    
    return 0
}

# Function to create fullchain.crt
create_fullchain() {
    echo "🔧 Creating fullchain.crt..."
    
    SSL_DIR="/etc/nginx/ssl"
    FULLCHAIN_FILE="$SSL_DIR/fullchain.crt"
    CERT_FILE="$SSL_DIR/certificate.crt"
    CA_FILE="$SSL_DIR/certificate_ca.crt"
    
    # Check if certificate exists
    if [ ! -f "$CERT_FILE" ]; then
        echo "❌ certificate.crt not found in $SSL_DIR"
        return 1
    fi
    
    # Create fullchain by combining certificate and CA chain
    if [ -f "$CA_FILE" ] && validate_cert "$CA_FILE"; then
        echo "📋 Creating fullchain with CA bundle..."
        cat "$CERT_FILE" "$CA_FILE" > "$FULLCHAIN_FILE"
    else
        echo "📋 Creating fullchain from certificate only..."
        cp "$CERT_FILE" "$FULLCHAIN_FILE"
    fi
    
    # Verify the created fullchain
    if validate_cert "$FULLCHAIN_FILE"; then
        echo "✅ fullchain.crt successfully created and valid"
        chmod 644 "$FULLCHAIN_FILE"
        return 0
    else
        echo "⚠️  Created fullchain.crt but validation shows issues"
        # Continue anyway for self-signed certificates
        chmod 644 "$FULLCHAIN_FILE"
        return 0
    fi
}

# Main SSL setup logic
SSL_DIR="/etc/nginx/ssl"
FULLCHAIN_FILE="$SSL_DIR/fullchain.crt"
CERT_FILE="$SSL_DIR/certificate.crt"
KEY_FILE="$SSL_DIR/certificate.key"

echo "📋 Checking SSL configuration..."
echo "   Certificate: $CERT_FILE"
echo "   Private Key: $KEY_FILE"
echo "   Full Chain: $FULLCHAIN_FILE"

# Check if private key exists
if [ ! -f "$KEY_FILE" ]; then
    echo "❌ ERROR: Private key not found at $KEY_FILE"
    echo "SSL cannot be configured without a private key"
    
    if [ "$NGINX_ALLOW_NO_SSL" = "true" ]; then
        echo "⚠️  NGINX_ALLOW_NO_SSL is set, continuing without SSL..."
    else
        exit 1
    fi
fi

# Check and create fullchain.crt
if [ -f "$FULLCHAIN_FILE" ]; then
    if validate_cert "$FULLCHAIN_FILE"; then
        echo "✅ Using existing valid fullchain.crt"
    else
        echo "⚠️  fullchain.crt exists but has validation issues, recreating..."
        create_fullchain
    fi
elif [ -f "$CERT_FILE" ]; then
    echo "📋 certificate.crt found, creating fullchain.crt..."
    create_fullchain
else
    echo "❌ ERROR: No SSL certificates found!"
    echo "Please ensure certificate.crt and certificate.key exist in the ssl/ directory"
    
    if [ "$NGINX_ALLOW_NO_SSL" = "true" ]; then
        echo "⚠️  NGINX_ALLOW_NO_SSL is set, continuing without SSL..."
    else
        exit 1
    fi
fi

# Display SSL certificate information
if [ -f "$FULLCHAIN_FILE" ]; then
    echo ""
    echo "📋 SSL Certificate Information:"
    openssl x509 -in "$FULLCHAIN_FILE" -noout -subject -dates 2>/dev/null || echo "   Unable to display certificate info"
    echo ""
fi

# Set proper permissions
if [ -f "$CERT_FILE" ]; then
    chmod 644 "$CERT_FILE"
fi
if [ -f "$FULLCHAIN_FILE" ]; then
    chmod 644 "$FULLCHAIN_FILE"
fi
if [ -f "$KEY_FILE" ]; then
    chmod 600 "$KEY_FILE"
fi

# Test nginx configuration
echo "🔧 Testing nginx configuration..."
nginx -t

# Execute nginx
echo "✅ Starting nginx..."
exec nginx -g 'daemon off;'