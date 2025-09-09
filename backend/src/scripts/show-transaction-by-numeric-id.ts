#!/usr/bin/env bun
import { db } from "@/db";

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: bun run src/scripts/show-transaction-by-numeric-id.ts <numericId>");
    process.exit(1);
  }
  const numericId = Number(arg);
  if (!Number.isFinite(numericId)) {
    console.error("numericId must be a number");
    process.exit(1);
  }

  const tx = await db.transaction.findFirst({
    where: { numericId },
    include: { merchant: true, method: true, trader: true, requisites: true },
  });

  if (!tx) {
    console.log(`Transaction with numericId=${numericId} not found`);
    return;
  }

  const baseUsdt = tx.rate ? tx.amount / tx.rate : null;
  console.log(JSON.stringify({
    id: tx.id,
    numericId: tx.numericId,
    status: tx.status,
    amount: tx.amount,
    rate: tx.rate,
    frozenUsdtAmount: tx.frozenUsdtAmount,
    calculatedCommission: tx.calculatedCommission,
    feeInPercent: tx.feeInPercent,
    baseUsdt,
    createdAt: tx.createdAt,
    updatedAt: tx.updatedAt,
  }, null, 2));
}

main().finally(() => process.exit(0));
