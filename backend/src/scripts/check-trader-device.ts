import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function checkTraderDevice() {
  try {
    // Найдем трейдера по транзакции
    const transaction = await db.transaction.findFirst({
      where: {
        status: 'IN_PROGRESS',
        type: 'IN',
        amount: 3201
      },
      include: {
        trader: true
      }
    });

    if (!transaction) {
      console.log("Transaction not found");
      return;
    }

    console.log(`Transaction found:`);
    console.log(`- ID: ${transaction.id}`);
    console.log(`- Amount: ${transaction.amount}`);
    console.log(`- Trader ID: ${transaction.traderId}`);
    console.log(`- Username: ${transaction.trader.username}`);

    // Найдем устройства трейдера  
    const devices = await db.device.findMany({
      where: {
        userId: transaction.traderId,  // traderId это ID user'а
        isWorking: true
      }
    });

    console.log(`\nDevices found: ${devices.length}`);
    
    if (devices.length > 0) {
      const device = devices[0];
      console.log(`\nUsing device:`);
      console.log(`- ID: ${device.id}`);
      console.log(`- Name: ${device.name}`);
      console.log(`- Model: ${device.model}`);
      
      // Создадим уведомление
      const notification = await db.notification.create({
        data: {
          deviceId: device.id,
          packageName: "ru.vtb24.mobilebanking.android",
          application: "ВТБ Онлайн",
          title: "ВТБ Онлайн",
          message: "Поступление 3201р Счет*1234 SBP Баланс 50000р 12:34",
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

      console.log("\n✅ Создано тестовое уведомление:");
      console.log(`- ID: ${notification.id}`);
      console.log(`- Message: ${notification.message}`);
      console.log(`- isProcessed: ${notification.isProcessed}`);
      
    } else {
      console.log("\n⚠️ No active devices found for trader");
      
      // Создадим устройство
      const newDevice = await db.device.create({
        data: {
          userId: transaction.traderId,
          name: "Test Device",
          model: "Test Model",
          deviceId: `test-device-${Date.now()}`,
          isWorking: true,
          emulated: false,
          pushEnabled: true,
          token: `test-token-${Date.now()}`
        }
      });
      
      console.log("\n✅ Created new device:");
      console.log(`- ID: ${newDevice.id}`);
      console.log(`- Name: ${newDevice.name}`);
      
      // Теперь создадим уведомление
      const notification = await db.notification.create({
        data: {
          deviceId: newDevice.id,
          packageName: "ru.vtb24.mobilebanking.android",
          application: "ВТБ Онлайн",
          title: "ВТБ Онлайн",
          message: "Поступление 3201р Счет*1234 SBP Баланс 50000р 12:34",
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

      console.log("\n✅ Создано тестовое уведомление:");
      console.log(`- ID: ${notification.id}`);
      console.log(`- Message: ${notification.message}`);
      console.log(`- isProcessed: ${notification.isProcessed}`);
    }

    console.log("\n📝 Теперь NotificationMatcherService должен обработать это уведомление...");

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await db.$disconnect();
  }
}

checkTraderDevice();