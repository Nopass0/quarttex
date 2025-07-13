#!/usr/bin/env bun

import { db } from "../db";

async function listTraders() {
  try {
    const traders = await db.user.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${traders.length} traders:\n`);
    
    for (const trader of traders) {
      console.log(`ID: ${trader.numericId}`);
      console.log(`Email: ${trader.email}`);
      console.log(`Payout Balance: ${trader.payoutBalance} RUB`);
      console.log(`Max Simultaneous Payouts: ${trader.maxSimultaneousPayouts}`);
      console.log(`Traffic Enabled: ${trader.trafficEnabled}`);
      console.log(`---`);
    }

  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

listTraders();