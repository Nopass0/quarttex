import { db } from "../db";

async function testMerchantRateValidation() {
  console.log("🧪 Testing merchant rate validation for test transactions\n");

  try {
    // Ensure test merchant exists
    let testMerchant = await db.merchant.findFirst({
      where: { name: "test" }
    });

    if (!testMerchant) {
      testMerchant = await db.merchant.create({
        data: {
          name: "test",
          token: `test-${Date.now()}`,
          balanceUsdt: 100000,
          banned: false,
          disabled: false,
          countInRubEquivalent: true, // Set to true for testing
        }
      });
      console.log("✅ Created test merchant with countInRubEquivalent = true");
    } else {
      console.log(`📋 Test merchant exists with countInRubEquivalent = ${testMerchant.countInRubEquivalent}`);
    }

    // Test scenarios
    console.log("\n📊 Test Scenarios:");
    console.log("1. If countInRubEquivalent = true: Should NOT accept rate in request");
    console.log("2. If countInRubEquivalent = false: Should REQUIRE rate in request");

    // Scenario 1: countInRubEquivalent = true
    console.log("\n🔄 Testing Scenario 1: countInRubEquivalent = true");
    await db.merchant.update({
      where: { id: testMerchant.id },
      data: { countInRubEquivalent: true }
    });

    console.log("✅ Updated merchant: countInRubEquivalent = true");
    console.log("\nNow test via admin endpoints:");
    console.log("1. POST /admin/transactions/test/out");
    console.log("   - WITHOUT rate field: ✅ Should succeed");
    console.log("   - WITH rate field: ❌ Should return error 400");
    console.log("2. POST /admin/payouts/test-multiple");
    console.log("   - WITHOUT rate field: ✅ Should succeed");
    console.log("   - WITH rate field: ❌ Should return error 400");

    // Scenario 2: countInRubEquivalent = false
    console.log("\n🔄 Testing Scenario 2: countInRubEquivalent = false");
    await db.merchant.update({
      where: { id: testMerchant.id },
      data: { countInRubEquivalent: false }
    });

    console.log("✅ Updated merchant: countInRubEquivalent = false");
    console.log("\nNow test via admin endpoints:");
    console.log("1. POST /admin/transactions/test/out");
    console.log("   - WITHOUT rate field: ✅ Should succeed (backend will use random rate)");
    console.log("   - WITH rate field: ✅ Should succeed");
    console.log("2. POST /admin/payouts/test-multiple");
    console.log("   - WITHOUT rate field: ❌ Should return error 400");
    console.log("   - WITH rate field: ✅ Should succeed");

    console.log("\n📝 Summary:");
    console.log("- Frontend should NOT send rate for OUT transactions");
    console.log("- Backend will check merchant's countInRubEquivalent setting");
    console.log("- If countInRubEquivalent is true, rate from Rapira will be used");
    console.log("- If countInRubEquivalent is false, rate must be provided or generated");

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await db.$disconnect();
  }
}

testMerchantRateValidation();