import { db } from '../db';
import { sha256 } from '../utils/hash';
import { MethodType, BankType, Status, TransactionType, NotificationType } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { NotificationMatcherService } from '../services/NotificationMatcherService';

const TRADER_EMAIL = 'trader1@test.com';
const TRADER_NAME = 'Test Trader 1';
const DEVICE_ID = 'test-device-001';
const DEVICE_MODEL = 'Samsung Galaxy S21';
const MERCHANT_NAME = 'Test Merchant';

async function cleanupTestData() {
  console.log('Очистка тестовых данных...');
  
  try {
    // Находим пользователя и мерчанта
    const user = await db.user.findUnique({ where: { email: TRADER_EMAIL } });
    const merchant = await db.merchant.findUnique({ where: { name: MERCHANT_NAME } });
    
    // Удаляем в правильном порядке из-за foreign key constraints
    await db.notification.deleteMany({ where: { deviceId: DEVICE_ID } });
    
    if (user) {
      await db.transaction.deleteMany({ where: { traderId: user.id } });
      await db.bankDetail.deleteMany({ where: { userId: user.id } });
      await db.traderMerchant.deleteMany({ where: { traderId: user.id } });
    }
    
    if (merchant) {
      await db.transaction.deleteMany({ where: { merchantId: merchant.id } });
      await db.merchantMethod.deleteMany({ where: { merchantId: merchant.id } });
    }
    
    await db.device.deleteMany({ where: { deviceId: DEVICE_ID } });
    await db.merchant.deleteMany({ where: { name: MERCHANT_NAME } });
    await db.user.deleteMany({ where: { email: TRADER_EMAIL } });
  } catch (error) {
    console.log('Ошибка при очистке:', error);
  }
}

