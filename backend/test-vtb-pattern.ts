const testMessage = "Поступление 100р Счет*5715 от ИЛЬМАН Д. Баланс 189011.53р 00:11";

// Тестируем новый паттерн
const pattern = /Поступление\s+([\d\s]+(?:[.,]\d{1,2})?)\s*р\s+Счет[*\s]*\d+\s+от\s+([А-Яа-яA-Za-z\s]+\.).*?Баланс\s+([\d\s]+(?:[.,]\d{1,2})?)\s*р/i;

const match = pattern.exec(testMessage);

if (match) {
  console.log("✅ Паттерн сработал!");
  console.log(`   Сумма: ${match[1]}`);
  console.log(`   Отправитель: ${match[2]}`);
  console.log(`   Баланс: ${match[3]}`);
} else {
  console.log("❌ Паттерн не сработал");
}

// Также проверим старый паттерн для сравнения
const oldPattern = /Поступление\s+([\d\s]+(?:[.,]\d{1,2})?)\s+Счет[*\s]*\d+\s+от\s+([А-Яа-яA-Za-z\s]+\.).*?Баланс\s+([\d\s]+(?:[.,]\d{1,2})?)\s*р/i;
const oldMatch = oldPattern.exec(testMessage);

console.log("\nСтарый паттерн (без 'р' после суммы):", oldMatch ? "✅ Сработал" : "❌ Не сработал");