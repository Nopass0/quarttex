# Документация по интеграции с агрегаторами v2.0

## Оглавление
1. [Общая информация](#общая-информация)
2. [Аутентификация](#аутентификация)
3. [API Endpoints (наша сторона)](#api-endpoints-наша-сторона)
4. [API Endpoints (ваша сторона)](#api-endpoints-ваша-сторона)
5. [Справочники констант](#справочники-констант)
6. [Требования и SLA](#требования-и-sla)
7. [Тестирование интеграции](#тестирование-интеграции)
8. [Примеры кода](#примеры-кода)

## Общая информация

Данная документация описывает протокол взаимодействия между нашей платформой и системами агрегаторов для обработки платежных транзакций.

### Основные принципы
- **Идемпотентность**: Все операции должны быть идемпотентными
- **Безопасность**: Все запросы должны быть подписаны токенами
- **SLA**: Время ответа не должно превышать 2 секунд
- **Формат**: Все данные передаются в формате JSON

### Схема взаимодействия
```
1. Мерчант → Наша система: создание транзакции
2. Наша система → Агрегатор: создание сделки (если нет доступных трейдеров)
3. Агрегатор → Наша система: callback об изменении статуса
4. Наша система → Мерчант: callback об изменении статуса
```

## Аутентификация

### Токены

Каждому агрегатору выдаются два токена:

1. **API Token** - для подписи исходящих запросов от нас к вам
2. **Callback Token** - для подписи входящих callback'ов от вас к нам

### Заголовки авторизации

#### Для запросов от нас к вам:
```http
Authorization: Bearer <API_TOKEN>
```

#### Для callback'ов от вас к нам:
```http
Authorization: Bearer <CALLBACK_TOKEN>
```
или
```http
X-Aggregator-Token: <CALLBACK_TOKEN>
```

## API Endpoints (наша сторона)

### 1. Callback для обновления статуса сделки

**Endpoint:** `POST /api/aggregators/callback`

**Описание:** Endpoint для приема уведомлений об изменении статуса или суммы сделки.

**Заголовки:**
```http
Authorization: Bearer <CALLBACK_TOKEN>
Content-Type: application/json
```

**Тело запроса:**
```json
{
  "ourDealId": "string",        // Обязательно: ID сделки в нашей системе
  "status": "string",           // Опционально: новый статус
  "amount": number,             // Опционально: новая сумма
  "partnerDealId": "string",    // Опционально: ваш ID сделки
  "updatedAt": "ISO-8601",      // Опционально: время обновления
  "reason": "string",           // Опционально: причина изменения
  "metadata": {}                // Опционально: дополнительные данные
}
```

**Возможные статусы:**
- `CREATED` - Сделка создана
- `IN_PROGRESS` - В обработке
- `READY` - Успешно завершена
- `CANCELED` - Отменена
- `EXPIRED` - Истекла
- `DISPUTE` - Спор
- `MILK` - Специальный статус

**Успешный ответ (200 OK):**
```json
{
  "status": "accepted",
  "ourDealId": "string",
  "message": "Callback processed successfully"
}
```

**Ответ при ошибке (400/500):**
```json
{
  "status": "error",
  "ourDealId": "string",
  "error": "Error description"
}
```

### 2. Массовый callback

**Endpoint:** `POST /api/aggregators/callback/batch`

**Описание:** Обработка до 100 callback'ов одним запросом.

**Тело запроса:**
```json
[
  {
    "ourDealId": "deal-1",
    "status": "READY",
    "amount": 1000
  },
  {
    "ourDealId": "deal-2",
    "status": "CANCELED",
    "reason": "User cancelled"
  }
  // ... до 100 объектов
]
```

**Успешный ответ (200 OK):**
```json
{
  "status": "accepted",
  "processed": 2,
  "results": [
    {
      "ourDealId": "deal-1",
      "status": "accepted",
      "message": "Status updated"
    },
    {
      "ourDealId": "deal-2",
      "status": "accepted",
      "message": "Status updated"
    }
  ]
}
```

## API Endpoints (ваша сторона)

### 1. Создание сделки

**Endpoint:** `POST {baseUrl}/deals`

**Описание:** Создание новой сделки в системе агрегатора.

**Заголовки от нас:**
```http
Authorization: Bearer <API_TOKEN>
Content-Type: application/json
Idempotency-Key: <UUID>
```

**Тело запроса от нас:**
```json
{
  "ourDealId": "string",        // Наш ID сделки
  "status": "NEW",              // Начальный статус
  "amount": 10000,              // Сумма в копейках/центах
  "merchantRate": 100.5,        // Курс для мерчанта
  "partnerDealId": "string",    // Опционально: если вы заранее генерируете ID
  "callbackUrl": "string",      // URL для отправки callback'ов
  "metadata": {                 // Дополнительная информация
    "methodType": "sbp",
    "bankType": "SBERBANK",
    "merchantName": "Example Merchant"
  }
}
```

**Ожидаемый ответ (200 OK):**
```json
{
  "accepted": true,             // Обязательно
  "partnerDealId": "string",    // Рекомендуется: ваш ID сделки
  "message": "string"           // Опционально: сообщение
}
```

**Ответ при отказе:**
```json
{
  "accepted": false,
  "message": "Reason for rejection"
}
```

### 2. Создание спора

**Endpoint:** `POST {baseUrl}/deals/{partnerDealId}/disputes`

**Описание:** Инициация спора по сделке.

**Заголовки от нас:**
```http
Authorization: Bearer <API_TOKEN>
Content-Type: application/json
```

**Тело запроса от нас:**
```json
{
  "ourDealId": "string",        // Наш ID сделки
  "message": "string",          // Текст спора
  "attachments": [              // Массив URL файлов
    "https://example.com/file1.jpg",
    "https://example.com/file2.pdf"
  ]
}
```

**Ожидаемый ответ (200 OK):**
```json
{
  "accepted": true,
  "message": "Dispute created"
}
```

## Справочники констант

### Статусы транзакций (Status)

| Код | Описание | Использование |
|-----|----------|---------------|
| `CREATED` | Создана | Начальный статус |
| `IN_PROGRESS` | В обработке | Транзакция обрабатывается |
| `READY` | Завершена | Успешное завершение |
| `CANCELED` | Отменена | Отмена пользователем/системой |
| `EXPIRED` | Истекла | Превышен таймаут |
| `DISPUTE` | Спор | Открыт спор по транзакции |
| `MILK` | Специальный | Специальный статус системы |

### Типы методов платежа (MethodType)

| Код | Описание |
|-----|----------|
| `sbp` | Система быстрых платежей |
| `c2c` | Card to Card |
| `upi` | UPI (Индия) |
| `spay` | Samsung Pay |
| `apay` | Apple Pay |
| `crypto` | Криптовалюта |
| И другие... |

### Типы банков (BankType)

| Код | Название |
|-----|----------|
| `SBERBANK` | Сбербанк |
| `VTB` | ВТБ |
| `ALFABANK` | Альфа-Банк |
| `RAIFFEISEN` | Райффайзенбанк |
| `GAZPROMBANK` | Газпромбанк |
| И другие... |

Полный список доступен в схеме БД: `enum BankType`

## Требования и SLA

### Требования к производительности
- **Максимальное время ответа**: 2000 мс
- **Рекомендуемое время ответа**: < 500 мс
- **При превышении SLA**: запрос считается неуспешным, система переходит к следующему агрегатору

### Идемпотентность
- Все операции должны быть идемпотентными
- Используйте заголовок `Idempotency-Key` для предотвращения дублирования
- При повторном запросе с тем же ключом возвращайте кешированный результат

### Безопасность
- Все соединения должны использовать HTTPS
- Токены должны храниться безопасно и не логироваться
- Регулярная ротация токенов рекомендуется

### Обработка ошибок
- При недоступности endpoint'а система автоматически переключится на следующего агрегатора
- Все ошибки должны возвращать понятные сообщения
- HTTP коды ответов должны соответствовать стандартам

## Тестирование интеграции

### Личный кабинет агрегатора

В личном кабинете доступны инструменты для тестирования:

1. **Отправка одиночной мок-сделки**
   - Позволяет отправить тестовую сделку на ваш endpoint
   - Показывает заголовки, тело запроса и ответа
   - Измеряет время ответа и проверяет SLA

2. **Отправка пакета мок-сделок**
   - Тестирование производительности
   - Отправка до 10 сделок одновременно
   - Статистика успешности и времени ответа

3. **Просмотр журнала интеграций**
   - История всех запросов и ответов
   - Фильтрация по типам событий, датам, статусам
   - Детальная информация о каждом запросе

### Тестовые сценарии

#### Сценарий 1: Успешная сделка
```bash
1. Отправьте мок-сделку через ЛК
2. Ваша система должна вернуть accepted: true
3. Отправьте callback со статусом IN_PROGRESS
4. Отправьте callback со статусом READY
```

#### Сценарий 2: Отмена сделки
```bash
1. Отправьте мок-сделку через ЛК
2. Ваша система должна вернуть accepted: true
3. Отправьте callback со статусом CANCELED с указанием причины
```

#### Сценарий 3: Проверка SLA
```bash
1. Отправьте пакет из 5 мок-сделок
2. Все ответы должны быть получены в течение 2 секунд
3. Проверьте в журнале интеграций отметки о нарушении SLA
```

## Примеры кода

### Python - отправка callback
```python
import requests
import json

def send_callback(deal_id, status, amount=None):
    url = "https://api.chase.com/api/aggregators/callback"
    headers = {
        "Authorization": "Bearer YOUR_CALLBACK_TOKEN",
        "Content-Type": "application/json"
    }
    
    data = {
        "ourDealId": deal_id,
        "status": status
    }
    
    if amount:
        data["amount"] = amount
    
    response = requests.post(url, json=data, headers=headers)
    return response.json()

# Пример использования
result = send_callback("deal-123", "READY", 10000)
print(result)
```

### Node.js - обработка создания сделки
```javascript
const express = require('express');
const app = express();

app.post('/deals', (req, res) => {
    const authHeader = req.headers['authorization'];
    
    // Проверка токена
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.substring(7);
    if (token !== process.env.EXPECTED_API_TOKEN) {
        return res.status(401).json({ error: 'Invalid token' });
    }
    
    const { ourDealId, amount, merchantRate, callbackUrl } = req.body;
    
    // Валидация
    if (!ourDealId || !amount || !callbackUrl) {
        return res.status(400).json({
            accepted: false,
            message: 'Missing required fields'
        });
    }
    
    // Создание сделки в вашей системе
    const partnerDealId = generateDealId();
    saveDeal({
        ourDealId,
        partnerDealId,
        amount,
        merchantRate,
        callbackUrl
    });
    
    // Успешный ответ
    res.json({
        accepted: true,
        partnerDealId,
        message: 'Deal created successfully'
    });
});
```

### PHP - массовая отправка callback'ов
```php
<?php
function sendBatchCallbacks($callbacks) {
    $url = 'https://api.chase.com/api/aggregators/callback/batch';
    
    $headers = [
        'Authorization: Bearer YOUR_CALLBACK_TOKEN',
        'Content-Type: application/json'
    ];
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($callbacks));
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return [
        'success' => $httpCode === 200,
        'response' => json_decode($response, true)
    ];
}

// Пример использования
$callbacks = [
    ['ourDealId' => 'deal-1', 'status' => 'READY'],
    ['ourDealId' => 'deal-2', 'status' => 'CANCELED', 'reason' => 'User cancelled']
];

$result = sendBatchCallbacks($callbacks);
?>
```

## Контакты и поддержка

При возникновении вопросов по интеграции обращайтесь:
- Техническая поддержка: support@chase.com
- Документация API: https://api.chase.com/docs
- Личный кабинет: https://aggregator.chase.com

## История изменений

### v2.0 (29.01.2025)
- Полный рефакторинг системы агрегаторов
- Добавлена система приоритетов и fallback маршрутизация
- Новый личный кабинет с инструментами тестирования
- Улучшенная система логирования и аудита
- Поддержка массовых callback'ов
- Автоматическое управление приоритетами на основе метрик
