#!/usr/bin/env bun
/**
 * Update PSPWare aggregator URL to use mock server
 */

import { db } from "@/db";

async function updatePSPWareUrl() {
  console.log("🔧 Updating PSPWare aggregator URL...\n");

  try {
    const result = await db.aggregator.update({
      where: {
        email: "pspware@ware.psp"
      },
      data: {
        apiBaseUrl: "http://localhost:4002"
      }
    });

    console.log("✅ Updated PSPWare aggregator:");
    console.log(`  Name: ${result.name}`);
    console.log(`  Email: ${result.email}`);
    console.log(`  New URL: ${result.apiBaseUrl}`);
    console.log(`  API Key: ${result.pspwareApiKey}`);

  } catch (error) {
    console.error("❌ Error:", error);
  }

  process.exit(0);
}

updatePSPWareUrl().catch(console.error);