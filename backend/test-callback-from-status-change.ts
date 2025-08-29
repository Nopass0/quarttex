#!/usr/bin/env bun
import { db } from "./src/db";
import { notifyByStatus } from "./src/utils/notify";

async function testCallbackOnStatusChange() {
  console.log("Testing callback system on status change...");
  
  // Find a transaction with callback URL
  const transaction = await db.transaction.findFirst({
    where: {
      callbackUri: {
        not: null,
        not: ""
      },
      status: "IN_PROGRESS"
    }
  });
  
  if (!transaction) {
    console.log("No IN_PROGRESS transaction with callback URL found");
    return;
  }
  
  console.log(`Found transaction: ${transaction.id}`);
  console.log(`Callback URL: ${transaction.callbackUri}`);
  console.log(`Current status: ${transaction.status}`);
  
  // Manually trigger notifyByStatus as if status changed to READY
  console.log("\nSending callback via notifyByStatus...");
  
  const result = await notifyByStatus({
    id: transaction.id,
    status: "READY",
    successUri: transaction.successUri || "",
    failUri: transaction.failUri || "",
    callbackUri: transaction.callbackUri || "",
    amount: transaction.amount
  });
  
  console.log("Callback result:", result);
  
  // Check if callback was saved to history
  console.log("\nChecking callback history...");
  const history = await db.callbackHistory.findMany({
    where: { transactionId: transaction.id },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log(`Found ${history.length} callback history entries:`);
  history.forEach((entry, index) => {
    console.log(`  ${index + 1}. URL: ${entry.url}`);
    console.log(`     Status: ${entry.statusCode}`);
    console.log(`     Created: ${entry.createdAt}`);
    console.log(`     Error: ${entry.error || 'None'}`);
  });
}

testCallbackOnStatusChange().catch(console.error);