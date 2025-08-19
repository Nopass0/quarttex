import { db } from "./src/db"

async function main() {
  try {
    const message = "Поступление 1234 Счет*5715 от ИЛЬМАН Д. Баланс 188911.53р 23:43"
    const packageName = "ru.vtb24.mobilebanking.android"
    
    console.log("🔍 Тестируем парсинг суммы из уведомления")
    console.log(`   Сообщение: ${message}`)
    console.log(`   Пакет: ${packageName}`)
    
    // Специфичные матчеры для VTB
    const vtbMatchers = [
      {
        regex: /(?:Поступление|Пополнение|Перевод).*?([\d\s]+[.,]?\d{0,2})\s*₽/i,
        name: "VTB Pattern 1"
      },
      {
        regex: /Перевод\s+от.*?Сумма:\s*([\d\s]+[.,]?\d{0,2})\s*₽/i,
        name: "VTB Pattern 2"
      },
      {
        regex: /\+([\d\s]+[.,]?\d{0,2})\s*₽/i,
        name: "VTB Pattern 3"
      }
    ]
    
    console.log("\n📋 Проверка специфичных матчеров VTB:")
    let vtbFound = false
    for (const matcher of vtbMatchers) {
      const match = matcher.regex.exec(message)
      if (match) {
        console.log(`   ✅ ${matcher.name}: нашел ${match[1]}`)
        vtbFound = true
      } else {
        console.log(`   ❌ ${matcher.name}: не найдено`)
      }
    }
    
    // Универсальные матчеры
    const universalMatchers = [
      /Поступление\s+(\d+)/i,
      /Поступление\s+([\d\s]+[.,]?\d{0,2})\s*(?:р|₽|руб|RUB)/i,
      /\+([\d\s]+[.,]?\d{0,2})\s*(?:₽|руб|RUB|р)/i,
      /(?:Пополнение|Перевод|Зачисление|Поступление|Получен)\s+([\d\s]+[.,]?\d{0,2})\s*(?:₽|руб|RUB|р)/i,
    ]
    
    console.log("\n📋 Проверка универсальных матчеров:")
    let universalFound = false
    for (let i = 0; i < universalMatchers.length; i++) {
      const match = universalMatchers[i].exec(message)
      if (match) {
        console.log(`   ✅ Universal ${i + 1}: нашел "${match[1]}"`)
        universalFound = true
      } else {
        console.log(`   ❌ Universal ${i + 1}: не найдено`)
      }
    }
    
    // Функция parseAmount
    function parseAmount(amountStr: string): number {
      const cleanAmount = amountStr.replace(/\s/g, '').replace(',', '.')
      return parseFloat(cleanAmount)
    }
    
    // Проверим парсинг
    if (universalFound) {
      const match = /Поступление\s+(\d+)/i.exec(message)
      if (match) {
        const amount = parseAmount(match[1])
        console.log(`\n✅ Итоговая сумма: ${amount}`)
      }
    }
    
    // Проверим есть ли транзакция для сопоставления
    const notification = await db.notification.findFirst({
      where: {
        message: {
          contains: "Поступление 1234"
        }
      },
      include: {
        Device: true
      }
    })
    
    if (notification) {
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
      
      console.log(`\n💰 Найдено транзакций для сопоставления: ${transactions.length}`)
      if (transactions.length > 0) {
        console.log(`   Транзакция ID: ${transactions[0].id}`)
        console.log(`   Реквизит: ${transactions[0].requisites?.cardNumber}`)
      }
    }
    
  } catch (error) {
    console.error("❌ Ошибка:", error)
  }
}

main()