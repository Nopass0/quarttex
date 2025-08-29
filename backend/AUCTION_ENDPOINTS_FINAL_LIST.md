# 📋 ФИНАЛЬНЫЙ СПИСОК ВСЕХ ENDPOINTS АУКЦИОННОЙ СИСТЕМЫ

## 🎯 РЕАЛИЗОВАНО СОГЛАСНО ДОКУМЕНТАЦИИ IE CLOUD SUMMIT

### Все endpoints реализованы с точными названиями полей, RSA подписями и полной интеграцией в систему расчетов.

---

## 🌐 EXTERNAL API ENDPOINTS (для внешних аукционных систем)

### 1. **Создание заказа**
```
POST /api/auction/external/CreateOrder
```

**Описание**: Создание нового заказа в аукционной системе  
**Авторизация**: RSA-SHA256 подпись (X-Signature + X-Timestamp)  

**Заголовки**:
```
Content-Type: application/json
X-Timestamp: 1706534400
X-Signature: dGVzdF9zaWduYXR1cmU=
```

**Каноничная строка**: `{timestamp}|{external_system_name}|{system_order_id}|CreateOrder`

**Тело запроса**:
```json
{
  "system_order_id": "auction-order-123",
  "currency": "RUB",
  "max_exchange_rate": 96.0,
  "max_commission": 2.5,
  "amount": 8888,
  "cancel_order_time_unix": 1706536200,
  "stop_auction_time_unix": 1706534700,
  "callback_url": "https://partner.example.com/callback",
  "allowed_payment_method": "card_number",
  "iterative_sum_search_enabled": true,
  "allowed_bank_name": "SBERBANK"
}
```

**Ответ**:
```json
{
  "is_success": true,
  "error_code": null,
  "error_message": null,
  "external_system_id": 123,
  "external_order_id": "cmewvn21p02gvikhyosoktxb3",
  "amount": 8888,
  "exchange_rate": 96.0,
  "commission": 2.5,
  "payment_details": {
    "type": "card_number",
    "name": "IVAN PETROV",
    "bank_name": "SBERBANK",
    "card": "2202206543210987",
    "transfer_info": "Перевод на карту SBERBANK"
  }
}
```

---

### 2. **Отмена заказа**
```
POST /api/auction/external/CancelOrder
```

**Описание**: Отмена существующего заказа  
**Каноничная строка**: `{timestamp}|{external_system_name}|{system_order_id}|CancelOrder`

**Тело запроса**:
```json
{
  "system_order_id": "auction-order-123",
  "external_id": "cmewvn21p02gvikhyosoktxb3",
  "reason": "too_long_response",
  "reason_message": "Ответ получен слишком поздно"
}
```

**Ответ**:
```json
{
  "is_success": true,
  "error_code": null,
  "error_message": null
}
```

---

### 3. **Получение статуса заказа**
```
POST /api/auction/external/GetStatusOrder
```

**Описание**: Проверка текущего статуса заказа  
**Каноничная строка**: `{timestamp}|{external_system_name}|{system_order_id}|GetOrderStatus`

**Тело запроса**:
```json
{
  "system_order_id": "auction-order-123",
  "external_id": "cmewvn21p02gvikhyosoktxb3"
}
```

**Ответ**:
```json
{
  "is_success": true,
  "error_code": null,
  "error_message": null,
  "status": 2
}
```

**Статусы заказов**:
- `1` - создана
- `2` - назначен трейдер  
- `3` - реквизиты назначены
- `4` - мерчант подтвердил оплату
- `5` - трейдер подтвердил оплату
- `6` - завершена
- `7` - спор
- `8` - отменена по таймауту
- `9` - отменена мерчантом
- `10` - отменена трейдером
- `11` - отменена админом
- `12` - отменена супервайзером
- `13` - отменена по результату спора

---

### 4. **Создание спора**
```
POST /api/auction/external/CreateDispute
```

