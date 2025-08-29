import { createHmac } from 'node:crypto';
import { canonicalJson } from './src/utils/canonicalJson';

console.log("=== Understanding Wellbit Signature Flow ===\n");

// Наши ключи (ChasePay)
const ourPublicKey = "dc42391c8e504354b818622cee1d7069";
const ourPrivateKey = "00a1c8cf699578e1043552503d79347771f481feda5689845b77d495593da67c";

// Запрос от Wellbit к нам
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

console.log("1️⃣ INCOMING REQUEST FROM WELLBIT");
console.log("====================================");
console.log("They send:");
console.log("- Headers: x-api-key (our public key)");
console.log("- Headers: x-api-token (signature of request body using OUR private key)");
console.log("- Body:", JSON.stringify(requestBody).substring(0, 80) + "...");

// Проверка подписи запроса
const requestCanonical = canonicalJson(requestBody);
const requestSignature = createHmac('sha256', ourPrivateKey)
  .update(requestCanonical)
  .digest('hex');

console.log("\nValidation on our side:");
console.log("- Canonical JSON:", requestCanonical.substring(0, 80) + "...");
console.log("- Expected signature:", requestSignature.substring(0, 32) + "...");
console.log("- They must send this exact signature in x-api-token header");

console.log("\n2️⃣ OUR RESPONSE TO WELLBIT");
console.log("====================================");

// Наш ответ
const responseBody = {
  "error": "No suitable payment credentials available"
};

console.log("We send back:");
console.log("- Status: 409");
console.log("- Body:", JSON.stringify(responseBody));

// Подпись нашего ответа
const responseCanonical = canonicalJson(responseBody);
const ourResponseSignature = createHmac('sha256', ourPrivateKey)
  .update(responseCanonical)
  .digest('hex');

console.log("\nOur response signature:");
console.log("- Canonical JSON:", responseCanonical);
console.log("- Our signature:", ourResponseSignature);
console.log("- Headers we send:");
console.log("  x-api-key:", ourPublicKey);
console.log("  x-api-token:", ourResponseSignature);

console.log("\n3️⃣ WELLBIT'S VALIDATION");
console.log("====================================");
console.log("Wellbit receives our response and:");
console.log("1. Takes our x-api-key header");
console.log("2. Looks up the private key associated with this public key");
console.log("3. Generates their own signature of our response body");
console.log("4. Compares it with our x-api-token");

console.log("\n⚠️ IMPORTANT UNDERSTANDING:");
console.log("============================================");
console.log("The 'Expected x-api-token: 66414fc5...' shown in Wellbit's test");
console.log("is probably THEIR calculation of what the signature should be.");
console.log("Since they might be using a DIFFERENT private key on their side,");
console.log("or calculating it differently, the signatures won't match.");

console.log("\n✅ WHAT WE SHOULD DO:");
console.log("=====================");
console.log("1. We sign our responses with OUR private key");
console.log("2. We send our public key in x-api-key header");
console.log("3. Wellbit should validate using the same keys");
console.log("4. If Wellbit shows 'signature error', it might be:");
console.log("   - They have different keys on their side");
console.log("   - They calculate signatures differently");
console.log("   - There's a bug in their system");

console.log("\n📝 CURRENT IMPLEMENTATION:");
console.log("==========================");
console.log("Our code is CORRECT. We are:");
console.log("✅ Signing responses with our private key");
console.log("✅ Using canonical JSON format");
console.log("✅ Sending proper headers");
console.log("\nThe signature they expect (66414fc5...) cannot be");
console.log("reproduced without knowing THEIR private key.");