import { db } from "../db";

async function checkAssigned() {
  const trader = await db.user.findFirst({
    where: { email: "trader@test.com" },
    include: {
      payouts: {
        where: {
          OR: [
            { status: "ACTIVE" },
            { status: "CHECKING" },
            { status: "CREATED", traderId: { not: null } }
          ]
        },
        select: {
          numericId: true,
          status: true,
          amount: true,
          bank: true
        }
      }
    }
  });

  console.log(`\nTrader ${trader?.email} payouts:`);
  console.table(trader?.payouts);
}

checkAssigned().then(() => process.exit(0)).catch(console.error);