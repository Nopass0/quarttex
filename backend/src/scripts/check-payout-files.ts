import { db } from "../db";

async function checkPayoutFiles() {
  const payoutsWithFiles = await db.payout.findMany({
    where: {
      proofFiles: {
        isEmpty: false
      }
    },
    select: {
      numericId: true,
      proofFiles: true,
      status: true
    }
  });

  console.log("Payouts with proof files:");
  payoutsWithFiles.forEach(p => {
    console.log(`\nPayout #${p.numericId} (${p.status}):`);
    p.proofFiles.forEach(file => {
      console.log(`  - ${file}`);
      console.log(`    Full URL: http://localhost:3000/api/uploads/payouts/${file}`);
    });
  });
}

checkPayoutFiles().then(() => process.exit(0)).catch(console.error);