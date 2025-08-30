import { db } from "./src/db";

async function checkKkkFields() {
  try {
    console.log("Проверяем поля ККК в базе данных...");
    
    // Проверяем поля в MerchantRateSource
    const merchantRelation = await db.merchantRateSource.findFirst({
      select: {
        id: true,
        kkkPercent: true,
        kkkOperation: true,
      }
    });
    console.log("MerchantRateSource fields:", merchantRelation);
    
    // Проверяем поля в User (трейдеры)
    const trader = await db.user.findFirst({
      select: {
        id: true,
        name: true,
        traderKkkPercent: true,
        traderKkkOperation: true,
      }
    });
    console.log("User (trader) fields:", trader);
    
  } catch (error) {
    console.error("Ошибка проверки полей:", error);
  } finally {
    await db.$disconnect();
  }
}

checkKkkFields();
