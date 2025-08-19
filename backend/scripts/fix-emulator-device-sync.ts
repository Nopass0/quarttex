import { db } from "../src/db"

async function fixEmulatorDeviceSync() {
  try {
    console.log("🔧 Fixing Device Emulator Service and device synchronization...\n")
    
    // 1. Проверяем конфигурацию эмулятора
    const emulatorConfig = await db.serviceConfig.findUnique({
      where: { serviceKey: "device_emulator" }
    })
    
    const config = emulatorConfig?.config as any
    const configuredDeviceCode = config?.devices?.[0]?.deviceCode
    
    console.log("🤖 Current emulator config:")
    console.log(`   Enabled: ${emulatorConfig?.isEnabled}`)
    console.log(`   Configured device code: ${configuredDeviceCode?.substring(0, 20)}...`)
    
    // 2. Проверяем реальные устройства трейдера
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
    
    if (!trader) {
      console.log("❌ Trader not found")
      return
    }
    
    console.log(`\n👤 Trader ${trader.email}:`)
    console.log(`   Devices: ${trader.devices.length}`)
    
    if (trader.devices.length === 0) {
      console.log("❌ No devices found for trader")
      return
    }
    
    const realDevice = trader.devices[0]
    console.log(`   Real device: ${realDevice.name}`)
    console.log(`   Real token: ${realDevice.token.substring(0, 20)}...`)
    console.log(`   Bank details: ${realDevice.bankDetails.length}`)
    
    // 3. Проверяем, совпадают ли токены
    const tokensMatch = configuredDeviceCode === realDevice.token
    console.log(`   Tokens match: ${tokensMatch}`)
    
    if (!tokensMatch) {
      console.log("\n🔄 Synchronizing emulator config with real device...")
      
      // 4. Получаем активные транзакции для конфигурации
      const activeTransactions = await db.transaction.findMany({
        where: {
          OR: [
            { bankDetailId: { in: realDevice.bankDetails.map(bd => bd.id) } },
            { userId: trader.id }
          ],
          status: { in: ["CREATED", "IN_PROGRESS"] },
          createdAt: {
            gte: new Date(Date.now() - 2 * 60 * 60 * 1000)
          }
        },
        take: 5
      })
      
      console.log(`   Found ${activeTransactions.length} active transactions for amounts`)
      
      // 5. Определяем тип банка
      const bankTypeMap: Record<string, string> = {
        "SBERBANK": "SBER",
        "TINKOFF": "TINK", 
        "VTB": "VTB",
        "ALFABANK": "ALFA",
        "GAZPROMBANK": "GAZPROM",
        "OZONBANK": "OZON"
      }
      
      const bankDetail = realDevice.bankDetails[0]
      const templateBankType = bankTypeMap[bankDetail?.bankType] || "SBER"
      
      // 6. Создаем новую конфигурацию с правильным токеном
      const newConfig = {
        global: {
          defaultPingSec: 25, // Немного быстрее для тестирования
          defaultNotifyChance: 0.85, // Высокий шанс уведомлений
          defaultSpamChance: 0.08, // Немного спама
          defaultDelayChance: 0.1,
          reconnectOnAuthError: true,
          rngSeed: Date.now()
        },
        devices: [
          {
            deviceCode: realDevice.token, // Используем правильный токен
            bankType: templateBankType,
            model: realDevice.name,
            androidVersion: "13",
            initialBattery: 85,
            pingSec: 25, // Быстрые уведомления для тестирования
            notifyChance: 0.95, // 95% шанс уведомления
            spamChance: 0.05, // 5% спам
            delayChance: 0.1,
            // Добавляем реальные суммы для высоких шансов сопоставления
            realAmounts: activeTransactions.map(tx => tx.amount)
          }
        ]
      }
      
      console.log("\n📝 New emulator configuration:")
      console.log(`   Device code: ${realDevice.token.substring(0, 20)}...`)
      console.log(`   Bank type: ${templateBankType}`)
      console.log(`   Ping interval: 25 seconds`) 
      console.log(`   Notification chance: 95%`)
      console.log(`   Real amounts: ${activeTransactions.map(tx => tx.amount).slice(0, 3)}`)
      
      // 7. Сохраняем новую конфигурацию
      await db.serviceConfig.update({
        where: { serviceKey: "device_emulator" },
        data: {
          config: newConfig,
          isEnabled: true
        }
      })
      
      console.log("✅ Emulator configuration updated with correct device token")
    }
    
    // 8. Проверяем финальное состояние
    const updatedConfig = await db.serviceConfig.findUnique({
      where: { serviceKey: "device_emulator" }
    })
    
    const finalConfig = updatedConfig?.config as any
    const finalDeviceCode = finalConfig?.devices?.[0]?.deviceCode
    
    console.log("\n📊 Final state:")
    console.log(`   Emulator enabled: ${updatedConfig?.isEnabled}`)
    console.log(`   Configured device: ${finalDeviceCode?.substring(0, 20)}...`)
    console.log(`   Real device: ${realDevice.token.substring(0, 20)}...`)
    console.log(`   Tokens synchronized: ${finalDeviceCode === realDevice.token}`)
    
    if (finalDeviceCode === realDevice.token) {
      console.log("\n🎉 Success! Device Emulator Service is now synchronized with real device")
      console.log("\n📋 Next steps:")
      console.log("   1. Start/restart Device Emulator Service if needed")
      console.log("   2. Monitor notification frequency (should be ~every 25 seconds)")
      console.log("   3. Check that notifications use real transaction amounts")
      console.log("   4. Verify notification matching service catches the matches")
    }
    
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

fixEmulatorDeviceSync()