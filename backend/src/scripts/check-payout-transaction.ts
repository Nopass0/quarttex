import { db } from "../db";

async function checkPayoutTransaction() {
  const payout = await db.payout.findUnique({
    where: { id: "cmd6gwi360001towx4m8r5uck" },
    include: {
      transaction: true,
      trader: true,
      merchant: true
    }
  });

  console.log("Payout details:");
  console.log(`- ID: ${payout?.id}`);
  console.log(`- Numeric ID: ${payout?.numericId}`);
  console.log(`- Status: ${payout?.status}`);
  console.log(`- Amount: ${payout?.amount} RUB`);
  console.log(`- Total: ${payout?.total} RUB`);
  console.log(`- Trader: ${payout?.trader?.email}`);
  console.log(`- Transaction ID: ${payout?.transactionId}`);

  if (payout?.transaction) {
    console.log("\nTransaction details:");
    console.log(`- ID: ${payout.transaction.id}`);
    console.log(`- Status: ${payout.transaction.status}`);
    console.log(`- Type: ${payout.transaction.type}`);
    console.log(`- Amount: ${payout.transaction.amount} RUB`);
    console.log(`- Amount USDT: ${payout.transaction.amountUsdt} USDT`);
    console.log(`- Total: ${payout.transaction.total} RUB`);
    console.log(`- Total USDT: ${payout.transaction.totalUsdt} USDT`);
    console.log(`- Rate: ${payout.transaction.rate}`);
    console.log(`- Trader Balance Before: ${payout.transaction.traderBalanceBefore}`);
    console.log(`- Trader Balance After: ${payout.transaction.traderBalanceAfter}`);
    console.log(`- Trader ID: ${payout.transaction.traderId}`);
  } else {
    console.log("\nNo transaction created for this payout");
  }

  process.exit(0);
}

checkPayoutTransaction().catch(console.error);
