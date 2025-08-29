import { getBankTypeFromPattern } from "./src/services/bank-patterns";

// Test that СБП is correctly mapped to SBP
const result = getBankTypeFromPattern("СБП");
console.log(`getBankTypeFromPattern("СБП") = "${result}"`);
console.log(`Expected: "SBP"`);
console.log(`Match: ${result === "SBP" ? "✅" : "❌"}`);