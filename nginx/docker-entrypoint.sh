#!/bin/sh
set -e

echo "Starting nginx SSL certificate setup..."

# Function to create fullchain.crt
create_fullchain() {
    echo "🔧 Создаем fullchain.crt..."
    
    SSL_DIR="/etc/nginx/ssl"
    FULLCHAIN_FILE="$SSL_DIR/fullchain.crt"
    WORKING_CERT="$SSL_DIR/fullchain_working.crt"
    CERT_FILE="$SSL_DIR/certificate.crt"
    
    # Сначала пробуем использовать рабочий сертификат
    if [ -f "$WORKING_CERT" ]; then
        echo "🔧 Найден fullchain_working.crt, копируем его..."
        if openssl x509 -in "$WORKING_CERT" -noout >/dev/null 2>&1; then
            cp "$WORKING_CERT" "$FULLCHAIN_FILE"
            echo "✅ Используем рабочий сертификат fullchain_working.crt"
            chmod 644 "$FULLCHAIN_FILE"
            return 0
        else
            echo "⚠️  fullchain_working.crt поврежден"
        fi
    fi
    
    # Проверяем наличие основного сертификата
    if [ ! -f "$CERT_FILE" ]; then
        echo "❌ certificate.crt не найден в $SSL_DIR"
        return 1
    fi
    
    # Создаем fullchain.crt из основного сертификата
    cp "$CERT_FILE" "$FULLCHAIN_FILE"
    
    # Проверяем, что fullchain.crt создан и валиден
    if [ -f "$FULLCHAIN_FILE" ] && openssl x509 -in "$FULLCHAIN_FILE" -noout >/dev/null 2>&1; then
        echo "✅ fullchain.crt успешно создан и валиден"
        chmod 644 "$FULLCHAIN_FILE"
        return 0
    else
        echo "❌ Ошибка при создании fullchain.crt"
        return 1
    fi
}

# Check if fullchain.crt exists and is valid
if [ -f "/etc/nginx/ssl/fullchain.crt" ]; then
    if openssl x509 -in "/etc/nginx/ssl/fullchain.crt" -noout >/dev/null 2>&1; then
        echo "✅ Using existing valid fullchain.crt"
        ls -la /etc/nginx/ssl/
    else
        echo "⚠️  fullchain.crt exists but is invalid, recreating..."
        create_fullchain
    fi
elif [ -f "/etc/nginx/ssl/certificate.crt" ]; then
    echo "📋 certificate.crt found, creating fullchain.crt..."
    create_fullchain
else
    echo "ERROR: SSL certificates not found!"
    echo "Please ensure certificate.crt exists in the ssl/ directory"
    
    # For development/testing, we might want to continue anyway
    if [ "$NGINX_ALLOW_NO_SSL" = "true" ]; then
        echo "NGINX_ALLOW_NO_SSL is set, continuing without SSL..."
    else
        exit 1
    fi
fi

# Execute nginx
echo "Starting nginx..."
exec nginx -g 'daemon off;'