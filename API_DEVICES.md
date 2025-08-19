# Quattrex Device API Documentation

## Обзор

API устройств Quattrex позволяет мобильным приложениям подключаться к торговой платформе Quattrex и взаимодействовать с ней. Устройства авторизуются с использованием уникальных токенов и могут выполнять проверки состояния, получать уведомления и управлять банковскими реквизитами.

## Аутентификация

Все endpoints устройств (кроме health check) требуют аутентификации трейдера с использованием заголовка `x-trader-token`. Endpoint health check использует специфичную для устройства аутентификацию с заголовком `x-device-token`.

## Базовый URL

```
http://localhost:3000/api
```

## Endpoints

### 1. Health Check (Проверка состояния)

Отправка обновлений состояния устройства на сервер. Этот endpoint должен вызываться регулярно для поддержания активного соединения.

**Endpoint:** `POST /trader/devices/health-check`

**Заголовки:**
```
x-device-token: [device_token]
Content-Type: application/json
```

**Тело запроса:**
```json
{
  "batteryLevel": 85,              // Опционально: Процент заряда батареи (0-100)
  "networkSpeed": 150,             // Опционально: Скорость сети в Mbps
  "userAgent": "Mozilla/5.0...",   // Опционально: User agent строка устройства
  "ip": "192.168.1.100",           // Опционально: IP адрес устройства
  "location": "Moscow, Russia",     // Опционально: Местоположение устройства
  "version": "1.0.0",              // Опционально: Версия приложения
  "ping": 45,                      // Опционально: Пинг сети в мс
  "connectionType": "wifi"         // Опционально: "wifi", "4g", "3g", и т.д.
}
```

**Ответ:**
```json
{
  "success": true,
  "deviceId": "device_id_here",
  "timestamp": "2025-07-04T16:30:00.000Z"
}
```

**Ошибки:**
- `400` - Требуется токен устройства
- `404` - Недействительный токен устройства

**Примечания по использованию:**
- Вызывайте этот endpoint каждые 30-60 секунд для поддержания статуса онлайн
- Устройства автоматически отмечаются как офлайн через 3000 секунд (50 минут) без health check
- Все поля в теле запроса опциональны

### 2. Создание устройства (только для трейдеров)

Создание новой записи устройства для подключения.

**Endpoint:** `POST /trader/devices`

**Заголовки:**
```
x-trader-token: [trader_token]
Content-Type: application/json
```

**Тело запроса:**
```json
{
  "name": "Samsung Galaxy S23"
}
```

**Ответ:**
```json
{
  "id": "device_id_here",
  "name": "Samsung Galaxy S23",
  "token": "64_character_hex_token_here",
  "createdAt": "2025-07-04T16:00:00.000Z"
}
```

### 3. Получение всех устройств (только для трейдеров)

Получение всех устройств, связанных с трейдером.

**Endpoint:** `GET /trader/devices`

**Заголовки:**
```
x-trader-token: [trader_token]
```

**Ответ:**
```json
[
  {
    "id": "device_id",
    "name": "Device Name",
    "token": "device_token",
    "isOnline": true,
    "energy": 85,
    "ethernetSpeed": 150,
    "lastSeen": "2025-07-04T16:00:00.000Z",
    "createdAt": "2025-07-04T12:00:00.000Z",
    "browser": null,
    "os": null,
    "ip": null,
    "location": null,
    "isTrusted": false,
    "notifications": 5,
    "linkedBankDetails": 2
  }
]
```

### 4. Получение деталей устройства (только для трейдеров)

Получение подробной информации о конкретном устройстве.

**Endpoint:** `GET /trader/devices/:id`

**Заголовки:**
```
x-trader-token: [trader_token]
```

**Ответ:**
```json
{
  "id": "device_id",
  "name": "Device Name",
  "token": "device_token",
  "isOnline": false,
  "energy": 85,
  "ethernetSpeed": 150,
  "lastSeen": "2025-07-04T16:00:00.000Z",
  "createdAt": "2025-07-04T12:00:00.000Z",
  "browser": null,
  "os": null,
  "ip": null,
  "location": null,
  "isTrusted": false,
  "notifications": 5,
  "linkedBankDetails": [
    {
      "id": "bank_detail_id",
      "cardNumber": "1234567890123456",
      "bankType": "SBERBANK",
      "recipientName": "Ivan Ivanov",
      "status": "ACTIVE"
    }
  ],
  "recentNotifications": [
    {
      "id": "notification_id",
      "type": "HEALTH_CHECK",
      "title": "Health Check",
      "message": "Device health check received",
      "createdAt": "2025-07-04T16:00:00.000Z"
    }
  ]
}
```