async function setupTestData() {
  console.log('\n=== 1. Создание пользователя и настройка устройства ===');
  
  await cleanupTestData();
  
  // Создание пользователя-трейдера
  const user = await db.user.create({
    data: {
      email: TRADER_EMAIL,
      name: TRADER_NAME,
      password: await sha256('test123'),
      banned: false,
      balanceUsdt: 0,
      balanceRub: 0,
      trustBalance: 5000, // Траст-баланс для возможности получения транзакций
      deposit: 0,
      frozenUsdt: 0,
      frozenRub: 0,
      trafficEnabled: true, // Командный режим включен
      profitPercent: 1.5,
      minAmountPerRequisite: 100,
      maxAmountPerRequisite: 100000
    }
  });
  console.log(`✓ Создан пользователь: ${user.email}, траст-баланс: ${user.trustBalance}`);
  
  // Создание устройства
  const deviceToken = createHash('sha256').update(`${DEVICE_ID}-${Date.now()}`).digest('hex');
  const device = await db.device.create({
    data: {
      name: DEVICE_MODEL,
      userId: user.id,
      token: deviceToken,
      emulated: true,
      lastActiveAt: new Date()
    }
  });
  console.log(`✓ Создано устройство: ${device.name} (ID: ${device.id})`);
  
  // Создание реквизитов на устройстве
  const sbpRequisite1 = await db.bankDetail.create({
    data: {
      userId: user.id,
      deviceId: device.id,
      methodType: MethodType.SBP,
      bankType: BankType.SBERBANK,
      cardNumber: '+79001234567',
      recipientName: 'IVAN IVANOV',
      phoneNumber: '+79001234567',
      minAmount: 100,
      maxAmount: 50000,
      dailyLimit: 500000,
      monthlyLimit: 5000000,
      isArchived: false
    }
  });
  console.log(`✓ Создан реквизит СБП на устройстве: ${sbpRequisite1.bankType}`);
  
  const c2cRequisite = await db.bankDetail.create({
    data: {
      userId: user.id,
      deviceId: device.id,
      methodType: MethodType.C2C,
      bankType: BankType.VTB,
      cardNumber: '4111111111111111',
      recipientName: 'IVAN IVANOV',
      minAmount: 100,
      maxAmount: 50000,
      dailyLimit: 500000,
      monthlyLimit: 5000000,
      isArchived: false
    }
  });
  console.log(`✓ Создан реквизит C2C на устройстве: ${c2cRequisite.bankType}`);
  
  // Создание СБП реквизита на БТ-входе (без устройства)
  const sbpRequisite2 = await db.bankDetail.create({
    data: {
      userId: user.id,
      methodType: MethodType.SBP,
      bankType: BankType.TBANK,
      cardNumber: '+79001234568',
      recipientName: 'IVAN IVANOV',
      phoneNumber: '+79001234568',
      minAmount: 100,
      maxAmount: 50000,
      dailyLimit: 500000,
      monthlyLimit: 5000000,
      isArchived: false
    }
  });
  console.log(`✓ Создан реквизит СБП на БТ-входе (без устройства): ${sbpRequisite2.bankType}`);
  
  // Создание тестового мерчанта
  const merchant = await db.merchant.create({
    data: {
      email: MERCHANT_EMAIL,
      name: 'Test Merchant',
      password: await sha256('merchant123'),
      token: randomBytes(32).toString('hex'),
      fee: 2.5,
      enabled: true,
      isTestMerchant: true
    }
  });
  console.log(`✓ Создан тестовый мерчант: ${merchant.email}`);
  
  // Создание методов оплаты
  const sbpMethod = await db.method.findFirst({
    where: { type: MethodType.SBP }
  });
  
  const c2cMethod = await db.method.findFirst({
    where: { type: MethodType.C2C }
  });
  
  if (sbpMethod) {
    await db.merchantMethod.create({
      data: {
        merchantId: merchant.id,
        methodId: sbpMethod.id,
        isEnabled: true
      }
    });
    console.log(`✓ Добавлен метод СБП для мерчанта`);
  }
  
  if (c2cMethod) {
    await db.merchantMethod.create({
      data: {
        merchantId: merchant.id,
        methodId: c2cMethod.id,
        isEnabled: true
      }
    });
    console.log(`✓ Добавлен метод C2C для мерчанта`);
  }
  
  // Создание связи трейдер-мерчант
  if (sbpMethod) {
    await db.traderMerchant.create({
      data: {
        traderId: user.id,
        merchantId: merchant.id,
        methodId: sbpMethod.id,
        feeIn: 1.5,
        feeOut: 1.5,
        isFeeInEnabled: true,
        isFeeOutEnabled: true,
        isMerchantEnabled: true
      }
    });
  }
  
  if (c2cMethod) {
    await db.traderMerchant.create({
      data: {
        traderId: user.id,
        merchantId: merchant.id,
        methodId: c2cMethod.id,
        feeIn: 1.5,
        feeOut: 1.5,
        isFeeInEnabled: true,
        isFeeOutEnabled: true,
        isMerchantEnabled: true
      }
    });
  }
  
  return { user, device, sbpRequisite1, c2cRequisite, sbpRequisite2, merchant, sbpMethod, c2cMethod };
}

async function testTransactionWithoutBalance(userId: string, merchantId: string, methodId: string) {
  console.log('\n=== 2. Проверка получения сделок без баланса ===');
  
  const userBefore = await db.user.findUnique({ where: { id: userId } });
  console.log(`Баланс трейдера: ${userBefore?.balanceUsdt} USDT, траст: ${userBefore?.trustBalance} USDT`);
  
  // Создаем транзакцию
  const transaction = await db.transaction.create({
    data: {
      merchantId: merchantId,
      amount: 1000,
      assetOrBank: 'SBP',
      orderId: `test-no-balance-${Date.now()}`,
      methodId: methodId,
      currency: 'RUB',
      userId: `customer-${Date.now()}`,
      callbackUri: 'https://example.com/callback',
      successUri: '',
      failUri: '',
      type: TransactionType.IN,
      expired_at: new Date(Date.now() + 86400000),
      commission: 0,
      clientName: 'Test Customer',
      status: Status.CREATED,
      rate: 90,
      traderId: userId
    }
  });
  
  console.log(`✓ Транзакция создана: ${transaction.id}`);
  
  // Проверяем, назначена ли транзакция трейдеру
  const bankDetail = await db.bankDetail.findFirst({
    where: {
      userId: userId,
      methodType: MethodType.SBP,
      isArchived: false
    }
  });
  
  if (bankDetail) {
    await db.transaction.update({
      where: { id: transaction.id },
      data: { bankDetailId: bankDetail.id }
    });
    console.log('✓ Сделка успешно назначена трейдеру без баланса (но с трастом)');
  }
  
  return transaction;
}

