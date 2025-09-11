# SSL Сертификаты для Quattrex

## Обзор

Этот документ описывает настройку и управление SSL сертификатами для платформы Quattrex.

## Структура файлов

```
ssl/
├── certificate.crt          # Основной SSL сертификат
├── certificate.key          # Приватный ключ
├── fullchain.crt           # Полная цепочка сертификатов (создается автоматически)
├── sectigo_intermediate.crt # Промежуточный сертификат Sectigo
├── ensure-fullchain.sh     # Скрипт для создания fullchain.crt
├── update-ssl.sh           # Скрипт для обновления SSL сертификатов
└── create-fullchain-auto.sh # Скрипт для автоматического создания в контейнере
```

## Автоматическое создание fullchain.crt

### Проблема
При деплое `fullchain.crt` может удаляться или отсутствовать, что приводит к ошибкам nginx.

### Решение
1. **На хосте**: Скрипт `ensure-fullchain.sh` автоматически создает `fullchain.crt` из `certificate.crt`
2. **В контейнере**: Nginx entrypoint автоматически создает `fullchain.crt` при запуске

## Использование

### Обновление SSL сертификатов

```bash
# Поместите новый certificate.crt в ssl/ директорию
cp /path/to/your/certificate.crt ssl/certificate.crt

# Обновите SSL сертификаты
bash ssl/update-ssl.sh
```

### Проверка SSL сертификатов

```bash
# Проверить наличие и валидность fullchain.crt
bash ssl/ensure-fullchain.sh

# Проверить информацию о сертификате
openssl x509 -in ssl/fullchain.crt -noout -subject -issuer -dates
```

### Ручное создание fullchain.crt

```bash
# Если автоматические скрипты не работают
cp ssl/certificate.crt ssl/fullchain.crt
chmod 644 ssl/fullchain.crt
```

## Интеграция с деплоем

Скрипт `deploy.sh` автоматически проверяет SSL сертификаты перед деплоем:

```bash
# Деплой с проверкой SSL
bash deploy.sh
```

## Мониторинг

### Проверка статуса nginx

```bash
# Статус контейнера
docker compose ps nginx

# Логи nginx
docker compose logs nginx

# Проверка SSL в контейнере
docker compose exec nginx ls -la /etc/nginx/ssl/
```

### Проверка SSL соединения

```bash
# Проверка SSL сертификата
openssl s_client -connect quattrex.pro:443 -servername quattrex.pro

# Проверка через curl
curl -I https://quattrex.pro
```

## Устранение неполадок

### fullchain.crt отсутствует

1. Убедитесь, что `certificate.crt` существует
2. Запустите: `bash ssl/ensure-fullchain.sh`
3. Перезапустите nginx: `docker compose restart nginx`

### SSL ошибки в nginx

1. Проверьте логи: `docker compose logs nginx`
2. Проверьте права доступа: `ls -la ssl/`
3. Проверьте валидность сертификата: `openssl x509 -in ssl/fullchain.crt -noout -text`

### Сертификат истек

1. Получите новый сертификат от CA
2. Замените `certificate.crt`
3. Запустите: `bash ssl/update-ssl.sh`

## Безопасность

- `certificate.key` должен иметь права 600
- `fullchain.crt` должен иметь права 644
- Никогда не коммитьте приватные ключи в git
- Регулярно обновляйте сертификаты

## Автоматизация

Для автоматического обновления сертификатов можно настроить cron:

```bash
# Добавить в crontab для проверки каждые 30 дней
0 0 1 */1 * /path/to/quattrex/ssl/ensure-fullchain.sh
```
