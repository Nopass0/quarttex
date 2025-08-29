#!/usr/bin/env bun
import { db } from "./src/db";
import { sendTransactionCallbacks } from "./src/utils/notify";
import { Status } from "@prisma/client";

async function testCallbackFlow() {
  console.log("=== Testing callback flow after fixes ===\n");
  
  // 1. Find or create a test transaction
  let transaction = await db.transaction.findFirst({
    where: {
      status: "IN_PROGRESS",
      callbackUri: { not: null },
      traderId: { not: null }
    }
  });
  
  if (!transaction) {
    console.log("No IN_PROGRESS transaction found. Creating test transaction...");
    
    const merchant = await db.merchant.findFirst();
    const method = await db.method.findFirst({ where: { isEnabled: true } });
    const trader = await db.user.findFirst({ where: { role: "TRADER" } });
    const requisite = await db.bankDetail.findFirst({ where: { userId: trader?.id } });
    
    if (!merchant || !method || !trader || !requisite) {
      console.error("Missing required data to create test transaction");
      return;
    }
    
    transaction = await db.transaction.create({
      data: {
        merchantId: merchant.id,
        methodId: method.id,
        amount: 1000,
        assetOrBank: "RUB",
        orderId: `test-callback-${Date.now()}`,
        currency: "RUB",
        userId: "test-user",
        clientName: "Test User",
        callbackUri: "https://webhook.site/unique-url", // Replace with your webhook.site URL
        successUri: "https://webhook.site/success-url",
        failUri: "https://webhook.site/fail-url",
        type: "IN",
        expired_at: new Date(Date.now() + 30 * 60 * 1000),
        commission: 0,
        status: "IN_PROGRESS",
        traderId: trader.id,
        bankDetailId: requisite.id,
        rate: 95.5,
        frozenUsdtAmount: 10.47
      }
    });
    
    console.log(`Created test transaction: ${transaction.id}`);
  }
  
  console.log(`\nTest transaction details:
  - ID: ${transaction.id}
  - Order ID: ${transaction.orderId}
  - Status: ${transaction.status}
  - Callback URL: ${transaction.callbackUri}
  - Success URL: ${transaction.successUri}
  - Fail URL: ${transaction.failUri}
  `);
  
  // 2. Check callback history before
  const historyBefore = await db.callbackHistory.count({
    where: { transactionId: transaction.id }
  });
  console.log(`Callback history entries before: ${historyBefore}`);
  
  // 3. Test sending callbacks (simulating trader confirmation)
  console.log("\n=== Simulating trader confirmation (sending callbacks for READY status) ===");
  
  try {
    const result = await sendTransactionCallbacks(transaction, Status.READY);
    console.log("\nCallback result:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error sending callbacks:", error);
  }
  
  // 4. Check callback history after
  const historyAfter = await db.callbackHistory.count({
    where: { transactionId: transaction.id }
  });
  console.log(`\nCallback history entries after: ${historyAfter}`);
  console.log(`New entries created: ${historyAfter - historyBefore}`);
  
  // 5. Show recent callback history
  if (historyAfter > historyBefore) {
    const recentHistory = await db.callbackHistory.findMany({
      where: { transactionId: transaction.id },
      orderBy: { createdAt: 'desc' },
      take: 3
    });
    
    console.log("\nRecent callback history:");
    recentHistory.forEach((entry, i) => {
      console.log(`\n  ${i + 1}. ${entry.url}`);
      console.log(`     Status: ${entry.statusCode || 'N/A'}`);
      console.log(`     Payload: ${JSON.stringify(entry.payload)}`);
      console.log(`     Response: ${entry.response?.substring(0, 100) || 'N/A'}`);
      console.log(`     Error: ${entry.error || 'None'}`);
      console.log(`     Created: ${entry.createdAt}`);
    });
  }
  
  // 6. Test from NotificationMatcherService
  console.log("\n=== Testing NotificationMatcherService callback ===");
  
  // Create a test notification
  const device = await db.device.findFirst({
    where: { userId: transaction.traderId! }
  });
  
  if (device) {
    const notification = await db.notification.create({
      data: {
        deviceId: device.id,
        packageName: "ru.sberbank.app",
        appName: "Сбербанк",
        title: "Поступление",
        message: `Поступление ${transaction.amount}р Счет*1234 Баланс: 50000р`,
        timestamp: Date.now(),
        isProcessed: false,
        type: "BANK",
        priority: 1,
        category: "bank"
      }
    });
    
    console.log(`Created test notification: ${notification.id}`);
    
    // Import and run the matcher service
    const { NotificationMatcherService } = await import("./src/services/NotificationMatcherService");
    const matcher = new NotificationMatcherService();
    
    // Process the notification
    await matcher.tick();
    
    // Check if callback was sent
    const historyAfterMatcher = await db.callbackHistory.count({
      where: { transactionId: transaction.id }
    });
    
    console.log(`Callback history after matcher: ${historyAfterMatcher}`);
    console.log(`New entries from matcher: ${historyAfterMatcher - historyAfter}`);
  } else {
    console.log("No device found for trader, skipping NotificationMatcherService test");
  }
  
  console.log("\n=== Test completed ===");
}

testCallbackFlow().catch(console.error);