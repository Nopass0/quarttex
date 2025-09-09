# Руководство по настройке Health Check для устройств

## Проблема
Устройства отключаются от системы и показываются как "не запущено" через некоторое время после подключения.

## Решение
Устройства должны регулярно отправлять health check запросы для поддержания статуса "онлайн".

## Настройки сервера
- **Таймаут**: 300 секунд (5 минут)
- **Проверка**: каждую минуту
- Если устройство не отправляло health check более 5 минут, оно будет отмечено как оффлайн

## Настройка приложения

### 1. Эндпоинт Health Check

```
POST /api/device/health-check
```

### 2. Заголовки

```http
Content-Type: application/json
x-device-token: <токен_устройства>
```

### 3. Тело запроса

```json
{
  "batteryLevel": 85,
  "networkSpeed": 100
}
```

### 4. Частота отправки

Отправляйте health check **каждые 30-60 секунд** для надежности.

### 5. Пример реализации (Android/Kotlin)

```kotlin
class DeviceHealthCheckService {
    private val healthCheckInterval = 45_000L // 45 секунд
    private var healthCheckJob: Job? = null
    
    fun startHealthCheck(deviceToken: String) {
        healthCheckJob = CoroutineScope(Dispatchers.IO).launch {
            while (isActive) {
                try {
                    sendHealthCheck(deviceToken)
                } catch (e: Exception) {
                    Log.e("HealthCheck", "Failed to send health check", e)
                }
                delay(healthCheckInterval)
            }
        }
    }
    
    private suspend fun sendHealthCheck(deviceToken: String) {
        val batteryLevel = getBatteryLevel()
        val networkSpeed = getNetworkSpeed()
        
        val response = httpClient.post("https://your-server.com/api/trader/devices/health-check") {
            header("Content-Type", "application/json")
            header("x-device-token", deviceToken)
            setBody("""
                {
                    "batteryLevel": $batteryLevel,
                    "networkSpeed": $networkSpeed
                }
            """.trimIndent())
        }
        
        if (!response.status.isSuccess()) {
            throw Exception("Health check failed: ${response.status}")
        }
    }
    
    fun stopHealthCheck() {
        healthCheckJob?.cancel()
    }
}
```

### 6. Обработка ошибок

- **401 Unauthorized**: Токен устройства недействителен. Необходимо переподключить устройство через `/api/trader/device/connect`
- **400 Bad Request**: Проверьте формат запроса и наличие токена
- **Сетевые ошибки**: Повторите попытку через несколько секунд

### 7. Переподключение при потере связи

```kotlin
class DeviceConnectionManager {
    fun handleHealthCheckError(error: Throwable) {
        when (error) {
            is UnauthorizedException -> {
                // Токен недействителен, переподключаемся
                reconnectDevice()
            }
            is NetworkException -> {
                // Сетевая ошибка, повторяем позже
                scheduleRetry()
            }
        }
    }
    
    private fun reconnectDevice() {
        // Используйте deviceCode для переподключения
        val response = httpClient.post("/api/trader/device/connect") {
            setBody("""
                {
                    "deviceCode": "$savedDeviceCode"
                }
            """.trimIndent())
        }
        
        if (response.isSuccess) {
            val newToken = response.body<DeviceConnectResponse>().token
            // Сохраните новый токен и перезапустите health check
            saveDeviceToken(newToken)
            startHealthCheck(newToken)
        }
    }
}
```

## Мониторинг

### Логи сервера
При отключении устройства в логах появится:
```
[DeviceHealthCheckService] Устройство отключено из-за неактивности
deviceId: xxx
lastActiveAt: 2025-07-22T14:00:00Z
timeoutSeconds: 300
```

### Статус устройства
Проверить статус можно через API:
```
GET /api/trader/devices
```

Устройство будет иметь `isOnline: false` если health check не отправлялся более 5 минут.

## Дополнительные рекомендации

1. **Фоновая работа**: Убедитесь, что приложение может работать в фоне для отправки health check
2. **Оптимизация батареи**: Добавьте приложение в исключения оптимизации батареи
3. **Wake Lock**: Используйте partial wake lock для гарантированной отправки в фоне
4. **Уведомления**: Показывайте уведомление о работе в фоне для Android 8+
5. **Переподключение**: При запуске приложения всегда проверяйте актуальность токена

## Контакты для поддержки

При возникновении проблем обращайтесь к администратору системы с логами приложения и точным временем возникновения проблемы.