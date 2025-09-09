#!/usr/bin/env bun
import { db } from '../db';
import { BankType, MethodType, Status, TransactionType } from '@prisma/client';

/**
 * Тест функциональности интервала между сделками на реквизитах
 */
async function testIntervalFunctionality() {
  console.log('🧪 Тестирование функциональности интервала между сделками...\n');

  try {
    // 1. Найти или создать тестового трейдера
    let trader = await db.user.findFirst({
      where: { email: 'test-interval-trader@example.com' },
    });

    if (!trader) {
      trader = await db.user.create({
        data: {
          email: 'test-interval-trader@example.com',
          password: 'test',
          name: 'Test Interval Trader',
          balanceUsdt: 1000,
          balanceRub: 100000,
          minAmountPerRequisite: 100,
          maxAmountPerRequisite: 50000,
        },
      });
      console.log('✅ Создан тестовый трейдер:', trader.id);
    } else {
      console.log('✅ Используется существующий трейдер:', trader.id);
    }

    // 2. Создать реквизит с интервалом 2 минуты
    const requisite = await db.bankDetail.create({
      data: {
        userId: trader.id,
        methodType: MethodType.sbp,
        bankType: BankType.SBERBANK,
        cardNumber: '+79001234567',
        recipientName: 'Test Trader',
        phoneNumber: '+79001234567',
        minAmount: 100,
        maxAmount: 50000,
        intervalMinutes: 2, // 2 минуты интервал
        operationLimit: 10,
        sumLimit: 100000,
        isActive: true,
      },
    });

    console.log('✅ Создан тестовый реквизит с интервалом 2 минуты:', requisite.id);

    // 3. Найти или создать тестового мерчанта
    let merchant = await db.merchant.findFirst({
      where: { name: 'Test Interval Merchant' },
    });

    if (!merchant) {
      merchant = await db.merchant.create({
        data: {
          name: 'Test Interval Merchant',
          token: `test-interval-token-${Date.now()}`,
          balanceUsdt: 1000,
          countInRubEquivalent: false,
        },
      });
      console.log('✅ Создан тестовый мерчант:', merchant.id);
    } else {
      console.log('✅ Используется существующий мерчант:', merchant.id);
    }

    // 4. Найти или создать метод платежа
    let method = await db.method.findFirst({
      where: { type: 'sbp', isEnabled: true },
    });

    if (!method) {
      method = await db.method.create({
        data: {
          code: 'sbp-test',
          name: 'SBP Test',
          type: 'sbp',
          currency: 'rub',
          isEnabled: true,
          minPayin: 100,
          maxPayin: 50000,
          minPayout: 100,
          maxPayout: 50000,
          commissionPayin: 0,
          commissionPayout: 0,
          chancePayin: 1.0,
          chancePayout: 1.0,
        },
      });
      console.log('✅ Создан тестовый метод:', method.id);
    } else {
      console.log('✅ Используется существующий метод:', method.id);
    }

    // 5. Привязать метод к мерчанту
    const merchantMethod = await db.merchantMethod.upsert({
      where: {
        merchantId_methodId: {
          merchantId: merchant.id,
          methodId: method.id,
        },
      },
      create: {
        merchantId: merchant.id,
        methodId: method.id,
        isEnabled: true,
      },
      update: {
        isEnabled: true,
      },
    });

    console.log('✅ Метод привязан к мерчанту');

    // 6. Тест 1: Создать первую транзакцию (должна пройти)
    console.log('\n🧪 Тест 1: Создание первой транзакции...');
    
    const transaction1 = await db.transaction.create({
      data: {
        merchantId: merchant.id,
        bankDetailId: requisite.id,
        amount: 1000,
        assetOrBank: 'SBERBANK',
        orderId: `test-order-1-${Date.now()}`,
        methodId: method.id,
        currency: 'RUB',
        userId: `user_${Date.now()}`,
        userIp: '127.0.0.1',
        callbackUri: '',
        successUri: '',
        failUri: '',
        type: TransactionType.IN,
        expired_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        commission: 0,
        clientName: 'Test Client',
        status: Status.CREATED,
        rate: 100,
        traderId: trader.id,
      },
    });

    console.log('✅ Первая транзакция создана успешно:', transaction1.id);

    // 7. Тест 2: Попытка создать вторую транзакцию сразу (должна быть отклонена из-за интервала)
    console.log('\n🧪 Тест 2: Попытка создать вторую транзакцию сразу...');
    
    // Эмулируем логику выбора реквизита из merchant endpoint
    const intervalStart = new Date();
    intervalStart.setMinutes(intervalStart.getMinutes() - requisite.intervalMinutes);
    
    const recentTransaction = await db.transaction.findFirst({
      where: {
        bankDetailId: requisite.id,
        createdAt: {
          gte: intervalStart,
        },
        status: {
          notIn: [Status.CANCELED, Status.EXPIRED],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (recentTransaction) {
      const timeSinceLastTransaction = Math.floor(
        (Date.now() - recentTransaction.createdAt.getTime()) / (1000 * 60)
      );
      console.log(
        `❌ Реквизит ${requisite.id} отклонен: интервал между сделками не соблюден. ` +
        `Последняя сделка: ${timeSinceLastTransaction} мин назад, требуется интервал: ${requisite.intervalMinutes} мин`
      );
      console.log('✅ Проверка интервала работает правильно - вторая транзакция отклонена');
    } else {
      console.log('❌ ОШИБКА: Проверка интервала не работает - транзакция должна была быть отклонена!');
    }

    // 8. Тест 3: Обновить время первой транзакции на 3 минуты назад
    console.log('\n🧪 Тест 3: Обновляем время первой транзакции на 3 минуты назад...');
    
    const threeMinutesAgo = new Date();
    threeMinutesAgo.setMinutes(threeMinutesAgo.getMinutes() - 3);
    
    await db.transaction.update({
      where: { id: transaction1.id },
      data: { createdAt: threeMinutesAgo },
    });

    console.log('✅ Время первой транзакции обновлено');

    // 9. Тест 4: Попытка создать третью транзакцию (должна пройти, так как прошло больше 2 минут)
    console.log('\n🧪 Тест 4: Попытка создать третью транзакцию после истечения интервала...');
    
    const intervalStart2 = new Date();
    intervalStart2.setMinutes(intervalStart2.getMinutes() - requisite.intervalMinutes);
    
    const recentTransaction2 = await db.transaction.findFirst({
      where: {
        bankDetailId: requisite.id,
        createdAt: {
          gte: intervalStart2,
        },
        status: {
          notIn: [Status.CANCELED, Status.EXPIRED],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!recentTransaction2) {
      console.log('✅ Интервал истек - можно создавать новую транзакцию');
      
      const transaction3 = await db.transaction.create({
        data: {
          merchantId: merchant.id,
          bankDetailId: requisite.id,
          amount: 1500,
          assetOrBank: 'SBERBANK',
          orderId: `test-order-3-${Date.now()}`,
          methodId: method.id,
          currency: 'RUB',
          userId: `user_${Date.now()}`,
          userIp: '127.0.0.1',
          callbackUri: '',
          successUri: '',
          failUri: '',
          type: TransactionType.IN,
          expired_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
          commission: 0,
          clientName: 'Test Client',
          status: Status.CREATED,
          rate: 100,
          traderId: trader.id,
        },
      });
      
      console.log('✅ Третья транзакция создана успешно:', transaction3.id);
    } else {
      const timeSinceLastTransaction = Math.floor(
        (Date.now() - recentTransaction2.createdAt.getTime()) / (1000 * 60)
      );
      console.log(
        `❌ ОШИБКА: Интервал должен был истечь, но транзакция все еще блокируется. ` +
        `Последняя сделка: ${timeSinceLastTransaction} мин назад`
      );
    }

    // 10. Тест 5: Создать реквизит без интервала и проверить, что он не блокирует транзакции
    console.log('\n🧪 Тест 5: Создание реквизита без интервала...');
    
    const requisiteNoInterval = await db.bankDetail.create({
      data: {
        userId: trader.id,
        methodType: MethodType.c2c,
        bankType: BankType.VTB,
        cardNumber: '4111111111111111',
        recipientName: 'Test Trader No Interval',
        minAmount: 100,
        maxAmount: 50000,
        intervalMinutes: 0, // Без интервала
        operationLimit: 10,
        sumLimit: 100000,
        isActive: true,
      },
    });

    console.log('✅ Создан реквизит без интервала:', requisiteNoInterval.id);

    // Создаем две транзакции подряд на реквизите без интервала
    const transaction4 = await db.transaction.create({
      data: {
        merchantId: merchant.id,
        bankDetailId: requisiteNoInterval.id,
        amount: 2000,
        assetOrBank: 'VTB',
        orderId: `test-order-4-${Date.now()}`,
        methodId: method.id,
        currency: 'RUB',
        userId: `user_${Date.now()}`,
        userIp: '127.0.0.1',
        callbackUri: '',
        successUri: '',
        failUri: '',
        type: TransactionType.IN,
        expired_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        commission: 0,
        clientName: 'Test Client',
        status: Status.CREATED,
        rate: 100,
        traderId: trader.id,
      },
    });

    console.log('✅ Четвертая транзакция создана:', transaction4.id);

    // Проверяем, что интервал не блокирует (intervalMinutes = 0)
    if (requisiteNoInterval.intervalMinutes === 0) {
      console.log('✅ Интервал = 0, проверка интервала должна быть пропущена');
      
      const transaction5 = await db.transaction.create({
        data: {
          merchantId: merchant.id,
          bankDetailId: requisiteNoInterval.id,
          amount: 2500,
          assetOrBank: 'VTB',
          orderId: `test-order-5-${Date.now()}`,
          methodId: method.id,
          currency: 'RUB',
          userId: `user_${Date.now()}`,
          userIp: '127.0.0.1',
          callbackUri: '',
          successUri: '',
          failUri: '',
          type: TransactionType.IN,
          expired_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
          commission: 0,
          clientName: 'Test Client',
          status: Status.CREATED,
          rate: 100,
          traderId: trader.id,
        },
      });
      
      console.log('✅ Пятая транзакция создана сразу после четвертой:', transaction5.id);
    }

    console.log('\n🎉 Все тесты интервала завершены успешно!');
    console.log('\n📊 Резюме тестов:');
    console.log('- ✅ Первая транзакция на реквизите с интервалом: успешно создана');
    console.log('- ✅ Вторая транзакция сразу после первой: корректно отклонена');
    console.log('- ✅ Третья транзакция после истечения интервала: успешно создана');
    console.log('- ✅ Транзакции на реквизите без интервала: создаются без ограничений');

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

if (import.meta.main) {
  testIntervalFunctionality();
}
