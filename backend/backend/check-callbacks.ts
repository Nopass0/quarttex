import { db } from "./src/db";

async function main() {
  const recent = await db.transaction.findMany({
    where: { status: 'READY' },
    orderBy: { updatedAt: 'desc' },
    take: 3
  });
  
  console.log("Recent READY transactions:", recent.length);
  
  for (const tx of recent) {
    const cbs = await db.callbackHistory.count({
      where: { transactionId: tx.id }
    });
    console.log(tx.id, "callbacks:", cbs);
  }
}

main().then(() => process.exit(0));
