import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function checkNotifications() {
  try {
    // Count unprocessed notifications
    const unprocessed = await db.notification.count({
      where: {
        isProcessed: false
      }
    });

    console.log(`Unprocessed notifications: ${unprocessed}`);

    // Get the last 5 notifications with "3201"
    const notifications = await db.notification.findMany({
      where: {
        message: {
          contains: "3201"
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    console.log("\nLast 5 notifications with '3201':");
    for (const n of notifications) {
      console.log(`- ${n.id}: isProcessed=${n.isProcessed}, message="${n.message}"`);
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await db.$disconnect();
  }
}

checkNotifications();