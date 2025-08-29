// Test script to verify rate calculation formula
// Formula: s0 = s / (1 + (p/100)) where s = rate, p = commission

function calculateEffectiveRate(rate: number, commissionPercent: number): number {
  return rate / (1 + (commissionPercent / 100));
}

// Test cases
const testCases = [
  { rate: 100, commission: 5, expected: 95.238 },  // 100 / 1.05 = 95.238
  { rate: 95, commission: 10, expected: 86.364 },  // 95 / 1.10 = 86.364
  { rate: 110, commission: 3, expected: 106.796 }, // 110 / 1.03 = 106.796
  { rate: 92.5, commission: 7, expected: 86.449 }, // 92.5 / 1.07 = 86.449
  { rate: 105, commission: 2.5, expected: 102.439 }, // 105 / 1.025 = 102.439
];

console.log("Testing rate calculation formula: s0 = s / (1 + (p/100))\n");

for (const test of testCases) {
  const result = calculateEffectiveRate(test.rate, test.commission);
  const rounded = Math.round(result * 1000) / 1000; // Round to 3 decimal places
  const expectedRounded = Math.round(test.expected * 1000) / 1000;
  const passed = Math.abs(rounded - expectedRounded) < 0.001;
  
  console.log(`Rate: ${test.rate}, Commission: ${test.commission}%`);
  console.log(`  Expected: ${test.expected.toFixed(3)}`);
  console.log(`  Calculated: ${result.toFixed(3)}`);
  console.log(`  Status: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
}

// Example with USDT calculation
console.log("Example USDT calculation:");
console.log("========================");
const amount = 10000; // 10,000 RUB
const rate = 95; // Original rate from transaction
const commission = 5; // 5% commission
const effectiveRate = calculateEffectiveRate(rate, commission);

console.log(`Transaction amount: ${amount} RUB`);
console.log(`Original rate: ${rate}`);
console.log(`Commission: ${commission}%`);
console.log(`Effective rate (calculated): ${effectiveRate.toFixed(3)}`);
console.log(`USDT before commission: ${(amount / effectiveRate).toFixed(2)} USDT`);
console.log(`Commission amount: ${((amount / effectiveRate) * (commission / 100)).toFixed(2)} USDT`);
console.log(`USDT after commission: ${((amount / effectiveRate) * (1 - commission / 100)).toFixed(2)} USDT`);