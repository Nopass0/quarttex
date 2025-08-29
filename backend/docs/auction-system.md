# Аукционная система для внешних мерчантов

Реализация поддержки внешних мерчантов по «аукционной» схеме через HTTP POST JSON API с RSA-подписью (SHA256, ключ 2048).

## Обзор

Аукционная система позволяет внешним системам отправлять нам заказы через API endpoints. Мы принимаем трафик от мерчанта как обычно, но дополнительно предоставляем API для внешних аукционных систем и уведомляем их об изменениях статусов.

**Архитектура**:
1. Внешние системы отправляют нам запросы на создание/управление заказами
2. Мы обрабатываем заказы через наш обычный флоу
3. Мы отправляем callback'и внешним системам об изменениях статусов

## Основные компоненты

### 1. База данных

Добавлены новые поля к модели `Merchant`:

```sql
-- Поля аукционной системы
isAuctionEnabled     BOOLEAN DEFAULT false
auctionBaseUrl       TEXT
rsaPublicKeyPem      TEXT  
rsaPrivateKeyPem     TEXT
keysGeneratedAt      TIMESTAMP(3)
externalSystemName   TEXT
```

### 2. RSA подпись

**Алгоритм**: RSA-SHA256, ключ 2048 бит
**Формат ключей**: 
- Приватный: PEM PKCS#8
- Публичный: PEM X.509

**Каноничная строка**:
```
{timestamp}|{external_system_name}|{key_field}|{operation}
```

**Заголовки**:
```http
X-Timestamp: <unix-utc-seconds>
X-Signature: <base64(RSA-SHA256(canonical))>
Content-Type: application/json
```

### 3. Временные рамки

- **Максимальный таймаут ответа**: 5 секунд
- **Окно валидности timestamp**: ±120 секунд
- **stop_auction_time_unix**: время окончания аукциона
- **cancel_order_time_unix**: время отмены заказа

## API Endpoints

### Наши endpoints для внешних систем:

#### 1. CreateOrder - Создание заказа
```http
POST /api/auction/external/CreateOrder
```

**Request**:
```json
{
  "system_order_id": "string",
  "currency": "string", 
  "max_exchange_rate": 0.0,
  "max_commission": 0.0,
  "amount": 0.0,
  "cancel_order_time_unix": 0,
  "stop_auction_time_unix": 0,
  "callback_url": "https://...",
  "allowed_payment_method": "card_number|phone_number|account_number|iban|sbp",
  "iterative_sum_search_enabled": true,
  "allowed_bank_name": "string (optional)"
}
```

**Response**:
```json
{
  "is_success": true,
  "error_code": null,
  "error_message": null,
  "external_system_id": 123,
  "external_order_id": "uuid-string",
  "amount": 1000.0,
  "exchange_rate": 75.25,
  "commission": 1.5,
  "payment_details": {
    "type": "sbp",
    "phone_number": "+79001234567",
    "bank_name": "Сбербанк",
    "name": "ООО Компания"
  }
}
```

#### 2. CancelOrder - Отмена заказа
```http
POST /api/auction/external/CancelOrder
```

#### 3. GetStatusOrder - Получение статуса
```http
POST /api/auction/external/GetStatusOrder
```

#### 4. CreateDispute - Создание спора
```http
POST /api/auction/external/CreateDispute
```

### Callback'и которые мы отправляем:

Мы отправляем уведомления внешним системам на их callback URL при изменении статуса заказов.

## Админка

### Управление аукционными мерчантами

#### Включение аукционной системы
```http
PUT /api/admin/auction/toggle/{merchantId}
```

**Request**:
```json
{
  "isAuctionEnabled": true,
  "auctionBaseUrl": "https://partner.example.com/api",
  "externalSystemName": "partner-system"
}
```

#### Генерация RSA ключей
```http
POST /api/admin/auction/generate-keys/{merchantId}
```

**Response**:
```json
{
  "success": true,
  "message": "RSA ключи успешно сгенерированы",
  "merchant": {
    "id": "merchant-id",
    "name": "Merchant Name",
    "keysGeneratedAt": "2025-01-29T12:00:00Z"
  },
  "publicKey": "-----BEGIN PUBLIC KEY-----...",
  "privateKey": "-----BEGIN PRIVATE KEY-----...",
  "warning": "Приватный ключ показан только один раз"
}
```

#### Скачивание ключей
```http
GET /api/admin/auction/download-key/{merchantId}/{keyType}
```

Где `keyType` = `public` | `private`

#### Статус конфигурации
```http
GET /api/admin/auction/status/{merchantId}
```

## Интеграция в создание сделок

При создании транзакции через `/api/merchant/transactions/in` система автоматически определяет, является ли мерчант аукционным, и переключается на соответствующий флоу.

