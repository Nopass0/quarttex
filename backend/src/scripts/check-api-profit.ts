import { db } from "../db";
import { Status, TransactionType } from "@prisma/client";

async function checkApiProfit() {
  // Get a few recent transactions
  const transactions = await db.transaction.findMany({
    where: {
      type: TransactionType.IN,
      status: Status.READY,
      rate: { not: null }
    },
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      trader: true,
      merchant: true,
      method: true
    }
  });

  console.log(`Found ${transactions.length} READY IN transactions\n`);

  for (const tx of transactions) {
    console.log(`Transaction ${tx.id}:`);
    console.log(`- Amount: ${tx.amount} RUB`);
    console.log(`- Rate: ${tx.rate}`);
    console.log(`- Stored traderProfit: ${tx.traderProfit}`);
    console.log(`- adjustedRate: ${tx.adjustedRate}`);
    console.log(`- kkkPercent: ${tx.kkkPercent}`);
    
    // Calculate what API would return
    const traderRate = tx.adjustedRate || 
      (tx.rate !== null && tx.kkkPercent !== null 
        ? Math.floor(tx.rate * (1 - tx.kkkPercent / 100) * 100) / 100 
        : tx.rate);
    
    const profit = tx.traderProfit || 0;
    
    console.log(`- API would return:`);
    console.log(`  - rate: ${traderRate}`);
    console.log(`  - profit: ${profit}`);
    console.log(`  - calculatedCommission: ${profit}`);
    
    // Check trader merchant commission
    if (tx.traderId) {
      const traderMerchant = await db.traderMerchant.findUnique({
        where: {
          traderId_merchantId_methodId: {
            traderId: tx.traderId,
            merchantId: tx.merchantId,
            methodId: tx.methodId
          }
        }
      });
      console.log(`- TraderMerchant feeIn: ${traderMerchant?.feeIn || 'NOT FOUND'}%`);
    }
    
    console.log('---');
  }
  
  process.exit(0);
}

checkApiProfit().catch(console.error);