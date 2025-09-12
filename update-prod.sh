#!/bin/bash
# Скрипт для обновления продакшена

echo "🚀 ОБНОВЛЕНИЕ ПРОДАКШЕНА QUATTREX"
echo "=================================="

# Функция для логирования
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# 1. Получение последних изменений
log "📥 Получение последних изменений из репозитория..."
git pull origin main

if [ $? -ne 0 ]; then
    log "❌ Ошибка при получении изменений из Git"
    exit 1
fi

log "✅ Изменения получены успешно"

# 2. Остановка контейнеров
log "🛑 Остановка существующих контейнеров..."
docker compose -f docker-compose.prod.yml down

# 3. Сборка новых контейнеров
log "🔨 Сборка новых контейнеров..."
docker compose -f docker-compose.prod.yml build --no-cache

if [ $? -ne 0 ]; then
    log "❌ Ошибка при сборке контейнеров"
    exit 1
fi

# 4. Запуск контейнеров
log "🚀 Запуск обновленных контейнеров..."
docker compose -f docker-compose.prod.yml up -d

# 5. Ожидание готовности
log "⏳ Ожидание готовности сервисов..."
sleep 30

# 6. Проверка статуса
log "📊 Проверка статуса контейнеров..."
docker compose -f docker-compose.prod.yml ps

# 7. Проверка логов
log "📋 Проверка логов backend..."
docker compose -f docker-compose.prod.yml logs backend --tail=20

# 8. Тестирование API
log "🔍 Тестирование API..."
if curl -s https://quattrex.pro/api/health > /dev/null 2>&1; then
    log "✅ API доступен"
else
    log "⚠️  API недоступен, проверьте логи"
fi

# 9. Тестирование эндпоинта transactions/in
log "🔍 Тестирование эндпоинта /api/merchant/transactions/in..."
if curl -s -X POST https://quattrex.pro/api/merchant/transactions/in \
    -H "x-merchant-api-key: 64f8c5b37107d437f778b6037cf4a002d068edd7197108efcd5c53961211bfd0" \
    -H "Content-Type: application/json" \
    -d '{"orderId": "test-update-123", "amount": 1000, "methodId": "test-method", "userIp": "192.168.1.1", "callbackUri": "https://example.com/callback", "expired_at": "2025-09-12T10:00:00.000Z"}' \
    --max-time 10 > /dev/null 2>&1; then
    log "✅ Эндпоинт /api/merchant/transactions/in работает"
else
    log "⚠️  Эндпоинт /api/merchant/transactions/in не отвечает"
fi

log ""
log "🎉 ОБНОВЛЕНИЕ ПРОДАКШЕНА ЗАВЕРШЕНО!"
log ""
log "📋 Что было сделано:"
log "   ✅ Получены последние изменения из Git"
log "   ✅ Остановлены старые контейнеры"
log "   ✅ Собраны новые контейнеры"
log "   ✅ Запущены обновленные контейнеры"
log "   ✅ Проверен статус сервисов"
log ""
log "🌐 Доступ к приложению:"
log "   HTTPS: https://quattrex.pro"
log ""
log "🔧 Если возникли проблемы:"
log "   - Проверьте логи: docker compose -f docker-compose.prod.yml logs"
log "   - Перезапустите: docker compose -f docker-compose.prod.yml restart"
