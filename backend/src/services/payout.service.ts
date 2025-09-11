import { db } from "../db";
import { webhookService } from "./webhook.service";
import type { Payout, PayoutStatus, Prisma } from "@prisma/client";
import { ServiceRegistry } from "./ServiceRegistry";
import {
  broadcastPayoutUpdate,
  broadcastRateAdjustment,
} from "../routes/websocket/payouts";
import type { TelegramService } from "./TelegramService";
import { createHmac } from "node:crypto";
import { roundDown2, truncate2 } from "../utils/rounding";

export class PayoutService {
  private static instance: PayoutService;

  static getInstance(): PayoutService {
    if (!PayoutService.instance) {
      PayoutService.instance = new PayoutService();
    }
    return PayoutService.instance;
  }

  private getTelegramService(): TelegramService | null {
    try {
      return ServiceRegistry.getInstance().get<TelegramService>(
        "TelegramService"
      );
    } catch {
      return null;
    }
  }
  /**
   * Create a new payout request from merchant
   */
  async createPayout({
    merchantId,
    amount,
    wallet,
    bank,
    isCard,
    methodId,
    merchantRate,
    direction = "OUT",
    rateDelta = 0,
    feePercent = 0,
    externalReference,
    processingTime = 15,
    webhookUrl,
    metadata,
    clientIdentifier,
  }: {
    merchantId: string;
    amount: number;
    wallet: string;
    bank: string;
    isCard: boolean;
    methodId?: string;
    merchantRate?: number;
    direction?: "IN" | "OUT";
    rateDelta?: number;
    feePercent?: number;
    externalReference?: string;
    processingTime?: number;
    webhookUrl?: string;
    metadata?: any;
    clientIdentifier?: string;
  }) {
    //Проверка по всем условиям
    // Get merchant to check commission settings
    const merchant = await db.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      throw new Error("Merchant not found");
    }

    let method = null;
    if (methodId) {
      method = await db.method.findFirst({
        where: { id: methodId, merchantMethods: { some: { merchantId } } },
      });

      if (!method) {
        throw new Error("Method not found");
      }

      if (!method.isEnabled) {
        throw new Error("Method is disabled");
      }

      if (
        (method.minPayout !== 0 || method.minPayin !== 0) &&
        (amount < method.minPayout || amount > method.maxPayout)
      ) {
        throw new Error("Amount is out of range by method limits");
      }

      switch (method.type) {
        case "sbp":
          if (isCard === true) {
            throw new Error("In SBP method should use isCard: false");
          }
          break;
        case "c2c":
          if (isCard === false) {
            throw new Error("In C2C method should use isCard: true");
          }
          break;
        default:
          throw new Error("Invalid method type");
      }
    }

    // Always get the current rate from Rapira for trader calculations
    let rapiraRate: number;
    try {
      const rapiraService = require("../services/rapira.service").rapiraService;
      rapiraRate = await rapiraService.getUsdtRubRate();
    } catch (error) {
      console.error("Failed to get rate from Rapira:", error);
      // Fallback to default rate
      rapiraRate = 85; // Default fallback rate
    }

    // Validate rate based on merchant's countInRubEquivalent setting
    let calculatedMerchantRate: number;

    if (merchant.countInRubEquivalent) {
      // If merchant has RUB calculations enabled, we provide the rate from Rapira
      if (merchantRate !== undefined) {
        throw new Error(
          "Курс не должен передаваться при включенных расчетах в рублях. Курс автоматически получается от системы."
        );
      }
      // Use Rapira rate for merchant
      calculatedMerchantRate = rapiraRate;
    } else {
      // If RUB calculations are disabled, merchant must provide the rate
      if (merchantRate === undefined) {
        throw new Error(
          "Курс обязателен при выключенных расчетах в рублях. Укажите параметр merchantRate."
        );
      }
      calculatedMerchantRate = merchantRate;
    }

    // For OUT transactions, calculate rate with rateDelta for traders
    const traderRate =
      direction === "OUT" ? rapiraRate + rateDelta : rapiraRate;

    // Calculate USDT amounts using the trader rate (this is what will be used for actual calculations)
    // Use Math.trunc to truncate to 2 decimal places without rounding
    const amountUsdt = truncate2(amount / traderRate);

    // Calculate total with fee
    // For OUT transactions: total = amount × (1 + feePercent / 100)
    const total =
      direction === "OUT"
        ? amount * (1 + feePercent / 100)
        : amount * (1 + feePercent / 100);
    const totalUsdt = truncate2(total / traderRate);

    // Create payout with acceptance window (5 minutes to take in work)
    const acceptanceTime = 5;
    const expireAt = new Date(Date.now() + acceptanceTime * 60 * 1000);

