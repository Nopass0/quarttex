import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function testHealthCheck() {
  console.log("=== Тест Health Check эндпоинта ===\n");

  try {
    // Получаем первое устройство
    let device = await db.device.findFirst({
      where: {
        user: {
          banned: false
        }
      },
      include: {
        user: true
      }
    });

    if (!device) {
      console.error("Активное устройство не найдено!");
      console.log("\nСоздаем тестовое устройство...");
      
      // Находим трейдера
      const trader = await db.user.findFirst({
        where: {
          email: { contains: "trader" }
        }
      });

      if (!trader) {
        console.error("Трейдер не найден!");
        return;
      }

      // Создаем устройство
      const newDevice = await db.device.create({
        data: {
          name: "Test Device for Health Check",
          token: `test-token-${Date.now()}`,
          userId: trader.id,
          isOnline: false
        }
      });

      console.log(`✓ Создано тестовое устройство: ${newDevice.name}`);
      console.log(`  Token: ${newDevice.token}`);
      
      device = newDevice;
    }

    console.log(`\nТестируем устройство: ${device.name}`);
    console.log(`Token: ${device.token}`);
    console.log(`Текущий статус: ${device.isOnline ? 'Онлайн' : 'Оффлайн'}`);
    console.log(`Последнее обновление: ${device.updatedAt}`);

    // Отправляем health check
    console.log("\n=== Отправка Health Check ===");
    
    const healthCheckUrl = "http://localhost:3000/device/health-check";
    const batteryLevel = Math.floor(Math.random() * 100);
    const networkSpeed = Math.floor(Math.random() * 1000);
    
    console.log(`URL: ${healthCheckUrl}`);
    console.log(`Battery: ${batteryLevel}%`);
    console.log(`Network: ${networkSpeed} Mbps`);

    const response = await fetch(healthCheckUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-device-token": device.token
      },
      body: JSON.stringify({
        batteryLevel,
        networkSpeed
      })
    });

    console.log(`\nОтвет: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const error = await response.text();
      console.error(`Ошибка: ${error}`);
      return;
    }

    const result = await response.json();
    console.log("✓ Health check отправлен успешно!");
    console.log("Результат:", result);

    // Проверяем обновление статуса
    const updatedDevice = await db.device.findUnique({
      where: { id: device.id }
    });

    console.log("\n=== Проверка обновления ===");
    console.log(`Статус изменился: ${device.isOnline} → ${updatedDevice.isOnline}`);
    console.log(`Время обновления: ${device.updatedAt} → ${updatedDevice.updatedAt}`);
    console.log(`Батарея: ${updatedDevice.energy}%`);
    console.log(`Скорость сети: ${updatedDevice.ethernetSpeed} Mbps`);

    if (updatedDevice.isOnline && updatedDevice.energy === batteryLevel) {
      console.log("\n✅ Health check работает корректно!");
    } else {
      console.log("\n⚠️ Возможная проблема с обновлением данных");
    }

    // Симуляция множественных health check
    console.log("\n=== Симуляция регулярных Health Check (5 раз с интервалом 2 сек) ===");
    
    for (let i = 0; i < 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const battery = Math.floor(Math.random() * 100);
      const speed = Math.floor(Math.random() * 1000);
      
      const res = await fetch(healthCheckUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-device-token": device.token
        },
        body: JSON.stringify({
          batteryLevel: battery,
          networkSpeed: speed
        })
      });

      if (res.ok) {
        console.log(`${i + 1}. ✓ Health check отправлен (battery: ${battery}%, speed: ${speed} Mbps)`);
      } else {
        console.log(`${i + 1}. ❌ Ошибка отправки health check`);
      }
    }

    // Финальная проверка
    const finalDevice = await db.device.findUnique({
      where: { id: device.id }
    });

    console.log("\n=== Финальная проверка ===");
    console.log(`Устройство онлайн: ${finalDevice.isOnline ? 'Да' : 'Нет'}`);
    console.log(`Последнее обновление: ${finalDevice.updatedAt}`);

  } catch (error) {
    console.error("Ошибка при тестировании:", error);
  }
}

testHealthCheck()
  .catch(console.error)
  .finally(() => db.$disconnect());