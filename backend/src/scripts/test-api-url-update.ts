#!/usr/bin/env bun
/**
 * Test updating aggregator API URL through admin endpoint
 */

import { db } from "@/db";
import { AdminRole } from "@prisma/client";

async function testApiUrlUpdate() {
  console.log("🧪 Testing API URL update for aggregators...\n");

  try {
    // 1. Get admin token
    console.log("1️⃣ Getting admin token...");
    const admin = await db.admin.findFirst({
      where: { role: AdminRole.ADMIN }
    });

    if (!admin) {
      console.log("❌ No admin found, creating one...");
      const newAdmin = await db.admin.create({
        data: {
          token: "test-admin-token-" + Date.now(),
          role: AdminRole.ADMIN,
          backupCodes: []
        }
      });
      console.log("✅ Created admin with token:", newAdmin.token);
    }

    const adminToken = admin?.token || "test-admin-token";

    // 2. Find or create an aggregator
    console.log("\n2️⃣ Finding aggregator...");
    let aggregator = await db.aggregator.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!aggregator) {
      aggregator = await db.aggregator.create({
        data: {
          email: "test@aggregator.com",
          name: "Test Aggregator",
          password: "hashed",
          apiToken: "test-token-" + Date.now(),
          callbackToken: "callback-" + Date.now(),
          isActive: true,
          balanceUsdt: 1000
        }
      });
      console.log("✅ Created test aggregator");
    } else {
      console.log(`✅ Using existing aggregator: ${aggregator.name}`);
    }

    console.log(`   Current API URL: ${aggregator.apiBaseUrl || "Not set"}`);

    // 3. Test updating API URL
    console.log("\n3️⃣ Testing API URL update...");
    const newUrl = "https://new-api.example.com";
    
    const response = await fetch(
      `http://localhost:3000/api/admin/aggregators/${aggregator.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminToken
        },
        body: JSON.stringify({
          apiBaseUrl: newUrl
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.log(`❌ Failed to update: ${response.status} - ${error}`);
      return;
    }

    const updated = await response.json();
    console.log(`✅ API URL updated successfully!`);
    console.log(`   New URL: ${updated.apiBaseUrl}`);

    // 4. Verify in database
    console.log("\n4️⃣ Verifying in database...");
    const dbCheck = await db.aggregator.findUnique({
      where: { id: aggregator.id }
    });

    if (dbCheck?.apiBaseUrl === newUrl) {
      console.log(`✅ Database confirmed: ${dbCheck.apiBaseUrl}`);
    } else {
      console.log(`❌ Database mismatch: ${dbCheck?.apiBaseUrl}`);
    }

    // 5. Test clearing the URL
    console.log("\n5️⃣ Testing URL removal...");
    const clearResponse = await fetch(
      `http://localhost:3000/api/admin/aggregators/${aggregator.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminToken
        },
        body: JSON.stringify({
          apiBaseUrl: null
        })
      }
    );

    if (clearResponse.ok) {
      const cleared = await clearResponse.json();
      console.log(`✅ API URL cleared: ${cleared.apiBaseUrl || "null"}`);
    }

    // 6. Test setting PSPWare mock URL
    console.log("\n6️⃣ Setting PSPWare mock URL...");
    const pspwareResponse = await fetch(
      `http://localhost:3000/api/admin/aggregators/${aggregator.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminToken
        },
        body: JSON.stringify({
          apiBaseUrl: "http://localhost:4002",
          apiSchema: "PSPWARE",
          pspwareApiKey: "test-pspware-key-123"
        })
      }
    );

    if (pspwareResponse.ok) {
      const pspware = await pspwareResponse.json();
      console.log(`✅ Configured for PSPWare:`);
      console.log(`   URL: ${pspware.apiBaseUrl}`);
      console.log(`   Schema: ${pspware.apiSchema}`);
    }

  } catch (error) {
    console.error("\n❌ Error:", error);
  }

  console.log("\n✅ Test completed!");
  process.exit(0);
}

testApiUrlUpdate().catch(console.error);