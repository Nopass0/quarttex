import { db } from "../db";

async function checkAllTransactions() {
  const allTransactions = await db.transaction.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  
  console.log(`Total transactions in DB: ${allTransactions.length}`);
  console.log('\nTransaction details:');
  
  for (const tx of allTransactions) {
    console.log(`\n${tx.id}:`);
    console.log(`- Type: ${tx.type}`);
    console.log(`- Status: ${tx.status}`);
    console.log(`- Amount: ${tx.amount}`);
    console.log(`- Rate: ${tx.rate}`);
    console.log(`- traderProfit: ${tx.traderProfit}`);
    console.log(`- frozenUsdtAmount: ${tx.frozenUsdtAmount}`);
    console.log(`- calculatedCommission: ${tx.calculatedCommission}`);
  }
  
  process.exit(0);
}

checkAllTransactions().catch(console.error);