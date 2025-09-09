import { db } from "../db";
import { PayoutService } from "./payout.service";
import { webhookService } from "./webhook.service";
import { Prisma } from "@prisma/client";

/**
 * Extension of PayoutService to implement proper accounting
 * This overrides specific methods to handle RUB/USDT conversions
 */
export class PayoutAccountingService {
  private payoutService = PayoutService.getInstance();

  /**
   * Accept payout with proper RUB deduction
   */
  async acceptPayoutWithAccounting(payoutId: string, traderId: string) {
    // Use transaction with row-level locking to prevent race conditions
    return await db.$transaction(async (tx) => {
      const payout = await tx.payout.findUnique({
        where: { id: payoutId },
        include: { trader: true },
      });

      if (!payout) {
        throw new Error("Payout not found");
      }

      console.log(`[PayoutAccounting] Attempting to accept payout ${payoutId}:`, {
        status: payout.status,
        traderId: payout.traderId,
        requestingTraderId: traderId
      });

      if (payout.status !== "CREATED") {
        throw new Error("Payout is not available for acceptance");
      }

      if (payout.traderId && payout.traderId !== traderId) {
        throw new Error("Payout already accepted by another trader");
      }

      // Check if payout expired
      if (new Date() > payout.expireAt) {
        await tx.payout.update({
          where: { id: payoutId },
          data: { status: "EXPIRED" },
        });
        throw new Error("Payout has expired");
      }

      // Check trader's payout balance
      const trader = await tx.user.findUnique({
        where: { id: traderId },
      });

      if (!trader) {
        throw new Error("Trader not found");
      }

      const amountRUB = payout.amount; // Already in RUB for payouts

      const availablePayoutBalance =
        trader.payoutBalance - trader.frozenPayoutBalance;
      if (availablePayoutBalance < amountRUB) {
        throw new Error(
          `Insufficient payout balance. Required: ${amountRUB}, Available: ${availablePayoutBalance}`
        );
      }

      if (trader.balanceRub < amountRUB) {
        throw new Error(
          `Insufficient RUB balance. Required: ${amountRUB}, Available: ${trader.balanceRub}`
        );
      }

      // Count current payouts for the trader
      const activePayouts = await tx.payout.count({
        where: {
          traderId,
          status: "ACTIVE",
        },
      });

      // Check trader's personal limit
      if (activePayouts >= trader.maxSimultaneousPayouts) {
        throw new Error(`Maximum simultaneous payouts reached (${trader.maxSimultaneousPayouts})`);
      }

      // Calculate sumToWriteOffUSDT from totalUsdt (which already includes fees)
      const sumToWriteOffUSDT = payout.totalUsdt;

      // Accept payout and freeze RUB balance - do both updates in the same transaction
      const updatedPayout = await tx.payout.update({
        where: { id: payoutId },
        data: {
          trader: { connect: { id: traderId } },
          acceptedAt: new Date(),
          status: "ACTIVE",
          sumToWriteOffUSDT,
          // Update expiration based on processing time
          expireAt: new Date(Date.now() + payout.processingTime * 60 * 1000),
        },
      });

      await tx.user.update({
        where: { id: traderId },
        data: {
          balanceRub: { decrement: amountRUB },
          frozenRub: { increment: amountRUB },
          payoutBalance: { decrement: amountRUB },
          frozenPayoutBalance: { increment: amountRUB },
        },
      });

      // Use original service methods for notifications (outside of transaction)
      await Promise.all([
        this.payoutService.sendMerchantWebhook(updatedPayout, "ACTIVE"),
        webhookService.sendPayoutStatusWebhook(updatedPayout, "ACTIVE"),
      ]);

      return updatedPayout;
    });
  }

  /**
   * Cancel payout with RUB return
   */
  async cancelPayoutWithAccounting(
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

    const amountRUB = payout.amount;

    // Return payout to pool and unfreeze RUB balance
    const updates: Prisma.PrismaPromise<any>[] = [
      // Create cancellation history record
      db.payoutCancellationHistory.create({
        data: {
          payoutId,
          traderId,
          reason,
        },
      }),
      // Add to blacklist to prevent reassignment to this trader
      db.payoutBlacklist.upsert({
        where: {
          payoutId_traderId: { payoutId, traderId }
        },
        create: {
          payoutId,
          traderId,
        },
        update: {}, // Do nothing if already exists
      }),
      db.payout.update({
        where: { id: payoutId },
        data: {
          status: "CREATED",
          trader: { disconnect: true }, // Disconnect from trader completely
          acceptedAt: null,
          confirmedAt: null,
          cancelReason: reason,
          cancelReasonCode: reasonCode,
          disputeFiles: files || [],
          disputeMessage: reason,
          sumToWriteOffUSDT: null, // Clear the USDT calculation
        },
      }),
      db.user.update({
        where: { id: traderId },
        data: {
          frozenRub: { decrement: amountRUB },
          balanceRub: { increment: amountRUB }, // Return RUB to balance
          frozenPayoutBalance: { decrement: amountRUB },
          payoutBalance: { increment: amountRUB },
        },
      }),
    ];

    const [updatedPayout] = await db.$transaction(updates);

    // Use original service methods for notifications
    await Promise.all([
      this.payoutService.sendMerchantWebhook(updatedPayout, "returned_to_pool"),
      webhookService.sendPayoutStatusWebhook(updatedPayout, "CANCELLED"),
    ]);

    return updatedPayout;
  }

