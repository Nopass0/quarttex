import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { Elysia } from "elysia";
import { db } from "@/db";
import { Status, TransactionType, MethodType, Currency } from "@prisma/client";
import adminRoutes from "@/routes/admin";
import traderRoutes from "@/routes/trader";
import { roundDown2, truncate2 } from "@/utils/rounding";
import { randomBytes } from "node:crypto";

/**
 * Тесты для проверки подтверждения стекших транзакций
 * 
 * Проверяем:
 * 1. Корректность расчета баланса при подтверждении стекшей транзакции
 * 2. Использование сохраненного frozenUsdtAmount вместо пересчета
 * 3. Точность округления и отсутствие расхождений в балансе
 */

describe("Подтверждение стекших транзакций", () => {
  let appAdmin: Elysia;
  let appTrader: Elysia;
  let merchant: any;
  let trader: any;
  let method: any;
  let bankDetail: any;
  let traderMerchant: any;
  let admin: any;
  let adminHeaders: Record<string, string>;
  let traderHeaders: Record<string, string>;

  // Уникальный префикс для избежания конфликтов
  const SUITE_PREFIX = `test-expired-${Date.now()}-${randomBytes(4).toString('hex')}`;

  beforeAll(async () => {
    // Создаем тестовые приложения
    appAdmin = new Elysia().use(adminRoutes);
    appTrader = new Elysia().use(traderRoutes);

    // Создаем мок-админа
    admin = await db.admin.create({ 
      data: { 
        token: `${SUITE_PREFIX}-admin-token`
      } 
    });
    adminHeaders = { 'x-admin-key': admin.token };

    // Создаем фикстуры
    merchant = await db.merchant.create({
      data: {
        name: `${SUITE_PREFIX}-merchant`,
        token: `${SUITE_PREFIX}-merchant-token`,
        balanceUsdt: 0,
        countInRubEquivalent: false,
      },
    });

    method = await db.method.create({
      data: {
        code: `${SUITE_PREFIX}-method-code`,
        name: `${SUITE_PREFIX}-method`,
        type: MethodType.sbp,
        currency: Currency.rub,
        commissionPayin: 0,
        commissionPayout: 0,
        maxPayin: 100000,
        minPayin: 100,
        maxPayout: 100000,
        minPayout: 100,
        chancePayin: 1.0,
        chancePayout: 1.0,
      },
    });

    await db.merchantMethod.create({
      data: {
        merchantId: merchant.id,
        methodId: method.id,
      },
    });

    trader = await db.user.create({
      data: {
        name: `${SUITE_PREFIX}-trader`,
        email: `${SUITE_PREFIX}-trader@test.com`,
        password: "password",
        balanceUsdt: 0,
        balanceRub: 0,
        trustBalance: 1000.0,
        frozenUsdt: 0,
        deposit: 1000.0,
        profitFromDeals: 0,
        trafficEnabled: true,
      },
    });

    // Создаем сессию для трейдера
    const session = await db.session.create({
      data: {
        userId: trader.id,
        token: `${SUITE_PREFIX}-session-token`,
        expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        ip: "127.0.0.1",
      },
    });
    traderHeaders = { 'x-trader-token': session.token };

    traderMerchant = await db.traderMerchant.create({
      data: {
        traderId: trader.id,
        merchantId: merchant.id,
        methodId: method.id,
        isMerchantEnabled: true,
        isFeeInEnabled: true,
        feeIn: 5.0, // 5% комиссия
      },
    });

    bankDetail = await db.bankDetail.create({
      data: {
        userId: trader.id,
        methodId: method.id,
        methodType: MethodType.sbp,
        cardNumber: "1234567890123456",
        cardHolder: "TEST HOLDER",
        minAmount: 100,
        maxAmount: 50000,
        operationLimit: 10,
        sumLimit: 100000,
        intervalMinutes: 60,
        currentTotalAmount: 0,
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    // Очищаем созданные данные
    await db.transaction.deleteMany({
      where: { merchantId: merchant.id },
    });
    await db.session.deleteMany({
      where: { userId: trader.id },
    });
    await db.bankDetail.deleteMany({
      where: { userId: trader.id },
    });
    await db.traderMerchant.deleteMany({
      where: { traderId: trader.id },
    });
    await db.merchantMethod.deleteMany({
      where: { merchantId: merchant.id },
    });
    await db.user.deleteMany({
      where: { id: trader.id },
    });
    await db.merchant.deleteMany({
      where: { id: merchant.id },
    });
    await db.method.deleteMany({
      where: { id: method.id },
    });
    await db.admin.deleteMany({
      where: { id: admin.id },
    });
  });

  beforeEach(async () => {
    // Сбрасываем состояние трейдера перед каждым тестом
    await db.user.update({
      where: { id: trader.id },
      data: {
        trustBalance: 1000.0,
        frozenUsdt: 0,
        deposit: 1000.0,
        profitFromDeals: 0,
      },
    });

    // Сбрасываем баланс мерчанта
    await db.merchant.update({
      where: { id: merchant.id },
      data: {
        balanceUsdt: 0,
      },
    });

    // Удаляем все транзакции
    await db.transaction.deleteMany({
      where: { merchantId: merchant.id },
    });
  });

  // Ожидаемо: создается сделка IN на 10000₽, замораживается точная сумма roundDown2(10000/95.5),
  // при истечении средства возвращаются на trustBalance с truncate2,
  // при подтверждении используется сохраненный frozenUsdtAmount без пересчета
  test("точность расчетов при подтверждении стекшей транзакции", async () => {
    const amount = 10000; // 10000 рублей
    const rate = 95.5; // курс доллара
    const expectedFrozenAmount = roundDown2(amount / rate); // 104.71 USDT

    console.log("Тест: создание и подтверждение стекшей транзакции");
    console.log(`Сумма: ${amount} RUB, курс: ${rate}, ожидаемая заморозка: ${expectedFrozenAmount}`);

    // 1. Создаем транзакцию через мерчант API
    const transaction = await db.transaction.create({
      data: {
        merchantId: merchant.id,
        traderId: trader.id,
        bankDetailId: bankDetail.id,
        methodId: method.id,
        type: TransactionType.IN,
        status: Status.IN_PROGRESS,
        amount,
        rate,
        merchantRate: rate,
        frozenUsdtAmount: expectedFrozenAmount,
        calculatedCommission: 0,
        assetOrBank: "Test Bank",
        orderId: `test-expired-${Date.now()}`,
        expiredAt: new Date(Date.now() + 30 * 60 * 1000), // 30 минут
      },
    });

    // 2. Замораживаем баланс трейдера
    const initialTraderBalance = await db.user.findUnique({
      where: { id: trader.id },
      select: { trustBalance: true, frozenUsdt: true },
    });

    await db.user.update({
      where: { id: trader.id },
      data: {
        trustBalance: { decrement: truncate2(expectedFrozenAmount) },
        frozenUsdt: { increment: truncate2(expectedFrozenAmount) },
      },
    });

    const frozenTraderBalance = await db.user.findUnique({
      where: { id: trader.id },
      select: { trustBalance: true, frozenUsdt: true },
    });

    console.log("Баланс после заморозки:", frozenTraderBalance);

    // 3. Помечаем транзакцию как истекшую (имитируем ExpiredTransactionWatcher)
    await db.transaction.update({
      where: { id: transaction.id },
      data: { status: Status.EXPIRED },
    });

    // Возвращаем средства на trustBalance при истечении
    await db.user.update({
      where: { id: trader.id },
      data: {
        frozenUsdt: { decrement: truncate2(expectedFrozenAmount) },
        trustBalance: { increment: truncate2(expectedFrozenAmount) },
      },
    });

    const expiredTraderBalance = await db.user.findUnique({
      where: { id: trader.id },
      select: { trustBalance: true, frozenUsdt: true, deposit: true },
    });

    console.log("Баланс после истечения:", expiredTraderBalance);

    // Проверяем, что баланс вернулся к исходному состоянию
    expect(expiredTraderBalance?.trustBalance).toBe(initialTraderBalance?.trustBalance);
    expect(expiredTraderBalance?.frozenUsdt).toBe(0);

    // 4. Подтверждаем стекшую транзакцию через админ API
    const response = await appAdmin
      .handle(
        new Request(`http://localhost/admin/transactions/${transaction.id}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...adminHeaders,
          },
          body: JSON.stringify({ status: Status.READY }),
        })
      );

    expect(response.status).toBe(200);

    // 5. Проверяем финальные балансы
    const finalTraderBalance = await db.user.findUnique({
      where: { id: trader.id },
      select: { trustBalance: true, frozenUsdt: true, deposit: true, profitFromDeals: true },
    });

    const finalMerchantBalance = await db.merchant.findUnique({
      where: { id: merchant.id },
      select: { balanceUsdt: true },
    });

    const finalTransaction = await db.transaction.findUnique({
      where: { id: transaction.id },
      select: { status: true, traderProfit: true },
    });

    console.log("Финальные балансы:");
    console.log("Трейдер:", finalTraderBalance);
    console.log("Мерчант:", finalMerchantBalance);
    console.log("Транзакция:", finalTransaction);

    // Проверки
    expect(finalTransaction?.status).toBe(Status.READY);

    // Трейдер должен был потратить точно frozenUsdtAmount
    const expectedSpentUsdt = expectedFrozenAmount;
    const expectedRemainingBalance = 1000.0 - expectedSpentUsdt;

    // Проверяем точность: баланс трейдера должен быть точно рассчитан
    const actualRemainingBalance = (finalTraderBalance?.trustBalance || 0) + (finalTraderBalance?.deposit || 0);
    
    console.log(`Ожидаемый остаток: ${expectedRemainingBalance}`);
    console.log(`Фактический остаток: ${actualRemainingBalance}`);
    
    // Разница должна быть не больше 0.01 (погрешность округления)
    expect(Math.abs(actualRemainingBalance - expectedRemainingBalance)).toBeLessThanOrEqual(0.01);

    // Мерчант должен получить сумму в долларах
    const expectedMerchantCredit = amount / rate;
    expect(Math.abs((finalMerchantBalance?.balanceUsdt || 0) - expectedMerchantCredit)).toBeLessThanOrEqual(0.01);

    // Прибыль трейдера должна быть рассчитана
    expect(finalTraderBalance?.profitFromDeals).toBeGreaterThan(0);
  });

  // Ожидаемо: при подтверждении трех стекших сделок баланс депозита должен быть точным,
  // без накопления ошибок округления
  test("точность при множественных подтверждениях стекших транзакций", async () => {
    const transactions = [
      { amount: 10000, rate: 95.5 },
      { amount: 15000, rate: 96.2 },
      { amount: 8000, rate: 94.8 },
    ];

    const createdTransactions = [];
    let totalExpectedSpent = 0;

    console.log("Тест: множественные стекшие транзакции");

    // Создаем и обрабатываем каждую транзакцию
    for (let i = 0; i < transactions.length; i++) {
      const { amount, rate } = transactions[i];
      const expectedFrozenAmount = roundDown2(amount / rate);
      totalExpectedSpent += expectedFrozenAmount;

      console.log(`Транзакция ${i + 1}: ${amount} RUB @ ${rate}, заморозка: ${expectedFrozenAmount}`);

      // Создаем транзакцию
      const transaction = await db.transaction.create({
        data: {
          merchantId: merchant.id,
          traderId: trader.id,
          bankDetailId: bankDetail.id,
          methodId: method.id,
          type: TransactionType.IN,
          status: Status.IN_PROGRESS,
          amount,
          rate,
          merchantRate: rate,
          frozenUsdtAmount: expectedFrozenAmount,
          calculatedCommission: 0,
          assetOrBank: "Test Bank",
          orderId: `test-multi-expired-${i}-${Date.now()}`,
          expiredAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      });

      createdTransactions.push(transaction);

      // Замораживаем баланс
      await db.user.update({
        where: { id: trader.id },
        data: {
          trustBalance: { decrement: truncate2(expectedFrozenAmount) },
          frozenUsdt: { increment: truncate2(expectedFrozenAmount) },
        },
      });

      // Помечаем как истекшую
      await db.transaction.update({
        where: { id: transaction.id },
        data: { status: Status.EXPIRED },
      });

      // Возвращаем средства
      await db.user.update({
        where: { id: trader.id },
        data: {
          frozenUsdt: { decrement: truncate2(expectedFrozenAmount) },
          trustBalance: { increment: truncate2(expectedFrozenAmount) },
        },
      });
    }

    // Проверяем баланс после всех истечений
    const balanceAfterExpiry = await db.user.findUnique({
      where: { id: trader.id },
      select: { trustBalance: true, frozenUsdt: true, deposit: true },
    });

    console.log("Баланс после всех истечений:", balanceAfterExpiry);
    expect(balanceAfterExpiry?.trustBalance).toBe(1000.0); // Должен вернуться к исходному
    expect(balanceAfterExpiry?.frozenUsdt).toBe(0);

    // Подтверждаем все стекшие транзакции
    for (const transaction of createdTransactions) {
      const response = await appAdmin
        .handle(
          new Request(`http://localhost/admin/transactions/${transaction.id}/status`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              ...adminHeaders,
            },
            body: JSON.stringify({ status: Status.READY }),
          })
        );

      expect(response.status).toBe(200);
    }

    // Проверяем финальные балансы
    const finalBalance = await db.user.findUnique({
      where: { id: trader.id },
      select: { trustBalance: true, frozenUsdt: true, deposit: true, profitFromDeals: true },
    });

    console.log("Финальный баланс трейдера:", finalBalance);
    console.log(`Общая потраченная сумма: ${totalExpectedSpent}`);

    // Проверяем точность: общий баланс (trustBalance + deposit) должен быть 1000 - totalExpectedSpent
    const expectedFinalBalance = 2000.0 - totalExpectedSpent; // 1000 trust + 1000 deposit - потрачено
    const actualFinalBalance = (finalBalance?.trustBalance || 0) + (finalBalance?.deposit || 0);

    console.log(`Ожидаемый финальный баланс: ${expectedFinalBalance}`);
    console.log(`Фактический финальный баланс: ${actualFinalBalance}`);

    // Разница не должна превышать 0.01 (накопленная погрешность округления)
    expect(Math.abs(actualFinalBalance - expectedFinalBalance)).toBeLessThanOrEqual(0.01);

    // Все транзакции должны быть подтверждены
    const confirmedTransactions = await db.transaction.findMany({
      where: { 
        id: { in: createdTransactions.map(t => t.id) },
        status: Status.READY 
      },
    });
    
    expect(confirmedTransactions.length).toBe(3);
  });

  // Ожидаемо: при подтверждении стекшей транзакции через трейдерский API 
  // результат должен быть идентичен админскому API
  test("консистентность между админским и трейдерским API при подтверждении стекших транзакций", async () => {
    const amount = 12000;
    const rate = 95.75;
    const expectedFrozenAmount = roundDown2(amount / rate);

    console.log("Тест: консистентность API при подтверждении стекших транзакций");

    // Создаем две идентичные транзакции
    const adminTransaction = await db.transaction.create({
      data: {
        merchantId: merchant.id,
        traderId: trader.id,
        bankDetailId: bankDetail.id,
        methodId: method.id,
        type: TransactionType.IN,
        status: Status.IN_PROGRESS,
        amount,
        rate,
        merchantRate: rate,
        frozenUsdtAmount: expectedFrozenAmount,
        calculatedCommission: 0,
        assetOrBank: "Test Bank Admin",
        orderId: `test-admin-expired-${Date.now()}`,
        expiredAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    const traderTransaction = await db.transaction.create({
      data: {
        merchantId: merchant.id,
        traderId: trader.id,
        bankDetailId: bankDetail.id,
        methodId: method.id,
        type: TransactionType.IN,
        status: Status.IN_PROGRESS,
        amount,
        rate,
        merchantRate: rate,
        frozenUsdtAmount: expectedFrozenAmount,
        calculatedCommission: 0,
        assetOrBank: "Test Bank Trader",
        orderId: `test-trader-expired-${Date.now()}`,
        expiredAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    // Обрабатываем обе транзакции одинаково: заморозка -> истечение -> возврат
    for (const transaction of [adminTransaction, traderTransaction]) {
      // Замораживаем
      await db.user.update({
        where: { id: trader.id },
        data: {
          trustBalance: { decrement: truncate2(expectedFrozenAmount) },
          frozenUsdt: { increment: truncate2(expectedFrozenAmount) },
        },
      });

      // Истекаем
      await db.transaction.update({
        where: { id: transaction.id },
        data: { status: Status.EXPIRED },
      });

      // Возвращаем
      await db.user.update({
        where: { id: trader.id },
        data: {
          frozenUsdt: { decrement: truncate2(expectedFrozenAmount) },
          trustBalance: { increment: truncate2(expectedFrozenAmount) },
        },
      });
    }

    // Сохраняем состояние перед подтверждениями
    const balanceBeforeConfirmations = await db.user.findUnique({
      where: { id: trader.id },
      select: { trustBalance: true, deposit: true, profitFromDeals: true },
    });

    // Подтверждаем через админ API
    const adminResponse = await appAdmin
      .handle(
        new Request(`http://localhost/admin/transactions/${adminTransaction.id}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...adminHeaders,
          },
          body: JSON.stringify({ status: Status.READY }),
        })
      );

    expect(adminResponse.status).toBe(200);

    const balanceAfterAdmin = await db.user.findUnique({
      where: { id: trader.id },
      select: { trustBalance: true, deposit: true, profitFromDeals: true },
    });

    // Подтверждаем через трейдер API
    const traderResponse = await appTrader
      .handle(
        new Request(`http://localhost/trader/transactions/${traderTransaction.id}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...traderHeaders,
          },
          body: JSON.stringify({ status: Status.READY }),
        })
      );

    expect(traderResponse.status).toBe(200);

    const balanceAfterTrader = await db.user.findUnique({
      where: { id: trader.id },
      select: { trustBalance: true, deposit: true, profitFromDeals: true },
    });

    // Проверяем, что изменения балансов идентичны
    const adminBalanceChange = {
      trustBalance: (balanceAfterAdmin?.trustBalance || 0) - (balanceBeforeConfirmations?.trustBalance || 0),
      deposit: (balanceAfterAdmin?.deposit || 0) - (balanceBeforeConfirmations?.deposit || 0),
      profitFromDeals: (balanceAfterAdmin?.profitFromDeals || 0) - (balanceBeforeConfirmations?.profitFromDeals || 0),
    };

    const traderBalanceChange = {
      trustBalance: (balanceAfterTrader?.trustBalance || 0) - (balanceAfterAdmin?.trustBalance || 0),
      deposit: (balanceAfterTrader?.deposit || 0) - (balanceAfterAdmin?.deposit || 0),
      profitFromDeals: (balanceAfterTrader?.profitFromDeals || 0) - (balanceAfterAdmin?.profitFromDeals || 0),
    };

    console.log("Изменения через админ API:", adminBalanceChange);
    console.log("Изменения через трейдер API:", traderBalanceChange);

    // Изменения должны быть идентичными (с точностью до 0.01)
    expect(Math.abs(adminBalanceChange.trustBalance - traderBalanceChange.trustBalance)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(adminBalanceChange.deposit - traderBalanceChange.deposit)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(adminBalanceChange.profitFromDeals - traderBalanceChange.profitFromDeals)).toBeLessThanOrEqual(0.01);
  });
});
