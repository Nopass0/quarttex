import { createHmac } from 'node:crypto';
import { canonicalJson } from './src/utils/canonicalJson';

// Данные запроса
const requestBody = {
  "payment_id": 4086997,
  "payment_amount": 3833,
  "payment_amount_usdt": 48.42091966,
  "payment_amount_profit": 3583.855,
  "payment_amount_profit_usdt": 45.2735598821,
  "payment_fee_percent_profit": 6.5,
  "payment_type": "sbp",
  "payment_bank": null,
  "payment_course": 79.16,
  "payment_lifetime": 720,
  "payment_status": "new"
};

// Ключи
const apiKeyPublic = "dc42391c8e504354b818622cee1d7069";
const apiKeyPrivate = "40ad418bc9534184a11bcd75f9582131";

// Токен из запроса
const receivedToken = "78b5e95df8ff0e48f957ba4a6aeecc9c1e1850b35062b9cac622c0bdae99b146";

console.log("=== Checking Request Signature ===\n");

// Генерируем подпись с нашим приватным ключом
const canonical = canonicalJson(requestBody);
const ourSignature = createHmac('sha256', apiKeyPrivate)
  .update(canonical)
  .digest('hex');

console.log("Request body:", JSON.stringify(requestBody, null, 2));
console.log("\nCanonical JSON:", canonical);
console.log("\nOur private key:", apiKeyPrivate);
console.log("Generated signature:", ourSignature);
console.log("Received token:     ", receivedToken);
console.log("Match:", ourSignature === receivedToken ? "✅" : "❌");

if (ourSignature !== receivedToken) {
  console.log("\n⚠️ SIGNATURE MISMATCH!");
  console.log("The request is signed with a different private key than what we have in our database.");
  console.log("\nPossible issues:");
  console.log("1. Wellbit is using a different private key");
  console.log("2. The private key in our database is incorrect");
  console.log("3. Wellbit expects us to use THEIR private key (not ours)");
}

// Попробуем найти ключ, который дает нужную подпись
console.log("\n=== Trying to find the correct key ===");

const possibleKeys = [
  "40ad418bc9534184a11bcd75f9582131", // Наш текущий ключ
  "00a1c8cf699578e1043552503d79347771f481feda5689845b77d495593da67c", // Старый ключ
  "dc42391c8e504354b818622cee1d7069", // Публичный ключ
  receivedToken, // Может быть, токен и есть ключ?
];

for (const key of possibleKeys) {
  const sig = createHmac('sha256', key)
    .update(canonical)
    .digest('hex');
  
  if (sig === receivedToken) {
    console.log(`✅ FOUND! The correct private key is: ${key}`);
    break;
  }
}

// Проверим, может быть ожидается другой формат
console.log("\n=== Testing different canonical formats ===");

// Вариант 1: Без null значений
const bodyWithoutNulls = JSON.parse(JSON.stringify(requestBody, (k, v) => v === null ? undefined : v));
const canonicalWithoutNulls = canonicalJson(bodyWithoutNulls);
const sigWithoutNulls = createHmac('sha256', apiKeyPrivate)
  .update(canonicalWithoutNulls)
  .digest('hex');

console.log("Without nulls:", canonicalWithoutNulls);
console.log("Signature:", sigWithoutNulls);
console.log("Match:", sigWithoutNulls === receivedToken ? "✅" : "❌");