**Описание**: Создание спора по заказу  
**Каноничная строка**: `{timestamp}|{external_system_name}|{system_order_id}|CreateDispute`

**Тело запроса**:
```json
{
  "system_order_id": "auction-order-123",
  "external_order_id": "cmewvn21p02gvikhyosoktxb3",
  "comment": "Средства не поступили в срок",
  "attachment_path": "https://example.com/screenshot.png",
  "type": "message",
  "new_amount": 9000
}
```

**Типы диспутов**:
- `message` - обычное сообщение
- `change_amount` - изменение суммы (требует `new_amount`)
- `dispute` - официальный спор

**Ответ**:
```json
{
  "is_success": true,
  "error_code": null,
  "error_message": null
}
```

---

## 🔄 CALLBACK ENDPOINTS

### 5. **Прием callback'ов от внешних систем**
```
POST /api/auction/callback/{merchantId}
```

**Описание**: Прием уведомлений об изменении статуса от внешних аукционных систем  
**Каноничная строка**: `{timestamp}|{external_system_name}|{order_id}|AuctionCallback`

**Параметры**: 
- `merchantId` - ID мерчанта в нашей системе

**Тело запроса**:
```json
{
  "order_id": "auction-order-123",
  "status_id": 6,
  "amount": 8888
}
```

**Ответ**:
```json
{
  "is_success": true,
  "error_code": null,
  "error_message": null
}
```

---

## ⚙️ АДМИНИСТРАТИВНЫЕ ENDPOINTS

### 6. **Включение/выключение аукционного режима**
```
PUT /api/admin/auction/toggle/{merchantId}
```

**Описание**: Настройка аукционного мерчанта  
**Авторизация**: `x-admin-key: admin-token`

**Тело запроса**:
```json
{
  "isAuctionEnabled": true,
  "auctionBaseUrl": "https://partner.example.com/api",
  "auctionCallbackUrl": "https://partner.example.com/callback",
  "externalSystemName": "test-auction-system"
}
```

**Ответ**:
```json
{
  "success": true,
  "message": "Аукционная система включена",
  "merchant": {
    "id": "merchant_123",
    "name": "Test Merchant",
    "isAuctionEnabled": true,
    "auctionBaseUrl": "https://partner.example.com/api",
    "externalSystemName": "test-auction-system",
    "keysGeneratedAt": "2025-01-29T12:00:00Z"
  }
}
```

---

### 7. **Статус аукционного мерчанта**
```
GET /api/admin/auction/status/{merchantId}
```

**Описание**: Получение настроек аукционного мерчанта  
**Авторизация**: `x-admin-key: admin-token`

**Ответ**:
```json
{
  "merchant": {
    "id": "merchant_123",
    "name": "Test Merchant",
    "isAuctionEnabled": true,
    "auctionBaseUrl": "https://partner.example.com/api",
    "externalSystemName": "test-auction-system",
    "keysGeneratedAt": "2025-01-29T12:00:00Z"
  },
  "status": {
    "hasKeys": true,
    "isFullyConfigured": true,
    "configurationSteps": {
      "auctionEnabled": true,
      "baseUrlSet": true,
      "systemNameSet": true,
      "keysGenerated": true
    }
  }
}
```

---

### 8. **Генерация RSA ключей**
```
POST /api/admin/auction/generate-keys/{merchantId}
```

**Описание**: Генерация новых RSA ключей 2048 бит для мерчанта  
**Авторизация**: `x-admin-key: admin-token`

**Ответ**:
```json
{
  "success": true,
  "message": "RSA ключи успешно сгенерированы",
  "merchant": {
    "id": "merchant_123",
    "name": "Test Merchant",
    "keysGeneratedAt": "2025-01-29T12:00:00Z"
  },
  "publicKey": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----",
  "privateKey": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----",
  "warning": "Приватный ключ показан только один раз. Сохраните его в безопасном месте."
}
```

---

### 9. **Скачивание RSA ключей**
```
GET /api/admin/auction/download-key/{merchantId}/{keyType}
```

