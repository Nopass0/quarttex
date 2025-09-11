#!/bin/bash

# Безопасное исправление ошибки с таблицей Merchant
# Создает только недостающие таблицы без удаления данных

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🔧 Безопасное исправление таблицы Merchant..."

# Функция для логирования
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

cd "$PROJECT_DIR"

# Функция для выполнения SQL
execute_sql() {
    local sql="$1"
    npx prisma db execute --schema prisma/schema.prisma --stdin <<< "$sql"
}

# 1. Проверяем, существует ли таблица Merchant
log "🔍 Проверяем существование таблицы Merchant..."

merchant_exists=$(execute_sql "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Merchant' AND table_schema = 'public');" 2>/dev/null | grep -o "true\|false" || echo "false")

if [ "$merchant_exists" = "true" ]; then
    log "✅ Таблица Merchant уже существует"
    log "🔍 Проверяем структуру таблицы..."
    execute_sql "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Merchant' AND table_schema = 'public' ORDER BY ordinal_position;"
else
    log "❌ Таблица Merchant не существует - создаем..."
    
    # 2. Создаем таблицу Merchant с минимальной структурой
    log "📋 Создаем таблицу Merchant..."
    
    execute_sql "
    CREATE TABLE \"Merchant\" (
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
    "
    
    # 3. Создаем индексы
    log "📋 Создаем индексы для таблицы Merchant..."
    
    execute_sql "CREATE UNIQUE INDEX IF NOT EXISTS \"Merchant_token_key\" ON \"Merchant\"(\"token\");"
    execute_sql "CREATE INDEX IF NOT EXISTS \"Merchant_isAuctionEnabled_idx\" ON \"Merchant\"(\"isAuctionEnabled\");"
    execute_sql "CREATE INDEX IF NOT EXISTS \"Merchant_externalSystemName_idx\" ON \"Merchant\"(\"externalSystemName\");"
    
    log "✅ Таблица Merchant создана успешно"
fi

# 4. Проверяем другие необходимые таблицы
log "🔍 Проверяем другие необходимые таблицы..."

# Проверяем таблицу Method
method_exists=$(execute_sql "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Method' AND table_schema = 'public');" 2>/dev/null | grep -o "true\|false" || echo "false")

if [ "$method_exists" = "false" ]; then
    log "❌ Таблица Method не существует - создаем..."
    
    execute_sql "
    CREATE TABLE \"Method\" (
        \"id\" TEXT NOT NULL,
        \"code\" TEXT NOT NULL,
        \"name\" TEXT NOT NULL,
        \"type\" TEXT NOT NULL,
        \"currency\" TEXT NOT NULL DEFAULT 'rub',
        \"commissionPayin\" DOUBLE PRECISION NOT NULL,
        \"commissionPayout\" DOUBLE PRECISION NOT NULL,
        \"maxPayin\" DOUBLE PRECISION NOT NULL,
        \"minPayin\" DOUBLE PRECISION NOT NULL,
        \"maxPayout\" DOUBLE PRECISION NOT NULL,
        \"minPayout\" DOUBLE PRECISION NOT NULL,
        \"chancePayin\" DOUBLE PRECISION NOT NULL,
        \"chancePayout\" DOUBLE PRECISION NOT NULL,
        \"isEnabled\" BOOLEAN NOT NULL DEFAULT true,
        \"rateSource\" TEXT NOT NULL DEFAULT 'bybit',
        
        CONSTRAINT \"Method_pkey\" PRIMARY KEY (\"id\")
    );
    "
    
    execute_sql "CREATE UNIQUE INDEX IF NOT EXISTS \"Method_code_key\" ON \"Method\"(\"code\");"
    
    log "✅ Таблица Method создана"
fi

# 5. Теперь пытаемся применить миграции
log "🔄 Пытаемся применить миграции..."

if npx prisma migrate deploy; then
    log "✅ Миграции применены успешно!"
else
    log "⚠️  Ошибка при применении миграций"
    log "🔍 Проверяем статус миграций..."
    npx prisma migrate status
fi

# 6. Проверяем финальный статус
log "🔍 Финальная проверка..."
npx prisma migrate status

log "✅ Исправление завершено!"
log "📋 Рекомендации:"
log "   1. Проверьте работу приложения"
log "   2. Создайте бэкап базы данных"
log "   3. Если проблемы продолжаются, рассмотрите полный сброс БД"
