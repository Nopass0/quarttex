import { db } from "./src/db"

async function main() {
  try {
    console.log("🔍 Сбрасываем уведомление и проверяем логи...")
    
    // Сбрасываем флаг обработки
    const updated = await db.notification.updateMany({
      where: {
        message: {
          contains: "Поступление 1234"
        }
      },
      data: {
        isProcessed: false,
        metadata: {
          category: "transaction",
          priority: 1,
          timestamp: Date.now(),
          packageName: "ru.vtb24.mobilebanking.android"
        }
      }
    })
    
    console.log(`✅ Обновлено уведомлений: ${updated.count}`)
    
    // Проверяем последние логи сервиса
    const logs = await db.serviceLog.findMany({
      where: {
        service: {
          name: "NotificationMatcherService"
        },
        OR: [
          {
            message: {
              contains: "1234"
            }
          },
          {
            data: {
              path: ["notification", "message"],
              string_contains: "1234"
            }
          },
          {
            message: {
              contains: "PARSE_FAILED"
            }
          }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    })
    
    console.log(`\n📝 Найдено логов с упоминанием 1234 или PARSE_FAILED: ${logs.length}`)
    
    logs.forEach(log => {
      const time = log.createdAt.toLocaleTimeString()
      console.log(`\n[${time}] ${log.level}: ${log.message}`)
      if (log.data) {
        console.log(`   Данные:`, JSON.stringify(log.data, null, 2))
      }
    })
    
    // Теперь ждем несколько секунд и проверяем, обработалось ли
    console.log("\n⏳ Ждем 2 секунды для обработки...")
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Проверяем обновилось ли уведомление
    const notification = await db.notification.findFirst({
      where: {
        message: {
          contains: "Поступление 1234"
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    console.log("\n📱 Статус уведомления после ожидания:")
    console.log(`   Обработано: ${notification?.isProcessed}`)
    console.log(`   ID транзакции: ${notification?.transactionId || 'НЕТ'}`)
    if (notification?.metadata) {
      console.log(`   Метаданные: ${JSON.stringify(notification.metadata, null, 2)}`)
    }
    
  } catch (error) {
    console.error("❌ Ошибка:", error)
  }
}

main()