import { db } from '../src/db';

/**
 * Script to truncate all existing frozenUsdt values to 2 decimal places
 * This ensures consistency with the new calculation logic
 */
async function truncateFrozenUsdt() {
  console.log('=== Truncating all frozenUsdt values to 2 decimal places ===\n');
  
  // Get all users with non-zero frozenUsdt
  const users = await db.user.findMany({
    where: {
      frozenUsdt: { gt: 0 }
    },
    select: {
      id: true,
      email: true,
      frozenUsdt: true
    }
  });
  
  console.log(`Found ${users.length} users with frozen USDT\n`);
  
  let updatedCount = 0;
  
  for (const user of users) {
    // Truncate to 2 decimal places (floor operation)
    const truncated = Math.floor(user.frozenUsdt * 100) / 100;
    
    if (truncated !== user.frozenUsdt) {
      console.log(`User ${user.email} (${user.id}):`);
      console.log(`  Current: ${user.frozenUsdt}`);
      console.log(`  Truncated: ${truncated}`);
      console.log(`  Difference: ${user.frozenUsdt - truncated}`);
      
      // Update the user's frozenUsdt
      await db.user.update({
        where: { id: user.id },
        data: { frozenUsdt: truncated }
      });
      
      updatedCount++;
    }
  }
  
  console.log(`\n✅ Updated ${updatedCount} users`);
  console.log(`✅ ${users.length - updatedCount} users already had correct values`);
  
  // Also truncate frozenUsdtAmount and calculatedCommission in transactions
  console.log('\n=== Truncating transaction frozen amounts ===\n');
  
  const transactions = await db.transaction.findMany({
    where: {
      OR: [
        { frozenUsdtAmount: { gt: 0 } },
        { calculatedCommission: { gt: 0 } }
      ]
    },
    select: {
      id: true,
      frozenUsdtAmount: true,
      calculatedCommission: true
    }
  });
  
  console.log(`Found ${transactions.length} transactions with frozen amounts\n`);
  
  let txUpdatedCount = 0;
  
  for (const tx of transactions) {
    const truncatedFrozen = tx.frozenUsdtAmount ? Math.floor(tx.frozenUsdtAmount * 100) / 100 : tx.frozenUsdtAmount;
    const truncatedCommission = tx.calculatedCommission ? Math.floor(tx.calculatedCommission * 100) / 100 : tx.calculatedCommission;
    
    if (truncatedFrozen !== tx.frozenUsdtAmount || truncatedCommission !== tx.calculatedCommission) {
      await db.transaction.update({
        where: { id: tx.id },
        data: {
          frozenUsdtAmount: truncatedFrozen,
          calculatedCommission: truncatedCommission
        }
      });
      
      txUpdatedCount++;
    }
  }
  
  console.log(`✅ Updated ${txUpdatedCount} transactions`);
  console.log(`✅ ${transactions.length - txUpdatedCount} transactions already had correct values`);
  
  process.exit(0);
}

truncateFrozenUsdt().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});