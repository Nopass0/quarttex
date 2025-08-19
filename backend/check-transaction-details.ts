import { db } from "./src/db"

async function main() {
  try {
    console.log("🔍 Проверяем детали транзакции и реквизита...")
    
    // Найдем транзакцию
    const transaction = await db.transaction.findFirst({
      where: {
        amount: 1234,
        type: 'IN',
        status: 'IN_PROGRESS'
      },
      include: {
        requisites: {
          include: {
            device: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    if (!transaction) {
      console.log("❌ Транзакция не найдена")
      return
    }
    
    console.log("\n💰 Транзакция:")
    console.log(`   ID: ${transaction.id}`)
    console.log(`   Сумма: ${transaction.amount}`)
    console.log(`   Статус: ${transaction.status}`)
    console.log(`   bankDetailId: ${transaction.bankDetailId || 'НЕТ'}`)
    console.log(`   traderId: ${transaction.traderId}`)
    console.log(`   Создана: ${transaction.createdAt}`)
    
    if (transaction.requisites) {
      console.log("\n💳 Реквизит:")
      console.log(`   ID: ${transaction.requisites.id}`)
      console.log(`   Номер карты/телефона: ${transaction.requisites.cardNumber}`)
      console.log(`   Банк: ${transaction.requisites.bankType}`)
      console.log(`   deviceId: ${transaction.requisites.deviceId || 'НЕТ'}`)
      console.log(`   Привязано устройство: ${transaction.requisites.device ? 'ДА' : 'НЕТ'}`)
      
      if (transaction.requisites.device) {
        console.log("\n📱 Устройство:")
        console.log(`   - ID: ${transaction.requisites.device.id}`)
        console.log(`   - Имя: ${transaction.requisites.device.name}`)
      }
    }
    
    // Найдем уведомление
    const notification = await db.notification.findFirst({
      where: {
        message: {
          contains: "Поступление 1234"
        }
      },
      include: {
        Device: {
          include: {
            bankDetails: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    if (notification) {
      console.log("\n📱 Уведомление:")
      console.log(`   deviceId: ${notification.deviceId}`)
      console.log(`   userId устройства: ${notification.Device?.userId}`)
      
      console.log("\n🏦 Реквизиты устройства:")
      if (notification.Device?.bankDetails) {
        notification.Device.bankDetails.forEach(bd => {
          console.log(`   - ID: ${bd.id}`)
          console.log(`     Банк: ${bd.bankType}`)
          console.log(`     Карта: ${bd.cardNumber}`)
          console.log(`     deviceId: ${bd.deviceId}`)
        })
      }
    }
    
    // Проверим, есть ли соответствие
    if (transaction.requisites && notification?.Device?.bankDetails) {
      const matchingBankDetail = notification.Device.bankDetails.find(
        bd => bd.id === transaction.requisites?.id
      )
      
      if (matchingBankDetail) {
        console.log("\n✅ Найдено соответствие реквизита!")
      } else {
        console.log("\n❌ Реквизит транзакции не найден среди реквизитов устройства")
        
        // Проверим через bankDetailId
        const hasBankDetailId = notification.Device.bankDetails.some(
          bd => bd.id === transaction.bankDetailId
        )
        
        if (hasBankDetailId) {
          console.log("   Но bankDetailId транзакции совпадает с одним из реквизитов устройства")
        }
      }
    }
    
  } catch (error) {
    console.error("❌ Ошибка:", error)
  }
}

main()