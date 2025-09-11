#!/bin/bash

# Скрипт для исправления конфигурации nginx
# Удаляет все старые конфигурации и создает чистую

echo "🔧 Исправляем конфигурацию nginx..."

# Удаляем все конфигурационные файлы
rm -f /etc/nginx/conf.d/*.conf
rm -f /etc/nginx/conf.d/default*
rm -f /etc/nginx/conf.d/app*

# Создаем чистую конфигурацию
cat > /etc/nginx/conf.d/default.conf << 'EOF'
# Upstream definitions
upstream frontend {
    server frontend:3000;
}

upstream backend {
    server backend:3001;
}

# HTTP server
server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /api/ {
        proxy_pass http://backend/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

echo "✅ Конфигурация nginx исправлена"
echo "📋 Содержимое /etc/nginx/conf.d/:"
ls -la /etc/nginx/conf.d/

echo "🔍 Проверяем синтаксис nginx:"
nginx -t

echo "✅ Готово!"
