#!/usr/bin/env bun

import { db } from "../db";

async function getTraderToken() {
  const trader = await db.user.findFirst({
    where: { email: "trader@test.com" }
  });
  
  if (trader) {
    console.log(`Token: ${trader.token}`);
  } else {
    console.log("Trader not found");
  }
}

getTraderToken().catch(console.error).finally(() => process.exit(0));