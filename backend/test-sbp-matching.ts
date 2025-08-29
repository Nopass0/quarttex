import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function testSBPMatching() {
  try {
    // Найдем устройство
    const device = await db.device.findFirst({
      where: {
        userId: "cmdt9397o06lkikq42msq5cru"
      }
    });

    if (!device) {
      console.log("Device not found");
      return;
    }

    // Создадим новое СБП уведомление
    const notification = await db.notification.create({
      data: {
        deviceId: device.id,
        packageName: "ru.vtb24.mobilebanking.android",
        application: "ВТБ Онлайн",
        title: "ВТБ Онлайн",
        message: "Поступление 3201р Счет*7999 SBP Баланс 55000р 15:45",
        isRead: false,
        isProcessed: false,
        type: "AppNotification",
        metadata: {
          originalAmount: "3201",
          parsedAmount: 3201,
          bankType: "VTB"
        }
      }
    });

    console.log("✅ Создано новое СБП уведомление:");
    console.log(`ID: ${notification.id}`);
    console.log(`Message: ${notification.message}`);
    
    // Ждем обработки
    console.log("\nЖдем 3 секунды для обработки NotificationMatcherService...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Проверяем результат
    const updatedNotification = await db.notification.findUnique({
      where: { id: notification.id }
    });
    
    const transaction = await db.transaction.findFirst({
      where: {
        id: "cmdx1r6kq0657iktfmx8u7uo9"
      }
    });
    
    console.log("\n" + "=".repeat(50));
    console.log("РЕЗУЛЬТАТ:");
    console.log("=".repeat(50));
    console.log(`Уведомление обработано: ${updatedNotification?.isProcessed}`);
    console.log(`Статус транзакции: ${transaction?.status}`);
    console.log(`Matched notification ID: ${transaction?.matchedNotificationId}`);
    
    if (transaction?.status === "READY") {
      console.log("\n✅ УСПЕХ! Транзакция сопоставлена с СБП уведомлением!");
    } else {
      console.log("\n❌ Транзакция все еще IN_PROGRESS");
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await db.$disconnect();
  }
}

testSBPMatching();