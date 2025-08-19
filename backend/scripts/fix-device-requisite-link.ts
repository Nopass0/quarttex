import { httpClient } from "../src/utils/httpClient"
import { db } from "../src/db"

async function fixDeviceRequisiteLink() {
  try {
    console.log("🔧 Fixing device-requisite link...\n")
    
    const trader = await db.user.findFirst({
      where: { email: "trader@example.com" },
      include: {
        devices: true,
        bankDetails: true,
        sessions: {
          where: { expiredAt: { gt: new Date() } },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })
    
    if (!trader) {
      console.log("❌ Trader not found")
      return
    }
    
    console.log("✅ Found trader:", trader.email)
    console.log(`   Devices: ${trader.devices.length}`)
    console.log(`   Bank Details: ${trader.bankDetails.length}`)
    
    if (trader.devices.length === 0 || trader.bankDetails.length === 0) {
      console.log("❌ No devices or bank details to link")
      return
    }
    
    const device = trader.devices[0]
    const bankDetail = trader.bankDetails[0]
    
    console.log(`\n🔗 Linking:`)
    console.log(`   Device: ${device.name} (${device.id})`)
    console.log(`   Bank Detail: ${bankDetail.recipientName} (${bankDetail.id})`)
    
    // Способ 1: Прямое обновление в БД
    console.log("\n📝 Method 1: Direct database update...")
    
    await db.bankDetail.update({
      where: { id: bankDetail.id },
      data: { deviceId: device.id }
    })
    
    console.log("✅ Updated bank detail with device link")
    
    // Проверяем результат
    const updatedBankDetail = await db.bankDetail.findUnique({
      where: { id: bankDetail.id },
      include: { device: true }
    })
    
    if (updatedBankDetail?.device) {
      console.log("✅ Link established successfully")
      console.log(`   Bank Detail → Device: ${updatedBankDetail.device.name}`)
    }
    
    // Способ 2: Через API (как это делает фронтенд)
    if (trader.sessions.length > 0) {
      console.log("\n📡 Method 2: Via API (like frontend does)...")
      
      try {
        const linkResponse = await httpClient.post(
          "http://localhost:3000/api/trader/devices/link",
          {
            deviceId: device.id,
            bankDetailId: bankDetail.id
          },
          {
            headers: { "x-trader-token": trader.sessions[0].token }
          }
        )
        
        console.log("✅ API link successful:", linkResponse)
        
      } catch (error: any) {
        console.log("⚠️  API link failed:", error.message)
        console.log("   (But direct DB update already worked)")
      }
    }
    
    // Проверяем финальное состояние
    console.log("\n🔍 Checking final state...")
    
    const finalDevice = await db.device.findUnique({
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
    
    const finalBankDetail = await db.bankDetail.findUnique({
      where: { id: bankDetail.id },
      include: { device: true }
    })
    
    console.log(`\n📊 Final State:`)
    console.log(`   Device "${finalDevice?.name}":`)
    console.log(`      Bank Details: ${finalDevice?.bankDetails.length}`)
    if (finalDevice?.bankDetails.length) {
      finalDevice.bankDetails.forEach(bd => {
        console.log(`         - ${bd.recipientName} (${bd.bankType})`)
      })
    }
    
    console.log(`   Bank Detail "${finalBankDetail?.recipientName}":`)
    console.log(`      Linked Device: ${finalBankDetail?.device?.name || 'None'}`)
    
    // Тестируем API после связывания
    if (trader.sessions.length > 0) {
      console.log("\n🧪 Testing API after linking...")
      
      try {
        const devicesResponse = await httpClient.get(
          "http://localhost:3000/api/trader/devices",
          { headers: { "x-trader-token": trader.sessions[0].token } }
        )
        
        console.log(`✅ API returns ${devicesResponse.length} devices`)
        
        if (devicesResponse.length > 0) {
          const firstDevice = devicesResponse[0]
          console.log(`   Device: ${firstDevice.name}`)
          console.log(`   Linked Bank Details: ${firstDevice.linkedBankDetails}`)
        }
        
        // Тестируем детали устройства
        const deviceDetailsResponse = await httpClient.get(
          `http://localhost:3000/api/trader/devices/${device.id}`,
          { headers: { "x-trader-token": trader.sessions[0].token } }
        )
        
        console.log(`✅ Device details API works`)
        console.log(`   Linked Bank Details: ${deviceDetailsResponse.linkedBankDetails?.length || 0}`)
        
      } catch (error: any) {
        console.log("❌ API test failed:", error.message)
      }
    }
    
    console.log("\n🎉 Device-requisite link has been restored!")
    console.log("   Check the frontend - the device should now be visible again")
    
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

fixDeviceRequisiteLink()