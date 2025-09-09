import { Elysia, t } from "elysia";
import { db } from "@/db";
import { WithdrawalStatus } from "@prisma/client";
import { sendWebhook } from "@/utils/webhook";
import { roundDown2 } from "@/utils/rounding";

export const adminWithdrawalsRoutes = new Elysia({ prefix: "/withdrawals" })
  .get("/", async ({ query }) => {
    const page = parseInt(query.page || "1");
    const limit = parseInt(query.limit || "20");
    const status = query.status as WithdrawalStatus | undefined;
    
    const where = status ? { status } : undefined;
    
    const [withdrawals, total] = await Promise.all([
      db.withdrawalRequest.findMany({
        where,
        include: {
          trader: {
            select: {
              id: true,
              email: true,
              name: true,
              numericId: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      db.withdrawalRequest.count({ where })
    ]);

    return {
      success: true,
      data: withdrawals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  })
  .get("/:id", async ({ params }) => {
    const withdrawal = await db.withdrawalRequest.findUnique({
      where: { id: params.id },
      include: {
        trader: {
          select: {
            id: true,
            email: true,
            name: true,
            numericId: true,
            trustBalance: true,
            payoutBalance: true,
            profitFromDeals: true,
            profitFromPayouts: true
          }
        }
      }
    });

    if (!withdrawal) {
      throw new Error("Withdrawal request not found");
    }

    return {
      success: true,
      data: withdrawal
    };
  })
  .post("/:id/approve", async ({ params, body, set, request }) => {
    const { txHash } = body;
    
    const withdrawal = await db.withdrawalRequest.findUnique({
      where: { id: params.id },
      include: { trader: true }
    });

    if (!withdrawal) {
      set.status = 404;
      return {
        success: false,
        error: "Withdrawal request not found"
      };
    }

    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      set.status = 400;
      return {
        success: false,
        error: "Can only approve pending withdrawals"
      };
    }

    // Update withdrawal status and process balance changes
    await db.$transaction(async (tx) => {
      await tx.withdrawalRequest.update({
        where: { id: params.id },
        data: {
          status: WithdrawalStatus.APPROVED,
          adminId: "admin",
          txHash,
          processedAt: new Date()
        }
      });

      // For TRUST balance, the trustBalance was already deducted on request creation.
      // On approval we only release (decrement) the frozen amount.
      if (withdrawal.balanceType === "TRUST") {
        await tx.user.update({
          where: { id: withdrawal.traderId },
          data: {
            frozenUsdt: { decrement: withdrawal.amountUSDT }
          }
        });
      }

      // Create admin log
      await tx.adminLog.create({
        data: {
          adminId: "admin",
          action: "WITHDRAWAL_APPROVED",
          details: `Approved withdrawal ${withdrawal.id} for ${withdrawal.amountUSDT} USDT, txHash: ${txHash}`,
          ip: request.headers.get("x-forwarded-for") || "unknown"
        }
      });
    });

    // Send webhook notification
    const webhookUrl = await db.systemConfig.findUnique({
      where: { key: "withdrawal_webhook_url" }
    });

    if (webhookUrl?.value) {
      await sendWebhook(webhookUrl.value, {
        event: "withdrawal.approved",
        data: {
          withdrawalId: withdrawal.id,
          traderId: withdrawal.traderId,
          amount: withdrawal.amountUSDT,
          txHash,
          timestamp: new Date().toISOString()
        }
      });
    }

    return {
      success: true,
      message: "Withdrawal approved successfully"
    };
  }, {
    body: t.Object({
      txHash: t.String({ minLength: 10 })
    })
  })
  .post("/:id/reject", async ({ params, body, set, request }) => {
    const { reason } = body;
    
    const withdrawal = await db.withdrawalRequest.findUnique({
      where: { id: params.id }
    });

    if (!withdrawal) {
      set.status = 404;
      return {
        success: false,
        error: "Withdrawal request not found"
      };
    }

    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      set.status = 400;
      return {
        success: false,
        error: "Can only reject pending withdrawals"
      };
    }

    // Reject withdrawal and refund balance
    await db.$transaction(async (tx) => {
      await tx.withdrawalRequest.update({
        where: { id: params.id },
        data: {
          status: WithdrawalStatus.REJECTED,
          adminId: "admin",
          rejectionReason: reason,
          processedAt: new Date()
        }
      });

      // Refund balance based on type
      if (withdrawal.balanceType === "TRUST") {
        // For TRUST balance, unfreeze and return to trustBalance
        await tx.user.update({
          where: { id: withdrawal.traderId },
          data: {
            frozenUsdt: { decrement: withdrawal.amountUSDT },
            trustBalance: { increment: withdrawal.amountUSDT }
          }
        });
      } else {
        // For other balances, refund directly
        let updateData: any = {};
        switch (withdrawal.balanceType) {
          case "COMPENSATION":
            updateData.payoutBalance = { increment: withdrawal.amountUSDT };
            break;
          case "PROFIT_DEALS":
            updateData.profitFromDeals = { increment: withdrawal.amountUSDT };
            break;
          case "PROFIT_PAYOUTS":
            updateData.profitFromPayouts = { increment: withdrawal.amountUSDT };
            break;
          case "WORKING":
            updateData.balanceUsdt = { increment: withdrawal.amountUSDT };
            break;
        }

        if (Object.keys(updateData).length > 0) {
          await tx.user.update({
            where: { id: withdrawal.traderId },
            data: updateData
          });
        }
      }

      // Create admin log
      await tx.adminLog.create({
        data: {
          adminId: "admin",
          action: "WITHDRAWAL_REJECTED",
          details: `Rejected withdrawal ${withdrawal.id} for ${withdrawal.amountUSDT} USDT, reason: ${reason}`,
          ip: request.headers.get("x-forwarded-for") || "unknown"
        }
      });
    });

    // Send webhook notification
    const webhookUrl = await db.systemConfig.findUnique({
      where: { key: "withdrawal_webhook_url" }
    });

    if (webhookUrl?.value) {
      await sendWebhook(webhookUrl.value, {
        event: "withdrawal.rejected",
        data: {
          withdrawalId: withdrawal.id,
          traderId: withdrawal.traderId,
          amount: withdrawal.amountUSDT,
          reason,
          timestamp: new Date().toISOString()
        }
      });
    }

    return {
      success: true,
      message: "Withdrawal rejected successfully"
    };
  }, {
    body: t.Object({
      reason: t.String({ minLength: 3 })
    })
  })
  .get("/stats", async () => {
    const [
      pending,
      processing,
      approved,
      rejected,
      completed,
      totalAmount,
      totalApproved
    ] = await Promise.all([
      db.withdrawalRequest.count({ where: { status: WithdrawalStatus.PENDING } }),
      db.withdrawalRequest.count({ where: { status: WithdrawalStatus.PROCESSING } }),
      db.withdrawalRequest.count({ where: { status: WithdrawalStatus.APPROVED } }),
      db.withdrawalRequest.count({ where: { status: WithdrawalStatus.REJECTED } }),
      db.withdrawalRequest.count({ where: { status: WithdrawalStatus.COMPLETED } }),
      db.withdrawalRequest.aggregate({
        _sum: { amountUSDT: true }
      }),
      db.withdrawalRequest.aggregate({
        _sum: { amountUSDT: true },
        where: { status: { in: [WithdrawalStatus.APPROVED, WithdrawalStatus.COMPLETED] } }
      })
    ]);

    return {
      success: true,
      data: {
        pending,
        processing,
        approved,
        rejected,
        completed,
        totalAmount: totalAmount._sum.amountUSDT || 0,
        totalApproved: totalApproved._sum.amountUSDT || 0
      }
    };
  });