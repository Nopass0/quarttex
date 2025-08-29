import { db } from "./src/db";

async function testMerchantAPI() {
  try {
    // 1. Check merchant in DB
    const merchant = await db.merchant.findFirst({
      where: { name: "test" }
    });
    
    console.log("=== DATABASE CHECK ===");
    console.log("Merchant name:", merchant?.name);
    console.log("countInRubEquivalent in DB:", merchant?.countInRubEquivalent);
    console.log("Type:", typeof merchant?.countInRubEquivalent);
    
    // 2. Get latest session
    const session = await db.session.findFirst({
      where: { 
        merchantId: merchant?.id,
        type: "MERCHANT"
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!session) {
      console.log("\nNo session found. Creating one...");
      const newSession = await db.session.create({
        data: {
          merchantId: merchant!.id,
          type: "MERCHANT",
          token: "test-token-" + Date.now(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      });
      console.log("Created session with token:", newSession.token);
      
      // Test API call
      const response = await fetch("http://localhost:3000/api/merchant/auth/me", {
        headers: {
          "Authorization": `Bearer ${newSession.token}`
        }
      });
      
      const data = await response.json();
      console.log("\n=== API RESPONSE ===");
      console.log("Full response:", JSON.stringify(data, null, 2));
      console.log("countInRubEquivalent from API:", data.merchant?.countInRubEquivalent);
      console.log("Type:", typeof data.merchant?.countInRubEquivalent);
    } else {
      console.log("\nUsing existing session token:", session.token);
      
      // Test API call
      const response = await fetch("http://localhost:3000/api/merchant/auth/me", {
        headers: {
          "Authorization": `Bearer ${session.token}`
        }
      });
      
      const data = await response.json();
      console.log("\n=== API RESPONSE ===");
      console.log("Full response:", JSON.stringify(data, null, 2));
      console.log("countInRubEquivalent from API:", data.merchant?.countInRubEquivalent);
      console.log("Type:", typeof data.merchant?.countInRubEquivalent);
    }
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}

testMerchantAPI();