import { createHmac } from 'node:crypto';
import { canonicalJson } from './src/utils/canonicalJson';
import { db } from './src/db';

async function testActualResponse() {
  // Найдем мерчанта с правильными ключами
  const merchant = await db.merchant.findFirst({
    where: {
      apiKeyPublic: "dc42391c8e504354b818622cee1d7069"
    }
  });

  if (!merchant) {
    console.log("Merchant not found!");
    return;
  }

  console.log("=== Testing Actual Response Signature Generation ===");
  console.log("Merchant:", merchant.name);
  console.log("Public Key:", merchant.apiKeyPublic);
  console.log("Private Key:", merchant.apiKeyPrivate);

  // Ответ, который мы отправляем
  const responseBody = {
    "error": "No suitable payment credentials available"
  };

  console.log("\nResponse body:", JSON.stringify(responseBody));

  // Как генерируется подпись в onAfterHandle
  const response = responseBody;
  const canonical = canonicalJson(
    typeof response === 'string' ? response : JSON.stringify(response)
  );
  const signature = createHmac('sha256', merchant.apiKeyPrivate || '')
    .update(canonical)
    .digest('hex');

  console.log("\n=== Our signature generation ===");
  console.log("Canonical JSON:", canonical);
  console.log("Generated signature:", signature);
  console.log("Expected signature:  66414fc590d26795c3a12a79c2f49a93fc822f5f225298ff7d40fef32d611d63");
  console.log("Match:", signature === "66414fc590d26795c3a12a79c2f49a93fc822f5f225298ff7d40fef32d611d63" ? "✅" : "❌");

  // Теперь давайте посмотрим, что если Wellbit ожидает, что мы НЕ подписываем ответ об ошибке?
  // Или подписываем по-другому?
  console.log("\n=== Alternative approaches ===");
  
  // 1. Возможно, для ошибок не нужна подпись?
  console.log("1. Maybe error responses don't need signature?");
  
  // 2. Возможно, нужно использовать пустую строку для ошибок?
  const emptySignature = createHmac('sha256', merchant.apiKeyPrivate || '')
    .update('')
    .digest('hex');
  console.log("2. Empty string signature:", emptySignature);
  
  // 3. Возможно, нужно использовать другой формат?
  const errorOnlySignature = createHmac('sha256', merchant.apiKeyPrivate || '')
    .update('No suitable payment credentials available')
    .digest('hex');
  console.log("3. Error message only:", errorOnlySignature);
  
  // 4. Посмотрим, что если это их подпись для сравнения (они используют свой ключ)
  console.log("\n=== Important Note ===");
  console.log("The 'Expected x-api-token' shown in the test might be:");
  console.log("1. Wellbit's own signature for their internal validation");
  console.log("2. A signature they expect us to match (but we don't have their private key)");
  console.log("3. A bug in their test system");
  console.log("\nOur response should use OUR private key to sign the response.");
  
  process.exit(0);
}

testActualResponse();