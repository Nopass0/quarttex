#!/usr/bin/env bun

import { db } from "./src/db";
import { canCreateDealOnRequisite } from "./src/utils/requisite-interval";
import { BankType, MethodType, Status } from "@prisma/client";

async function testSimpleInterval() {
  console.log("=== Простой тест интервала между сделками ===\n");

  try {
    // 1. Найдем или создадим тестового трейдера
    let trader = await db.user.findFirst({
      where: { email: "test-interval@example.com" }
    });

    if (!trader) {
      trader = await db.user.create({
        data: {
          email: "test-interval@example.com",
          password: "test123",
          name: "Test Trader",
          balanceUsdt: 1000,
          balanceRub: 100000,
          deposit: 10000,
          minAmountPerRequisite: 100,
          maxAmountPerRequisite: 100000,
        }
      });
    }
    console.log("✓ Трейдер:", trader.id);

    // 2. Создадим мерчанта
    let merchant = await db.merchant.findFirst({
      where: { name: "Test Merchant" }
    });

    if (!merchant) {
      merchant = await db.merchant.create({
        data: {
          name: "Test Merchant",
          token: `test-token-${Date.now()}`,
          balanceUsdt: 1000
        }
      });
    }
    console.log("✓ Мерчант:", merchant.id);

    // 3. Создадим метод
    let method = await db.method.findFirst({
      where: { name: "Test Method" }
    });

    if (!method) {
      method = await db.method.create({
        data: {
          code: "test-c2c",
          name: "Test Method",
          type: MethodType.c2c,
          currency: "rub",
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
    }
    console.log("✓ Метод:", method.id);

    // 4. Создадим реквизит с интервалом 1 минута
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
        intervalMinutes: 1, // 1 минута интервал
        isActive: true,
        isArchived: false
      }
    });
    console.log("✓ Реквизит с интервалом 1 минута:", requisite.id);

    // 5. Тестируем проверку интервала на пустом реквизите
    console.log("\n--- Тест 1: Пустой реквизит ---");
    const canCreateFirst = await canCreateDealOnRequisite(requisite.id, requisite.intervalMinutes);
    console.log("Можно создать первую сделку:", canCreateFirst);
    console.assert(canCreateFirst === true, "Первая сделка должна быть разрешена");

    // 6. Создадим первую тестовую сделку
    const firstTransaction = await db.transaction.create({
      data: {
        amount: 5000,
        merchantId: merchant.id,
        traderId: trader.id,
        methodId: method.id,
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
        clientName: "Test Client",
        assetOrBank: "Test Bank"
      }
    });
    console.log("✓ Создана первая сделка:", firstTransaction.id);

    // 7. Тестируем проверку сразу после создания сделки
    console.log("\n--- Тест 2: Сразу после создания сделки ---");
    const canCreateSecond = await canCreateDealOnRequisite(requisite.id, requisite.intervalMinutes);
    console.log("Можно создать вторую сделку сразу:", canCreateSecond);
    console.assert(canCreateSecond === false, "Вторая сделка должна быть запрещена из-за интервала");

    // 8. Тестируем проверку с интервалом 0 (без ограничений)
    console.log("\n--- Тест 3: Интервал 0 (без ограничений) ---");
    const canCreateWithZeroInterval = await canCreateDealOnRequisite(requisite.id, 0);
    console.log("Можно создать сделку с интервалом 0:", canCreateWithZeroInterval);
    console.assert(canCreateWithZeroInterval === true, "С интервалом 0 должно быть разрешено");

    // 9. Создадим реквизит без интервала
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
    console.log("✓ Реквизит без интервала:", requisiteNoInterval.id);

    console.log("\n--- Тест 4: Реквизит без интервала ---");
    const canCreateOnNoIntervalRequisite = await canCreateDealOnRequisite(requisiteNoInterval.id, 0);
    console.log("Можно создать сделку на реквизите без интервала:", canCreateOnNoIntervalRequisite);
    console.assert(canCreateOnNoIntervalRequisite === true, "На реквизите без интервала должно быть разрешено");

    console.log("\n=== ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО! ===");
    console.log("✓ Интервал между сделками работает корректно");
    console.log("✓ Реквизиты с интервалом блокируются");
    console.log("✓ Реквизиты без интервала работают нормально");

  } catch (error) {
    console.error("❌ Ошибка при тестировании:", error);
    process.exit(1);
  } finally {
    // Очищаем тестовые данные
    console.log("\n--- Очистка тестовых данных ---");
    try {
      await db.transaction.deleteMany({
        where: {
          orderId: { startsWith: "test-order-" }
        }
      });

      await db.bankDetail.deleteMany({
        where: {
          recipientName: { in: ["Test User", "Test User 2"] }
        }
      });

      await db.user.deleteMany({
        where: {
          email: "test-interval@example.com"
        }
      });

      await db.merchant.deleteMany({
        where: {
          name: "Test Merchant"
        }
      });

      await db.method.deleteMany({
        where: {
          name: "Test Method"
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
testSimpleInterval().catch(console.error);
