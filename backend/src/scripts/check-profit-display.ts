import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function checkProfitDisplay() {
  // Find the payout with profit 1.16
  const payout = await db.payout.findFirst({
    where: {
      profitAmount: 1.16,
      amount: 4759
    },
    include: {
      trader: true,
      merchant: true
    }
  });

  if (!payout) {
    console.log("Payout not found");
    return;
  }

  console.log("=== Payout Details ===");
  console.log(`ID: ${payout.id}`);
  console.log(`Amount: ${payout.amount} RUB`);
  console.log(`Rate: ${payout.rate}`);
  console.log(`Amount USDT: ${payout.amountUsdt}`);
  console.log(`Total USDT: ${payout.totalUsdt}`);
  console.log(`Profit Amount (stored): ${payout.profitAmount}`);
  console.log(`Status: ${payout.status}`);

  // Check different display formats
  console.log("\n=== Display Formats ===");
  if (payout.profitAmount !== null) {
    console.log(`Raw value: ${payout.profitAmount}`);
    console.log(`toFixed(2): ${payout.profitAmount.toFixed(2)}`);
    console.log(`toString(): ${payout.profitAmount.toString()}`);
    console.log(`JSON.stringify: ${JSON.stringify(payout.profitAmount)}`);
    
    // Check if it's a precision issue
    console.log(`\n=== Precision Check ===`);
    console.log(`Exact value: ${payout.profitAmount}`);
    console.log(`* 100 = ${payout.profitAmount * 100}`);
    console.log(`Is 116? ${payout.profitAmount * 100 === 116}`);
    console.log(`Is 117? ${payout.profitAmount * 100 === 117}`);
    
    // Check what different rounding would give
    const exactProfit = 1.1692874692874693; // From our previous calculation
    console.log(`\n=== If exact value was ${exactProfit} ===`);
    console.log(`Math.round: ${Math.round(exactProfit * 100) / 100}`);
    console.log(`Math.ceil: ${Math.ceil(exactProfit * 100) / 100}`);
    console.log(`Math.floor: ${Math.floor(exactProfit * 100) / 100}`);
    console.log(`Math.trunc: ${Math.trunc(exactProfit * 100) / 100}`);
  }

  // Check if there's a view or computed column
  console.log("\n=== Raw SQL Check ===");
  const rawResult = await db.$queryRaw`
    SELECT 
      id,
      amount,
      rate,
      "amountUsdt",
      "totalUsdt",
      "profitAmount",
      "profitAmount"::text as profit_text,
      round("profitAmount"::numeric, 2) as profit_rounded
    FROM "Payout"
    WHERE id = ${payout.id}
  `;
  
  console.log("Raw SQL result:", rawResult);
}

checkProfitDisplay()
  .catch(console.error)
  .finally(() => db.$disconnect());