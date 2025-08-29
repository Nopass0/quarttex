#!/usr/bin/env bun

import { db } from './src/db'

async function testCallbackSend() {
  console.log('🧪 Тестирование отправки колбэка...\n')
  
  try {
    // Находим первую транзакцию с callback URL
    const transaction = await db.transaction.findFirst({
      where: {
        callbackUri: {
          not: null,
          not: 'none',
          not: ''
        }
      },
      include: {
        merchant: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (!transaction) {
      console.log('❌ Не найдено транзакций с callback URL')
      return
    }

    console.log('📋 Найдена транзакция:')
    console.log(`   ID: ${transaction.id}`)
    console.log(`   Сумма: ${transaction.amount} RUB`)
    console.log(`   Статус: ${transaction.status}`)
    console.log(`   Callback URL: ${transaction.callbackUri}`)
    console.log(`   Merchant: ${transaction.merchant?.name || 'N/A'}\n`)

    // Тестируем отправку через прокси
    console.log('📤 Отправляем колбэк через прокси...')
    
    const proxyResponse = await fetch('http://localhost:3000/api/callback-proxy/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: transaction.callbackUri,
        data: {
          id: transaction.id,
          amount: transaction.amount,
          status: transaction.status
        },
        headers: {
          'X-Merchant-Token': transaction.merchant?.token || undefined
        },
        transactionId: transaction.id
      })
    })

    const proxyResult = await proxyResponse.json()
    
    if (proxyResponse.ok) {
      console.log('✅ Колбэк успешно отправлен через прокси')
      console.log('   Ответ:', JSON.stringify(proxyResult, null, 2))
    } else {
      console.log('❌ Ошибка при отправке колбэка через прокси')
      console.log('   Статус:', proxyResponse.status)
      console.log('   Ошибка:', JSON.stringify(proxyResult, null, 2))
    }

    // Проверяем историю колбэков
    const history = await db.callbackHistory.findFirst({
      where: {
        transactionId: transaction.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (history) {
      console.log('\n📜 История колбэка:')
      console.log(`   ID: ${history.id}`)
      console.log(`   URL: ${history.url}`)
      console.log(`   Payload: ${JSON.stringify(history.payload, null, 2)}`)
      console.log(`   Status Code: ${history.statusCode || 'N/A'}`)
      console.log(`   Response: ${history.response || 'N/A'}`)
      console.log(`   Error: ${history.error || 'None'}`)
    }

  } catch (error) {
    console.error('❌ Ошибка:', error)
  } finally {
    await db.$disconnect()
  }
}

testCallbackSend()