**Описание**: Скачивание публичного или приватного ключа в формате PEM  
**Авторизация**: `x-admin-key: admin-token`

**Параметры**:
- `keyType` - `public` или `private`

**Ответ**: PEM файл для скачивания
```
Content-Type: application/x-pem-file
Content-Disposition: attachment; filename="Merchant_Name_public_key.pem"

-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----
```

---

## 🔐 СИСТЕМА RSA ПОДПИСИ

### **Алгоритм подписи**:
1. Создание канонической строки: `{timestamp}|{external_system_name}|{key_field}|{operation}`
2. Подпись RSA-SHA256 с 2048-битным ключом
3. Кодирование в Base64
4. Проверка временного окна (±120 секунд)

### **Канонические строки для каждого метода**:
- **CreateOrder**: `{timestamp}|{external_system_name}|{system_order_id}|CreateOrder`
- **CancelOrder**: `{timestamp}|{external_system_name}|{system_order_id}|CancelOrder`
- **GetStatusOrder**: `{timestamp}|{external_system_name}|{system_order_id}|GetOrderStatus`
- **CreateDispute**: `{timestamp}|{external_system_name}|{system_order_id}|CreateDispute`
- **AuctionCallback**: `{timestamp}|{external_system_name}|{order_id}|AuctionCallback`

### **Обязательные заголовки**:
```
Content-Type: application/json
X-Timestamp: {unix_timestamp_seconds}
X-Signature: {base64_rsa_sha256_signature}
```

---

## 📊 ТИПЫ ДАННЫХ

### **Методы оплаты** (`allowed_payment_method`):
- `card_number` - банковская карта
- `phone_number` - номер телефона
- `account_number` - номер счета
- `iban` - международный номер счета
- `sbp` - система быстрых платежей

### **Причины отмены** (`reason`):
- `too_long_response` - слишком долгий ответ
- `not_valid_response` - невалидный ответ
- `system_selected_another_performer` - система выбрала другого исполнителя
- `auction_timeout_after_finish` - таймаут после окончания аукциона
- `server_error` - ошибка сервера
- `other` - другая причина

### **Коды ошибок** (`error_code`):
- `signature_missing` - отсутствует подпись
- `signature_invalid` - неверная подпись
- `timestamp_invalid` - неверный timestamp
- `timestamp_expired` - истекший timestamp
- `validation_error` - ошибка валидации
- `order_not_found` - заказ не найден
- `no_available_traders` - нет доступных трейдеров
- `other` - другая ошибка

---

## 🔄 АВТОМАТИЧЕСКИЕ CALLBACK'И

### **Наша система автоматически отправляет callback'и на**:
1. `auctionCallbackUrl` (если настроен)
2. `auctionBaseUrl + "/callback"` (fallback)

### **Callback'и отправляются при**:
- ✅ Изменении статуса через API трейдера
- ✅ Подтверждении через BT-вход  
- ✅ SMS подтверждении
- ✅ Отмене/истечении сделки
- ✅ Создании диспута

### **Формат автоматических callback'ов**:
```json
{
  "order_id": "auction-order-123",
  "status_id": 6,
  "amount": 8888
}
```

**Заголовки**:
```
Content-Type: application/json
X-Timestamp: 1706534400
X-Signature: {подпись_нашим_приватным_ключом}
```

---

## 🎯 ОСОБЕННОСТИ ИНТЕГРАЦИИ

### **Тайминг аукциона**:
- Ответ на `CreateOrder` учитывается если пришел до `stop_auction_time_unix`
- Максимальный таймаут ответа: 5 секунд
- Ответ после `stop_auction_time_unix` но ≤5 сек → отправляется `CancelOrder` с `reason="too_long_response"`
- Ответ >5 сек → игнорируется

### **Безопасность**:
- Все запросы подписываются RSA-SHA256 (2048 бит)
- Проверка временного окна ±120 секунд
- Приватные ключи хранятся в БД с ограниченным доступом
- Публичные ключи доступны для скачивания

