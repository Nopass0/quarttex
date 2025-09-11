#!/bin/bash

# Скрипт для быстрого фикса деплоя Quattrex
# Использование: ./fix-deployment.sh

echo "🔧 Quattrex Deployment Fix Script"
echo "=================================="

# Перейти в директорию проекта
cd /quattrex

echo "📁 Переходим в директорию проекта..."

# Создать .env файл с правильной DATABASE_URL
echo "🔧 Создаем .env файл с правильной DATABASE_URL..."
cat > .env << 'EOF'
DATABASE_URL=postgres://neondb_owner:npg_QUjnlT5zcFg3@ep-broad-shadow-a21mjc86-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=your-super-secret-jwt-key-change-this
NODE_ENV=production
POSTGRES_USER=neondb_owner
POSTGRES_PASSWORD=npg_QUjnlT5zcFg3
POSTGRES_DB=neondb
POSTGRES_HOST=ep-broad-shadow-a21mjc86-pooler.eu-central-1.aws.neon.tech
POSTGRES_PORT=5432
NEXT_PUBLIC_API_URL=https://quattrex.pro/api
SLACK_WEBHOOK_URL=
EOF

echo "✅ .env файл создан"

# Проверить что .env файл создался
echo "🔍 Проверяем .env файл..."
if [ -f ".env" ]; then
  echo "✅ .env файл найден"
  echo "📋 DATABASE_URL установлен: $(grep -q 'DATABASE_URL=' .env && echo 'YES' || echo 'NO')"
else
  echo "❌ Ошибка: .env файл не создан!"
  exit 1
fi

# Остановить все контейнеры
echo "🛑 Останавливаем все контейнеры..."
docker compose -f docker-compose.prod.yml down

# Запустить контейнеры заново
echo "🚀 Запускаем контейнеры заново..."
docker compose -f docker-compose.prod.yml up -d --build

# Подождать немного
echo "⏳ Ждем запуска контейнеров..."
sleep 30

# Проверить статус контейнеров
echo "📊 Проверяем статус контейнеров..."
docker ps

# Проверить переменные окружения в backend контейнере
echo "🔍 Проверяем переменные окружения в backend контейнере..."
docker exec quattrex_backend printenv | grep DATABASE_URL

# Проверить логи backend
echo "📋 Проверяем логи backend..."
docker logs quattrex_backend --tail 20

# Проверить доступность API
echo "🌐 Проверяем доступность API..."
curl -f http://localhost:3001/api/health || echo "⚠️ Backend API недоступен"

echo ""
echo "✅ Фикс завершен!"
echo "🌐 Приложение должно быть доступно по адресу: https://quattrex.pro"
echo "📊 Статус контейнеров:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
