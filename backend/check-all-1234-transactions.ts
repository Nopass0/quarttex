import { db } from "./src/db"

async function main() {
  try {
    console.log("🔍 Ищем все транзакции с суммой 1234...")
    
    const transactions = await db.transaction.findMany({
      where: {
        amount: 1234,
        type: 'IN'
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
    
    console.log(`\n💰 Найдено транзакций: ${transactions.length}`)
    
    transactions.forEach((tx, idx) => {
      console.log(`\n[${idx + 1}] Транзакция ${tx.id}:`)
      console.log(`   Статус: ${tx.status}`)
      console.log(`   bankDetailId: ${tx.bankDetailId || 'НЕТ'}`)
      console.log(`   traderId: ${tx.traderId}`)
      console.log(`   Создана: ${tx.createdAt.toLocaleString()}`)
      
      if (tx.requisites) {
        console.log(`   Реквизит ID: ${tx.requisites.id}`)
        console.log(`   Банк: ${tx.requisites.bankType}`)
        console.log(`   Карта/телефон: ${tx.requisites.cardNumber}`)
        console.log(`   deviceId реквизита: ${tx.requisites.deviceId}`)
        
        if (tx.requisites.device) {
          console.log(`   Устройство: ${tx.requisites.device.name} (${tx.requisites.device.id})`)
        }
      }
    })
    
    // Проверим уведомление
    const notification = await db.notification.findFirst({
      where: {
        message: {
          contains: "Поступление 1234"
        }
      },
      include: {
        Device: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    if (notification) {
      console.log("\n📱 Уведомление:")
      console.log(`   ID: ${notification.id}`)
      console.log(`   deviceId: ${notification.deviceId}`)
      console.log(`   transactionId: ${notification.transactionId || 'НЕТ'}`)
      console.log(`   isProcessed: ${notification.isProcessed}`)
      console.log(`   metadata: ${JSON.stringify(notification.metadata, null, 2)}`)
      console.log(`   Устройство: ${notification.Device?.name}`)
      console.log(`   userId устройства: ${notification.Device?.userId}`)
    }
    
  } catch (error) {
    console.error("❌ Ошибка:", error)
  }
}

main()