### 5. Получение методов платежей (только для трейдеров)

Получение доступных методов платежей для создания реквизитов.

**Endpoint:** `GET /trader/methods`

**Заголовки:**
```
x-trader-token: [trader_token]
```

**Ответ:**
```json
[
  {
    "id": "method_id",
    "code": "SBER_C2C",
    "name": "Сбербанк P2P",
    "type": "c2c",
    "currency": "RUB",
    "minPayin": 100,
    "maxPayin": 50000,
    "minPayout": 100,
    "maxPayout": 50000,
    "commissionPayin": 0,
    "commissionPayout": 0
  }
]
```

### 6. Создание реквизита (только для трейдеров)

Создание нового банковского реквизита, связанного с устройством.

**Endpoint:** `POST /trader/bank-details`

**Заголовки:**
```
x-trader-token: [trader_token]
Content-Type: application/json
```

**Тело запроса:**
```json
{
  "methodId": "method_id_here",
  "cardNumber": "1234567890123456",
  "bankType": "SBERBANK",
  "methodType": "c2c",
  "recipientName": "Иван Иванов",
  "phoneNumber": "+7 900 000 00 00",
  "minAmount": 1000,
  "maxAmount": 20000,
  "dailyLimit": 100000,
  "monthlyLimit": 3000000,
  "intervalMinutes": 0,
  "deviceId": "device_id_here"
}
```

**Ответ:**
```json
{
  "id": "bank_detail_id",
  "cardNumber": "1234567890123456",
  "bankType": "SBERBANK",
  "recipientName": "Иван Иванов",
  "status": "ACTIVE",
  "createdAt": "2025-07-04T16:00:00.000Z"
}
```

### 7. Управление статусом реквизитов

#### Запуск реквизита
**Endpoint:** `PATCH /trader/bank-details/:id/start`

**Заголовки:**
```
x-trader-token: [trader_token]
```

**Ответ:**
```json
{
  "ok": true,
  "message": "Реквизит запущен"
}
```

#### Остановка реквизита
**Endpoint:** `PATCH /trader/bank-details/:id/stop`

**Заголовки:**
```
x-trader-token: [trader_token]
```

**Ответ:**
```json
{
  "ok": true,
  "message": "Реквизит остановлен"
}
```

## Руководство по интеграции

### 1. Поток регистрации устройства

1. Трейдер создает устройство в веб-интерфейсе
2. Система генерирует уникальный токен устройства
3. Токен отображается в виде QR-кода и текста
4. Мобильное приложение сканирует QR-код или вручную вводит токен
5. Приложение безопасно сохраняет токен для будущих запросов

### 2. Формат QR-кода

QR-код содержит JSON объект:
```json
{
  "token": "device_token_here",
  "deviceId": "device_id_here",
  "timestamp": 1720108800000
}
```

### 3. Поддержание соединения

```javascript
// Пример реализации health check
async function sendHealthCheck() {
  const deviceInfo = {
    batteryLevel: getBatteryLevel(),
    networkSpeed: getNetworkSpeed(),
    userAgent: navigator.userAgent,
    version: "1.0.0",
    connectionType: getConnectionType()
  };

  try {
    const response = await fetch('http://localhost:3000/api/trader/devices/health-check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-device-token': savedDeviceToken
      },
      body: JSON.stringify(deviceInfo)
    });

    if (!response.ok) {
      throw new Error('Health check failed');
    }

    const data = await response.json();
    console.log('Health check successful:', data);
  } catch (error) {
    console.error('Health check error:', error);
  }
}

// Отправка health check каждые 45 секунд
setInterval(sendHealthCheck, 45000);
```

### 4. Обработка ошибок

Все ответы с ошибками следуют этому формату:
```json
{
  "error": "Сообщение об ошибке здесь"
}
```

Общие HTTP коды состояния:
- `200` - Успех
- `400` - Плохой запрос (отсутствуют обязательные поля)
- `401` - Неавторизован (недействительный токен)
- `404` - Ресурс не найден
- `500` - Ошибка сервера

### 5. Состояния устройства

