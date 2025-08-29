import { db } from "./src/db";

async function checkTransaction() {
  // Ищем транзакции на 3001 рубль
  const transactions = await db.transaction.findMany({
    where: {
      amount: 3001,
      type: "IN"
    },
    include: {
      requisites: {
        include: {
          device: true
        }
      },
      trader: true,
      merchant: true,
      matchedNotification: true
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 5
  });

  console.log(`Found ${transactions.length} transactions with amount 3001:`);
  
  for (const tx of transactions) {
    console.log(`\n--- Transaction ${tx.id} ---`);
    console.log(`Status: ${tx.status}`);
    console.log(`Created: ${tx.createdAt}`);
    console.log(`Trader: ${tx.trader?.username} (ID: ${tx.traderId})`);
    console.log(`Requisite: ${tx.requisites?.bankType} - ${tx.requisites?.cardNumber}`);
    console.log(`Device: ${tx.requisites?.device?.name} (ID: ${tx.requisites?.deviceId})`);
    console.log(`BankDetailId: ${tx.bankDetailId}`);
    console.log(`Matched notification: ${tx.matchedNotification ? tx.matchedNotification.id : 'none'}`);
    
    if (tx.matchedNotification) {
      console.log("Notification message:", tx.matchedNotification.message);
    }
  }

  // Проверяем последние уведомления с суммой 3001
  const notifications = await db.notification.findMany({
    where: {
      message: {
        contains: "3001"
      },
      type: "AppNotification"
    },
    include: {
      Device: {
        include: {
          bankDetails: true
        }
      },
      matchedTransactions: true
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 5
  });

  console.log(`\n\nFound ${notifications.length} notifications with 3001:`);
  
  for (const notif of notifications) {
    console.log(`\n--- Notification ${notif.id} ---`);
    console.log(`Message: ${notif.message}`);
    console.log(`Created: ${notif.createdAt}`);
    console.log(`isProcessed: ${notif.isProcessed}`);
    console.log(`Device: ${notif.Device?.name} (ID: ${notif.deviceId})`);
    console.log(`Bank details on device: ${notif.Device?.bankDetails?.map(bd => `${bd.bankType}:${bd.id}`).join(', ')}`);
    console.log(`Matched transactions: ${notif.matchedTransactions?.length || 0}`);
    if (notif.matchedTransactions && notif.matchedTransactions.length > 0) {
      console.log("Matched transaction IDs:", notif.matchedTransactions.map(t => t.id).join(', '));
    }
    console.log(`Application: ${notif.application}`);
    console.log(`Metadata:`, notif.metadata);
  }
}

checkTransaction().catch(console.error).finally(() => process.exit(0));