import { db } from "@/db";
import { Status } from "@prisma/client";

async function testDealDisputeResolve() {
  try {
    console.log("Testing deal dispute resolution...");
    
    // Check if Status enum values are available
    console.log("Status enum values:", {
      READY: Status.READY,
      CANCELED: Status.CANCELED
    });
    
    // Find a test dispute
    const dispute = await db.dealDispute.findFirst({
      where: {
        status: { in: ['OPEN', 'IN_PROGRESS'] }
      },
      include: {
        deal: true
      }
    });
    
    if (!dispute) {
      console.log("No open disputes found to test");
      return;
    }
    
    console.log("Found dispute:", {
      id: dispute.id,
      dealId: dispute.dealId,
      status: dispute.status
    });
    
    // Check if the deal exists
    const deal = await db.transaction.findUnique({
      where: { id: dispute.dealId }
    });
    
    console.log("Deal found:", !!deal);
    if (deal) {
      console.log("Deal status:", deal.status);
    }
    
    // Test the transaction update
    console.log("\nTesting transaction status update...");
    try {
      const testUpdate = await db.transaction.update({
        where: { id: dispute.dealId },
        data: {
          status: Status.READY
        }
      });
      console.log("✅ Transaction update successful");
      
      // Revert the change
      await db.transaction.update({
        where: { id: dispute.dealId },
        data: {
          status: deal!.status
        }
      });
    } catch (error) {
      console.error("❌ Transaction update failed:", error);
    }
    
  } catch (error) {
    console.error("Error testing deal dispute resolve:", error);
  } finally {
    await db.$disconnect();
  }
}

testDealDisputeResolve();