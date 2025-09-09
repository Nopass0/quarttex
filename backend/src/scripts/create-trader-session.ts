#!/usr/bin/env bun

import { db } from "../db";
import { randomBytes } from "crypto";

async function createSession() {
  const trader = await db.user.findFirst({
    where: { 
      traderMerchants: { some: { isMerchantEnabled: true } }
    }
  });
  
  if (!trader) {
    console.log("Trader not found");
    return;
  }
  
  // Generate token
  const token = `trader-${randomBytes(16).toString('hex')}`;
  
  // Create session
  const session = await db.session.create({
    data: {
      token,
      ip: "127.0.0.1",
      expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      userId: trader.id
    }
  });
  
  console.log(`Created session for ${trader.email}`);
  console.log(`Token: ${session.token}`);
}

createSession().catch(console.error).finally(() => process.exit(0));