  /**
   * Complete payout and add USDT to balance
   */
  async completePayoutWithAccounting(payoutId: string, merchantId: string) {
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

    const amountRUB = payout.amount;
    const sumToWriteOffUSDT = payout.sumToWriteOffUSDT || payout.totalUsdt;

    // Complete payout: unfreeze RUB (consume it) and add USDT to main balance
    const [updatedPayout] = await db.$transaction([
      db.payout.update({
        where: { id: payoutId },
        data: { status: "COMPLETED" },
      }),
      db.user.update({
        where: { id: payout.traderId },
        data: {
          frozenRub: { decrement: amountRUB }, // Remove from frozen (consume RUB)
          balanceUsdt: { increment: sumToWriteOffUSDT }, // Add USDT to main balance
          frozenPayoutBalance: { decrement: amountRUB },
          // Profit already added when payout went to CHECKING status
        },
      }),
    ]);

    // Use original service methods for notifications
    await Promise.all([
      this.payoutService.sendMerchantWebhook(updatedPayout, "COMPLETED"),
      webhookService.sendPayoutStatusWebhook(updatedPayout, "COMPLETED"),
    ]);

    return updatedPayout;
  }

  /**
   * Reassign payout to new trader (for redistribution)
   */
  async reassignPayoutWithAccounting(payoutId: string, newTraderId: string) {
    const payout = await db.payout.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      throw new Error("Payout not found");
    }

    if (payout.status !== "CREATED" || payout.traderId !== null) {
      throw new Error("Payout cannot be reassigned in current state");
    }

    // Check new trader's RUB balance
    const trader = await db.user.findUnique({
      where: { id: newTraderId },
    });

    if (!trader) {
      throw new Error("Trader not found");
    }

    const amountRUB = payout.amount;
    
    if (trader.balanceRub < amountRUB) {
      throw new Error(`Insufficient RUB balance. Required: ${amountRUB}, Available: ${trader.balanceRub}`);
    }

    // Calculate sumToWriteOffUSDT
    const sumToWriteOffUSDT = payout.totalUsdt;

    // Assign to new trader and freeze RUB balance
    const [updatedPayout] = await db.$transaction([
      db.payout.update({
        where: { id: payoutId },
        data: {
          trader: { connect: { id: newTraderId } },
          acceptedAt: new Date(),
          status: "ACTIVE",
          sumToWriteOffUSDT,
        },
      }),
      db.user.update({
        where: { id: newTraderId },
        data: {
          balanceRub: { decrement: amountRUB },
          frozenRub: { increment: amountRUB },
        },
      }),
    ]);

    return updatedPayout;
  }

  /**
   * Assign payout to trader WITHOUT accepting it (for distribution)
  */
  async assignPayoutToTrader(payoutId: string, traderId: string) {
    const payout = await db.payout.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      throw new Error("Payout not found");
    }

    if (payout.status !== "CREATED" || payout.traderId !== null) {
      throw new Error("Payout cannot be assigned in current state");
    }

    // Get trader's acceptance time (in minutes), defaulting to 5
    const trader = await db.user.findUnique({
      where: { id: traderId },
      select: { payoutAcceptanceTime: true },
    });

    const acceptanceTime = trader?.payoutAcceptanceTime ?? 5;
    const newExpireAt = new Date(Date.now() + acceptanceTime * 60 * 1000);

    // Assign trader and update expiration/acceptance time without changing status
    const updatedPayout = await db.payout.update({
      where: { id: payoutId },
      data: {
        trader: { connect: { id: traderId } },
        expireAt: newExpireAt,
        acceptanceTime,
      },
    });

    return updatedPayout;
  }
}

// Export singleton instance
export const payoutAccountingService = new PayoutAccountingService();