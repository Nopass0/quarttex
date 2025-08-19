import { db } from "../src/db"
import { httpClient } from "../src/utils/httpClient"

async function directDbSetup() {
  try {
    console.log("🗃️  Setting up test environment via direct DB access...\n")
    
    // 1. Find trader
    const trader = await db.user.findFirst({
      where: { email: "trader@example.com" }
    })
    
    if (!trader) {
      console.log("❌ Trader not found")
      return
    }
    
    console.log(`✅ Found trader: ${trader.email}`)
    
    // 2. Create device directly
    console.log("\n📱 Creating device...")
    const device = await db.device.create({
      data: {
        name: "Direct DB Test Device",
        token: `device-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        userId: trader.id,
        energy: 85,
        ethernetSpeed: 100,
        isOnline: false
      }
    })
    console.log(`✅ Device created: ${device.name}`)
    console.log(`   ID: ${device.id}`)
    console.log(`   Token: ${device.token.substring(0, 20)}...`)
    
    // 3. Create bank detail directly
    console.log("\n🏦 Creating bank detail...")
    const bankDetail = await db.bankDetail.create({
      data: {
        cardNumber: "4444555566667777",
        bankType: "SBERBANK",
        methodType: "c2c",
        recipientName: "Direct Test User",
        phoneNumber: "+79001234567",
        minAmount: 100,
        maxAmount: 50000,
        dailyLimit: 500000,
        monthlyLimit: 5000000,
        intervalMinutes: 0,
        userId: trader.id,
        deviceId: device.id // Link directly
      }
    })
    console.log(`✅ Bank detail created: ${bankDetail.recipientName}`)
    console.log(`   ID: ${bankDetail.id}`)
    console.log(`   Linked to device: ${!!bankDetail.deviceId}`)
    
    // 4. Find or create merchant and method for transactions
    console.log("\n🏪 Setting up merchant and method...")
    let merchant = await db.merchant.findFirst()
    if (!merchant) {
      merchant = await db.merchant.create({
        data: {
          name: "Test Merchant",
          token: `test-merchant-${Date.now()}`,
          balanceUsdt: 1000000
        }
      })
      console.log("✅ Created test merchant")
    }
    
    let method = await db.method.findFirst()
    if (!method) {
      method = await db.method.create({
        data: {
          code: "test-method",
          name: "Test Method",
          type: "c2c",
          commissionPayin: 0.02,
          commissionPayout: 0.02,
          maxPayin: 100000,
          minPayin: 100,
          maxPayout: 100000,
          minPayout: 100,
          chancePayin: 0.95,
          chancePayout: 0.95
        }
      })
      console.log("✅ Created test method")
    }
    
    // 5. Create test transactions
    console.log("\n💰 Creating test transactions...")
    const testAmounts = [1000, 2500, 5000, 7500, 10000]
    const transactions = []
    
    for (const amount of testAmounts) {
      const transaction = await db.transaction.create({
        data: {
          amount,
          assetOrBank: "SBERBANK",
          orderId: `order-${amount}-${Date.now()}`,
          currency: "RUB",
          userId: trader.id,
          callbackUri: "http://localhost:3000/callback",
          successUri: "http://localhost:3000/success",
          failUri: "http://localhost:3000/fail",
          status: "CREATED",
          type: "IN",
          expired_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          commission: amount * 0.02,
          clientName: "Test Client",
          bankDetailId: bankDetail.id,
          merchantId: merchant.id,
          methodId: method.id
        }
      })
      transactions.push(transaction)
      console.log(`   ✅ ${amount} RUB (${transaction.id})`)
    }
    
    console.log(`✅ Created ${transactions.length} test transactions`)
    
    // 6. Configure Device Emulator Service
    console.log("\n🤖 Configuring Device Emulator Service...")
    await db.serviceConfig.upsert({
      where: { serviceKey: "device_emulator" },
      create: {
        serviceKey: "device_emulator",
        config: {
          global: {
            defaultPingSec: 25,
            defaultNotifyChance: 0.85,
            defaultSpamChance: 0.1,
            defaultDelayChance: 0.1,
            reconnectOnAuthError: true,
            rngSeed: Date.now()
          },
          devices: [{
            deviceCode: device.token,
            bankType: "SBER",
            model: device.name,
            androidVersion: "13",
            initialBattery: 85,
            pingSec: 25,
            notifyChance: 0.9, // 90% notification rate
            spamChance: 0.05,
            delayChance: 0.1,
            testAmounts: testAmounts
          }]
        },
        isEnabled: true,
      },
      update: {
        config: {
          global: {
            defaultPingSec: 25,
            defaultNotifyChance: 0.85,
            defaultSpamChance: 0.1,
            defaultDelayChance: 0.1,
            reconnectOnAuthError: true,
            rngSeed: Date.now()
          },
          devices: [{
            deviceCode: device.token,
            bankType: "SBER",
            model: device.name,
            androidVersion: "13",
            initialBattery: 85,
            pingSec: 25,
            notifyChance: 0.9,
            spamChance: 0.05,
            delayChance: 0.1,
            testAmounts: testAmounts
          }]
        },
        isEnabled: true,
      }
    })
    console.log("✅ Device Emulator Service configured")
    console.log(`   Device: ${device.token.substring(0, 20)}...`)
    console.log("   Frequency: every 25 seconds")
    console.log("   Notification rate: 90%")
    
    // 7. Test device connection
    console.log("\n🔌 Testing device connection...")
    try {
      const connectResponse = await httpClient.post("http://localhost:3000/api/device/connect", {
        deviceCode: device.token,
        batteryLevel: 85,
        networkInfo: "Wi-Fi",
        deviceModel: device.name,
        androidVersion: "13",
        appVersion: "2.0.0",
      })
      
      console.log("✅ Device connection successful")
      console.log(`   Auth token: ${connectResponse.token.substring(0, 20)}...`)
      
      // 8. Send test notifications with real amounts
      console.log("\n📬 Sending test notifications...")
      for (const amount of [1000, 5000]) {
        try {
          await httpClient.post(
            "http://localhost:3000/api/device/notification",
            {
              packageName: "ru.sberbank.android",
              appName: "СберБанк Онлайн",
              title: "Пополнение",
              content: `Пополнение на ${amount.toLocaleString('ru-RU')} ₽ от Direct T. Баланс: ${(amount * 5).toLocaleString('ru-RU')} ₽`,
              timestamp: Date.now(),
              priority: 1,
              category: "msg",
            },
            {
              headers: { Authorization: `Bearer ${connectResponse.token}` },
            }
          )
          console.log(`   ✅ Notification sent: ${amount} RUB`)
          
          // Small delay between notifications
          await new Promise(resolve => setTimeout(resolve, 1000))
        } catch (error: any) {
          console.log(`   ❌ Failed to send notification ${amount}: ${error.message}`)
        }
      }
      
    } catch (error: any) {
      console.log(`❌ Device connection failed: ${error.message}`)
    }
    
    // 9. Verify setup
    console.log("\n📊 Verifying setup...")
    const deviceFromDb = await db.device.findUnique({
      where: { id: device.id },
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
    })
    
    const activeTransactions = await db.transaction.count({
      where: {
        bankDetailId: bankDetail.id,
        status: "CREATED"
      }
    })
    
    const emulatorConfig = await db.serviceConfig.findUnique({
      where: { serviceKey: "device_emulator" }
    })
    
    console.log(`   Device online: ${deviceFromDb?.isOnline}`)
    console.log(`   Bank details linked: ${deviceFromDb?.bankDetails.length}`)
    console.log(`   Active transactions: ${activeTransactions}`)
    console.log(`   Emulator enabled: ${emulatorConfig?.isEnabled}`)
    
    console.log("\n🎉 Direct DB setup complete!")
    console.log("\n📋 Summary:")
    console.log(`   ✅ Device: ${device.name} (${device.id})`)
    console.log(`   ✅ Bank Detail: ${bankDetail.recipientName} (${bankDetail.id})`)
    console.log(`   ✅ Transactions: ${transactions.length} test amounts`)
    console.log(`   ✅ Emulator: 90% notification rate every 25 seconds`)
    console.log(`   ✅ Connection: Device can receive notifications`)
    
    console.log("\n🎯 Expected behavior:")
    console.log("   - Notifications every ~25 seconds with real transaction amounts")
    console.log("   - High probability of notification-transaction matching")
    console.log("   - Notification matching service should detect matches")
    console.log("   - Matched transactions should change status")
    
    console.log("\n📖 Monitoring:")
    console.log(`   Device ID: ${device.id}`)
    console.log(`   Device Token: ${device.token.substring(0, 20)}...`)
    console.log(`   Bank Detail ID: ${bankDetail.id}`)
    console.log("   Watch for DES logs and notification creation")
    
  } catch (error: any) {
    console.error("❌ Setup error:", error.message || error)
  } finally {
    await db.$disconnect()
  }
}

directDbSetup()