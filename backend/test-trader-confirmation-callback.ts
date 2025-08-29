#!/usr/bin/env bun
import { db } from "./src/db";

async function testTraderConfirmation() {
  console.log("Testing trader confirmation callback...");
  
  // Find an IN_PROGRESS transaction with callback URL
  const transaction = await db.transaction.findFirst({
    where: {
      status: "IN_PROGRESS",
      callbackUri: {
        not: null,
        not: ""
      }
    }
  });
  
  if (!transaction) {
    console.log("No IN_PROGRESS transaction with callback URL found");
    
    // Create a test transaction
    const merchant = await db.merchant.findFirst();
    const method = await db.method.findFirst({ where: { isEnabled: true } });
    const trader = await db.user.findFirst({ where: { email: "trader@example.com" } });
    const requisite = await db.bankDetail.findFirst({ where: { userId: trader?.id } });
    
    if (!merchant || !method || !trader || !requisite) {
      console.log("Missing required data to create test transaction");
      return;
    }
    
    const newTx = await db.transaction.create({
      data: {
        merchantId: merchant.id,
        methodId: method.id,
        amount: 1000,
        assetOrBank: "RUB",
        orderId: `test-callback-${Date.now()}`,
        currency: "RUB",
        userId: "test-user",
        clientName: "Test User",
        callbackUri: "https://example.com/callback",
        successUri: "https://example.com/success",
        failUri: "https://example.com/fail",
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
    
    console.log(`Created test transaction: ${newTx.id}`);
    console.log(`Callback URL: ${newTx.callbackUri}`);
    return;
  }
  
  console.log(`Found transaction: ${transaction.id}`);
  console.log(`Callback URL: ${transaction.callbackUri}`);
  console.log(`Current status: ${transaction.status}`);
  
  // Check callback history before update
  const historyBefore = await db.callbackHistory.count({
    where: { transactionId: transaction.id }
  });
  console.log(`Callback history entries before: ${historyBefore}`);
  
  // Simulate what happens when trader confirms payment
  console.log("\nSimulating trader confirmation (updating to READY)...");
  
  // This is what the trader API endpoint does
  const { notifyByStatus } = await import("./src/utils/notify");
  
  // Update transaction to READY
  const updated = await db.transaction.update({
    where: { id: transaction.id },
    data: { 
      status: "READY",
      acceptedAt: new Date()
    }
  });
  
  // Send callbacks
  const callbackResult = await notifyByStatus({
    id: updated.id,
    status: updated.status,
    successUri: updated.successUri || "",
    failUri: updated.failUri || "",
    callbackUri: updated.callbackUri || "",
    amount: updated.amount
  });
  
  console.log("Callback result:", callbackResult);
  
  // Check callback history after update
  const historyAfter = await db.callbackHistory.count({
    where: { transactionId: transaction.id }
  });
  console.log(`\nCallback history entries after: ${historyAfter}`);
  
  const newEntries = await db.callbackHistory.findMany({
    where: { transactionId: transaction.id },
    orderBy: { createdAt: 'desc' },
    take: 2
  });
  
  if (newEntries.length > 0) {
    console.log("\nNew callback history entries:");
    newEntries.forEach((entry, i) => {
      console.log(`  ${i + 1}. URL: ${entry.url}`);
      console.log(`     Status: ${entry.statusCode || 'N/A'}`);
      console.log(`     Error: ${entry.error || 'None'}`);
    });
  }
}

testTraderConfirmation().catch(console.error);