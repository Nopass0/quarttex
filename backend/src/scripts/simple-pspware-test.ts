#!/usr/bin/env bun

import { db } from "@/db";
import axios from "axios";

async function simplePSPWareTest() {
  console.log("🧪 Simple PSPWare test with balance deduction...\n");

  try {
    // 1. Find test merchant and their method
    const merchant = await db.merchant.findFirst({
      where: { name: "Test Merchant PSPWare" },
      include: {
        merchantMethods: {
          include: {
            method: true
          }
        }
      }
    });

    if (!merchant || merchant.merchantMethods.length === 0) {
      console.log("❌ Test merchant or methods not found");
      return;
    }

    const method = merchant.merchantMethods[0].method;
    console.log(`✅ Found merchant: ${merchant.name}`);
    console.log(`   Method: ${method.name} (${method.code})`);
    console.log(`   API Key: ${merchant.apiKeyPublic}`);

    // 2. Get PSPWare aggregator balance
    const pspwareAgg = await db.aggregator.findFirst({
      where: { apiSchema: "PSPWARE" }
    });

    if (!pspwareAgg) {
      console.log("❌ PSPWare aggregator not found");
      return;
    }

    const initialBalance = pspwareAgg.balanceUsdt;
    console.log(`\n📊 Initial aggregator balance: ${initialBalance} USDT`);

    // 3. Disable traders
    await db.user.updateMany({
      where: {},
      data: { banned: true }
    });

    // 4. Create deal with required fields
    const dealRequest = {
      amount: 1000, // 1000 RUB
      orderId: `test-balance-${Date.now()}`,
      methodId: method.id,
      expired_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 минут
      clientIdentifier: "balance-test-client",
      userIp: "127.0.0.1",
      callbackUri: "http://localhost:3000/api/test/callback",
      rate: 100 // 1 USDT = 100 RUB
    };

    console.log(`\n📤 Creating deal: ${dealRequest.amount} RUB at rate ${dealRequest.rate}`);
    console.log(`   Expected deduction: ${dealRequest.amount / dealRequest.rate} USDT`);

    const response = await axios.post(
      "http://localhost:3000/api/merchant/transactions/in",
      dealRequest,
      {
        headers: {
          "Content-Type": "application/json",
          "x-merchant-api-key": merchant.apiKeyPublic
        },
        timeout: 10000
      }
    );

    console.log(`\n✅ Deal created! Status: ${response.status}`);
    console.log(`   Deal ID: ${response.data.data?.id || 'N/A'}`);

    // 5. Check balance after deal
    const updatedAgg = await db.aggregator.findUnique({
      where: { id: pspwareAgg.id }
    });

    if (updatedAgg) {
      const finalBalance = updatedAgg.balanceUsdt;
      const deducted = initialBalance - finalBalance;
      
      console.log(`\n📊 Balance check:`);
      console.log(`   Initial: ${initialBalance} USDT`);
      console.log(`   Final: ${finalBalance} USDT`);
      console.log(`   Deducted: ${deducted} USDT`);
      console.log(`   Expected: ${dealRequest.amount / dealRequest.rate} USDT`);
      
      if (Math.abs(deducted - (dealRequest.amount / dealRequest.rate)) < 0.01) {
        console.log(`✅ Balance deduction correct!`);
      } else {
        console.log(`❌ Balance deduction incorrect`);
      }
    }

    // 6. Check transaction
    const transaction = await db.transaction.findFirst({
      where: { orderId: dealRequest.orderId },
      include: { aggregator: true }
    });

    if (transaction) {
      console.log(`\n📋 Transaction details:`);
      console.log(`   Status: ${transaction.status}`);
      console.log(`   Amount: ${transaction.amount} RUB`);
      console.log(`   Aggregator: ${transaction.aggregator?.name || 'None'}`);
    }

  } catch (error: any) {
    if (error.response) {
      console.error(`\n❌ API Error: ${error.response.status}`);
      console.error(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.error(`\n❌ Error: ${error.message}`);
    }
  } finally {
    // Re-enable traders
    await db.user.updateMany({
      where: {},
      data: { banned: false }
    });
    console.log(`\n🔄 Re-enabled traders`);
  }

  process.exit(0);
}

simplePSPWareTest().catch(console.error);
