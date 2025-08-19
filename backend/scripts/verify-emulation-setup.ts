import { db } from "../src/db"

async function verifyEmulationSetup() {
  try {
    console.log("✅ Verifying complete emulation setup...\n")
    
    // 1. Проверяем устройство
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
        },
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
    })
    
    if (!trader || trader.devices.length === 0) {
      console.log("❌ No devices found")
      return
    }
    
    const device = trader.devices[0]
    console.log("📱 Device Status:")
    console.log(`   Name: ${device.name}`)
    console.log(`   ID: ${device.id}`)
    console.log(`   Token: ${device.token.substring(0, 20)}...`)
    console.log(`   Online: ${device.isOnline}`)
    console.log(`   Linked Bank Details: ${device.bankDetails.length}`)
    
    if (device.bankDetails.length > 0) {
      const bankDetail = device.bankDetails[0]
      console.log(`   Bank: ${bankDetail.bankType} - ${bankDetail.recipientName}`)
    }
    
    // 2. Проверяем конфигурацию эмулятора
    const emulatorConfig = await db.serviceConfig.findUnique({
      where: { serviceKey: "device_emulator" }
    })
    
    const config = emulatorConfig?.config as any
    console.log("\n🤖 Emulator Configuration:")
    console.log(`   Enabled: ${emulatorConfig?.isEnabled}`)
    console.log(`   Devices in config: ${config?.devices?.length || 0}`)
    
    if (config?.devices?.length > 0) {
      const emulatedDevice = config.devices[0]
      console.log(`   Device code: ${emulatedDevice.deviceCode.substring(0, 20)}...`)
      console.log(`   Bank type: ${emulatedDevice.bankType}`)
      console.log(`   Ping interval: ${emulatedDevice.pingSec} seconds`)
      console.log(`   Notification chance: ${emulatedDevice.notifyChance * 100}%`)
      console.log(`   Spam chance: ${emulatedDevice.spamChance * 100}%`)
      
      // Проверяем, совпадают ли токены
      if (emulatedDevice.deviceCode === device.token) {
        console.log("   ✅ Device token matches configuration")
      } else {
        console.log("   ❌ Device token mismatch!")
        console.log(`      Config: ${emulatedDevice.deviceCode.substring(0, 20)}...`)
        console.log(`      Device: ${device.token.substring(0, 20)}...`)
      }
    }
    
    // 3. Проверяем активные транзакции
    const activeTransactions = await db.transaction.findMany({
      where: {
        OR: [
          { bankDetailId: { in: device.bankDetails.map(bd => bd.id) } },
          { userId: trader.id }
        ],
        status: { in: ["CREATED", "IN_PROGRESS"] },
        createdAt: {
          gte: new Date(Date.now() - 4 * 60 * 60 * 1000) // Последние 4 часа
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
    
    console.log(`\n💰 Active Transactions (${activeTransactions.length}):`)
    if (activeTransactions.length > 0) {
      activeTransactions.forEach((tx, index) => {
        const age = Math.round((Date.now() - tx.createdAt.getTime()) / (1000 * 60)) // minutes
        console.log(`   ${index + 1}. ${tx.amount} RUB (${tx.status}) - ${age}m ago`)
      })
      console.log("   ✅ Good! Emulator will use these amounts for notifications")
    } else {
      console.log("   ⚠️  No active transactions - emulator will use random amounts")
    }
    
    // 4. Проверяем недавние уведомления
    const recentNotifications = await db.notification.findMany({
      where: {
        deviceId: device.id,
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000) // Последний час
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
    
    console.log(`\n📬 Recent Notifications (${recentNotifications.length}):`)
    if (recentNotifications.length > 0) {
      recentNotifications.forEach((notif, index) => {
        const age = Math.round((Date.now() - notif.createdAt.getTime()) / (1000 * 60)) // minutes
        const content = notif.message?.substring(0, 50) || notif.title
        console.log(`   ${index + 1}. ${content}... (${age}m ago)`)
      })
      console.log("   ✅ Notifications are being generated")
    } else {
      console.log("   📝 No recent notifications - emulator may need to start")
    }
    
    // 5. Проверяем статус сервисов
    console.log("\n🔧 Service Environment:")
    console.log(`   DES_ENABLED: ${process.env.DES_ENABLED || 'not set'}`)
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`)
    
    // 6. Итоговая оценка готовности
    console.log("\n📋 Readiness Assessment:")
    
    const checks = [
      { name: "Device exists", status: trader.devices.length > 0 },
      { name: "Device has bank details", status: device.bankDetails.length > 0 },
      { name: "Emulator enabled", status: emulatorConfig?.isEnabled },
      { name: "Emulator configured", status: config?.devices?.length > 0 },
      { name: "Token synchronization", status: config?.devices?.[0]?.deviceCode === device.token },
      { name: "Active transactions exist", status: activeTransactions.length > 0 }
    ]
    
    checks.forEach(check => {
      const icon = check.status ? "✅" : "❌"
      console.log(`   ${icon} ${check.name}`)
    })
    
    const allReady = checks.every(check => check.status)
    
    if (allReady) {
      console.log("\n🎉 System is READY for notification emulation!")
      console.log("\n📊 Expected behavior:")
      console.log("   - Notifications every 15-20 seconds")
      console.log("   - 95% notification generation rate")
      console.log("   - Real transaction amounts used when available")
      console.log("   - High probability of successful matching")
    } else {
      console.log("\n⚠️  System needs attention before full emulation")
      const failedChecks = checks.filter(check => !check.status)
      console.log("   Failed checks:", failedChecks.map(c => c.name).join(", "))
    }
    
    console.log("\n📖 Monitoring Commands:")
    console.log("   - Check notifications: SELECT * FROM \"Notification\" WHERE \"deviceId\" = '" + device.id + "' ORDER BY \"createdAt\" DESC LIMIT 10;")
    console.log("   - Check device status: SELECT * FROM \"Device\" WHERE id = '" + device.id + "';")
    console.log("   - Check active transactions: SELECT * FROM \"Transaction\" WHERE status IN ('CREATED', 'IN_PROGRESS');")
    
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

verifyEmulationSetup()