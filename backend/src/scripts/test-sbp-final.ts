import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function testSBPFinal() {
  try {
    // Reset the transaction status first
    await db.transaction.update({
      where: { id: "cmdx1r6kq0657iktfmx8u7uo9" },
      data: { 
        status: "IN_PROGRESS",
        matchedNotificationId: null
      }
    });
    console.log("✅ Reset transaction to IN_PROGRESS");

    // Find the device
    const device = await db.device.findFirst({
      where: {
        userId: "cmdt9397o06lkikq42msq5cru"
      }
    });

    if (!device) {
      console.log("Device not found");
      return;
    }

    // Create a new SBP notification
    const notification = await db.notification.create({
      data: {
        deviceId: device.id,
        packageName: "ru.vtb24.mobilebanking.android",
        application: "ВТБ Онлайн",
        title: "ВТБ Онлайн",
        message: "Поступление 3201р Счет*1234 SBP Баланс 50000р 12:34",
        isRead: false,
        isProcessed: false,
        type: "AppNotification",
        metadata: {}
      }
    });

    console.log("\n✅ Created new SBP notification:");
    console.log(`ID: ${notification.id}`);
    console.log(`Message: ${notification.message}`);
    
    // Wait for processing
    console.log("\nWaiting 5 seconds for NotificationMatcherService to process...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check result
    const updatedNotification = await db.notification.findUnique({
      where: { id: notification.id }
    });
    
    const transaction = await db.transaction.findFirst({
      where: {
        id: "cmdx1r6kq0657iktfmx8u7uo9"
      }
    });
    
    console.log("\n" + "=".repeat(50));
    console.log("RESULT:");
    console.log("=".repeat(50));
    console.log(`Notification processed: ${updatedNotification?.isProcessed}`);
    console.log(`Transaction status: ${transaction?.status}`);
    console.log(`Matched notification ID: ${transaction?.matchedNotificationId}`);
    
    if (transaction?.status === "READY" && transaction?.matchedNotificationId === notification.id) {
      console.log("\n✅ SUCCESS! Transaction matched with SBP notification!");
    } else {
      console.log("\n❌ Transaction still IN_PROGRESS - SBP not matching");
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await db.$disconnect();
  }
}

testSBPFinal();