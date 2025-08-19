import { createHmac } from 'node:crypto';
import { canonicalJson } from './src/utils/canonicalJson';

const responseBody = {
  "error": "Method not available for merchant"
};

// Правильный ключ
const correctPrivateKey = "40ad418bc9534184a11bcd75f9582131";

// Возможные неправильные ключи
const possibleKeys = [
  "00a1c8cf699578e1043552503d79347771f481feda5689845b77d495593da67c", // Старый ключ
  "", // Пустой ключ
  null, // null
  undefined, // undefined
];

const wrongSignature = "67cb7790bd28caac94388405b4525cba86877e212ad9a5c64fc88cc6cc11afbe";
const correctSignature = "7aa4a5926b7d565b5f07912571c857c386e8716c1887491ad10720e96237b007";

console.log("=== Finding Which Key Produces Wrong Signature ===\n");
console.log("Response body:", JSON.stringify(responseBody));
console.log("Wrong signature we're getting:", wrongSignature);
console.log("Correct signature we should get:", correctSignature);

const canonical = canonicalJson(responseBody);
console.log("Canonical JSON:", canonical);

console.log("\nTesting different keys:");

// Test correct key
const correctSig = createHmac('sha256', correctPrivateKey)
  .update(canonical)
  .digest('hex');
console.log("\n✅ Correct key:", correctPrivateKey.substring(0, 20) + "...");
console.log("   Signature:", correctSig);
console.log("   Matches correct:", correctSig === correctSignature ? "✅" : "❌");

// Test possible wrong keys
for (const key of possibleKeys) {
  const keyStr = String(key || '');
  const sig = createHmac('sha256', keyStr)
    .update(canonical)
    .digest('hex');
  
  console.log(`\n${sig === wrongSignature ? '🔴' : '  '} Key: ${keyStr ? keyStr.substring(0, 20) + '...' : '(empty)'}`);
  console.log(`   Signature: ${sig}`);
  console.log(`   Matches wrong: ${sig === wrongSignature ? '✅ FOUND!' : '❌'}`);
  
  if (sig === wrongSignature) {
    console.log("\n⚠️ PROBLEM FOUND!");
    console.log(`The server is using key: "${keyStr}"`);
    console.log(`But it should use: "${correctPrivateKey}"`);
  }
}