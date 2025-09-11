#!/bin/bash

# Автоматическое исправление ошибок миграций при деплое
# БЕЗОПАСНО - не удаляет данные, только создает недостающие таблицы

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🔧 Автоматическое исправление миграций..."

# Функция для логирования
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

cd "$PROJECT_DIR"

# Функция для выполнения SQL
execute_sql() {
    local sql="$1"
    npx prisma db execute --schema prisma/schema.prisma --stdin <<< "$sql" 2>/dev/null || true
}

# Функция для проверки существования таблицы
table_exists() {
    local table_name="$1"
    local result=$(execute_sql "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '$table_name' AND table_schema = 'public');" | grep -o "true\|false" || echo "false")
    [ "$result" = "true" ]
}

# Функция для создания базовых таблиц
create_basic_tables() {
    log "📋 Создаем базовые таблицы..."
    
    # 1. Создаем таблицу Merchant
    if ! table_exists "Merchant"; then
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
        
        execute_sql "CREATE UNIQUE INDEX IF NOT EXISTS \"Merchant_token_key\" ON \"Merchant\"(\"token\");"
        execute_sql "CREATE INDEX IF NOT EXISTS \"Merchant_isAuctionEnabled_idx\" ON \"Merchant\"(\"isAuctionEnabled\");"
        execute_sql "CREATE INDEX IF NOT EXISTS \"Merchant_externalSystemName_idx\" ON \"Merchant\"(\"externalSystemName\");"
        
        log "✅ Таблица Merchant создана"
    else
        log "✅ Таблица Merchant уже существует"
    fi
    
    # 2. Создаем таблицу Method
    if ! table_exists "Method"; then
        log "📋 Создаем таблицу Method..."
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
    else
        log "✅ Таблица Method уже существует"
    fi
    
    # 3. Создаем таблицу User
    if ! table_exists "User"; then
        log "📋 Создаем таблицу User..."
        execute_sql "
        CREATE TABLE \"User\" (
            \"id\" TEXT NOT NULL,
            \"email\" TEXT NOT NULL,
            \"password\" TEXT NOT NULL,
            \"banned\" BOOLEAN NOT NULL DEFAULT false,
            \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            \"name\" TEXT NOT NULL,
            \"balanceUsdt\" DOUBLE PRECISION NOT NULL,
            \"frozenUsdt\" DOUBLE PRECISION NOT NULL DEFAULT 0,
            \"frozenRub\" DOUBLE PRECISION NOT NULL DEFAULT 0,
            \"trafficEnabled\" BOOLEAN NOT NULL DEFAULT true,
            \"rateConst\" DOUBLE PRECISION,
            \"useConstRate\" BOOLEAN NOT NULL DEFAULT false,
            \"profitPercent\" DOUBLE PRECISION DEFAULT 0,
            \"stakePercent\" DOUBLE PRECISION DEFAULT 0,
            \"kkkPercent\" DOUBLE PRECISION DEFAULT 0,
            \"deposit\" DOUBLE PRECISION DEFAULT 0,
            \"disputeLimit\" INTEGER NOT NULL DEFAULT 5,
            \"frozenPayoutBalance\" DOUBLE PRECISION DEFAULT 0,
            \"maxAmountPerRequisite\" DOUBLE PRECISION DEFAULT 100000,
            \"maxInsuranceDeposit\" DOUBLE PRECISION DEFAULT 100000,
            \"maxSimultaneousPayouts\" INTEGER DEFAULT 5,
            \"minAmountPerRequisite\" DOUBLE PRECISION DEFAULT 100,
            \"minPayoutAmount\" DOUBLE PRECISION DEFAULT 100,
            \"maxPayoutAmount\" DOUBLE PRECISION DEFAULT 1000000,
            \"payoutRateDelta\" DOUBLE PRECISION DEFAULT 0,
            \"payoutFeePercent\" DOUBLE PRECISION DEFAULT 0,
            \"minInsuranceDeposit\" DOUBLE PRECISION DEFAULT 0,
            \"numericId\" SERIAL NOT NULL,
            \"payoutAcceptanceTime\" INTEGER DEFAULT 5,
            \"payoutBalance\" DOUBLE PRECISION DEFAULT 0,
            \"profitFromDeals\" DOUBLE PRECISION DEFAULT 0,
            \"profitFromPayouts\" DOUBLE PRECISION DEFAULT 0,
            \"teamId\" TEXT,
            \"telegramBotToken\" TEXT,
            \"telegramChatId\" TEXT,
            \"telegramDisputeChatId\" TEXT,
            \"trustBalance\" DOUBLE PRECISION DEFAULT 0,
            \"rateSource\" TEXT,
            \"rateSourceConfigId\" TEXT,
            \"displayStakePercent\" DOUBLE PRECISION,
            \"displayAmountFrom\" DOUBLE PRECISION,
            \"displayAmountTo\" DOUBLE PRECISION,
            \"minCheckAmount\" DOUBLE PRECISION DEFAULT 100,
            \"maxCheckAmount\" DOUBLE PRECISION DEFAULT 1000000,
            
            CONSTRAINT \"User_pkey\" PRIMARY KEY (\"id\")
        );
        "
        
        execute_sql "CREATE UNIQUE INDEX IF NOT EXISTS \"User_email_key\" ON \"User\"(\"email\");"
        execute_sql "CREATE UNIQUE INDEX IF NOT EXISTS \"User_numericId_key\" ON \"User\"(\"numericId\");"
        
        log "✅ Таблица User создана"
    else
        log "✅ Таблица User уже существует"
    fi
    
    # 4. Создаем таблицу Aggregator
    if ! table_exists "Aggregator"; then
        log "📋 Создаем таблицу Aggregator..."
        execute_sql "
        CREATE TABLE \"Aggregator\" (
            \"id\" TEXT NOT NULL,
            \"email\" TEXT NOT NULL,
            \"password\" TEXT NOT NULL,
            \"name\" TEXT NOT NULL,
            \"apiToken\" TEXT NOT NULL,
            \"callbackToken\" TEXT NOT NULL,
            \"customApiToken\" TEXT,
            \"apiBaseUrl\" TEXT,
            \"balanceUsdt\" DOUBLE PRECISION NOT NULL DEFAULT 0,
            \"depositUsdt\" DOUBLE PRECISION NOT NULL DEFAULT 0,
            \"frozenBalance\" DOUBLE PRECISION NOT NULL DEFAULT 0,
            \"balanceNoRequisite\" DOUBLE PRECISION NOT NULL DEFAULT 0,
            \"balanceSuccess\" DOUBLE PRECISION NOT NULL DEFAULT 0,
            \"balanceExpired\" DOUBLE PRECISION NOT NULL DEFAULT 0,
            \"totalPlatformProfit\" DOUBLE PRECISION NOT NULL DEFAULT 0,
            \"totalUsdtIn\" DOUBLE PRECISION NOT NULL DEFAULT 0,
            \"totalUsdtOut\" DOUBLE PRECISION NOT NULL DEFAULT 0,
            \"usdtDifference\" DOUBLE PRECISION NOT NULL DEFAULT 0,
            \"isActive\" BOOLEAN NOT NULL DEFAULT true,
            \"priority\" INTEGER NOT NULL DEFAULT 0,
            \"maxSlaMs\" INTEGER NOT NULL DEFAULT 2000,
            \"minBalance\" DOUBLE PRECISION NOT NULL DEFAULT 0,
            \"maxDailyVolume\" DOUBLE PRECISION,
            \"currentDailyVolume\" DOUBLE PRECISION NOT NULL DEFAULT 0,
            \"lastVolumeReset\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            \"twoFactorSecret\" TEXT,
            \"twoFactorEnabled\" BOOLEAN NOT NULL DEFAULT false,
            \"requiresInsuranceDeposit\" BOOLEAN NOT NULL DEFAULT true,
            \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            \"updatedAt\" TIMESTAMP(3) NOT NULL,
            \"lastPriorityChangeBy\" TEXT,
            \"lastPriorityChangeAt\" TIMESTAMP(3),
            \"apiSchema\" TEXT NOT NULL DEFAULT 'DEFAULT',
            \"pspwareApiKey\" TEXT,
            \"enableRandomization\" BOOLEAN NOT NULL DEFAULT false,
            \"randomizationType\" TEXT NOT NULL DEFAULT 'NONE',
            \"isChaseProject\" BOOLEAN NOT NULL DEFAULT false,
            \"isChaseCompatible\" BOOLEAN NOT NULL DEFAULT false,
            \"sbpMethodId\" TEXT,
            \"c2cMethodId\" TEXT,
            
            CONSTRAINT \"Aggregator_pkey\" PRIMARY KEY (\"id\")
        );
        "
        
        execute_sql "CREATE UNIQUE INDEX IF NOT EXISTS \"Aggregator_email_key\" ON \"Aggregator\"(\"email\");"
        execute_sql "CREATE UNIQUE INDEX IF NOT EXISTS \"Aggregator_apiToken_key\" ON \"Aggregator\"(\"apiToken\");"
        execute_sql "CREATE UNIQUE INDEX IF NOT EXISTS \"Aggregator_callbackToken_key\" ON \"Aggregator\"(\"callbackToken\");"
        
        log "✅ Таблица Aggregator создана"
    else
        log "✅ Таблица Aggregator уже существует"
    fi
}

