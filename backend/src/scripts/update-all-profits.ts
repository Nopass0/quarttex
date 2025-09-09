import { db } from "../db";
import { Status, TransactionType } from "@prisma/client";

async function updateAllProfits() {
  // Find all transactions without checking profit > 0
  const transactions = await db.transaction.findMany({
    where: {
      status: {
        in: [Status.READY, Status.COMPLETED]
      },
      type: TransactionType.IN,
      rate: {
        not: null
      }
    },
    include: {
      trader: true,
      merchant: true,
      method: true
    }
  });

  console.log(`Found ${transactions.length} IN transactions with rate`);
  
  let updatedCount = 0;
  
  for (const tx of transactions) {
    if (!tx.rate || !tx.traderId) continue;
    
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
    
    const commissionPercent = traderMerchant?.feeIn || 0;
    if (commissionPercent === 0) continue;
    
    const spentUsdt = tx.amount / tx.rate;
    const calculatedProfit = spentUsdt * (commissionPercent / 100);
    const truncatedProfit = Math.trunc(calculatedProfit * 100) / 100;
    
    // Check if we need to update
    if (tx.traderProfit !== truncatedProfit) {
      console.log(`\nUpdating transaction ${tx.id}:`);
      console.log(`- Amount: ${tx.amount} RUB`);
      console.log(`- Rate: ${tx.rate}`);
      console.log(`- Commission: ${commissionPercent}%`);
      console.log(`- Current profit: ${tx.traderProfit}`);
      console.log(`- New profit: ${truncatedProfit}`);
      
      // Update the transaction
      await db.transaction.update({
        where: { id: tx.id },
        data: { traderProfit: truncatedProfit }
      });
      
      updatedCount++;
    }
  }
  
  console.log(`\n✅ Updated ${updatedCount} transactions`);
  
  // Now check for the specific case
  const checkTx = await db.transaction.findMany({
    where: {
      traderProfit: {
        gte: 2.36,
        lte: 2.38
      }
    },
    include: {
      trader: true
    }
  });
  
  console.log(`\nTransactions with profit between 2.36 and 2.38:`);
  for (const tx of checkTx) {
    console.log(`- ${tx.id}: profit=${tx.traderProfit}, amount=${tx.amount}, rate=${tx.rate}`);
  }
  
  process.exit(0);
}

updateAllProfits().catch(console.error);