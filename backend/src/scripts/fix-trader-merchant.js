const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixTraderMerchantRelation() {
  try {
    // Get trader and merchant IDs
    const trader = await prisma.user.findUnique({
      where: { email: 'trader@test.com' },
      select: { id: true, email: true }
    });
    
    const merchant = await prisma.merchant.findFirst({
      where: { name: 'test' },
      select: { id: true, name: true }
    });
    
    // Find the first available method
    const method = await prisma.method.findFirst({
      select: { id: true, name: true, code: true }
    });
    
    console.log('Trader:', trader);
    console.log('Merchant:', merchant); 
    console.log('Method:', method);
    
    if (!trader || !merchant || !method) {
      console.log('Trader, merchant or method not found');
      return;
    }
    
    // Create trader-merchant relationship
    const relation = await prisma.traderMerchant.upsert({
      where: {
        traderId_merchantId_methodId: {
          traderId: trader.id,
          merchantId: merchant.id,
          methodId: method.id
        }
      },
      update: {
        isMerchantEnabled: true
      },
      create: {
        traderId: trader.id,
        merchantId: merchant.id,
        methodId: method.id,
        isMerchantEnabled: true
      }
    });
    
    console.log('Created/updated trader-merchant relation:', relation);
    
    // Update trader payout filters to accept cards
    const updatedFilters = await prisma.payoutFilters.update({
      where: { userId: trader.id },
      data: {
        trafficTypes: ['sbp', 'card'], // Accept both SBP and cards
        bankTypes: ['SBERBANK'], // Accept Sberbank
        maxPayoutAmount: 100000
      }
    });
    
    console.log('Updated trader filters:', updatedFilters);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixTraderMerchantRelation();