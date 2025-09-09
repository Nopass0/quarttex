async function updateDeviceTimeout() {
  console.log("=== Обновление таймаута устройств через API ===\n");

  try {
    // Обновляем настройки через API сервиса
    const response = await fetch("http://localhost:3000/services/DeviceHealthCheckService/settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        healthCheckTimeout: 300 // 5 минут вместо 50
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Ошибка: ${response.status} - ${error}`);
      return;
    }

    const result = await response.json();
    console.log("✓ Настройки обновлены успешно!");
    console.log("Новые настройки:", result.settings);

    // Перезапускаем сервис для применения настроек
    const stopResponse = await fetch("http://localhost:3000/services/DeviceHealthCheckService/stop", {
      method: "POST"
    });

    if (stopResponse.ok) {
      console.log("✓ Сервис остановлен");
    }

    const startResponse = await fetch("http://localhost:3000/services/DeviceHealthCheckService/start", {
      method: "POST"
    });

    if (startResponse.ok) {
      console.log("✓ Сервис запущен с новыми настройками");
    }

    console.log("\n=== Рекомендации для решения проблемы отключения устройств ===");
    console.log("\n1. **Таймаут обновлен**: С 50 минут до 5 минут");
    console.log("   - Устройства теперь будут отключаться через 5 минут неактивности");
    console.log("   - Раньше устройство могло показываться онлайн до 50 минут после отключения");
    
    console.log("\n2. **Настройка приложения на устройстве**:");
    console.log("   - Убедитесь, что приложение отправляет health check каждые 30-60 секунд");
    console.log("   - URL: POST /api/trader/devices/health-check");
    console.log("   - Заголовок: x-device-token: <токен устройства>");
    console.log("   - Тело запроса:");
    console.log("     {");
    console.log("       \"batteryLevel\": 85,");
    console.log("       \"networkSpeed\": 100");
    console.log("     }");
    
    console.log("\n3. **Проверка соединения**:");
    console.log("   - Приложение должно переподключаться при потере связи");
    console.log("   - При ошибке 401 нужно повторно подключиться через /api/trader/device/connect");
    
    console.log("\n4. **Отладка**:");
    console.log("   - Проверьте логи сервера на предмет ошибок health check");
    console.log("   - Убедитесь, что токен устройства правильный");
    console.log("   - Проверьте сетевое соединение устройства");

  } catch (error) {
    console.error("Ошибка при обновлении настроек:", error);
  }
}

updateDeviceTimeout();