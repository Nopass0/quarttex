import { PrismaClient } from "@prisma/client";
import { truncate2 } from "../utils/rounding";

const db = new PrismaClient();

async function testPayoutProfitCalculation() {
  // Test data matching the problematic payout
  const amount = 4759; // RUB
  const rate = 81.4;
  const feeOut = 2; // 2%
  
  console.log("=== Testing Payout Profit Calculation ===");
  console.log(`Amount: ${amount} RUB`);
  console.log(`Rate: ${rate}`);
  console.log(`Fee: ${feeOut}%`);
  
  // Step 1: Calculate amount in USDT (as done in the code)
  const amountInUsdtExact = amount / rate;
  const amountInUsdt = Math.trunc(amountInUsdtExact * 100) / 100;
  
  console.log(`\nStep 1: Convert to USDT`);
  console.log(`- Exact: ${amount} / ${rate} = ${amountInUsdtExact}`);
  console.log(`- Truncated: ${amountInUsdt}`);
  
  // Step 2: Calculate profit
  const profitExact = amountInUsdt * (feeOut / 100);
  const profitTruncated = truncate2(profitExact);
  
  console.log(`\nStep 2: Calculate profit`);
  console.log(`- Exact: ${amountInUsdt} * ${feeOut/100} = ${profitExact}`);
  console.log(`- Truncated: ${profitTruncated}`);
  
  // Show what would happen with different rounding
  console.log(`\nDifferent rounding methods:`);
  console.log(`- Math.round: ${Math.round(profitExact * 100) / 100}`);
  console.log(`- Math.ceil: ${Math.ceil(profitExact * 100) / 100}`);
  console.log(`- Math.floor: ${Math.floor(profitExact * 100) / 100}`);
  console.log(`- Math.trunc: ${Math.trunc(profitExact * 100) / 100}`);
  
  // Let's also check if the problem is in the display
  console.log(`\nCheck if problem is in display:`);
  console.log(`- Stored value: ${profitTruncated}`);
  console.log(`- toFixed(2): ${profitTruncated.toFixed(2)}`);
  console.log(`- toString(): ${profitTruncated.toString()}`);
  
  // Test with actual database data
  console.log(`\n=== Checking actual database payouts ===`);
  
  const recentPayouts = await db.payout.findMany({
    where: {
      profitAmount: {
        gt: 0
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 5,
    select: {
      id: true,
      amount: true,
      rate: true,
      amountUsdt: true,
      totalUsdt: true,
      profitAmount: true,
      status: true,
    }
  });
  
  console.log(`Found ${recentPayouts.length} recent payouts with profit:`);
  
  for (const payout of recentPayouts) {
    console.log(`\nPayout ${payout.id}:`);
    console.log(`- Amount: ${payout.amount} RUB`);
    console.log(`- Rate: ${payout.rate}`);
    console.log(`- Amount USDT: ${payout.amountUsdt}`);
    console.log(`- Total USDT: ${payout.totalUsdt}`);
    console.log(`- Stored profit: ${payout.profitAmount}`);
    
    // Try to recalculate
    if (payout.totalUsdt && payout.amountUsdt) {
      const recalcProfit = truncate2(payout.totalUsdt - payout.amountUsdt);
      console.log(`- Recalculated profit: ${recalcProfit}`);
      console.log(`- Match: ${recalcProfit === payout.profitAmount ? 'YES' : 'NO'}`);
    }
  }
}

testPayoutProfitCalculation()
  .catch(console.error)
  .finally(() => db.$disconnect());