import { db } from "../db";

async function addMoreTraders() {
  // Add trader-merchant relationships for existing test traders
  const testTraders = await db.user.findMany({
    where: {
      email: {
        in: ["test-trader-acceptance@test.com", "test-trader-multi@test.com"]
      }
    }
  });

  // Update their deposits
  for (const trader of testTraders) {
    await db.user.update({
      where: { id: trader.id },
      data: { 
        deposit: 5000,
        balanceRub: 100000 // Ensure enough balance
      }
    });
    console.log(`Updated ${trader.email}: deposit=5000, balance=100000`);
  }

  // Get merchant with unassigned payouts
  const merchant = await db.merchant.findFirst({
    where: { id: "cmdghakvs021kike8b5c87g4e" }
  });

  if (!merchant) {
    console.log("Merchant not found");
    return;
  }

  // Add trader-merchant relationships
  for (const trader of testTraders) {
    const existing = await db.traderMerchant.findFirst({
      where: {
        traderId: trader.id,
        merchantId: merchant.id
      }
    });

    if (!existing) {
      await db.traderMerchant.create({
        data: {
          trader: { connect: { id: trader.id } },
          merchant: { connect: { id: merchant.id } },
          isMerchantEnabled: true,
          isFeeOutEnabled: true,
          feeOut: 5
        }
      });
      console.log(`Created relationship: ${trader.email} <-> ${merchant.name}`);
    } else {
      await db.traderMerchant.update({
        where: { id: existing.id },
        data: {
          isMerchantEnabled: true,
          isFeeOutEnabled: true
        }
      });
      console.log(`Updated relationship: ${trader.email} <-> ${merchant.name}`);
    }
  }

  // Add payout filters for all traders
  for (const trader of [...testTraders]) {
    const mainTrader = await db.user.findFirst({ where: { email: "trader@test.com" } });
    const allTraders = [...testTraders, mainTrader].filter(t => t);
    
    for (const t of allTraders) {
      if (!t) continue;
      
      await db.payoutFilters.upsert({
        where: { userId: t.id },
        create: {
          userId: t.id,
          trafficTypes: ["card", "sbp"],
          bankTypes: ["SBERBANK", "VTB", "ALFABANK", "TBANK"],
          maxPayoutAmount: 1000000
        },
        update: {
          trafficTypes: ["card", "sbp"],
          bankTypes: ["SBERBANK", "VTB", "ALFABANK", "TBANK"],
          maxPayoutAmount: 1000000
        }
      });
      console.log(`Updated filters for ${t.email}`);
    }
  }

  console.log("\nDone! Now there are 3 traders available for payouts.");
}

addMoreTraders().then(() => process.exit(0)).catch(console.error);