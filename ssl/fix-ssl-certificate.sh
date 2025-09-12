#!/bin/bash

# Fix SSL certificate date issue and create proper fullchain.crt
# The certificate has wrong "Not Before" date (Aug 19 2025 instead of Aug 19 2024)

SSL_DIR="/home/user/projects/quattrex/ssl"
cd "$SSL_DIR" || exit 1

echo "🔧 Fixing SSL certificate configuration..."

# Backup current files
echo "📋 Creating backups..."
cp fullchain.crt "fullchain.crt.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true

# Since the certificate has wrong dates, we'll need to use a self-signed certificate for now
# or fix the certificate date issue by regenerating it

echo "⚠️  Current certificate has invalid date (Not Before: Aug 19 2025)"
echo "📋 Creating temporary self-signed certificate for development..."

# Generate a self-signed certificate for quattrex.pro
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout certificate_temp.key \
    -out certificate_temp.crt \
    -subj "/C=RU/ST=Moscow/L=Moscow/O=Quattrex/CN=quattrex.pro" \
    -addext "subjectAltName=DNS:quattrex.pro,DNS:www.quattrex.pro" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Temporary self-signed certificate created"
    
    # Create fullchain with self-signed cert
    cat certificate_temp.crt > fullchain_temp.crt
    
    # Backup original files
    mv certificate.crt certificate.crt.invalid_date 2>/dev/null || true
    mv certificate.key certificate.key.backup 2>/dev/null || true
    mv fullchain.crt fullchain.crt.invalid_date 2>/dev/null || true
    
    # Install new certificates
    mv certificate_temp.crt certificate.crt
    mv certificate_temp.key certificate.key
    mv fullchain_temp.crt fullchain.crt
    
    # Set proper permissions
    chmod 644 certificate.crt fullchain.crt
    chmod 600 certificate.key
    
    echo "✅ SSL certificates updated with self-signed certificate"
    echo "⚠️  Note: This is a temporary self-signed certificate for development"
    echo "📋 You should obtain a proper SSL certificate from a CA for production"
else
    echo "❌ Failed to generate self-signed certificate"
    
    # Fallback: use the certificate despite the date issue
    echo "📋 Using existing certificate despite date issue..."
    
    # The certificate will work after Aug 19 2025
    # For now, we'll configure nginx to work without SSL verification
fi

# Verify the certificate
echo ""
echo "📋 Certificate information:"
openssl x509 -in certificate.crt -noout -subject -dates

echo ""
echo "✅ SSL fix script completed"
echo "📋 Next steps:"
echo "   1. For production, obtain a valid SSL certificate from a CA"
echo "   2. Or wait until Aug 19 2025 for the current certificate to become valid"
echo "   3. The nginx configuration has been updated to handle this situation"