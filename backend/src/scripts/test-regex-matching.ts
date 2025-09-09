// Тест regex паттернов для мэтчинга уведомлений

function parseAmount(amountStr: string): number {
  return parseFloat(amountStr.replace(/\s/g, '').replace(',', '.'));
}

const sberbankRegex = /(Пополнение|Перевод|Поступление)[^\d]+([\d\s]+[.,]?\d{0,2})\s*₽/i;

const testCases = [
  "Поступление 1 234.56 ₽ от *1234",
  "Поступление 1234.56 ₽ от *1234",
  "Поступление 1234,56 ₽ от *1234",
  "Пополнение 1 234.56 ₽",
  "Перевод 1 234.56 ₽ от Иван И.",
  "Зачисление 1 234.56 ₽",
  "Поступление +1 234.56 ₽",
  "Поступление: 1 234.56 ₽"
];

console.log("=== Тест regex паттернов для Сбербанка ===\n");
console.log(`Regex: ${sberbankRegex}\n`);

testCases.forEach(testCase => {
  const match = testCase.match(sberbankRegex);
  if (match) {
    const amount = parseAmount(match[2]);
    console.log(`✓ "${testCase}"`);
    console.log(`  Тип: ${match[1]}`);
    console.log(`  Сумма (raw): "${match[2]}"`);
    console.log(`  Сумма (parsed): ${amount}`);
  } else {
    console.log(`✗ "${testCase}" - НЕ СОВПАДАЕТ`);
  }
  console.log("");
});

// Тест конкретного сообщения из NotificationMatcherService
console.log("\n=== Тест конкретного уведомления ===");
const notificationText = "Поступление 1 234.56 ₽ от *1234";
const match = notificationText.match(sberbankRegex);

if (match) {
  console.log(`✓ Regex совпадает!`);
  console.log(`Полное совпадение: "${match[0]}"`);
  console.log(`Группа 1 (тип): "${match[1]}"`);
  console.log(`Группа 2 (сумма): "${match[2]}"`);
  console.log(`Распарсенная сумма: ${parseAmount(match[2])}`);
} else {
  console.log(`✗ Regex НЕ совпадает для: "${notificationText}"`);
  
  // Попробуем альтернативные regex
  console.log("\n=== Альтернативные regex ===");
  
  const alternatives = [
    /(Поступление)\s+([\d\s]+[.,]?\d{0,2})\s*₽/i,
    /(Поступление)\s*([\d\s]+[.,]?\d*)\s*₽/i,
    /Поступление\s+([\d\s.,]+)\s*₽/i,
    /Поступление\s+([0-9\s.,]+)\s*₽/i,
  ];
  
  alternatives.forEach((regex, index) => {
    const altMatch = notificationText.match(regex);
    if (altMatch) {
      console.log(`✓ Альтернатива ${index + 1} работает: ${regex}`);
      console.log(`  Совпадение: "${altMatch[0]}"`);
      if (altMatch[1]) console.log(`  Группа 1: "${altMatch[1]}"`);
      if (altMatch[2]) console.log(`  Группа 2: "${altMatch[2]}"`);
    } else {
      console.log(`✗ Альтернатива ${index + 1} не работает: ${regex}`);
    }
  });
}