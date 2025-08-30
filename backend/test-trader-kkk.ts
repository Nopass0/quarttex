import { db } from "./src/db";

async function testTraderKkk() {
  try {
    console.log("Тестируем выборку ККК трейдера...");
    
    const rateSource = await db.rateSourceConfig.findFirst({
      where: { id: "rate-source-bybit" },
      include: {
        traders: {
          select: {
            id: true,
            name: true,
            email: true,
            traderKkkPercent: true,
            traderKkkOperation: true,
          },
        },
      },
    });
    
    console.log("Rate source with traders:", JSON.stringify(rateSource, null, 2));
    
  } catch (error) {
    console.error("Ошибка:", error);
  } finally {
    await db.$disconnect();
  }
}

testTraderKkk();
