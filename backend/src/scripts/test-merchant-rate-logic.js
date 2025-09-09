const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();

async function testMerchantRateLogic() {
  try {
    console.log('Testing merchant rate source logic...');
    
    const merchantId = 'cmdyme1kt0002ikcl6ag7821o'; // BT Merchant
    
    // Get merchant rate source configuration
    const merchantRateSource = await db.merchantRateSource.findFirst({
      where: { 
        merchantId: merchantId,
        isActive: true
      },
      include: {
        rateSource: true
      },
      orderBy: {
        priority: 'asc' // Use highest priority (lowest number)
      }
    });
    
    console.log('Merchant rate source configuration:', JSON.stringify(merchantRateSource, null, 2));
    
    if (merchantRateSource) {
      console.log(`\nMerchant: ${merchantId}`);
      console.log(`Rate Source: ${merchantRateSource.rateSource.displayName} (${merchantRateSource.rateSource.source})`);
      console.log(`Merchant Provides Rate: ${merchantRateSource.merchantProvidesRate}`);
      console.log(`Priority: ${merchantRateSource.priority}`);
      
      if (!merchantRateSource.merchantProvidesRate) {
        console.log('\n✅ EXPECTED BEHAVIOR: Merchant should use rate from source, not provide own rate');
        console.log(`   Rate source: ${merchantRateSource.rateSource.displayName}`);
      } else {
        console.log('\n❌ Merchant is configured to provide own rate');
      }
    } else {
      console.log('\n❌ No rate source configuration found for merchant');
    }
    
  } catch (error) {
    console.error('Error testing merchant rate logic:', error);
  } finally {
    await db.$disconnect();
  }
}

testMerchantRateLogic();


