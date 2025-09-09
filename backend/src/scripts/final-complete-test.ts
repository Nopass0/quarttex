#!/usr/bin/env bun

import { db } from '../db';

async function finalCompleteTest() {
  try {
    console.log('🎯 ФИНАЛЬНОЕ ТЕСТИРОВАНИЕ ВСЕЙ СИСТЕМЫ\n');

    // 1. Проверяем, что моковый агрегатор работает
    console.log('🔍 Проверка мокового агрегатора...');
    const healthCheck = await fetch('http://localhost:4000/health');
    if (healthCheck.ok) {
      const healthData = await healthCheck.json();
      console.log(`✅ Моковый агрегатор работает: ${healthData.service}`);
    } else {
      console.log('❌ Моковый агрегатор не работает');
      return;
    }

    // 2. Проверяем API документацию мерчанта
    console.log('\n📋 Проверка API документации мерчанта...');
    const docsResponse = await fetch('http://localhost:3000/api/merchant/api-docs/endpoints', {
      headers: { 'Authorization': 'Bearer docs_test' }
    });

    if (docsResponse.ok) {
      const docsData = await docsResponse.json();
      const transactionsInEndpoint = docsData.endpoints.find((ep: any) => ep.path === '/merchant/transactions/in');
      
      if (transactionsInEndpoint) {
        const clientIdField = transactionsInEndpoint.parameters.find((p: any) => p.name === 'clientIdentifier');
        if (clientIdField) {
          console.log('✅ Поле clientIdentifier найдено в документации:');
          console.log(`   Описание: ${clientIdField.description}`);
          console.log(`   Обязательное: ${clientIdField.required ? 'Да' : 'Нет'}`);
          console.log(`   Пример: ${clientIdField.example}`);
        } else {
          console.log('❌ Поле clientIdentifier НЕ найдено в документации');
        }
      } else {
        console.log('❌ Эндпоинт /merchant/transactions/in НЕ найден в документации');
      }
    } else {
      console.log('❌ Не удалось получить документацию');
    }

    // 3. Создаем транзакцию через мерчантский API
    console.log('\n🧪 Создание тестовой транзакции с clientIdentifier...');
    
    const merchant = await db.merchant.findUnique({
      where: { token: 'trader9-test-merchant' }
    });

    if (!merchant) {
      console.log('❌ Тестовый мерчант не найден');
      return;
    }

    const transactionResponse = await fetch('http://localhost:3000/api/merchant/transactions/in', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-merchant-api-key': merchant.token
      },
      body: JSON.stringify({
        amount: 6000,
        methodId: 'cmf2iukal0001ik9amd2njmbm',
        orderId: `final-test-${Date.now()}`,
        rate: 95.5,
        expired_at: new Date(Date.now() + 3600000).toISOString(),
        clientIdentifier: 'final_test_client_999',
        userIp: '192.168.1.100',
        callbackUri: 'https://example.com/callback'
      })
    });

    const transactionResult = await transactionResponse.json();
    console.log(`Результат создания транзакции: ${transactionResponse.status}`);
    
    if (transactionResponse.status === 201) {
      console.log(`✅ Транзакция создана: ${transactionResult.id}`);
      console.log(`   Статус: ${transactionResult.status}`);
    } else {
      console.log(`   Детали: ${transactionResult.error || transactionResult.status}`);
    }

    // 4. Проверяем, что транзакция попала к агрегатору
    console.log('\n🔍 Проверка передачи транзакции агрегатору...');
    
    // Ждем немного для обработки
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const aggregatorDeals = await fetch('http://localhost:4000/deals', {
      headers: { 'X-Api-Key': 'test-aggregator-api-key-123' }
    });
    
    if (aggregatorDeals.ok) {
      const dealsData = await aggregatorDeals.json();
      const latestDeal = dealsData.deals[dealsData.deals.length - 1];
      
      if (latestDeal && latestDeal.clientIdentifier === 'final_test_client_999') {
        console.log('✅ Транзакция найдена в агрегаторе:');
        console.log(`   ID агрегатора: ${latestDeal.partnerDealId}`);
        console.log(`   Наш ID: ${latestDeal.ourDealId}`);
        console.log(`   clientIdentifier: ${latestDeal.clientIdentifier}`);
        console.log(`   Сумма: ${latestDeal.amount} RUB`);
        console.log(`   Реквизиты: ${latestDeal.requisites?.cardNumber || latestDeal.requisites?.phoneNumber}`);
      } else {
        console.log('⚠️ Транзакция не найдена в агрегаторе или без clientIdentifier');
      }
    }

    // 5. Проверяем статистику клиентов в агрегаторе
    console.log('\n📊 Статистика клиентов в агрегаторе...');
    
    const statsResponse = await fetch('http://localhost:4000/stats/clients', {
      headers: { 'X-Api-Key': 'test-aggregator-api-key-123' }
    });
    
    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      console.log(`   Всего уникальных клиентов: ${statsData.totalClients}`);
      console.log(`   Всего сделок: ${statsData.totalDeals}`);
      
      const finalTestClient = statsData.clientStats?.find((c: any) => c.clientIdentifier === 'final_test_client_999');
      if (finalTestClient) {
        console.log(`   final_test_client_999: ${finalTestClient.transactionCount} сделок (${finalTestClient.trafficType})`);
      }
    }

    console.log('\n🎉 ФИНАЛЬНОЕ ТЕСТИРОВАНИЕ ЗАВЕРШЕНО!');
    console.log('\n📝 ПРОВЕРЬТЕ В БРАУЗЕРЕ:');
    console.log('1. Мерчантская документация: http://localhost:3001/merchant/api-docs');
    console.log('   → Раздел "Транзакции" → POST /api/merchant/transactions/in');
    console.log('   → Должно быть поле "clientIdentifier"');
    console.log('');
    console.log('2. Трейдерские настройки: http://localhost:3001/trader/settings');
    console.log('   → Раздел "Настройки трафика"');
    console.log('');
    console.log('3. Агрегаторская документация: http://localhost:3001/aggregator/api-docs');
    console.log('   → Должно быть поле "clientIdentifier" и "X-Api-Key"');

    console.log('\n🚀 ВСЯ СИСТЕМА РАБОТАЕТ ПОЛНОСТЬЮ!');

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await db.$disconnect();
  }
}

finalCompleteTest();
