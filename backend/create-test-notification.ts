import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function createTestNotification() {
  try {
    // Найдем трейдера с активной транзакцией
    const trader = await db.trader.findFirst({
      where: {
        id: "cmdt9397o06lkikq42msq5cru"
      },
      include: {
        devices: {
          where: {
            isActive: true
          }
        }
      }
    });

    if (!trader || trader.devices.length === 0) {
      console.log("Trader or active device not found");
      return;
    }

    const device = trader.devices[0];
    console.log(`Using device: ${device.name} (${device.id})`);

    // Создаем уведомление СБП
    const notification = await db.notification.create({
      data: {
        deviceId: device.id,
        packageName: "ru.vtb24.mobilebanking.android",
        application: "ВТБ Онлайн",
        title: "ВТБ Онлайн",
        message: "Поступление 3201р Счет*1234 SBP Баланс 50000р 12:34",
        isRead: false,
        isProcessed: false,
        type: "BANKING",
        metadata: {
          originalAmount: "3201",
          parsedAmount: 3201,
          bankType: "VTB"
        }
      }
    });

    console.log("\nСоздано тестовое уведомление:");
    console.log(`ID: ${notification.id}`);
    console.log(`Message: ${notification.message}`);
    console.log(`Device: ${device.name}`);
    console.log(`isProcessed: ${notification.isProcessed}`);
    
    console.log("\nТеперь NotificationMatcherService должен его обработать...");

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await db.$disconnect();
  }
}

createTestNotification();