### **Интеграция с расчетами**:
- ✅ Заморозка средств: точно как в обычных сделках
- ✅ Расчет прибыли: `roundDown2(amount/rate) * feePercent`
- ✅ Разморозка: при подтверждении/отмене
- ✅ Callback'и: автоматически из всех источников

---

## 🚀 ПОЛНЫЕ URL'Ы ENDPOINTS

### **Для внешних аукционных систем**:
```
POST https://your-domain.com/api/auction/external/CreateOrder
POST https://your-domain.com/api/auction/external/CancelOrder
POST https://your-domain.com/api/auction/external/GetStatusOrder
POST https://your-domain.com/api/auction/external/CreateDispute
```

### **Для callback'ов**:
```
POST https://your-domain.com/api/auction/callback/{merchantId}
```

### **Для администрирования**:
```
PUT  https://your-domain.com/api/admin/auction/toggle/{merchantId}
GET  https://your-domain.com/api/admin/auction/status/{merchantId}
POST https://your-domain.com/api/admin/auction/generate-keys/{merchantId}
GET  https://your-domain.com/api/admin/auction/download-key/{merchantId}/{keyType}
```

---

## 💻 TYPESCRIPT ПРИМЕР ИСПОЛЬЗОВАНИЯ

### **Подпись запроса**:
```typescript
import { auctionSignatureUtils } from "@/utils/auction-signature";

async function createAuctionOrder(
  baseUrl: string, 
  request: CreateOrderRequest, 
  externalSystemName: string, 
  privateKeyPem: string
) {
  const timestamp = Math.floor(Date.now() / 1000);
  const canonical = auctionSignatureUtils.createCanonicalString(
    timestamp,
    externalSystemName,
    request.system_order_id,
    "CreateOrder"
  );
  const signature = auctionSignatureUtils.signCanonicalString(canonical, privateKeyPem);

  const response = await fetch(`${baseUrl}/CreateOrder`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Timestamp": timestamp.toString(),
      "X-Signature": signature
    },
    body: JSON.stringify(request)
  });

  return await response.json();
}
```

### **Обработка callback'а**:
```typescript
import { validateAuctionRequest } from "@/utils/auction-signature";

app.post("/auction/callback", (req, res) => {
  const validation = validateAuctionRequest(
    req.headers,
    req.body,
    process.env.EXTERNAL_PUBLIC_KEY!,
    "external-system-name",
    req.body.order_id,
    "AuctionCallback"
  );

  if (!validation.valid) {
    return res.status(400).json({
      is_success: false,
      error_code: validation.error,
      error_message: validation.message
    });
  }

  // Обработка callback'а...
  res.json({
    is_success: true,
    error_code: null,
    error_message: null
  });
});
```

---

## ✅ СТАТУС РЕАЛИЗАЦИИ

### **Компоненты**:
- ✅ **База данных**: миграции для аукционных полей
- ✅ **TypeScript типы**: точные названия полей согласно документации
- ✅ **RSA подписи**: реализация на node-forge
- ✅ **External API**: все 4 метода с валидацией
- ✅ **Callback handler**: обработка входящих уведомлений
- ✅ **Admin API**: управление мерчантами и ключами
- ✅ **Интеграция**: callback'и во все источники изменения статуса
- ✅ **Расчеты**: идентичны обычным сделкам

### **Готовность**:
🎊 **АУКЦИОННАЯ СИСТЕМА ПОЛНОСТЬЮ РЕАЛИЗОВАНА СОГЛАСНО ДОКУМЕНТАЦИИ IE CLOUD SUMMIT!**

**Все endpoints готовы к использованию с:**
- Правильными названиями полей
- RSA подписями 2048 бит
- Валидацией временных окон
- Полной интеграцией в систему расчетов
- Автоматическими callback'ами

**🚀 СИСТЕМА ГОТОВА К ПРОДАКШЕНУ!** ✨
