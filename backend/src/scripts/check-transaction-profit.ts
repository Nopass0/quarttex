import { db } from "../db";

async function checkTransactionProfit() {
  // Check the specific transaction
  const transaction = await db.transaction.findUnique({
    where: { id: "cmdj2gwh004mbikphqnqwyu9w" },
    include: {
      trader: true,
      merchant: true,
      method: true
    }
  });

  if (!transaction) {
    console.log("Transaction not found");
    return;
  }

  console.log("Transaction details:");
  console.log(`- ID: ${transaction.id}`);
  console.log(`- Amount: ${transaction.amount} RUB`);
  console.log(`- Rate: ${transaction.rate}`);
  console.log(`- Status: ${transaction.status}`);
  console.log(`- traderProfit: ${transaction.traderProfit}`);
  console.log(`- calculatedCommission: ${transaction.calculatedCommission}`);
  console.log(`- frozenUsdtAmount: ${transaction.frozenUsdtAmount}`);
  console.log(`- Trader ID: ${transaction.traderId}`);
  console.log(`- Merchant ID: ${transaction.merchantId}`);
  console.log(`- Method ID: ${transaction.methodId}`);

  // Check trader merchant settings
  if (transaction.traderId) {
    const traderMerchant = await db.traderMerchant.findUnique({
      where: {
        traderId_merchantId_methodId: {
          traderId: transaction.traderId,
          merchantId: transaction.merchantId,
          methodId: transaction.methodId
        }
      }
    });

    if (traderMerchant) {
      console.log("\nTraderMerchant settings:");
      console.log(`- feeIn: ${traderMerchant.feeIn}%`);
      console.log(`- feeOut: ${traderMerchant.feeOut}%`);
      
      // Calculate expected profit
      if (transaction.rate && traderMerchant.feeIn) {
        const spentUsdt = transaction.amount / transaction.rate;
        const profit = spentUsdt * (traderMerchant.feeIn / 100);
        const truncatedProfit = Math.trunc(profit * 100) / 100;
        
        console.log("\nExpected profit calculation:");
        console.log(`- Spent USDT: ${spentUsdt}`);
        console.log(`- Profit (raw): ${profit}`);
        console.log(`- Profit (truncated): ${truncatedProfit}`);
      }
    } else {
      console.log("\n❌ TraderMerchant settings NOT FOUND!");
      console.log("This is why profit is 0 - no commission settings for this trader-merchant-method combination");
    }
  }
  
  process.exit(0);
}

checkTransactionProfit().catch(console.error);