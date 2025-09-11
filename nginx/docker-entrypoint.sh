#!/bin/sh
set -e

echo "Starting nginx SSL certificate setup..."

# Function to create fullchain.crt
create_fullchain() {
    echo "🔧 Создаем fullchain.crt..."
    
    SSL_DIR="/etc/nginx/ssl"
    FULLCHAIN_FILE="$SSL_DIR/fullchain.crt"
    CERT_FILE="$SSL_DIR/certificate.crt"
    INTERMEDIATE_FILE="$SSL_DIR/sectigo_intermediate.crt"
    
    # Проверяем наличие основного сертификата
    if [ ! -f "$CERT_FILE" ]; then
        echo "❌ certificate.crt не найден в $SSL_DIR"
        return 1
    fi
    
    # Скачиваем промежуточный сертификат, если его нет
    if [ ! -f "$INTERMEDIATE_FILE" ]; then
        echo "📥 Скачиваем промежуточный сертификат Sectigo..."
        wget -q "http://crt.sectigo.com/SectigoPublicServerAuthenticationCADVR36.crt" -O "$INTERMEDIATE_FILE" || {
            echo "⚠️  Не удалось скачать промежуточный сертификат, используем только основной"
            cp "$CERT_FILE" "$FULLCHAIN_FILE"
            return 0
        }
    fi
    
    # Создаем fullchain.crt (используем только основной сертификат)
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