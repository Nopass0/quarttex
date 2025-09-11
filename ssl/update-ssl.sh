#!/bin/bash

# Скрипт для обновления SSL сертификатов
# Использование: ./ssl/update-ssl.sh

set -e

SSL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SSL_DIR")"

echo "🔧 Обновление SSL сертификатов..."

# Переходим в директорию проекта
cd "$PROJECT_DIR"

# Функция для логирования
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Проверяем наличие certificate.crt
if [ ! -f "$SSL_DIR/certificate.crt" ]; then
    log "❌ certificate.crt не найден в $SSL_DIR"
    log "Пожалуйста, поместите ваш SSL сертификат в $SSL_DIR/certificate.crt"
    exit 1
fi

# Создаем fullchain.crt
log "📋 Создаем fullchain.crt..."
bash "$SSL_DIR/ensure-fullchain.sh"

if [ $? -eq 0 ]; then
    log "✅ SSL сертификаты обновлены успешно"
    
    # Перезапускаем nginx, если он запущен
    if docker compose ps nginx 2>/dev/null | grep -q "Up"; then
        log "🔄 Перезапускаем nginx..."
        docker compose restart nginx
        
        # Проверяем статус nginx
        sleep 5
        if docker compose ps nginx 2>/dev/null | grep -q "Up"; then
            log "✅ Nginx перезапущен успешно"
        else
            log "⚠️  Nginx не запустился, проверьте логи: docker compose logs nginx"
        fi
    else
        log "ℹ️  Nginx не запущен, сертификаты готовы к использованию"
    fi
    
    log "🎉 SSL сертификаты обновлены и готовы к использованию!"
else
    log "❌ Ошибка при обновлении SSL сертификатов"
    exit 1
fi