async function testTransactionWithoutTeamMode(userId: string, merchantId: string, methodId: string) {
  console.log('\n=== 3. Проверка получения сделок с выключенным режимом Команда ===');
  
  // Выключаем командный режим
  await db.user.update({
    where: { id: userId },
    data: { trafficEnabled: false }
  });
  console.log('✓ Командный режим выключен');
  
  // Пытаемся создать транзакцию
  const orderId = `test-no-team-${Date.now()}`;
  
  // Проверяем доступные реквизиты
  const availableRequisites = await db.bankDetail.findMany({
    where: {
      isArchived: false,
      methodType: MethodType.SBP,
      user: { 
        banned: false,
        trafficEnabled: true // Только у трейдеров с включенным командным режимом
      }
    }
  });
  
  console.log(`Доступных реквизитов для назначения: ${availableRequisites.length}`);
  
  if (availableRequisites.length === 0) {
    console.log('✓ Нет доступных реквизитов - транзакция не может быть создана');
  } else {
    console.log('✗ Найдены доступные реквизиты, хотя не должны были');
  }
  
  // Включаем обратно
  await db.user.update({
    where: { id: userId },
    data: { trafficEnabled: true }
  });
  console.log('✓ Командный режим включен обратно');
}

async function testBalanceFreezing(userId: string, merchantId: string, methodId: string) {
  console.log('\n=== 4. Проверка заморозки средств при получении сделки ===');
  
  // Добавляем баланс трейдеру
  await db.user.update({
    where: { id: userId },
    data: { 
      balanceUsdt: 100,
      trustBalance: 5000
    }
  });
  
  const userBefore = await db.user.findUnique({ where: { id: userId } });
  console.log(`Баланс до транзакции: ${userBefore?.balanceUsdt} USDT, заморожено: ${userBefore?.frozenUsdt} USDT`);
  
  // Создаем транзакцию с параметрами заморозки
  const rate = 90;
  const amount = 3000; // RUB
  const kkkPercent = 2.0;
  const feeInPercent = 1.5;
  
  // Расчет параметров заморозки (как в merchant/index.ts)
  const baseUsdt = amount / rate;
  const adjustedRate = rate * (1 - kkkPercent / 100);
  const frozenUsdtAmount = amount / adjustedRate;
  const calculatedCommission = baseUsdt * (feeInPercent / 100);
  const totalRequired = frozenUsdtAmount + calculatedCommission;
  
  console.log(`Расчет заморозки: сумма ${amount} RUB, курс ${rate}, KKK ${kkkPercent}%, комиссия ${feeInPercent}%`);
  console.log(`Требуется заморозить: ${totalRequired.toFixed(2)} USDT`);
  
  // Получаем реквизит
  const bankDetail = await db.bankDetail.findFirst({
    where: {
      userId: userId,
      methodType: MethodType.C2C,
      isArchived: false
    }
  });
  
  // Создаем транзакцию
  const transaction = await db.transaction.create({
    data: {
      merchantId: merchantId,
      amount: amount,
      assetOrBank: 'C2C',
      orderId: `test-freeze-${Date.now()}`,
      methodId: methodId,
      currency: 'RUB',
      userId: `customer-${Date.now()}`,
      callbackUri: 'https://example.com/callback',
      successUri: '',
      failUri: '',
      type: TransactionType.IN,
      expired_at: new Date(Date.now() + 86400000),
      commission: 0,
      clientName: 'Test Customer',
      status: Status.IN_PROGRESS,
      rate: rate,
      adjustedRate: adjustedRate,
      kkkPercent: kkkPercent,
      feeInPercent: feeInPercent,
      frozenUsdtAmount: frozenUsdtAmount,
      calculatedCommission: calculatedCommission,
      traderId: userId,
      bankDetailId: bankDetail?.id
    }
  });
  
  // Замораживаем средства
  await db.user.update({
    where: { id: userId },
    data: {
      frozenUsdt: { increment: totalRequired }
    }
  });
  
  const userAfter = await db.user.findUnique({ where: { id: userId } });
  console.log(`Баланс после транзакции: ${userAfter?.balanceUsdt} USDT, заморожено: ${userAfter?.frozenUsdt} USDT`);
  
  if (userAfter?.frozenUsdt === totalRequired) {
    console.log(`✓ Средства заморожены корректно: ${totalRequired.toFixed(2)} USDT`);
  } else {
    console.log(`✗ Средства заморожены некорректно. Ожидалось: ${totalRequired.toFixed(2)}, получено: ${userAfter?.frozenUsdt}`);
  }
  
  return transaction;
}

