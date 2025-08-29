import { db } from '@/db';
import { MethodType, BankType } from '@prisma/client';

async function checkWellbitRequisites() {
  try {
    // Check all active methods
    const methods = await db.method.findMany({
      where: { isEnabled: true }
    });
    
    console.log('\n=== Active Methods ===');
    methods.forEach(m => {
      console.log(`${m.code} (${m.type}): ${m.name} - Min: ${m.minPayin}, Max: ${m.maxPayin}`);
    });

    // Check all active requisites
    const requisites = await db.bankDetail.findMany({
      where: {
        isArchived: false,
        user: { banned: false }
      },
      include: { user: true }
    });

    console.log('\n=== Active Requisites by Bank ===');
    const requisitesByBank = requisites.reduce((acc, r) => {
      if (!acc[r.bankType]) acc[r.bankType] = [];
      acc[r.bankType].push(r);
      return acc;
    }, {} as Record<string, typeof requisites>);

    Object.entries(requisitesByBank).forEach(([bank, reqs]) => {
      console.log(`\n${bank}: ${reqs.length} requisites`);
      reqs.slice(0, 3).forEach(r => {
        console.log(`  - ${r.cardNumber.slice(0, 4)}**** (${r.methodType}): ${r.minAmount}-${r.maxAmount} RUB, User: ${r.user.email}`);
      });
      if (reqs.length > 3) console.log(`  ... and ${reqs.length - 3} more`);
    });

    // Check specific bank for Wellbit test
    console.log('\n=== Checking ALFABANK requisites (for ACRUB mapping) ===');
    const alfabankReqs = await db.bankDetail.findMany({
      where: {
        isArchived: false,
        bankType: BankType.ALFABANK,
        user: { banned: false }
      },
      include: { user: true }
    });

    console.log(`Found ${alfabankReqs.length} ALFABANK requisites:`);
    alfabankReqs.forEach(r => {
      console.log(`- ${r.cardNumber} (${r.methodType}): ${r.minAmount}-${r.maxAmount} RUB`);
      console.log(`  User: ${r.user.email}, User limits: ${r.user.minAmountPerRequisite}-${r.user.maxAmountPerRequisite}`);
    });

    // Check if 3833 RUB amount can be processed
    const testAmount = 3833;
    console.log(`\n=== Testing amount ${testAmount} RUB ===`);
    
    const suitableReqs = requisites.filter(r => 
      testAmount >= r.minAmount && 
      testAmount <= r.maxAmount &&
      testAmount >= r.user.minAmountPerRequisite &&
      testAmount <= r.user.maxAmountPerRequisite
    );

    console.log(`Found ${suitableReqs.length} suitable requisites for ${testAmount} RUB:`);
    suitableReqs.slice(0, 5).forEach(r => {
      console.log(`- ${r.bankType}: ${r.cardNumber.slice(0, 4)}**** (${r.methodType})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

checkWellbitRequisites();