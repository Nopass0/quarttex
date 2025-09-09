import { db } from "../db";

async function updateTrader() {
  const trader = await db.user.update({
    where: { email: "trader@test.com" },
    data: { deposit: 5000 }
  });
  
  console.log(`Updated ${trader.email} deposit to ${trader.deposit}`);
  
  // Also check if trader is enabled for the merchants with unassigned payouts
  const unassignedPayouts = await db.payout.findMany({
    where: {
      status: "CREATED",
      traderId: null
    },
    select: {
      merchantId: true
    },
    distinct: ['merchantId']
  });
  
  console.log("\nMerchants with unassigned payouts:", unassignedPayouts.map(p => p.merchantId));
  
  // Check trader-merchant relationships
  const traderMerchants = await db.traderMerchant.findMany({
    where: {
      traderId: trader.id,
      merchantId: { in: unassignedPayouts.map(p => p.merchantId) }
    }
  });
  
  console.log("\nTrader-merchant relationships for unassigned payouts:", traderMerchants.length);
  
  if (traderMerchants.length === 0) {
    console.log("\nCreating trader-merchant relationship...");
    const firstMerchantId = unassignedPayouts[0]?.merchantId;
    if (firstMerchantId) {
      await db.traderMerchant.create({
        data: {
          traderId: trader.id,
          merchantId: firstMerchantId,
          isMerchantEnabled: true,
          isFeeOutEnabled: true,
          feeOut: 5 // 5% commission
        }
      });
      console.log("Created relationship with merchant:", firstMerchantId);
    }
  }
}

updateTrader().then(() => process.exit(0)).catch(console.error);