- **Онлайн**: Устройство отправило health check в течение последних 3000 секунд
- **Офлайн**: Не получено health check более 3000 секунд
- **Работает**: Устройство активно обрабатывает транзакции
- **Не работает**: Устройство подключено, но не обрабатывает

## Лучшие практики

1. **Безопасность токенов**: Храните токены устройств безопасно, используя специфичное для платформы защищенное хранилище
2. **Health Checks**: Отправляйте health check каждые 30-60 секунд для оптимальной надежности
3. **Оптимизация батареи**: Уменьшайте частоту health check при низком заряде батареи
4. **Обработка сети**: Реализуйте логику повторных попыток для неудачных запросов
5. **Восстановление ошибок**: Автоматически переподключайтесь после сбоев сети

## CORS конфигурация

API настроен для приема запросов с любого источника для endpoints устройств. Следующие заголовки включены в ответы:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Access-Control-Allow-Headers: Content-Type, x-device-token, x-trader-token
```

## Примеры интеграции мобильных устройств

### Android (Kotlin)
```kotlin
class DeviceService(private val context: Context) {
    private val deviceToken = getStoredDeviceToken()
    private val client = OkHttpClient()
    
    fun sendHealthCheck() {
        val batteryLevel = getBatteryLevel()
        val networkInfo = getNetworkInfo()
        
        val json = JSONObject().apply {
            put("batteryLevel", batteryLevel)
            put("networkSpeed", networkInfo.speed)
            put("connectionType", networkInfo.type)
            put("version", BuildConfig.VERSION_NAME)
        }
        
        val request = Request.Builder()
            .url("http://your-server.com/api/trader/devices/health-check")
            .header("x-device-token", deviceToken)
            .post(json.toString().toRequestBody("application/json".toMediaType()))
            .build()
            
        client.newCall(request).execute()
    }
}
```

### iOS (Swift)
```swift
class DeviceService {
    private let deviceToken = UserDefaults.standard.string(forKey: "deviceToken")
    
    func sendHealthCheck() {
        guard let token = deviceToken else { return }
        
        let url = URL(string: "http://your-server.com/api/trader/devices/health-check")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(token, forHTTPHeaderField: "x-device-token")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let healthData: [String: Any] = [
            "batteryLevel": UIDevice.current.batteryLevel * 100,
            "version": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
        ]
        
        request.httpBody = try? JSONSerialization.data(withJSONObject: healthData)
        
        URLSession.shared.dataTask(with: request).resume()
    }
}
```

## Тестирование

Вы можете протестировать API с помощью curl:

```bash
# Создание устройства (требуется токен трейдера)
curl -X POST http://localhost:3000/api/trader/devices \
  -H "x-trader-token: YOUR_TRADER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Device"}'

# Отправка health check
curl -X POST http://localhost:3000/api/trader/devices/health-check \
  -H "x-device-token: YOUR_DEVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"batteryLevel": 85, "networkSpeed": 100}'

# Получение методов платежей
curl -X GET http://localhost:3000/api/trader/methods \
  -H "x-trader-token: YOUR_TRADER_TOKEN"

# Создание реквизита
curl -X POST http://localhost:3000/api/trader/bank-details \
  -H "x-trader-token: YOUR_TRADER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "methodId": "method_id_here",
    "cardNumber": "1234567890123456",
    "bankType": "SBERBANK",
    "methodType": "c2c",
    "recipientName": "Иван Иванов",
    "minAmount": 1000,
    "maxAmount": 20000,
    "deviceId": "device_id_here"
  }'
```

## Поддержка

Для технической поддержки или вопросов об API, пожалуйста, обратитесь к команде разработки или создайте issue в репозитории проекта.

## Архитектура системы

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile App    │────│   Quattrex API  │────│   Database      │
│                 │    │                 │    │                 │
│ • Health Check  │    │ • Authentication│    │ • Devices       │
│ • QR Scanner    │    │ • Device Mgmt   │    │ • Bank Details  │
│ • Status Update │    │ • Requisites    │    │ • Methods       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Безопасность

1. **Токены устройств**: Генерируются случайным образом (64 символа hex)
2. **HTTPS**: Рекомендуется для production
3. **Валидация**: Все входящие данные валидируются
4. **Ограничения по времени**: Устройства автоматически отключаются при отсутствии активности
5. **Логирование**: Все операции логируются для аудита