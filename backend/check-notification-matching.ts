import { db } from "./src/db"

async function main() {
  try {
    console.log("🔍 Проверка сопоставления уведомления с транзакцией...")
    
    // Ищем уведомление с текстом "Поступление 1234"
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
    
    if (!notification) {
      console.log("❌ Уведомление с текстом 'Поступление 1234' не найдено")
      return
    }
    
    console.log("\n📱 Найдено уведомление:")
    console.log(`   ID: ${notification.id}`)
    console.log(`   Устройство: ${notification.Device?.name} (${notification.deviceId})`)
    console.log(`   Сообщение: ${notification.message}`)
    console.log(`   Обработано: ${notification.isProcessed}`)
    console.log(`   ID транзакции: ${notification.transactionId || 'НЕ СОПОСТАВЛЕНО'}`)
    console.log(`   Создано: ${notification.createdAt}`)
    
    // Если обработано, но не сопоставлено, сбросим флаг
    if (notification.isProcessed && !notification.transactionId) {
      console.log("\n🔄 Сбрасываем флаг isProcessed для повторной обработки...")
      await db.notification.update({
        where: { id: notification.id },
        data: { isProcessed: false }
      })
      console.log("✅ Флаг сброшен, уведомление будет обработано повторно")
    }
    
    // Проверяем статус NotificationMatcherService
    const service = await db.service.findUnique({
      where: { name: "NotificationMatcherService" }
    })
    
    console.log("\n⚙️  Статус NotificationMatcherService:")
    console.log(`   Включен: ${service?.enabled}`)
    console.log(`   Статус: ${service?.status}`)
    console.log(`   Интервал: ${service?.interval}ms`)
    console.log(`   Последний запуск: ${service?.lastTick}`)
    
    // Ищем транзакции с суммой 1234
    const transactions = await db.transaction.findMany({
      where: {
        amount: 1234,
        type: 'IN',
        status: 'IN_PROGRESS',
        requisites: {
          deviceId: notification.deviceId
        }
      },
      include: {
        requisites: true
      }
    })
    
    console.log(`\n💰 Найдено транзакций с суммой 1234 на устройстве: ${transactions.length}`)
    
    if (transactions.length > 0) {
      transactions.forEach(tx => {
        console.log(`\n   Транзакция ${tx.id}:`)
        console.log(`   - Сумма: ${tx.amount}`)
        console.log(`   - Статус: ${tx.status}`)
        console.log(`   - Реквизит: ${tx.requisites?.cardNumber || 'N/A'}`)
        console.log(`   - Создана: ${tx.createdAt}`)
      })
    }
    
    // Проверим парсинг суммы
    console.log(`\n🔍 Проверка регулярных выражений:`)
    
    // Проверяем разные регулярки
    const regexes = [
      /Поступление\s+([\d\s]+[.,]?\d{0,2})\s*(?:р|₽|руб|RUB)/i,
      /Поступление\s+(\d+)/i,
      /Поступление\s+([\d\s]+)/,
    ]
    
    regexes.forEach((regex, idx) => {
      const match = regex.exec(notification.message || '')
      if (match) {
        const amount = parseFloat(match[1].replace(/\s/g, '').replace(',', '.'))
        console.log(`   ✅ Regex ${idx + 1}: нашла сумму ${amount}`)
      } else {
        console.log(`   ❌ Regex ${idx + 1}: не нашла сумму`)
      }
    })
    
    // Проверим точное совпадение
    console.log(`\n📝 Полное сообщение для анализа:`)
    console.log(`   "${notification.message}"`)
    
  } catch (error) {
    console.error("❌ Ошибка:", error)
  }
}

main()