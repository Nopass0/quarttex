const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPayoutsApi() {
  try {
    console.log('Testing Payouts API...');
    
    // Check if we have any payouts in the database
    const payoutsCount = await prisma.payout.count();
    console.log(`Total payouts in database: ${payoutsCount}`);
    
    if (payoutsCount === 0) {
      console.log('No payouts found in database');
      return;
    }
    
    // Check merchants
    const merchants = await prisma.merchant.findMany({
      select: { id: true, name: true }
    });
    console.log(`Found ${merchants.length} merchants:`, merchants);
    
    // Check payouts by merchant
    for (const merchant of merchants) {
      const merchantPayouts = await prisma.payout.findMany({
        where: { merchantId: merchant.id },
        select: {
          id: true,
          numericId: true,
          status: true,
          amount: true,
          bank: true,
          wallet: true,
          method: {
            select: {
              id: true,
              name: true,
              code: true
            }
          }
        },
        take: 3
      });
      
      console.log(`\nMerchant ${merchant.name} (${merchant.id}) has ${merchantPayouts.length} payouts`);
      if (merchantPayouts.length > 0) {
        console.log('Sample payouts:', merchantPayouts);
      }
    }
    
  } catch (error) {
    console.error('Error testing payouts API:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPayoutsApi();