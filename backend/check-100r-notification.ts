import { db } from "./src/db"

async function main() {
  try {
    console.log("🔍 Проверяем уведомление 'Поступление 100р'...")
    
    // Ищем уведомление
    const notification = await db.notification.findFirst({
      where: {
        message: {
          contains: "Поступление 100р"
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
      console.log("❌ Уведомление не найдено")
      return
    }
    
    console.log("\n📱 Найдено уведомление:")
    console.log(`   ID: ${notification.id}`)
    console.log(`   Устройство: ${notification.Device?.name} (${notification.deviceId})`)
    console.log(`   Сообщение: ${notification.message}`)
    console.log(`   Обработано: ${notification.isProcessed}`)
    console.log(`   ID транзакции: ${notification.transactionId || 'НЕ СОПОСТАВЛЕНО'}`)
    console.log(`   Создано: ${notification.createdAt}`)
    console.log(`   Метаданные: ${JSON.stringify(notification.metadata, null, 2)}`)
    
    // Проверим, какой regex сработает
    console.log("\n🔍 Проверка парсинга:")
    
    // Тестируем VTB паттерны
    const vtbPatterns = [
      {
        name: "VTB Pattern 1 (Поступление XXXр Счет)",
        regex: /Поступление\s+([\d\s]+(?:[.,]\d{1,2})?)\s+Счет[*\s]*\d+\s+от\s+([А-Яа-яA-Za-z\s]+\.).*?Баланс\s+([\d\s]+(?:[.,]\d{1,2})?)\s*р/i
      },
      {
        name: "VTB Pattern 2 (Поступление XXXр карта)",
        regex: /Поступление\s+([\d\s]+(?:[.,]\d{1,2})?)\s*р.*?карта/i
      },
      {
        name: "VTB Pattern 3 (Поступление XXXр Счет - новый)",
        regex: /Поступление\s+([\d\s]+(?:[.,]\d{1,2})?)\s*р\s+Счет[*\s]*\d+\s+от\s+([А-Яа-яA-Za-z\s]+\.).*?Баланс\s+([\d\s]+(?:[.,]\d{1,2})?)\s*р/i
      }
    ]
    
    const message = notification.message || ''
    vtbPatterns.forEach(pattern => {
      const match = pattern.regex.exec(message)
      if (match) {
        console.log(`   ✅ ${pattern.name}: нашел сумму ${match[1]}`)
        if (match[2]) console.log(`      Отправитель: ${match[2]}`)
        if (match[3]) console.log(`      Баланс: ${match[3]}`)
      } else {
        console.log(`   ❌ ${pattern.name}: не сработал`)
      }
    })
    
    // Проверим транзакции с суммой 100
    const transactions = await db.transaction.findMany({
      where: {
        amount: 100,
        type: 'IN',
        requisites: {
          deviceId: notification.deviceId
        }
      },
      include: {
        requisites: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    console.log(`\n💰 Найдено транзакций с суммой 100 на устройстве: ${transactions.length}`)
    
    transactions.forEach(tx => {
      console.log(`\n   Транзакция ${tx.id}:`)
      console.log(`   - Статус: ${tx.status}`)
      console.log(`   - Реквизит: ${tx.requisites?.cardNumber || 'N/A'}`)
      console.log(`   - Банк: ${tx.requisites?.bankType || 'N/A'}`)
      console.log(`   - Создана: ${tx.createdAt.toLocaleString()}`)
      console.log(`   - bankDetailId: ${tx.bankDetailId}`)
    })
    
    // Проверим логи сервисов
    console.log("\n📝 Проверяем последние логи обработки:")
    
    const logs = await db.serviceLog.findMany({
      where: {
        OR: [
          {
            message: {
              contains: "100"
            }
          },
          {
            data: {
              path: ["notificationId"],
              equals: notification.id
            }
          }
        ],
        service: {
          name: {
            in: ["NotificationMatcherService", "NotificationAutoProcessorService"]
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })
    
    logs.forEach(log => {
      console.log(`\n[${log.createdAt.toLocaleTimeString()}] ${log.serviceName} - ${log.level}:`)
      console.log(`   ${log.message}`)
      if (log.data) {
        console.log(`   Данные: ${JSON.stringify(log.data, null, 2)}`)
      }
    })
    
  } catch (error) {
    console.error("❌ Ошибка:", error)
  }
}

main()