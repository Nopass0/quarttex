import { db } from "./src/db";

async function checkCallbacks() {
  // Проверяем последние транзакции со статусом READY
  const transactions = await db.transaction.findMany({
    where: {
      status: 'READY',
      updatedAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // За последние 24 часа
      }
    },
    orderBy: { updatedAt: 'desc' },
    take: 5,
    select: {
      id: true,
      status: true,
      callbackUri: true,
      successUri: true,
      traderId: true,
      matchedNotificationId: true,
      updatedAt: true
    }
  });

  console.log("=== Последние 5 транзакций со статусом READY ===");
  
  for (const tx of transactions) {
    console.log("\nTransaction: " + tx.id);
    console.log("  Updated: " + tx.updatedAt.toISOString());
    console.log("  Has Trader: " + (tx.traderId ? 'Yes' : 'No'));
    console.log("  Has Matched Notification: " + (tx.matchedNotificationId ? 'Yes' : 'No'));
    console.log("  Callback URI: " + (tx.callbackUri || 'none'));
    console.log("  Success URI: " + (tx.successUri || 'none'));
    
    // Проверяем историю callback'ов
    const callbacks = await db.callbackHistory.findMany({
      where: { transactionId: tx.id },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log("  Callbacks sent: " + callbacks.length);
    if (callbacks.length > 0) {
      for (const cb of callbacks) {
        console.log("    - " + cb.url + " (status: " + cb.statusCode + ", error: " + (cb.error || 'none') + ")");
      }
    } else if (tx.callbackUri || tx.successUri) {
      console.log("  WARNING: Has URIs but no callbacks\!");
    }
  }
  
  console.log("\n=== Общая статистика за 24 часа ===");
  const allReady = await db.transaction.count({
    where: {
      status: 'READY',
      updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }
  });
  
  const withCallbacks = await db.callbackHistory.groupBy({
    by: ['transactionId'],
    where: {
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }
  });
  
  console.log("Транзакций READY: " + allReady);
  console.log("Транзакций с callback'ами: " + withCallbacks.length);
}

checkCallbacks().then(() => process.exit(0)).catch(console.error);
ENDSCRIPT < /dev/null