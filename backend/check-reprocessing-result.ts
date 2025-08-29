import { db } from "./src/db";

async function checkResult() {
  const notificationId = "cmducamog00gjik5wrickzdxu";
  const transactionId = "cmdu6pfbl0433ik5jkgjl768q";
  
  console.log("=== РЕЗУЛЬТАТ ПОВТОРНОЙ ОБРАБОТКИ ===\n");
  
  // Проверяем уведомление
  const notification = await db.notification.findUnique({
    where: { id: notificationId },
    include: {
      matchedTransactions: true
    }
  });
  
  console.log("Уведомление:");
  console.log(`- ID: ${notification?.id}`);
  console.log(`- isProcessed: ${notification?.isProcessed}`);
  console.log(`- Metadata:`, JSON.stringify(notification?.metadata, null, 2));
  console.log(`- Сопоставленные транзакции: ${notification?.matchedTransactions?.length || 0}`);
  
  // Проверяем транзакцию
  const transaction = await db.transaction.findUnique({
    where: { id: transactionId },
    include: {
      matchedNotification: true
    }
  });
  
  console.log("\nТранзакция:");
  console.log(`- ID: ${transaction?.id}`);
  console.log(`- Статус: ${transaction?.status}`);
  console.log(`- Сопоставленное уведомление: ${transaction?.matchedNotification?.id || 'нет'}`);
  console.log(`- acceptedAt: ${transaction?.acceptedAt}`);
  console.log(`- traderProfit: ${transaction?.traderProfit}`);
  
  if (notification?.isProcessed && (notification?.metadata as any)?.processedReason === "NO_MATCHING_TXN") {
    console.log("\n❌ Уведомление снова не сопоставилось!");
    console.log("Возможные причины:");
    console.log("1. Транзакция уже была обработана другим уведомлением");
    console.log("2. Статус транзакции изменился");
    console.log("3. Проблема с парсингом банка");
  } else if (transaction?.status === "READY") {
    console.log("\n✅ Транзакция успешно сопоставлена и обработана!");
  }
}

checkResult().catch(console.error).finally(() => process.exit(0));