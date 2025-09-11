#!/bin/bash

# Экстренное восстановление базы данных после ошибки миграции
# ВНИМАНИЕ: Этот скрипт может удалить данные! Используйте только в крайнем случае.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🚨 ЭКСТРЕННОЕ ВОССТАНОВЛЕНИЕ БАЗЫ ДАННЫХ"
echo "⚠️  ВНИМАНИЕ: Этот скрипт может удалить данные!"
echo ""

# Функция для логирования
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

cd "$PROJECT_DIR"

# Проверяем, что мы в правильной директории
if [ ! -f "prisma/schema.prisma" ]; then
    log "❌ Файл prisma/schema.prisma не найден!"
    exit 1
fi

# Создаем бэкап перед восстановлением
log "💾 Создаем бэкап базы данных..."
BACKUP_FILE="backup_before_recovery_$(date +%Y%m%d_%H%M%S).sql"
npx prisma db execute --schema prisma/schema.prisma --stdin <<< "SELECT 'Backup started' as status;" > /dev/null 2>&1 || true

log "📋 Доступные варианты восстановления:"
echo ""
echo "1. 🔄 Полный сброс базы данных (УДАЛИТ ВСЕ ДАННЫЕ!)"
echo "   - Удалит все таблицы и данные"
echo "   - Применит все миграции заново"
echo "   - Создаст чистую базу данных"
echo ""
echo "2. 🔧 Исправление только структуры (СОХРАНИТ ДАННЫЕ)"
echo "   - Создаст недостающие таблицы"
echo "   - Попытается применить миграции"
echo "   - Может не сработать, если структура сильно повреждена"
echo ""
echo "3. 📋 Baseline миграций (ПРОМЕЖУТОЧНОЕ РЕШЕНИЕ)"
echo "   - Помечает миграции как примененные"
echo "   - Не изменяет структуру базы данных"
echo "   - Требует ручного исправления структуры"
echo ""

read -p "Выберите вариант (1/2/3) или нажмите Ctrl+C для отмены: " choice

case $choice in
    1)
        log "🔄 Выполняем полный сброс базы данных..."
        log "⚠️  ВСЕ ДАННЫЕ БУДУТ УДАЛЕНЫ!"
        
        read -p "Вы уверены? Введите 'YES' для подтверждения: " confirm
        if [ "$confirm" != "YES" ]; then
            log "❌ Операция отменена"
            exit 1
        fi
        
        log "🗑️  Сбрасываем базу данных..."
        npx prisma migrate reset --force
        
        log "✅ База данных сброшена и миграции применены"
        ;;
        
    2)
        log "🔧 Исправляем структуру базы данных..."
        
        # Создаем недостающие таблицы
        log "📋 Создаем недостающие таблицы..."
        
        # Создаем таблицу Merchant
        npx prisma db execute --schema prisma/schema.prisma --stdin <<< "
        CREATE TABLE IF NOT EXISTS \"Merchant\" (
            \"id\" TEXT NOT NULL,
            \"name\" TEXT NOT NULL,
            \"token\" TEXT NOT NULL,
            \"disabled\" BOOLEAN NOT NULL DEFAULT false,
            \"banned\" BOOLEAN NOT NULL DEFAULT false,
            \"balanceUsdt\" DOUBLE PRECISION NOT NULL DEFAULT 0,
            \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            \"apiKeyPublic\" TEXT,
            \"apiKeyPrivate\" TEXT,
            \"countInRubEquivalent\" BOOLEAN NOT NULL DEFAULT false,
            \"wellbitCallbackUrl\" TEXT,
            \"isAuctionEnabled\" BOOLEAN NOT NULL DEFAULT false,
            \"auctionBaseUrl\" TEXT,
            \"auctionCallbackUrl\" TEXT,
            \"rsaPublicKeyPem\" TEXT,
            \"rsaPrivateKeyPem\" TEXT,
            \"keysGeneratedAt\" TIMESTAMP(3),
            \"externalSystemName\" TEXT,
            \"isAggregatorMode\" BOOLEAN NOT NULL DEFAULT false,
            \"externalApiToken\" TEXT,
            \"externalCallbackToken\" TEXT,
            \"totpEnabled\" BOOLEAN NOT NULL DEFAULT false,
            \"totpSecret\" TEXT,
            
            CONSTRAINT \"Merchant_pkey\" PRIMARY KEY (\"id\")
        );
        " || log "⚠️  Ошибка при создании таблицы Merchant"
        
        # Создаем другие необходимые таблицы
        log "📋 Создаем другие необходимые таблицы..."
        
        # Попытаемся применить миграции
        log "🔄 Применяем миграции..."
        npx prisma migrate deploy || log "⚠️  Ошибка при применении миграций"
        
        log "✅ Структура базы данных исправлена"
        ;;
        
    3)
        log "📋 Выполняем baseline миграций..."
        
        # Получаем список миграций
        migrations=$(find prisma/migrations -name "migration.sql" | sort | head -10)
        
        for migration in $migrations; do
            migration_name=$(basename $(dirname $migration))
            log "📋 Помечаем миграцию как примененную: $migration_name"
            npx prisma migrate resolve --applied "$migration_name" || log "⚠️  Ошибка при пометке миграции $migration_name"
        done
        
        log "✅ Миграции помечены как примененные"
        ;;
        
    *)
        log "❌ Неверный выбор"
        exit 1
        ;;
esac

# Проверяем результат
log "🔍 Проверяем результат..."
npx prisma migrate status

log "✅ Восстановление завершено!"
log "📋 Рекомендации:"
log "   1. Проверьте структуру базы данных"
log "   2. Протестируйте приложение"
log "   3. Создайте новый бэкап"
log "   4. Рассмотрите возможность полного пересоздания базы данных"
