#!/usr/bin/env bun
import { db } from '../db';

/**
 * Тест admin mock endpoint с интервалом между сделками
 */
async function testAdminInterval() {
  console.log('🧪 Тестирование admin mock endpoint с интервалом...\n');

  try {
    // Найти тестовые данные
    const merchant = await db.merchant.findFirst({
      where: { name: 'Test Interval Merchant' },
    });

    const method = await db.method.findFirst({
      where: { code: 'sbp-test' },
    });

    if (!merchant || !method) {
      console.log('❌ Не найдены тестовые данные. Сначала запустите test-interval-functionality.ts');
      return;
    }

    console.log('✅ Найдены тестовые данные:');
    console.log(`  - Мерчант: ${merchant.id}`);
    console.log(`  - Метод: ${method.id}`);

    // Тест 1: Создать транзакцию через admin mock API
    console.log('\n🧪 Тест 1: Создание транзакции через admin mock API...');

    const response1 = await fetch('http://localhost:3000/api/admin/transactions/mock/in', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        merchantId: merchant.id,
        amount: 1000,
        methodId: method.id,
        orderId: `admin-test-1-${Date.now()}`,
      }),
    });

    if (response1.ok) {
      const data1 = await response1.json();
      console.log('✅ Первая транзакция создана через admin API:', data1.id);
      console.log(`  - Реквизит: ${data1.bankDetailId}`);
      console.log(`  - Интервал реквизита: ${data1.requisites?.intervalMinutes || 'неизвестно'}`);
    } else {
      const error1 = await response1.text();
      console.log('❌ Ошибка создания первой транзакции:', error1);
    }

    // Небольшая задержка
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Тест 2: Попытка создать вторую транзакцию сразу
    console.log('\n🧪 Тест 2: Попытка создать вторую транзакцию сразу...');

    const response2 = await fetch('http://localhost:3000/api/admin/transactions/mock/in', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        merchantId: merchant.id,
        amount: 1500,
        methodId: method.id,
        orderId: `admin-test-2-${Date.now()}`,
      }),
    });

    if (response2.ok) {
      const data2 = await response2.json();
      console.log('❌ ПРЕДУПРЕЖДЕНИЕ: Вторая транзакция создана (возможно, выбран другой реквизит):', data2.id);
      console.log(`  - Реквизит: ${data2.bankDetailId}`);
    } else {
      const error2 = await response2.text();
      console.log('✅ Вторая транзакция корректно отклонена:', error2);
    }

    console.log('\n🎉 Тест admin API с интервалом завершен!');

  } catch (error) {
    console.error('❌ Ошибка при тестировании admin API:', error);
  } finally {
    await db.$disconnect();
  }
}

if (import.meta.main) {
  // Даем время серверу запуститься
  setTimeout(testAdminInterval, 2000);
}
