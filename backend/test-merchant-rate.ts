import { db } from './src/db';

async function checkMerchantTransactionCreation() {
  console.log('Checking merchant transaction creation for rate issues...\n');
  
  try {
    // Check recent transactions
    const transactions = await db.transaction.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderId: true,
        rate: true,
        merchantRate: true,
        adjustedRate: true,
        createdAt: true,
        amount: true,
        status: true,
        frozenUsdtAmount: true,
        traderProfit: true,
        feeInPercent: true,
        traderId: true
      }
    });
    
    console.log('Recent transactions analysis:');
    console.log('================================');
    
    let hasRateIssue = false;
    let nullRateCount = 0;
    let zeroRateCount = 0;
    
    for (const tx of transactions) {
      console.log(`\nTransaction ${tx.orderId}:`);
      console.log(`  Created: ${tx.createdAt.toISOString()}`);
      console.log(`  Amount: ${tx.amount} RUB`);
      console.log(`  Status: ${tx.status}`);
      console.log(`  Rate: ${tx.rate === null ? 'NULL' : tx.rate === 0 ? '0 (ZERO)' : tx.rate}`);
      console.log(`  MerchantRate: ${tx.merchantRate || 'NULL'}`);
      console.log(`  AdjustedRate: ${tx.adjustedRate || 'NULL'}`);
      console.log(`  FrozenUSDT: ${tx.frozenUsdtAmount || 'NULL'}`);
      console.log(`  TraderProfit: ${tx.traderProfit || 'NULL'}`);
      console.log(`  FeeInPercent: ${tx.feeInPercent || 'NULL'}`);
      
      if (tx.rate === null) {
        nullRateCount++;
        hasRateIssue = true;
        console.log(`  ❌ ISSUE: rate is NULL`);
      } else if (tx.rate === 0) {
        zeroRateCount++;
        hasRateIssue = true;
        console.log(`  ❌ ISSUE: rate is 0`);
      }
      
      // Calculate what profit should be if rate was correct
      if (tx.traderId && tx.feeInPercent && tx.feeInPercent > 0) {
        const expectedRate = tx.adjustedRate || tx.merchantRate || 95; // Use fallback
        if (expectedRate > 0) {
          const spentUsdt = tx.amount / expectedRate;
          const expectedProfit = spentUsdt * (tx.feeInPercent / 100);
          console.log(`  Expected profit (if rate=${expectedRate}): ${expectedProfit.toFixed(2)} USDT`);
        }
      }
    }
    
    console.log('\n================================');
    console.log('SUMMARY:');
    console.log(`Total transactions checked: ${transactions.length}`);
    console.log(`Transactions with NULL rate: ${nullRateCount}`);
    console.log(`Transactions with 0 rate: ${zeroRateCount}`);
    
    if (hasRateIssue) {
      console.log('\n❌ PROBLEM CONFIRMED: Transactions have NULL or 0 rate values');
      console.log('This prevents profit calculation in the trader confirmation flow');
      console.log('\nPOSSIBLE CAUSES:');
      console.log('1. The rapiraRateWithKkk variable might be undefined when creating transaction');
      console.log('2. There might be a database migration issue');
      console.log('3. The rate field might not be properly saved in Prisma');
      
      // Check if this is a migration issue
      const latestMigration = await db.$queryRaw`
        SELECT migration_name, finished_at 
        FROM _prisma_migrations 
        WHERE finished_at IS NOT NULL 
        ORDER BY finished_at DESC 
        LIMIT 5
      ` as any[];
      
      console.log('\nRecent migrations:');
      for (const migration of latestMigration) {
        console.log(`  - ${migration.migration_name} (${migration.finished_at})`);
      }
    } else {
      console.log('\n✅ No rate issues found in recent transactions');
    }
    
  } catch (error) {
    console.error('Error checking transactions:', error);
  } finally {
    await db.$disconnect();
  }
}

checkMerchantTransactionCreation();