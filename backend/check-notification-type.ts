import { db } from "./src/db"
import { NotificationType } from "@prisma/client"

async function main() {
  try {
    console.log("🔍 Проверяем тип уведомления и условия для NotificationMatcherService...")
    
    // Ищем уведомление с текстом "Поступление 1234"
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
    
    if (!notification) {
      console.log("❌ Уведомление не найдено")
      return
    }
    
    console.log("\n📱 Детали уведомления:")
    console.log(`   ID: ${notification.id}`)
    console.log(`   Тип: ${notification.type}`)
    console.log(`   Устройство: ${notification.deviceId}`)
    console.log(`   Сообщение: ${notification.message}`)
    console.log(`   Метаданные: ${JSON.stringify(notification.metadata, null, 2)}`)
    console.log(`   Обработано: ${notification.isProcessed}`)
    console.log(`   ID транзакции: ${notification.transactionId || 'НЕТ'}`)
    
    // Проверяем условия запроса NotificationMatcherService
    console.log("\n🔍 Проверка условий запроса NotificationMatcherService:")
    
    // Условие 1: type = AppNotification
    const isAppNotification = notification.type === NotificationType.AppNotification
    console.log(`   type = AppNotification: ${isAppNotification} (текущий тип: ${notification.type})`)
    
    // Условие 2: type = SMS и имеет bankType
    const isSmsWithBankType = notification.type === NotificationType.SMS && 
      notification.metadata && 
      typeof notification.metadata === 'object' && 
      'bankType' in notification.metadata
    console.log(`   type = SMS с bankType: ${isSmsWithBankType}`)
    
    // Условие 3: isProcessed = false
    console.log(`   isProcessed = false: ${!notification.isProcessed}`)
    
    // Проверяем, что будет найдено запросом
    const willBeFound = (isAppNotification || isSmsWithBankType) && !notification.isProcessed
    console.log(`\n✅ Будет найдено сервисом: ${willBeFound}`)
    
    if (!willBeFound) {
      console.log("\n❌ Причины, почему не будет найдено:")
      if (!isAppNotification && !isSmsWithBankType) {
        console.log("   - Тип не AppNotification и не SMS с bankType")
      }
      if (notification.isProcessed) {
        console.log("   - Уже обработано (isProcessed = true)")
      }
    }
    
    // Дополнительно проверим все уведомления, которые сервис должен найти
    const serviceQuery = await db.notification.findMany({
      where: {
        AND: [
          {
            OR: [
              {
                type: NotificationType.AppNotification
              },
              {
                AND: [
                  { type: NotificationType.SMS },
                  { 
                    metadata: {
                      path: ["bankType"],
                      not: null
                    }
                  }
                ]
              }
            ]
          },
          {
            isProcessed: false
          }
        ]
      },
      take: 10
    })
    
    console.log(`\n📊 Всего необработанных уведомлений для сервиса: ${serviceQuery.length}`)
    
    // Если тип не подходит, обновим его
    if (!isAppNotification && !isSmsWithBankType) {
      console.log("\n🔧 Обновляем тип уведомления на AppNotification...")
      await db.notification.update({
        where: { id: notification.id },
        data: { 
          type: NotificationType.AppNotification,
          isProcessed: false
        }
      })
      console.log("✅ Тип обновлен, уведомление теперь будет обработано")
    }
    
  } catch (error) {
    console.error("❌ Ошибка:", error)
  }
}

main()