import { db } from "../db";
import { Status, TransactionType } from "@prisma/client";

async function fixTraderProfit() {
  // Find transactions with calculatedCommission but no traderProfit
  const transactions = await db.transaction.findMany({
    where: {
      calculatedCommission: { not: null },
      traderProfit: null
    }
  });

  console.log(`Found ${transactions.length} transactions to fix`);

  for (const tx of transactions) {
    if (tx.calculatedCommission !== null) {
      // Truncate to 2 decimal places
      const truncatedProfit = Math.trunc(tx.calculatedCommission * 100) / 100;
      
      console.log(`Updating ${tx.id}: calculatedCommission=${tx.calculatedCommission} -> traderProfit=${truncatedProfit}`);
      
      await db.transaction.update({
        where: { id: tx.id },
        data: { traderProfit: truncatedProfit }
      });
    }
  }

  console.log('\nDone! Checking updated transactions:');
  
  // Verify the updates
  const updated = await db.transaction.findMany({
    where: {
      traderProfit: { not: null }
    }
  });

  for (const tx of updated) {
    console.log(`${tx.id}: traderProfit=${tx.traderProfit}`);
  }

  process.exit(0);
}

fixTraderProfit().catch(console.error);