import { PrismaClient } from "@prisma/client";
import { BANK_PATTERNS, getBankTypeFromPattern } from "./src/services/bank-patterns";
import { roundDown2 } from "./src/utils/rounding";

const db = new PrismaClient();

function parseNotificationContent(content: string): any {
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
  
  if (matchedPattern) {
    console.log(`Matched pattern: ${matchedPattern.name}`);
    
    // Set bank type
    if (matchedPattern.name !== "GenericSMS") {
      result.bankType = getBankTypeFromPattern(matchedPattern.name);
      console.log(`Bank type from pattern: ${result.bankType}`);
    }
  }
  
  return result;
}

function parseAmount(amountStr: string): number {
  if (!amountStr) return 0;
  
  // Remove all spaces and replace comma with dot
  const cleaned = amountStr.replace(/\s+/g, '').replace(',', '.');
  const amount = parseFloat(cleaned);
  
  return isNaN(amount) ? 0 : roundDown2(amount);
}

async function testDirectMatching() {
  try {
    const message = "Поступление 3201р Счет*1234 SBP Баланс 50000р 12:34";
    console.log(`Testing message: "${message}"`);
    
    // Parse the notification
    const parsed = parseNotificationContent(message);
    console.log("\nParsed result:");
    console.log(JSON.stringify(parsed, null, 2));
    
    // Find matching transaction
    const traderId = "cmdt9397o06lkikq42msq5cru";
    const amount = parsed.amount;
    const bankType = parsed.bankType;
    
    console.log("\nSearching for transaction:");
    console.log(`- traderId: ${traderId}`);
    console.log(`- amount: ${amount}`);
    console.log(`- bankType: ${bankType}`);
    
    const tolerance = 1;
    
    const where: any = {
      traderId,
      type: 'IN',
      status: 'IN_PROGRESS',
      amount: {
        gte: amount - tolerance,
        lte: amount + tolerance
      }
    };
    
    console.log("\nChecking SBP special handling:");
    console.log(`- bankType === "СБП": ${bankType === "СБП"}`);
    console.log(`- bankType === "SBP": ${bankType === "SBP"}`);
    
    // If bank type is detected, try to match it
    // Special handling for SBP - it can come through any bank
    if (bankType && bankType !== "СБП" && bankType !== "SBP") {
      console.log("Not SBP, adding bank filter");
      const requisites = await db.bankDetail.findMany({
        where: {
          traderId,
          bankType: bankType as any
        },
        select: { id: true }
      });
      
      if (requisites.length > 0) {
        where.bankDetailId = {
          in: requisites.map(r => r.id)
        };
        console.log(`Found ${requisites.length} requisites for bank ${bankType}`);
      }
    } else {
      console.log("SBP detected - skipping bank filter, can match any bank");
    }
    
    console.log("\nFinal query where clause:");
    console.log(JSON.stringify(where, null, 2));
    
    const transaction = await db.transaction.findFirst({
      where,
      include: {
        requisites: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    if (transaction) {
      console.log("\n✅ TRANSACTION FOUND:");
      console.log(`- ID: ${transaction.id}`);
      console.log(`- Amount: ${transaction.amount}`);
      console.log(`- Status: ${transaction.status}`);
      console.log(`- Bank: ${transaction.requisites?.bankType}`);
      console.log(`- Requisite ID: ${transaction.bankDetailId}`);
    } else {
      console.log("\n❌ TRANSACTION NOT FOUND");
      
      // Check all IN_PROGRESS transactions
      const allInProgress = await db.transaction.findMany({
        where: {
          traderId,
          type: 'IN',
          status: 'IN_PROGRESS'
        },
        include: {
          requisites: true
        }
      });
      
      console.log(`\nAll IN_PROGRESS transactions for trader: ${allInProgress.length}`);
      for (const tx of allInProgress) {
        console.log(`- ${tx.id}: ${tx.amount} RUB, Bank: ${tx.requisites?.bankType}`);
      }
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await db.$disconnect();
  }
}

testDirectMatching();