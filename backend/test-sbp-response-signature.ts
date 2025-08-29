import { createHmac } from 'node:crypto';
import { canonicalJson } from './src/utils/canonicalJson';

// Данные из SBP запроса
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

// Ответ с ошибкой
const responseBody = {
  "error": "Method not available for merchant"
};

// Ключи
const apiKeyPublic = "dc42391c8e504354b818622cee1d7069";
const apiKeyPrivate = "40ad418bc9534184a11bcd75f9582131";

// Токены из теста
const requestToken = "78b5e95df8ff0e48f957ba4a6aeecc9c1e1850b35062b9cac622c0bdae99b146";
const actualResponseToken = "67cb7790bd28caac94388405b4525cba86877e212ad9a5c64fc88cc6cc11afbe";
const expectedResponseToken = "7aa4a5926b7d565b5f07912571c857c386e8716c1887491ad10720e96237b007";

console.log("=== Testing SBP Response Signature ===\n");

// 1. Проверяем подпись запроса
const requestCanonical = canonicalJson(requestBody);
const calculatedRequestToken = createHmac('sha256', apiKeyPrivate)
  .update(requestCanonical)
  .digest('hex');

console.log("1. REQUEST VALIDATION:");
console.log("Request type: SBP");
console.log("Canonical JSON:", requestCanonical.substring(0, 100) + "...");
console.log("Calculated token:", calculatedRequestToken);
console.log("Received token:  ", requestToken);
console.log("Match:", calculatedRequestToken === requestToken ? "✅" : "❌");

// 2. Проверяем подпись ответа
const responseCanonical = canonicalJson(responseBody);
const calculatedResponseSignature = createHmac('sha256', apiKeyPrivate)
  .update(responseCanonical)
  .digest('hex');

console.log("\n2. RESPONSE SIGNATURE:");
console.log("Response body:", JSON.stringify(responseBody));
console.log("Canonical JSON:", responseCanonical);
console.log("Our calculated:    ", calculatedResponseSignature);
console.log("We actually sent:  ", actualResponseToken);
console.log("Wellbit expects:   ", expectedResponseToken);

console.log("\nComparison:");
console.log("Our calc == We sent:     ", calculatedResponseSignature === actualResponseToken ? "✅" : "❌");
console.log("Our calc == Expected:    ", calculatedResponseSignature === expectedResponseToken ? "✅" : "❌");
console.log("We sent == Expected:     ", actualResponseToken === expectedResponseToken ? "✅" : "❌");

// Попробуем понять, откуда взялась ожидаемая подпись
console.log("\n3. REVERSE ENGINEERING EXPECTED SIGNATURE:");

// Может быть, они ожидают другой текст ошибки?
const alternativeResponses = [
  { "error": "Method not available for merchant" },
  { "error": "Method not available" },
  { "error": "Payment method not available" },
  { "error": "SBP not available" },
  { "error": "No payment method available" },
  { "message": "Method not available for merchant" },
  { "status": "error", "message": "Method not available for merchant" },
];

for (const altResponse of alternativeResponses) {
  const altCanonical = canonicalJson(altResponse);
  const altSignature = createHmac('sha256', apiKeyPrivate)
    .update(altCanonical)
    .digest('hex');
  
  if (altSignature === expectedResponseToken) {
    console.log("✅ FOUND! Expected response should be:", JSON.stringify(altResponse));
    console.log("   Canonical:", altCanonical);
    break;
  }
}

// Проверим, что если мы отправили неправильную подпись
console.log("\n4. SIGNATURE MISMATCH ANALYSIS:");
console.log("We are sending signature:", actualResponseToken);
console.log("This signature is for:   ", responseCanonical);
console.log("\nBut Wellbit expects:    ", expectedResponseToken);
console.log("Which means they expect a different response body or we have a bug in signature generation");