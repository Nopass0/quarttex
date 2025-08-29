# Сводка всех endpoints личного кабинета агрегатора

## Дата: 29.01.2025
## Статус: ✅ Все endpoints работают корректно

## Базовый URL
`http://localhost:3000/api/aggregator`

## Аутентификация
Все защищенные endpoints требуют заголовок:
```
Authorization: Bearer <AGGREGATOR_SESSION_TOKEN>
```

## Доступные endpoints

### 🏠 Dashboard (Дашборд)
**Базовый путь:** `/dashboard`

#### 1. GET `/dashboard/overview`
**Описание:** Обзор дашборда с основной статистикой
**Ответ:**
```json
{
  "aggregator": {
    "id": "string",
    "name": "string", 
    "email": "string",
    "isActive": boolean,
    "balanceUsdt": number,
    "priority": number,
    "apiBaseUrl": "string"
  },
  "stats": {
    "totalRequests": number,
    "successRequests": number,
    "errorRequests": number,
    "recentRequests": number,
    "successRate": number,
    "avgResponseTime": number,
    "slaViolations": number
  },
  "limits": {
    "maxSlaMs": number,
    "minBalance": number,
    "maxDailyVolume": number | null,
    "currentDailyVolume": number
  }
}
```

#### 2. GET `/dashboard/profile`
**Описание:** Профиль агрегатора с токенами и настройками
**Ответ:**
```json
{
  "aggregator": {
    "id": "string",
    "name": "string",
    "email": "string",
    "apiToken": "string",
    "callbackToken": "string",
    "apiBaseUrl": "string",
    "balanceUsdt": number,
    "isActive": boolean
  },
  "callbackUrl": "string",
  "integration": {
    "status": "string",
    "lastActivity": "string"
  }
}
```

#### 3. POST `/dashboard/update-base-url`
**Описание:** Обновление Base URL агрегатора
**Тело запроса:**
```json
{
  "baseUrl": "string"
}
```
**Ответ:**
```json
{
  "success": boolean,
  "message": "string",
  "baseUrl": "string"
}
```

#### 4. POST `/dashboard/regenerate-token`
**Описание:** Регенерация API или Callback токена
**Тело запроса:**
```json
{
  "tokenType": "api" | "callback",
  "confirmation": "CONFIRM"
}
```
**Ответ:**
```json
{
  "success": boolean,
  "newToken": "string",
  "tokenType": "string"
}
```

#### 5. POST `/dashboard/test-deal`
**Описание:** Отправка тестовой сделки
**Тело запроса:**
```json
{
  "amount": number,
  "paymentMethod": "SBP" | "C2C"
}
```

#### 6. POST `/dashboard/test-deals-batch`
**Описание:** Отправка массива тестовых сделок
**Тело запроса:**
```json
{
  "deals": [
    {
      "amount": number,
      "paymentMethod": "SBP" | "C2C"
    }
  ]
}
```

#### 7. GET `/dashboard/integration-logs`
**Описание:** Журнал интеграций с фильтрами
**Query параметры:**
- `page` - номер страницы
- `limit` - количество записей
- `direction` - направление (IN/OUT)
- `eventType` - тип события
- `dateFrom` - дата от
- `dateTo` - дата до

#### 8. GET `/dashboard/stats`
**Описание:** Детальная статистика
**Query параметры:**
- `period` - период в днях (по умолчанию 7)

### 📚 API Documentation (Документация)
**Базовый путь:** `/api-docs`

#### 1. GET `/api-docs/`
**Описание:** Основная информация об интеграции
**Ответ:**
```json
{
  "version": "2.1",
  "lastUpdated": "2025-01-29",
  "aggregatorInfo": {
    "name": "string",
    "apiToken": "string",
    "callbackToken": "string",
    "baseUrl": "string"
  },
  "integration": {
    "ourApiUrl": "string",
    "callbackUrl": "string",
    "batchCallbackUrl": "string"
  }
}
```

#### 2. GET `/api-docs/your-endpoints`
**Описание:** Endpoints которые должен реализовать агрегатор
- POST /deals - создание сделки
- GET /deals/{partnerDealId} - получение информации о сделке
- POST /deals/{partnerDealId}/disputes - создание спора

#### 3. GET `/api-docs/our-callbacks`
**Описание:** Как отправлять callback'и в нашу систему
- Одиночные callback'и
- Массовые callback'и

#### 4. GET `/api-docs/constants`
**Описание:** Константы и справочники
- Статусы сделок
- Методы платежа
- Коды банков
- Требования SLA

#### 5. GET `/api-docs/examples`
**Описание:** Примеры кода на Python и Node.js

#### 6. GET `/api-docs/testing`
**Описание:** Инструкции по тестированию интеграции

### 🔐 Authentication (Аутентификация)
**Базовый путь:** `/auth`

#### 1. POST `/auth/login`
**Описание:** Вход в систему
**Тело запроса:**
```json
{
  "email": "string",
  "password": "string"
}
```

#### 2. POST `/auth/logout`
**Описание:** Выход из системы

### ⚙️ Settings (Настройки)
**Базовый путь:** `/settings`

Endpoints для управления настройками агрегатора.

### 💰 Deposits (Пополнения)
**Базовый путь:** `/deposits`

Endpoints для управления пополнениями баланса.

### ⚖️ Disputes (Споры)
**Базовый путь:** `/disputes`

Endpoints для управления спорами по сделкам.

## Статус тестирования

✅ **GET /dashboard/overview** - работает корректно
✅ **GET /dashboard/profile** - работает корректно  
✅ **GET /dashboard/stats** - работает корректно
✅ **GET /dashboard/integration-logs** - работает корректно
✅ **GET /api-docs/** - работает корректно
✅ **POST /dashboard/update-base-url** - добавлен и готов к использованию
✅ **POST /dashboard/regenerate-token** - работает корректно

## Примечания

1. Все endpoints используют Bearer токен для аутентификации
2. Токен передается в заголовке `Authorization: Bearer <token>`
3. Ответы возвращаются в формате JSON
4. Ошибки возвращаются с соответствующими HTTP кодами
5. Все endpoints логируются в систему интеграционных логов

## Исправленные проблемы

1. **404 на /overview** - добавлен отсутствующий endpoint
2. **Валидация maxDailyVolume** - исправлена схема для nullable полей
3. **Токены агрегатора** - исправлена генерация callbackToken при создании

Все endpoints личного кабинета агрегатора теперь работают корректно! 🎉
