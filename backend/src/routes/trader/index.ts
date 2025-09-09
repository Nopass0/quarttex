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
import { trafficSettingsApi } from "@/api/trader/traffic-settings";
import rateRoutes from "./rate";

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
          include: {
            displayRates: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                stakePercent: true,
                amountFrom: true,
                amountTo: true,
                sortOrder: true
              }
            }
          }
        });

        if (!user) {
          throw new Error("User not found");
        }

        return {
          id: user.id,
          numericId: user.numericId,
          email: user.email,
          name: user.name,
          trustBalance: user.trustBalance,
          deposit: user.deposit,
          profitFromDeals: user.profitFromDeals,
          profitFromPayouts: user.profitFromPayouts,
          frozenUsdt: user.frozenUsdt,
          frozenRub: user.frozenRub,
          balanceUsdt: user.balanceUsdt,
          balanceRub: user.balanceRub,
          frozenPayoutBalance: user.frozenPayoutBalance,
          trafficEnabled: user.trafficEnabled,
          rateSource: user.rateSource,
          displayStakePercent: user.displayStakePercent ?? null,
          displayAmountFrom: user.displayAmountFrom ?? null,
          displayAmountTo: user.displayAmountTo ?? null,
          displayRates: Array.isArray(user.displayRates) ? user.displayRates : [],
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
            displayStakePercent: t.Nullable(t.Number()),
            displayAmountFrom: t.Nullable(t.Number()),
            displayAmountTo: t.Nullable(t.Number()),
            displayRates: t.Array(
              t.Object({
                id: t.String(),
                stakePercent: t.Number(),
                amountFrom: t.Number(),
                amountTo: t.Number(),
                sortOrder: t.Number(),
              })
            ),
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
    .use(trafficSettingsApi)
    .use(rateRoutes)
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
    )
    .get(
      "/merchant-methods",
      async ({ trader }) => {
        // Получаем актуальный курс USDT/RUB (базовый курс)
        let currentRate = 100; // Fallback значение
        let baseRate = 100; // Базовый курс (без ККК)
        try {
          const { rapiraService } = await import("@/services/rapira.service");
          currentRate = await rapiraService.getUsdtRubRate();
          baseRate = currentRate; // Базовый курс - это курс без ККК
        } catch (error) {
          console.error('Failed to fetch USDT rate, using fallback:', error);
        }

        // Получаем все связи трейдера с мерчантами и их методами
        const traderMerchants = await db.traderMerchant.findMany({
          where: {
            traderId: trader.id,
            isMerchantEnabled: true,
          },
          include: {
            merchant: {
              select: {
                id: true,
                name: true,
              },
            },
            method: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
              },
            },
            feeRanges: {
              where: {
                isActive: true,
              },
              orderBy: {
                minAmount: 'asc',
              },
            },
          },
        });

        // Группируем методы и объединяем одинаковые данные
        const methodsMap = new Map();

        traderMerchants.forEach((tm) => {
          const methodKey = tm.method.code;
          
          if (!methodsMap.has(methodKey)) {
            methodsMap.set(methodKey, {
              method: tm.method.code,
              methodName: tm.method.name,
              rates: [],
            });
          }

          const methodData = methodsMap.get(methodKey);
          
          // Функция для расчёта фактического курса
          // Формула: 5000/rate = usdt; usdt-ставка_на_вход = new_usdt; 5000/new_usdt = фактический_курс
          const calculateActualRate = (feeInPercent: number) => {
            const dealAmount = 5000; // Константа - сумма сделки в рублях
            const usdt = dealAmount / currentRate; // USDT по базовому курсу
            const feeAmount = usdt * (feeInPercent / 100); // Размер ставки в USDT
            const newUsdt = usdt - feeAmount; // Новое количество USDT после вычета ставки
            return Math.round((dealAmount / newUsdt) * 100) / 100; // Фактический курс, округлённый до 2 знаков
          };

          // Определяем ставки (используем гибкие ставки если есть, иначе фиксированные)
          let rateData;
          
          if (tm.useFlexibleRates && tm.feeRanges.length > 0) {
            // Для гибких ставок рассчитываем курс для суммы 5000 рублей
            let feeInFor5000 = tm.feeRanges[0].feeInPercent;
            for (const range of tm.feeRanges) {
              if (5000 >= range.minAmount && 5000 <= range.maxAmount) {
                feeInFor5000 = range.feeInPercent;
                break;
              }
            }
            
            rateData = {
              inPercentFrom: tm.feeRanges[0].feeInPercent,
              inPercentTo: tm.feeRanges[tm.feeRanges.length - 1].feeInPercent,
              outPercentFrom: tm.feeRanges[0].feeOutPercent,
              outPercentTo: tm.feeRanges[tm.feeRanges.length - 1].feeOutPercent,
              amountFrom: tm.feeRanges[0].minAmount,
              amountTo: tm.feeRanges[tm.feeRanges.length - 1].maxAmount,
              actualRate: calculateActualRate(feeInFor5000),
              baseRate: baseRate,
            };
          } else {
            // Используем фиксированные ставки
            rateData = {
              inPercentFrom: tm.feeIn,
              inPercentTo: tm.feeIn,
              outPercentFrom: tm.feeOut,
              outPercentTo: tm.feeOut,
              amountFrom: 1000, // Минимальная сумма по умолчанию
              amountTo: 100000, // Максимальная сумма по умолчанию
              actualRate: calculateActualRate(tm.feeIn),
              baseRate: baseRate,
            };
          }

          // Проверяем, есть ли уже такие же ставки
          const existingRate = methodData.rates.find((r) => 
            r.inPercentFrom === rateData.inPercentFrom &&
            r.inPercentTo === rateData.inPercentTo &&
            r.outPercentFrom === rateData.outPercentFrom &&
            r.outPercentTo === rateData.outPercentTo &&
            r.amountFrom === rateData.amountFrom &&
            r.amountTo === rateData.amountTo
          );

          if (!existingRate) {
            methodData.rates.push(rateData);
          }
        });

        // Преобразуем в массив (показываем все методы, фильтрация уже была на уровне типов)
        const result = Array.from(methodsMap.values())
          .map(method => ({
            method: method.method,
            methodName: method.methodName,
            rates: method.rates,
          }));

        return result;
      },
      {
        tags: ["trader"],
        detail: { summary: "Получение методов мерчантов с их ставками и лимитами" },
        response: {
          200: t.Array(t.Object({
            method: t.String(),
            methodName: t.String(),
            rates: t.Array(t.Object({
              inPercentFrom: t.Number(),
              inPercentTo: t.Number(),
              outPercentFrom: t.Number(),
              outPercentTo: t.Number(),
              amountFrom: t.Number(),
              amountTo: t.Number(),
              actualRate: t.Number(),
              baseRate: t.Number(),
            })),
          })),
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    );