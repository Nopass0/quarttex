import { db } from "../db";

async function testNewTransaction() {
  // Check transactions created in last 5 minutes
  const recentTransactions = await db.transaction.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 5 * 60 * 1000)
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  console.log(`Recent transactions (last 5 minutes):`);
  for (const tx of recentTransactions) {
    console.log(`\n${tx.id}:`);
    console.log(`- Created: ${tx.createdAt}`);
    console.log(`- Amount: ${tx.amount} RUB`);
    console.log(`- Status: ${tx.status}`);
    console.log(`- calculatedCommission: ${tx.calculatedCommission}`);
    console.log(`- traderProfit: ${tx.traderProfit}`);
    console.log(`- frozenUsdtAmount: ${tx.frozenUsdtAmount}`);
  }

  process.exit(0);
}

testNewTransaction().catch(console.error);