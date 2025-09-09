#!/usr/bin/env bun
/**
 * Check PSPWare aggregator configuration and routing
 */

import { db } from "@/db";

async function checkPSPWareAggregator() {
  console.log("🔍 Checking PSPWare aggregator configuration...\n");

  try {
    // 1. Find PSPWare aggregator
    const pspwareAgg = await db.aggregator.findFirst({
      where: {
        email: "pspware@ware.psp"
      }
    });

    if (!pspwareAgg) {
      console.log("❌ PSPWare aggregator not found with email: pspware@ware.psp");
      
      // List all aggregators
      const allAggs = await db.aggregator.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          apiSchema: true,
          isActive: true,
          balanceUsdt: true
        }
      });
      
      console.log("\n📋 All aggregators:");
      allAggs.forEach(agg => {
        console.log(`  - ${agg.name} (${agg.email})`);
        console.log(`    Schema: ${agg.apiSchema}, Active: ${agg.isActive}, Balance: ${agg.balanceUsdt}`);
      });
      
      return;
    }

    console.log("✅ Found PSPWare aggregator:");
    console.log(`  ID: ${pspwareAgg.id}`);
    console.log(`  Name: ${pspwareAgg.name}`);
    console.log(`  Email: ${pspwareAgg.email}`);
    console.log(`  API Schema: ${pspwareAgg.apiSchema}`);
    console.log(`  API Base URL: ${pspwareAgg.apiBaseUrl || "NOT SET"}`);
    console.log(`  PSPWare API Key: ${pspwareAgg.pspwareApiKey ? "✅ SET" : "❌ NOT SET"}`);
    console.log(`  Is Active: ${pspwareAgg.isActive ? "✅ YES" : "❌ NO"}`);
    console.log(`  Balance USDT: ${pspwareAgg.balanceUsdt}`);
    console.log(`  Priority: ${pspwareAgg.priority}`);
    console.log(`  Randomization: ${pspwareAgg.enableRandomization ? `✅ ${pspwareAgg.randomizationType}` : "❌ Disabled"}`);

    // Check issues
    const issues = [];
    if (!pspwareAgg.isActive) issues.push("❌ Aggregator is not active");
    if (pspwareAgg.apiSchema !== "PSPWARE") issues.push("❌ API Schema is not PSPWARE");
    if (!pspwareAgg.apiBaseUrl) issues.push("❌ API Base URL is not set");
    if (!pspwareAgg.pspwareApiKey) issues.push("❌ PSPWare API key is not set");
    if (pspwareAgg.balanceUsdt <= 0) issues.push("❌ Balance is 0 or negative");

    if (issues.length > 0) {
      console.log("\n⚠️ Issues found:");
      issues.forEach(issue => console.log(`  ${issue}`));
    } else {
      console.log("\n✅ Aggregator is properly configured for PSPWare!");
    }

    // 2. Check if there are any active traders
    console.log("\n🔍 Checking active traders...");
    const activeTraders = await db.user.count({
      where: {
        role: "trader",
        banned: false
      }
    });
    console.log(`  Active traders: ${activeTraders}`);

    // 3. Check recent transactions
    console.log("\n🔍 Checking recent transactions for this aggregator...");
    const recentTransactions = await db.transaction.findMany({
      where: {
        aggregatorId: pspwareAgg.id
      },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        numericId: true,
        status: true,
        amount: true,
        createdAt: true
      }
    });

    if (recentTransactions.length > 0) {
      console.log(`  Found ${recentTransactions.length} recent transactions:`);
      recentTransactions.forEach(tx => {
        console.log(`    - #${tx.numericId}: ${tx.status} - ${tx.amount} RUB - ${tx.createdAt.toISOString()}`);
      });
    } else {
      console.log("  No transactions found for this aggregator");
    }

    // 4. Check integration logs
    console.log("\n🔍 Checking integration logs...");
    const logs = await db.aggregatorIntegrationLog.findMany({
      where: {
        aggregatorId: pspwareAgg.id
      },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        eventType: true,
        method: true,
        url: true,
        statusCode: true,
        error: true,
        createdAt: true
      }
    });

    if (logs.length > 0) {
      console.log(`  Found ${logs.length} recent integration logs:`);
      logs.forEach(log => {
        console.log(`    - ${log.eventType}: ${log.method} ${log.url}`);
        if (log.statusCode) console.log(`      Status: ${log.statusCode}`);
        if (log.error) console.log(`      ❌ Error: ${log.error}`);
      });
    } else {
      console.log("  No integration logs found");
    }

    // 5. Test if mock server is running
    if (pspwareAgg.apiBaseUrl) {
      console.log("\n🔍 Testing API endpoint...");
      try {
        const response = await fetch(`${pspwareAgg.apiBaseUrl}/merchant/v2/health`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            merchant_api: pspwareAgg.pspwareApiKey || "test",
            sign: "test"
          }),
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          console.log(`  ✅ API endpoint is responding (${response.status})`);
        } else {
          console.log(`  ⚠️ API endpoint returned status ${response.status}`);
        }
      } catch (error: any) {
        console.log(`  ❌ Failed to reach API endpoint: ${error.message}`);
        if (pspwareAgg.apiBaseUrl.includes("localhost:4002")) {
          console.log("  💡 Try running the mock PSPWare server: bun /tmp/mock-pspware-server.ts");
        }
      }
    }

  } catch (error) {
    console.error("\n❌ Error:", error);
  }

  console.log("\n✅ Check completed!");
  process.exit(0);
}

checkPSPWareAggregator().catch(console.error);