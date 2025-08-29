import { BANK_PATTERNS, getBankTypeFromPattern } from "./services/bank-patterns";

// Test cases from different banks
const testCases = [
  {
    bank: "Тинькофф",
    packageName: "com.idamob.tinkoff.android",
    content: "Пополнение, счет RUB. 1000.50 ₽ от Иван И. Баланс: 5500.75 ₽",
    expectedAmount: 1000.50,
    expectedBalance: 5500.75,
    expectedBankType: "TBANK"
  },
  {
    bank: "Альфа-Банк",
    packageName: "ru.alfabank.mobile.android",
    content: "Перевод +2500 р от Петр П. Баланс: 10000 р",
    expectedAmount: 2500,
    expectedBalance: 10000,
    expectedBankType: "ALFABANK"
  },
  {
    bank: "Сбербанк",
    packageName: "ru.sberbankmobile",
    content: "СБЕР +3000.00₽ перевод от Мария М. Баланс: 15000₽",
    expectedAmount: 3000,
    expectedBalance: 15000,
    expectedBankType: "SBERBANK"
  },
  {
    bank: "ВТБ",
    packageName: "ru.vtb24.mobilebanking.android",
    content: "Поступление 1500.50₽ Счет*1234. Баланс: 8500.25₽",
    expectedAmount: 1500.50,
    expectedBalance: 8500.25,
    expectedCard: "1234",
    expectedBankType: "VTB"
  },
  {
    bank: "Газпромбанк",
    packageName: "ru.gazprombank.android.mobilebank.app",
    content: "Перевод зачисление 5000₽ от Дмитрий Д. Баланс: 20000₽",
    expectedAmount: 5000,
    expectedBalance: 20000,
    expectedBankType: "GAZPROMBANK"
  },
  {
    bank: "Generic SMS",
    packageName: "",
    content: "Поступил перевод 999.99 руб. Карта *7890. Баланс: 5555.55 руб",
    expectedAmount: 999.99,
    expectedBalance: 5555.55,
    expectedCard: "7890"
  }
];

function parseAmount(amountStr: string): number {
  if (!amountStr) return 0;
  const cleaned = amountStr.replace(/\s+/g, '').replace(',', '.');
  const amount = parseFloat(cleaned);
  return isNaN(amount) ? 0 : Math.floor(amount * 100) / 100;
}

function testPatternMatching() {
  console.log("Testing bank pattern matching...\n");
  
  let passedTests = 0;
  let failedTests = 0;
  
  for (const testCase of testCases) {
    console.log(`Testing ${testCase.bank}:`);
    console.log(`Content: "${testCase.content}"`);
    
    // Find matching pattern
    let matchedPattern = BANK_PATTERNS.find(pattern => 
      pattern.packageNames?.includes(testCase.packageName)
    );
    
    if (!matchedPattern) {
      // Try to match by content
      for (const pattern of BANK_PATTERNS) {
        const hasAlias = pattern.aliases.some(alias => 
          testCase.content.toLowerCase().includes(alias.toLowerCase())
        );
        if (hasAlias) {
          matchedPattern = pattern;
          break;
        }
      }
    }
    
    if (!matchedPattern) {
      matchedPattern = BANK_PATTERNS.find(p => p.name === "GenericSMS");
    }
    
    if (!matchedPattern) {
      console.log("❌ No pattern matched\n");
      failedTests++;
      continue;
    }
    
    console.log(`Matched pattern: ${matchedPattern.name}`);
    
    // Test amount extraction
    let extractedAmount = 0;
    for (const amountRegex of matchedPattern.patterns.amount) {
      const match = testCase.content.match(amountRegex);
      if (match && match[1]) {
        extractedAmount = parseAmount(match[1]);
        if (extractedAmount > 0) break;
      }
    }
    
    // Test balance extraction
    let extractedBalance = 0;
    if (matchedPattern.patterns.balance) {
      for (const balanceRegex of matchedPattern.patterns.balance) {
        const match = testCase.content.match(balanceRegex);
        if (match && match[1]) {
          extractedBalance = parseAmount(match[1]);
          if (extractedBalance > 0) break;
        }
      }
    }
    
    // Test card extraction
    let extractedCard = "";
    if (matchedPattern.patterns.card) {
      for (const cardRegex of matchedPattern.patterns.card) {
        const match = testCase.content.match(cardRegex);
        if (match && match[1]) {
          extractedCard = match[1];
          break;
        }
      }
    }
    
    // Test bank type
    const bankType = matchedPattern.name !== "GenericSMS" 
      ? getBankTypeFromPattern(matchedPattern.name) 
      : undefined;
    
    // Check results
    let testPassed = true;
    
    if (testCase.expectedAmount && Math.abs(extractedAmount - testCase.expectedAmount) > 0.01) {
      console.log(`❌ Amount mismatch: expected ${testCase.expectedAmount}, got ${extractedAmount}`);
      testPassed = false;
    } else if (testCase.expectedAmount) {
      console.log(`✅ Amount: ${extractedAmount}`);
    }
    
    if (testCase.expectedBalance && Math.abs(extractedBalance - testCase.expectedBalance) > 0.01) {
      console.log(`❌ Balance mismatch: expected ${testCase.expectedBalance}, got ${extractedBalance}`);
      testPassed = false;
    } else if (testCase.expectedBalance) {
      console.log(`✅ Balance: ${extractedBalance}`);
    }
    
    if (testCase.expectedCard && extractedCard !== testCase.expectedCard) {
      console.log(`❌ Card mismatch: expected ${testCase.expectedCard}, got ${extractedCard}`);
      testPassed = false;
    } else if (testCase.expectedCard) {
      console.log(`✅ Card: ${extractedCard}`);
    }
    
    if (testCase.expectedBankType && bankType !== testCase.expectedBankType) {
      console.log(`❌ Bank type mismatch: expected ${testCase.expectedBankType}, got ${bankType}`);
      testPassed = false;
    } else if (testCase.expectedBankType) {
      console.log(`✅ Bank type: ${bankType}`);
    }
    
    if (testPassed) {
      console.log("✅ Test passed\n");
      passedTests++;
    } else {
      console.log("❌ Test failed\n");
      failedTests++;
    }
  }
  
  console.log("=".repeat(50));
  console.log(`Test Results: ${passedTests} passed, ${failedTests} failed`);
  console.log(`Total: ${passedTests + failedTests} tests`);
  
  if (failedTests === 0) {
    console.log("\n🎉 All tests passed!");
  } else {
    console.log("\n⚠️ Some tests failed. Please review the patterns.");
  }
}

// Run tests
testPatternMatching();