#!/usr/bin/env bun

import { Elysia } from 'elysia'
import { db } from './src/db'

// Создаем тестовый сервер для получения колбэков
const callbackServer = new Elysia()
  .post('/test-callback', ({ body }) => {
    console.log('📥 Получен колбэк:')
    console.log('   Тело запроса:', JSON.stringify(body, null, 2))
    return { 
      success: true, 
      message: 'Callback received successfully',
      receivedData: body
    }
  })
  .listen(4000)

console.log('🚀 Тестовый сервер для колбэков запущен на http://localhost:4000')
console.log('   Эндпоинт: POST /test-callback\n')

async function testCallback() {
  await new Promise(resolve => setTimeout(resolve, 1000)) // Даем серверу время запуститься
  
  console.log('🧪 Тестирование отправки колбэка с полем amount...\n')
  
  try {
    // Находим существующего мерчанта и метод
    const merchant = await db.merchant.findFirst({
      orderBy: { createdAt: 'desc' }
    })
    
    const method = await db.method.findFirst({
      where: { isEnabled: true }
    })
    
    if (!merchant || !method) {
      console.log('❌ Не найден мерчант или метод для тестирования')
      return
    }

    // Создаем тестовую транзакцию с локальным callback URL
    const testTransaction = await db.transaction.create({
      data: {
        merchantId: merchant.id,
        amount: 12345.67,
        assetOrBank: 'TEST',
        orderId: 'TEST-ORDER-' + Date.now(),
        currency: 'RUB',
        userId: 'test-user',
        callbackUri: 'http://localhost:4000/test-callback',
        successUri: 'http://localhost:4000/test-callback',
        failUri: 'http://localhost:4000/test-callback',
        expired_at: new Date(Date.now() + 3600000),
        commission: 0,
        clientName: 'Test Client',
        status: 'READY',
        methodId: method.id
      }
    })

    console.log('📋 Создана тестовая транзакция:')
    console.log(`   ID: ${testTransaction.id}`)
    console.log(`   Сумма: ${testTransaction.amount} RUB`)
    console.log(`   Статус: ${testTransaction.status}`)
    console.log(`   Callback URL: ${testTransaction.callbackUri}\n`)

    // Отправляем колбэк через прокси (как из админки)
    console.log('📤 Отправляем колбэк через прокси (как из админки)...')
    
    const proxyResponse = await fetch('http://localhost:3000/api/callback-proxy/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: testTransaction.callbackUri,
        data: {
          id: testTransaction.id,
          amount: testTransaction.amount,  // Теперь включаем amount!
          status: testTransaction.status
        },
        headers: {},
        transactionId: testTransaction.id
      })
    })

    const proxyResult = await proxyResponse.json()
    
    console.log('\n📊 Результат отправки:')
    if (proxyResponse.ok && proxyResult.success) {
      console.log('   ✅ Колбэк успешно отправлен!')
      console.log('   Ответ от целевого сервера:', JSON.stringify(proxyResult.data, null, 2))
      
      // Проверяем, что amount был передан
      if (proxyResult.data?.receivedData?.amount === testTransaction.amount) {
        console.log('   ✅ Поле amount успешно передано и получено!')
      } else {
        console.log('   ❌ Поле amount не найдено или не совпадает!')
      }
    } else {
      console.log('   ❌ Ошибка при отправке колбэка')
      console.log('   Статус:', proxyResponse.status)
      console.log('   Ошибка:', JSON.stringify(proxyResult, null, 2))
    }

    // Проверяем историю колбэков
    const history = await db.callbackHistory.findFirst({
      where: {
        transactionId: testTransaction.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (history) {
      console.log('\n📜 История колбэка сохранена:')
      console.log(`   ID истории: ${history.id}`)
      console.log(`   Status Code: ${history.statusCode}`)
      console.log(`   Payload содержит amount: ${history.payload?.amount ? '✅ Да' : '❌ Нет'}`)
    }

    // Удаляем тестовую транзакцию
    await db.transaction.delete({
      where: { id: testTransaction.id }
    })
    console.log('\n🧹 Тестовая транзакция удалена')

  } catch (error) {
    console.error('❌ Ошибка:', error)
  } finally {
    await db.$disconnect()
    callbackServer.stop()
    console.log('\n🛑 Тестовый сервер остановлен')
    process.exit(0)
  }
}

// Запускаем тест
setTimeout(testCallback, 100)