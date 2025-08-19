import { db } from "../src/db"

async function setupRealisticNotificationEmulation() {
  try {
    console.log("🎭 Setting up realistic notification emulation...\n")
    
    // 1. Найдем устройство трейдера
    const trader = await db.user.findFirst({
      where: { email: "trader@example.com" },
      include: {
        devices: {
          include: { 
            bankDetails: {
              select: {
                id: true,
                methodType: true,
                bankType: true,
                cardNumber: true,
                recipientName: true,
                phoneNumber: true,
                minAmount: true,
                maxAmount: true,
                totalAmountLimit: true,
                currentTotalAmount: true,
                operationLimit: true,
                sumLimit: true,
                intervalMinutes: true,
                isArchived: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                deviceId: true,
                userId: true,
              },
            }
          }
        }
      }
    })
    
    if (!trader || trader.devices.length === 0) {
      console.log("❌ No trader or devices found")
      return
    }
    
    const device = trader.devices[0]
    console.log("✅ Found device:", device.name)
    console.log("   Token:", device.token.substring(0, 20) + "...")
    console.log("   Bank details:", device.bankDetails.length)
    
    if (device.bankDetails.length === 0) {
      console.log("❌ Device has no bank details")
      return
    }
    
    const bankDetail = device.bankDetails[0]
    console.log("   Bank type:", bankDetail.bankType)
    
    // 2. Проверим активные сделки для получения реальных сумм
    const activeTransactions = await db.transaction.findMany({
      where: {
        status: { in: ["CREATED", "IN_PROGRESS"] }, // Используем правильные статусы
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Последние 24 часа
        }
      },
      take: 10,
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`\n💰 Found ${activeTransactions.length} active transactions:`)
    const realAmounts = activeTransactions.map(t => t.amount)
    
    if (activeTransactions.length > 0) {
      activeTransactions.forEach((tx, index) => {
        console.log(`   ${index + 1}. ${tx.amount} RUB (${tx.status}) - ${tx.createdAt.toISOString()}`)
      })
    } else {
      console.log("   No active transactions found, will use default amounts")
      // Добавим типичные суммы для тестирования
      realAmounts.push(...[1000, 2500, 5000, 10000, 15000, 25000, 50000])
    }
    
    // 3. Мапим bank type для совместимости с шаблонами
    const bankTypeMap: Record<string, string> = {
      "SBERBANK": "SBER",
      "TINKOFF": "TINK", 
      "VTB": "VTB",
      "ALFABANK": "ALFA",
      "GAZPROMBANK": "GAZPROM",
      "OZONBANK": "OZON"
    }
    
    const templateBankType = bankTypeMap[bankDetail.bankType] || "SBER"
    
    // 4. Создаем конфигурацию эмулятора
    const emulatorConfig = {
      global: {
        defaultPingSec: 30, // Каждые 30 секунд проверяем
        defaultNotifyChance: 0.8, // 80% шанс отправить уведомление
        defaultSpamChance: 0.1, // 10% шанс отправить спам
        defaultDelayChance: 0.1, // 10% шанс задержки
        reconnectOnAuthError: true,
        rngSeed: Date.now() // Используем текущее время для рандома
      },
      devices: [
        {
          deviceCode: device.token, // Используем токен реального устройства
          bankType: templateBankType, // Тип банка для шаблонов
          model: device.name || "Emulated Device",
          androidVersion: "13",
          initialBattery: 85,
          pingSec: 20, // Проверяем каждые 20 секунд
          notifyChance: 0.9, // 90% шанс отправить уведомление
          spamChance: 0.05, // 5% спам
          delayChance: 0.1, // 10% задержки
          // Добавляем кастомные суммы для сопоставления
          customAmounts: realAmounts.length > 0 ? realAmounts : [1000, 2500, 5000, 10000, 25000]
        }
      ]
    }
    
    console.log("\n🤖 Updating Device Emulator Service config...")
    console.log("   Device code:", device.token.substring(0, 16) + "...")
    console.log("   Bank type for templates:", templateBankType)
    console.log("   Notification frequency: every 20 seconds")
    console.log("   Notification chance: 90%")
    console.log("   Real amounts for matching:", realAmounts.slice(0, 5))
    
    // 5. Сохраняем конфигурацию
    await db.serviceConfig.upsert({
      where: { serviceKey: "device_emulator" },
      create: {
        serviceKey: "device_emulator",
        config: emulatorConfig,
        isEnabled: true,
      },
      update: {
        config: emulatorConfig,
        isEnabled: true,
      }
    })
    
    console.log("✅ Emulator config updated and enabled")
    
    // 6. Проверим, нужно ли создать тестовые сделки
    if (activeTransactions.length === 0) {
      console.log("\n💡 No active transactions found. Creating test transactions for matching...")
      
      // Создаем несколько тестовых сделок для сопоставления
      const testAmounts = [1000, 2500, 5000, 10000, 25000]
      
      for (const amount of testAmounts) {
        try {
          await db.transaction.create({
            data: {
              amount,
              currency: "RUB",
              status: "CREATED",
              type: "IN",
              bankDetailId: bankDetail.id,
              userId: trader.id,
              merchantTransactionId: `test-${amount}-${Date.now()}`,
              description: `Test transaction for ${amount} RUB`,
              metadata: {
                testTransaction: true,
                createdForEmulation: true
              }
            }
          })
          console.log(`   ✅ Created test transaction: ${amount} RUB`)
        } catch (error) {
          console.log(`   ⚠️  Could not create test transaction for ${amount}: ${error}`)
        }
      }
    }
    
    // 7. Показываем план работы
    console.log("\n📋 Emulation Plan:")
    console.log("   1. Device Emulator Service will connect to device using its real token")
    console.log("   2. Every 20 seconds, it will try to send notifications (90% chance)")
    console.log("   3. Notifications will use real transaction amounts when possible")
    console.log("   4. This should trigger the notification matching service")
    console.log("   5. Monitor logs to see matching results")
    
    console.log("\n🎯 Expected Behavior:")
    console.log("   - Frequent notifications (every ~22 seconds)")
    console.log("   - High chance of 'correct' amounts matching active deals") 
    console.log("   - Some spam notifications for realistic testing")
    console.log("   - Notifications sent to real device API endpoint")
    
    console.log("\n⚠️  Note: Make sure Device Emulator Service is running!")
    console.log("   Check admin panel or service logs to verify operation")
    
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

setupRealisticNotificationEmulation()