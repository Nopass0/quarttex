import { createHmac } from 'node:crypto';
import { canonicalJson } from './src/utils/canonicalJson';

// Тестовые данные для SBP
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

// Генерируем подпись запроса
const requestCanonical = canonicalJson(requestBody);
const requestSignature = createHmac('sha256', apiKeyPrivate)
  .update(requestCanonical)
  .digest('hex');

console.log("=== Sending Test Request to Local Wellbit API ===\n");
console.log("Request body:", JSON.stringify(requestBody, null, 2));
console.log("\nHeaders:");
console.log("  x-api-key:", apiKeyPublic);
console.log("  x-api-token:", requestSignature);

// Отправляем запрос
const response = await fetch('http://localhost:3000/api/wellbit/payment/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKeyPublic,
    'x-api-token': requestSignature,
  },
  body: JSON.stringify(requestBody),
});

console.log("\n=== Response ===");
console.log("Status:", response.status);
console.log("Headers:");
console.log("  x-api-key:", response.headers.get('x-api-key'));
console.log("  x-api-token:", response.headers.get('x-api-token'));

const responseBody = await response.json();
console.log("Body:", JSON.stringify(responseBody, null, 2));

// Проверяем подпись ответа
const responseCanonical = canonicalJson(responseBody);
const expectedResponseSignature = createHmac('sha256', apiKeyPrivate)
  .update(responseCanonical)
  .digest('hex');

console.log("\n=== Signature Verification ===");
console.log("Response canonical:", responseCanonical);
console.log("Expected signature:", expectedResponseSignature);
console.log("Received signature:", response.headers.get('x-api-token'));
console.log("Match:", expectedResponseSignature === response.headers.get('x-api-token') ? "✅" : "❌");

if (expectedResponseSignature !== response.headers.get('x-api-token')) {
  console.log("\n⚠️ SIGNATURE MISMATCH!");
  console.log("This means the server is using a different private key or has a bug.");
}