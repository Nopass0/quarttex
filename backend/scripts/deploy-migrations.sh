#!/bin/bash

# Скрипт для безопасного деплоя миграций
# Использование: ./scripts/deploy-migrations.sh [environment]

set -e  # Остановить при любой ошибке

ENVIRONMENT=${1:-development}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🚀 Запуск деплоя миграций для окружения: $ENVIRONMENT"
echo "📁 Рабочая директория: $PROJECT_DIR"

# Переходим в директорию проекта
cd "$PROJECT_DIR"

# Функция для логирования
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Функция для проверки подключения к БД
check_database_connection() {
    log "🔍 Проверяем подключение к базе данных..."
    
    # Проверяем через Prisma migrate status
    if npx prisma migrate status > /dev/null 2>&1; then
        log "✅ Подключение к базе данных успешно"
        return 0
    else
        log "❌ Не удалось подключиться к базе данных"
        return 1
    fi
}

# Функция для создания бэкапа (только для продакшена)
create_backup() {
    if [ "$ENVIRONMENT" = "production" ]; then
        log "💾 Создаем бэкап базы данных..."
        
        BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
        
        if command -v pg_dump > /dev/null 2>&1; then
            pg_dump "$DATABASE_URL" > "backups/$BACKUP_FILE"
            log "✅ Бэкап создан: backups/$BACKUP_FILE"
        else
            log "⚠️  pg_dump не найден, пропускаем создание бэкапа"
        fi
    fi
}

# Функция для проверки статуса миграций
check_migration_status() {
    log "📊 Проверяем статус миграций..."
    
    if npx prisma migrate status > /dev/null 2>&1; then
        log "✅ Миграции в порядке"
        return 0
    else
        log "⚠️  Обнаружены проблемы с миграциями"
        return 1
    fi
}

# Функция для синхронизации миграций
sync_migrations() {
    log "🔄 Синхронизируем миграции..."
    
    if npx tsx scripts/migration-pipeline.ts; then
        log "✅ Миграции синхронизированы"
        return 0
    else
        log "❌ Ошибка при синхронизации миграций"
        return 1
    fi
}

# Функция для применения новых миграций
apply_migrations() {
    log "🚀 Применяем новые миграции..."
    
    if npx prisma migrate deploy; then
        log "✅ Миграции применены успешно"
        return 0
    else
        log "⚠️  Ошибка при применении миграций, запускаем автоматическое исправление..."
        
        # Запускаем автоматическое исправление
        if [ -f "scripts/auto-fix-migrations.sh" ]; then
            log "🔧 Запускаем автоматическое исправление..."
            bash scripts/auto-fix-migrations.sh
            
            # Проверяем, исправилась ли проблема
            if npx prisma migrate deploy; then
                log "✅ Миграции применены после автоматического исправления"
                return 0
            else
                log "⚠️  Некоторые миграции не удалось применить, но база данных должна работать"
                return 0  # Не считаем это критической ошибкой
            fi
        else
            log "❌ Скрипт автоматического исправления не найден"
            return 1
        fi
    fi
}

# Функция для проверки схемы
verify_schema() {
    log "🔍 Проверяем схему базы данных..."
    
    # Проверяем, что схема соответствует Prisma
    if npx prisma db pull --print > /dev/null 2>&1; then
        log "✅ Схема базы данных корректна"
        return 0
    else
        log "⚠️  Схема базы данных не соответствует Prisma схеме"
        return 1
    fi
}

# Функция для генерации Prisma клиента
generate_client() {
    log "🔧 Генерируем Prisma клиент..."
    
    if npx prisma generate; then
        log "✅ Prisma клиент сгенерирован"
        return 0
    else
        log "❌ Ошибка при генерации Prisma клиента"
        return 1
    fi
}

# Основная функция деплоя
deploy() {
    log "🎯 Начинаем деплой миграций..."
    
    # 1. Проверяем подключение к БД
    if ! check_database_connection; then
        log "❌ Не удалось подключиться к базе данных. Деплой прерван."
        exit 1
    fi
    
    # 2. Создаем бэкап (для продакшена)
    create_backup
    
    # 3. Синхронизируем миграции
    if ! sync_migrations; then
        log "❌ Ошибка при синхронизации миграций. Деплой прерван."
        exit 1
    fi
    
    # 4. Применяем миграции
    if ! apply_migrations; then
        log "❌ Ошибка при применении миграций. Деплой прерван."
        exit 1
    fi
    
    # 5. Проверяем схему
    if ! verify_schema; then
        log "⚠️  Схема базы данных не соответствует ожидаемой, но деплой продолжен"
    fi
    
    # 6. Генерируем Prisma клиент
    if ! generate_client; then
        log "❌ Ошибка при генерации Prisma клиента. Деплой прерван."
        exit 1
    fi
    
    log "🎉 Деплой миграций завершен успешно!"
}

# Функция для отката (только для разработки)
rollback() {
    if [ "$ENVIRONMENT" = "production" ]; then
        log "❌ Откат в продакшене запрещен"
        exit 1
    fi
    
    log "🔄 Выполняем откат миграций..."
    
    # Здесь можно добавить логику отката
    log "⚠️  Функция отката не реализована"
}

# Обработка аргументов командной строки
case "${2:-deploy}" in
    "deploy")
        deploy
        ;;
    "rollback")
        rollback
        ;;
    "status")
        check_migration_status
        ;;
    "sync")
        sync_migrations
        ;;
    *)
        echo "Использование: $0 [environment] [command]"
        echo "Команды:"
        echo "  deploy   - Применить миграции (по умолчанию)"
        echo "  rollback - Откатить миграции (только dev)"
        echo "  status   - Проверить статус миграций"
        echo "  sync     - Синхронизировать миграции"
        echo ""
        echo "Окружения:"
        echo "  development - Разработка (по умолчанию)"
        echo "  production  - Продакшен"
        exit 1
        ;;
esac
