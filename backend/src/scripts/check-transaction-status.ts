import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function checkTransactionStatus() {
  try {
    // Проверяем транзакцию
    const transaction = await db.transaction.findFirst({
      where: {
        id: "cmdx1r6kq0657iktfmx8u7uo9"
      },
      include: {
        matchedNotification: true
      }
    });

    if (!transaction) {
      console.log("Transaction not found");
      return;
    }

    console.log("Transaction details:");
    console.log(`- ID: ${transaction.id}`);
    console.log(`- Amount: ${transaction.amount}`);
    console.log(`- Status: ${transaction.status}`);
    console.log(`- Matched Notification ID: ${transaction.matchedNotificationId}`);
    
    if (transaction.matchedNotification) {
      console.log("\nMatched notification:");
      console.log(`- ID: ${transaction.matchedNotification.id}`);
      console.log(`- Message: ${transaction.matchedNotification.message}`);
      console.log(`- isProcessed: ${transaction.matchedNotification.isProcessed}`);
    }

    // Проверяем последнее созданное уведомление
    const lastNotification = await db.notification.findFirst({
      where: {
        message: {
          contains: "3201"
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (lastNotification) {
      console.log("\nLast notification with 3201:");
      console.log(`- ID: ${lastNotification.id}`);
      console.log(`- Message: ${lastNotification.message}`);
      console.log(`- isProcessed: ${lastNotification.isProcessed}`);
      console.log(`- Device ID: ${lastNotification.deviceId}`);
    }

    // Проверяем логи сервиса
    const logs = await db.serviceLog.findMany({
      where: {
        serviceName: "NotificationMatcherService",
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000) // последние 5 минут
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    console.log(`\nService logs (last 10):`);
    for (const log of logs) {
      console.log(`[${log.createdAt.toISOString()}] ${log.level}: ${log.message}`);
      if (log.metadata) {
        console.log(`  Metadata: ${JSON.stringify(log.metadata)}`);
      }
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await db.$disconnect();
  }
}

checkTransactionStatus();