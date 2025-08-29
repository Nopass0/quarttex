# Обновления системы агрегаторов v2.1

## Дата: 29.01.2025
## Статус: ✅ Реализовано

## Ключевые изменения

### 1. Передача и получение реквизитов ✅

#### При создании сделки теперь:
- **Передаем** метод платежа: `paymentMethod: "SBP" | "C2C"`
- **Передаем** код банка: `bankType: "SBERBANK"` и т.д.
- **Получаем** реквизиты в ответе:
  - Для SBP: `phoneNumber` (номер телефона)
  - Для C2C: `cardNumber` (номер карты)
  - Дополнительно: `bankName`, `recipientName`, `bankCode`

#### Обновленные интерфейсы:
```typescript
// Запрос на создание сделки
interface AggregatorDealRequest {
  ourDealId: string;
  status: string;
  amount: number;
  merchantRate: number;
  paymentMethod: "SBP" | "C2C";  // НОВОЕ
  bankType?: string;              // НОВОЕ
  callbackUrl: string;
  // ...
}

// Ответ с реквизитами
interface AggregatorDealResponse {
  accepted: boolean;
  partnerDealId?: string;
  requisites?: {                  // НОВОЕ
    bankName?: string;
    cardNumber?: string;          // для C2C
    phoneNumber?: string;         // для SBP
    recipientName?: string;
    bankCode?: string;
    additionalInfo?: string;
  };
  dealDetails?: {                 // НОВОЕ
    // полная информация о сделке
  };
}
```

### 2. Новый endpoint получения информации о сделке ✅

**GET {baseUrl}/deals/{partnerDealId}**

Возвращает актуальную информацию о сделке включая:
- Текущий статус
- Реквизиты
- Время создания/обновления/истечения
- Метод платежа

### 3. Обновленный базовый URL ✅

Везде изменено на: **https://chspay.pro/api**
- В документации
- В коде сервисов
- В OpenAPI спецификации

### 4. Полный справочник констант ✅

#### Все статусы сделок:
- `CREATED` - Создана
- `IN_PROGRESS` - В обработке
- `READY` - Завершена успешно
- `CANCELED` - Отменена
- `EXPIRED` - Истекла
- `DISPUTE` - Спор
- `MILK` - Специальный статус

#### Все банки (50+ банков):
- SBERBANK - Сбербанк
- VTB - ВТБ
- ALFABANK - Альфа-Банк
- TINKOFF - Тинькофф
- GAZPROMBANK - Газпромбанк
- ... и еще 45+ банков

#### Все методы платежа:
- sbp - Система быстрых платежей
- c2c - Card to Card
- upi - UPI (Индия)
- c2ckz - Card to Card (Казахстан)
- ... и еще 15+ методов

### 5. Обработка реквизитов в системе ✅

#### Сохранение реквизитов:
- В поле `assetOrBank` транзакции сохраняется строка с реквизитами
- В `metadata` транзакции сохраняется полная информация

#### Передача мерчантам:
- Для Wellbit: реквизиты в поле `payment_credential`
- Для остальных: реквизиты в поле `paymentDetails` и объект `requisites`

## Измененные файлы

### Сервисы:
- `backend/src/services/aggregator-v2.service.ts` - добавлена работа с реквизитами и метод getDealInfo()
- `backend/src/services/fallback-routing.service.ts` - передача реквизитов при fallback

### Маршруты:
- `backend/src/routes/merchant/index.ts` - обработка и передача реквизитов мерчантам

### Документация:
- `backend/docs/aggregator-integration-v2.1.md` - полная документация с примерами
- `backend/docs/aggregator-openapi-v2.yaml` - OpenAPI спецификация

## Примеры использования

### Создание SBP сделки:
```json
// Запрос от нас
{
  "ourDealId": "deal-123",
  "amount": 10000,
  "paymentMethod": "SBP",
  "bankType": "SBERBANK",
  "merchantRate": 100.5,
  "callbackUrl": "https://chspay.pro/api/aggregators/callback"
}

// Ответ от агрегатора
{
  "accepted": true,
  "partnerDealId": "AGG-001",
  "requisites": {
    "bankName": "Сбербанк",
    "phoneNumber": "+79001234567",
    "recipientName": "Иван И."
  }
}
```

### Создание C2C сделки:
```json
// Запрос от нас
{
  "ourDealId": "deal-456",
  "amount": 20000,
  "paymentMethod": "C2C",
  "bankType": "TINKOFF",
  "merchantRate": 101,
  "callbackUrl": "https://chspay.pro/api/aggregators/callback"
}

// Ответ от агрегатора
{
  "accepted": true,
  "partnerDealId": "AGG-002",
  "requisites": {
    "bankName": "Тинькофф",
    "cardNumber": "4377111111111111",
    "recipientName": "Петр П."
  }
}
```

## Требования к агрегаторам

1. **ОБЯЗАТЕЛЬНО** возвращать реквизиты при создании сделки
2. Для SBP - поле `phoneNumber`
3. Для C2C - поле `cardNumber`
4. Рекомендуется указывать `bankName` и `recipientName`
5. Поддерживать endpoint получения информации о сделке
6. Время ответа не более 2 секунд

## Тестирование

В личном кабинете агрегатора доступны инструменты для тестирования:
- Отправка тестовых сделок с разными методами платежа
- Проверка наличия реквизитов в ответе
- Измерение времени ответа и SLA

## Миграция

Для существующих агрегаторов:
1. Обновить endpoints для поддержки `paymentMethod`
2. Добавить возврат реквизитов в ответе
3. Реализовать endpoint получения информации о сделке
4. Обновить callback URL на https://chspay.pro/api/aggregators/callback

## Контакты

- Техническая поддержка: support@chspay.pro
- Документация: https://chspay.pro/api/docs
- Личный кабинет: https://chspay.pro/aggregator
