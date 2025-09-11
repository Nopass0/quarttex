#!/bin/bash

# Скрипт для исправления ошибки миграции P3018
# Проблема: таблица Merchant не существует, но миграция пытается создать внешний ключ к ней

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🔧 Исправление ошибки миграции P3018..."

# Функция для логирования
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

cd "$PROJECT_DIR"

# Функция для выполнения SQL запросов
execute_sql() {
    local sql="$1"
    npx prisma db execute --schema prisma/schema.prisma --stdin <<< "$sql"
}

# 1. Проверяем, какие таблицы существуют
log "📊 Проверяем существующие таблицы..."
execute_sql "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" > /tmp/existing_tables.txt
cat /tmp/existing_tables.txt

# 2. Проверяем статус миграций
log "📋 Проверяем статус миграций..."
npx prisma migrate status

# 3. Проверяем, есть ли таблица Merchant
if grep -q "Merchant" /tmp/existing_tables.txt; then
    log "✅ Таблица Merchant существует"
else
    log "❌ Таблица Merchant НЕ существует - это причина ошибки!"
    
    # 4. Проверяем, какие миграции были применены
    log "🔍 Проверяем историю миграций..."
    execute_sql "SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at;" > /tmp/migration_history.txt
    cat /tmp/migration_history.txt
    
    # 5. Ищем миграцию, которая создает таблицу Merchant
    log "🔍 Ищем миграцию создания таблицы Merchant..."
    merchant_migration=$(find prisma/migrations -name "*.sql" -exec grep -l "CREATE TABLE.*Merchant" {} \; | head -1)
    
    if [ -n "$merchant_migration" ]; then
        log "📁 Найдена миграция: $merchant_migration"
        log "📄 Содержимое миграции:"
        head -20 "$merchant_migration"
    else
        log "❌ Миграция создания таблицы Merchant не найдена!"
    fi
fi

# 6. Предлагаем решения
log ""
log "🛠️  ВОЗМОЖНЫЕ РЕШЕНИЯ:"
log ""
log "1. 🔄 Сброс миграций (ОСТОРОЖНО - может удалить данные!):"
log "   npx prisma migrate reset --force"
log ""
log "2. 🔧 Ручное исправление базы данных:"
log "   - Создать недостающие таблицы вручную"
log "   - Пометить миграции как примененные"
log ""
log "3. 📋 Baseline миграций:"
log "   npx prisma migrate resolve --applied <migration_name>"
log ""
log "4. 🔍 Диагностика проблемы:"
log "   - Проверить, была ли база данных инициализирована правильно"
log "   - Проверить порядок применения миграций"

# 7. Создаем скрипт для безопасного исправления
log ""
log "📝 Создаем скрипт для безопасного исправления..."

cat > /tmp/fix_merchant_table.sql << 'EOF'
-- Проверяем, существует ли таблица Merchant
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Merchant' AND table_schema = 'public') THEN
        RAISE NOTICE 'Таблица Merchant не существует, создаем...';
        
        -- Создаем таблицу Merchant (базовая структура)
        CREATE TABLE "Merchant" (
            "id" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "token" TEXT NOT NULL,
            "disabled" BOOLEAN NOT NULL DEFAULT false,
            "banned" BOOLEAN NOT NULL DEFAULT false,
            "balanceUsdt" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "apiKeyPublic" TEXT,
            "apiKeyPrivate" TEXT,
            "countInRubEquivalent" BOOLEAN NOT NULL DEFAULT false,
            "wellbitCallbackUrl" TEXT,
            "isAuctionEnabled" BOOLEAN NOT NULL DEFAULT false,
            "auctionBaseUrl" TEXT,
            "auctionCallbackUrl" TEXT,
            "rsaPublicKeyPem" TEXT,
            "rsaPrivateKeyPem" TEXT,
            "keysGeneratedAt" TIMESTAMP(3),
            "externalSystemName" TEXT,
            "isAggregatorMode" BOOLEAN NOT NULL DEFAULT false,
            "externalApiToken" TEXT,
            "externalCallbackToken" TEXT,
            "merchantRequestLogs" TEXT[],
            "merchantStaff" TEXT[],
            "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
            "totpSecret" TEXT,
            "rateSources" TEXT[],
            "aggregatorMerchants" TEXT[],
            
            CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
        );
        
        -- Создаем уникальный индекс для token
        CREATE UNIQUE INDEX "Merchant_token_key" ON "Merchant"("token");
        
        -- Создаем индексы
        CREATE INDEX "Merchant_isAuctionEnabled_idx" ON "Merchant"("isAuctionEnabled");
        CREATE INDEX "Merchant_externalSystemName_idx" ON "Merchant"("externalSystemName");
        
        RAISE NOTICE 'Таблица Merchant создана успешно';
    ELSE
        RAISE NOTICE 'Таблица Merchant уже существует';
    END IF;
END $$;
EOF

log "✅ Скрипт исправления создан: /tmp/fix_merchant_table.sql"
log ""
log "🚀 Для исправления выполните:"
log "   npx prisma db execute --schema prisma/schema.prisma --file /tmp/fix_merchant_table.sql"
log ""
log "⚠️  ВНИМАНИЕ: Это исправление создаст только базовую структуру таблицы Merchant."
log "   После этого нужно будет применить все миграции заново."

# Очистка временных файлов
rm -f /tmp/existing_tables.txt /tmp/migration_history.txt
