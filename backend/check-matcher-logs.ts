import { db } from "./src/db"

async function main() {
  try {
    // Получаем последние логи NotificationMatcherService
    const logs = await db.serviceLog.findMany({
      where: {
        service: {
          name: "NotificationMatcherService"
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    })
    
    console.log("📝 Последние логи NotificationMatcherService:")
    console.log("=" .repeat(80))
    
    logs.forEach(log => {
      const time = log.createdAt.toLocaleTimeString()
      console.log(`[${time}] ${log.level}: ${log.message}`)
      if (log.data) {
        console.log(`   Данные:`, log.data)
      }
    })
    
  } catch (error) {
    console.error("❌ Ошибка:", error)
  }
}

main()