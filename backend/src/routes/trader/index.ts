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
import { ideaRoutes } from "./ideas";
import { notificationRoutes } from "./notifications";
import ErrorSchema from "@/types/error";
import { db } from "@/db";
import { traderPayoutsApi } from "@/api/trader/payouts";
import { dashboardRoutes } from "@/api/trader/dashboard";
import { payoutFiltersApi } from "@/api/trader/payout-filters";
import { banksApi } from "@/api/trader/banks";
import { traderFiltersApi } from "@/api/trader/filters";
import { traderBanksListApi } from "@/api/trader/banks-list";

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
    .get(
      "/profile",
      async ({ trader }) => {
        const user = await db.user.findUnique({
          where: { id: trader.id },
          select: {
            id: true,
            numericId: true,
            email: true,
            name: true,
            trustBalance: true,
            deposit: true,
            profitFromDeals: true,
            profitFromPayouts: true,
            frozenUsdt: true,
            frozenRub: true,
            balanceUsdt: true,
            balanceRub: true,
            frozenPayoutBalance: true,
            trafficEnabled: true,
            rateSource: true,
          }
        });

        if (!user) {
          throw new Error("User not found");
        }

        return {
          ...user,
          compensationBalance: user.frozenPayoutBalance || 0,
          referralBalance: 0, // Not implemented yet
          disputedBalance: 0, // TODO: calculate from disputes
          escrowBalance: user.frozenUsdt || 0, // Using frozen balance as escrow
        };
      },
      {
        tags: ["trader"],
        detail: { summary: "Получение финансовых данных трейдера" },
        response: {
          200: t.Object({
            id: t.String(),
            numericId: t.Number(),
            email: t.String(),
            name: t.String(),
            trustBalance: t.Number(),
            deposit: t.Number(),
            profitFromDeals: t.Number(),
            profitFromPayouts: t.Number(),
            frozenUsdt: t.Number(),
            frozenRub: t.Number(),
            balanceUsdt: t.Number(),
            balanceRub: t.Number(),
            frozenPayoutBalance: t.Number(),
            compensationBalance: t.Number(),
            referralBalance: t.Number(),
            disputedBalance: t.Number(),
            escrowBalance: t.Number(),
            trafficEnabled: t.Boolean(),
            rateSource: t.Union([t.Enum({ rapira: 'rapira', bybit: 'bybit' }), t.Null()]),
          }),
          401: ErrorSchema,
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
    .use(payoutFiltersApi)
    .use(banksApi)
    .use(traderFiltersApi)
    .use(traderBanksListApi)
    .use(btEntranceRoutes)
    .use(ideaRoutes)
    .use(notificationRoutes)
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
    .patch(
      "/profile",
      async ({ trader, body, error }) => {
        // Update trader profile settings
        const updateData: any = {};
        
        if (body.trafficEnabled !== undefined) {
          // Use trafficEnabled to control whether trader is actively working
          updateData.trafficEnabled = body.trafficEnabled;
        }
        
        // Support legacy teamEnabled field
        if (body.teamEnabled !== undefined && body.trafficEnabled === undefined) {
          updateData.trafficEnabled = body.teamEnabled;
        }
        
        // Update the trader
        const updatedTrader = await db.user.update({
          where: { id: trader.id },
          data: updateData,
        });
        
        return {
          success: true,
          trafficEnabled: updatedTrader.trafficEnabled,
          teamEnabled: updatedTrader.trafficEnabled, // For backwards compatibility
        };
      },
      {
        tags: ["trader"],
        detail: { summary: "Обновление настроек профиля трейдера" },
        body: t.Object({
          trafficEnabled: t.Optional(t.Boolean()),
          teamEnabled: t.Optional(t.Boolean()), // For backwards compatibility
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            trafficEnabled: t.Boolean(),
            teamEnabled: t.Boolean(), // For backwards compatibility
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