```typescript
// Middleware проверки
.use(auctionMerchantGuard())

// В обработчике
if (isAuctionMerchant) {
  // Аукционный флоу
  const auctionResult = await auctionIntegrationService.processAuctionOrder(
    merchant.id,
    transactionData,
    auctionParams
  );
  
  return {
    ...standardResponse,
    auction: {
      systemOrderId: auctionResult.systemOrderId,
      externalOrderId: auctionResult.auctionResult.externalOrderId,
      paymentDetails: auctionResult.auctionResult.paymentDetails,
    }
  };
}
```

## Примеры использования

### 1. Настройка мерчанта

```bash
# 1. Включить аукционную систему
curl -X PUT "https://api.chasepay.pro/admin/auction/toggle/merchant-id" \
  -H "x-admin-key: YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "isAuctionEnabled": true,
    "auctionBaseUrl": "https://partner.example.com/api",
    "externalSystemName": "partner-system"
  }'

# 2. Сгенерировать ключи
curl -X POST "https://api.chasepay.pro/admin/auction/generate-keys/merchant-id" \
  -H "x-admin-key: YOUR_ADMIN_KEY"

# 3. Скачать публичный ключ
curl "https://api.chasepay.pro/admin/auction/download-key/merchant-id/public" \
  -H "x-admin-key: YOUR_ADMIN_KEY" \
  -o merchant_public_key.pem
```

### 2. Создание подписи (Node.js)

```typescript
import crypto from "crypto";

function signCanonicalString(canonicalString: string, privateKeyPem: string): string {
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(canonicalString, "utf8");
  return sign.sign(privateKeyPem, "base64");
}

function createCanonicalString(
  timestamp: number,
  externalSystemName: string, 
  keyField: string,
  operation: string
): string {
  return `${timestamp}|${externalSystemName}|${keyField}|${operation}`;
}

// Пример использования
const timestamp = Math.floor(Date.now() / 1000);
const canonical = createCanonicalString(
  timestamp,
  "partner-system",
  "order-123",
  "CreateOrder"
);
const signature = signCanonicalString(canonical, privateKeyPem);

const headers = {
  "Content-Type": "application/json",
  "X-Timestamp": timestamp.toString(),
  "X-Signature": signature
};
```

### 3. Обработка callback

```typescript
// Внешняя система отправляет callback
const callbackData = {
  order_id: "order-123",
  status_id: 6, // завершена
  amount: 1000
};

const timestamp = Math.floor(Date.now() / 1000);
const canonical = `${timestamp}|partner-system|order-123|AuctionCallback`;
const signature = signCanonicalString(canonical, privateKeyPem);

fetch("https://api.chasepay.pro/auction/callback/merchant-id", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Timestamp": timestamp.toString(),
    "X-Signature": signature
  },
  body: JSON.stringify(callbackData)
});
```

## Статусы заказов

| ID | Описание | Внутренний статус |
|----|----------|-------------------|
| 1  | создана | CREATED |
| 2  | назначен трейдер | IN_PROGRESS |
| 3  | реквизиты назначены | IN_PROGRESS |
| 4  | мерч подтвердил оплату | IN_PROGRESS |
| 5  | трейдер подтвердил оплату | IN_PROGRESS |
| 6  | завершена | READY |
| 7  | спор | DISPUTE |
| 8  | отменена по таймауту | EXPIRED |
| 9  | отменена мерчантом | CANCELED |
| 10 | отменена трейдером | CANCELED |
| 11 | отменена админом | CANCELED |
| 12 | отменена супервайзером | CANCELED |
| 13 | отменена по результату спора | CANCELED |

## Коды ошибок

- `signature_missing` - отсутствует подпись
- `signature_invalid` - неверная подпись  
- `timestamp_invalid` - неверный формат времени
- `timestamp_expired` - время истекло
- `validation_error` - ошибка валидации
- `order_not_found` - заказ не найден
- `other` - прочие ошибки

## Тестирование

### Запуск тестов
```bash
# Unit тесты
bun test src/tests/auction.test.ts

# Интеграционный тест
bun run src/scripts/test-auction-system.ts

# С очисткой тестовых данных
bun run src/scripts/test-auction-system.ts --cleanup
```

### Тестовые endpoints
```http
GET /api/auction/callback/test/{merchantId}
```

## Безопасность

1. **Проверка подписи**: Все запросы должны содержать валидную RSA подпись
2. **Временные окна**: Timestamp должен быть в пределах ±120 секунд
3. **Хранение ключей**: Приватные ключи хранятся в БД с ограниченным доступом
4. **Логирование**: Приватные ключи не логируются
5. **HTTPS**: Все запросы только по HTTPS

## Мониторинг

Система логирует:
- Все входящие и исходящие запросы
- Время ответа внешних систем
- Ошибки валидации подписей
- Статистику аукционов

Логи доступны в админке и через системы мониторинга.

## Миграция

Для включения аукционной системы для существующего мерчанта:

1. Включить флаг `isAuctionEnabled`
2. Указать `auctionBaseUrl` и `externalSystemName`  
3. Сгенерировать RSA ключи
4. Передать публичный ключ внешней системе
5. Настроить внешнюю систему на отправку callback'ов

Все существующие сделки и расчёты остаются без изменений.