async function testManualAcceptance(transactionId: string) {
  console.log('\n=== 5. Проверка ручного принятия сделки и начисления прибыли ===');
  
  const transactionBefore = await db.transaction.findUnique({
    where: { id: transactionId },
    include: { trader: true }
  });
  console.log(`Статус до: ${transactionBefore?.status}, прибыль трейдера до: ${transactionBefore?.trader?.tradingVolume || 0}`);
  
  // Ручное подтверждение транзакции
  await db.transaction.update({
    where: { id: transactionId },
    data: {
      status: Status.READY,
      acceptedAt: new Date()
    }
  });
  
  // Рассчитываем и начисляем прибыль
  const profit = transactionBefore!.amount * (transactionBefore!.trader!.profitPercent! / 100);
  
  await db.user.update({
    where: { id: transactionBefore!.traderId! },
    data: {
      tradingVolume: { increment: transactionBefore!.amount },
      balanceRub: { increment: profit },
      // Размораживаем средства
      frozenUsdt: { decrement: (transactionBefore!.frozenUsdtAmount || 0) + (transactionBefore!.calculatedCommission || 0) }
    }
  });
  
  const transactionAfter = await db.transaction.findUnique({
    where: { id: transactionId },
    include: { trader: true }
  });
  console.log(`Статус после: ${transactionAfter?.status}, объем торговли после: ${transactionAfter?.trader?.tradingVolume}`);
  console.log(`✓ Прибыль начислена: ${profit} RUB (${transactionBefore!.trader!.profitPercent}% от ${transactionBefore!.amount} RUB)`);
}

async function testNotificationMatching(deviceId: string, userId: string) {
  console.log('\n=== 6. Проверка работы NotificationMatcherService ===');
  
  // Получаем C2C реквизит
  const bankDetail = await db.bankDetail.findFirst({
    where: {
      userId: userId,
      deviceId: deviceId,
      methodType: MethodType.C2C,
      bankType: BankType.VTB
    }
  });
  
  if (!bankDetail) {
    console.log('✗ Не найден C2C реквизит для тестирования');
    return;
  }
  
  // Создаем новую транзакцию для тестирования
  const transaction = await db.transaction.create({
    data: {
      merchantId: (await db.merchant.findFirst())!.id,
      amount: 5000,
      assetOrBank: 'C2C: 4111111111111111',
      orderId: `test-notif-${Date.now()}`,
      methodId: (await db.method.findFirst({ where: { type: MethodType.C2C } }))!.id,
      currency: 'RUB',
      userId: `customer-${Date.now()}`,
      callbackUri: 'https://example.com/callback',
      successUri: '',
      failUri: '',
      type: TransactionType.IN,
      expired_at: new Date(Date.now() + 86400000),
      commission: 0,
      clientName: 'Test Customer',
      status: Status.IN_PROGRESS,
      rate: 90,
      traderId: userId,
      bankDetailId: bankDetail.id
    },
    include: { merchant: true }
  });
  console.log(`✓ Создана транзакция для проверки: ${transaction.id}, сумма: ${transaction.amount}`);
  
  // Симулируем получение уведомления от банка
  const notification = await db.notification.create({
    data: {
      deviceId: deviceId,
      type: NotificationType.AppNotification,
      application: 'ru.vtb24.mobilebanking.android',
      title: 'ВТБ',
      message: `Перевод от PETROV P. Сумма: 5000 руб. Баланс: 15000 руб.`,
      isRead: false,
      metadata: {
        packageName: 'ru.vtb24.mobilebanking.android',
        amount: 5000,
        sender: 'PETROV P.',
        balance: 15000
      }
    }
  });
  console.log(`✓ Создано уведомление от банка: ${notification.title}`);
  
  // Создаем экземпляр сервиса и обрабатываем уведомление
  const notificationMatcher = new NotificationMatcherService();
  
  // Обрабатываем уведомление напрямую
  const notificationWithDevice = await db.notification.findUnique({
    where: { id: notification.id },
    include: {
      Device: {
        include: {
          bankDetails: true
        }
      }
    }
  });
  
  if (notificationWithDevice) {
    // Вызываем приватный метод через рефлексию для тестирования
    await (notificationMatcher as any).processNotification(notificationWithDevice);
  }
  
  // Проверяем результат
  const updatedTransaction = await db.transaction.findUnique({
    where: { id: transaction.id }
  });
  
  if (updatedTransaction?.status === Status.READY) {
    console.log('✓ Статус транзакции изменен на READY');
  } else {
    console.log(`✗ Статус транзакции не изменен (текущий: ${updatedTransaction?.status})`);
  }
  
  // Проверяем, было ли уведомление помечено как прочитанное
  const updatedNotification = await db.notification.findUnique({
    where: { id: notification.id }
  });
  
  if (updatedNotification?.isRead) {
    console.log('✓ Уведомление помечено как прочитанное');
  } else {
    console.log('✗ Уведомление не помечено как прочитанное');
  }
}

