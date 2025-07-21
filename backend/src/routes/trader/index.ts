import { Elysia, t } from "elysia";
import { traderGuard } from "@/middleware/traderGuard";
import walletRoutes from "./wallet";
import transactionsRoutes from "./transactions";
import bankDetailsRoutes from "./bank-details";
import balanceTopupRoutes from "./balance-topups";
import { devicesRoutes } from "./devices";
import messagesRoutes from "./messages";
import telegramRoutes from "./telegram";
import foldersRoutes from "./folders";
import disputesRoutes from "./disputes";
import dealDisputesRoutes from "./deal-disputes";
import depositsRoutes from "./deposits";
import { traderWithdrawalsRoutes } from "./withdrawals";
import { traderMessagesRoutes } from "./trader-messages";
import { financeRoutes } from "./finance";
import { btEntranceRoutes } from "./bt-entrance";
import ErrorSchema from "@/types/error";
import { db } from "@/db";
import { traderPayoutsApi } from "@/api/trader/payouts";
import { dashboardRoutes } from "@/api/trader/dashboard";

/**
 * Маршруты для трейдера
 * Объединяет все подмаршруты для трейдера в один модуль
 */
export default (app: Elysia) =>
  app
    .use(traderGuard())
    .get(
      "/validate",
      async ({ trader }) => {
        // If we reach this point, it means traderGuard has already validated the token
        return { 
          success: true, 
          message: "Trader token is valid",
          traderId: trader.id 
        };
      },
      {
        tags: ["trader"],
        detail: { summary: "Проверка валидности токена трейдера" },
        response: {
          200: t.Object({
            success: t.Boolean(),
            message: t.String(),
            traderId: t.String(),
          }),
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    )
    .group("/wallet", (app) => walletRoutes(app))
    .group("/transactions", (app) => transactionsRoutes(app))
    .group("/bank-details", (app) => bankDetailsRoutes(app))
    .group("/balance-topups", (app) => balanceTopupRoutes(app))
    .use(devicesRoutes)
    .use(messagesRoutes)
    .use(telegramRoutes)
    .use(foldersRoutes)
    .use(disputesRoutes)
    .use(dealDisputesRoutes)
    .use(depositsRoutes)
    .use(traderWithdrawalsRoutes)
    .use(traderMessagesRoutes)
    .use(financeRoutes)
    .use(traderPayoutsApi)
    .use(dashboardRoutes)
    .use(btEntranceRoutes)
    .get(
      "/dispute-settings",
      async () => {
        const settings = await db.systemConfig.findMany({
          where: {
            key: {
              in: [
                'disputeDayShiftStartHour',
                'disputeDayShiftEndHour',
                'disputeDayShiftTimeoutMinutes',
                'disputeNightShiftTimeoutMinutes'
              ]
            }
          }
        });
        
        const settingsMap = Object.fromEntries(
          settings.map(s => [s.key, s.value])
        );
        
        return {
          dayShiftStartHour: parseInt(settingsMap.disputeDayShiftStartHour || '9'),
          dayShiftEndHour: parseInt(settingsMap.disputeDayShiftEndHour || '21'),
          dayShiftTimeoutMinutes: parseInt(settingsMap.disputeDayShiftTimeoutMinutes || '30'),
          nightShiftTimeoutMinutes: parseInt(settingsMap.disputeNightShiftTimeoutMinutes || '60')
        };
      }
    )
    .get(
      "/methods",
      async () => {
        const methods = await db.method.findMany({
          where: { isEnabled: true },
          orderBy: { name: 'asc' }
        });
        
        return methods.map(method => ({
          id: method.id,
          code: method.code,
          name: method.name,
          type: method.type,
          currency: method.currency,
          minPayin: method.minPayin,
          maxPayin: method.maxPayin,
          minPayout: method.minPayout,
          maxPayout: method.maxPayout,
          commissionPayin: method.commissionPayin,
          commissionPayout: method.commissionPayout,
        }));
      },
      {
        tags: ["trader"],
        detail: { summary: "Получение доступных методов платежей" },
        response: {
          200: t.Array(t.Object({
            id: t.String(),
            code: t.String(),
            name: t.String(),
            type: t.String(),
            currency: t.String(),
            minPayin: t.Number(),
            maxPayin: t.Number(),
            minPayout: t.Number(),
            maxPayout: t.Number(),
            commissionPayin: t.Number(),
            commissionPayout: t.Number(),
          })),
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    )
    .get(
      "/profile",
      async ({ trader }) => {
        return {
          id: trader.id,
          numericId: trader.numericId,
          email: trader.email,
          name: trader.name || trader.email,
          balanceUsdt: trader.balanceUsdt || 0,
          balanceRub: trader.balanceRub || 0,
          frozenUsdt: trader.frozenUsdt || 0,
          frozenRub: trader.frozenRub || 0,
          availableUsdt: (trader.balanceUsdt || 0) - (trader.frozenUsdt || 0),
          availableRub: (trader.balanceRub || 0) - (trader.frozenRub || 0),
          trafficEnabled: trader.trafficEnabled || true,
          deposit: trader.deposit || 0,
          trustBalance: trader.trustBalance || 0,
          profitFromDeals: trader.profitFromDeals || 0,
          profitFromPayouts: trader.profitFromPayouts || 0,
          compensationBalance: 0, // TODO: implement compensation balance
          referralBalance: 0, // TODO: implement referral balance
          escrowBalance: trader.frozenUsdt || 0, // Using frozen balance as escrow
          disputedBalance: 0, // TODO: calculate from disputes
          teamEnabled: trader.trafficEnabled, // Indicates if trader profile is active
          createdAt: trader.createdAt ? trader.createdAt.toISOString() : new Date().toISOString(),
        };
      },
      {
        tags: ["trader"],
        detail: { summary: "Получение профиля трейдера" },
        response: {
          200: t.Object({
            id: t.String(),
            numericId: t.Number(),
            email: t.String(),
            name: t.String(),
            balanceUsdt: t.Number(),
            balanceRub: t.Number(),
            frozenUsdt: t.Number(),
            frozenRub: t.Number(),
            availableUsdt: t.Number(),
            availableRub: t.Number(),
            trafficEnabled: t.Boolean(),
            deposit: t.Number(),
            trustBalance: t.Number(),
            profitFromDeals: t.Number(),
            profitFromPayouts: t.Number(),
            compensationBalance: t.Number(),
            referralBalance: t.Number(),
            escrowBalance: t.Number(),
            disputedBalance: t.Number(),
            teamEnabled: t.Boolean(),
            createdAt: t.String(),
          }),
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    )
    .patch(
      "/profile",
      async ({ trader, body, error }) => {
        // Update trader profile settings
        const updateData: any = {};
        
        if (body.teamEnabled !== undefined) {
          // Use trafficEnabled to control whether trader is actively working
          updateData.trafficEnabled = body.teamEnabled;
        }
        
        // Update the trader
        const updatedTrader = await db.user.update({
          where: { id: trader.id },
          data: updateData,
        });
        
        return {
          success: true,
          teamEnabled: updatedTrader.trafficEnabled,
        };
      },
      {
        tags: ["trader"],
        detail: { summary: "Обновление настроек профиля трейдера" },
        body: t.Object({
          teamEnabled: t.Optional(t.Boolean()),
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            teamEnabled: t.Boolean(),
          }),
          401: ErrorSchema,
          403: ErrorSchema,
          400: ErrorSchema,
        },
      },
    )
    .get(
      "/finance-stats",
      async ({ trader }) => {
        // Get today's date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Calculate today's earnings
        const todayTransactions = await db.transaction.findMany({
          where: {
            traderId: trader.id,
            status: 'READY',
            type: 'IN',
            createdAt: {
              gte: today,
              lt: tomorrow,
            },
          },
          select: {
            commission: true,
            amount: true,
          },
        });
        
        const todayEarnings = todayTransactions.reduce((sum, tx) => sum + tx.commission, 0);
        
        // Get all-time profit
        const totalProfit = (trader.profitFromDeals || 0) + (trader.profitFromPayouts || 0);
        
        // Get available balance (USDT for now)
        const availableBalance = trader.balanceUsdt || 0;
        
        return {
          availableBalance,
          todayEarnings,
          totalProfit,
          currency: 'USDT',
        };
      },
      {
        tags: ["trader"],
        detail: { summary: "Получение финансовой статистики трейдера" },
        response: {
          200: t.Object({
            availableBalance: t.Number(),
            todayEarnings: t.Number(),
            totalProfit: t.Number(),
            currency: t.String(),
          }),
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    );