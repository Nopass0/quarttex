#!/usr/bin/env bun
import { db } from '../db';
import { BankType, MethodType } from '@prisma/client';

/**
 * Тест API для создания транзакций с интервалом через merchant endpoint
 */
async function testApiInterval() {
  console.log('🧪 Тестирование API с интервалом между сделками...\n');

  try {
    // Найти тестовые данные из предыдущего теста
    const trader = await db.user.findFirst({
      where: { email: 'test-interval-trader@example.com' },
    });

    const merchant = await db.merchant.findFirst({
      where: { name: 'Test Interval Merchant' },
    });

    const method = await db.method.findFirst({
      where: { code: 'sbp-test' },
    });

    if (!trader || !merchant || !method) {
      console.log('❌ Не найдены тестовые данные. Сначала запустите test-interval-functionality.ts');
      return;
    }

    // Найти реквизит с интервалом
    const requisite = await db.bankDetail.findFirst({
      where: {
        userId: trader.id,
        intervalMinutes: 2,
      },
    });

    if (!requisite) {
      console.log('❌ Не найден реквизит с интервалом');
      return;
    }

    console.log('✅ Найдены тестовые данные:');
    console.log(`  - Трейдер: ${trader.id}`);
    console.log(`  - Мерчант: ${merchant.id}`);
    console.log(`  - Метод: ${method.id}`);
    console.log(`  - Реквизит с интервалом ${requisite.intervalMinutes} мин: ${requisite.id}`);

    // Тест 1: Создать транзакцию через API
    console.log('\n🧪 Тест 1: Создание транзакции через merchant API...');

    const response1 = await fetch('http://localhost:3000/api/merchant/transactions/in', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${merchant.token}`,
      },
      body: JSON.stringify({
        amount: 1000,
        orderId: `api-test-1-${Date.now()}`,
        methodId: method.id,
        userId: `user_${Date.now()}`,
        userIp: '127.0.0.1',
        callbackUri: 'https://example.com/callback',
        successUri: 'https://example.com/success',
        failUri: 'https://example.com/fail',
        clientName: 'Test API Client',
      }),
    });

    if (response1.ok) {
      const data1 = await response1.json();
      console.log('✅ Первая транзакция создана через API:', data1.id);
    } else {
      const error1 = await response1.text();
      console.log('❌ Ошибка создания первой транзакции:', error1);
    }

    // Тест 2: Попытка создать вторую транзакцию сразу
    console.log('\n🧪 Тест 2: Попытка создать вторую транзакцию сразу...');

    const response2 = await fetch('http://localhost:3000/api/merchant/transactions/in', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${merchant.token}`,
      },
      body: JSON.stringify({
        amount: 1500,
        orderId: `api-test-2-${Date.now()}`,
        methodId: method.id,
        userId: `user_${Date.now()}`,
        userIp: '127.0.0.1',
        callbackUri: 'https://example.com/callback',
        successUri: 'https://example.com/success',
        failUri: 'https://example.com/fail',
        clientName: 'Test API Client',
      }),
    });

    if (response2.ok) {
      const data2 = await response2.json();
      console.log('❌ ОШИБКА: Вторая транзакция не должна была быть создана:', data2.id);
    } else {
      const error2 = await response2.text();
      console.log('✅ Вторая транзакция корректно отклонена:', error2);
    }

    console.log('\n🎉 Тест API с интервалом завершен!');

  } catch (error) {
    console.error('❌ Ошибка при тестировании API:', error);
  } finally {
    await db.$disconnect();
  }
}

if (import.meta.main) {
  // Даем время серверу запуститься
  setTimeout(testApiInterval, 3000);
}
