import { db } from "../db";

async function checkTransaction() {
  // Find transactions with traderProfit = 5.36
  const transactions = await db.transaction.findMany({
    where: {
      traderProfit: 5.36
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
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log("Transactions with profit 5.36:");
  for (const tx of transactions) {
    console.log(`\nTransaction ${tx.id}:`);
    console.log(`- Amount: ${tx.amount} RUB`);
    console.log(`- Rate: ${tx.rate}`);
    console.log(`- Trader Profit: ${tx.traderProfit}`);
    
    // Calculate what the profit should be
    if (tx.rate) {
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
    }
  }
  
  process.exit(0);
}

checkTransaction().catch(console.error);