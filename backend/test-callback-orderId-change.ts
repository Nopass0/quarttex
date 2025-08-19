#!/usr/bin/env bun

/**
 * Test script to verify that callback payloads now use orderId instead of transaction.id
 */

import { db } from "./src/db";
import { CallbackService } from "./src/services/CallbackService";

async function testCallbackChange() {
  console.log("=== Testing Callback orderId Change ===\n");

  try {
    // Find a test transaction
    const transaction = await db.transaction.findFirst({
      where: {
        status: "READY",
        callbackUri: { not: "" },
        callbackUri: { not: "none" }
      },
      take: 1
    });

    if (!transaction) {
      console.log("❌ No suitable transaction found for testing");
      return;
    }

    console.log("📋 Found test transaction:");
    console.log(`   Transaction ID: ${transaction.id}`);
    console.log(`   Order ID: ${transaction.orderId}`);
    console.log(`   Amount: ${transaction.amount}`);
    console.log(`   Status: ${transaction.status}`);
    console.log(`   Callback URI: ${transaction.callbackUri}\n`);

    // Test the CallbackService.sendTestCallback method to verify it uses orderId
    console.log("🧪 Testing CallbackService.sendCallback (main method) with actual transaction...");
    
    try {
      // Test the main sendCallback method which is what's actually used in production
      await CallbackService.sendCallback(transaction, "READY");
      
      console.log("✅ CallbackService.sendCallback completed");
      
      // Check the callback history to see what was sent
      const callbackHistory = await db.callbackHistory.findFirst({
        where: {
          transactionId: transaction.id,
          url: transaction.callbackUri
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      if (callbackHistory) {
        console.log("\n📤 Callback payload sent:");
        const payload = callbackHistory.payload as any;
        console.log(`   ID in payload: ${payload.id}`);
        console.log(`   Expected orderId: ${transaction.orderId}`);
        console.log(`   Amount: ${payload.amount}`);
        console.log(`   Status: ${payload.status}`);
        
        if (payload.id === transaction.orderId) {
          console.log("✅ SUCCESS: Callback payload correctly uses orderId!");
        } else {
          console.log("❌ FAILURE: Callback payload still uses transaction.id");
        }
      } else {
        console.log("⚠️  No callback history found");
      }
      
    } catch (error) {
      console.log(`⚠️  Callback test failed: ${error instanceof Error ? error.message : error}`);
    }
    
    console.log("\n🧪 Also testing sendTestCallback to verify response format...");
    
    // We'll use a test callback URL that echos the request
    const testCallbackUrl = "https://httpbin.org/post";
    
    try {
      await CallbackService.sendTestCallback(
        transaction.orderId, // Pass orderId - this will be used as the ID in the callback payload
        transaction.amount,
        transaction.status,
        testCallbackUrl
      );
      
      console.log("✅ sendTestCallback completed - check the logs above to see the payload format");
      
    } catch (error) {
      console.log(`⚠️  sendTestCallback failed: ${error instanceof Error ? error.message : error}`);
    }

  } catch (error) {
    console.error("Error during test:", error);
  } finally {
    await db.$disconnect();
  }
}

// Run the test
testCallbackChange().catch(console.error);