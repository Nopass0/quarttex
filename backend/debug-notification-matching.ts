import { PrismaClient } from "@prisma/client";
import { BANK_PATTERNS, getBankTypeFromPattern } from "./src/services/bank-patterns";

const db = new PrismaClient();

async function debugNotificationMatching() {
  try {
    // Найдем последнее уведомление с 3201
    const notification = await db.notification.findFirst({
      where: {
        message: {
          contains: "3201"
        }
      },
      include: {
        Device: {
          include: {
            user: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!notification) {
      console.log("Notification not found");
      return;
    }

    console.log("=".repeat(50));
    console.log("NOTIFICATION DETAILS:");
    console.log("=".repeat(50));
    console.log(`ID: ${notification.id}`);
    console.log(`Message: ${notification.message}`);
    console.log(`Package: ${notification.packageName}`);
    console.log(`isProcessed: ${notification.isProcessed}`);
    console.log(`Device ID: ${notification.deviceId}`);
    console.log(`Device User ID: ${notification.Device?.userId}`);
    console.log(`Device User Username: ${notification.Device?.user?.username}`);

    // Парсим уведомление
    const parsed = parseNotificationContent(notification.message, notification.packageName);
    console.log("\n" + "=".repeat(50));
    console.log("PARSED DATA:");
    console.log("=".repeat(50));
    console.log(JSON.stringify(parsed, null, 2));

    // Ищем транзакцию
    if (notification.Device?.userId && parsed.amount) {
      console.log("\n" + "=".repeat(50));
      console.log("SEARCHING FOR TRANSACTION:");
      console.log("=".repeat(50));
      console.log(`Trader ID (userId): ${notification.Device.userId}`);
      console.log(`Amount: ${parsed.amount}`);
      console.log(`Bank Type: ${parsed.bankType}`);

      const transaction = await db.transaction.findFirst({
        where: {
          traderId: notification.Device.userId,
          type: 'IN',
          status: 'IN_PROGRESS',
          amount: {
            gte: parsed.amount - 1,
            lte: parsed.amount + 1
          }
        },
        include: {
          requisites: true
        }
      });

      if (transaction) {
        console.log("\n✅ TRANSACTION FOUND:");
        console.log(`ID: ${transaction.id}`);
        console.log(`Amount: ${transaction.amount}`);
        console.log(`Status: ${transaction.status}`);
        console.log(`Bank: ${transaction.requisites?.bankType}`);
        console.log(`Requisite ID: ${transaction.bankDetailId}`);
        
        // Проверяем, почему не сопоставилось
        if (parsed.bankType && transaction.requisites) {
          console.log("\n🔍 Bank Type Matching:");
          console.log(`Parsed Bank: ${parsed.bankType}`);
          console.log(`Transaction Bank: ${transaction.requisites.bankType}`);
          console.log(`Match: ${parsed.bankType === transaction.requisites.bankType}`);
          
          // Если банк СБП, проверяем является ли реквизит банком ВТБ
          if (parsed.bankType === "СБП" && transaction.requisites.bankType === "VTB") {
            console.log("⚠️ СБП transaction with VTB requisite - should match!");
          }
        }
      } else {
        console.log("\n❌ TRANSACTION NOT FOUND");
        
        // Проверяем все транзакции трейдера
        const allTransactions = await db.transaction.findMany({
          where: {
            traderId: notification.Device.userId,
            type: 'IN'
          },
          include: {
            requisites: true
          }
        });
        
        console.log(`\nAll IN transactions for trader: ${allTransactions.length}`);
        for (const tx of allTransactions) {
          console.log(`- ${tx.id}: ${tx.amount} RUB, Status: ${tx.status}, Bank: ${tx.requisites?.bankType}`);
        }
      }
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await db.$disconnect();
  }
}

function parseNotificationContent(content: string, packageName: string): any {
  const result: any = {};
  
  // Try to find matching bank pattern
  let matchedPattern: any = null;
  
  for (const pattern of BANK_PATTERNS) {
    // Check if any amount pattern matches
    for (const amountRegex of pattern.patterns.amount) {
      const match = content.match(amountRegex);
      if (match) {
        matchedPattern = pattern;
        result.amount = parseAmount(match[1]);
        break;
      }
    }
    
    if (matchedPattern) break;
  }
  
  if (!matchedPattern) {
    return result;
  }
  
  console.log(`Matched pattern: ${matchedPattern.name}`);
  
  // Extract balance
  if (matchedPattern.patterns.balance) {
    for (const balanceRegex of matchedPattern.patterns.balance) {
      const match = content.match(balanceRegex);
      if (match && match[1]) {
        result.balance = parseAmount(match[1]);
        break;
      }
    }
  }
  
  // Extract card
  if (matchedPattern.patterns.card) {
    for (const cardRegex of matchedPattern.patterns.card) {
      const match = content.match(cardRegex);
      if (match && match[1]) {
        result.card = match[1];
        break;
      }
    }
  }
  
  // Set bank type
  if (matchedPattern.name !== "GenericSMS") {
    result.bankType = matchedPattern.name;
  }
  
  return result;
}

function parseAmount(amountStr: string): number {
  if (!amountStr) return 0;
  
  // Remove all spaces and replace comma with dot
  const cleaned = amountStr.replace(/\s+/g, '').replace(',', '.');
  const amount = parseFloat(cleaned);
  
  return isNaN(amount) ? 0 : amount;
}

debugNotificationMatching();