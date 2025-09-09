#!/usr/bin/env bun
/**
 * Test merchant deal routing to PSPWare aggregator
 */

import { db } from "@/db";
import axios from "axios";

const API_URL = process.env.API_URL || "http://localhost:3000/api";

async function testMerchantToPSPWare() {
  console.log("🔍 Testing merchant to PSPWare routing...\n");

  try {
    // 1. Find or create test merchant
    console.log("1️⃣ Setting up test merchant...");
    let merchant = await db.merchant.findFirst({
      where: { name: "Test Merchant PSPWare" }
    });

    if (!merchant) {
      merchant = await db.merchant.create({
        data: {
          name: "Test Merchant PSPWare",
          token: "test-merchant-pspware-" + Date.now(),
          apiKeyPublic: "test-pspware-merchant-key",
          apiKeyPrivate: "test-pspware-merchant-secret",
          disabled: false,
          balanceUsdt: 5000
        }
      });
      console.log("  Created new merchant");
    } else {
      console.log(`  Using existing merchant: ${merchant.name}`);
    }

    // 2. Ensure merchant has SBP method
    console.log("\n2️⃣ Checking payment method...");
    let method = await db.method.findFirst({
      where: {
        type: "sbp",
        isEnabled: true
      }
    });

    if (!method) {
      method = await db.method.create({
        data: {
          name: "СБП",
          code: "sbp-" + Date.now(),
          type: "sbp",
          currency: "rub",
          isEnabled: true,
          minPayin: 100,
          maxPayin: 300000,
          minPayout: 100,
          maxPayout: 300000,
          commissionPayin: 2.5,
          commissionPayout: 2.5,
          chancePayin: 100,
          chancePayout: 100
        }
      });
      console.log("  Created SBP method");
    } else {
      console.log("  SBP method exists");
    }

    // Link method to merchant if not linked
    const merchantMethod = await db.merchantMethod.findFirst({
      where: {
        merchantId: merchant.id,
        methodId: method.id
      }
    });

    if (!merchantMethod) {
      await db.merchantMethod.create({
        data: {
          merchantId: merchant.id,
          methodId: method.id,
          isEnabled: true
        }
      });
      console.log("  Linked method to merchant");
    }

    // 3. Disable all traders to force aggregator routing
    console.log("\n3️⃣ Disabling traders to force aggregator routing...");
    const disabledCount = await db.user.updateMany({
      where: {},  // All users are traders in this system
      data: { banned: true }
    });
    console.log(`  Disabled ${disabledCount.count} traders`);

    // 4. Check PSPWare aggregator status
    console.log("\n4️⃣ Checking PSPWare aggregator...");
    const pspwareAgg = await db.aggregator.findFirst({
      where: {
        apiSchema: "PSPWARE",
        isActive: true
      }
    });

    if (!pspwareAgg) {
      console.log("❌ No active PSPWare aggregator found!");
      return;
    }

    console.log(`  ✅ PSPWare aggregator active: ${pspwareAgg.name}`);
    console.log(`     URL: ${pspwareAgg.apiBaseUrl}`);
    console.log(`     Balance: ${pspwareAgg.balanceUsdt} USDT`);

    // 5. Create deal through merchant API
    console.log("\n5️⃣ Creating deal through merchant API...");
    const dealRequest = {
      amount: 2500, // Will be randomized if enabled
      orderId: `test-merchant-pspware-${Date.now()}`,
      clientIdentifier: "test-client-pspware",
      userIp: "192.168.1.100",
      callbackUri: `${API_URL}/test/callback`,
      rate: 96.5
    };

    console.log("Request:");
    console.log(JSON.stringify(dealRequest, null, 2));

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
      console.log("Response:");
      console.log(JSON.stringify(response.data, null, 2));

      if (response.data.data) {
        // Check if deal went to PSPWare
        const transaction = await db.transaction.findUnique({
          where: { id: response.data.data.id },
          include: {
            aggregator: true
          }
        });

        if (transaction?.aggregator) {
          console.log(`\n🎯 Deal routed to aggregator: ${transaction.aggregator.name}`);
          console.log(`   Schema: ${transaction.aggregator.apiSchema}`);
          
          if (transaction.aggregator.apiSchema === "PSPWARE") {
            console.log("   ✅ Successfully routed to PSPWare!");
          }
        }
      }

    } catch (error: any) {
      if (error.response) {
        console.error("\n❌ API Error:");
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
        
        if (error.response.data?.error === "NO_REQUISITE") {
          console.log("\n⚠️ Still getting NO_REQUISITE. Checking logs...");
          
          // Check integration logs
          const logs = await db.aggregatorIntegrationLog.findMany({
            where: {
              aggregatorId: pspwareAgg.id,
              createdAt: {
                gte: new Date(Date.now() - 60000) // Last minute
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 3
          });

          if (logs.length > 0) {
            console.log("\nRecent integration logs:");
            logs.forEach(log => {
              console.log(`  - ${log.eventType}: ${log.statusCode || 'N/A'}`);
              if (log.error) console.log(`    Error: ${log.error}`);
            });
          }
        }
      } else {
        console.error("\n❌ Network error:", error.message);
      }
    }

  } catch (error) {
    console.error("\n❌ Error:", error);
  } finally {
    // Re-enable traders
    console.log("\n🔄 Re-enabling traders...");
    await db.user.updateMany({
      where: {},
      data: { banned: false }
    });
  }

  console.log("\n✅ Test completed!");
  process.exit(0);
}

testMerchantToPSPWare().catch(console.error);