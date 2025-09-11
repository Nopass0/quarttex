#!/bin/bash

# Автоматическое создание fullchain.crt при запуске
# Этот скрипт должен запускаться в nginx контейнере

SSL_DIR="/etc/nginx/ssl"
FULLCHAIN_FILE="$SSL_DIR/fullchain.crt"
CERT_FILE="$SSL_DIR/certificate.crt"
INTERMEDIATE_FILE="$SSL_DIR/sectigo_intermediate.crt"

echo "🔧 Проверяем SSL сертификаты..."

# Проверяем, существует ли fullchain.crt
if [ -f "$FULLCHAIN_FILE" ]; then
    echo "✅ fullchain.crt уже существует"
    
    # Проверяем, что файл не пустой и содержит валидный сертификат
    if openssl x509 -in "$FULLCHAIN_FILE" -noout >/dev/null 2>&1; then
        echo "✅ fullchain.crt валиден"
        exit 0
    else
        echo "⚠️  fullchain.crt поврежден, пересоздаем..."
    fi
fi

# Проверяем наличие необходимых файлов
if [ ! -f "$CERT_FILE" ]; then
    echo "❌ certificate.crt не найден в $SSL_DIR"
    exit 1
fi

# Скачиваем промежуточный сертификат, если его нет
if [ ! -f "$INTERMEDIATE_FILE" ]; then
    echo "📥 Скачиваем промежуточный сертификат Sectigo..."
    curl -s "http://crt.sectigo.com/SectigoPublicServerAuthenticationCADVR36.crt" -o "$INTERMEDIATE_FILE"
    
    if [ $? -eq 0 ] && [ -f "$INTERMEDIATE_FILE" ]; then
        echo "✅ Промежуточный сертификат скачан"
    else
        echo "⚠️  Не удалось скачать промежуточный сертификат, используем только основной"
        cp "$CERT_FILE" "$FULLCHAIN_FILE"
        exit 0
    fi
fi

# Создаем fullchain.crt
echo "🔗 Создаем fullchain.crt..."
cp "$CERT_FILE" "$FULLCHAIN_FILE"

# Проверяем, что fullchain.crt создан и валиден
if [ -f "$FULLCHAIN_FILE" ] && openssl x509 -in "$FULLCHAIN_FILE" -noout >/dev/null 2>&1; then
    echo "✅ fullchain.crt успешно создан и валиден"
    
    # Показываем информацию о сертификате
    echo "📋 Информация о сертификате:"
    openssl x509 -in "$FULLCHAIN_FILE" -noout -subject -issuer -dates
    
    # Устанавливаем правильные права доступа
    chmod 644 "$FULLCHAIN_FILE"
    
    exit 0
else
    echo "❌ Ошибка при создании fullchain.crt"
    exit 1
fi
