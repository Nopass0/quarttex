#!/usr/bin/env bun

import { db } from './src/db';

async function main() {
  console.log('🔧 Настраиваем агрегаторов для тестирования ротации...\n');

  // Обновляем PSPware - высокий приоритет, без страхового депозита
  const pspware = await db.aggregator.update({
    where: { id: 'cmfcjbips0r40iktfxhlaktxm' }, // PSPware ID
    data: {
      isActive: true,
      priority: 10,
      depositUsdt: 0, // Не требуется депозит
      balanceUsdt: 50000,
      requiresInsuranceDeposit: false,
      minBalance: 0
    }
  });
  console.log(`✅ PSPware: priority=${pspware.priority}, requiresInsurance=${pspware.requiresInsuranceDeposit}, balance=${pspware.balanceUsdt}`);

  // Обновляем Test Aggregator - низкий приоритет
  const testAgg = await db.aggregator.update({
    where: { id: 'cmfcue3ww0000ikn5tq50b8bg' }, // Test Aggregator ID
    data: {
      isActive: true,
      priority: 5,
      depositUsdt: 2000,
      balanceUsdt: 10000,
      requiresInsuranceDeposit: true,
      minBalance: 0
    }
  });
  console.log(`✅ Test Aggregator: priority=${testAgg.priority}, requiresInsurance=${testAgg.requiresInsuranceDeposit}, deposit=${testAgg.depositUsdt}, balance=${testAgg.balanceUsdt}`);

  // Находим или создаем тестовый мерчант
  let merchant = await db.merchant.findFirst({
    where: { name: 'Test Merchant PSPWare' }
  });
  
  if (!merchant) {
    merchant = await db.merchant.create({
      data: {
        name: 'Test Merchant PSPWare',
        email: 'test-pspware@merchant.com',
        password: '$2a$10$1234567890abcdefghijk', // хэш пароля
        apiKey: 'test-merchant-api-key-' + Date.now(),
        disabled: false,
        countInRubEquivalent: true
      }
    });
    console.log(`✅ Создан мерчант: ${merchant.name}`);
  } else {
    console.log(`✅ Используем существующий мерчант: ${merchant.name}`);
  }

  // Находим метод SBP
  const method = await db.method.findFirst({
    where: { code: 'sbp' }
  });

  if (!method) {
    console.error('❌ Метод SBP не найден в БД');
    process.exit(1);
  }

  // Убеждаемся, что у мерчанта есть доступ к методу
  await db.merchantMethod.upsert({
    where: {
      merchantId_methodId: {
        merchantId: merchant.id,
        methodId: method.id
      }
    },
    create: {
      merchantId: merchant.id,
      methodId: method.id,
      isEnabled: true
    },
    update: {
      isEnabled: true
    }
  });

  console.log('\n📊 Состояние агрегаторов:');
  const aggregators = await db.aggregator.findMany({
    where: { isActive: true },
    orderBy: [
      { priority: 'desc' },
      { updatedAt: 'asc' }
    ],
    select: {
      name: true,
      priority: true,
      isActive: true,
      balanceUsdt: true,
      depositUsdt: true,
      requiresInsuranceDeposit: true,
      apiBaseUrl: true
    }
  });

  aggregators.forEach(agg => {
    console.log(`- ${agg.name}: priority=${agg.priority}, balance=${agg.balanceUsdt}, deposit=${agg.depositUsdt}, requiresInsurance=${agg.requiresInsuranceDeposit}`);
  });

  console.log(`\n✅ Настройка завершена!`);
  console.log(`\n🚀 Теперь создайте сделку через API:`);
  console.log(`curl -X POST http://localhost:3000/api/merchant/transactions/in \\
  -H "x-merchant-api-key: ${merchant.apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "orderId": "test-rotation-${Date.now()}",
    "amount": 1000,
    "methodId": "${method.id}",
    "userIp": "192.168.1.1",
    "callbackUri": "https://example.com/callback"
  }'`);

  process.exit(0);
}

main().catch(console.error);