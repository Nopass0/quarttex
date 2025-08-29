import { BankRegexFactory } from "./src/bank-parsers";

async function testParsing() {
  const factory = new BankRegexFactory();
  
  const testMessage = "Пополнение, счет RUB. 3001 RUB. Иван И. Доступно 50000 RUB";
  const packageName = "com.idamob.tinkoff.android";
  
  console.log("=== ТЕСТ ПАРСИНГА БАНКОВСКОГО СООБЩЕНИЯ ===\n");
  console.log(`Сообщение: "${testMessage}"`);
  console.log(`Package: ${packageName}`);
  
  const result = factory.parseMessage(testMessage, packageName);
  
  if (result) {
    console.log("\n✅ Сообщение успешно распарсено:");
    console.log(`- Банк: ${result.parser.bankName}`);
    console.log(`- Сумма: ${result.transaction.amount}`);
    console.log(`- Отправитель: ${result.transaction.senderName}`);
    console.log(`- Тип: ${result.transaction.type}`);
  } else {
    console.log("\n❌ Не удалось распарсить сообщение");
    
    // Проверяем поддерживаемые банки
    console.log("\nПоддерживаемые банки:", factory.getBankNames());
  }
  
  // Проверяем NotificationMatcherService
  console.log("\n\n=== ПРОВЕРКА REGEXP В NotificationMatcherService ===");
  
  const tBankRegexes = [
    /(?:Пополнение|Перевод|Поступление)\s+(?:на\s+)?([\d\s]+[.,]?\d{0,2})\s*₽/i,
    /Пополнение,\s*счет\s*RUB\.\s*([\d\s]+[.,]?\d{0,2})\s*(?:₽|RUB)/i,
    /Вам перевели\s+([\d\s]+[.,]?\d{0,2})\s*₽/i,
    /\+([\d\s]+[.,]?\d{0,2})\s*₽.*?(?:от|Перевод)/i,
  ];
  
  tBankRegexes.forEach((regex, index) => {
    const match = regex.exec(testMessage);
    console.log(`\nRegex ${index + 1}: ${regex}`);
    if (match) {
      console.log(`✅ Совпадение найдено: "${match[0]}"`);
      console.log(`   Сумма: ${match[1]}`);
    } else {
      console.log(`❌ Нет совпадения`);
    }
  });
}

testParsing().catch(console.error).finally(() => process.exit(0));