import { Elysia, t } from "elysia";
import { db } from "@/db";
import { authPlugin } from "@/plugins/auth";
import { WithdrawalBalanceType, WithdrawalStatus } from "@prisma/client";

export const traderWithdrawalsRoutes = new Elysia({ prefix: "/withdrawals" })
  .use(authPlugin({ variant: "trader" }))
  .get("/", async ({ trader }) => {
    const withdrawals = await db.withdrawalRequest.findMany({
      where: { traderId: trader.id },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return {
      success: true,
      data: withdrawals
    };
  })
  .get("/settings", async ({ trader }) => {
    const [
      minAmount,
      processingHours
    ] = await Promise.all([
      db.systemConfig.findUnique({ where: { key: "min_withdrawal_amount" } }),
      db.systemConfig.findUnique({ where: { key: "withdrawal_processing_time_hours" } })
    ]);

    return {
      success: true,
      data: {
        minAmount: parseFloat(minAmount?.value || "50"),
        feePercent: 0,
        feeFixed: 0,
        feeEnabled: false,
        processingHours: parseInt(processingHours?.value || "24")
      }
    };
  })
  .get("/balances", async ({ trader }) => {
    const user = await db.user.findUnique({
      where: { id: trader.id },
      select: {
        trustBalance: true,
        payoutBalance: true,
        profitFromDeals: true,
        profitFromPayouts: true,
        balanceUsdt: true,
        // Referral balance would be calculated from referral system
      }
    });

    if (!user) {
      throw new Error("User not found");
    }

    return {
      success: true,
      data: {
        [WithdrawalBalanceType.TRUST]: user.trustBalance,
        [WithdrawalBalanceType.COMPENSATION]: user.payoutBalance,
        [WithdrawalBalanceType.PROFIT_DEALS]: user.profitFromDeals,
        [WithdrawalBalanceType.PROFIT_PAYOUTS]: user.profitFromPayouts,
        [WithdrawalBalanceType.REFERRAL]: 0, // TODO: Implement referral balance
        [WithdrawalBalanceType.WORKING]: user.balanceUsdt
      }
    };
  })
  .post("/", async ({ trader, body, set }) => {
    let { amountUSDT, balanceType, walletAddress } = body;
    
    // Map BALANCE to TRUST for backward compatibility
    if (balanceType === 'BALANCE') {
      balanceType = WithdrawalBalanceType.TRUST;
    }

    // Get settings
    const minAmountSetting = await db.systemConfig.findUnique({ where: { key: "min_withdrawal_amount" } });
    const minAmount = parseFloat(minAmountSetting?.value || "50");

    // Validate amount
    if (amountUSDT < minAmount) {
      set.status = 400;
      return {
        success: false,
        error: `Минимальная сумма вывода: ${minAmount} USDT`
      };
    }

    // Check balance
    const user = await db.user.findUnique({
      where: { id: trader.id }
    });

    if (!user) {
      throw new Error("User not found");
    }

    let availableBalance = 0;
    let displayedBalance = 0; // Баланс, отображаемый на сайте
    let balanceField = "";

    switch (balanceType) {
      case WithdrawalBalanceType.TRUST:
        // For TRUST balance, consider frozen amount
        availableBalance = user.trustBalance - user.frozenUsdt;
        displayedBalance = user.trustBalance; // На сайте показывается полный trustBalance
        balanceField = "frozenUsdt"; // We'll freeze instead of decrement
        break;
      case WithdrawalBalanceType.COMPENSATION:
        availableBalance = user.payoutBalance;
        displayedBalance = user.payoutBalance;
        balanceField = "payoutBalance";
        break;
      case WithdrawalBalanceType.PROFIT_DEALS:
        availableBalance = user.profitFromDeals;
        displayedBalance = user.profitFromDeals;
        balanceField = "profitFromDeals";
        break;
      case WithdrawalBalanceType.PROFIT_PAYOUTS:
        availableBalance = user.profitFromPayouts;
        displayedBalance = user.profitFromPayouts;
        balanceField = "profitFromPayouts";
        break;
      case WithdrawalBalanceType.REFERRAL:
        availableBalance = 0; // TODO: Implement referral balance
        displayedBalance = 0;
        break;
      case WithdrawalBalanceType.WORKING:
        availableBalance = user.balanceUsdt;
        displayedBalance = user.balanceUsdt;
        balanceField = "balanceUsdt";
        break;
    }

    // Проверяем, что сумма вывода не превышает баланс, отображаемый на сайте
    if (amountUSDT > displayedBalance) {
      set.status = 400;
      return {
        success: false,
        error: `Сумма вывода не может превышать баланс на сайте (${displayedBalance.toFixed(2)} USDT)`
      };
    }

    // Проверяем доступный баланс (с учетом замороженных средств)
    if (availableBalance < amountUSDT) {
      set.status = 400;
      return {
        success: false,
        error: "Недостаточно средств на балансе"
      };
    }

    // Check for pending withdrawals
    const pendingCount = await db.withdrawalRequest.count({
      where: {
        traderId: trader.id,
        status: {
          in: [WithdrawalStatus.PENDING, WithdrawalStatus.PROCESSING]
        }
      }
    });

    if (pendingCount >= 3) {
      set.status = 400;
      return {
        success: false,
        error: "У вас есть незавершенные заявки на вывод. Дождитесь их обработки"
      };
    }

    // Create withdrawal request and update balance in transaction
    const result = await db.$transaction(async (tx) => {
      // Create withdrawal request
      const withdrawal = await tx.withdrawalRequest.create({
        data: {
          traderId: trader.id,
          amountUSDT,
          balanceType,
          walletAddress,
          status: WithdrawalStatus.PENDING
        }
      });

      // Deduct from balance or freeze funds
      if (balanceField) {
        if (balanceType === WithdrawalBalanceType.TRUST) {
          // For TRUST balance, freeze the amount and deduct from trustBalance immediately
          await tx.user.update({
            where: { id: trader.id },
            data: {
              frozenUsdt: { increment: amountUSDT },
              trustBalance: { decrement: amountUSDT }
            }
          });
        } else if (balanceField !== "referralBalance") {
          // For other balances, decrement directly
          await tx.user.update({
            where: { id: trader.id },
            data: {
              [balanceField]: { decrement: amountUSDT }
            }
          });
        }
      }

      // Create admin log
      await tx.adminLog.create({
        data: {
          adminId: "system",
          action: "WITHDRAWAL_REQUEST_CREATED",
          details: `Withdrawal request ${withdrawal.id} created for ${amountUSDT} USDT from ${balanceType}`,
          ip: "system"
        }
      });

      return withdrawal;
    });

    return {
      success: true,
      data: {
        id: result.id,
        amountUSDT: result.amountUSDT,
        balanceType: result.balanceType,
        walletAddress: result.walletAddress,
        status: result.status,
        fee: 0,
        amountAfterFees: result.amountUSDT,
        createdAt: result.createdAt
      }
    };
  }, {
    body: t.Object({
      amountUSDT: t.Number({ minimum: 1 }),
      balanceType: t.Enum(WithdrawalBalanceType),
      walletAddress: t.String({ minLength: 34, maxLength: 42 }) // TRC-20 addresses are 34 characters
    })
  })
  .post("/:id/cancel", async ({ trader, params, set }) => {
    const withdrawal = await db.withdrawalRequest.findUnique({
      where: { id: params.id }
    });

    if (!withdrawal) {
      set.status = 404;
      return {
        success: false,
        error: "Заявка не найдена"
      };
    }

    if (withdrawal.traderId !== trader.id) {
      set.status = 403;
      return {
        success: false,
        error: "Доступ запрещен"
      };
    }

    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      set.status = 400;
      return {
        success: false,
        error: "Заявку можно отменить только в статусе 'Ожидание'"
      };
    }

    // Cancel withdrawal and refund balance
    await db.$transaction(async (tx) => {
      // Update withdrawal status
      await tx.withdrawalRequest.update({
        where: { id: params.id },
        data: {
          status: WithdrawalStatus.REJECTED,
          rejectionReason: "Отменено пользователем",
          processedAt: new Date()
        }
      });

      // Refund balance
      if (withdrawal.balanceType === WithdrawalBalanceType.TRUST) {
        // For TRUST balance, unfreeze the amount
        await tx.user.update({
          where: { id: trader.id },
          data: {
            frozenUsdt: { decrement: withdrawal.amountUSDT }
          }
        });
      } else {
        // For other balances, refund directly
        let balanceField = "";
        switch (withdrawal.balanceType) {
          case WithdrawalBalanceType.COMPENSATION:
            balanceField = "payoutBalance";
            break;
          case WithdrawalBalanceType.PROFIT_DEALS:
            balanceField = "profitFromDeals";
            break;
          case WithdrawalBalanceType.PROFIT_PAYOUTS:
            balanceField = "profitFromPayouts";
            break;
          case WithdrawalBalanceType.WORKING:
            balanceField = "balanceUsdt";
            break;
        }

        if (balanceField) {
          await tx.user.update({
            where: { id: trader.id },
            data: {
              [balanceField]: { increment: withdrawal.amountUSDT }
            }
          });
        }
      }

      // Create admin log
      await tx.adminLog.create({
        data: {
          adminId: "user",
          action: "WITHDRAWAL_CANCELLED",
          details: `Withdrawal ${withdrawal.id} cancelled by user`,
          ip: "user"
        }
      });
    });

    return {
      success: true,
      message: "Заявка успешно отменена"
    };
  });