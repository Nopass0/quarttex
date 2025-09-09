import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const db = new PrismaClient();

async function seedTestData() {
  console.log("=== Создание тестовых данных ===\n");

  try {
    // 1. Создаем или находим агента
    let agent = await db.agent.findUnique({
      where: { email: "testagent@test.com" }
    });
    
    if (!agent) {
      agent = await db.agent.create({
        data: {
          email: "testagent@test.com",
          password: await bcrypt.hash("password123", 10),
          name: "Test Agent",
          commissionRate: 5
        }
      });
      console.log(`✓ Создан агент: ${agent.name}`);
    } else {
      console.log(`✓ Найден существующий агент: ${agent.name}`);
    }

    // 2. Создаем или находим команду
    let team = await db.team.findUnique({
      where: {
        agentId_name: {
          agentId: agent.id,
          name: "Test Team"
        }
      }
    });
    
    if (!team) {
      team = await db.team.create({
        data: {
          name: "Test Team",
          agentId: agent.id
        }
      });
      console.log(`✓ Создана команда: ${team.name}`);
    } else {
      console.log(`✓ Найдена существующая команда: ${team.name}`);
    }

    // 3. Создаем трейдеров
    const traders = [];
    for (let i = 1; i <= 3; i++) {
      let trader = await db.user.findUnique({
        where: { email: `trader${i}@test.com` }
      });
      
      if (!trader) {
        trader = await db.user.create({
          data: {
            email: `trader${i}@test.com`,
            password: await bcrypt.hash("password123", 10),
            name: `Test Trader ${i}`,
            balanceUsdt: 10000,
            balanceRub: 100000,
            deposit: 5000,
            trustBalance: 5000,
            teamId: team.id,
            trafficEnabled: true,
            minAmountPerRequisite: 100,
            maxAmountPerRequisite: 50000
          }
        });
        console.log(`✓ Создан трейдер: ${trader.name}`);
      } else {
        console.log(`✓ Найден существующий трейдер: ${trader.name}`);
      }
      traders.push(trader);
    }

    // 4. Получаем методы
    const methods = await db.method.findMany({
      where: { isEnabled: true }
    });

    if (methods.length === 0) {
      console.error("Нет активных методов!");
      return;
    }

    // 5. Создаем настройки курсов для методов
    for (const method of methods) {
      const existingRate = await db.rateSettings.findUnique({
        where: { methodId: method.id }
      });

      if (!existingRate) {
        await db.rateSettings.create({
          data: {
            methodId: method.id,
            kkkPercent: 5
          }
        });
        console.log(`✓ Создан курс для метода: ${method.type}`);
      }
    }

    // 6. Получаем мерчанта
    const merchant = await db.merchant.findFirst({
      where: {
        banned: false,
        disabled: false
      }
    });

    if (!merchant) {
      console.error("Нет активного мерчанта!");
      return;
    }

    // 7. Создаем связи трейдер-мерчант для первого метода
    const firstMethod = methods[0];
    for (const trader of traders) {
      const existing = await db.traderMerchant.findUnique({
        where: {
          traderId_merchantId_methodId: {
            traderId: trader.id,
            merchantId: merchant.id,
            methodId: firstMethod.id
          }
        }
      });
      
      if (!existing) {
        await db.traderMerchant.create({
          data: {
            traderId: trader.id,
            merchantId: merchant.id,
            methodId: firstMethod.id,
            feeIn: 2,
            feeOut: 1.5
          }
        });
        console.log(`✓ Создана связь трейдер-мерчант для: ${trader.name}`);
      } else {
        console.log(`✓ Найдена существующая связь трейдер-мерчант для: ${trader.name}`);
      }
    }

    // 8. Создаем реквизиты (банковские карты) для каждого трейдера
    const bankTypes = ["SBERBANK", "VTB", "ALFABANK"];
    for (let i = 0; i < traders.length; i++) {
      const trader = traders[i];
      const bankType = bankTypes[i % bankTypes.length];
      
      // Создаем по 2 реквизита для каждого трейдера
      for (let j = 1; j <= 2; j++) {
        await db.bankDetail.create({
          data: {
            userId: trader.id,
            methodType: firstMethod.type,
            bankType: bankType as any,
            cardNumber: `4111111111111${i}${j}${j}`,
            recipientName: `${trader.name} Card ${j}`,
            phoneNumber: `+7900${i}00000${j}`,
            minAmount: 100,
            maxAmount: 50000,
            dailyLimit: 500000,
            monthlyLimit: 5000000,
            maxCountTransactions: 100,
            intervalMinutes: 0,
            isArchived: false
          }
        });
      }
      console.log(`✓ Создано 2 реквизита для трейдера: ${trader.name}`);
    }

    // 9. Создаем связь мерчант-метод если нет
    const merchantMethod = await db.merchantMethod.findUnique({
      where: {
        merchantId_methodId: {
          merchantId: merchant.id,
          methodId: firstMethod.id
        }
      }
    });

    if (!merchantMethod) {
      await db.merchantMethod.create({
        data: {
          merchantId: merchant.id,
          methodId: firstMethod.id,
          isEnabled: true
        }
      });
      console.log(`✓ Создана связь мерчант-метод`);
    }

    console.log("\n✅ Все тестовые данные созданы успешно!");
    
    // Проверяем результат
    const activeRequisites = await db.bankDetail.count({
      where: {
        isArchived: false,
        methodType: firstMethod.type,
        user: {
          banned: false,
          deposit: { gt: 0 },
          teamId: { not: null },
          trafficEnabled: true
        }
      }
    });
    
    console.log(`\nИтого активных реквизитов для метода ${firstMethod.type}: ${activeRequisites}`);

  } catch (error) {
    console.error("Ошибка при создании тестовых данных:", error);
  }
}

seedTestData()
  .catch(console.error)
  .finally(() => db.$disconnect());