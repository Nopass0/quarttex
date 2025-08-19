import { db } from "@/db";
import {
  Status,
  TransactionType,
  PayoutStatus,
  SettleRequestStatus,
} from "@prisma/client";
import { roundDown2 } from "@/utils/rounding";

interface MerchantInfo {
  id: string;
  countInRubEquivalent: boolean;
}

export async function calculateMerchantBalance(merchant: MerchantInfo) {
  const successfulDeals = await db.transaction.findMany({
    where: {
      merchantId: merchant.id,
      type: TransactionType.IN,
      status: Status.READY,
    },
    select: {
      amount: true,
      methodId: true,
      merchantRate: true,
      rate: true,
    },
  });

  const completedPayouts = await db.payout.findMany({
    where: {
      merchantId: merchant.id,
      status: PayoutStatus.COMPLETED,
    },
    select: {
      amount: true,
      methodId: true,
      merchantRate: true,
      rate: true,
      feePercent: true,
      method: {
        select: { commissionPayout: true },
      },
    },
  });

  const completedSettles = await db.settleRequest.findMany({
    where: {
      merchantId: merchant.id,
      status: SettleRequestStatus.COMPLETED,
    },
    select: {
      amount: true,
      amountUsdt: true,
    },
  });

  const methodIds = [
    ...new Set(
      [
        ...successfulDeals.map((d) => d.methodId),
        ...completedPayouts.map((p) => p.methodId),
      ].filter((id): id is string => Boolean(id))
    ),
  ];

  const methods = await db.method.findMany({
    where: { id: { in: methodIds } },
    select: {
      id: true,
      commissionPayin: true,
      commissionPayout: true,
    },
  });
  const methodMap = new Map(methods.map((m) => [m.id, m]));

  const rateSettings = await db.rateSettings.findMany({
    where: { methodId: { in: methodIds } },
    select: { methodId: true, kkkPercent: true },
  });
  const rateSettingsMap = new Map(rateSettings.map((r) => [r.methodId, r]));

  let balance = 0;
  let balanceUsdt = 0;

  for (const deal of successfulDeals) {
    const method = methodMap.get(deal.methodId);
    if (!method) continue;
    const commission = deal.amount * (method.commissionPayin / 100);
    const net = deal.amount - commission;
    balance += net;

    let effectiveRate = deal.merchantRate;
    if (!deal.merchantRate && deal.rate) {
      const kkkPercent = rateSettingsMap.get(deal.methodId)?.kkkPercent || 0;
      effectiveRate = deal.rate / (1 + kkkPercent / 100);
    }

    if (!merchant.countInRubEquivalent && effectiveRate && effectiveRate > 0) {
      const dealUsdt = deal.amount / effectiveRate;
      const commissionUsdt = dealUsdt * (method.commissionPayin / 100);
      const netUsdt = dealUsdt - commissionUsdt;
      const truncated = roundDown2(netUsdt);
      balanceUsdt += truncated;
    }
  }

  for (const payout of completedPayouts) {
    const commissionPercent =
      payout.method?.commissionPayout ?? payout.feePercent ?? 0;
    const commissionAmount = payout.amount * (commissionPercent / 100);
    const totalAmount = payout.amount + commissionAmount;
    balance -= totalAmount;

    let effectiveRate = payout.merchantRate;
    if (!payout.merchantRate && payout.rate) {
      const kkkPercent = rateSettingsMap.get(payout.methodId)?.kkkPercent || 0;
      effectiveRate = payout.rate / (1 + kkkPercent / 100);
    }

    if (!merchant.countInRubEquivalent && effectiveRate && effectiveRate > 0) {
      const payoutUsdt = payout.amount / effectiveRate;
      const commissionUsdt = payoutUsdt * (commissionPercent / 100);
      const totalUsdt = payoutUsdt + commissionUsdt;
      const truncated = roundDown2(totalUsdt);
      balanceUsdt -= truncated;
    }
  }

  let totalSettledUsdt = 0;
  for (const settle of completedSettles) {
    balance -= settle.amount;
    if (!merchant.countInRubEquivalent && settle.amountUsdt) {
      const truncated = roundDown2(settle.amountUsdt);
      totalSettledUsdt += truncated;
    }
  }

  if (!merchant.countInRubEquivalent) {
    balanceUsdt -= totalSettledUsdt;
  }

  return {
    total: balance,
    totalUsdt: merchant.countInRubEquivalent ? undefined : balanceUsdt,
  };
}
