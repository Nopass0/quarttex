import { db } from "../db";
import { Status } from "@prisma/client";

async function fixReadyTransaction() {
  // Find all READY transactions with calculatedCommission but no traderProfit
  const transactions = await db.transaction.findMany({
    where: {
      status: Status.READY,
      calculatedCommission: { not: null },
      traderProfit: null
    }
  });

  console.log(`Found ${transactions.length} READY transactions with missing traderProfit`);

  for (const tx of transactions) {
    if (tx.calculatedCommission !== null) {
      // Truncate to 2 decimal places
      const truncatedProfit = Math.trunc(tx.calculatedCommission * 100) / 100;
      
      console.log(`\nUpdating ${tx.id}:`);
      console.log(`- calculatedCommission: ${tx.calculatedCommission}`);
      console.log(`- new traderProfit: ${truncatedProfit}`);
      
      await db.transaction.update({
        where: { id: tx.id },
        data: { traderProfit: truncatedProfit }
      });
    }
  }

  // Also check the specific transaction
  const specificTx = await db.transaction.findUnique({
    where: { id: "cmdj2gwh004mbikphqnqwyu9w" }
  });
  
  if (specificTx) {
    console.log(`\nSpecific transaction cmdj2gwh004mbikphqnqwyu9w:`);
    console.log(`- Status: ${specificTx.status}`);
    console.log(`- calculatedCommission: ${specificTx.calculatedCommission}`);
    console.log(`- traderProfit: ${specificTx.traderProfit}`);
  }

  console.log('\nDone!');
  process.exit(0);
}

fixReadyTransaction().catch(console.error);