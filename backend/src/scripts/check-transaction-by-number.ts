import { db } from "../db";

async function checkTransactionByNumber() {
  // Get all transactions ordered by creation date
  const transactions = await db.transaction.findMany({
    orderBy: {
      createdAt: 'asc'
    },
    select: {
      id: true,
      amount: true,
      rate: true,
      traderProfit: true,
      status: true,
      createdAt: true,
      traderId: true,
      merchantId: true,
      methodId: true
    }
  });

  console.log(`Total transactions: ${transactions.length}`);
  
  // Check transaction #54 (index 53)
  if (transactions.length >= 54) {
    const tx = transactions[53]; // 54th transaction (0-based index)
    console.log(`\nTransaction #54 (${tx.id}):`);
    console.log(`- Amount: ${tx.amount} RUB`);
    console.log(`- Rate: ${tx.rate}`);
    console.log(`- Trader Profit: ${tx.traderProfit}`);
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
      const roundedProfit = Math.floor(calculatedProfit * 100) / 100;
      
      console.log(`- Commission: ${commission}%`);
      console.log(`- Calculated profit: ${calculatedProfit}`);
      console.log(`- Should be (rounded down): ${roundedProfit}`);
      
      if (tx.traderProfit !== roundedProfit) {
        console.log(`\n⚠️  MISMATCH: Current profit ${tx.traderProfit} should be ${roundedProfit}`);
      }
    }
  }
  
  // Also check recent transactions with non-zero profit
  console.log("\n\nRecent transactions with profit:");
  const recentWithProfit = await db.transaction.findMany({
    where: {
      traderProfit: {
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
      traderProfit: true,
      status: true,
      createdAt: true
    }
  });
  
  for (const tx of recentWithProfit) {
    const spentUsdt = tx.rate ? tx.amount / tx.rate : 0;
    const expectedProfit = Math.floor(spentUsdt * 0.02 * 100) / 100; // Assuming 2% commission
    console.log(`\n${tx.id}: profit=${tx.traderProfit}, expected≈${expectedProfit} (amount=${tx.amount}, rate=${tx.rate})`);
  }
  
  process.exit(0);
}

checkTransactionByNumber().catch(console.error);