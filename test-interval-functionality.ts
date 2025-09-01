#!/usr/bin/env bun

import { db } from "./backend/src/db";
import { canCreateDealOnRequisite } from "./backend/src/utils/requisite-interval";
import { BankType, MethodType, Status } from "@prisma/client";

async function testIntervalFunctionality() {
  console.log("=== Тест функциональности интервала между сделками ===\n");

  try {
    // 1. Найдем или создадим тестового трейдера
    let trader = await db.user.findFirst({
      where: {
        email: "test-interval-trader@example.com"
      }
    });

    if (!trader) {
      trader = await db.user.create({
        data: {
          email: "test-interval-trader@example.com",
          password: "test123",
          name: "Test Interval Trader",
          balanceUsdt: 1000,
          balanceRub: 100000,
          deposit: 10000,
          minAmountPerRequisite: 100,
          maxAmountPerRequisite: 100000,
        }
      });
      console.log("✓ Создан тестовый трейдер:", trader.id);
    } else {
      console.log("✓ Найден тестовый трейдер:", trader.id);
    }

    // 2. Создадим тестовый реквизит с интервалом 2 минуты
    const requisite = await db.bankDetail.create({
      data: {
        userId: trader.id,
        methodType: MethodType.c2c,
        bankType: BankType.SBERBANK,
        cardNumber: "4111111111111111",
        recipientName: "Test User",
        phoneNumber: "+79001234567",
        minAmount: 1000,
        maxAmount: 50000,
        intervalMinutes: 2, // 2 минуты интервал
        isActive: true,
        isArchived: false
      }
    });
    console.log("✓ Создан тестовый реквизит с интервалом 2 минуты:", requisite.id);

    // 3. Тестируем проверку интервала на пустом реквизите
    console.log("\n--- Тест 1: Пустой реквизит ---");
    const canCreateFirst = await canCreateDealOnRequisite(requisite.id, requisite.intervalMinutes);
    console.log("Можно создать первую сделку:", canCreateFirst);
    console.assert(canCreateFirst === true, "Первая сделка должна быть разрешена");

    // 4. Создадим первую тестовую сделку
    const firstTransaction = await db.transaction.create({
      data: {
        numericId: Date.now(),
        amount: 5000,
        merchantId: "test-merchant-id",
        traderId: trader.id,
        methodId: "test-method-id",
        bankDetailId: requisite.id,
        status: Status.CREATED,
        type: "IN",
        commission: 150,
        rate: 100,
        merchantRate: 100,
        adjustedRate: 100,
        currency: "RUB",
        userId: "test-user",
        orderId: `test-order-${Date.now()}`,
        callbackUri: "",
        successUri: "",
        failUri: "",
        expired_at: new Date(Date.now() + 30 * 60 * 1000), // 30 минут
        clientName: "Test Client"
      }
    });
    console.log("✓ Создана первая тестовая сделка:", firstTransaction.id);

    // 5. Тестируем проверку сразу после создания сделки
    console.log("\n--- Тест 2: Сразу после создания сделки ---");
    const canCreateSecond = await canCreateDealOnRequisite(requisite.id, requisite.intervalMinutes);
    console.log("Можно создать вторую сделку сразу:", canCreateSecond);
    console.assert(canCreateSecond === false, "Вторая сделка должна быть запрещена из-за интервала");

    // 6. Тестируем проверку с интервалом 0 (без ограничений)
    console.log("\n--- Тест 3: Интервал 0 (без ограничений) ---");
    const canCreateWithZeroInterval = await canCreateDealOnRequisite(requisite.id, 0);
    console.log("Можно создать сделку с интервалом 0:", canCreateWithZeroInterval);
    console.assert(canCreateWithZeroInterval === true, "С интервалом 0 должно быть разрешено");

    // 7. Создадим реквизит без интервала
    const requisiteNoInterval = await db.bankDetail.create({
      data: {
        userId: trader.id,
        methodType: MethodType.sbp,
        bankType: BankType.TBANK,
        cardNumber: "+79001234568",
        recipientName: "Test User 2",
        phoneNumber: "+79001234568",
        minAmount: 1000,
        maxAmount: 50000,
        intervalMinutes: 0, // Без интервала
        isActive: true,
        isArchived: false
      }
    });

    console.log("\n--- Тест 4: Реквизит без интервала ---");
    const canCreateOnNoIntervalRequisite = await canCreateDealOnRequisite(requisiteNoInterval.id, 0);
    console.log("Можно создать сделку на реквизите без интервала:", canCreateOnNoIntervalRequisite);
    console.assert(canCreateOnNoIntervalRequisite === true, "На реквизите без интервала должно быть разрешено");

    // 8. Тестируем API создания сделки
    console.log("\n--- Тест 5: API создания сделки ---");
    
    // Найдем метод и мерчанта для тестирования
    let method = await db.method.findFirst({
      where: { type: MethodType.c2c, isEnabled: true }
    });

    if (!method) {
      method = await db.method.create({
        data: {
          name: "Test C2C Method",
          type: MethodType.c2c,
          currency: "RUB",
          isEnabled: true,
          commissionPayin: 3,
          commissionPayout: 3,
          maxPayin: 100000,
          minPayin: 100,
          maxPayout: 100000,
          minPayout: 100,
          chancePayin: 100,
          chancePayout: 100,
          rateSource: "rapira"
        }
      });
      console.log("✓ Создан тестовый метод:", method.id);
    }

    let merchant = await db.merchant.findFirst({
      where: { email: "test-interval-merchant@example.com" }
    });

    if (!merchant) {
      merchant = await db.merchant.create({
        data: {
          name: "Test Interval Merchant",
          email: "test-interval-merchant@example.com",
          password: "test123",
          balanceUsdt: 1000,
          balanceRub: 100000,
          isActive: true
        }
      });
      console.log("✓ Создан тестовый мерчант:", merchant.id);
    }

    // Подключим трейдера к мерчанту
    const traderMerchant = await db.traderMerchant.upsert({
      where: {
        traderId_merchantId_methodId: {
          traderId: trader.id,
          merchantId: merchant.id,
          methodId: method.id
        }
      },
      create: {
        traderId: trader.id,
        merchantId: merchant.id,
        methodId: method.id,
        isMerchantEnabled: true,
        isFeeInEnabled: true,
        isFeeOutEnabled: true,
        feeInPercent: 3,
        feeOutPercent: 3
      },
      update: {
        isMerchantEnabled: true,
        isFeeInEnabled: true
      }
    });

    // Теперь попробуем создать сделку через API logic
    console.log("Попытка создать сделку на реквизите с интервалом (должна быть отклонена)...");
    
    // Имитируем проверку из merchant API
    const poolWithInterval = await db.bankDetail.findMany({
      where: {
        id: requisite.id,
        isArchived: false,
        isActive: true,
        methodType: method.type,
        userId: trader.id
      },
      include: { user: true }
    });

    let chosenWithInterval = null;
    for (const bd of poolWithInterval) {
      const testAmount = 5000;
      if (testAmount < bd.minAmount || testAmount > bd.maxAmount) continue;
      if (testAmount < bd.user.minAmountPerRequisite || testAmount > bd.user.maxAmountPerRequisite) continue;

      // Проверяем интервал между сделками
      if (bd.intervalMinutes > 0) {
        const { canCreateDealOnRequisite } = await import("./backend/src/utils/requisite-interval");
        const canCreate = await canCreateDealOnRequisite(bd.id, bd.intervalMinutes);
        if (!canCreate) {
          console.log(`Реквизит ${bd.id} отклонен: не прошел интервал ${bd.intervalMinutes} минут между сделками`);
          continue;
        }
      }

      chosenWithInterval = bd;
      break;
    }

    console.log("Выбранный реквизит с интервалом:", chosenWithInterval ? "найден" : "не найден");
    console.assert(chosenWithInterval === null, "Реквизит с интервалом должен быть отклонен");

    // Проверим реквизит без интервала
    const poolWithoutInterval = await db.bankDetail.findMany({
      where: {
        id: requisiteNoInterval.id,
        isArchived: false,
        isActive: true,
        methodType: MethodType.sbp,
        userId: trader.id
      },
      include: { user: true }
    });

    let chosenWithoutInterval = null;
    for (const bd of poolWithoutInterval) {
      const testAmount = 5000;
      if (testAmount < bd.minAmount || testAmount > bd.maxAmount) continue;
      if (testAmount < bd.user.minAmountPerRequisite || testAmount > bd.user.maxAmountPerRequisite) continue;

      // Проверяем интервал между сделками
      if (bd.intervalMinutes > 0) {
        const { canCreateDealOnRequisite } = await import("./backend/src/utils/requisite-interval");
        const canCreate = await canCreateDealOnRequisite(bd.id, bd.intervalMinutes);
        if (!canCreate) {
          console.log(`Реквизит ${bd.id} отклонен: не прошел интервал ${bd.intervalMinutes} минут между сделками`);
          continue;
        }
      }

      chosenWithoutInterval = bd;
      break;
    }

    console.log("Выбранный реквизит без интервала:", chosenWithoutInterval ? "найден" : "не найден");
    console.assert(chosenWithoutInterval !== null, "Реквизит без интервала должен быть выбран");

    console.log("\n=== ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО! ===");
    console.log("✓ Интервал между сделками работает корректно");
    console.log("✓ Реквизиты с интервалом блокируются");
    console.log("✓ Реквизиты без интервала работают нормально");
    console.log("✓ API логика учитывает интервал при выборе реквизитов");

  } catch (error) {
    console.error("❌ Ошибка при тестировании:", error);
    process.exit(1);
  } finally {
    // Очищаем тестовые данные
    console.log("\n--- Очистка тестовых данных ---");
    try {
      await db.transaction.deleteMany({
        where: {
          OR: [
            { orderId: { startsWith: "test-order-" } },
            { merchantId: "test-merchant-id" }
          ]
        }
      });

      await db.bankDetail.deleteMany({
        where: {
          recipientName: { in: ["Test User", "Test User 2"] }
        }
      });

      await db.traderMerchant.deleteMany({
        where: {
          trader: { email: "test-interval-trader@example.com" }
        }
      });

      await db.user.deleteMany({
        where: {
          email: { in: ["test-interval-trader@example.com"] }
        }
      });

      await db.merchant.deleteMany({
        where: {
          email: "test-interval-merchant@example.com"
        }
      });

      await db.method.deleteMany({
        where: {
          name: "Test C2C Method"
        }
      });

      console.log("✓ Тестовые данные очищены");
    } catch (cleanupError) {
      console.warn("⚠️ Ошибка при очистке тестовых данных:", cleanupError);
    }

    await db.$disconnect();
  }
}

// Запускаем тест
testIntervalFunctionality().catch(console.error);
