import { createHmac } from 'node:crypto';
import { canonicalJson } from './src/utils/canonicalJson';

// Тестовые данные
const responseBody = {
  "error": "No suitable payment credentials available"
};

// ПРАВИЛЬНЫЕ ключи
const apiKeyPublic = "dc42391c8e504354b818622cee1d7069";
const apiKeyPrivate = "40ad418bc9534184a11bcd75f9582131"; // ПРАВИЛЬНЫЙ приватный ключ!

// Ожидаемая подпись
const expectedSignature = "66414fc590d26795c3a12a79c2f49a93fc822f5f225298ff7d40fef32d611d63";

console.log("=== Testing with CORRECT Private Key ===");
console.log("Public Key:", apiKeyPublic);
console.log("Private Key:", apiKeyPrivate);
console.log("Response body:", JSON.stringify(responseBody));

// Генерируем подпись с правильным ключом
const canonical = canonicalJson(responseBody);
const signature = createHmac('sha256', apiKeyPrivate)
  .update(canonical)
  .digest('hex');

console.log("\nCanonical JSON:", canonical);
console.log("Generated signature:", signature);
console.log("Expected signature: ", expectedSignature);
console.log("Match:", signature === expectedSignature ? "✅ SUCCESS!" : "❌ FAIL");

// Если не совпало, попробуем другие варианты
if (signature !== expectedSignature) {
  console.log("\n=== Trying variations ===");
  
  // Вариант с JSON.stringify
  const directJson = JSON.stringify(responseBody);
  const directSignature = createHmac('sha256', apiKeyPrivate)
    .update(directJson)
    .digest('hex');
  console.log("Direct JSON:", directJson);
  console.log("Signature:", directSignature);
  console.log("Match:", directSignature === expectedSignature ? "✅" : "❌");
}