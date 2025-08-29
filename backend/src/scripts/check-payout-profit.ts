import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function checkPayoutProfit() {
  // Find payouts with profit around 1.17
  const payouts = await db.payout.findMany({
    where: {
      profitAmount: {
        gte: 1.15,
        lte: 1.20
      }
    },
    orderBy: { createdAt: 'desc' },
    include: {
      trader: true
    }
  });
  
  console.log(`Found ${payouts.length} payouts with profit between 1.15 and 1.20:`);
  
  for (const payout of payouts) {
    console.log(`\n=== Payout ${payout.id} ===`);
    console.log(`- Amount: ${payout.amount} RUB`);
    console.log(`- Rate: ${payout.rate}`);
    console.log(`- Amount USDT: ${payout.amountUsdt}`);
    console.log(`- Total USDT: ${payout.totalUsdt}`);
    console.log(`- Stored profit: ${payout.profitAmount}`);
    console.log(`- Status: ${payout.status}`);
  }
  
  // Take the first payout (with profit 1.16) to check calculation
  const payout = payouts[0];
  
  if (!payout) {
    console.log("\nNo payouts found");
    return;
  }
  
  console.log("\n=== Detailed calculation check ===");
  
  // Since totalUsdt equals amountUsdt, this looks like old format without separate totalUsdt
  // Let's check the fee calculation
  
  // Get trader-merchant fee
  const traderMerchant = await db.traderMerchant.findFirst({
    where: {
      traderId: payout.traderId,
      merchantId: payout.merchantId,
    },
  });

  if (traderMerchant) {
    console.log(`\nTrader-Merchant fee: ${traderMerchant.feeOut}%`);
    
    // Calculate what the profit should be
    const amountInUsdt = payout.amount / payout.rate;
    const profit = amountInUsdt * (traderMerchant.feeOut / 100);
    
    console.log(`\nCalculation details:`);
    console.log(`- Amount: ${payout.amount} RUB`);
    console.log(`- Rate: ${payout.rate}`);
    console.log(`- Amount in USDT (exact): ${payout.amount} / ${payout.rate} = ${amountInUsdt}`);
    console.log(`- Fee: ${traderMerchant.feeOut}%`);
    console.log(`- Profit (exact): ${amountInUsdt} * ${traderMerchant.feeOut/100} = ${profit}`);
    console.log(`- Profit (Math.round): ${Math.round(profit * 100) / 100}`);
    console.log(`- Profit (Math.trunc): ${Math.trunc(profit * 100) / 100}`);
    console.log(`- Stored profit: ${payout.profitAmount}`);
    
    // Check different rounding methods
    console.log(`\nDifferent rounding methods:`);
    console.log(`- Math.ceil(${profit} * 100) / 100 = ${Math.ceil(profit * 100) / 100}`);
    console.log(`- Math.floor(${profit} * 100) / 100 = ${Math.floor(profit * 100) / 100}`);
    console.log(`- Math.round(${profit} * 100) / 100 = ${Math.round(profit * 100) / 100}`);
    console.log(`- Math.trunc(${profit} * 100) / 100 = ${Math.trunc(profit * 100) / 100}`);
    
    // Check the actual calculation used in the code
    console.log(`\nActual code calculation (with double truncation):`);
    const amountInUsdtTruncated = Math.trunc((payout.amount / payout.rate) * 100) / 100;
    const profitWithDoubleTrunc = Math.trunc(amountInUsdtTruncated * (traderMerchant.feeOut / 100) * 100) / 100;
    console.log(`- Amount in USDT (truncated): ${amountInUsdtTruncated}`);
    console.log(`- Profit from truncated amount: ${amountInUsdtTruncated} * ${traderMerchant.feeOut/100} = ${amountInUsdtTruncated * (traderMerchant.feeOut / 100)}`);
    console.log(`- Final profit (truncated): ${profitWithDoubleTrunc}`);
  } else {
    console.log("No trader-merchant relation found");
  }
}

checkPayoutProfit()
  .catch(console.error)
  .finally(() => db.$disconnect());