import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function checkNotifications() {
  try {
    // Проверяем все уведомления
    const allNotifications = await db.notification.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        Device: {
          include: {
            user: true
          }
        }
      }
    });

    console.log(`\nВсего последних уведомлений: ${allNotifications.length}`);
    
    // Проверяем необработанные уведомления
    const unprocessedNotifications = await db.notification.findMany({
      where: {
        isProcessed: false
      },
      include: {
        Device: {
          include: {
            user: true
          }
        }
      }
    });

    console.log(`Необработанных уведомлений: ${unprocessedNotifications.length}\n`);

    // Выводим детали необработанных
    for (const notif of unprocessedNotifications.slice(0, 5)) {
      console.log("=" .repeat(50));
      console.log(`ID: ${notif.id}`);
      console.log(`Message: ${notif.message}`);
      console.log(`Package: ${notif.packageName}`);
      console.log(`Created: ${notif.createdAt}`);
      console.log(`Device: ${notif.Device?.name} (${notif.deviceId})`);
      console.log(`User: ${notif.Device?.user?.username}`);
      console.log(`isProcessed: ${notif.isProcessed}`);
      console.log(`isRead: ${notif.isRead}`);
    }

    // Проверяем активные транзакции
    console.log("\n" + "=" .repeat(50));
    console.log("АКТИВНЫЕ ТРАНЗАКЦИИ (IN_PROGRESS):");
    console.log("=" .repeat(50));

    const activeTransactions = await db.transaction.findMany({
      where: {
        status: 'IN_PROGRESS',
        type: 'IN'
      },
      include: {
        trader: true,
        requisites: true
      },
      take: 10
    });

    console.log(`\nНайдено активных транзакций: ${activeTransactions.length}\n`);

    for (const tx of activeTransactions) {
      console.log(`TX ID: ${tx.id}`);
      console.log(`Amount: ${tx.amount} RUB`);
      console.log(`Trader ID: ${tx.traderId}`);
      console.log(`Bank: ${tx.requisites?.bankType} - ${tx.requisites?.cardNumber}`);
      console.log(`Created: ${tx.createdAt}`);
      console.log("---");
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await db.$disconnect();
  }
}

checkNotifications();