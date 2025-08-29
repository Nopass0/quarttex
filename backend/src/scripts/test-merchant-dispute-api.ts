import { db } from "../db";

async function testMerchantDisputeAPI() {
  console.log("Testing Merchant Dispute API Endpoints...\n");

  try {
    // Find a merchant with API key
    const merchant = await db.merchant.findFirst({
      where: {
        token: {
          not: ""
        }
      }
    });

    if (!merchant) {
      console.log("No merchant with API key found");
      return;
    }

    console.log(`Testing with merchant: ${merchant.name}`);
    console.log(`API Key: ${merchant.token}\n`);

    // Find a deal that can be disputed
    const deal = await db.transaction.findFirst({
      where: {
        merchantId: merchant.id,
        status: { in: ["IN_PROGRESS", "READY"] },
        traderId: { not: null }
      }
    });

    if (!deal) {
      console.log("No eligible deal found for dispute");
      return;
    }

    console.log(`Found deal: ${deal.id}`);
    console.log(`Amount: ${deal.amount}`);
    console.log(`Status: ${deal.status}\n`);

    // Test creating a dispute
    console.log("Testing deal dispute creation...");
    const createResponse = await fetch("http://localhost:3000/api/merchant/deal-disputes/deal/" + deal.id, {
      method: "POST",
      headers: {
        "x-merchant-api-key": merchant.token!,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "Test dispute from API"
      })
    });

    console.log("Response status:", createResponse.status);
    const createResult = await createResponse.json();
    console.log("Response:", JSON.stringify(createResult, null, 2));

    if (createResult.success && createResult.dispute) {
      const disputeId = createResult.dispute.id;
      
      // Test getting dispute details
      console.log("\nTesting get dispute details...");
      const getResponse = await fetch(`http://localhost:3000/api/merchant/deal-disputes/${disputeId}`, {
        headers: {
          "x-merchant-api-key": merchant.token!
        }
      });
      
      console.log("Get response status:", getResponse.status);
      const getResult = await getResponse.json();
      console.log("Dispute details:", JSON.stringify(getResult, null, 2));

      // Test sending a message
      console.log("\nTesting send message to dispute...");
      const messageResponse = await fetch(`http://localhost:3000/api/merchant/deal-disputes/${disputeId}/messages`, {
        method: "POST",
        headers: {
          "x-merchant-api-key": merchant.token!,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: "Follow-up message from API"
        })
      });

      console.log("Message response status:", messageResponse.status);
      const messageResult = await messageResponse.json();
      console.log("Message result:", JSON.stringify(messageResult, null, 2));
    }

    // Test payout dispute endpoints
    console.log("\n--- Testing Payout Dispute API ---\n");
    
    const payout = await db.payout.findFirst({
      where: {
        merchantId: merchant.id,
        traderId: { not: null }
      }
    });

    if (payout) {
      console.log(`Found payout: ${payout.id}`);
      console.log(`Amount: ${payout.amount}`);
      
      const payoutDisputeResponse = await fetch(`http://localhost:3000/api/merchant/payout-disputes/payout/${payout.id}`, {
        method: "POST",
        headers: {
          "x-merchant-api-key": merchant.token!,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: "Test payout dispute from API"
        })
      });

      console.log("Payout dispute response status:", payoutDisputeResponse.status);
      const payoutResult = await payoutDisputeResponse.json();
      console.log("Payout dispute result:", JSON.stringify(payoutResult, null, 2));
    } else {
      console.log("No eligible payout found for dispute");
    }

  } catch (error) {
    console.error("Error:", error);
  }
}

testMerchantDisputeAPI().catch(console.error);