#!/usr/bin/env bun

import { db } from "@/db";

async function checkMerchant() {
  const merchant = await db.merchant.findFirst({
    where: { name: "Test Merchant PSPWare" }
  });

  if (merchant) {
    console.log("Merchant found:");
    console.log(`  Name: ${merchant.name}`);
    console.log(`  Public Key: ${merchant.apiKeyPublic}`);
    console.log(`  Private Key: ${merchant.apiKeyPrivate}`);
    console.log(`  Token: ${merchant.token}`);
    console.log(`  Disabled: ${merchant.disabled}`);
  } else {
    console.log("Merchant not found");
  }

  // Also check all merchants
  const allMerchants = await db.merchant.findMany({
    select: {
      name: true,
      apiKeyPublic: true,
      disabled: true
    }
  });

  console.log("\nAll merchants:");
  allMerchants.forEach(m => {
    console.log(`  - ${m.name}: ${m.apiKeyPublic} (disabled: ${m.disabled})`);
  });

  process.exit(0);
}

checkMerchant().catch(console.error);
