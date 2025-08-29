// Test script to verify rate calculation with KKK (Rapira) percentage
// Formula: s0 = s / (1 + (p/100)) where s = rate, p = kkkPercent from RateSettings

function calculateEffectiveRate(rate: number, kkkPercent: number): number {
  return rate / (1 + (kkkPercent / 100));
}

// Test cases with different KKK percentages
const testCases = [
  { rate: 100, kkk: 2, expected: 98.039 },    // 100 / 1.02 = 98.039
  { rate: 95, kkk: 3, expected: 92.233 },     // 95 / 1.03 = 92.233
  { rate: 110, kkk: 1.5, expected: 108.374 }, // 110 / 1.015 = 108.374
  { rate: 92.5, kkk: 2.5, expected: 90.244 }, // 92.5 / 1.025 = 90.244
  { rate: 105, kkk: 5, expected: 100 },       // 105 / 1.05 = 100
];

console.log("Testing rate calculation with KKK (Rapira) percentage");
console.log("Formula: s0 = s / (1 + (kkk/100))\n");
console.log("Where:");
console.log("  s = original rate from transaction");
console.log("  kkk = KKK percentage from RateSettings for the method");
console.log("  s0 = effective rate for merchant\n");
console.log("=" .repeat(60) + "\n");

for (const test of testCases) {
  const result = calculateEffectiveRate(test.rate, test.kkk);
  const rounded = Math.round(result * 1000) / 1000; // Round to 3 decimal places
  const expectedRounded = Math.round(test.expected * 1000) / 1000;
  const passed = Math.abs(rounded - expectedRounded) < 0.001;
  
  console.log(`Rate: ${test.rate}, KKK: ${test.kkk}%`);
  console.log(`  Expected: ${test.expected.toFixed(3)}`);
  console.log(`  Calculated: ${result.toFixed(3)}`);
  console.log(`  Status: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
}

// Real-world example with USDT calculation
console.log("=" .repeat(60));
console.log("\nReal-world example:");
console.log("=" .repeat(60) + "\n");

const amount = 10000; // 10,000 RUB transaction
const originalRate = 95; // Rate from transaction
const kkkPercent = 2.5; // KKK percentage for Rapira
const methodCommission = 5; // Method commission percentage

const effectiveRate = calculateEffectiveRate(originalRate, kkkPercent);

console.log("Transaction details:");
console.log(`  Amount: ${amount} RUB`);
console.log(`  Original rate: ${originalRate}`);
console.log(`  KKK (Rapira): ${kkkPercent}%`);
console.log(`  Method commission: ${methodCommission}%`);
console.log();

console.log("Calculations:");
console.log(`  1. Effective rate = ${originalRate} / (1 + ${kkkPercent}/100) = ${effectiveRate.toFixed(3)}`);
console.log(`  2. USDT amount = ${amount} / ${effectiveRate.toFixed(3)} = ${(amount / effectiveRate).toFixed(2)} USDT`);
console.log(`  3. Method commission = ${(amount / effectiveRate).toFixed(2)} * ${methodCommission}% = ${((amount / effectiveRate) * (methodCommission / 100)).toFixed(2)} USDT`);
console.log(`  4. Final USDT for merchant = ${(amount / effectiveRate).toFixed(2)} - ${((amount / effectiveRate) * (methodCommission / 100)).toFixed(2)} = ${((amount / effectiveRate) * (1 - methodCommission / 100)).toFixed(2)} USDT`);
console.log();

console.log("Summary:");
console.log(`  Merchant receives: ${((amount / effectiveRate) * (1 - methodCommission / 100)).toFixed(2)} USDT`);
console.log(`  Platform commission: ${((amount / effectiveRate) * (methodCommission / 100)).toFixed(2)} USDT`);
console.log(`  KKK difference: ${(amount / originalRate - amount / effectiveRate).toFixed(2)} USDT`);