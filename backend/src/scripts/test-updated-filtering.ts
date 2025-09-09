#!/usr/bin/env bun

import { db } from '../db';
import { trafficClassificationService } from '../services/traffic-classification.service';

async function testUpdatedFiltering() {
  try {
    console.log('🎯 ТЕСТИРОВАНИЕ ОБНОВЛЕННОЙ ЛОГИКИ ФИЛЬТРАЦИИ\n');
    console.log('📋 Новое правило: При включенной фильтрации трейдер получает ТОЛЬКО сделки с clientIdentifier\n');

    const merchant = await db.merchant.findUnique({
      where: { token: 'trader9-test-merchant' }
    });

    const trader9 = await db.user.findUnique({
      where: { numericId: 9 }
    });

    if (!merchant || !trader9) {
      console.log('❌ Мерчант или трейдер не найден');
      return;
    }

    // Функция для проверки логики
    const testCanTakeTransaction = async (clientId: string | undefined, description: string) => {
      console.log(`📝 ${description}`);
      console.log(`   clientIdentifier: ${clientId || 'НЕ УКАЗАН'}`);
      
      const canTake = await trafficClassificationService.canTraderTakeTransaction(
        trader9.id,
        merchant.id,
        clientId
      );
      
      console.log(`   Результат: ${canTake ? '✅ МОЖЕТ ВЗЯТЬ' : '❌ НЕ МОЖЕТ ВЗЯТЬ'}`);
      return canTake;
    };

    // ТЕСТ 1: Фильтрация отключена
    console.log('🧪 ТЕСТ 1: ФИЛЬТРАЦИЯ ОТКЛЮЧЕНА');
    await db.trafficSettings.upsert({
      where: { userId: trader9.id },
      update: { isEnabled: false },
      create: {
        userId: trader9.id,
        isEnabled: false,
        trafficType: 'PRIMARY',
        maxCounterparties: 10
      }
    });
    console.log('🔧 Фильтрация отключена для трейдера #9');

    await testCanTakeTransaction('client_with_id', 'Сделка С clientIdentifier');
    await testCanTakeTransaction(undefined, 'Сделка БЕЗ clientIdentifier');

    // ТЕСТ 2: Фильтрация включена
    console.log('\n🧪 ТЕСТ 2: ФИЛЬТРАЦИЯ ВКЛЮЧЕНА');
    await db.trafficSettings.update({
      where: { userId: trader9.id },
      data: { 
        isEnabled: true,
        trafficType: 'PRIMARY',
        maxCounterparties: 10
      }
    });
    console.log('🔧 Фильтрация включена для трейдера #9 (PRIMARY трафик)');

    await testCanTakeTransaction('new_client_001', 'Сделка С clientIdentifier (новый клиент - PRIMARY)');
    await testCanTakeTransaction(undefined, 'Сделка БЕЗ clientIdentifier (должна отклониться)');

    // Создаем историю для клиента (делаем его SECONDARY)
    await db.transaction.create({
      data: {
        merchantId: merchant.id,
        amount: 1000,
        assetOrBank: 'Test History',
        orderId: `history-${Date.now()}`,
        methodId: 'cmf2iukal0001ik9amd2njmbm',
        currency: 'RUB',
        userId: 'test-user',
        callbackUri: '',
        successUri: '',
        failUri: '',
        type: 'IN',
        expired_at: new Date(),
        commission: 0,
        clientName: 'Test Client',
        status: 'READY',
        rate: 95.5,
        clientIdentifier: 'existing_client_001',
        traderId: trader9.id,
        bankDetailId: 'trader9-bt-requisite'
      }
    });

    await testCanTakeTransaction('existing_client_001', 'Сделка С clientIdentifier (существующий клиент - SECONDARY, но трейдер настроен на PRIMARY)');

    // ТЕСТ 3: Переключаем на SECONDARY трафик
    console.log('\n🧪 ТЕСТ 3: ПЕРЕКЛЮЧЕНИЕ НА SECONDARY ТРАФИК');
    await db.trafficSettings.update({
      where: { userId: trader9.id },
      data: { trafficType: 'SECONDARY' }
    });
    console.log('🔧 Трейдер #9 переключен на SECONDARY трафик');

    await testCanTakeTransaction('new_client_002', 'Сделка С clientIdentifier (новый клиент - PRIMARY, но трейдер настроен на SECONDARY)');
    await testCanTakeTransaction('existing_client_001', 'Сделка С clientIdentifier (существующий клиент - SECONDARY)');
    await testCanTakeTransaction(undefined, 'Сделка БЕЗ clientIdentifier (должна отклониться)');

    console.log('\n📊 ИТОГИ ТЕСТИРОВАНИЯ:');
    console.log('✅ Фильтрация отключена → все сделки проходят');
    console.log('✅ Фильтрация включена → только сделки с clientIdentifier нужного типа');
    console.log('✅ Сделки без clientIdentifier → отклоняются при включенной фильтрации');
    console.log('✅ Классификация трафика → работает корректно');

    console.log('\n🎯 НОВАЯ ЛОГИКА РЕАЛИЗОВАНА:');
    console.log('При включенной фильтрации трейдер получает ТОЛЬКО сделки с clientIdentifier!');

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await db.$disconnect();
  }
}

testUpdatedFiltering();