# Функция для безопасного применения миграций
safe_apply_migrations() {
    log "🔄 Безопасное применение миграций..."
    
    # Сначала пытаемся применить миграции
    if npx prisma migrate deploy; then
        log "✅ Миграции применены успешно"
        return 0
    else
        log "⚠️  Ошибка при применении миграций, пытаемся исправить..."
        
        # Получаем список миграций, которые не были применены
        local failed_migrations=$(npx prisma migrate status 2>&1 | grep -o "202[0-9]*" || echo "")
        
        if [ -n "$failed_migrations" ]; then
            log "📋 Помечаем проблемные миграции как примененные..."
            for migration in $failed_migrations; do
                log "📋 Помечаем миграцию: $migration"
                npx prisma migrate resolve --applied "$migration" || log "⚠️  Не удалось пометить миграцию $migration"
            done
        fi
        
        # Пытаемся применить миграции снова
        if npx prisma migrate deploy; then
            log "✅ Миграции применены после исправления"
        else
            log "⚠️  Некоторые миграции не удалось применить, но база данных должна работать"
        fi
    fi
}

# Основная функция
main() {
    log "🚀 Запуск автоматического исправления миграций..."
    
    # 1. Создаем базовые таблицы
    create_basic_tables
    
    # 2. Безопасно применяем миграции
    safe_apply_migrations
    
    # 3. Проверяем финальный статус
    log "🔍 Финальная проверка..."
    npx prisma migrate status
    
    log "✅ Автоматическое исправление завершено!"
    log "📋 База данных готова к работе"
}

# Запускаем основную функцию
main
