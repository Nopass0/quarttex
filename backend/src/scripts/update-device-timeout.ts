import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function updateDeviceTimeout() {
  console.log("=== Обновление таймаута устройств ===\n");

  try {
    // Находим сервис DeviceHealthCheckService
    const service = await db.service.findUnique({
      where: { name: "DeviceHealthCheckService" }
    });

    if (!service) {
      console.error("Сервис DeviceHealthCheckService не найден!");
      return;
    }

    console.log(`Текущие настройки сервиса: ${service.name}`);
    console.log(`Статус: ${service.status}`);
    
    // Получаем текущие настройки
    const currentSettings = await db.serviceSetting.findMany({
      where: { serviceId: service.id }
    });
    
    console.log("\nТекущие настройки:");
    currentSettings.forEach(setting => {
      console.log(`- ${setting.key}: ${setting.value}`);
    });

    // Обновляем или создаем настройку таймаута
    const newTimeout = 300; // 5 минут вместо 50
    
    const existingSetting = await db.serviceSetting.findUnique({
      where: {
        serviceId_key: {
          serviceId: service.id,
          key: "healthCheckTimeout"
        }
      }
    });

    if (existingSetting) {
      await db.serviceSetting.update({
        where: {
          serviceId_key: {
            serviceId: service.id,
            key: "healthCheckTimeout"
          }
        },
        data: {
          value: newTimeout.toString()
        }
      });
      console.log(`\n✓ Обновлен таймаут с ${existingSetting.value} на ${newTimeout} секунд`);
    } else {
      await db.serviceSetting.create({
        data: {
          serviceId: service.id,
          key: "healthCheckTimeout",
          value: newTimeout.toString()
        }
      });
      console.log(`\n✓ Создана настройка таймаута: ${newTimeout} секунд`);
    }

    // Перезапускаем сервис для применения настроек
    await db.service.update({
      where: { id: service.id },
      data: {
        status: "STOPPED"
      }
    });
    
    await db.service.update({
      where: { id: service.id },
      data: {
        status: "RUNNING"
      }
    });
    
    console.log("✓ Сервис перезапущен для применения настроек");
    
    console.log("\n=== Рекомендации ===");
    console.log("1. Убедитесь, что устройства отправляют health check каждые 30-60 секунд");
    console.log("2. Проверьте, что устройства используют правильный токен в заголовке x-device-token");
    console.log("3. Health check отправляется на POST /api/trader/devices/health-check");
    console.log("4. Формат запроса:");
    console.log("   {");
    console.log("     batteryLevel: number,");
    console.log("     networkSpeed: number");
    console.log("   }");

  } catch (error) {
    console.error("Ошибка при обновлении настроек:", error);
  }
}

updateDeviceTimeout()
  .catch(console.error)
  .finally(() => db.$disconnect());