#!/bin/bash

echo "Запуск Quattrex сервисов..."

# Проверка наличия docker
if ! command -v docker &> /dev/null; then
    echo "Docker не установлен!"
    exit 1
fi

# Определение команды docker-compose
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    DOCKER_COMPOSE="docker compose"
fi

# Проверка прав доступа к docker
if ! docker ps &> /dev/null; then
    echo "Требуются права sudo для запуска Docker контейнеров"
    DOCKER_COMPOSE="sudo $DOCKER_COMPOSE"
fi

cd /home/user/projects/quattrex

echo "Запуск контейнеров..."
$DOCKER_COMPOSE up -d

echo ""
echo "Проверка статуса контейнеров..."
$DOCKER_COMPOSE ps

echo ""
echo "✓ Сервисы запущены!"
echo ""
echo "Сайт должен быть доступен по адресам:"
echo "  HTTP:  http://quattrex.pro"
echo "  HTTPS: https://quattrex.pro"
echo ""
echo "Логи nginx: $DOCKER_COMPOSE logs nginx"
