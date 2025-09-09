#!/usr/bin/env bun

import { db } from "../db";

async function checkLink() {
  const transaction = await db.transaction.findFirst({
    where: { numericId: 40 },
    include: { matchedNotification: true }
  });
  
  console.log("Transaction ID:", transaction?.id);
  console.log("Status:", transaction?.status);
  console.log("Matched Notification ID:", transaction?.matchedNotificationId);
  console.log("Has matchedNotification:", !!transaction?.matchedNotification);
  
  if (transaction?.matchedNotification) {
    console.log("\nNotification details:");
    console.log("ID:", transaction.matchedNotification.id);
    console.log("Message:", transaction.matchedNotification.message);
  }
}

checkLink().catch(console.error).finally(() => process.exit(0));