#!/usr/bin/env bun

// Script to test notification linking with transactions

import { db } from "../db";

async function testNotificationLink() {
  console.log("🔍 Testing notification link in transactions...\n");
  
  // Find a transaction with a linked notification
  const transactionWithNotification = await db.transaction.findFirst({
    where: {
      matchedNotificationId: { not: null }
    },
    include: {
      matchedNotification: true,
      trader: true,
      merchant: true,
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
  
  if (!transactionWithNotification) {
    console.log("❌ No transactions with linked notifications found");
    return;
  }
  
  console.log("✅ Found transaction with linked notification:");
  console.log(`   Transaction ID: ${transactionWithNotification.id}`);
  console.log(`   Numeric ID: ${transactionWithNotification.numericId}`);
  console.log(`   Amount: ${transactionWithNotification.amount} RUB`);
  console.log(`   Status: ${transactionWithNotification.status}`);
  console.log(`   Trader: ${transactionWithNotification.trader?.email}`);
  console.log(`   Merchant: ${transactionWithNotification.merchant?.name}`);
  
  if (transactionWithNotification.matchedNotification) {
    console.log("\n📱 Linked Notification:");
    console.log(`   ID: ${transactionWithNotification.matchedNotification.id}`);
    console.log(`   Message: ${transactionWithNotification.matchedNotification.message}`);
    console.log(`   Created: ${transactionWithNotification.matchedNotification.createdAt}`);
    console.log(`   Processed: ${transactionWithNotification.matchedNotification.isProcessed}`);
  }
  
  // Test the trader endpoint
  console.log("\n🔍 Testing trader API endpoint...");
  
  const url = `http://localhost:3000/api/trader/transactions/${transactionWithNotification.id}`;
  const response = await fetch(url, {
    headers: {
      'x-trader-token': transactionWithNotification.trader?.token || ''
    }
  });
  
  if (response.ok) {
    const data = await response.json();
    console.log("✅ API response includes matchedNotification:", !!data.matchedNotification);
    if (data.matchedNotification) {
      console.log(`   Notification ID: ${data.matchedNotification.id}`);
      console.log(`   Message preview: ${data.matchedNotification.message.substring(0, 50)}...`);
    }
  } else {
    console.log("❌ API request failed:", response.status, response.statusText);
  }
}

testNotificationLink().catch(console.error).finally(() => process.exit(0));