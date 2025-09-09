// Test truncation logic
console.log("Testing Math.trunc vs Math.floor for profit calculation:\n");

// Test case from the user: 5.3576 should become 5.35
const testCases = [
  5.3576,
  5.3551,
  5.3599,
  5.36,
  1.999,
  1.001,
  10.12999
];

for (const value of testCases) {
  const truncated = Math.trunc(value * 100) / 100;
  const floored = Math.floor(value * 100) / 100;
  
  console.log(`Value: ${value}`);
  console.log(`- Math.trunc: ${truncated}`);
  console.log(`- Math.floor: ${floored}`);
  console.log(`- Match: ${truncated === floored ? "✓" : "✗"}\n`);
}

// Specific test for the transaction issue
console.log("Specific case from transaction #54:");
const amount = 26788; // Example amount
const rate = 95; // Example rate
const commission = 2; // 2%

const spentUsdt = amount / rate;
const profit = spentUsdt * (commission / 100);
const truncatedProfit = Math.trunc(profit * 100) / 100;

console.log(`Amount: ${amount} RUB`);
console.log(`Rate: ${rate}`);
console.log(`Spent USDT: ${spentUsdt}`);
console.log(`Profit (raw): ${profit}`);
console.log(`Profit (truncated): ${truncatedProfit}`);