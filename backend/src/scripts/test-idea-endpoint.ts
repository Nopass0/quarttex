import { db } from "../db";
import bcrypt from "bcrypt";

async function testIdeaEndpoint() {
  try {
    // Create a test trader
    const hashedPassword = await bcrypt.hash("password123", 10);
    
    const trader = await db.user.upsert({
      where: { email: "test-trader@example.com" },
      update: {},
      create: {
        email: "test-trader@example.com",
        password: hashedPassword,
        name: "Test Trader",
        balanceUsdt: 0,
        balanceRub: 0,
      },
    });
    
    console.log("✅ Created test trader:", trader.email);
    
    // Create a session for the trader
    const session = await db.session.create({
      data: {
        token: "test-trader-token-123",
        ip: "127.0.0.1",
        userId: trader.id,
        expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });
    
    console.log("✅ Created test session with token:", session.token);
    
    // Test the endpoints
    const baseUrl = "http://localhost:3001/api/trader";
    const headers = {
      "Authorization": `Bearer ${session.token}`,
      "Content-Type": "application/json",
    };
    
    // Test 1: Submit a new idea
    console.log("\n📝 Testing POST /api/trader/ideas");
    const createResponse = await fetch(`${baseUrl}/ideas`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: "Improve transaction search functionality",
        content: "It would be great if we could search transactions by bank name or card number. This would make it much easier to find specific transactions when dealing with multiple banks.",
      }),
    });
    
    if (createResponse.ok) {
      const result = await createResponse.json();
      console.log("✅ Idea created successfully:", result.idea);
    } else {
      console.error("❌ Failed to create idea:", await createResponse.text());
    }
    
    // Test 2: Get all ideas
    console.log("\n📋 Testing GET /api/trader/ideas");
    const listResponse = await fetch(`${baseUrl}/ideas`, {
      headers,
    });
    
    if (listResponse.ok) {
      const result = await listResponse.json();
      console.log("✅ Ideas retrieved successfully:");
      console.log("Total ideas:", result.pagination.total);
      console.log("Ideas:", result.ideas);
    } else {
      console.error("❌ Failed to get ideas:", await listResponse.text());
    }
    
    // Test 3: Submit another idea
    console.log("\n📝 Testing another POST /api/trader/ideas");
    const createResponse2 = await fetch(`${baseUrl}/ideas`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: "Add dark mode to the interface",
        content: "A dark mode option would be very helpful for traders who work late hours. It would reduce eye strain and make the platform more comfortable to use.",
      }),
    });
    
    if (createResponse2.ok) {
      const result = await createResponse2.json();
      console.log("✅ Second idea created successfully:", result.idea);
      
      // Test 4: Get specific idea
      console.log("\n🔍 Testing GET /api/trader/ideas/:id");
      const getOneResponse = await fetch(`${baseUrl}/ideas/${result.idea.id}`, {
        headers,
      });
      
      if (getOneResponse.ok) {
        const idea = await getOneResponse.json();
        console.log("✅ Retrieved specific idea:", idea);
      } else {
        console.error("❌ Failed to get specific idea:", await getOneResponse.text());
      }
    }
    
    // Test 5: Test validation
    console.log("\n🚫 Testing validation - short title");
    const invalidResponse = await fetch(`${baseUrl}/ideas`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: "Hi",
        content: "This should fail because title is too short",
      }),
    });
    
    if (!invalidResponse.ok) {
      console.log("✅ Validation working correctly:", await invalidResponse.text());
    } else {
      console.error("❌ Validation should have failed but didn't");
    }
    
  } catch (error) {
    console.error("❌ Error during testing:", error);
  } finally {
    await db.$disconnect();
  }
}

// Run the test
testIdeaEndpoint();