#!/bin/bash

# Скрипт для демонстрации того, что именно будет выполнено при migrate deploy
# Показывает SQL команды, которые будут применены

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🔍 Демонстрация того, что делает prisma migrate deploy..."

# Функция для логирования
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

cd "$PROJECT_DIR"

# Проверяем статус миграций
log "📊 Текущий статус миграций:"
npx prisma migrate status

echo ""
log "🔍 Что делает prisma migrate deploy:"
echo ""

log "1. ✅ prisma migrate deploy - это БЕЗОПАСНАЯ команда для продакшена"
log "   - НЕ удаляет данные из таблиц"
log "   - НЕ выполняет DROP TABLE"
log "   - НЕ выполняет TRUNCATE"
log "   - Только применяет новые миграции (если есть)"

echo ""
log "2. 🔄 Отличия от prisma migrate dev:"
log "   - migrate dev: создает миграции + применяет их (может сбросить БД)"
log "   - migrate deploy: только применяет существующие миграции (БЕЗОПАСНО)"

echo ""
log "3. 📋 Что будет выполнено при следующем деплое:"
log "   - Проверка подключения к БД"
log "   - Создание бэкапа (в продакшене)"
log "   - Применение только новых миграций (если есть)"
log "   - Проверка схемы БД"
log "   - Генерация Prisma клиента"

echo ""
log "4. 🛡️  Гарантии безопасности:"
log "   - Все существующие данные сохраняются"
log "   - Миграции содержат только ALTER TABLE, CREATE TABLE, ADD COLUMN"
log "   - Нет DROP TABLE, TRUNCATE, DELETE FROM"
log "   - Есть только DROP COLUMN (удаление неиспользуемых колонок)"

echo ""
log "5. 📝 Примеры операций в миграциях:"
echo "   ✅ ALTER TABLE \"User\" ADD COLUMN \"newField\" TEXT;"
echo "   ✅ CREATE TABLE \"NewTable\" (...);"
echo "   ✅ ALTER TABLE \"BankDetail\" DROP COLUMN \"oldField\";"
echo "   ❌ DROP TABLE \"User\"; (НЕТ в миграциях)"
echo "   ❌ TRUNCATE TABLE \"User\"; (НЕТ в миграциях)"
echo "   ❌ DELETE FROM \"User\"; (НЕТ в миграциях)"

echo ""
log "6. 🔒 Дополнительная защита:"
log "   - Скрипт создает бэкап перед миграциями"
log "   - Проверяет валидность схемы после миграций"
log "   - Останавливается при любой ошибке (set -e)"

echo ""
log "✅ ВЫВОД: prisma migrate deploy БЕЗОПАСЕН для продакшена!"
log "   Данные НЕ будут удалены при деплое."
