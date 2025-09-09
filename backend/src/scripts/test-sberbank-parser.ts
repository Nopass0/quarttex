#!/usr/bin/env bun

import { SberbankParser } from "../bank-parsers/SberbankParser";

const parser = new SberbankParser();
const testMessage = "СЧЁТ2538 25.07 16:37 зачисление 5000р от Test Client Баланс: 125000.50р";

console.log("🔍 Тестирование парсера Сбербанка\n");
console.log("Сообщение:", testMessage);
console.log("Обнаружено парсером:", parser.detect(testMessage));

const result = parser.parse(testMessage);
console.log("\nРезультат парсинга:");
console.log(JSON.stringify(result, null, 2));

if (result) {
  console.log("\n✅ Парсер успешно распознал:");
  console.log(`   - Сумма: ${result.amount} ${result.currency}`);
  console.log(`   - Отправитель: ${result.senderName}`);
  console.log(`   - Баланс: ${result.balance}`);
} else {
  console.log("\n❌ Парсер не смог распознать сообщение");
}