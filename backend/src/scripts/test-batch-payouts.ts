import { db } from "../db";

async function testBatchPayouts() {
  console.log("🧪 Testing batch payouts creation with countInRubEquivalent validation\n");

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

    // Update merchant to test both scenarios
    console.log("\n🔄 Setting countInRubEquivalent = true");
    await db.merchant.update({
      where: { id: testMerchant.id },
      data: { countInRubEquivalent: true }
    });

    console.log("✅ Ready to test via admin API endpoint: POST /admin/payouts/test-multiple");
    console.log("\nExample requests:");
    console.log("1. With countInRubEquivalent = true (current):");
    console.log("   POST /admin/payouts/test-multiple");
    console.log("   Body: { count: 5 }");
    console.log("   ❌ Error if rate is included!");
    
    console.log("\n2. With countInRubEquivalent = false:");
    console.log("   First update merchant, then:");
    console.log("   POST /admin/payouts/test-multiple");
    console.log("   Body: { count: 5, rate: 98.5 }");
    console.log("   ❌ Error if rate is NOT included!");

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await db.$disconnect();
  }
}

testBatchPayouts();