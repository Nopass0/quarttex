import { createHmac } from 'node:crypto';
import { canonicalJson } from './src/utils/canonicalJson';

// Данные для тестирования
const responseBody = {
  "error": "No suitable payment credentials available"
};

// Известные ключи
const apiKeyPrivate = "00a1c8cf699578e1043552503d79347771f481feda5689845b77d495593da67c";
const apiKeyPublic = "dc42391c8e504354b818622cee1d7069";

// Ожидаемая подпись от Wellbit API
const expectedSignature = "66414fc590d26795c3a12a79c2f49a93fc822f5f225298ff7d40fef32d611d63";

console.log("=== Reverse Engineering Wellbit Response Signature ===");

// Важно: возможно, Wellbit ожидает, что МЫ отвечаем с подписью, 
// сгенерированной на основе НАШЕГО тела ответа, но используя ИХ ключ
// Или возможно они показывают свою подпись для сравнения

// Попробуем разные комбинации ключей и данных
const testCases = [
  // Попробуем перевернуть ключи
  { key: apiKeyPublic, data: JSON.stringify(responseBody), desc: "Public key + JSON" },
  { key: apiKeyPrivate, data: JSON.stringify(responseBody), desc: "Private key + JSON" },
  
  // Может быть, ключи были перепутаны местами?
  { key: "dc42391c8e504354b818622cee1d7069", data: JSON.stringify(responseBody), desc: "Raw public as key" },
  { key: "00a1c8cf699578e1043552503d79347771f481feda5689845b77d495593da67c", data: JSON.stringify(responseBody), desc: "Raw private as key" },
  
  // Может быть, они используют комбинацию ключей?
  { key: apiKeyPublic + apiKeyPrivate, data: JSON.stringify(responseBody), desc: "Public+Private concat" },
  { key: apiKeyPrivate + apiKeyPublic, data: JSON.stringify(responseBody), desc: "Private+Public concat" },
  
  // Или возможно есть мастер-ключ?
  { key: "wellbit", data: JSON.stringify(responseBody), desc: "wellbit as key" },
  { key: "WELLBIT", data: JSON.stringify(responseBody), desc: "WELLBIT as key" },
  { key: "wellbit_master", data: JSON.stringify(responseBody), desc: "wellbit_master as key" },
  
  // Может, они подписывают строку без JSON?
  { key: apiKeyPrivate, data: "No suitable payment credentials available", desc: "Private key + raw message" },
  { key: apiKeyPublic, data: "No suitable payment credentials available", desc: "Public key + raw message" },
  
  // Или используют статус код?
  { key: apiKeyPrivate, data: "409", desc: "Private key + status code" },
  { key: apiKeyPublic, data: "409", desc: "Public key + status code" },
];

console.log("\nTrying different combinations:");
for (const test of testCases) {
  const signature = createHmac('sha256', test.key)
    .update(test.data)
    .digest('hex');
  
  if (signature === expectedSignature) {
    console.log(`✅ FOUND! ${test.desc}`);
    console.log(`   Key: ${test.key}`);
    console.log(`   Data: ${test.data}`);
    console.log(`   Signature: ${signature}`);
    break;
  } else {
    console.log(`❌ ${test.desc}: ${signature.substring(0, 16)}...`);
  }
}

// Попробуем понять структуру самой подписи
console.log("\n=== Analyzing signature structure ===");
console.log("Expected signature:", expectedSignature);
console.log("Length:", expectedSignature.length, "(64 chars = 256 bits = standard SHA256)");

// Возможно, проблема в том, что МЫ должны генерировать подпись
// на основе ПОЛНОГО ответа, включая HTTP headers?
const fullResponse = {
  status: 409,
  headers: {
    "x-api-key": apiKeyPublic,
    "x-api-token": "?" // это то, что мы пытаемся вычислить
  },
  body: responseBody
};

console.log("\n=== Testing with full response structure ===");
const fullResponseTests = [
  JSON.stringify(fullResponse.body),
  JSON.stringify({ status: 409, ...responseBody }),
  JSON.stringify({ code: 409, message: "No suitable payment credentials available" }),
  `409:${JSON.stringify(responseBody)}`,
  `${apiKeyPublic}:${JSON.stringify(responseBody)}`,
];

for (const data of fullResponseTests) {
  const signature = createHmac('sha256', apiKeyPrivate)
    .update(data)
    .digest('hex');
  
  if (signature === expectedSignature) {
    console.log(`✅ FOUND with data: ${data}`);
  }
}

// А может быть, Wellbit вообще не ожидает от нас подписи ответа?
// И это их собственная подпись для их внутренней валидации?
console.log("\n=== Hypothesis ===");
console.log("1. Wellbit might be showing THEIR signature for comparison");
console.log("2. We might need to use a different secret for response signing");
console.log("3. The signature might be based on a different data format");
console.log("4. There might be a bug in Wellbit's documentation/implementation");