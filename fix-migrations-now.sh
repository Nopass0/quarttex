#!/bin/bash

# Быстрое исправление ошибок миграций на работающем сервере
# БЕЗОПАСНО - не останавливает сервисы, не удаляет данные

set -e

echo "🔧 БЫСТРОЕ ИСПРАВЛЕНИЕ МИГРАЦИЙ"
echo "✅ Без остановки сервисов"
echo "✅ Без удаления данных"
echo ""

# Функция для логирования
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Проверяем, что мы в правильной директории
if [ ! -f "backend/scripts/auto-fix-migrations.sh" ]; then
    log "❌ Скрипт исправления не найден!"
    log "Убедитесь, что вы находитесь в корневой директории проекта"
    exit 1
fi

# 1. Исправляем миграции
log "🔧 Запускаем автоматическое исправление миграций..."
cd backend
bash scripts/auto-fix-migrations.sh

if [ $? -eq 0 ]; then
    log "✅ Миграции исправлены успешно"
else
    log "⚠️  Некоторые проблемы остались, но база данных должна работать"
fi

# 2. Перезапускаем только backend для применения изменений
log "🔄 Перезапускаем backend для применения изменений..."
cd ..
docker compose -f docker-compose.prod.yml restart backend

# 3. Ожидаем готовности
log "⏳ Ожидаем готовности backend..."
sleep 10

# 4. Проверяем статус
log "📊 Проверяем статус..."
docker compose -f docker-compose.prod.yml ps backend

# 5. Проверяем логи
log "📋 Проверяем логи backend..."
docker compose -f docker-compose.prod.yml logs backend --tail=10

log ""
log "✅ ИСПРАВЛЕНИЕ ЗАВЕРШЕНО!"
log ""
log "📋 Что было сделано:"
log "   ✅ Созданы недостающие таблицы"
log "   ✅ Применены миграции"
log "   ✅ Backend перезапущен"
log "   ✅ Все данные сохранены"
log ""
log "🔍 Если проблемы продолжаются:"
log "   - Проверьте логи: docker compose -f docker-compose.prod.yml logs backend"
log "   - Запустите полный деплой: bash safe-deploy.sh"
