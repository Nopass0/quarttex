#!/usr/bin/env bun

import { db } from './src/db'

async function testRealCallback() {
  console.log('🧪 Тестирование отправки колбэка на реальный сервер...\n')
  
  const realCallbackUrl = 'https://api.pspware.space/payphoria/api/v1/orders/integrators/chase/update-order'
  
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

    // Создаем тестовую транзакцию с реальным callback URL
    const testTransaction = await db.transaction.create({
      data: {
        merchantId: merchant.id,
        amount: 1000,
        assetOrBank: 'TEST',
        orderId: 'CHASE-TEST-' + Date.now(),
        currency: 'RUB',
        userId: 'test-user',
        callbackUri: realCallbackUrl,
        successUri: realCallbackUrl,
        failUri: realCallbackUrl,
        expired_at: new Date(Date.now() + 3600000),
        commission: 0,
        clientName: 'Test Client',
        status: 'READY',
        methodId: method.id
      }
    })

    console.log('📋 Создана тестовая транзакция:')
    console.log(`   ID: ${testTransaction.id}`)
    console.log(`   Order ID: ${testTransaction.orderId}`)
    console.log(`   Сумма: ${testTransaction.amount} RUB`)
    console.log(`   Статус: ${testTransaction.status}`)
    console.log(`   Callback URL: ${testTransaction.callbackUri}\n`)

    // Отправляем колбэк через прокси
    console.log('📤 Отправляем колбэк на реальный сервер...')
    
    const proxyResponse = await fetch('http://localhost:3000/api/callback-proxy/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: testTransaction.callbackUri,
        data: {
          id: testTransaction.id,
          amount: testTransaction.amount,
          status: testTransaction.status
        },
        headers: {
          'User-Agent': 'Chase/1.0'
        },
        transactionId: testTransaction.id
      })
    })

    const proxyResult = await proxyResponse.json()
    
    console.log('\n📊 Результат отправки:')
    if (proxyResponse.ok) {
      console.log('   Статус HTTP:', proxyResult.status)
      console.log('   Success:', proxyResult.success)
      if (proxyResult.data) {
        console.log('   Ответ сервера:', JSON.stringify(proxyResult.data, null, 2))
      }
      if (proxyResult.headers) {
        console.log('   Заголовки ответа:')
        Object.entries(proxyResult.headers).forEach(([key, value]) => {
          if (key.toLowerCase().includes('content') || key.toLowerCase().includes('server')) {
            console.log(`     ${key}: ${value}`)
          }
        })
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
      console.log('\n📜 История колбэка:')
      console.log(`   ID истории: ${history.id}`)
      console.log(`   URL: ${history.url}`)
      console.log(`   Status Code: ${history.statusCode || 'N/A'}`)
      console.log(`   Payload:`)
      console.log(`     - id: ${history.payload?.id}`)
      console.log(`     - amount: ${history.payload?.amount} (${history.payload?.amount ? '✅' : '❌'})`)
      console.log(`     - status: ${history.payload?.status}`)
      
      if (history.response) {
        console.log(`   Response: ${history.response.substring(0, 200)}${history.response.length > 200 ? '...' : ''}`)
      }
      if (history.error) {
        console.log(`   Error: ${history.error}`)
      }
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
  }
}

testRealCallback()