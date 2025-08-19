import { db } from "@/db";

async function main() {
  try {
    // Найдем тестового мерчанта
    const merchant = await db.merchant.findFirst({
      where: {
        name: { contains: "Test" }
      }
    });

    if (!merchant) {
      console.log("No test merchant found");
      return;
    }

    console.log(`\n=== MERCHANT: ${merchant.name} (${merchant.id}) ===`);
    console.log(`countInRubEquivalent: ${merchant.countInRubEquivalent}`);

    // Проверим методы мерчанта
    const merchantMethods = await db.merchantMethod.findMany({
      where: { merchantId: merchant.id },
      include: {
        method: true
      }
    });

    console.log(`\nMerchant methods count: ${merchantMethods.length}`);
    
    if (merchantMethods.length === 0) {
      console.log("\n❌ No methods assigned to merchant!");
      
      // Получим все доступные методы
      const allMethods = await db.method.findMany({
        where: { isEnabled: true }
      });
      
      console.log(`\nAvailable methods in database: ${allMethods.length}`);
      
      // Создадим связи
      console.log("\n✅ Creating merchant methods...");
      
      for (const method of allMethods) {
        await db.merchantMethod.create({
          data: {
            merchantId: merchant.id,
            methodId: method.id,
            isEnabled: true
          }
        });
        console.log(`  - Added ${method.name} (${method.code})`);
      }
      
      console.log("\n✅ All methods added to merchant!");
    } else {
      console.log("\nExisting merchant methods:");
      for (const mm of merchantMethods) {
        console.log(`  - ${mm.method.name} (${mm.method.code}) - Enabled: ${mm.isEnabled}`);
      }
    }

    // Проверим транзакции мерчанта
    const transactionCount = await db.transaction.count({
      where: { merchantId: merchant.id }
    });
    
    console.log(`\nMerchant transactions count: ${transactionCount}`);

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await db.$disconnect();
  }
}

main();