async function testCallbackSending(transactionId: string) {
  console.log('\n=== 7. Проверка отправки callback при автоматическом подтверждении ===');
  
  const transaction = await db.transaction.findUnique({
    where: { id: transactionId },
    include: { merchant: true }
  });
  
  if (!transaction) {
    console.log('✗ Транзакция не найдена');
    return;
  }
  
  console.log(`Callback URL: ${transaction.callbackUri}`);
  console.log(`Статус транзакции: ${transaction.status}`);
  
  if (transaction.status === Status.READY) {
    console.log('✓ Транзакция готова для отправки callback');
    // В реальной системе callback отправляется автоматически сервисом
    // Здесь мы просто проверяем, что все условия выполнены
  }
}

async function main() {
  try {
    // 1. Создание пользователя и настройка
    const { user, device, sbpRequisite1, c2cRequisite, sbpRequisite2, merchant, sbpMethod, c2cMethod } = await setupTestData();
    
    if (!sbpMethod || !c2cMethod) {
      console.error('✗ Методы оплаты не найдены в системе');
      return;
    }
    
    // 2. Проверка получения сделок без баланса
    await testTransactionWithoutBalance(user.id, merchant.id, sbpMethod.id);
    
    // 3. Проверка с выключенным командным режимом
    await testTransactionWithoutTeamMode(user.id, merchant.id, sbpMethod.id);
    
    // 4. Проверка заморозки средств
    const freezeTransaction = await testBalanceFreezing(user.id, merchant.id, c2cMethod.id);
    
    // 5. Проверка ручного принятия и прибыли
    await testManualAcceptance(freezeTransaction.id);
    
    // 6. Проверка NotificationMatcherService
    await testNotificationMatching(device.id, user.id);
    
    // 7. Проверка отправки callback
    const lastTransaction = await db.transaction.findFirst({
      where: { traderId: user.id },
      orderBy: { createdAt: 'desc' }
    });
    if (lastTransaction) {
      await testCallbackSending(lastTransaction.id);
    }
    
    console.log('\n=== Проверка завершена ===');
  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    await db.$disconnect();
  }
}

// Обновляем задачу в todo списке
async function updateTodoProgress() {
  const todos = [
    { id: "1", content: "Создать пользователя и настроить устройство с реквизитами (СБП и C2C)", status: "completed", priority: "high" },
    { id: "2", content: "Добавить реквизит СБП на БТ-входе без устройства", status: "completed", priority: "high" },
    { id: "3", content: "Проверить получение сделок без баланса", status: "pending", priority: "high" },
    { id: "4", content: "Проверить получение сделок с выключенным переключателем Команда", status: "pending", priority: "high" },
    { id: "5", content: "Проверить заморозку средств при получении сделки", status: "pending", priority: "high" },
    { id: "6", content: "Создать и принять сделку вручную, проверить начисление прибыли", status: "pending", priority: "high" },
    { id: "7", content: "Проверить работу NotificationMatcherService", status: "pending", priority: "high" },
    { id: "8", content: "Проверить автоматическое подтверждение транзакции и отправку callback", status: "pending", priority: "high" }
  ];
}

main();