    const payout = await db.payout.create({
      data: {
        merchantId,
        amount,
        amountUsdt,
        total,
        totalUsdt,
        rate: traderRate, // Store the trader rate (Rapira rate + rateDelta)
        merchantRate: calculatedMerchantRate, // Store the merchant rate
        rateDelta,
        feePercent,
        direction,
        externalReference,
        clientIdentifier,
        wallet,
        bank,
        isCard,
        ...(methodId ? { methodId } : {}),
        expireAt,
        processingTime,
        acceptanceTime,
        merchantWebhookUrl: webhookUrl,
        merchantMetadata: metadata,
      },
      include: { method: true },
    });

    // Distribute to available traders
    await this.distributePayoutToTraders(payout);

    return payout;
  }

  /**
   * Distribute payout to available traders based on filters
   */
  private async distributePayoutToTraders(payout: Payout) {
    // Trigger the monitor service to distribute this specific payout
    try {
      const monitorService = ServiceRegistry.getInstance().get<any>(
        "PayoutMonitorService"
      );
      if (monitorService && monitorService.distributeSpecificPayout) {
        await monitorService.distributeSpecificPayout(payout.id);
      }
    } catch (error) {
      console.log(
        "PayoutMonitorService not available, using fallback distribution"
      );

      // Get traders connected to this merchant with OUT operations enabled
      const connectedTraders = await db.traderMerchant.findMany({
        where: {
          merchantId: payout.merchantId,
          isMerchantEnabled: true,
          isFeeOutEnabled: true, // Check that OUT operations are enabled
        },
        select: { traderId: true },
      });

      // Если есть метод, проверяем, что есть агрегаторы для этого мерчанта и метода
      if (payout.methodId) {
        const aggregatorMerchants = await db.aggregatorMerchant.findMany({
          where: {
            merchantId: payout.merchantId,
            methodId: payout.methodId,
            isTrafficEnabled: true
          },
          select: { aggregatorId: true }
        });

        if (aggregatorMerchants.length === 0) {
          console.log(`[PayoutService] No aggregators found for merchant ${payout.merchantId} and method ${payout.methodId}`);
          return;
        }
      }

      const traderIds = connectedTraders.map((ct) => ct.traderId);

      // Fallback: Find eligible traders, excluding those who previously had this payout
      const traders = await db.user.findMany({
        where: {
          id: { in: traderIds }, // Only traders connected to the merchant
          banned: false,
          trafficEnabled: true,
          // Exclude traders who previously had this payout
          AND: {
            id: {
              notIn: payout.previousTraderIds || [],
            },
          },
        },
        orderBy: {
          createdAt: "asc", // FIFO distribution
        },
      });

      let eligibleCount = 0;

      // Get merchant info for notifications
      const payoutWithMerchant = await db.payout.findUnique({
        where: { id: payout.id },
        include: { merchant: true },
      });

      if (!payoutWithMerchant) return;

      // Send Telegram notifications to eligible traders
      const telegramService = this.getTelegramService();

      if (telegramService) {
        for (const trader of traders) {
          // Ensure trader has enough payout balance
          const pendingAmount = await db.payout.aggregate({
            where: { traderId: trader.id, status: "CREATED" },
            _sum: { amount: true },
          });
          const assignedTotal =
            trader.frozenPayoutBalance + (pendingAmount._sum.amount || 0);
          if (trader.payoutBalance < assignedTotal + payout.amount) {
            continue;
          }

          eligibleCount++;
          await telegramService.notifyTraderNewPayout(
            trader.id,
            payoutWithMerchant
          );
        }
      }

      console.log(
        `Distributing payout ${payout.id} to ${eligibleCount} eligible traders`
      );
    }
  }

  /**
   * Trader accepts a payout
   */
  async acceptPayout(payoutId: string, traderId: string) {
    const payout = await db.payout.findUnique({
      where: { id: payoutId },
      include: { trader: true },
    });

    if (!payout) {
      throw new Error("Payout not found");
    }

    if (payout.status !== "CREATED") {
      throw new Error("Payout is not available for acceptance");
    }

    if (payout.traderId) {
      throw new Error("Payout already accepted by another trader");
    }

    // Check if payout expired
    if (new Date() > payout.expireAt) {
      await db.payout.update({
        where: { id: payoutId },
        data: { status: "EXPIRED" },
      });
      throw new Error("Payout has expired");
    }

    // Check trader's payout balance
    const trader = await db.user.findUnique({
      where: { id: traderId },
    });

    if (!trader) {
      throw new Error("Trader not found");
    }

    const availablePayoutBalance =
      trader.payoutBalance - trader.frozenPayoutBalance;
    if (availablePayoutBalance < payout.amount) {
      throw new Error(
        `Insufficient payout balance. Required: ${payout.amount}, Available: ${availablePayoutBalance}`
      );
    }

    if (trader.balanceRub < payout.amount) {
      throw new Error(
        `Insufficient RUB balance. Required: ${payout.amount}, Available: ${trader.balanceRub}`
      );
    }

    // Count current payouts for the trader
    const activePayouts = await db.payout.count({
      where: {
        traderId,
        status: "ACTIVE",
      },
    });

    // Check trader's personal limit
    if (activePayouts >= trader.maxSimultaneousPayouts) {
      throw new Error(
        `Maximum simultaneous payouts reached (${trader.maxSimultaneousPayouts})`
      );
    }

    // Accept payout and freeze RUB balance
    const [updatedPayout] = await db.$transaction([
      db.payout.update({
        where: { id: payoutId },
        data: {
          traderId,
          acceptedAt: new Date(),
          status: "ACTIVE",
          // Update expiration based on processing time
          expireAt: new Date(Date.now() + payout.processingTime * 60 * 1000),
        },
      }),
      db.user.update({
        where: { id: traderId },
        data: {
          balanceRub: { decrement: payout.amount },
          frozenRub: { increment: payout.amount },
          payoutBalance: { decrement: payout.amount },
          frozenPayoutBalance: { increment: payout.amount },
        },
      }),
    ]);

    // Send webhooks concurrently
    await Promise.all([
      this.sendMerchantWebhook(updatedPayout, "ACTIVE"),
      webhookService.sendPayoutStatusWebhook(updatedPayout, "ACTIVE"),
    ]);

    // Broadcast WebSocket update
    broadcastPayoutUpdate(
      updatedPayout.id,
      "ACTIVE",
      updatedPayout,
      updatedPayout.merchantId,
      updatedPayout.traderId || undefined
    );

    // Send Telegram notifications
    const telegramService = this.getTelegramService();
    if (telegramService) {
      // Notify trader
      await telegramService.notifyTraderPayoutStatusChange(
        traderId,
        updatedPayout,
        "ACTIVE"
      );
      // Notify merchant
      await telegramService.notifyMerchantPayoutStatus(
        updatedPayout.merchantId,
        updatedPayout,
        "ACTIVE"
      );
    }

    return updatedPayout;
  }

  /**
   * Trader confirms payout with proof
   */
  async confirmPayout(
    payoutId: string,
    traderId: string,
    proofFiles: string[]
  ) {
    const payout = await db.payout.findUnique({
      where: { id: payoutId },
    });

    if (!payout || payout.traderId !== traderId) {
      throw new Error("Payout not found or unauthorized");
    }

    if (!["ACTIVE", "EXPIRED"].includes(payout.status)) {
      throw new Error("Payout is not active");
    }

    // Get trader-merchant specific fee percentage
    const traderMerchant = await db.traderMerchant.findFirst({
      where: {
        traderId: traderId,
        merchantId: payout.merchantId,
        isFeeOutEnabled: true,
      },
    });

    // Calculate profit based on trader's fee percentage using flexible rates
    let profitAmount: number;

    // Import flexible fee calculator
    const {
      getFlexibleFeePercent,
    } = require("../utils/flexible-fee-calculator");

    try {
      // Get flexible fee rate for OUT operation
      const feeOutPercent = await getFlexibleFeePercent(
        payout.traderId!,
        payout.merchantId,
        payout.methodId || "",
        payout.amount,
        "OUT"
      );

      if (feeOutPercent > 0) {
        // Use flexible fee: amount in USDT * (feeOutPercent / 100)
        const amountInUsdt = truncate2(payout.amount / payout.rate);
        const profitBeforeTrunc = amountInUsdt * (feeOutPercent / 100);
        profitAmount = truncate2(profitBeforeTrunc);
        console.log(
          `[Payout ${payoutId}] Using flexible fee ${feeOutPercent}%, amount: ${payout.amount}, rate: ${payout.rate}, amountInUsdt: ${amountInUsdt}, profitBeforeTrunc: ${profitBeforeTrunc}, profit: ${profitAmount} USDT`
        );
      } else {
        // Fallback to original calculation
        const profitBeforeTrunc = payout.totalUsdt - payout.amountUsdt;
        profitAmount = truncate2(profitBeforeTrunc);
        console.log(
          `[Payout ${payoutId}] Using default calculation, totalUsdt: ${payout.totalUsdt}, amountUsdt: ${payout.amountUsdt}, profitBeforeTrunc: ${profitBeforeTrunc}, profit: ${profitAmount} USDT`
        );
      }
    } catch (error) {
      console.error(
        `[Payout ${payoutId}] Error calculating flexible fee:`,
        error
      );
      // Fallback to original calculation
      const profitBeforeTrunc = payout.totalUsdt - payout.amountUsdt;
      profitAmount = truncate2(profitBeforeTrunc);
      console.log(
        `[Payout ${payoutId}] Fallback calculation, totalUsdt: ${payout.totalUsdt}, amountUsdt: ${payout.amountUsdt}, profitBeforeTrunc: ${profitBeforeTrunc}, profit: ${profitAmount} USDT`
      );
    }

    // Update payout status to CHECKING and store profit amount for later
    const [updatedPayout] = await db.$transaction([
      db.payout.update({
        where: { id: payoutId },
        data: {
          status: "CHECKING",
          proofFiles,
          confirmedAt: new Date(),
          // Store the total amount to write off (not just profit)
          // This should be the full totalUsdt as in acceptPayoutWithAccounting
          sumToWriteOffUSDT: payout.totalUsdt,
          // Store profit amount to add when admin approves
          profitAmount: profitAmount,
        },
      }),
    ]);

    // Send webhook to merchant
    if (payout.merchantWebhookUrl) {
      await this.sendMerchantWebhook(updatedPayout, "checking");
    }

    // Send webhook notification
    await webhookService.sendPayoutStatusWebhook(updatedPayout, "CHECKING");

    // Broadcast WebSocket update
    broadcastPayoutUpdate(
      updatedPayout.id,
      "CHECKING",
      updatedPayout,
      updatedPayout.merchantId,
      updatedPayout.traderId || undefined
    );

    // Send Telegram notifications
    const telegramService = this.getTelegramService();
    if (telegramService) {
      await telegramService.notifyTraderPayoutStatusChange(
        traderId,
        updatedPayout,
        "CHECKING"
      );
      await telegramService.notifyMerchantPayoutStatus(
        updatedPayout.merchantId,
        updatedPayout,
        "CHECKING"
      );
    }

    return updatedPayout;
  }

  /**
   * Merchant approves payout
   */
  async approvePayout(payoutId: string, merchantId: string) {
    const payout = await db.payout.findUnique({
      where: { id: payoutId },
      include: { trader: true },
    });

    if (!payout || payout.merchantId !== merchantId) {
      throw new Error("Payout not found or unauthorized");
    }

    if (payout.status !== "CHECKING") {
      throw new Error("Payout is not in checking status");
    }

    if (!payout.traderId) {
      throw new Error("No trader assigned to payout");
    }

    // Complete payout: consume frozen RUB and add USDT to balance
    const [updatedPayout] = await db.$transaction([
      db.payout.update({
        where: { id: payoutId },
        data: { status: "COMPLETED" },
      }),
      db.user.update({
        where: { id: payout.traderId },
        data: {
          frozenRub: { decrement: payout.amount }, // Consume frozen RUB
          balanceUsdt: { increment: payout.totalUsdt }, // Add USDT to balance
          profitFromPayouts: {
            increment: truncate2(payout.totalUsdt - payout.amountUsdt),
          },
        },
      }),
    ]);

    // Send webhook
    await this.sendMerchantWebhook(updatedPayout, "COMPLETED");

    // Broadcast WebSocket update
    broadcastPayoutUpdate(
      updatedPayout.id,
      "COMPLETED",
      updatedPayout,
      updatedPayout.merchantId,
      payout.traderId || undefined
    );

    // Send Telegram notifications
    const telegramService = this.getTelegramService();
    if (telegramService && payout.traderId) {
      await telegramService.notifyTraderPayoutStatusChange(
        payout.traderId,
        updatedPayout,
        "COMPLETED"
      );
      await telegramService.notifyMerchantPayoutStatus(
        updatedPayout.merchantId,
        updatedPayout,
        "COMPLETED"
      );
    }

    return updatedPayout;
  }

  /**
   * Cancel payout with files and reason code (returns to pool)
   */
  async cancelPayoutWithFiles(
    payoutId: string,
    traderId: string,
    reason: string,
    reasonCode?: string,
    files?: string[]
  ) {
    const payout = await db.payout.findUnique({
      where: { id: payoutId },
      include: { merchant: true },
    });

    if (!payout) {
      throw new Error("Payout not found");
    }

    if (payout.traderId !== traderId) {
      throw new Error("Unauthorized");
    }

    if (!["ACTIVE", "CHECKING"].includes(payout.status)) {
      throw new Error("Cannot cancel payout in current status");
    }

    // Return payout to pool and unfreeze trader balance
    const updates: Prisma.PrismaPromise<any>[] = [
      db.payout.update({
        where: { id: payoutId },
        data: {
          status: "CREATED",
          traderId: null,
          acceptedAt: null,
          confirmedAt: null,
          cancelReason: reason,
          cancelReasonCode: reasonCode,
          disputeFiles: files || [],
          disputeMessage: reason,
          // Add trader to previousTraderIds to prevent reassignment
          previousTraderIds: {
            push: traderId,
          },
        },
      }),
      db.user.update({
        where: { id: traderId },
        data: {
          frozenRub: { decrement: payout.amount },
          balanceRub: { increment: payout.amount },
        },
      }),
    ];

    const [updatedPayout] = await db.$transaction(updates);

    // Send webhook to merchant
    if (payout.merchantWebhookUrl) {
      await this.sendMerchantWebhook(updatedPayout, "returned_to_pool");
    }

    // Broadcast WebSocket update - payout returned to pool
    broadcastPayoutUpdate(
      updatedPayout.id,
      "CREATED",
      updatedPayout,
      payout.merchantId,
      undefined // No trader anymore
    );

    // Send notifications
    const telegramService = this.getTelegramService();
    if (telegramService) {
      await telegramService.notifyTraderPayoutStatusChange(
        traderId,
        updatedPayout,
        "CANCELLED"
      );
      await telegramService.notifyMerchantPayoutStatus(
        updatedPayout.merchantId,
        updatedPayout,
        "RETURNED"
      );
    }

    return updatedPayout;
  }

  /**
   * Cancel payout
   */
  async cancelPayout(
    payoutId: string,
    userId: string,
    reason: string,
    isMerchant = false
  ) {
    const payout = await db.payout.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      throw new Error("Payout not found");
    }

    // Check authorization
    if (isMerchant && payout.merchantId !== userId) {
      throw new Error("Unauthorized");
    }

    if (!isMerchant && payout.traderId !== userId) {
      throw new Error("Unauthorized");
    }

    if (payout.status === "COMPLETED" || payout.status === "CANCELLED") {
      throw new Error("Cannot cancel completed or already cancelled payout");
    }

    // If trader had accepted, return frozen balance
    let updates: Prisma.PrismaPromise<any>[] = [
      db.payout.update({
        where: { id: payoutId },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelReason: reason,
        },
      }),
    ];

    if (payout.traderId && payout.status !== "CREATED") {
      updates.push(
        db.user.update({
          where: { id: payout.traderId },
          data: {
            frozenRub: { decrement: payout.amount },
            balanceRub: { increment: payout.amount },
          },
        })
      );
    }

    const [updatedPayout] = await db.$transaction(updates);

    // Send webhook to merchant
    if (payout.merchantWebhookUrl) {
      await this.sendMerchantWebhook(updatedPayout, "cancelled");
    }

    // Broadcast WebSocket update
    broadcastPayoutUpdate(
      updatedPayout.id,
      "CANCELLED",
      updatedPayout,
      payout.merchantId,
      payout.traderId || undefined
    );

    // Send Telegram notifications
    const telegramService = this.getTelegramService();
    if (telegramService) {
      if (payout.traderId) {
        await telegramService.notifyTraderPayoutStatusChange(
          payout.traderId,
          updatedPayout,
          "CANCELLED"
        );
      }
      await telegramService.notifyMerchantPayoutStatus(
        updatedPayout.merchantId,
        updatedPayout,
        "CANCELLED"
      );
    }

    return updatedPayout;
  }

  /**
   * Create dispute for payout
   */
  async createDispute(
    payoutId: string,
    merchantId: string,
    disputeFiles: string[],
    disputeMessage: string
  ) {
    const payout = await db.payout.findUnique({
      where: { id: payoutId },
    });

    if (!payout || payout.merchantId !== merchantId) {
      throw new Error("Payout not found or unauthorized");
    }

    if (payout.status !== "CHECKING") {
      throw new Error("Can only dispute payouts in checking status");
    }

    const updatedPayout = await db.payout.update({
      where: { id: payoutId },
      data: {
        status: "DISPUTED",
        disputeFiles,
        disputeMessage,
      },
    });

    // Send webhook
    await this.sendMerchantWebhook(updatedPayout, "DISPUTED");

    // Broadcast WebSocket update
    broadcastPayoutUpdate(
      updatedPayout.id,
      "DISPUTED",
      updatedPayout,
      updatedPayout.merchantId,
      payout.traderId || undefined
    );

    // Send Telegram notifications
    const telegramService = this.getTelegramService();
    if (telegramService && payout.traderId) {
      await telegramService.notifyTraderDispute(payout.traderId, updatedPayout);
      await telegramService.notifyMerchantPayoutStatus(
        updatedPayout.merchantId,
        updatedPayout,
        "DISPUTED"
      );
    }

    return updatedPayout;
  }

  /**
   * Get payouts for trader
   */
  async getTraderPayouts(
    traderId: string,
    filters: {
      status?: PayoutStatus[];
      search?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    console.log(`[PayoutService.getTraderPayouts] Filters:`, filters);

    // Build base query - only show payouts assigned to this trader
    // As per user requirement: "показывать, возвращать вообще выплаты, которые не привязаны к этому, к данному трейдеру, вообще не нужно. Только те, которые привязались."
    const where: Prisma.PayoutWhereInput = {
      traderId: traderId, // Only show payouts assigned to this trader
      AND: [],
    };

    // Apply status filter if provided
    if (filters.status?.length) {
      where.AND!.push({ status: { in: filters.status } });
      console.log(
        `[PayoutService.getTraderPayouts] Applied status filter:`,
        filters.status
      );
    }

    if (filters.search) {
      // Apply search filter
      where.AND!.push({
        OR: [
          { wallet: { contains: filters.search, mode: "insensitive" } },
          { bank: { contains: filters.search, mode: "insensitive" } },
          { numericId: parseInt(filters.search) || 0 },
        ],
      });
    }

    console.log(
      `[PayoutService.getTraderPayouts] Final where clause:`,
      JSON.stringify(where, null, 2)
    );

    const [payoutsWithMerchant, total] = await db.$transaction([
      db.payout.findMany({
        where,
        include: {
          merchant: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: filters.limit || 20,
        skip: filters.offset || 0,
      }),
      db.payout.count({ where }),
    ]);

    // Get trader-merchant relationships to include fee information
    const merchantIds = [
      ...new Set(payoutsWithMerchant.map((p) => p.merchantId)),
    ];
    const traderMerchants = await db.traderMerchant.findMany({
      where: {
        traderId: traderId,
        merchantId: { in: merchantIds },
        isMerchantEnabled: true,
        isFeeOutEnabled: true,
      },
    });

    console.log(`[PayoutService] TraderMerchant relationships:`, {
      traderId,
      merchantIds,
      found: traderMerchants.map((tm) => ({
        merchantId: tm.merchantId,
        feeOut: tm.feeOut,
        feeIn: tm.feeIn,
        isFeeOutEnabled: tm.isFeeOutEnabled,
      })),
    });

    // Create a map for quick lookup - take the one with highest feeOut for each merchant
    const traderMerchantMap = new Map<string, (typeof traderMerchants)[0]>();
    traderMerchants.forEach((tm) => {
      const existing = traderMerchantMap.get(tm.merchantId);
      if (!existing || tm.feeOut > existing.feeOut) {
        traderMerchantMap.set(tm.merchantId, tm);
      }
    });

    // Add fee information to payouts
    const payouts = payoutsWithMerchant.map((payout) => {
      const traderMerchant = traderMerchantMap.get(payout.merchantId);
      const feeOut = traderMerchant?.feeOut || 0;

      // Calculate actual total to write off based on trader's fee
      const actualTotalUsdt = payout.amountUsdt * (1 + feeOut / 100);

      console.log(
        `[PayoutService] Payout ${payout.numericId} fee calculation:`,
        {
          merchantId: payout.merchantId,
          traderMerchant: traderMerchant
            ? { feeOut: traderMerchant.feeOut, feeIn: traderMerchant.feeIn }
            : null,
          feeOut,
          amountUsdt: payout.amountUsdt,
          actualTotalUsdt,
          profit: actualTotalUsdt - payout.amountUsdt,
        }
      );

      return {
        ...payout,
        traderFeeOut: feeOut,
        actualTotalUsdt: actualTotalUsdt,
      } as typeof payout & { traderFeeOut: number; actualTotalUsdt: number };
    });

    console.log(
      `[PayoutService.getTraderPayouts] Query returned ${payouts.length} payouts`
    );

    return { payouts, total };
  }

  /**
   * Get payout by ID
   */
  async getPayoutById(payoutId: string) {
    return db.payout.findUnique({
      where: { id: payoutId },
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
          },
        },
        trader: {
          select: {
            id: true,
            numericId: true,
            email: true,
          },
        },
        method: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            currency: true,
            commissionPayout: true,
          },
        },
      },
    });
  }

  /**
   * Get merchant payouts
   */
  async getMerchantPayouts(
    merchantId: string,
    filters: {
      status?: PayoutStatus[];
      direction?: "IN" | "OUT";
      dateFrom?: Date;
      dateTo?: Date;
      limit?: number;
      offset?: number;
    }
  ) {
    const where: Prisma.PayoutWhereInput = {
      merchantId,
    };

    if (filters.status?.length) {
      where.status = { in: filters.status };
    }

    if (filters.direction) {
      where.direction = filters.direction;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.createdAt.lte = filters.dateTo;
      }
    }

    const [payouts, total] = await db.$transaction([
      db.payout.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: filters.limit || 20,
        skip: filters.offset || 0,
        include: {
          trader: {
            select: {
              id: true,
              numericId: true,
              email: true,
            },
          },
          method: {
            select: {
              id: true,
              code: true,
              name: true,
              type: true,
              currency: true,
              commissionPayout: true,
            },
          },
          rateAudits: {
            orderBy: { timestamp: "desc" },
            take: 5,
          },
        },
      }),
      db.payout.count({ where }),
    ]);

    return { payouts, total };
  }

  /**
   * Adjust payout rate (admin only)
   */
  async adjustPayoutRate(
    payoutId: string,
    adminId: string,
    rateDelta?: number,
    feePercent?: number
  ) {
    const payout = await db.payout.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      throw new Error("Payout not found");
    }

    if (payout.direction !== "OUT") {
      throw new Error("Rate adjustment only allowed for OUT transactions");
    }

    if (payout.status !== "CREATED" && payout.status !== "ACTIVE") {
      throw new Error("Cannot adjust rate for this payout status");
    }

    // Validate inputs
    if (rateDelta !== undefined && Math.abs(rateDelta) > 20) {
      throw new Error("Rate delta must be between -20 and 20");
    }

    if (feePercent !== undefined && feePercent > 100) {
      throw new Error("Fee percent cannot exceed 100");
    }

    const oldRateDelta = payout.rateDelta;
    const oldFeePercent = payout.feePercent;
    const newRateDelta = rateDelta ?? oldRateDelta;
    const newFeePercent = feePercent ?? oldFeePercent;

    // Recalculate rate and total
    const newRate = (payout.merchantRate || payout.rate) + newRateDelta;
    const newTotal = payout.amount * newRate * (1 + newFeePercent / 100);
    const newTotalUsdt = truncate2(newTotal / newRate);

    // Update payout
    const updatedPayout = await db.payout.update({
      where: { id: payoutId },
      data: {
        rateDelta: newRateDelta,
        feePercent: newFeePercent,
        rate: newRate,
        total: newTotal,
        totalUsdt: newTotalUsdt,
      },
    });

    // Create audit log
    await db.payoutRateAudit.create({
      data: {
        payoutId,
        oldRateDelta,
        newRateDelta,
        oldFeePercent,
        newFeePercent,
        adminId,
      },
    });

    // Emit WebSocket event RATE_UPDATED
    broadcastRateAdjustment(
      payoutId,
      oldRateDelta,
      newRateDelta,
      oldFeePercent,
      newFeePercent,
      adminId
    );

    broadcastPayoutUpdate(
      updatedPayout.id,
      "RATE_ADJUSTED",
      updatedPayout,
      updatedPayout.merchantId,
      updatedPayout.traderId || undefined
    );

    return updatedPayout;
  }

  /**
   * Update payout rate (merchant)
   */
  async updatePayoutRate(
    payoutId: string,
    merchantId: string,
    merchantRate?: number,
    amount?: number
  ) {
    const payout = await db.payout.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      throw new Error("Payout not found");
    }

    if (payout.merchantId !== merchantId) {
      throw new Error("Unauthorized");
    }

    if (payout.status !== "CREATED") {
      throw new Error("Cannot update rate after payout is accepted");
    }

    const updateData: any = {};

    if (merchantRate !== undefined) {
      updateData.merchantRate = merchantRate;
      // Recalculate rate with existing rateDelta
      updateData.rate = merchantRate + payout.rateDelta;
    }

    if (amount !== undefined) {
      updateData.amount = amount;
      updateData.amountUsdt = truncate2(
        amount / (updateData.rate || payout.rate)
      );
    }

    // Recalculate total if rate or amount changed
    if (merchantRate !== undefined || amount !== undefined) {
      const newAmount = amount || payout.amount;
      const newRate = updateData.rate || payout.rate;
      updateData.total = newAmount * (1 + payout.feePercent / 100);
      updateData.totalUsdt = truncate2(updateData.total / newRate);
    }

    const updatedPayout = await db.payout.update({
      where: { id: payoutId },
      data: updateData,
    });

    return updatedPayout;
  }

  /**
   * Cancel payout (merchant)
   */
  async cancelPayoutByMerchant(
    payoutId: string,
    merchantId: string,
    reasonCode: string
  ) {
    const payout = await db.payout.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      throw new Error("Payout not found");
    }

    if (payout.merchantId !== merchantId) {
      throw new Error("Unauthorized");
    }

    if (payout.status !== "CREATED") {
      throw new Error("Cannot cancel payout in current status");
    }

    const updatedPayout = await db.payout.update({
      where: { id: payoutId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelReasonCode: reasonCode,
        cancelReason: `Cancelled by merchant: ${reasonCode}`,
      },
    });

    // Send webhook
    await this.sendMerchantWebhook(updatedPayout, "CANCELLED");

    // Broadcast WebSocket update
    broadcastPayoutUpdate(
      updatedPayout.id,
      "CANCELLED",
      updatedPayout,
      updatedPayout.merchantId,
      updatedPayout.traderId || undefined
    );

    // Send Telegram notifications
    const telegramService = this.getTelegramService();
    if (telegramService) {
      if (updatedPayout.traderId) {
        await telegramService.notifyTraderPayoutStatusChange(
          updatedPayout.traderId,
          updatedPayout,
          "CANCELLED"
        );
      }
      await telegramService.notifyMerchantPayoutStatus(
        updatedPayout.merchantId,
        updatedPayout,
        "CANCELLED"
      );
    }

    return updatedPayout;
  }

  /**
   * Admin rejects a payout in CHECKING status
   */
  async adminRejectPayout(payoutId: string, reason: string) {
    const payout = await db.payout.findUnique({
      where: { id: payoutId },
      include: { trader: true },
    });

    if (!payout) {
      throw new Error("Payout not found");
    }

    if (payout.status !== "CHECKING") {
      throw new Error("Payout must be in CHECKING status to reject");
    }

    if (!payout.traderId) {
      throw new Error("No trader assigned to payout");
    }

    // Calculate profit amount - now sumToWriteOffUSDT contains the full amount, not just profit
    const profitAmount = truncate2(payout.totalUsdt - payout.amountUsdt);

    // Get trader's current balances
    const trader = await db.user.findUnique({
      where: { id: payout.traderId },
    });

    if (!trader) {
      throw new Error("Trader not found");
    }

    // Prepare balance updates
    const balanceUpdates: any = {
      profitFromPayouts: { decrement: profitAmount },
    };

    // Check if we need to use other balance sources
    let remainingDebt = 0;

    if (trader.profitFromPayouts < profitAmount) {
      // Not enough profit to cover the reversal
      remainingDebt = profitAmount - trader.profitFromPayouts;
      balanceUpdates.profitFromPayouts = 0; // Set to 0 instead of negative

      // Try to deduct from balanceUsdt
      if (remainingDebt > 0 && trader.balanceUsdt > 0) {
        const deductFromUsdt = Math.min(remainingDebt, trader.balanceUsdt);
        balanceUpdates.balanceUsdt = { decrement: deductFromUsdt };
        remainingDebt -= deductFromUsdt;
      }

      // Try to deduct from deposit
      if (remainingDebt > 0 && trader.deposit > 0) {
        const deductFromDeposit = Math.min(remainingDebt, trader.deposit);
        balanceUpdates.deposit = { decrement: deductFromDeposit };
        remainingDebt -= deductFromDeposit;
      }
    }

    // Log the rejection and balance adjustment
    console.log(
      `[PayoutService.adminRejectPayout] Rejecting payout ${payoutId}:`,
      {
        reason,
        profitToReverse: profitAmount,
        traderBalances: {
          profitFromPayouts: trader.profitFromPayouts,
          balanceUsdt: trader.balanceUsdt,
          deposit: trader.deposit,
        },
        remainingDebt,
        balanceUpdates,
      }
    );

    // Update payout status back to ACTIVE and reverse profit
    const [updatedPayout] = await db.$transaction([
      db.payout.update({
        where: { id: payoutId },
        data: {
          status: "ACTIVE",
          proofFiles: [], // Clear proof files
          confirmedAt: null, // Clear confirmation timestamp
          disputeMessage: reason, // Store rejection reason
        },
      }),
      db.user.update({
        where: { id: payout.traderId },
        data: balanceUpdates,
      }),
    ]);

    // Send webhook to merchant
    if (payout.merchantWebhookUrl) {
      await this.sendMerchantWebhook(updatedPayout, "rejected");
    }

    // Broadcast WebSocket update
    broadcastPayoutUpdate(
      updatedPayout.id,
      "ACTIVE",
      updatedPayout,
      updatedPayout.merchantId,
      payout.traderId
    );

    // Send Telegram notifications
    const telegramService = this.getTelegramService();
    if (telegramService && payout.traderId) {
      await telegramService.notifyTraderPayoutStatusChange(
        payout.traderId,
        updatedPayout,
        "ACTIVE"
      );
      await telegramService.notifyMerchantPayoutStatus(
        updatedPayout.merchantId,
        updatedPayout,
        "ACTIVE"
      );
    }

    return updatedPayout;
  }

  /**
   * Send webhook to merchant
   */
  async sendMerchantWebhook(payout: Payout, event: string) {
    if (!payout.merchantWebhookUrl) return;

    let responseText: string | null = null;
    let statusCode: number | null = null;
    let errorMessage: string | null = null;

    const payload = {
      event,
      payout: {
        id: payout.id,
        numericId: payout.numericId,
        status: event,
        amount: payout.amount,
        amountUsdt: payout.amountUsdt,
        wallet: payout.wallet,
        bank: payout.bank,
        externalReference: payout.externalReference,
        proofFiles: payout.proofFiles,
        disputeFiles: payout.disputeFiles,
        disputeMessage: payout.disputeMessage,
        cancelReason: payout.cancelReason,
        cancelReasonCode: payout.cancelReasonCode,
        metadata: payout.merchantMetadata,
      },
    };

    try {
      const merchant = await db.merchant.findUnique({
        where: { id: payout.merchantId },
      });

      const body = JSON.stringify(payload);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (merchant?.apiKeyPublic && merchant.apiKeyPrivate) {
        const sig = createHmac("sha256", merchant.apiKeyPrivate)
          .update(body)
          .digest("hex");
        headers["x-api-key"] = merchant.apiKeyPublic;
        headers["x-api-token"] = sig;
      }

      const response = await fetch(payout.merchantWebhookUrl, {
        method: "POST",
        headers,
        body,
      });

      statusCode = response.status;
      responseText = await response.text();

      if (!response.ok) {
        errorMessage = `Webhook failed: ${response.status} ${response.statusText}`;
        console.error(`[Webhook] ${errorMessage}`);
      }
    } catch (error: any) {
      errorMessage = error.message;
      console.error("Failed to send webhook:", error);
    }

    try {
      await db.payoutCallbackHistory.create({
        data: {
          payoutId: payout.id,
          url: payout.merchantWebhookUrl,
          payload,
          response: responseText,
          statusCode,
          error: errorMessage ?? undefined,
        },
      });
    } catch (dbError) {
      console.error(`[Webhook] Error saving callback history:`, dbError);
    }
  }
}

// Register the service instance
ServiceRegistry.register("payout", PayoutService.getInstance());
