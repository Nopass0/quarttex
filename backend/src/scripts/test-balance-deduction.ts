#!/usr/bin/env bun
/**
 * Test aggregator balance deduction when creating deals
 */

import { db } from "@/db";
import axios from "axios";

const API_URL = process.env.API_URL || "http://localhost:3000/api";

async function testBalanceDeduction() {
  console.log("🔍 Testing aggregator balance deduction...\n");

  try {
    // 1. Get PSPWare aggregator initial balance
    console.log("1️⃣ Getting PSPWare aggregator balance...");
    const pspwareAgg = await db.aggregator.findFirst({
      where: { apiSchema: "PSPWARE" }
    });

    if (!pspwareAgg) {
      console.log("❌ No PSPWare aggregator found!");
      return;
    }

    const initialBalance = pspwareAgg.balanceUsdt;
    console.log(`Initial balance: ${initialBalance} USDT`);

    // 2. Get merchant
    const merchant = await db.merchant.findFirst({
      where: { name: "Test Merchant PSPWare" }
    });

    if (!merchant) {
      console.log("❌ Test merchant not found!");
      return;
    }

    // 3. Disable traders to force aggregator routing
    await db.user.updateMany({
      where: {},
      data: { banned: true }
    });
    console.log("Disabled all traders to force aggregator routing");

    // 4. Create deal
    console.log("\n2️⃣ Creating deal...");
    const dealAmount = 5000; // 5000 RUB
    const dealRequest = {
      amount: dealAmount,
      orderId: `test-balance-${Date.now()}`,
      clientIdentifier: "balance-test-client",
      userIp: "192.168.1.100",
      callbackUri: `${API_URL}/test/callback`,
      rate: 100 // 1 USDT = 100 RUB for easy calculation
    };

    console.log(`Creating deal: ${dealAmount} RUB at rate ${dealRequest.rate}`);
    console.log(`Expected USDT deduction: ${dealAmount / dealRequest.rate} USDT`);

    try {
      const response = await axios.post(
        `${API_URL}/merchant/in`,
        dealRequest,
        {
          headers: {
            "Content-Type": "application/json",
            "x-api-key": merchant.apiKeyPublic || "test-pspware-merchant-key"
          },
          timeout: 10000
        }
      );

      console.log("\n✅ Deal created successfully!");
      console.log("Response status:", response.status);

      // 5. Check aggregator balance after deal
      console.log("\n3️⃣ Checking balance after deal...");
      const updatedAgg = await db.aggregator.findUnique({
        where: { id: pspwareAgg.id }
      });

      if (updatedAgg) {
        const finalBalance = updatedAgg.balanceUsdt;
        const deducted = initialBalance - finalBalance;
        
        console.log(`Final balance: ${finalBalance} USDT`);
        console.log(`Deducted: ${deducted} USDT`);
        console.log(`Expected: ${dealAmount / dealRequest.rate} USDT`);
        
        if (Math.abs(deducted - (dealAmount / dealRequest.rate)) < 0.01) {
          console.log("✅ Balance deduction matches expected amount!");
        } else {
          console.log("❌ Balance deduction doesn't match expected amount");
        }
      }

    } catch (error: any) {
      if (error.response) {
        console.log("\n❌ Deal creation failed:");
        console.log(`Status: ${error.response.status}`);
        console.log(`Error: ${error.response.data?.error || error.response.data}`);
      } else {
        console.log("\n❌ Network error:", error.message);
      }
    }

  } catch (error) {
    console.error("\n❌ Error:", error);
  } finally {
    // Re-enable traders
    await db.user.updateMany({
      where: {},
      data: { banned: false }
    });
  }

  console.log("\n✅ Test completed!");
  process.exit(0);
}

testBalanceDeduction().catch(console.error);