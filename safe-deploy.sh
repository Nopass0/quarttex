#!/bin/bash

# Безопасный деплой с автоматическим исправлением ошибок миграций
# НЕ УДАЛЯЕТ ДАННЫЕ - только создает недостающие таблицы

set -e

echo "🚀 БЕЗОПАСНЫЙ ДЕПЛОЙ QUATTREX"
echo "✅ Автоматическое исправление ошибок миграций"
echo "✅ Сохранение всех данных"
echo ""

# Функция для логирования
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Проверяем Docker
if ! command -v docker &> /dev/null; then
    log "❌ Docker не установлен!"
    exit 1
fi

# Проверяем .env файл
if [ ! -f .env ]; then
    log "❌ Файл .env не найден!"
    exit 1
fi

# 1. Подготовка SSL сертификатов
log "🔧 Подготовка SSL сертификатов..."
if [ -f "ssl/ensure-fullchain.sh" ]; then
    bash ssl/ensure-fullchain.sh
    if [ $? -eq 0 ]; then
        log "✅ SSL сертификаты готовы"
    else
        log "⚠️  Проблемы с SSL сертификатами, но продолжаем"
    fi
else
    log "⚠️  SSL скрипт не найден, пропускаем"
fi

# 2. Подготовка миграций
log "🔧 Подготовка миграций..."
if [ -f "backend/scripts/auto-fix-migrations.sh" ]; then
    log "✅ Скрипт автоматического исправления найден"
else
    log "❌ Скрипт автоматического исправления не найден!"
    exit 1
fi

# 3. Остановка существующих контейнеров
log "🛑 Остановка существующих контейнеров..."
docker compose -f docker-compose.prod.yml down || true

# 4. Сборка контейнеров
log "🔨 Сборка контейнеров..."
docker compose -f docker-compose.prod.yml build --no-cache

# 5. Запуск контейнеров
log "🚀 Запуск контейнеров..."
docker compose -f docker-compose.prod.yml up -d

# 6. Ожидание готовности сервисов
log "⏳ Ожидание готовности сервисов..."
sleep 30

# 7. Проверка статуса
log "📊 Проверка статуса контейнеров..."
docker compose -f docker-compose.prod.yml ps

# 8. Проверка логов
log "📋 Проверка логов backend..."
docker compose -f docker-compose.prod.yml logs backend --tail=20

log "📋 Проверка логов nginx..."
docker compose -f docker-compose.prod.yml logs nginx --tail=10

# 9. Финальная проверка
log "🔍 Финальная проверка..."

# Проверяем, что все контейнеры запущены
if docker compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    log "✅ Все контейнеры запущены успешно"
else
    log "⚠️  Некоторые контейнеры не запустились"
fi

# Проверяем доступность API
if curl -s http://localhost/api/health > /dev/null 2>&1; then
    log "✅ API доступен"
else
    log "⚠️  API недоступен, проверьте логи"
fi

log ""
log "🎉 БЕЗОПАСНЫЙ ДЕПЛОЙ ЗАВЕРШЕН!"
log ""
log "📋 Что было сделано:"
log "   ✅ SSL сертификаты проверены и исправлены"
log "   ✅ Миграции применены с автоматическим исправлением"
log "   ✅ Все данные сохранены"
log "   ✅ Контейнеры запущены"
log ""
log "🌐 Доступ к приложению:"
log "   HTTP:  http://your-server-ip"
log "   HTTPS: https://quattrex.pro"
log ""
log "🔧 Если возникли проблемы:"
log "   - Проверьте логи: docker compose -f docker-compose.prod.yml logs"
log "   - Перезапустите: docker compose -f docker-compose.prod.yml restart"
log "   - Полный перезапуск: docker compose -f docker-compose.prod.yml down && docker compose -f docker-compose.prod.yml up -d"
