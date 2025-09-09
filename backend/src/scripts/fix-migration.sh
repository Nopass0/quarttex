#!/bin/bash

echo "=== Исправление проблемы с миграцией ==="

# Проверяем статус миграций
echo "1. Проверка статуса миграций..."
bunx prisma migrate status

echo ""
echo "2. Попытка сброса застрявшей миграции..."

# Пытаемся отметить проблемную миграцию как примененную
bunx prisma migrate resolve --applied 20250115_add_trader_rate_source_settings

if [ $? -eq 0 ]; then
    echo "✅ Миграция успешно отмечена как примененная"
    
    echo ""
    echo "3. Применение оставшихся миграций..."
    bunx prisma migrate deploy
    
    if [ $? -eq 0 ]; then
        echo "✅ Все миграции успешно применены!"
    else
        echo "❌ Ошибка при применении миграций"
        exit 1
    fi
else
    echo "❌ Не удалось отметить миграцию как примененную"
    echo "Попробуйте запустить: bunx prisma migrate reset --force"
    echo "ВНИМАНИЕ: Это удалит все данные в базе!"
    exit 1
fi

echo ""
echo "4. Финальная проверка статуса миграций..."
bunx prisma migrate status

echo "=== Готово! ==="
