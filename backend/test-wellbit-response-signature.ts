import { createHmac } from 'node:crypto';
import { canonicalJson } from './src/utils/canonicalJson';

// Тестовые данные
const responseBody = {
  "error": "No suitable payment credentials available"
};

// API ключи из теста
const apiKeyPrivate = "00a1c8cf699578e1043552503d79347771f481feda5689845b77d495593da67c";
const apiKeyPublic = "dc42391c8e504354b818622cee1d7069";

// Ожидаемая подпись
const expectedSignature = "66414fc590d26795c3a12a79c2f49a93fc822f5f225298ff7d40fef32d611d63";

console.log("=== Analyzing Wellbit Response Signature ===");

// Проверяем различные способы обработки response
function testSignature(description: string, data: any) {
  const signature = createHmac('sha256', apiKeyPrivate)
    .update(data)
    .digest('hex');
  const match = signature === expectedSignature;
  console.log(`\n${description}:`);
  console.log(`  Data: ${data}`);
  console.log(`  Signature: ${signature}`);
  console.log(`  Match: ${match ? '✓' : '✗'}`);
  return match;
}

// Тест 1: Как в текущем коде onAfterHandle
const response = responseBody;
const canonical1 = canonicalJson(
  typeof response === 'string' ? response : JSON.stringify(response)
);
testSignature("Current onAfterHandle logic", canonical1);

// Тест 2: Двойная сериализация (как в тестах)
const canonical2 = canonicalJson(JSON.stringify(responseBody));
testSignature("Double stringify (from tests)", canonical2);

// Тест 3: Прямой объект в canonicalJson
const canonical3 = canonicalJson(responseBody);
testSignature("Direct object to canonicalJson", canonical3);

// Тест 4: Может быть, подпись на основе полного ответа с другими полями?
const fullResponse = {
  ...responseBody,
  timestamp: 1736010919,
};
const canonical4 = canonicalJson(fullResponse);
testSignature("With timestamp", canonical4);

// Тест 5: Попробуем обратную инженерию - какие данные дадут нужную подпись?
console.log("\n=== Reverse Engineering ===");
console.log("Expected signature:", expectedSignature);

// Попробуем найти, что за данные могут дать такую подпись
const testStrings = [
  '{"error":"No suitable payment credentials available"}',
  '"{\\"error\\":\\"No suitable payment credentials available\\"}"',
  'No suitable payment credentials available',
  '409',
  '{"status":409,"error":"No suitable payment credentials available"}',
  '{"code":409,"error":"No suitable payment credentials available"}',
];

for (const str of testStrings) {
  testSignature(`Testing: ${str.substring(0, 50)}...`, str);
}

// Проверим, может быть используется другой private key для ответов
console.log("\n=== Checking if different key is used ===");
const alternativeKeys = [
  apiKeyPublic, // Может быть, публичный ключ используется для подписи ответа?
  "test-key", // Стандартный тестовый ключ
  "", // Пустой ключ
];

for (const key of alternativeKeys) {
  const signature = createHmac('sha256', key)
    .update(canonical1)
    .digest('hex');
  if (signature === expectedSignature) {
    console.log(`✓ Found matching key: "${key}"`);
  }
}