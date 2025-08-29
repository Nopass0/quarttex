import { createHmac } from 'node:crypto';
import { canonicalJson } from './src/utils/canonicalJson';

// Тестовые данные из запроса
const responseBody = {
  "error": "No suitable payment credentials available"
};

// API ключи
const apiKeyPrivate = "00a1c8cf699578e1043552503d79347771f481feda5689845b77d495593da67c";
const apiKeyPublic = "dc42391c8e504354b818622cee1d7069";

// Ожидаемая подпись
const expectedSignature = "66414fc590d26795c3a12a79c2f49a93fc822f5f225298ff7d40fef32d611d63";

console.log("=== Testing Wellbit Signature Generation ===");
console.log("Response body:", JSON.stringify(responseBody));

// Вариант 1: Прямая сериализация
const directJson = JSON.stringify(responseBody);
const directSignature = createHmac('sha256', apiKeyPrivate)
  .update(directJson)
  .digest('hex');
console.log("\n1. Direct JSON:");
console.log("   JSON:", directJson);
console.log("   Signature:", directSignature);
console.log("   Match:", directSignature === expectedSignature);

// Вариант 2: Canonical JSON (текущая реализация)
const canonical = canonicalJson(responseBody);
const canonicalSignature = createHmac('sha256', apiKeyPrivate)
  .update(canonical)
  .digest('hex');
console.log("\n2. Canonical JSON:");
console.log("   JSON:", canonical);
console.log("   Signature:", canonicalSignature);
console.log("   Match:", canonicalSignature === expectedSignature);

// Вариант 3: Только тело как строка
const errorString = "No suitable payment credentials available";
const stringSignature = createHmac('sha256', apiKeyPrivate)
  .update(errorString)
  .digest('hex');
console.log("\n3. Just error string:");
console.log("   String:", errorString);
console.log("   Signature:", stringSignature);
console.log("   Match:", stringSignature === expectedSignature);

// Вариант 4: С разными флагами JSON
const compactJson = JSON.stringify(responseBody, null, 0);
const compactSignature = createHmac('sha256', apiKeyPrivate)
  .update(compactJson)
  .digest('hex');
console.log("\n4. Compact JSON:");
console.log("   JSON:", compactJson);
console.log("   Signature:", compactSignature);
console.log("   Match:", compactSignature === expectedSignature);

// Вариант 5: Форматированный JSON
const prettyJson = JSON.stringify(responseBody, null, 2);
const prettySignature = createHmac('sha256', apiKeyPrivate)
  .update(prettyJson)
  .digest('hex');
console.log("\n5. Pretty JSON:");
console.log("   JSON:", prettyJson);
console.log("   Signature:", prettySignature);
console.log("   Match:", prettySignature === expectedSignature);

// Вариант 6: С пробелом после двоеточия (как в некоторых PHP реализациях)
const phpStyleJson = '{"error": "No suitable payment credentials available"}';
const phpStyleSignature = createHmac('sha256', apiKeyPrivate)
  .update(phpStyleJson)
  .digest('hex');
console.log("\n6. PHP-style JSON (with space after colon):");
console.log("   JSON:", phpStyleJson);
console.log("   Signature:", phpStyleSignature);
console.log("   Match:", phpStyleSignature === expectedSignature);

console.log("\n=== Expected ===");
console.log("Signature:", expectedSignature);