import { db } from "../src/db"

async function startContinuousEmulation() {
  try {
    console.log("🚀 Starting continuous notification emulation...")
    
    // Find the emulated device
    const device = await db.device.findFirst({
      where: { emulated: true },
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
    
    if (!device) {
      console.log("❌ No emulated device found")
      return
    }
    
    if (device.bankDetails.length === 0) {
      console.log("❌ Device has no bank details")
      return
    }
    
    const bankDetail = device.bankDetails[0]
    console.log(`✅ Using device: ${device.name}`)
    console.log(`   Bank: ${bankDetail.bankType} ${bankDetail.cardNumber}`)
    
    // Function to generate realistic bank messages
    const generateBankMessage = (amount: number, balance?: number) => {
      const senders = ["Иван И.", "Мария П.", "Петр С.", "Анна К.", "Сергей В.", "Елена М.", "Дмитрий Л.", "Ольга Н."]
      const sender = senders[Math.floor(Math.random() * senders.length)]
      const actualBalance = balance || Math.floor(Math.random() * 50000 + 10000)
      
      const templates = [
        `Перевод ${amount.toLocaleString('ru-RU')} ₽ от ${sender}. Баланс: ${actualBalance.toLocaleString('ru-RU')} ₽`,
        `Пополнение ${amount.toLocaleString('ru-RU')} ₽. Баланс: ${actualBalance.toLocaleString('ru-RU')} ₽`,
        `${sender} перевел(а) вам ${amount.toLocaleString('ru-RU')} ₽. Остаток: ${actualBalance.toLocaleString('ru-RU')} ₽`,
        `Зачисление ${amount.toLocaleString('ru-RU')} ₽ от ${sender}. Доступно: ${actualBalance.toLocaleString('ru-RU')} ₽`
      ]
      
      return templates[Math.floor(Math.random() * templates.length)]
    }
    
    // Function to create a notification
    const createNotification = async (amount: number, matchTransaction: boolean = false) => {
      // If we want to match a transaction, find a pending one with similar amount
      let targetAmount = amount
      
      if (matchTransaction) {
        // Look for recent CREATED transactions
        const recentTransaction = await db.transaction.findFirst({
          where: {
            status: "CREATED",
            amount: {
              gte: amount * 0.95, // Within 5% of amount
              lte: amount * 1.05
            },
            createdAt: {
              gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
            }
          },
          orderBy: { createdAt: 'desc' }
        })
        
        if (recentTransaction) {
          targetAmount = recentTransaction.amount
          console.log(`   🎯 Matching transaction ${recentTransaction.id} with amount ${targetAmount}`)
        }
      }
      
      const message = generateBankMessage(targetAmount)
      
      const notification = await db.notification.create({
        data: {
          deviceId: device.id,
          type: "AppNotification",
          application: "ru.sberbankmobile",
          title: "СберБанк Онлайн",
          message,
          metadata: {
            packageName: "ru.sberbankmobile",
            bankType: "SBER",
            amount: targetAmount,
            parsedAmount: targetAmount
          },
          isRead: false,
          isProcessed: false
        }
      })
      
      console.log(`   ✅ Created: ${message}`)
      return notification
    }
    
    // Start emulation loop
    let counter = 0
    const emulate = async () => {
      counter++
      
      try {
        // Every 3rd notification, try to match a transaction
        const shouldMatch = counter % 3 === 0
        
        // Generate amount between 1000 and 30000
        const baseAmount = Math.floor(Math.random() * 29000 + 1000)
        
        await createNotification(baseAmount, shouldMatch)
        
        // Also ensure device stays online
        await db.device.update({
          where: { id: device.id },
          data: { 
            isOnline: true,
            lastActiveAt: new Date()
          }
        })
        
      } catch (error) {
        console.error("❌ Error in emulation:", error)
      }
      
      // Schedule next notification (between 15-45 seconds)
      const nextDelay = Math.floor(Math.random() * 30000 + 15000)
      console.log(`   ⏱️  Next notification in ${Math.floor(nextDelay/1000)} seconds...`)
      setTimeout(emulate, nextDelay)
    }
    
    // Start the loop
    console.log("\n🔄 Starting emulation loop...")
    emulate()
    
    // Keep the script running
    console.log("Press Ctrl+C to stop emulation\n")
    
  } catch (error) {
    console.error("❌ Error:", error)
  }
}

startContinuousEmulation()