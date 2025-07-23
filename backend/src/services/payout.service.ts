import { db } from "../db";
import type { Payout, PayoutStatus, Prisma } from "@prisma/client";
import { ServiceRegistry } from "./ServiceRegistry";
import { broadcastPayoutUpdate, broadcastRateAdjustment } from "../routes/websocket/payouts";
import type { TelegramService } from "./TelegramService";
import { createHmac } from "node:crypto";

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
      return ServiceRegistry.getInstance().get<TelegramService>("TelegramService");
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
    merchantRate,
    direction = "OUT",
    rateDelta = 0,
    feePercent = 0,
    externalReference,
    processingTime = 15,
    webhookUrl,
    metadata,
  }: {
    merchantId: string;
    amount: number;
    wallet: string;
    bank: string;
    isCard: boolean;
    merchantRate?: number;
    direction?: "IN" | "OUT";
    rateDelta?: number;
    feePercent?: number;
    externalReference?: string;
    processingTime?: number;
    webhookUrl?: string;
    metadata?: any;
  }) {
    // Get merchant to check commission settings
    const merchant = await db.merchant.findUnique({
      where: { id: merchantId },
    });
    
    if (!merchant) {
      throw new Error("Merchant not found");
    }
    
    // For OUT transactions, calculate rate with rateDelta
    let rate = merchantRate || 100; // Default rate if not provided
    if (direction === "OUT") {
      rate = (merchantRate || 100) + rateDelta;
    }
    
    // Calculate USDT amounts
    const amountUsdt = amount / rate;
    
    // Calculate total with fee
    // For OUT transactions: total = amount × rate × (1 + feePercent / 100)
    const total = direction === "OUT" 
      ? amount * (1 + feePercent / 100)
      : amount * (1 + feePercent / 100);
    const totalUsdt = total / rate;
    
    // First check if there are any traders with sufficient RUB balance
    const eligibleTradersCount = await db.user.count({
      where: {
        banned: false,
        trafficEnabled: true,
        balanceRub: {
          gte: amount, // Check RUB balance against payout amount
        },
      },
    });

    if (eligibleTradersCount === 0) {
      throw new Error(`No traders available with sufficient RUB balance. Required: ${amount} RUB`);
    }

    // Create payout with expiration time
    const expireAt = new Date();
    expireAt.setMinutes(expireAt.getMinutes() + processingTime);
    
    const payout = await db.payout.create({
      data: {
        merchantId,
        amount,
        amountUsdt,
        total,
        totalUsdt,
        rate,
        merchantRate,
        rateDelta,
        feePercent,
        direction,
        externalReference,
        wallet,
        bank,
        isCard,
        expireAt,
        processingTime,
        merchantWebhookUrl: webhookUrl,
        merchantMetadata: metadata,
      },
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
      const monitorService = ServiceRegistry.getInstance().get<any>("PayoutMonitorService");
      if (monitorService && monitorService.distributeSpecificPayout) {
        await monitorService.distributeSpecificPayout(payout.id);
      }
    } catch (error) {
      console.log("PayoutMonitorService not available, using fallback distribution");
      
      // Fallback: Find eligible traders, excluding those who previously had this payout
      const traders = await db.user.findMany({
        where: {
          banned: false,
          trafficEnabled: true,
          balanceRub: {
            gte: payout.amount, // Has enough RUB balance
          },
          // Exclude traders who previously had this payout
          id: {
            notIn: payout.previousTraderIds || [],
          },
          // TODO: Add filters for traffic type and banks
        },
        orderBy: {
          createdAt: "asc", // FIFO distribution
        },
      });
      
      console.log(`Distributing payout ${payout.id} to ${traders.length} eligible traders`);
      
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
          await telegramService.notifyTraderNewPayout(trader.id, payoutWithMerchant);
        }
      }
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
    
    // Check trader's RUB balance for payouts
    const trader = await db.user.findUnique({
      where: { id: traderId },
    });
    
    if (!trader || trader.balanceRub < payout.amount) {
      throw new Error(`Insufficient RUB balance. Required: ${payout.amount}, Available: ${trader.balanceRub || 0}`);
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
      throw new Error(`Maximum simultaneous payouts reached (${trader.maxSimultaneousPayouts})`);
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
        },
      }),
    ]);
    
    // Send webhook
    await this.sendMerchantWebhook(updatedPayout, "ACTIVE");
    
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
      await telegramService.notifyTraderPayoutStatusChange(traderId, updatedPayout, "ACTIVE");
      // Notify merchant
      await telegramService.notifyMerchantPayoutStatus(updatedPayout.merchantId, updatedPayout, "ACTIVE");
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
    
    if (payout.status !== "ACTIVE") {
      throw new Error("Payout is not active");
    }
    
    const updatedPayout = await db.payout.update({
      where: { id: payoutId },
      data: {
        status: "CHECKING",
        proofFiles,
        confirmedAt: new Date(),
      },
    });
    
    // Send webhook to merchant
    if (payout.merchantWebhookUrl) {
      await this.sendMerchantWebhook(updatedPayout, "checking");
    }
    
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
      await telegramService.notifyTraderPayoutStatusChange(traderId, updatedPayout, "CHECKING");
      await telegramService.notifyMerchantPayoutStatus(updatedPayout.merchantId, updatedPayout, "CHECKING");
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
          profitFromPayouts: { increment: payout.totalUsdt - payout.amountUsdt },
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
      await telegramService.notifyTraderPayoutStatusChange(payout.traderId, updatedPayout, "COMPLETED");
      await telegramService.notifyMerchantPayoutStatus(updatedPayout.merchantId, updatedPayout, "COMPLETED");
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
      await telegramService.notifyTraderPayoutStatusChange(traderId, updatedPayout, "CANCELLED");
      await telegramService.notifyMerchantPayoutStatus(updatedPayout.merchantId, updatedPayout, "RETURNED");
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
        await telegramService.notifyTraderPayoutStatusChange(payout.traderId, updatedPayout, "CANCELLED");
      }
      await telegramService.notifyMerchantPayoutStatus(updatedPayout.merchantId, updatedPayout, "CANCELLED");
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
      await telegramService.notifyMerchantPayoutStatus(updatedPayout.merchantId, updatedPayout, "DISPUTED");
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
    const baseConditions: Prisma.PayoutWhereInput[] = [];
    
    // Condition 1: Payouts assigned to this trader
    const traderCondition: Prisma.PayoutWhereInput = { traderId };
    if (filters.status?.length) {
      traderCondition.status = { in: filters.status };
    }
    baseConditions.push(traderCondition);
    
    // Condition 2: Available payouts in the pool (only CREATED status)
    // Only show pool payouts when no status filter or when CREATED is included
    if (!filters.status || filters.status.includes("CREATED")) {
      baseConditions.push({
        traderId: null,
        status: "CREATED",
        expireAt: {
          gt: new Date() // Only show non-expired payouts
        }
      });
    }
    
    const where: Prisma.PayoutWhereInput = {
      OR: baseConditions,
    };
    
    // Exclude expired payouts from results
    if (!filters.status || !filters.status.includes("EXPIRED")) {
      where.NOT = {
        AND: [
          { status: "EXPIRED" },
          { traderId: null }
        ]
      };
    }
    
    if (filters.search) {
      // Apply search filter on top of existing conditions
      where.AND = [
        where,
        {
          OR: [
            { wallet: { contains: filters.search, mode: "insensitive" } },
            { bank: { contains: filters.search, mode: "insensitive" } },
            { numericId: parseInt(filters.search) || 0 },
          ]
        }
      ];
    }
    
    const [payouts, total] = await db.$transaction([
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
    const newTotalUsdt = newTotal / newRate;
    
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
      updateData.amountUsdt = amount / (updateData.rate || payout.rate);
    }
    
    // Recalculate total if rate or amount changed
    if (merchantRate !== undefined || amount !== undefined) {
      const newAmount = amount || payout.amount;
      const newRate = updateData.rate || payout.rate;
      updateData.total = newAmount * (1 + payout.feePercent / 100);
      updateData.totalUsdt = updateData.total / newRate;
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
        await telegramService.notifyTraderPayoutStatusChange(updatedPayout.traderId, updatedPayout, "CANCELLED");
      }
      await telegramService.notifyMerchantPayoutStatus(updatedPayout.merchantId, updatedPayout, "CANCELLED");
    }
    
    return updatedPayout;
  }
  
  /**
   * Send webhook to merchant
   */
  async sendMerchantWebhook(payout: Payout, event: string) {
    if (!payout.merchantWebhookUrl) return;

    try {
      const merchant = await db.merchant.findUnique({ where: { id: payout.merchantId } });
      const body = JSON.stringify({
        event,
        payout: {
          id: payout.id,
          numericId: payout.numericId,
          status: payout.status,
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
      });

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
      
      if (!response.ok) {
        console.error(`Webhook failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error("Failed to send webhook:", error);
    }
  }
}

// Register the service instance
ServiceRegistry.register("payout", PayoutService.getInstance());