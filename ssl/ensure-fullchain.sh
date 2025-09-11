#!/bin/bash

# Скрипт для обеспечения наличия fullchain.crt на хосте
# Этот скрипт должен запускаться перед деплоем

set -e

SSL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FULLCHAIN_FILE="$SSL_DIR/fullchain.crt"
CERT_FILE="$SSL_DIR/certificate.crt"
INTERMEDIATE_FILE="$SSL_DIR/sectigo_intermediate.crt"

echo "🔧 Проверяем SSL сертификаты в $SSL_DIR..."

# Функция для логирования
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Проверяем, существует ли fullchain.crt и он валиден
if [ -f "$FULLCHAIN_FILE" ]; then
    if openssl x509 -in "$FULLCHAIN_FILE" -noout >/dev/null 2>&1; then
        log "✅ fullchain.crt существует и валиден"
        
        # Показываем информацию о сертификате
        log "📋 Информация о сертификате:"
        openssl x509 -in "$FULLCHAIN_FILE" -noout -subject -issuer -dates
        
        exit 0
    else
        log "⚠️  fullchain.crt существует, но поврежден, пересоздаем..."
    fi
fi

# Проверяем наличие основного сертификата
if [ ! -f "$CERT_FILE" ]; then
    log "❌ certificate.crt не найден в $SSL_DIR"
    exit 1
fi

log "📋 certificate.crt найден, создаем fullchain.crt..."

# Скачиваем промежуточный сертификат, если его нет
if [ ! -f "$INTERMEDIATE_FILE" ]; then
    log "📥 Скачиваем промежуточный сертификат Sectigo..."
    curl -s "http://crt.sectigo.com/SectigoPublicServerAuthenticationCADVR36.crt" -o "$INTERMEDIATE_FILE"
    
    if [ $? -eq 0 ] && [ -f "$INTERMEDIATE_FILE" ]; then
        log "✅ Промежуточный сертификат скачан"
    else
        log "⚠️  Не удалось скачать промежуточный сертификат, используем только основной"
    fi
fi

# Создаем fullchain.crt (используем только основной сертификат)
log "🔗 Создаем fullchain.crt..."
cp "$CERT_FILE" "$FULLCHAIN_FILE"

# Проверяем, что fullchain.crt создан и валиден
if [ -f "$FULLCHAIN_FILE" ] && openssl x509 -in "$FULLCHAIN_FILE" -noout >/dev/null 2>&1; then
    log "✅ fullchain.crt успешно создан и валиден"
    
    # Показываем информацию о сертификате
    log "📋 Информация о сертификате:"
    openssl x509 -in "$FULLCHAIN_FILE" -noout -subject -issuer -dates
    
    # Устанавливаем правильные права доступа
    chmod 644 "$FULLCHAIN_FILE"
    
    log "🎉 SSL сертификаты готовы к деплою!"
    exit 0
else
    log "❌ Ошибка при создании fullchain.crt"
    exit 1
fi
