#!/usr/bin/env bun

// Script to create test data for notification UI

import { db } from "../db";
import { Status, TransactionType, NotificationType } from "@prisma/client";

async function createTestData() {
  console.log("🔍 Creating test data for notification UI...\n");
  
  // Find a trader with devices
  const trader = await db.user.findFirst({
    where: {
      devices: { some: {} }
    },
    include: {
      devices: {
        include: {
          bankDetails: true
        }
      }
    }
  });
  
  if (!trader || !trader.devices.length) {
    console.log("❌ No trader with devices found");
    return;
  }
  
  const device = trader.devices[0];
  const bankDetail = device.bankDetails[0];
  
  if (!bankDetail) {
    console.log("❌ No bank details found for device");
    return;
  }
  
  console.log(`✅ Using trader: ${trader.email}`);
  console.log(`✅ Using device: ${device.name}`);
  console.log(`✅ Using bank detail: ${bankDetail.recipientName} - ${bankDetail.cardNumber}`);
  
  // Find a merchant and method
  const merchant = await db.merchant.findFirst();
  const method = await db.method.findFirst({
    where: { type: "c2c" }
  });
  
  if (!merchant || !method) {
    console.log("❌ No merchant or method found");
    return;
  }
  
  // Create a test transaction
  const amount = 5000;
  const transaction = await db.transaction.create({
    data: {
      amount,
      currency: "RUB",
      status: Status.IN_PROGRESS,
      type: TransactionType.IN,
      orderId: `TEST-${Date.now()}`,
      clientName: "Test Client",
      callbackUri: "https://example.com/callback",
      successUri: "https://example.com/success",
      failUri: "https://example.com/fail",
      userId: "test-user",
      assetOrBank: "RUB",
      expired_at: new Date(Date.now() + 30 * 60 * 1000),
      merchantId: merchant.id,
      methodId: method.id,
      traderId: trader.id,
      bankDetailId: bankDetail.id,
      commission: amount * 0.02,
      rate: 95,
      kkkPercent: 2,
      frozenUsdtAmount: amount / 95,
      calculatedCommission: (amount / 95) * 0.02,
    },
  });
  
  console.log(`\n✅ Created transaction #${transaction.numericId}`);
  
  // Create a matching notification
  const notification = await db.notification.create({
    data: {
      type: NotificationType.AppNotification,
      application: "Сбербанк",
      packageName: "ru.sberbankmobile",
      title: "Перевод",
      message: `СЧЁТ2538 ${new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit' })} ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} зачисление ${amount}р от Test Client Баланс: 125000.50р`,
      deviceId: device.id,
      isProcessed: false,
      metadata: {
        packageName: "ru.sberbankmobile",
        timestamp: new Date().toISOString()
      }
    }
  });
  
  console.log(`✅ Created notification: ${notification.id}`);
  
  // Manually link them (simulating NotificationAutoProcessorService)
  await db.transaction.update({
    where: { id: transaction.id },
    data: {
      status: Status.READY,
      acceptedAt: new Date(),
      matchedNotificationId: notification.id,
      traderProfit: Math.floor((amount / 95) * 0.02 * 100) / 100
    }
  });
  
  await db.notification.update({
    where: { id: notification.id },
    data: { isProcessed: true }
  });
  
  console.log("\n✅ Transaction and notification linked successfully!");
  console.log(`\n📱 To test the UI:`);
  console.log(`   1. Login as trader: ${trader.email}`);
  console.log(`   2. Go to Deals page`);
  console.log(`   3. Find transaction #${transaction.numericId}`);
  console.log(`   4. Click on it to see the linked notification`);
  console.log(`   5. Click on the notification to navigate to notifications page`);
  
  // Fetch the updated transaction to verify
  const updatedTx = await db.transaction.findUnique({
    where: { id: transaction.id },
    include: { matchedNotification: true }
  });
  
  console.log(`\n✅ Verification:`);
  console.log(`   Transaction status: ${updatedTx?.status}`);
  console.log(`   Has matched notification: ${!!updatedTx?.matchedNotification}`);
}

createTestData().catch(console.error).finally(() => process.exit(0));