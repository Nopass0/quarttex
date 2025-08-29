import { BANK_PATTERNS } from "./src/services/bank-patterns";

const testMessage = "Поступление 3201р Счет*1234 SBP Баланс 50000р 12:34";

console.log("Testing message:", testMessage);
console.log("=" .repeat(50));

// Test each pattern
for (const pattern of BANK_PATTERNS) {
  console.log(`\nTesting pattern: ${pattern.name}`);
  
  // Test amount patterns
  for (const amountRegex of pattern.patterns.amount) {
    const match = testMessage.match(amountRegex);
    if (match) {
      console.log(`  ✅ Amount matched: ${match[1]} (pattern: ${amountRegex})`);
      break;
    }
  }
  
  // Test balance patterns
  if (pattern.patterns.balance) {
    for (const balanceRegex of pattern.patterns.balance) {
      const match = testMessage.match(balanceRegex);
      if (match) {
        console.log(`  ✅ Balance matched: ${match[1]} (pattern: ${balanceRegex})`);
        break;
      }
    }
  }
  
  // Test card patterns
  if (pattern.patterns.card) {
    for (const cardRegex of pattern.patterns.card) {
      const match = testMessage.match(cardRegex);
      if (match) {
        console.log(`  ✅ Card matched: ${match[1]} (pattern: ${cardRegex})`);
        break;
      }
    }
  }
}

// Now test the parsing logic
function parseNotificationContent(content: string): any {
  const result: any = {};
  
  // Find matching pattern
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
    console.log("\n❌ No pattern matched!");
    return result;
  }
  
  console.log(`\n✅ Matched pattern: ${matchedPattern.name}`);
  
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

console.log("\n" + "=" .repeat(50));
console.log("Final parsed result:");
const parsed = parseNotificationContent(testMessage);
console.log(JSON.stringify(parsed, null, 2));