#!/bin/bash

# Скрипт для проверки безопасности миграций
# Проверяет, что миграции не содержат опасных операций

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
MIGRATIONS_DIR="$PROJECT_DIR/prisma/migrations"

echo "🔍 Проверка безопасности миграций..."

# Функция для логирования
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Опасные SQL команды, которые могут привести к потере данных
DANGEROUS_PATTERNS=(
    "DROP TABLE"
    "TRUNCATE TABLE"
    "DELETE FROM.*WHERE.*1=1"
    "DELETE FROM.*WHERE.*true"
    "DELETE FROM.*WHERE.*1"
    "DROP DATABASE"
    "DROP SCHEMA"
    "ALTER TABLE.*DROP.*CASCADE"
    "DROP.*CASCADE"
)

# Функция для проверки файла миграции
check_migration_file() {
    local file="$1"
    local filename=$(basename "$file")
    
    log "Проверяем: $filename"
    
    # Проверяем на наличие опасных паттернов
    for pattern in "${DANGEROUS_PATTERNS[@]}"; do
        if grep -qi "$pattern" "$file"; then
            log "⚠️  ОБНАРУЖЕН ОПАСНЫЙ ПАТТЕРН в $filename: $pattern"
            grep -ni "$pattern" "$file"
            return 1
        fi
    done
    
    # Проверяем на наличие DROP COLUMN без IF EXISTS
    if grep -qi "DROP COLUMN" "$file" && ! grep -qi "DROP COLUMN.*IF EXISTS" "$file"; then
        log "⚠️  DROP COLUMN без IF EXISTS в $filename (может быть безопасно, но требует внимания)"
        grep -ni "DROP COLUMN" "$file"
    fi
    
    return 0
}

# Проверяем все файлы миграций
log "📁 Проверяем миграции в $MIGRATIONS_DIR"

if [ ! -d "$MIGRATIONS_DIR" ]; then
    log "❌ Директория миграций не найдена: $MIGRATIONS_DIR"
    exit 1
fi

# Находим все SQL файлы миграций
migration_files=$(find "$MIGRATIONS_DIR" -name "*.sql" | sort)

if [ -z "$migration_files" ]; then
    log "⚠️  Файлы миграций не найдены"
    exit 0
fi

# Проверяем каждый файл
unsafe_migrations=0
total_migrations=0

for file in $migration_files; do
    total_migrations=$((total_migrations + 1))
    if ! check_migration_file "$file"; then
        unsafe_migrations=$((unsafe_migrations + 1))
    fi
done

log "📊 Результаты проверки:"
log "   Всего миграций: $total_migrations"
log "   Небезопасных: $unsafe_migrations"

if [ $unsafe_migrations -eq 0 ]; then
    log "✅ Все миграции безопасны для применения"
    
    # Дополнительная проверка: что именно будет применено
    log ""
    log "🔍 Проверяем статус миграций..."
    cd "$PROJECT_DIR"
    
    if npx prisma migrate status >/dev/null 2>&1; then
        log "✅ База данных синхронизирована с миграциями"
        log "ℹ️  prisma migrate deploy применит только новые миграции (если есть)"
    else
        log "⚠️  Проблемы с синхронизацией миграций"
        npx prisma migrate status
    fi
    
    exit 0
else
    log "❌ Обнаружены небезопасные миграции!"
    log "   Перед деплоем необходимо проверить эти миграции вручную"
    exit 1
fi
