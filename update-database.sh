#!/bin/bash

echo "🔄 Обновление базы данных Quattrex..."

# Переход в директорию backend
cd backend

# Генерация Prisma клиента
echo "📦 Генерация Prisma клиента..."
npx prisma generate

# Применение миграций
echo "🚀 Применение миграций..."
npx prisma migrate deploy

# Проверка состояния миграций
echo "✅ Проверка состояния миграций..."
npx prisma migrate status

echo "✨ База данных успешно обновлена!"