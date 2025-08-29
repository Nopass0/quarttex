import { db } from "./src/db";

async function resetAndCheck() {
  const notificationId = "cmducamog00gjik5wrickzdxu";
  const transactionId = "cmdu6pfbl0433ik5jkgjl768q";
  
  console.log("=== СБРОС И ПРОВЕРКА ===\n");
  
  // Сбрасываем уведомление
  await db.notification.update({
    where: { id: notificationId },
    data: {
      isProcessed: false,
      metadata: {}
    }
  });
  console.log("✅ Уведомление сброшено");
  
  // Ждем обработки
  console.log("⏳ Ожидание обработки (5 секунд)...");
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Проверяем результат
  const notification = await db.notification.findUnique({
    where: { id: notificationId },
    include: {
      matchedTransactions: true
    }
  });
  
  const transaction = await db.transaction.findUnique({
    where: { id: transactionId },
    include: {
      matchedNotification: true,
      trader: true
    }
  });
  
  console.log("\nРЕЗУЛЬТАТ:");
  console.log(`Уведомление обработано: ${notification?.isProcessed}`);
  console.log(`Metadata:`, notification?.metadata);
  console.log(`\nТранзакция статус: ${transaction?.status}`);
  console.log(`Сопоставлено с уведомлением: ${transaction?.matchedNotificationId || 'нет'}`);
  console.log(`Прибыль трейдера: ${transaction?.traderProfit || 0} USDT`);
  
  if (transaction?.status === "READY") {
    console.log("\n✅ УСПЕХ! Транзакция успешно обработана!");
    
    // Проверяем баланс трейдера
    const trader = await db.user.findUnique({
      where: { id: transaction.traderId },
      select: {
        profitFromDeals: true,
        frozenUsdt: true,
        trustBalance: true
      }
    });
    
    console.log("\nБаланс трейдера:");
    console.log(`- Прибыль от сделок: ${trader?.profitFromDeals} USDT`);
    console.log(`- Замороженные средства: ${trader?.frozenUsdt} USDT`);
    console.log(`- Траст баланс: ${trader?.trustBalance} USDT`);
  }
}

resetAndCheck().catch(console.error).finally(() => process.exit(0));