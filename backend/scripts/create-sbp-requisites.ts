import { db } from "../src/db";
import { MethodType, BankType, Currency } from "@prisma/client";

async function createSbpRequisites() {
  console.log("=== Создание SBP реквизитов ===\n");

  try {
    // Find active traders connected to merchants
    const traders = await db.user.findMany({
      where: {
        banned: false,
        deposit: { gte: 1000 },
        trafficEnabled: true
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    if (traders.length === 0) {
      console.log("❌ Нет активных трейдеров!");
      return;
    }

    console.log(`Найдено трейдеров: ${traders.length}`);

    // Create SBP requisites for each trader
    for (const trader of traders) {
      // Create 2 SBP requisites per trader
      for (let i = 1; i <= 2; i++) {
        const phoneNumber = `+7900${Math.floor(Math.random() * 1000000).toString().padStart(7, '0')}`;
        
        const requisite = await db.bankDetail.create({
          data: {
            userId: trader.id,
            methodType: MethodType.sbp,
            bankType: BankType.SBERBANK, // For SBP, bank type is less relevant
            cardNumber: phoneNumber, // For SBP, phone number is stored in cardNumber field
            recipientName: `${trader.name} SBP ${i}`,
            phoneNumber: phoneNumber,
            minAmount: 100,
            maxAmount: 100000,
            dailyLimit: 500000,
            monthlyLimit: 5000000,
            maxCountTransactions: 100,
            intervalMinutes: 0,
            dailyTraffic: 0,
            monthlyTraffic: 0,
            isArchived: false
          }
        });

        console.log(`✓ Создан SBP реквизит для ${trader.name}: ${phoneNumber}`);
      }
    }

    // Also ensure trader-merchant connections exist for SBP if there's an SBP method
    const sbpMethod = await db.method.findFirst({
      where: {
        type: MethodType.sbp,
        isEnabled: true
      }
    });

    if (sbpMethod) {
      console.log(`\nНайден SBP метод: ${sbpMethod.name}`);
      
      // Get all active merchants
      const merchants = await db.merchant.findMany({
        where: {
          banned: false,
          disabled: false
        }
      });

      // Create trader-merchant connections for SBP
      for (const trader of traders) {
        for (const merchant of merchants) {
          const existing = await db.traderMerchant.findUnique({
            where: {
              traderId_merchantId_methodId: {
                traderId: trader.id,
                merchantId: merchant.id,
                methodId: sbpMethod.id
              }
            }
          });

          if (!existing) {
            await db.traderMerchant.create({
              data: {
                traderId: trader.id,
                merchantId: merchant.id,
                methodId: sbpMethod.id,
                feeIn: 2,
                feeOut: 1.5,
                isMerchantEnabled: true,
                isFeeInEnabled: true,
                isFeeOutEnabled: true
              }
            });
            console.log(`✓ Создана связь ${trader.name} → ${merchant.name} для SBP`);
          }
        }
      }

      // Ensure merchant has access to SBP method
      for (const merchant of merchants) {
        const merchantMethod = await db.merchantMethod.findUnique({
          where: {
            merchantId_methodId: {
              merchantId: merchant.id,
              methodId: sbpMethod.id
            }
          }
        });

        if (!merchantMethod) {
          await db.merchantMethod.create({
            data: {
              merchantId: merchant.id,
              methodId: sbpMethod.id,
              isEnabled: true
            }
          });
          console.log(`✓ Создана связь мерчант-метод: ${merchant.name} → SBP`);
        }
      }
    } else {
      console.log("\n⚠️  SBP метод не найден в базе данных!");
      
      // Create SBP method if it doesn't exist
      const newSbpMethod = await db.method.create({
        data: {
          code: "sbp",
          name: "СБП (Система быстрых платежей)",
          type: MethodType.sbp,
          currency: Currency.rub,
          commissionPayin: 1.5,
          commissionPayout: 1.5,
          minPayin: 100,
          maxPayin: 100000,
          minPayout: 100,
          maxPayout: 100000,
          chancePayin: 95,
          chancePayout: 95,
          isEnabled: true
        }
      });
      console.log(`✓ Создан SBP метод: ${newSbpMethod.name}`);
    }

    console.log("\n✅ SBP реквизиты успешно созданы!");

  } catch (error) {
    console.error("❌ Ошибка:", error);
  } finally {
    await db.$disconnect();
  }
}

createSbpRequisites();