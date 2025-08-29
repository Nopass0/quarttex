import { db } from "./src/db";

async function testDisputeWithFile() {
  console.log("Testing dispute with file upload...\n");

  try {
    // Find a merchant
    const merchant = await db.merchant.findFirst({
      where: {
        token: {
          not: ""
        }
      }
    });

    if (!merchant) {
      console.log("No merchant found");
      return;
    }

    // Find a deal
    const deal = await db.transaction.findFirst({
      where: {
        merchantId: merchant.id,
        traderId: { not: null }
      }
    });

    if (!deal) {
      console.log("No deal found");
      return;
    }

    console.log(`Using merchant: ${merchant.name}`);
    console.log(`Using deal: ${deal.id}\n`);

    // Create dispute without file first (API accepts optional files)
    console.log("Creating dispute...");
    const response = await fetch(`http://localhost:3000/api/merchant/deal-disputes/deal/${deal.id}`, {
      method: "POST",
      headers: {
        "x-merchant-api-key": merchant.token!,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "Test dispute for file upload test"
      })
    });

    const result = await response.json();
    console.log("Response:", JSON.stringify(result, null, 2));

    if (result.success && result.dispute) {
      // Check if file URL is accessible
      const fileUrl = result.dispute.messages[0].attachments[0]?.url;
      if (fileUrl) {
        console.log(`\nChecking file URL: ${fileUrl}`);
        const fileResponse = await fetch(`http://localhost:3000${fileUrl}`);
        console.log(`File access status: ${fileResponse.status}`);
        if (fileResponse.ok) {
          const content = await fileResponse.text();
          console.log(`File content: ${content}`);
        }
      }
    }

  } catch (error) {
    console.error("Error:", error);
  }
}

testDisputeWithFile().catch(console.error);