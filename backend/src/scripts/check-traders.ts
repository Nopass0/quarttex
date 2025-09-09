import { db } from "../db";

async function checkTraders() {
  const traders = await db.user.findMany({
    select: {
      email: true,
      balanceRub: true,
      deposit: true,
      trafficEnabled: true,
      banned: true,
      traderMerchants: {
        select: {
          merchantId: true
        }
      }
    }
  });

  console.log("All traders:");
  console.table(traders);

  // Check why they're not eligible
  for (const trader of traders) {
    console.log(`\n${trader.email}:`);
    if (trader.banned) console.log("  ❌ Banned");
    if (!trader.trafficEnabled) console.log("  ❌ Traffic disabled");
    if (trader.balanceRub <= 0) console.log("  ❌ No RUB balance");
    if (trader.deposit < 1000) console.log("  ❌ Deposit < 1000");
  }
}

checkTraders().then(() => process.exit(0)).catch(console.error);