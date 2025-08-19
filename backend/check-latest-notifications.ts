import { db } from "./src/db"

async function main() {
  try {
    console.log("🔍 Проверяем последние уведомления...")
    
    const notifications = await db.notification.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 10,
      include: {
        Device: true
      }
    })
    
    console.log(`\n📱 Последние ${notifications.length} уведомлений:`)
    
    notifications.forEach((notif, idx) => {
      console.log(`\n[${idx + 1}] ${notif.createdAt.toLocaleString()}`)
      console.log(`   ID: ${notif.id}`)
      console.log(`   Устройство: ${notif.Device?.name || 'N/A'}`)
      console.log(`   Сообщение: ${notif.message?.substring(0, 100)}...`)
      console.log(`   Тип: ${notif.type}`)
      console.log(`   Обработано: ${notif.isProcessed}`)
      console.log(`   ID транзакции: ${notif.transactionId || 'НЕТ'}`)
      
      if (notif.metadata && typeof notif.metadata === 'object') {
        const meta = notif.metadata as any
        console.log(`   Метаданные:`)
        console.log(`     - extractedAmount: ${meta.extractedAmount || 'N/A'}`)
        console.log(`     - processedReason: ${meta.processedReason || 'N/A'}`)
      }
    })
    
    // Проверим транзакции с суммой 100
    console.log("\n💰 Проверяем транзакции с суммой 100:")
    
    const transactions = await db.transaction.findMany({
      where: {
        amount: 100,
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
      },
      take: 5
    })
    
    console.log(`\nНайдено транзакций: ${transactions.length}`)
    
    transactions.forEach((tx, idx) => {
      console.log(`\n[${idx + 1}] Транзакция ${tx.id}:`)
      console.log(`   Статус: ${tx.status}`)
      console.log(`   Создана: ${tx.createdAt.toLocaleString()}`)
      console.log(`   Устройство: ${tx.requisites?.device?.name || 'N/A'} (${tx.requisites?.deviceId || 'N/A'})`)
      console.log(`   Реквизит: ${tx.requisites?.cardNumber || 'N/A'}`)
      console.log(`   Банк: ${tx.requisites?.bankType || 'N/A'}`)
    })
    
  } catch (error) {
    console.error("❌ Ошибка:", error)
  }
}

main()