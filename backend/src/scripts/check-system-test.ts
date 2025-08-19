import { db } from '../db';
import { sha256 } from '../utils/hash';
import { MethodType, BankType, Status, TransactionType, NotificationType } from '@prisma/client';
import { randomBytes } from 'crypto';

// Простая проверка системы без создания тестовых данных
async function checkExistingTraders() {
  console.log('\n=== Проверка существующих трейдеров ===');
  
  const traders = await db.user.findMany({
    where: {
      email: { contains: 'trader' }
    },
    include: {
      bankDetails: true,
      devices: true
    }
  });
  
  console.log(`Найдено трейдеров: ${traders.length}`);
  
  for (const trader of traders) {
    console.log(`\nТрейдер: ${trader.email}`);
    console.log(`  Баланс USDT: ${trader.balanceUsdt}, RUB: ${trader.balanceRub}`);
    console.log(`  Траст-баланс: ${trader.trustBalance}`);
    console.log(`  Командный режим: ${trader.trafficEnabled ? 'включен' : 'выключен'}`);
    console.log(`  Реквизитов: ${trader.bankDetails.length}`);
    console.log(`  Устройств: ${trader.devices.length}`);
    
    // Проверяем транзакции без баланса
    if (trader.balanceUsdt === 0 && trader.trustBalance > 0) {
      console.log(`  ✓ Трейдер может получать сделки без баланса (есть траст)`);
    }
  }
}

async function checkTransactions() {
  console.log('\n=== Проверка транзакций ===');
  
  const recentTransactions = await db.transaction.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      trader: true,
      bankDetail: true,
      merchant: true
    }
  });
  
  console.log(`Последние ${recentTransactions.length} транзакций:`);
  
  for (const tx of recentTransactions) {
    console.log(`\nTransакция ${tx.numericId}:`);
    console.log(`  Сумма: ${tx.amount} RUB`);
    console.log(`  Статус: ${tx.status}`);
    console.log(`  Трейдер: ${tx.trader?.email}`);
    console.log(`  Заморожено USDT: ${tx.frozenUsdtAmount}`);
    console.log(`  Комиссия: ${tx.calculatedCommission}`);
    
    if (tx.status === Status.READY && tx.trader) {
      const profit = tx.amount * (tx.trader.profitPercent || 0) / 100;
      console.log(`  Прибыль трейдера: ${profit} RUB`);
    }
  }
}

async function checkNotifications() {
  console.log('\n=== Проверка уведомлений ===');
  
  const notifications = await db.notification.findMany({
    where: {
      type: NotificationType.AppNotification,
      isRead: false
    },
    take: 5,
    include: {
      Device: {
        include: {
          bankDetails: true
        }
      }
    }
  });
  
  console.log(`Непрочитанных уведомлений: ${notifications.length}`);
  
  for (const notif of notifications) {
    console.log(`\nУведомление ${notif.id}:`);
    console.log(`  Приложение: ${notif.application}`);
    console.log(`  Сообщение: ${notif.message}`);
    console.log(`  Устройство: ${notif.Device?.name}`);
    
    // Проверяем, есть ли реквизиты для сопоставления
    if (notif.Device?.bankDetails && notif.Device.bankDetails.length > 0) {
      console.log(`  ✓ Есть реквизиты для сопоставления`);
    }
  }
}

async function testFreezingCalculation() {
  console.log('\n=== Проверка расчета заморозки ===');
  
  const amount = 10000; // RUB
  const rate = 90;
  const kkkPercent = 2.0;
  const feeInPercent = 1.5;
  
  // Расчет как в системе
  const baseUsdt = amount / rate;
  const adjustedRate = rate * (1 - kkkPercent / 100);
  const frozenUsdtAmount = amount / adjustedRate;
  const calculatedCommission = baseUsdt * (feeInPercent / 100);
  const totalRequired = frozenUsdtAmount + calculatedCommission;
  
  console.log(`Для транзакции ${amount} RUB:`);
  console.log(`  Курс: ${rate}`);
  console.log(`  KKK: ${kkkPercent}%`);
  console.log(`  Комиссия: ${feeInPercent}%`);
  console.log(`  Скорректированный курс: ${adjustedRate}`);
  console.log(`  Замороженная сумма USDT: ${frozenUsdtAmount.toFixed(2)}`);
  console.log(`  Комиссия USDT: ${calculatedCommission.toFixed(2)}`);
  console.log(`  Всего заморожено: ${totalRequired.toFixed(2)} USDT`);
}

async function main() {
  try {
    await checkExistingTraders();
    await checkTransactions();
    await checkNotifications();
    await testFreezingCalculation();
    
    console.log('\n=== Проверка завершена ===');
  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    await db.$disconnect();
  }
}

main();