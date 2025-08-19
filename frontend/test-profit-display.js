// Test profit display calculations

const testCases = [
  {
    amount: 5034,
    rate: 81.2,
    amountUsdt: 61.99,
    totalUsdt: 63.23,
    description: "User's example"
  },
  {
    amount: 4759,
    rate: 81.4,
    amountUsdt: 58.46,
    totalUsdt: 59.62,
    description: "Previous example"
  }
];

console.log("Testing profit display calculations:");
console.log("=".repeat(60));

testCases.forEach(test => {
  console.log(`\n${test.description}:`);
  console.log(`Amount: ${test.amount} RUB @ rate ${test.rate}`);
  console.log(`Amount USDT: ${test.amountUsdt}`);
  console.log(`Total USDT: ${test.totalUsdt}`);
  
  const profit = test.totalUsdt - test.amountUsdt;
  const profitRounded = profit.toFixed(2);
  const profitTruncated = (Math.trunc(profit * 100) / 100).toFixed(2);
  
  console.log(`\nProfit calculation:`);
  console.log(`- Exact: ${test.totalUsdt} - ${test.amountUsdt} = ${profit}`);
  console.log(`- With toFixed(2): ${profitRounded} ${profitRounded === '1.24' ? '❌ (rounds up)' : ''}`);
  console.log(`- With truncate: ${profitTruncated} ${profitTruncated === '1.23' ? '✅ (correct)' : ''}`);
  
  const profitRub = profit * test.rate;
  const profitRubRounded = Math.round(profitRub);
  const profitRubTruncated = Math.trunc((Math.trunc(profit * 100) / 100) * test.rate);
  
  console.log(`\nProfit in RUB:`);
  console.log(`- Exact: ${profit} * ${test.rate} = ${profitRub} RUB`);
  console.log(`- Rounded: ${profitRubRounded} RUB`);
  console.log(`- Truncated: ${profitRubTruncated} RUB`);
});

// Special case for 2% fee calculation
console.log("\n" + "=".repeat(60));
console.log("\nVerifying 2% fee calculation:");
const amount = 5034;
const rate = 81.2;
const fee = 2;

const amountUsdtExact = amount / rate;
const amountUsdtTrunc = Math.trunc(amountUsdtExact * 100) / 100;
const profitExact = amountUsdtTrunc * (fee / 100);
const profitTrunc = Math.trunc(profitExact * 100) / 100;

console.log(`Amount: ${amount} RUB`);
console.log(`Rate: ${rate}`);
console.log(`Amount USDT (exact): ${amountUsdtExact}`);
console.log(`Amount USDT (truncated): ${amountUsdtTrunc}`);
console.log(`Profit (exact): ${amountUsdtTrunc} * ${fee}% = ${profitExact}`);
console.log(`Profit (truncated): ${profitTrunc}`);