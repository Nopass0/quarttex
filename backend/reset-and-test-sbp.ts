import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function resetAndTestSBP() {
  try {
    // Reset all SBP notifications to unprocessed
    const resetCount = await db.notification.updateMany({
      where: {
        message: {
          contains: "SBP"
        }
      },
      data: {
        isProcessed: false
      }
    });
    console.log(`✅ Reset ${resetCount.count} SBP notifications to unprocessed`);

    // Reset the transaction
    await db.transaction.update({
      where: { id: "cmdx1r6kq0657iktfmx8u7uo9" },
      data: { 
        status: "IN_PROGRESS",
        matchedNotificationId: null
      }
    });
    console.log("✅ Reset transaction to IN_PROGRESS");

    // Wait for the NotificationMatcherService to process
    console.log("\nWaiting 3 seconds for NotificationMatcherService to process...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check the result
    const transaction = await db.transaction.findFirst({
      where: {
        id: "cmdx1r6kq0657iktfmx8u7uo9"
      }
    });
    
    const processedNotification = await db.notification.findFirst({
      where: {
        message: {
          contains: "SBP"
        },
        isProcessed: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log("\n" + "=".repeat(50));
    console.log("RESULT:");
    console.log("=".repeat(50));
    console.log(`Transaction status: ${transaction?.status}`);
    console.log(`Matched notification ID: ${transaction?.matchedNotificationId}`);
    
    if (processedNotification) {
      console.log(`\nProcessed notification ID: ${processedNotification.id}`);
      console.log(`Notification message: ${processedNotification.message}`);
    }
    
    if (transaction?.status === "READY") {
      console.log("\n✅ SUCCESS! SBP notification matched with transaction!");
    } else {
      console.log("\n❌ Transaction still IN_PROGRESS");
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await db.$disconnect();
  }
}

resetAndTestSBP();