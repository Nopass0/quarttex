# Документация по интеграции с агрегаторами v2.1

## Оглавление
1. [Общая информация](#общая-информация)
2. [Аутентификация](#аутентификация)
3. [API Endpoints которые должен реализовать агрегатор](#api-endpoints-которые-должен-реализовать-агрегатор)
4. [API Endpoints нашей системы для агрегаторов](#api-endpoints-нашей-системы-для-агрегаторов)
5. [Полный справочник констант](#полный-справочник-констант)
6. [Требования и SLA](#требования-и-sla)
7. [Тестирование интеграции](#тестирование-интеграции)
8. [Примеры кода](#примеры-кода)

## Общая информация

Данная документация описывает протокол взаимодействия между платформой ChsPay и системами агрегаторов для обработки платежных транзакций.

### Основные принципы
- **Идемпотентность**: Все операции должны быть идемпотентными
- **Безопасность**: Все запросы должны быть подписаны токенами
- **SLA**: Время ответа не должно превышать 2 секунд
- **Формат**: Все данные передаются в формате JSON
- **URL нашего API**: https://chspay.pro/api

### Схема взаимодействия
```
1. Мерчант → ChsPay: создание транзакции
2. ChsPay → Агрегатор: создание сделки с методом платежа (SBP/C2C)
3. Агрегатор → ChsPay: возврат реквизитов для оплаты
4. Агрегатор → ChsPay: callback об изменении статуса
5. ChsPay → Мерчант: callback об изменении статуса
```

## Аутентификация

### Токены

Каждому агрегатору выдаются два токена:

1. **API Token** - для подписи исходящих запросов от ChsPay к агрегатору
2. **Callback Token** - для подписи входящих callback'ов от агрегатора к ChsPay

### Заголовки авторизации

#### Для запросов от ChsPay к агрегатору:
```http
Authorization: Bearer <API_TOKEN>
```

#### Для callback'ов от агрегатора к ChsPay:
```http
Authorization: Bearer <CALLBACK_TOKEN>
```
или
```http
X-Aggregator-Token: <CALLBACK_TOKEN>
```

## API Endpoints которые должен реализовать агрегатор

### 1. Создание сделки

**Endpoint:** `POST {baseUrl}/deals`

**Описание:** Создание новой сделки в системе агрегатора с возвратом реквизитов для оплаты.

**Заголовки от ChsPay:**
```http
Authorization: Bearer <API_TOKEN>
Content-Type: application/json
Idempotency-Key: <UUID>
```

**Тело запроса от ChsPay:**
```json
{
  "ourDealId": "deal-123-456",        // ID сделки в системе ChsPay
  "status": "NEW",                     // Начальный статус
  "amount": 10000,                     // Сумма в копейках (100.00 руб)
  "merchantRate": 100.5,               // Курс для мерчанта
  "paymentMethod": "SBP",              // Метод платежа: "SBP" или "C2C"
  "bankType": "SBERBANK",              // Код банка (см. справочник)
  "partnerDealId": "optional-id",      // Опционально: предварительный ID
  "callbackUrl": "https://chspay.pro/api/aggregators/callback",  // URL для callback'ов
  "metadata": {                        // Дополнительная информация
    "methodType": "sbp",
    "bankType": "SBERBANK",
    "merchantName": "Example Merchant"
  }
}
```

**Ожидаемый успешный ответ (200 OK):**
```json
{
  "accepted": true,                    // Обязательно: принята ли сделка
  "partnerDealId": "AGG-2024-001",     // Обязательно: ID сделки у агрегатора
  "message": "Deal created",           // Опционально: сообщение
  "requisites": {                     // ОБЯЗАТЕЛЬНО: реквизиты для оплаты
    "bankName": "Сбербанк",           // Название банка
    "bankCode": "SBERBANK",           // Код банка
    "cardNumber": "4111111111111111", // Номер карты (для C2C)
    "phoneNumber": "+79001234567",    // Номер телефона (для SBP)
    "recipientName": "Иван Иванов",   // Имя получателя
    "additionalInfo": "Комментарий"   // Дополнительная информация
  },
  "dealDetails": {                    // Опционально: полная информация о сделке
    "id": "AGG-2024-001",
    "amount": 10000,
    "status": "NEW",
    "createdAt": "2024-01-29T12:00:00Z",
    "expiresAt": "2024-01-29T12:30:00Z",
    "paymentMethod": "SBP",
    "metadata": {}
  }
}
```

**Ответ при отказе:**
```json
{
  "accepted": false,
  "message": "Insufficient balance / Invalid payment method / etc"
}
```

### 2. Получение информации о сделке

**Endpoint:** `GET {baseUrl}/deals/{partnerDealId}`

**Описание:** Получение актуальной информации о сделке.

**Заголовки от ChsPay:**
```http
Authorization: Bearer <API_TOKEN>
```

**Ожидаемый ответ (200 OK):**
```json
{
  "id": "AGG-2024-001",               // ID сделки у агрегатора
  "ourDealId": "deal-123-456",        // ID сделки в ChsPay
  "status": "IN_PROGRESS",            // Текущий статус
  "amount": 10000,                    // Сумма
  "paymentMethod": "SBP",             // Метод платежа
  "requisites": {                     // Реквизиты
    "bankName": "Сбербанк",
    "phoneNumber": "+79001234567",
    "recipientName": "Иван Иванов"
  },
  "createdAt": "2024-01-29T12:00:00Z",
  "updatedAt": "2024-01-29T12:05:00Z",
  "expiresAt": "2024-01-29T12:30:00Z",
  "metadata": {}
}
```

### 3. Создание спора по сделке

**Endpoint:** `POST {baseUrl}/deals/{partnerDealId}/disputes`

**Описание:** Инициация спора по сделке.

**Заголовки от ChsPay:**
```http
Authorization: Bearer <API_TOKEN>
Content-Type: application/json
```

**Тело запроса от ChsPay:**
```json
{
  "ourDealId": "deal-123-456",        // ID сделки в ChsPay
  "message": "Платеж не получен",     // Текст спора
  "attachments": [                    // Массив URL файлов
    "https://chspay.pro/files/screenshot1.jpg",
    "https://chspay.pro/files/receipt.pdf"
  ]
}
```

**Ожидаемый ответ (200 OK):**
```json
{
  "accepted": true,
  "disputeId": "DISPUTE-001",         // Опционально: ID спора
  "message": "Dispute created"
}
```

## API Endpoints нашей системы для агрегаторов

### 1. Callback для обновления статуса сделки

**Endpoint:** `POST https://chspay.pro/api/aggregators/callback`

**Описание:** Endpoint для приема уведомлений об изменении статуса или суммы сделки.

**Заголовки от агрегатора:**
```http
Authorization: Bearer <CALLBACK_TOKEN>
Content-Type: application/json
```

**Тело запроса от агрегатора:**
```json
{
  "ourDealId": "deal-123-456",        // Обязательно: ID сделки в ChsPay
  "status": "READY",                  // Опционально: новый статус
  "amount": 9500,                     // Опционально: новая сумма
  "partnerDealId": "AGG-2024-001",    // Опционально: ваш ID сделки
  "updatedAt": "2024-01-29T12:10:00Z", // Опционально: время обновления
  "reason": "Partial payment",         // Опционально: причина изменения
  "metadata": {}                      // Опционально: дополнительные данные
}
```

**Успешный ответ (200 OK):**
```json
{
  "status": "accepted",
  "ourDealId": "deal-123-456",
  "message": "Callback processed successfully"
}
```

### 2. Массовый callback

**Endpoint:** `POST https://chspay.pro/api/aggregators/callback/batch`

**Описание:** Обработка до 100 callback'ов одним запросом.

**Тело запроса от агрегатора:**
```json
[
  {
    "ourDealId": "deal-1",
    "status": "READY",
    "amount": 10000
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

## Полный справочник констант

### Статусы транзакций (Status)

| Код | Описание | Когда используется |
|-----|----------|-------------------|
| `CREATED` | Создана | Начальный статус при создании сделки |
| `IN_PROGRESS` | В обработке | Пользователь начал процесс оплаты |
| `READY` | Завершена успешно | Платеж получен и подтвержден |
| `CANCELED` | Отменена | Отмена пользователем или системой |
| `EXPIRED` | Истекла | Превышено время ожидания оплаты |
| `DISPUTE` | Спор | Открыт спор по транзакции |
| `MILK` | Специальный статус | Используется для особых случаев |

### Методы платежа

| Код | Описание |
|-----|----------|
| `SBP` | Система быстрых платежей (по номеру телефона) |
| `C2C` | Card to Card (перевод с карты на карту) |

### Полный список банков (BankType)

| Код | Название банка |
|-----|---------------|
| `SBERBANK` | Сбербанк |
| `VTB` | ВТБ |
| `ALFABANK` | Альфа-Банк |
| `RAIFFEISEN` | Райффайзенбанк |
| `GAZPROMBANK` | Газпромбанк |
| `POCHTABANK` | Почта Банк |
| `ROSSELKHOZBANK` | Россельхозбанк |
| `URALSIB` | Уралсиб |
| `LOKOBANK` | Локо-Банк |
| `AKBARS` | Ак Барс Банк |
| `MKB` | Московский Кредитный Банк |
| `SPBBANK` | Банк Санкт-Петербург |
| `MTSBANK` | МТС Банк |
| `PROMSVYAZBANK` | Промсвязьбанк |
| `OZONBANK` | Озон Банк |
| `RENAISSANCE` | Ренессанс Кредит |
| `OTPBANK` | ОТП Банк |
| `AVANGARD` | Авангард |
| `VLADBUSINESSBANK` | Владбизнесбанк |
| `TAVRICHESKIY` | Таврический |
| `FORABANK` | Фора-Банк |
| `BCSBANK` | БКС Банк |
| `HOMECREDIT` | Хоум Кредит |
| `BBRBANK` | ББР Банк |
| `CREDITEUROPE` | Кредит Европа Банк |
| `RNKB` | РНКБ |
| `UBRIR` | УБРиР |
| `GENBANK` | Генбанк |
| `SINARA` | Банк Синара |
| `ABSOLUTBANK` | Абсолют Банк |
| `TINKOFF` | Тинькофф |
| `SOVCOMBANK` | Совкомбанк |
| `CITIBANK` | Ситибанк |
| `RUSSIANSTANDARD` | Русский Стандарт |
| `UNICREDITBANK` | ЮниКредит Банк |
| `ROSBANK` | Росбанк |
| `TRUSTBANK` | Траст |
| `OPENBANK` | Открытие |
| `PSB` | ПСБ |
| `QIWIBANK` | QIWI Банк |
| `RSHB` | Россельхозбанк |
| `SMP` | СМП Банк |
| `SOLIDARNOST` | Солидарность |
| `CENTRINVEST` | Центр-инвест |
| `PRIMBANK` | Приморье |
| `MINBANK` | МИнБанк |

### Типы методов платежа (MethodType) - расширенный список

| Код | Описание |
|-----|----------|
| `sbp` | Система быстрых платежей |
| `c2c` | Card to Card |
| `upi` | UPI (Индия) |
| `c2ckz` | Card to Card (Казахстан) |
| `c2cuz` | Card to Card (Узбекистан) |
| `c2caz` | Card to Card (Азербайджан) |
| `spay` | Samsung Pay |
| `tpay` | T-Pay |
| `vpay` | V-Pay |
| `apay` | Apple Pay |
| `m2ctj` | Mobile to Card (Таджикистан) |
| `m2ntj` | Mobile to Network (Таджикистан) |
| `m2csber` | Mobile to Card (Сбербанк) |
| `m2ctbank` | Mobile to Card (Т-Банк) |
| `connectc2c` | Connect Card to Card |
| `connectsbp` | Connect SBP |
| `nspk` | НСПК (Мир) |
| `ecom` | E-commerce |
| `crypto` | Криптовалюта |

## Требования и SLA

### Требования к производительности
- **Максимальное время ответа**: 2000 мс
- **Рекомендуемое время ответа**: < 500 мс
- **При превышении SLA**: запрос считается неуспешным, система переходит к следующему агрегатору

### Требования к реквизитам
- Для метода **SBP**: обязательно поле `phoneNumber` в реквизитах
- Для метода **C2C**: обязательно поле `cardNumber` в реквизитах
- Рекомендуется указывать `bankName` и `recipientName`

### Идемпотентность
- Все операции должны быть идемпотентными
- Используйте заголовок `Idempotency-Key` для предотвращения дублирования
- При повторном запросе с тем же ключом возвращайте кешированный результат

### Безопасность
- Все соединения должны использовать HTTPS
- Токены должны храниться безопасно и не логироваться
- Регулярная ротация токенов рекомендуется

## Тестирование интеграции

### Личный кабинет агрегатора

URL: https://chspay.pro/aggregator

В личном кабинете доступны инструменты для тестирования:

1. **Отправка одиночной мок-сделки**
   - Позволяет отправить тестовую сделку на ваш endpoint
   - Показывает заголовки, тело запроса и ответа
   - Измеряет время ответа и проверяет SLA
   - Проверяет наличие реквизитов в ответе

2. **Отправка пакета мок-сделок**
   - Тестирование производительности
   - Отправка до 10 сделок одновременно
   - Статистика успешности и времени ответа

3. **Просмотр журнала интеграций**
   - История всех запросов и ответов
   - Фильтрация по типам событий, датам, статусам
   - Детальная информация о каждом запросе

### Тестовые сценарии

#### Сценарий 1: Успешная SBP сделка
```bash
1. Отправьте мок-сделку с paymentMethod: "SBP"
2. Ваша система должна вернуть accepted: true и phoneNumber в реквизитах
3. Отправьте callback со статусом IN_PROGRESS
4. Отправьте callback со статусом READY
```

#### Сценарий 2: Успешная C2C сделка
```bash
1. Отправьте мок-сделку с paymentMethod: "C2C"
2. Ваша система должна вернуть accepted: true и cardNumber в реквизитах
3. Отправьте callback со статусом IN_PROGRESS
4. Отправьте callback со статусом READY
```

#### Сценарий 3: Отмена сделки
```bash
1. Отправьте мок-сделку
2. Ваша система должна вернуть accepted: true с реквизитами
3. Отправьте callback со статусом CANCELED с указанием причины
```

## Примеры кода

### Python - создание сделки с реквизитами
```python
from flask import Flask, request, jsonify
import uuid

app = Flask(__name__)

@app.route('/deals', methods=['POST'])
def create_deal():
    # Проверка токена
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.json
    payment_method = data.get('paymentMethod')
    amount = data.get('amount')
    
    # Генерация ID сделки
    partner_deal_id = f"AGG-{uuid.uuid4()}"
    
    # Формирование реквизитов в зависимости от метода
    requisites = {
        'bankName': 'Сбербанк',
        'bankCode': 'SBERBANK',
        'recipientName': 'ООО Компания'
    }
    
    if payment_method == 'SBP':
        requisites['phoneNumber'] = '+79001234567'
    elif payment_method == 'C2C':
        requisites['cardNumber'] = '4111111111111111'
    else:
        return jsonify({
            'accepted': False,
            'message': 'Unsupported payment method'
        }), 200
    
    # Успешный ответ с реквизитами
    return jsonify({
        'accepted': True,
        'partnerDealId': partner_deal_id,
        'message': 'Deal created successfully',
        'requisites': requisites,
        'dealDetails': {
            'id': partner_deal_id,
            'amount': amount,
            'status': 'NEW',
            'paymentMethod': payment_method
        }
    }), 200

if __name__ == '__main__':
    app.run(port=3000)
```

### Node.js - обработка создания сделки с реквизитами
```javascript
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const app = express();

app.use(express.json());

// База данных сделок (в памяти для примера)
const deals = new Map();

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
    
    const { 
        ourDealId, 
        amount, 
        merchantRate, 
        paymentMethod,
        bankType,
        callbackUrl 
    } = req.body;
    
    // Валидация
    if (!ourDealId || !amount || !paymentMethod || !callbackUrl) {
        return res.json({
            accepted: false,
            message: 'Missing required fields'
        });
    }
    
    // Генерация ID и реквизитов
    const partnerDealId = `AGG-${uuidv4()}`;
    
    // Выбор реквизитов в зависимости от метода и банка
    const requisites = {
        bankName: getBankName(bankType),
        bankCode: bankType || 'SBERBANK',
        recipientName: 'Иван Иванович И.'
    };
    
    if (paymentMethod === 'SBP') {
        requisites.phoneNumber = generatePhoneNumber();
    } else if (paymentMethod === 'C2C') {
        requisites.cardNumber = generateCardNumber(bankType);
    }
    
    // Сохранение сделки
    const deal = {
        id: partnerDealId,
        ourDealId,
        amount,
        merchantRate,
        paymentMethod,
        bankType,
        callbackUrl,
        requisites,
        status: 'NEW',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 минут
    };
    
    deals.set(partnerDealId, deal);
    
    // Успешный ответ
    res.json({
        accepted: true,
        partnerDealId,
        message: 'Deal created successfully',
        requisites,
        dealDetails: {
            id: partnerDealId,
            amount,
            status: 'NEW',
            createdAt: deal.createdAt,
            expiresAt: deal.expiresAt,
            paymentMethod
        }
    });
});

// Endpoint для получения информации о сделке
app.get('/deals/:partnerDealId', (req, res) => {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const deal = deals.get(req.params.partnerDealId);
    
    if (!deal) {
        return res.status(404).json({ error: 'Deal not found' });
    }
    
    res.json({
        id: deal.id,
        ourDealId: deal.ourDealId,
        status: deal.status,
        amount: deal.amount,
        paymentMethod: deal.paymentMethod,
        requisites: deal.requisites,
        createdAt: deal.createdAt,
        updatedAt: deal.updatedAt || deal.createdAt,
        expiresAt: deal.expiresAt
    });
});

// Вспомогательные функции
function getBankName(bankCode) {
    const banks = {
        'SBERBANK': 'Сбербанк',
        'VTB': 'ВТБ',
        'ALFABANK': 'Альфа-Банк',
        'TINKOFF': 'Тинькофф',
        // ... добавьте остальные банки
    };
    return banks[bankCode] || 'Банк';
}

function generatePhoneNumber() {
    // Генерация тестового номера телефона
    const codes = ['900', '901', '902', '903', '904'];
    const code = codes[Math.floor(Math.random() * codes.length)];
    const number = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
    return `+79${code}${number}`;
}

function generateCardNumber(bankType) {
    // Генерация тестового номера карты
    const prefixes = {
        'SBERBANK': '4276',
        'VTB': '4272',
        'ALFABANK': '4154',
        'TINKOFF': '4377',
        // Добавьте префиксы для других банков
    };
    const prefix = prefixes[bankType] || '4111';
    const suffix = Math.floor(Math.random() * 100000000).toString().padStart(12, '0');
    return prefix + suffix;
}

app.listen(3000, () => {
    console.log('Aggregator API listening on port 3000');
});
```

### PHP - отправка callback с обновлением статуса
```php
<?php
class AggregatorCallback {
    private $callbackUrl = 'https://chspay.pro/api/aggregators/callback';
    private $callbackToken;
    
    public function __construct($token) {
        $this->callbackToken = $token;
    }
    
    public function sendStatusUpdate($ourDealId, $status, $partnerDealId = null) {
        $data = [
            'ourDealId' => $ourDealId,
            'status' => $status,
            'updatedAt' => date('c')
        ];
        
        if ($partnerDealId) {
            $data['partnerDealId'] = $partnerDealId;
        }
        
        // Добавляем причину для отмены
        if ($status === 'CANCELED') {
            $data['reason'] = 'User cancelled payment';
        }
        
        return $this->sendCallback($data);
    }
    
    public function sendBatchCallbacks($callbacks) {
        $url = 'https://chspay.pro/api/aggregators/callback/batch';
        
        $headers = [
            'Authorization: Bearer ' . $this->callbackToken,
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
    
    private function sendCallback($data) {
        $headers = [
            'Authorization: Bearer ' . $this->callbackToken,
            'Content-Type: application/json'
        ];
        
        $ch = curl_init($this->callbackUrl);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        return [
            'success' => $httpCode === 200,
            'httpCode' => $httpCode,
            'response' => json_decode($response, true)
        ];
    }
}

// Пример использования
$callback = new AggregatorCallback('your-callback-token-here');

// Отправка обновления статуса
$result = $callback->sendStatusUpdate('deal-123', 'READY', 'AGG-001');

if ($result['success']) {
    echo "Callback sent successfully\n";
} else {
    echo "Failed to send callback: " . json_encode($result['response']) . "\n";
}

// Массовая отправка
$batchCallbacks = [
    ['ourDealId' => 'deal-1', 'status' => 'READY'],
    ['ourDealId' => 'deal-2', 'status' => 'IN_PROGRESS'],
    ['ourDealId' => 'deal-3', 'status' => 'CANCELED', 'reason' => 'Timeout']
];

$batchResult = $callback->sendBatchCallbacks($batchCallbacks);
?>
```

## Контакты и поддержка

При возникновении вопросов по интеграции обращайтесь:
- Техническая поддержка: support@chspay.pro
- Документация API: https://chspay.pro/api/docs
- Личный кабинет агрегатора: https://chspay.pro/aggregator

## История изменений

### v2.1 (29.01.2025)
- Добавлена передача метода платежа (SBP/C2C)
- Обязательный возврат реквизитов при создании сделки
- Добавлен endpoint получения информации о сделке
- Полный справочник всех банков и статусов
- Обновлен базовый URL на chspay.pro/api

### v2.0 (29.01.2025)
- Полный рефакторинг системы агрегаторов
- Добавлена система приоритетов и fallback маршрутизация
- Новый личный кабинет с инструментами тестирования
- Улучшенная система логирования и аудита
- Поддержка массовых callback'ов
