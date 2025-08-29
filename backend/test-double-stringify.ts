import { createHmac } from 'node:crypto';
import { canonicalJson } from './src/utils/canonicalJson';

const responseBody = {
  "error": "Method not available for merchant"
};

const apiKeyPrivate = "40ad418bc9534184a11bcd75f9582131";
const expectedSignature = "7aa4a5926b7d565b5f07912571c857c386e8716c1887491ad10720e96237b007";
const wrongSignature = "67cb7790bd28caac94388405b4525cba86877e212ad9a5c64fc88cc6cc11afbe";

console.log("=== Testing Double Stringify Bug ===\n");

// Правильный способ
const correctCanonical = canonicalJson(responseBody);
const correctSignature = createHmac('sha256', apiKeyPrivate)
  .update(correctCanonical)
  .digest('hex');

console.log("1. CORRECT WAY (object to canonicalJson):");
console.log("   Input:", responseBody);
console.log("   Canonical:", correctCanonical);
console.log("   Signature:", correctSignature);
console.log("   Match expected:", correctSignature === expectedSignature ? "✅" : "❌");

// Неправильный способ (двойная сериализация)
const jsonString = JSON.stringify(responseBody);
const doubleStringified = JSON.stringify(jsonString);
const wrongCanonical1 = canonicalJson(doubleStringified);
const wrongSignature1 = createHmac('sha256', apiKeyPrivate)
  .update(wrongCanonical1)
  .digest('hex');

console.log("\n2. WRONG WAY (double stringify):");
console.log("   JSON string:", jsonString);
console.log("   Double stringified:", doubleStringified);
console.log("   Canonical:", wrongCanonical1);
console.log("   Signature:", wrongSignature1);
console.log("   Match wrong:", wrongSignature1 === wrongSignature ? "✅" : "❌");

// Что происходит в текущем коде
const response = responseBody; // Это объект
const currentCodeCanonical = canonicalJson(
  typeof response === 'string' ? response : JSON.stringify(response)
);
const currentCodeSignature = createHmac('sha256', apiKeyPrivate)
  .update(currentCodeCanonical)
  .digest('hex');

console.log("\n3. CURRENT CODE BEHAVIOR:");
console.log("   Response type:", typeof response);
console.log("   Will use: JSON.stringify(response)");
console.log("   Result:", JSON.stringify(response));
console.log("   Canonical:", currentCodeCanonical);
console.log("   Signature:", currentCodeSignature);
console.log("   This is correct? ", currentCodeSignature === expectedSignature ? "✅" : "❌");

// Но что если response уже строка?
const responseAsString = JSON.stringify(responseBody);
const ifAlreadyString = canonicalJson(
  typeof responseAsString === 'string' ? responseAsString : JSON.stringify(responseAsString)
);
const ifAlreadyStringSignature = createHmac('sha256', apiKeyPrivate)
  .update(ifAlreadyString)
  .digest('hex');

console.log("\n4. IF RESPONSE IS ALREADY STRING:");
console.log("   Response type:", typeof responseAsString);
console.log("   Will use: responseAsString (no stringify)");
console.log("   Input to canonical:", responseAsString);
console.log("   Canonical:", ifAlreadyString);
console.log("   Signature:", ifAlreadyStringSignature);
console.log("   This matches expected? ", ifAlreadyStringSignature === expectedSignature ? "✅" : "❌");

console.log("\n=== CONCLUSION ===");
console.log("The current code in onAfterHandle seems correct.");
console.log("The issue might be that the response is already stringified");
console.log("before it reaches onAfterHandle, or wellbitMerchant has wrong key.");