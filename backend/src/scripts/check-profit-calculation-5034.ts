import { truncate2 } from "../utils/rounding";

// Test data from the user
const amount = 5034; // RUB
const rate = 81.2;
const feeOut = 2; // assuming 2% fee

console.log("=== Checking Profit Calculation ===");
console.log(`Amount: ${amount} RUB`);
console.log(`Rate: ${rate}`);
console.log(`Fee: ${feeOut}%`);

// Step 1: Convert to USDT (as done in the code)
const amountInUsdtExact = amount / rate;
const amountInUsdt = Math.trunc(amountInUsdtExact * 100) / 100;

console.log(`\nStep 1: Convert to USDT`);
console.log(`- Exact: ${amount} / ${rate} = ${amountInUsdtExact}`);
console.log(`- Truncated: ${amountInUsdt}`);

// Step 2: Calculate profit
const profitExact = amountInUsdt * (feeOut / 100);
const profitTruncated = truncate2(profitExact);

console.log(`\nStep 2: Calculate profit`);
console.log(`- Exact: ${amountInUsdt} * ${feeOut/100} = ${profitExact}`);
console.log(`- Truncated (truncate2): ${profitTruncated}`);

// Check different methods
console.log(`\nDifferent calculation methods:`);
console.log(`- Math.round: ${Math.round(profitExact * 100) / 100}`);
console.log(`- Math.ceil: ${Math.ceil(profitExact * 100) / 100}`);
console.log(`- Math.floor: ${Math.floor(profitExact * 100) / 100}`);
console.log(`- Math.trunc: ${Math.trunc(profitExact * 100) / 100}`);

// Check if the issue is in the display
console.log(`\nIf showing as 1.24, it might be:`);
const profitInRub = profitTruncated * rate;
console.log(`- Profit in RUB: ${profitTruncated} * ${rate} = ${profitInRub} RUB`);
console.log(`- Rounded RUB: ${Math.round(profitInRub)} RUB`);

// Check alternative calculation
console.log(`\nAlternative: If profit was calculated differently:`);
const alternativeProfit = 1.24;
const requiredAmountUsdt = alternativeProfit / (feeOut / 100);
console.log(`- To get profit ${alternativeProfit}, amount USDT would need to be: ${requiredAmountUsdt}`);
console.log(`- That would mean rate: ${amount / requiredAmountUsdt}`);