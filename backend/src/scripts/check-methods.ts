import { db } from "../db";

async function checkMethods() {
  const methods = await db.method.findMany({
    where: { isEnabled: true },
    select: { id: true, code: true, type: true },
    take: 5
  });
  
  console.log("Available methods:");
  console.table(methods);
  
  // Use first method for trader-merchant
  if (methods.length > 0) {
    const firstMethod = methods[0];
    console.log(`\nWill use method: ${firstMethod.code} (${firstMethod.id})`);
    
    // Update the script to use this method
    const testTraders = await db.user.findMany({
      where: {
        email: {
          in: ["test-trader-acceptance@test.com", "test-trader-multi@test.com"]
        }
      }
    });
    
    const merchant = await db.merchant.findFirst({
      where: { id: "cmdghakvs021kike8b5c87g4e" }
    });
    
    if (merchant) {
      for (const trader of testTraders) {
        const existing = await db.traderMerchant.findFirst({
          where: {
            traderId: trader.id,
            merchantId: merchant.id,
            methodId: firstMethod.id
          }
        });

        if (!existing) {
          await db.traderMerchant.create({
            data: {
              trader: { connect: { id: trader.id } },
              merchant: { connect: { id: merchant.id } },
              method: { connect: { id: firstMethod.id } },
              isMerchantEnabled: true,
              isFeeOutEnabled: true,
              feeOut: 5,
              feeIn: 5
            }
          });
          console.log(`Created relationship: ${trader.email} <-> ${merchant.name} with method ${firstMethod.code}`);
        } else {
          console.log(`Relationship already exists: ${trader.email} <-> ${merchant.name}`);
        }
      }
    }
  }
}

checkMethods().then(() => process.exit(0)).catch(console.error);