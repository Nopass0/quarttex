import { db } from "../db";

async function debugPayoutAssignment() {
  // Get one unassigned payout
  const payout = await db.payout.findFirst({
    where: {
      status: "CREATED",
      traderId: null
    },
    include: {
      merchant: {
        include: {
          traderMerchants: true
        }
      },
      blacklistEntries: true
    }
  });

  if (!payout) {
    console.log("No unassigned payouts found");
    return;
  }

  console.log(`\nDebugging payout #${payout.numericId}:`);
  console.log(`- Amount: ${payout.amount} RUB`);
  console.log(`- Bank: ${payout.bank}`);
  console.log(`- Type: ${payout.isCard ? 'Card' : 'SBP'}`);
  console.log(`- Merchant: ${payout.merchantId}`);
  console.log(`- Blacklist entries: ${payout.blacklistEntries.length}`);

  // Get the trader
  const trader = await db.user.findFirst({
    where: { email: "trader@test.com" },
    include: {
      payoutFilters: true,
      _count: {
        select: {
          payouts: {
            where: {
              OR: [
                { status: "ACTIVE" },
                { status: "CHECKING" },
                { 
                  status: "CREATED",
                  traderId: { not: null }
                }
              ]
            }
          }
        }
      }
    }
  });

  if (!trader) {
    console.log("Trader not found");
    return;
  }

  console.log(`\nTrader ${trader.email}:`);
  console.log(`- Balance: ${trader.balanceRub} RUB`);
  console.log(`- Active payouts: ${trader._count.payouts}/${trader.maxSimultaneousPayouts}`);
  console.log(`- Traffic enabled: ${trader.trafficEnabled}`);
  console.log(`- Deposit: ${trader.deposit}`);

  // Check filters
  if (trader.payoutFilters) {
    console.log("\nTrader filters:");
    console.log(`- Traffic types: ${trader.payoutFilters.trafficTypes}`);
    console.log(`- Bank types: ${trader.payoutFilters.bankTypes}`);
    console.log(`- Max amount: ${trader.payoutFilters.maxPayoutAmount}`);
    
    // Check bank filter match
    const payoutTrafficType = payout.isCard ? "card" : "sbp";
    console.log(`\nFilter checks:`);
    console.log(`- Payout traffic type: ${payoutTrafficType}`);
    console.log(`- Matches traffic filter: ${trader.payoutFilters.trafficTypes.includes(payoutTrafficType)}`);
    console.log(`- Payout bank: "${payout.bank}"`);
    console.log(`- Bank in filter list: ${trader.payoutFilters.bankTypes.includes(payout.bank)}`);
  }

  // Check merchant relationship
  const merchantRelation = payout.merchant.traderMerchants.find(
    (tm: any) => tm.traderId === trader.id
  );

  console.log(`\nMerchant relationship:`);
  console.log(`- Enabled: ${merchantRelation?.isMerchantEnabled || false}`);
  console.log(`- Fee out enabled: ${merchantRelation?.isFeeOutEnabled || false}`);

  // Check blacklist
  const isBlacklisted = payout.blacklistEntries.some(
    entry => entry.traderId === trader.id
  );
  console.log(`\nBlacklisted: ${isBlacklisted}`);

  // Check all conditions
  console.log("\nEligibility checks:");
  if (trader._count.payouts >= trader.maxSimultaneousPayouts) {
    console.log("❌ Reached max simultaneous payouts");
  } else {
    console.log("✅ Has capacity for more payouts");
  }

  if (trader.balanceRub < payout.amount) {
    console.log("❌ Insufficient balance");
  } else {
    console.log("✅ Sufficient balance");
  }

  if (!merchantRelation?.isMerchantEnabled) {
    console.log("❌ Not enabled for this merchant");
  } else {
    console.log("✅ Enabled for merchant");
  }

  if (isBlacklisted) {
    console.log("❌ Blacklisted for this payout");
  } else {
    console.log("✅ Not blacklisted");
  }
}

debugPayoutAssignment().then(() => process.exit(0)).catch(console.error);