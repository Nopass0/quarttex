#!/usr/bin/env bun
/**
 * Test aggregator routing logic
 */

import { db } from "@/db";
import { aggregatorQueueService } from "@/services/aggregator-queue.service";

async function testAggregatorRouting() {
  console.log("🔍 Testing aggregator routing...\n");

  try {
    // 1. Check available aggregators
    console.log("1️⃣ Checking available aggregators...");
    const aggregators = await db.aggregator.findMany({
      where: {
        isActive: true,
        apiBaseUrl: { not: null }
      },
      orderBy: [
        { priority: 'asc' },
        { updatedAt: 'asc' }
      ]
    });

    console.log(`Found ${aggregators.length} active aggregators with API URL:`);
    aggregators.forEach(agg => {
      console.log(`  - ${agg.name} (${agg.email})`);
      console.log(`    Schema: ${agg.apiSchema}`);
      console.log(`    URL: ${agg.apiBaseUrl}`);
      console.log(`    Balance: ${agg.balanceUsdt} USDT`);
      console.log(`    Min Balance: ${agg.minBalance || 0}`);
      console.log(`    Priority: ${agg.priority}`);
      console.log(`    Daily Volume: ${agg.currentDailyVolume}/${agg.maxDailyVolume || 'unlimited'}`);
    });

    // 2. Filter by balance
    const availableAggregators = aggregators.filter(agg => {
      if (agg.minBalance > 0 && agg.balanceUsdt < agg.minBalance) {
        console.log(`\n⚠️ ${agg.name} filtered out - insufficient balance (${agg.balanceUsdt} < ${agg.minBalance})`);
        return false;
      }
      if (agg.maxDailyVolume && agg.currentDailyVolume >= agg.maxDailyVolume) {
        console.log(`\n⚠️ ${agg.name} filtered out - daily volume exceeded`);
        return false;
      }
      return true;
    });

    console.log(`\n✅ ${availableAggregators.length} aggregators pass filters`);

    // 3. Test routing a deal
    console.log("\n2️⃣ Testing deal routing...");
    const testRequest = {
      ourDealId: `test-${Date.now()}`,
      amount: 1000,
      rate: 96.5,
      paymentMethod: "SBP" as const,
      clientIdentifier: "test-client",
      callbackUrl: "http://localhost:3000/api/callback/test",
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      metadata: {
        merchantId: "test-merchant",
        methodId: "test-method"
      }
    };

    console.log("Test request:");
    console.log(JSON.stringify(testRequest, null, 2));

    const result = await aggregatorQueueService.routeDealToAggregators(testRequest);

    console.log("\n📥 Routing result:");
    console.log(`Success: ${result.success}`);
    console.log(`Tried aggregators: ${result.triedAggregators.join(", ") || "none"}`);
    if (result.aggregator) {
      console.log(`Selected aggregator: ${result.aggregator.name}`);
    }
    if (result.response) {
      console.log(`Response:`, JSON.stringify(result.response, null, 2));
    }

    // 4. Check integration logs
    if (result.triedAggregators.length > 0) {
      console.log("\n3️⃣ Checking integration logs...");
      for (const aggId of result.triedAggregators) {
        const logs = await db.aggregatorIntegrationLog.findMany({
          where: {
            aggregatorId: aggId,
            ourDealId: testRequest.ourDealId
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        });

        if (logs.length > 0) {
          const log = logs[0];
          console.log(`\n${aggId}:`);
          console.log(`  Event: ${log.eventType}`);
          console.log(`  URL: ${log.url}`);
          console.log(`  Status: ${log.statusCode || "N/A"}`);
          console.log(`  Error: ${log.error || "none"}`);
        }
      }
    }

  } catch (error) {
    console.error("\n❌ Error:", error);
  }

  console.log("\n✅ Test completed!");
  process.exit(0);
}

testAggregatorRouting().catch(console.error);