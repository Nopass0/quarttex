import { BANK_PATTERNS, getBankTypeFromPattern } from "./services/bank-patterns";

// More comprehensive test cases from real bank notifications
const comprehensiveTestCases = [
  // Тинькофф variations
  {
    bank: "Тинькофф",
    packageName: "com.idamob.tinkoff.android",
    content: "Пополнение, счет RUB. 5000 ₽ от Иван И. Баланс: 15000 ₽",
    expectedAmount: 5000,
    expectedBalance: 15000,
    expectedBankType: "TBANK"
  },
  {
    bank: "Тинькофф",
    packageName: "com.idamob.tinkoff.android",
    content: "Зачисление от П2П переводы Tinkoff 10 000.50 ₽. Карта *1234",
    expectedAmount: 10000.50,
    expectedCard: "1234",
    expectedBankType: "TBANK"
  },
  // Сбербанк variations
  {
    bank: "Сбербанк",
    packageName: "ru.sberbankmobile",
    content: "Вам перевели 7500р. MIR-1234 Баланс: 25000р",
    expectedAmount: 7500,
    expectedBalance: 25000,
    expectedCard: "1234",
    expectedBankType: "SBERBANK"
  },
  {
    bank: "Сбербанк",
    packageName: "ru.sberbankmobile",
    content: "СБЕР +15000₽ перевод",
    expectedAmount: 15000,
    expectedBankType: "SBERBANK"
  },
  // ВТБ variations
  {
    bank: "ВТБ",
    packageName: "ru.vtb24.mobilebanking.android",
    content: "Поступление 3000₽ на Счет*5678",
    expectedAmount: 3000,
    expectedCard: "5678",
    expectedBankType: "VTB"
  },
  {
    bank: "ВТБ",
    packageName: "ru.vtb24.mobilebanking.android",
    content: "Зачисление 8500.75₽. Баланс: 50000₽",
    expectedAmount: 8500.75,
    expectedBalance: 50000,
    expectedBankType: "VTB"
  },
  // Альфа-Банк variations
  {
    bank: "Альфа-Банк",
    packageName: "ru.alfabank.mobile.android",
    content: "Получен перевод на счет *9876: 12345.67 RUB",
    expectedAmount: 12345.67,
    expectedCard: "9876",
    expectedBankType: "ALFABANK"
  },
  // Райффайзенбанк
  {
    bank: "Райффайзенбанк",
    packageName: "ru.raiffeisen.mobile.new",
    content: "Поступление 4500 ₽ на карту MIR-3456. Баланс: 15000 ₽",
    expectedAmount: 4500,
    expectedBalance: 15000,
    expectedCard: "3456",
    expectedBankType: "RAIFFEISEN"
  },
  // Газпромбанк
  {
    bank: "Газпромбанк",
    packageName: "ru.gazprombank.android.mobilebank.app",
    content: "Перевод зачисление 25000₽ от компании ООО. Баланс: 100000₽",
    expectedAmount: 25000,
    expectedBalance: 100000,
    expectedBankType: "GAZPROMBANK"
  },
  // Росбанк
  {
    bank: "Росбанк",
    packageName: "ru.rosbank.android",
    content: "Перевод +5000 руб. Карта *1111. Доступно: 20000 руб",
    expectedAmount: 5000,
    expectedBalance: 20000,
    expectedCard: "1111",
    expectedBankType: "ROSBANK"
  },
  // Открытие
  {
    bank: "Открытие",
    packageName: "com.openbank",
    content: "Пополнение счета на 7777.77 руб. Баланс: 88888.88 руб",
    expectedAmount: 7777.77,
    expectedBalance: 88888.88,
    expectedBankType: "OPENBANK"
  },
  // Почта Банк
  {
    bank: "Почта Банк",
    packageName: "ru.pochta.bank",
    content: "Зачисление 3333₽ на карту *2222. Баланс: 15000₽",
    expectedAmount: 3333,
    expectedBalance: 15000,
    expectedCard: "2222",
    expectedBankType: "POCHTABANK"
  }
];

function parseAmount(amountStr: string): number {
  if (!amountStr) return 0;
  const cleaned = amountStr.replace(/\s+/g, '').replace(',', '.');
  const amount = parseFloat(cleaned);
  return isNaN(amount) ? 0 : Math.floor(amount * 100) / 100;
}

function testComprehensivePatterns() {
  console.log("Running comprehensive bank pattern tests...\n");
  
  let passedTests = 0;
  let failedTests = 0;
  const failedBanks: string[] = [];
  
  for (const testCase of comprehensiveTestCases) {
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
      failedBanks.push(`${testCase.bank} - No pattern`);
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
    let failureReasons: string[] = [];
    
    if (testCase.expectedAmount && Math.abs(extractedAmount - testCase.expectedAmount) > 0.01) {
      console.log(`❌ Amount mismatch: expected ${testCase.expectedAmount}, got ${extractedAmount}`);
      failureReasons.push(`amount (expected: ${testCase.expectedAmount}, got: ${extractedAmount})`);
      testPassed = false;
    } else if (testCase.expectedAmount) {
      console.log(`✅ Amount: ${extractedAmount}`);
    }
    
    if (testCase.expectedBalance && Math.abs(extractedBalance - testCase.expectedBalance) > 0.01) {
      console.log(`❌ Balance mismatch: expected ${testCase.expectedBalance}, got ${extractedBalance}`);
      failureReasons.push(`balance (expected: ${testCase.expectedBalance}, got: ${extractedBalance})`);
      testPassed = false;
    } else if (testCase.expectedBalance) {
      console.log(`✅ Balance: ${extractedBalance}`);
    }
    
    if (testCase.expectedCard && extractedCard !== testCase.expectedCard) {
      console.log(`❌ Card mismatch: expected ${testCase.expectedCard}, got ${extractedCard}`);
      failureReasons.push(`card (expected: ${testCase.expectedCard}, got: ${extractedCard})`);
      testPassed = false;
    } else if (testCase.expectedCard) {
      console.log(`✅ Card: ${extractedCard}`);
    }
    
    if (testCase.expectedBankType && bankType !== testCase.expectedBankType) {
      console.log(`❌ Bank type mismatch: expected ${testCase.expectedBankType}, got ${bankType}`);
      failureReasons.push(`bank type (expected: ${testCase.expectedBankType}, got: ${bankType})`);
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
      failedBanks.push(`${testCase.bank} - ${failureReasons.join(', ')}`);
    }
  }
  
  console.log("=".repeat(60));
  console.log(`Test Results: ${passedTests} passed, ${failedTests} failed`);
  console.log(`Total: ${passedTests + failedTests} tests`);
  
  if (failedTests > 0) {
    console.log("\n❌ Failed tests:");
    failedBanks.forEach(bank => console.log(`  - ${bank}`));
  }
  
  if (failedTests === 0) {
    console.log("\n🎉 All comprehensive tests passed!");
  } else {
    console.log("\n⚠️ Some tests failed. Please review the patterns.");
  }
}

// Run tests
testComprehensivePatterns();