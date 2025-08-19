// Test the formatAmount function with different values

function formatAmountOld(amount) {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatAmountNew(amount) {
  // Truncate to 2 decimal places instead of rounding
  const truncated = Math.trunc(amount * 100) / 100
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(truncated)
}

// Test cases
const testValues = [
  1.169,     // Should be 1.16, not 1.17
  1.165,     // Should be 1.16, not 1.17
  1.164,     // Should be 1.16
  1.161,     // Should be 1.16
  2.999,     // Should be 2.99, not 3
  0.385,     // Should be 0.38, not 0.39
  58.464,    // Should be 58.46
  58.465,    // Should be 58.46, not 58.47
];

console.log('Comparing old (rounding) vs new (truncating) formatAmount:');
console.log('='.repeat(60));

testValues.forEach(value => {
  const old = formatAmountOld(value);
  const new_ = formatAmountNew(value);
  const changed = old !== new_ ? '⚠️  CHANGED' : '✓';
  
  console.log(`Value: ${value}`);
  console.log(`  Old (round): ${old}`);
  console.log(`  New (trunc): ${new_} ${changed}`);
  console.log('-'.repeat(40));
});

// Special test for the problematic value
console.log('\nSpecial test for profit calculation:');
const profit = 1.1692874692874693;
console.log(`Exact profit: ${profit}`);
console.log(`Old format (round): ${formatAmountOld(profit)}`);
console.log(`New format (trunc): ${formatAmountNew(profit)}`);
console.log(`Math.round: ${Math.round(profit * 100) / 100}`);
console.log(`Math.trunc: ${Math.trunc(profit * 100) / 100}`);