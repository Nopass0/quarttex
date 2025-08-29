import { db } from "../db";

async function connectWellbitMethods() {
  try {
    // Find Wellbit merchant
    const wellbitMerchant = await db.merchant.findFirst({
      where: { name: "Wellbit" }
    });

    if (!wellbitMerchant) {
      console.error("❌ Wellbit merchant not found!");
      return;
    }

    console.log(`Found Wellbit merchant with ID: ${wellbitMerchant.id}`);

    // Find all Wellbit methods
    const wellbitMethods = await db.method.findMany({
      where: {
        OR: [
          { code: "sbp_wellbit" },
          { code: "sbp_wellbit_10k" },
          { code: "c2c_wellbit" },
          { code: "c2c_wellbit_10k" }
        ]
      }
    });

    console.log(`Found ${wellbitMethods.length} Wellbit methods`);

    // Connect each method to the merchant
    for (const method of wellbitMethods) {
      const existing = await db.merchantMethod.findUnique({
        where: {
          merchantId_methodId: {
            merchantId: wellbitMerchant.id,
            methodId: method.id
          }
        }
      });

      if (!existing) {
        await db.merchantMethod.create({
          data: {
            merchantId: wellbitMerchant.id,
            methodId: method.id,
            isEnabled: true
          }
        });
        console.log(`✅ Connected ${method.name} (${method.code}) to Wellbit merchant`);
      } else {
        // Update to ensure it's enabled
        await db.merchantMethod.update({
          where: {
            merchantId_methodId: {
              merchantId: wellbitMerchant.id,
              methodId: method.id
            }
          },
          data: {
            isEnabled: true
          }
        });
        console.log(`✅ Updated connection for ${method.name} (${method.code})`);
      }
    }

    console.log("\nWellbit methods connected successfully!");

  } catch (error) {
    console.error("Error connecting Wellbit methods:", error);
  } finally {
    await db.$disconnect();
  }
}

connectWellbitMethods();