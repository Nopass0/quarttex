import { db } from "../db";

async function checkTransaction57() {
  // Get all transactions ordered by creation date
  const transactions = await db.transaction.findMany({
    orderBy: {
      createdAt: 'asc'
    },
    where: {
      traderProfit: {
        gt: 0
      }
    },
    include: {
      trader: true,
      merchant: true,
      method: true
    }
  });

  console.log(`Total transactions with profit: ${transactions.length}`);
  
  // Check transactions around #57
  if (transactions.length >= 57) {
    for (let i = 55; i <= Math.min(58, transactions.length - 1); i++) {
      const tx = transactions[i];
      console.log(`\n=== Transaction #${i + 1} (${tx.id}) ===`);
      console.log(`- Trader: ${tx.trader.email}`);
      console.log(`- Amount: ${tx.amount} RUB`);
      console.log(`- Rate: ${tx.rate}`);
      console.log(`- Stored Trader Profit: ${tx.traderProfit}`);
      console.log(`- Status: ${tx.status}`);
      console.log(`- Created: ${tx.createdAt}`);
      
      // Calculate what the profit should be
      if (tx.rate && tx.traderProfit && tx.traderProfit > 0) {
        const spentUsdt = tx.amount / tx.rate;
        console.log(`- Spent USDT: ${spentUsdt}`);
        
        // Get trader merchant settings
        const traderMerchant = await db.traderMerchant.findUnique({
          where: {
            traderId_merchantId_methodId: {
              traderId: tx.traderId,
              merchantId: tx.merchantId,
              methodId: tx.methodId
            }
          }
        });
        
        const commission = traderMerchant?.feeIn || 0;
        const calculatedProfit = spentUsdt * (commission / 100);
        const truncatedProfit = Math.trunc(calculatedProfit * 100) / 100;
        
        console.log(`- Commission: ${commission}%`);
        console.log(`- Calculated profit (raw): ${calculatedProfit}`);
        console.log(`- Should be (truncated): ${truncatedProfit}`);
        
        if (tx.traderProfit !== truncatedProfit) {
          console.log(`\n⚠️  MISMATCH: Stored ${tx.traderProfit} should be ${truncatedProfit}`);
        }
      }
    }
  }
  
  // Check if transaction with profit 2.37 exists
  const tx237 = await db.transaction.findFirst({
    where: {
      traderProfit: 2.37
    },
    include: {
      trader: true
    }
  });
  
  if (tx237) {
    console.log(`\n\n=== Transaction with profit 2.37 (${tx237.id}) ===`);
    console.log(`- Trader: ${tx237.trader.email}`);
    console.log(`- Amount: ${tx237.amount} RUB`);
    console.log(`- Rate: ${tx237.rate}`);
    console.log(`- Profit: ${tx237.traderProfit}`);
  }
  
  process.exit(0);
}

checkTransaction57().catch(console.error);