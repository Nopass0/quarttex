import { db } from "../db";
import { ServiceRegistry } from "../services/ServiceRegistry";

async function testRedistribution() {
  console.log("=== Testing Payout Redistribution Service ===\n");

  // Check for unassigned payouts
  const unassignedPayouts = await db.payout.findMany({
    where: {
      status: "CREATED",
      traderId: null,
      expireAt: {
        gt: new Date()
      }
    },
    select: {
      id: true,
      numericId: true,
      amount: true,
      bank: true,
      isCard: true,
      merchantId: true
    }
  });

  console.log(`Found ${unassignedPayouts.length} unassigned payouts:`);
  unassignedPayouts.forEach(p => {
    console.log(`  - Payout #${p.numericId}: ${p.amount} RUB, ${p.bank}, ${p.isCard ? 'Card' : 'SBP'}`);
  });

  // Check eligible traders
  const traders = await db.user.findMany({
    where: {
      banned: false,
      trafficEnabled: true,
      balanceRub: {
        gt: 0
      },
      deposit: {
        gte: 1000
      }
    },
    select: {
      id: true,
      email: true,
      balanceRub: true,
      deposit: true,
      trafficEnabled: true,
      maxSimultaneousPayouts: true,
      _count: {
        select: {
          payouts: {
            where: {
              OR: [
                { status: "ACTIVE" },
                { status: "CHECKING" },
                { 
                  status: "CREATED",
                  traderId: { not: null }
                }
              ]
            }
          }
        }
      }
    }
  });

  console.log(`\nFound ${traders.length} eligible traders:`);
  traders.forEach(t => {
    console.log(`  - ${t.email}: Balance=${t.balanceRub} RUB, Active=${t._count.payouts}/${t.maxSimultaneousPayouts}, Traffic=${t.trafficEnabled}`);
  });

  // Check trader-merchant relationships
  if (unassignedPayouts.length > 0 && traders.length > 0) {
    const merchantIds = [...new Set(unassignedPayouts.map(p => p.merchantId))];
    const traderMerchants = await db.traderMerchant.findMany({
      where: {
        merchantId: { in: merchantIds },
        isMerchantEnabled: true
      },
      select: {
        traderId: true,
        merchantId: true,
        feeOut: true
      }
    });

    console.log(`\nTrader-Merchant relationships:`);
    traderMerchants.forEach(tm => {
      const trader = traders.find(t => t.id === tm.traderId);
      if (trader) {
        console.log(`  - ${trader.email} enabled for merchant ${tm.merchantId}, feeOut=${tm.feeOut}%`);
      }
    });
  }

  // Check service logs
  const service = await db.service.findUnique({
    where: { name: "PayoutRedistributionService" },
    include: {
      logs: {
        orderBy: { createdAt: 'desc' },
        take: 10
      }
    }
  });

  if (service) {
    console.log(`\nService status: ${service.status}`);
    console.log(`Last tick: ${service.lastTick}`);
    console.log(`\nRecent logs:`);
    service.logs.forEach(log => {
      console.log(`  [${log.level}] ${log.createdAt.toISOString()}: ${log.message}`);
    });
  }

  process.exit(0);
}

testRedistribution().catch(console.error);