import { db } from "./src/db";

async function testRateSourcesApi() {
  try {
    console.log("Тестируем API эндпоинт rate-sources...");
    
    const rateSources = await db.rateSourceConfig.findMany({
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
        merchants: {
          include: {
            merchant: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            traders: true,
            merchants: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    console.log("Result:", JSON.stringify(rateSources, null, 2));
    
  } catch (error) {
    console.error("Ошибка:", error);
  } finally {
    await db.$disconnect();
  }
}

testRateSourcesApi();
