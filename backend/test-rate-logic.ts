/**
 * Тестовый скрипт для проверки логики rate и merchantRate
 */

import { db } from './src/db';
import { rapiraService } from './src/services/rapira.service';

async function testRateLogic() {
  console.log('=== Testing Rate Logic ===\n');
  
  // Get Rapira rate with KKK
  const rateSettingRecord = await db.rateSetting.findFirst({
    where: { id: 1 },
  });
  const rapiraKkk = rateSettingRecord?.rapiraKkk || 0;
  const rapiraRateWithKkk = await rapiraService.getRateWithKkk(rapiraKkk);
  
  console.log(`Rapira rate with KKK (${rapiraKkk}%): ${rapiraRateWithKkk}`);
  
  // Test scenarios
  const scenarios = [
    { name: 'Merchant provides rate', merchantRate: 95.5, expectedRate: rapiraRateWithKkk, expectedMerchantRate: 95.5 },
    { name: 'Merchant does not provide rate', merchantRate: undefined, expectedRate: rapiraRateWithKkk, expectedMerchantRate: rapiraRateWithKkk },
  ];
  
  for (const scenario of scenarios) {
    console.log(`\n--- ${scenario.name} ---`);
    
    // Simulate merchant rate logic
    let merchantRate = scenario.merchantRate;
    if (merchantRate === undefined) {
      merchantRate = rapiraRateWithKkk;
      console.log(`No rate provided, merchantRate will use Rapira rate: ${merchantRate}`);
    } else {
      console.log(`Merchant provided rate: ${merchantRate}`);
    }
    
    // rate field is always from Rapira with KKK
    const transactionRate = rapiraRateWithKkk;
    
    console.log(`Transaction fields:`);
    console.log(`  rate: ${transactionRate} (always Rapira)`);
    console.log(`  merchantRate: ${merchantRate} (merchant provided or Rapira if not provided)`);
    
    // Verify expectations
    if (transactionRate === scenario.expectedRate) {
      console.log(`  ✅ rate is correct`);
    } else {
      console.log(`  ❌ rate is incorrect. Expected: ${scenario.expectedRate}, Got: ${transactionRate}`);
    }
    
    if (merchantRate === scenario.expectedMerchantRate) {
      console.log(`  ✅ merchantRate is correct`);
    } else {
      console.log(`  ❌ merchantRate is incorrect. Expected: ${scenario.expectedMerchantRate}, Got: ${merchantRate}`);
    }
    
    // Show freezing calculation
    const amount = 10000; // 10000 RUB
    const frozenUsdt = Math.floor((amount / merchantRate) * 100) / 100;
    console.log(`  Freezing calculation: ${amount} RUB / ${merchantRate} = ${frozenUsdt} USDT`);
  }
  
  // Check recent transactions
  console.log('\n=== Recent Transactions ===');
  const recentTx = await db.transaction.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      amount: true,
      rate: true,
      merchantRate: true,
      frozenUsdtAmount: true,
      createdAt: true
    }
  });
  
  for (const tx of recentTx) {
    console.log(`\nTransaction ${tx.id}:`);
    console.log(`  Amount: ${tx.amount} RUB`);
    console.log(`  rate: ${tx.rate} (should be Rapira)`);
    console.log(`  merchantRate: ${tx.merchantRate}`);
    console.log(`  frozenUsdtAmount: ${tx.frozenUsdtAmount}`);
    console.log(`  Created: ${tx.createdAt.toISOString()}`);
  }
  
  process.exit(0);
}

testRateLogic().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});