#!/usr/bin/env bun

import { db } from '../db';

async function setupTestAggregator() {
  try {
    console.log('🔧 Настройка тестового агрегатора\n');

    // Создаем или обновляем тестового агрегатора
    const aggregator = await db.aggregator.upsert({
      where: { email: 'mock-aggregator@test.com' },
      update: {
        apiToken: 'test-aggregator-api-key-123',
        callbackToken: 'test-aggregator-callback-key-123',
        apiBaseUrl: 'http://localhost:4000',
        balanceUsdt: 100000,
        isActive: true,
        priority: 1, // Высокий приоритет для тестирования
        maxSlaMs: 5000,
        minBalance: 0
      },
      create: {
        email: 'mock-aggregator@test.com',
        password: 'hash',
        name: 'Mock Test Aggregator',
        apiToken: 'test-aggregator-api-key-123',
        callbackToken: 'test-aggregator-callback-key-123',
        apiBaseUrl: 'http://localhost:4000',
        balanceUsdt: 100000,
        isActive: true,
        priority: 1,
        maxSlaMs: 5000,
        minBalance: 0
      }
    });

    console.log('✅ Тестовый агрегатор настроен:');
    console.log(`   ID: ${aggregator.id}`);
    console.log(`   Название: ${aggregator.name}`);
    console.log(`   API URL: ${aggregator.apiBaseUrl}`);
    console.log(`   API Token: ${aggregator.apiToken}`);
    console.log(`   Callback Token: ${aggregator.callbackToken}`);
    console.log(`   Приоритет: ${aggregator.priority}`);
    console.log(`   Баланс: ${aggregator.balanceUsdt} USDT`);

    // Создаем сессию для агрегатора (если нужно для UI)
    const session = await db.aggregatorSession.create({
      data: {
        aggregatorId: aggregator.id,
        token: `test-aggregator-session-${Date.now()}`,
        ip: '127.0.0.1',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 часа
      }
    });

    console.log(`✅ Сессия создана: ${session.token}`);

    console.log('\n📋 Данные для тестирования:');
    console.log(`Агрегатор ID: ${aggregator.id}`);
    console.log(`API Token: ${aggregator.apiToken}`);
    console.log(`Base URL: ${aggregator.apiBaseUrl}`);
    console.log(`Session Token: ${session.token}`);

    console.log('\n🚀 Готово! Теперь можно:');
    console.log('1. Запустить моковый агрегатор: bun run mock-aggregator-server.ts');
    console.log('2. Создать транзакции через мерчантский API');
    console.log('3. Проверить, что clientIdentifier передается агрегатору');

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await db.$disconnect();
  }
}

setupTestAggregator();
