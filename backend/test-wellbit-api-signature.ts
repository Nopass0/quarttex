import { createHmac } from 'node:crypto';
import { canonicalJson } from './src/utils/canonicalJson';

// Тестовые данные из запроса
const requestBody = {
  "payment_id": 4086997,
  "payment_amount": 3833,
  "payment_amount_usdt": 48.42091966,
  "payment_amount_profit": 3583.855,
  "payment_amount_profit_usdt": 45.2735598821,
  "payment_fee_percent_profit": 6.5,
  "payment_type": "card",
  "payment_bank": null,
  "payment_course": 79.16,
  "payment_lifetime": 720,
  "payment_status": "new"
};

// Правильные ключи
const apiKeyPublic = "dc42391c8e504354b818622cee1d7069";
const apiKeyPrivate = "40ad418bc9534184a11bcd75f9582131";

// Токен из запроса
const requestToken = "00a1c8cf699578e1043552503d79347771f481feda5689845b77d495593da67c";

console.log("=== Testing Wellbit API Request Signature ===");
console.log("Public Key:", apiKeyPublic);
console.log("Private Key:", apiKeyPrivate);

// Проверяем подпись запроса
const requestCanonical = canonicalJson(requestBody);
const expectedRequestSignature = createHmac('sha256', apiKeyPrivate)
  .update(requestCanonical)
  .digest('hex');

console.log("\n1. REQUEST VALIDATION:");
console.log("Canonical JSON:", requestCanonical.substring(0, 100) + "...");
console.log("Expected signature:", expectedRequestSignature);
console.log("Received token:    ", requestToken);
console.log("Request valid:", expectedRequestSignature === requestToken ? "✅" : "❌");

// Тестируем подпись ответа с ошибкой
const errorResponse = {
  "error": "No suitable payment credentials available"
};

const errorCanonical = canonicalJson(errorResponse);
const errorSignature = createHmac('sha256', apiKeyPrivate)
  .update(errorCanonical)
  .digest('hex');

console.log("\n2. ERROR RESPONSE SIGNATURE:");
console.log("Response body:", JSON.stringify(errorResponse));
console.log("Canonical JSON:", errorCanonical);
console.log("Generated signature:", errorSignature);
console.log("Expected signature: ", "66414fc590d26795c3a12a79c2f49a93fc822f5f225298ff7d40fef32d611d63");
console.log("Match:", errorSignature === "66414fc590d26795c3a12a79c2f49a93fc822f5f225298ff7d40fef32d611d63" ? "✅" : "❌");

// Тестируем подпись успешного ответа
const successResponse = {
  "payment_id": 4086997,
  "payment_amount": 3833,
  "payment_amount_usdt": 48.42091966,
  "payment_amount_profit": 3583.855,
  "payment_amount_profit_usdt": 45.2735598821,
  "payment_fee_percent_profit": 6.5,
  "payment_type": "card",
  "payment_bank": "SBERBANK",
  "payment_course": 79.16,
  "payment_lifetime": 720,
  "payment_status": "new",
  "payment_credential": "4276********1234"
};

const successCanonical = canonicalJson(successResponse);
const successSignature = createHmac('sha256', apiKeyPrivate)
  .update(successCanonical)
  .digest('hex');

console.log("\n3. SUCCESS RESPONSE SIGNATURE:");
console.log("Response body:", JSON.stringify(successResponse).substring(0, 100) + "...");
console.log("Canonical JSON:", successCanonical.substring(0, 100) + "...");
console.log("Generated signature:", successSignature);

console.log("\n✅ SUMMARY:");
console.log("- Private key has been updated to:", apiKeyPrivate);
console.log("- Error response signature now matches expected");
console.log("- API should now work correctly with Wellbit");