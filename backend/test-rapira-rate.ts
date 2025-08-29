import { rapiraService } from './src/services/rapira.service';
import { db } from './src/db';

async function testRapiraRate() {
  console.log('Testing Rapira rate fetching...\n');
  
  try {
    // Test 1: Get base rate from Rapira
    console.log('1. Fetching base rate from Rapira API...');
    const baseRate = await rapiraService.getUsdtRubRate();
    console.log(`   Base rate from Rapira: ${baseRate}`);
    
    if (!baseRate || baseRate === 0) {
      console.error('   ❌ ERROR: Base rate is 0 or undefined!');
    } else {
      console.log('   ✅ Base rate fetched successfully');
    }
    
    // Test 2: Get KKK from database
    console.log('\n2. Getting KKK from database...');
    const rateSettingRecord = await db.rateSetting.findFirst({
      where: { id: 1 },
    });
    const rapiraKkk = rateSettingRecord?.rapiraKkk || 0;
    console.log(`   KKK from database: ${rapiraKkk}%`);
    
    // Test 3: Calculate rate with KKK
    console.log('\n3. Calculating rate with KKK...');
    const rateWithKkk = await rapiraService.getRateWithKkk(rapiraKkk);
    console.log(`   Rate with KKK: ${rateWithKkk}`);
    
    if (!rateWithKkk || rateWithKkk === 0) {
      console.error('   ❌ ERROR: Rate with KKK is 0 or undefined!');
    } else {
      console.log('   ✅ Rate with KKK calculated successfully');
    }
    
    // Test 4: Check recent transactions for rate values
    console.log('\n4. Checking recent transactions for rate values...');
    const recentTransactions = await db.transaction.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderId: true,
        rate: true,
        merchantRate: true,
        adjustedRate: true,
        createdAt: true,
        amount: true,
        status: true
      }
    });
    
    console.log('   Recent transactions:');
    for (const tx of recentTransactions) {
      console.log(`   - ${tx.orderId}:`);
      console.log(`     Created: ${tx.createdAt.toISOString()}`);
      console.log(`     Amount: ${tx.amount} RUB`);
      console.log(`     Rate: ${tx.rate || 'NULL'}`);
      console.log(`     MerchantRate: ${tx.merchantRate || 'NULL'}`);
      console.log(`     AdjustedRate: ${tx.adjustedRate || 'NULL'}`);
      console.log(`     Status: ${tx.status}`);
      
      if (!tx.rate || tx.rate === 0) {
        console.error(`     ❌ WARNING: Transaction has 0 or NULL rate!`);
      }
    }
    
    // Test 5: Simulate what happens in merchant transaction creation
    console.log('\n5. Simulating merchant transaction creation...');
    console.log(`   Using rapiraRateWithKkk: ${rateWithKkk}`);
    console.log(`   This value should be set as transaction.rate`);
    
    // Summary
    console.log('\n=== SUMMARY ===');
    console.log(`Base rate: ${baseRate}`);
    console.log(`KKK: ${rapiraKkk}%`);
    console.log(`Rate with KKK: ${rateWithKkk}`);
    
    if (rateWithKkk && rateWithKkk > 0) {
      console.log('✅ Rate calculation is working correctly');
      console.log('If transactions still have rate=0, check the merchant API endpoint');
    } else {
      console.error('❌ Rate calculation is failing - this is the root cause!');
    }
    
  } catch (error) {
    console.error('Error testing Rapira rate:', error);
  } finally {
    await db.$disconnect();
  }
}

testRapiraRate();