import { db } from "../db";

async function checkServiceStatus() {
  const service = await db.service.findUnique({
    where: { name: "PayoutMonitorService" }
  });
  
  console.log("PayoutMonitorService status:", service);
  
  // Also check trader eligibility
  const traders = await db.user.findMany({
    where: {
      banned: false,
      trafficEnabled: true,
      balanceRub: { gt: 0 }
    },
    select: {
      id: true,
      email: true,
      balanceRub: true,
      trafficEnabled: true,
      banned: true,
      maxSimultaneousPayouts: true
    }
  });
  
  console.log("\nEligible traders:", traders);
  
  process.exit(0);
}

checkServiceStatus().catch(console.error);
