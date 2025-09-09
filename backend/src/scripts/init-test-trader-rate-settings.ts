import { db } from '@/db'

async function initTestTraderRateSettings() {
  console.log('=== Initializing test trader rate settings ===')

  // Найдем первого трейдера
  const trader = await db.user.findFirst({
    where: {
      // Ищем пользователя с email, содержащим "trader"
      email: {
        contains: 'trader'
      }
    }
  })

  if (!trader) {
    console.log('❌ No trader found')
    return
  }

  console.log(`✓ Found trader: ${trader.email} (ID: ${trader.id})`)

  // Найдем источник курса Rapira
  let rapiraSource = await db.rateSourceConfig.findFirst({
    where: { source: 'rapira' }
  })

  if (!rapiraSource) {
    // Создаем источник Rapira, если его нет
    rapiraSource = await db.rateSourceConfig.create({
      data: {
        source: 'rapira',
        displayName: 'Rapira API',
        kkkPercent: 1.0,
        kkkOperation: 'MINUS',
        isActive: true
      }
    })
    console.log('✓ Created Rapira rate source')
  } else {
    console.log('✓ Found Rapira rate source')
  }

  // Привязываем трейдера к источнику курса
  await db.user.update({
    where: { id: trader.id },
    data: {
      rateSourceConfigId: rapiraSource.id
    }
  })

  console.log('✓ Linked trader to Rapira source')

  // Создаем индивидуальные настройки для трейдера
  const existingSettings = await db.traderRateSourceSettings.findUnique({
    where: {
      traderId_rateSourceId: {
        traderId: trader.id,
        rateSourceId: rapiraSource.id
      }
    }
  })

  if (!existingSettings) {
    await db.traderRateSourceSettings.create({
      data: {
        traderId: trader.id,
        rateSourceId: rapiraSource.id,
        customKkkPercent: 2.5, // Индивидуальный процент 2.5%
        customKkkOperation: 'MINUS'
      }
    })
    console.log('✓ Created individual KKK settings for trader (2.5% MINUS)')
  } else {
    console.log('✓ Individual settings already exist')
  }

  console.log('=== Test data initialization complete ===')
}

initTestTraderRateSettings().catch(console.error)
