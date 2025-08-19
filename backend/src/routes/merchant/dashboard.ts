import { Elysia, t } from "elysia";
import { db } from "@/db";
import {
  Prisma,
  Status,
  TransactionType,
  MethodType,
  Currency,
  PayoutStatus,
  SettleRequestStatus,
} from "@prisma/client";
import ErrorSchema from "@/types/error";
import { merchantSessionGuard } from "@/middleware/merchantSessionGuard";
import { roundDown2 } from "@/utils/rounding";
import {
  endOfDay,
  endOfMonth,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
  subHours,
  format,
} from "date-fns";

/**
 * Маршруты для дашборда мерчанта
 * Все эндпоинты защищены проверкой сессии мерчанта
 */
export default (app: Elysia) =>
  app
    .use(merchantSessionGuard())

    /* ──────── GET /merchant/dashboard/check-api-key ──────── */
    .get(
      "/check-api-key",
      async ({ merchant }) => {
        // Проверяем актуальность API ключа
        const currentMerchant = await db.merchant.findUnique({
          where: { id: merchant.id },
          select: { token: true, disabled: true, banned: true },
        });

        if (!currentMerchant) {
          return { valid: false, reason: "Merchant not found" };
        }

        if (currentMerchant.disabled || currentMerchant.banned) {
          return { valid: false, reason: "Merchant disabled or banned" };
        }

        // Проверяем, совпадает ли текущий токен с тем, что в БД
        if (currentMerchant.token !== merchant.token) {
          return { valid: false, reason: "API key has been changed" };
        }

        return { valid: true };
      },
      {
        detail: {
          tags: ["merchant", "dashboard"],
          summary: "Проверка актуальности API ключа мерчанта",
        },
        response: {
          200: t.Object({
            valid: t.Boolean(),
            reason: t.Optional(t.String()),
          }),
        },
      }
    )

    /* ──────── GET /merchant/dashboard/statistics ──────── */
    .get(
      "/statistics",
      async ({ merchant, query }) => {
        const period = query.period || "today";
        let dateFrom: Date;
        let dateTo: Date = new Date();

        switch (period) {
          case "24h":
            dateFrom = subHours(new Date(), 24);
            break;
          case "today":
            dateFrom = startOfDay(new Date());
            dateTo = endOfDay(new Date());
            break;
          case "yesterday":
            dateFrom = startOfDay(subDays(new Date(), 1));
            dateTo = endOfDay(subDays(new Date(), 1));
            break;
          case "week":
            dateFrom = subDays(new Date(), 7);
            break;
          case "month":
            dateFrom = startOfMonth(new Date());
            dateTo = endOfMonth(new Date());
            break;
          case "year":
            dateFrom = startOfYear(new Date());
            dateTo = endOfYear(new Date());
            break;
          case "all":
            dateFrom = new Date(0);
            break;
          default:
            dateFrom = startOfDay(new Date());
        }

        // Получаем статистику попыток создания транзакций
        const [attemptStats] = await Promise.all([
          db.transactionAttempt.groupBy({
            by: ["success"],
            where: {
              merchantId: merchant.id,
              createdAt: { gte: dateFrom, lte: dateTo },
            },
            _count: { _all: true },
          }),
        ]);

        const totalAttempts = attemptStats.reduce(
          (sum, stat) => sum + stat._count._all,
          0
        );
        const successfulAttempts =
          attemptStats.find((s) => s.success)?._count._all || 0;
        const failedAttempts =
          attemptStats.find((s) => !s.success)?._count._all || 0;
        const conversionRate =
          totalAttempts > 0
            ? ((successfulAttempts / totalAttempts) * 100).toFixed(2)
            : "0.00";

        // Получаем детализацию по ошибкам
        const [errorStats] = await Promise.all([
          db.transactionAttempt.groupBy({
            by: ["errorCode"],
            where: {
              merchantId: merchant.id,
              success: false,
              createdAt: { gte: dateFrom, lte: dateTo },
            },
            _count: { _all: true },
          }),
        ]);

        // Получаем статистику транзакций и выплат
        const [
          // Сделки (входящие транзакции)
          dealsTotal,
          dealsSuccess,
          dealsFailed,
          dealsDispute,
          dealsPending,
          dealsVolume,
          dealsSuccessVolume,

          // Выплаты
          payoutsTotal,
          payoutsSuccess,
          payoutsFailed,
          payoutsPending,
          payoutsVolume,
          payoutsSuccessVolume,

          // Статистика по статусам сделок
          dealsByStatus,

          // Статистика по статусам выплат
          payoutsByStatus,
        ] = await Promise.all([
          // Общее количество сделок
          db.transaction.count({
            where: {
              merchantId: merchant.id,
              type: TransactionType.IN,
              createdAt: { gte: dateFrom, lte: dateTo },
            },
          }),
          // Успешные сделки
          db.transaction.count({
            where: {
              merchantId: merchant.id,
              type: TransactionType.IN,
              status: Status.READY,
              createdAt: { gte: dateFrom, lte: dateTo },
            },
          }),
          // Неудачные сделки
          db.transaction.count({
            where: {
              merchantId: merchant.id,
              type: TransactionType.IN,
              status: { in: [Status.CANCELED, Status.EXPIRED] },
              createdAt: { gte: dateFrom, lte: dateTo },
            },
          }),
          // Спорные сделки
          db.transaction.count({
            where: {
              merchantId: merchant.id,
              type: TransactionType.IN,
              status: Status.DISPUTE,
              createdAt: { gte: dateFrom, lte: dateTo },
            },
          }),
          // Сделки в процессе
          db.transaction.count({
            where: {
              merchantId: merchant.id,
              type: TransactionType.IN,
              status: { in: [Status.CREATED, Status.IN_PROGRESS] },
              createdAt: { gte: dateFrom, lte: dateTo },
            },
          }),
          // Объем сделок
          db.transaction.aggregate({
            where: {
              merchantId: merchant.id,
              type: TransactionType.IN,
              createdAt: { gte: dateFrom, lte: dateTo },
            },
            _sum: { amount: true },
          }),
          // Объем успешных сделок
          db.transaction.aggregate({
            where: {
              merchantId: merchant.id,
              type: TransactionType.IN,
              status: Status.READY,
              createdAt: { gte: dateFrom, lte: dateTo },
            },
            _sum: { amount: true },
          }),

          // Общее количество выплат
          db.payout.count({
            where: {
              merchantId: merchant.id,
              createdAt: { gte: dateFrom, lte: dateTo },
            },
          }),
          // Успешные выплаты
          db.payout.count({
            where: {
              merchantId: merchant.id,
              status: PayoutStatus.COMPLETED,
              createdAt: { gte: dateFrom, lte: dateTo },
            },
          }),
          // Неудачные выплаты
          db.payout.count({
            where: {
              merchantId: merchant.id,
              status: { in: [PayoutStatus.EXPIRED, PayoutStatus.CANCELLED] },
              createdAt: { gte: dateFrom, lte: dateTo },
            },
          }),
          // Выплаты в процессе
          db.payout.count({
            where: {
              merchantId: merchant.id,
              status: {
                in: [
                  PayoutStatus.CREATED,
                  PayoutStatus.ACTIVE,
                  PayoutStatus.CHECKING,
                ],
              },
              createdAt: { gte: dateFrom, lte: dateTo },
            },
          }),
          // Объем выплат
          db.payout.aggregate({
            where: {
              merchantId: merchant.id,
              createdAt: { gte: dateFrom, lte: dateTo },
            },
            _sum: { amount: true },
          }),
          // Объем успешных выплат
          db.payout.aggregate({
            where: {
              merchantId: merchant.id,
              status: PayoutStatus.COMPLETED,
              createdAt: { gte: dateFrom, lte: dateTo },
            },
            _sum: { amount: true },
          }),

          // Группировка сделок по статусам
          db.transaction.groupBy({
            by: ["status"],
            where: {
              merchantId: merchant.id,
              type: TransactionType.IN,
              createdAt: { gte: dateFrom, lte: dateTo },
            },
            _count: { _all: true },
            _sum: { amount: true },
          }),

          // Группировка выплат по статусам
          db.payout.groupBy({
            by: ["status"],
            where: {
              merchantId: merchant.id,
              createdAt: { gte: dateFrom, lte: dateTo },
            },
            _count: { _all: true },
            _sum: { amount: true },
          }),
        ]);

        // Получаем статистику по сделкам по методам
        const dealsStatsByMethod = await db.transaction.groupBy({
          by: ["methodId"],
          where: {
            merchantId: merchant.id,
            type: TransactionType.IN,
            createdAt: { gte: dateFrom, lte: dateTo },
          },
          _count: { _all: true },
          _sum: { amount: true },
        });

        // Получаем статистику успешных сделок по методам
        const successfulDealsStatsByMethod = await db.transaction.groupBy({
          by: ["methodId"],
          where: {
            merchantId: merchant.id,
            type: TransactionType.IN,
            status: Status.READY,
            createdAt: { gte: dateFrom, lte: dateTo },
          },
          _count: { _all: true },
          _sum: { amount: true },
        });

        // Получаем статистику по выплатам по методам
        const payoutsStatsByMethod = await db.payout.groupBy({
          by: ["methodId"],
          where: {
            merchantId: merchant.id,
            createdAt: { gte: dateFrom, lte: dateTo },
          },
          _count: { _all: true },
          _sum: { amount: true },
        });

        // Получаем статистику успешных выплат по методам
        const successfulPayoutsStatsByMethod = await db.payout.groupBy({
          by: ["methodId"],
          where: {
            merchantId: merchant.id,
            status: PayoutStatus.COMPLETED,
            createdAt: { gte: dateFrom, lte: dateTo },
          },
          _count: { _all: true },
          _sum: { amount: true },
        });

        // Получаем все методы мерчанта
        const merchantMethods = await db.merchantMethod.findMany({
          where: {
            merchantId: merchant.id,
            isEnabled: true,
          },
          include: {
            method: {
              select: {
                id: true,
                name: true,
                code: true,
                commissionPayin: true,
                commissionPayout: true,
                isEnabled: true,
              },
            },
          },
        });

        // Фильтруем только активные методы
        const methods = merchantMethods
          .filter((mm) => mm.method.isEnabled)
          .map((mm) => mm.method);

        // Создаем карты для быстрого доступа
        const methodsMap = new Map(methods.map((m) => [m.id, m]));
        const dealsStatsMap = new Map(
          dealsStatsByMethod.map((s) => [s.methodId, s])
        );
        const successfulDealsStatsMap = new Map(
          successfulDealsStatsByMethod.map((s) => [s.methodId, s])
        );
        const payoutsStatsMap = new Map(
          payoutsStatsByMethod.map((s) => [s.methodId, s])
        );
        const successfulPayoutsStatsMap = new Map(
          successfulPayoutsStatsByMethod.map((s) => [s.methodId, s])
        );

        // Формируем статистику по каждому методу
        const methodStats = methods.map((method) => {
          const dealStats = dealsStatsMap.get(method.id);
          const successfulDealStats = successfulDealsStatsMap.get(method.id);
          const payoutStats = payoutsStatsMap.get(method.id);
          const successfulPayoutStats = successfulPayoutsStatsMap.get(
            method.id
          );

          // Сделки
          const dealsCount = dealStats?._count._all || 0;
          const dealsVolume = dealStats?._sum.amount || 0;
          const dealsSuccessCount = successfulDealStats?._count._all || 0;
          const dealsSuccessVolume = successfulDealStats?._sum.amount || 0;

          // Выплаты
          const payoutsCount = payoutStats?._count._all || 0;
          const payoutsVolume = payoutStats?._sum.amount || 0;
          const payoutsSuccessCount = successfulPayoutStats?._count._all || 0;
          const payoutsSuccessVolume = successfulPayoutStats?._sum.amount || 0;

          return {
            methodId: method.id,
            methodName: method.name,
            methodCode: method.code,
            commissionPayin: method.commissionPayin,
            commissionPayout: method.commissionPayout,
            deals: {
              total: dealsCount,
              successful: dealsSuccessCount,
              volume: dealsVolume,
              successVolume: dealsSuccessVolume,
            },
            payouts: {
              total: payoutsCount,
              successful: payoutsSuccessCount,
              volume: payoutsVolume,
              successVolume: payoutsSuccessVolume,
            },
            total: {
              transactions: dealsCount + payoutsCount,
              successfulTransactions: dealsSuccessCount + payoutsSuccessCount,
            },
          };
        });

        // Получаем все успешные сделки для расчета баланса
        const successfulDealsForBalance = await db.transaction.findMany({
          where: {
            merchantId: merchant.id,
            type: TransactionType.IN,
            status: Status.READY,
          },
          select: {
            amount: true,
            methodId: true,
            merchantRate: true, // Нужен для расчета USDT если countInRubEquivalent = false
            rate: true, // Нужен для расчета эффективного курса если merchantRate null
          },
        });

        // Получаем все завершенные выплаты для расчета баланса
        const completedPayoutsForBalance = await db.payout.findMany({
          where: {
            merchantId: merchant.id,
            status: PayoutStatus.COMPLETED,
          },
          select: {
            amount: true,
            methodId: true,
            merchantRate: true, // Нужен для расчета USDT если countInRubEquivalent = false
            rate: true, // Нужен для расчета эффективного курса если merchantRate null
            feePercent: true, // Комиссия на вывод для расчета баланса
            method: {
              select: {
                commissionPayout: true,
              },
            },
          },
        });

        // Получаем все завершенные запросы на settle для вычета из баланса
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

        // Получаем информацию о методах с комиссиями
        const methodIds = [
          ...new Set(
            [
              ...successfulDealsForBalance.map((d) => d.methodId),
              ...completedPayoutsForBalance.map((p) => p.methodId),
            ].filter((id): id is string => Boolean(id))
          ),
        ];

        const methodsForBalance = await db.method.findMany({
          where: { id: { in: methodIds } },
          select: {
            id: true,
            commissionPayin: true,
            commissionPayout: true,
          },
        });

        const methodCommissionsMap = new Map(
          methodsForBalance.map((m) => [m.id, m])
        );

        // Получаем настройки ККК для всех методов сразу
        const rateSettings = await db.rateSettings.findMany({
          where: { methodId: { in: methodIds } },
        });
        const rateSettingsMap = new Map(
          rateSettings.map((rs) => [rs.methodId, rs])
        );

        // Рассчитываем итоговый баланс с учетом комиссий
        let calculatedBalance = 0;
        let totalDealsAmount = 0;
        let totalPayoutsAmount = 0;
        let totalDealsCommission = 0;
        let totalPayoutsCommission = 0;
        let balanceUsdt = 0; // Баланс в USDT для countInRubEquivalent = false

        // Для USDT формулы
        let totalDealsUsdt = 0;
        let totalDealsCommissionUsdt = 0;
        let totalPayoutsUsdt = 0;
        let totalPayoutsCommissionUsdt = 0;
        let totalSettledAmount = 0;
        let totalSettledUsdt = 0;

        // Обрабатываем успешные сделки (входящие платежи)
        for (const deal of successfulDealsForBalance) {
          const method = methodCommissionsMap.get(deal.methodId);
          if (method) {
            const commissionAmount =
              deal.amount * (method.commissionPayin / 100);
            const netAmount = deal.amount - commissionAmount;

            calculatedBalance += netAmount;
            totalDealsAmount += deal.amount;
            totalDealsCommission += commissionAmount;

            // Если countInRubEquivalent = false, считаем USDT по merchantRate
            // Получаем настройки ККК для метода из кэша
            const rateSetting = rateSettingsMap.get(deal.methodId);

            // Определяем эффективный курс
            let effectiveRate = deal.merchantRate;
            if (!deal.merchantRate && deal.rate) {
              // Если merchantRate null, рассчитываем по формуле s0 = s / (1 + (p/100)), где p = kkkPercent
              const kkkPercent = rateSetting?.kkkPercent || 0;
              effectiveRate = deal.rate / (1 + kkkPercent / 100);
            }

            if (
              !merchant.countInRubEquivalent &&
              effectiveRate &&
              effectiveRate > 0
            ) {
              // Сначала конвертируем в USDT, потом вычитаем комиссию
              const dealUsdt = deal.amount / effectiveRate;
              const commissionUsdt = dealUsdt * (method.commissionPayin / 100);
              const netUsdt = dealUsdt - commissionUsdt;

              // Обрезаем до 2 знаков после запятой для каждой транзакции отдельно
              const truncatedUsdt = roundDown2(netUsdt);
              const truncatedDealUsdt = roundDown2(dealUsdt);
              const truncatedCommissionUsdt = roundDown2(commissionUsdt);

              balanceUsdt += truncatedUsdt;
              totalDealsUsdt += truncatedDealUsdt;
              totalDealsCommissionUsdt += truncatedCommissionUsdt;
            }
          }
        }

        // Обрабатываем завершенные выплаты (исходящие платежи)
        for (const payout of completedPayoutsForBalance) {
          const commissionPercent =
            payout.method?.commissionPayout ?? payout.feePercent ?? 0;
          const commissionAmount = payout.amount * (commissionPercent / 100);
          const totalAmount = payout.amount + commissionAmount;

          calculatedBalance -= totalAmount;
          totalPayoutsAmount += payout.amount;
          totalPayoutsCommission += commissionAmount;

          // Получаем настройки ККК для метода выплаты из кэша
          const payoutRateSetting = rateSettingsMap.get(payout.methodId);

          // Определяем эффективный курс для выплаты
          let effectiveRate = payout.merchantRate;
          if (!payout.merchantRate && payout.rate) {
            // Если merchantRate null, рассчитываем по формуле s0 = s / (1 + (p/100)), где p = kkkPercent
            const kkkPercent = payoutRateSetting?.kkkPercent || 0;
            effectiveRate = payout.rate / (1 + kkkPercent / 100);
          }

          // Если countInRubEquivalent = false, вычитаем USDT по effectiveRate
          if (
            !merchant.countInRubEquivalent &&
            effectiveRate &&
            effectiveRate > 0
          ) {
            // Конвертируем выплату и комиссию в USDT
            const payoutUsdt = payout.amount / effectiveRate;
            const commissionUsdt = payoutUsdt * (commissionPercent / 100);
            const totalUsdt = payoutUsdt + commissionUsdt;

            // Обрезаем до 2 знаков после запятой для каждой выплаты отдельно
            const truncatedTotalUsdt = roundDown2(totalUsdt);
            const truncatedPayoutUsdt = roundDown2(payoutUsdt);
            const truncatedCommissionUsdt = roundDown2(commissionUsdt);

            balanceUsdt -= truncatedTotalUsdt;
            totalPayoutsUsdt += truncatedPayoutUsdt;
            totalPayoutsCommissionUsdt += truncatedCommissionUsdt;
          }
        }
        // Вычитаем суммы из завершенных запросов на settle
        totalSettledAmount = completedSettles.reduce(
          (sum, s) => sum + s.amount,
          0
        );
        calculatedBalance -= totalSettledAmount;

        if (!merchant.countInRubEquivalent) {
          for (const settle of completedSettles) {
            if (settle.amountUsdt) {
              totalSettledUsdt += roundDown2(settle.amountUsdt);
            }
          }
          balanceUsdt -= totalSettledUsdt;
        }

        // Форматируем статистику по статусам
        const dealStatusStats = dealsByStatus.map((stat) => ({
          status: stat.status,
          count: stat._count._all,
          amount: stat._sum.amount || 0,
        }));

        const payoutStatusStats = payoutsByStatus.map((stat) => ({
          status: stat.status,
          count: stat._count._all,
          amount: stat._sum.amount || 0,
        }));

        return {
          period,
          dateFrom: dateFrom.toISOString(),
          dateTo: dateTo.toISOString(),
          balance: {
            total: calculatedBalance,
            totalUsdt: !merchant.countInRubEquivalent ? balanceUsdt : undefined,
            formula: {
              dealsTotal: totalDealsAmount,
              dealsCommission: totalDealsCommission,
              payoutsTotal: totalPayoutsAmount,
              payoutsCommission: totalPayoutsCommission,
              settledAmount: totalSettledAmount,
              calculation: `${totalDealsAmount} - ${totalDealsCommission} - ${totalPayoutsAmount} - ${totalPayoutsCommission} - ${totalSettledAmount} = ${calculatedBalance}`,
            },
            formulaUsdt: !merchant.countInRubEquivalent
              ? {
                  dealsTotal: totalDealsUsdt,
                  dealsCommission: totalDealsCommissionUsdt,
                  payoutsTotal: totalPayoutsUsdt,
                  payoutsCommission: totalPayoutsCommissionUsdt,
                  settledAmount: totalSettledUsdt,
                  calculation: `${totalDealsUsdt.toFixed(
                    2
                  )} - ${totalDealsCommissionUsdt.toFixed(
                    2
                  )} - ${totalPayoutsUsdt.toFixed(
                    2
                  )} - ${totalPayoutsCommissionUsdt.toFixed(
                    2
                  )} - ${totalSettledUsdt.toFixed(2)} = ${balanceUsdt.toFixed(
                    2
                  )}`,
                }
              : undefined,
          },
          deals: {
            total: dealsTotal,
            successful: dealsSuccess,
            failed: dealsFailed,
            dispute: dealsDispute,
            pending: dealsPending,
            volume: dealsVolume._sum.amount || 0,
            successVolume: dealsSuccessVolume._sum.amount || 0,
            statusBreakdown: dealStatusStats,
            requisiteConversion: {
              rate: conversionRate,
              totalAttempts,
              successfulAttempts,
              failedAttempts,
              errorBreakdown: errorStats.map((e) => ({
                errorCode: e.errorCode || "UNKNOWN",
                count: e._count._all,
              })),
            },
          },
          payouts: {
            total: payoutsTotal,
            successful: payoutsSuccess,
            failed: payoutsFailed,
            pending: payoutsPending,
            volume: payoutsVolume._sum.amount || 0,
            successVolume: payoutsSuccessVolume._sum.amount || 0,
            statusBreakdown: payoutStatusStats,
          },
          methodStats: methodStats,
        };
      },
      {
        tags: ["merchant-dashboard"],
        detail: { summary: "Получение статистики мерчанта" },
        headers: t.Object({ authorization: t.String() }),
        query: t.Object({
          period: t.Optional(
            t.Union([
              t.Literal("24h"),
              t.Literal("today"),
              t.Literal("yesterday"),
              t.Literal("week"),
              t.Literal("month"),
              t.Literal("year"),
              t.Literal("all"),
            ])
          ),
        }),
        response: {
          200: t.Object({
            period: t.String(),
            dateFrom: t.String(),
            dateTo: t.String(),
            balance: t.Object({
              total: t.Number(),
              totalUsdt: t.Optional(t.Number()),
              formula: t.Object({
                dealsTotal: t.Number(),
                dealsCommission: t.Number(),
                payoutsTotal: t.Number(),
                payoutsCommission: t.Number(),
                settledAmount: t.Number(),
                calculation: t.String(),
              }),
              formulaUsdt: t.Optional(
                t.Object({
                  dealsTotal: t.Number(),
                  dealsCommission: t.Number(),
                  payoutsTotal: t.Number(),
                  payoutsCommission: t.Number(),
                  settledAmount: t.Number(),
                  calculation: t.String(),
                })
              ),
            }),
            deals: t.Object({
              total: t.Number(),
              successful: t.Number(),
              failed: t.Number(),
              dispute: t.Number(),
              pending: t.Number(),
              volume: t.Number(),
              successVolume: t.Number(),
              statusBreakdown: t.Array(
                t.Object({
                  status: t.String(),
                  count: t.Number(),
                  amount: t.Number(),
                })
              ),
              requisiteConversion: t.Object({
                rate: t.String(),
                totalAttempts: t.Number(),
                successfulAttempts: t.Number(),
                failedAttempts: t.Number(),
                errorBreakdown: t.Array(
                  t.Object({
                    errorCode: t.String(),
                    count: t.Number(),
                  })
                ),
              }),
            }),
            payouts: t.Object({
              total: t.Number(),
              successful: t.Number(),
              failed: t.Number(),
              pending: t.Number(),
              volume: t.Number(),
              successVolume: t.Number(),
              statusBreakdown: t.Array(
                t.Object({
                  status: t.String(),
                  count: t.Number(),
                  amount: t.Number(),
                })
              ),
            }),
            methodStats: t.Array(
              t.Object({
                methodId: t.String(),
                methodName: t.String(),
                methodCode: t.String(),
                commissionPayin: t.Number(),
                commissionPayout: t.Number(),
                deals: t.Object({
                  total: t.Number(),
                  successful: t.Number(),
                  volume: t.Number(),
                  successVolume: t.Number(),
                }),
                payouts: t.Object({
                  total: t.Number(),
                  successful: t.Number(),
                  volume: t.Number(),
                  successVolume: t.Number(),
                }),
                total: t.Object({
                  transactions: t.Number(),
                  successfulTransactions: t.Number(),
                }),
              })
            ),
          }),
          401: ErrorSchema,
        },
      }
    )

    /* ──────── GET /merchant/dashboard/transactions ──────── */
    .get(
      "/transactions",
      async ({ merchant, query }) => {
        // Построение фильтров
        const where: Prisma.TransactionWhereInput = {
          merchantId: merchant.id,
          ...(query.status && { status: query.status as Status }),
          ...(query.type && { type: query.type as TransactionType }),
          ...(query.methodId && { methodId: query.methodId }),
        };

        // Расширенный поиск по всем полям
        if (query.search) {
          const searchNumber = Number(query.search);
          const isNumber = !isNaN(searchNumber);

          where.OR = [
            { id: { contains: query.search } },
            { orderId: { contains: query.search } },
            { clientName: { contains: query.search, mode: "insensitive" } },
            ...(isNumber
              ? [{ numericId: searchNumber }, { amount: searchNumber }]
              : []),
            {
              method: {
                OR: [
                  { name: { contains: query.search, mode: "insensitive" } },
                  { code: { contains: query.search, mode: "insensitive" } },
                ],
              },
            },
          ];
        } else if (query.orderId) {
          // Если не поиск, то используем фильтр по orderId
          where.orderId = { contains: query.orderId };
        }

        // Фильтры по датам
        if (query.dateFrom && !query.dateTo) {
          where.createdAt = { gte: new Date(query.dateFrom) };
        } else if (!query.dateFrom && query.dateTo) {
          where.createdAt = { lte: new Date(query.dateTo) };
        } else if (query.dateFrom && query.dateTo) {
          where.createdAt = {
            gte: new Date(query.dateFrom),
            lte: new Date(query.dateTo),
          };
        }

        // Фильтры по суммам
        if (query.amountFrom && !query.amountTo) {
          where.amount = { gte: Number(query.amountFrom) };
        } else if (!query.amountFrom && query.amountTo) {
          where.amount = { lte: Number(query.amountTo) };
        } else if (query.amountFrom && query.amountTo) {
          where.amount = {
            gte: Number(query.amountFrom),
            lte: Number(query.amountTo),
          };
        }

        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const skip = (page - 1) * limit;

        // Определение сортировки
        let orderBy: any = { createdAt: "desc" };
        if (query.sortBy) {
          switch (query.sortBy) {
            case "createdAt":
              orderBy = { createdAt: query.sortOrder || "desc" };
              break;
            case "amount":
              orderBy = { amount: query.sortOrder || "desc" };
              break;
            case "status":
              orderBy = { status: query.sortOrder || "asc" };
              break;
            default:
              orderBy = { createdAt: "desc" };
          }
        }

        const [transactions, total] = await Promise.all([
          db.transaction.findMany({
            where,
            select: {
              id: true,
              numericId: true,
              orderId: true,
              amount: true,
              status: true,
              type: true,
              clientName: true,
              rate: true,
              merchantRate: true,
              commission: true,
              error: true,
              createdAt: true,
              updatedAt: true,
              acceptedAt: true,
              expired_at: true,
              method: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  type: true,
                  currency: true,
                  commissionPayin: true,
                  commissionPayout: true,
                },
              },
              trader: {
                select: {
                  id: true,
                  name: true,
                },
              },
              receipts: {
                select: {
                  id: true,
                  fileName: true,
                  isChecked: true,
                  isFake: true,
                  createdAt: true,
                },
                orderBy: { createdAt: "desc" },
              },
            },
            skip,
            take: limit,
            orderBy,
          }),
          db.transaction.count({ where }),
        ]);

        // Получаем настройки ККК для методов
        const methodIds = [
          ...new Set(transactions.map((tx) => tx.method?.id).filter(Boolean)),
        ];
        const rateSettings = await db.rateSettings.findMany({
          where: { methodId: { in: methodIds } },
        });
        const rateSettingsMap = new Map(
          rateSettings.map((rs) => [rs.methodId, rs])
        );

        // Форматируем данные
        const data = transactions.map((tx) => {
          // Если merchantRate null, рассчитываем эффективный курс по формуле
          let effectiveRate = tx.merchantRate;
          let isRecalculated = false;

          if (!tx.merchantRate && tx.rate && tx.method) {
            // s0 = s / (1 + (p/100)), где s = rate, p = kkkPercent из RateSettings
            const rateSetting = rateSettingsMap.get(tx.method.id);
            const kkkPercent = rateSetting?.kkkPercent || 0;
            effectiveRate = tx.rate / (1 + kkkPercent / 100);
            isRecalculated = true;
          }

          return {
            id: tx.id,
            numericId: tx.numericId,
            orderId: tx.orderId,
            amount: tx.amount,
            status: tx.status,
            type: tx.type,
            clientName: tx.clientName,
            rate: tx.rate,
            merchantRate: tx.merchantRate,
            effectiveRate: effectiveRate,
            isRecalculated: isRecalculated,
            commission: tx.commission,
            error: tx.error,
            createdAt: tx.createdAt.toISOString(),
            updatedAt: tx.updatedAt.toISOString(),
            acceptedAt: tx.acceptedAt?.toISOString() || null,
            expiredAt: tx.expired_at.toISOString(),
            method: tx.method,
            trader: tx.trader,
            receipts: tx.receipts.map((r) => ({
              ...r,
              createdAt: r.createdAt.toISOString(),
            })),
            receiptCount: tx.receipts.length,
            hasDispute: tx.receipts.some((r) => r.isFake),
          };
        });

        return {
          data,
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
          },
        };
      },
      {
        tags: ["merchant-dashboard"],
        detail: {
          summary: "Получение списка транзакций с расширенными фильтрами",
        },
        headers: t.Object({ authorization: t.String() }),
        query: t.Object({
          page: t.Optional(t.String()),
          limit: t.Optional(t.String()),
          status: t.Optional(t.String()),
          type: t.Optional(t.String()),
          methodId: t.Optional(t.String()),
          orderId: t.Optional(t.String()),
          search: t.Optional(t.String()),
          dateFrom: t.Optional(t.String()),
          dateTo: t.Optional(t.String()),
          amountFrom: t.Optional(t.String()),
          amountTo: t.Optional(t.String()),
          sortBy: t.Optional(t.String()),
          sortOrder: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
        }),
        response: {
          200: t.Object({
            data: t.Array(
              t.Object({
                id: t.String(),
                numericId: t.Number(),
                orderId: t.String(),
                amount: t.Number(),
                status: t.Enum(Status),
                type: t.Enum(TransactionType),
                clientName: t.String(),
                rate: t.Union([t.Number(), t.Null()]),
                merchantRate: t.Union([t.Number(), t.Null()]),
                effectiveRate: t.Union([t.Number(), t.Null()]),
                isRecalculated: t.Boolean(),
                commission: t.Number(),
                error: t.Union([t.String(), t.Null()]),
                createdAt: t.String(),
                updatedAt: t.String(),
                acceptedAt: t.Union([t.String(), t.Null()]),
                expiredAt: t.String(),
                method: t.Object({
                  id: t.String(),
                  code: t.String(),
                  name: t.String(),
                  type: t.Enum(MethodType),
                  currency: t.Enum(Currency),
                  commissionPayin: t.Number(),
                  commissionPayout: t.Number(),
                }),
                trader: t.Union([
                  t.Object({
                    id: t.String(),
                    name: t.String(),
                  }),
                  t.Null(),
                ]),
                receipts: t.Array(
                  t.Object({
                    id: t.String(),
                    fileName: t.String(),
                    isChecked: t.Boolean(),
                    isFake: t.Boolean(),
                    createdAt: t.String(),
                  })
                ),
                receiptCount: t.Number(),
                hasDispute: t.Boolean(),
              })
            ),
            pagination: t.Object({
              total: t.Number(),
              page: t.Number(),
              limit: t.Number(),
              pages: t.Number(),
            }),
          }),
          401: ErrorSchema,
        },
      }
    )

    /* ──────── POST /merchant/dashboard/transactions/:id/dispute ──────── */
    .post(
      "/transactions/:id/dispute",
      async ({ params, body, merchant, set, error }) => {
        try {
          // Проверяем существование транзакции и принадлежность мерчанту
          const transaction = await db.transaction.findFirst({
            where: {
              id: params.id,
              merchantId: merchant.id,
              type: TransactionType.IN, // Споры только для входящих транзакций
            },
          });

          if (!transaction) {
            return error(404, { error: "Транзакция не найдена" });
          }

          // Проверяем статус транзакции
          if (transaction.status !== Status.READY) {
            return error(400, {
              error: "Спор можно создать только для завершенных транзакций",
            });
          }

          // Обновляем статус транзакции
          await db.transaction.update({
            where: { id: transaction.id },
            data: {
              status: Status.DISPUTE,
              error: body.reason || "Спор инициирован мерчантом",
            },
          });

          // Создаем записи о загруженных файлах (чеках)
          if (body.files && body.files.length > 0) {
            const receipts = body.files.map((file) => ({
              transactionId: transaction.id,
              fileData: file.data,
              fileName: file.name,
              isChecked: false,
              isFake: true, // Помечаем как спорные
              isAuto: false,
            }));

            await db.receipt.createMany({
              data: receipts,
            });
          }

          // Добавляем уведомление для администратора (через SystemConfig)
          await db.systemConfig.create({
            data: {
              key: `dispute_${transaction.id}_${Date.now()}`,
              value: JSON.stringify({
                type: "dispute",
                transactionId: transaction.id,
                merchantId: merchant.id,
                merchantName: merchant.name,
                reason: body.reason,
                files: body.files?.length || 0,
                createdAt: new Date(),
              }),
            },
          });

          set.status = 201;
          return {
            success: true,
            disputeId: transaction.id,
            message: "Спор успешно создан",
          };
        } catch (e) {
          throw e;
        }
      },
      {
        tags: ["merchant-dashboard"],
        detail: { summary: "Создание спора по транзакции с загрузкой файлов" },
        headers: t.Object({ authorization: t.String() }),
        params: t.Object({ id: t.String({ description: "ID транзакции" }) }),
        body: t.Object({
          reason: t.String({ description: "Причина спора" }),
          files: t.Optional(
            t.Array(
              t.Object({
                name: t.String({ description: "Имя файла" }),
                data: t.String({ description: "Файл в формате base64" }),
              })
            )
          ),
        }),
        response: {
          201: t.Object({
            success: t.Boolean(),
            disputeId: t.String(),
            message: t.String(),
          }),
          400: ErrorSchema,
          404: ErrorSchema,
          401: ErrorSchema,
        },
      }
    )

    /* ──────── GET /merchant/dashboard/chart-data ──────── */
    .get(
      "/chart-data",
      async ({ merchant, query }) => {
        const days = Number(query.days) || 7;
        const startDate = subDays(new Date(), days);

        // Получаем данные по дням
        const transactions = await db.transaction.findMany({
          where: {
            merchantId: merchant.id,
            createdAt: { gte: startDate },
          },
          select: {
            createdAt: true,
            amount: true,
            status: true,
            type: true,
          },
        });

        // Группируем по дням
        const dailyData = new Map<
          string,
          {
            date: string;
            totalAmount: number;
            successAmount: number;
            totalCount: number;
            successCount: number;
            inCount: number;
            outCount: number;
          }
        >();

        // Инициализируем все дни
        for (let i = 0; i <= days; i++) {
          const date = format(subDays(new Date(), days - i), "yyyy-MM-dd");
          dailyData.set(date, {
            date,
            totalAmount: 0,
            successAmount: 0,
            totalCount: 0,
            successCount: 0,
            inCount: 0,
            outCount: 0,
          });
        }

        // Заполняем данными
        transactions.forEach((tx) => {
          const date = format(tx.createdAt, "yyyy-MM-dd");
          const data = dailyData.get(date);

          if (data) {
            data.totalCount++;
            data.totalAmount += tx.amount;

            if (tx.status === Status.READY) {
              data.successCount++;
              data.successAmount += tx.amount;
            }

            if (tx.type === TransactionType.IN) {
              data.inCount++;
            } else {
              data.outCount++;
            }
          }
        });

        return {
          days,
          data: Array.from(dailyData.values()),
        };
      },
      {
        tags: ["merchant-dashboard"],
        detail: { summary: "Получение данных для графиков" },
        headers: t.Object({ authorization: t.String() }),
        query: t.Object({
          days: t.Optional(t.String()),
        }),

        response: {
          200: t.Object({
            days: t.Number(),
            data: t.Array(
              t.Object({
                date: t.String(),
                totalAmount: t.Number(),
                successAmount: t.Number(),
                totalCount: t.Number(),
                successCount: t.Number(),
                inCount: t.Number(),
                outCount: t.Number(),
              })
            ),
          }),
          401: ErrorSchema,
        },
      }
    )

    /* ──────── POST /merchant/dashboard/settle-request ──────── */
    .post(
      "/settle-request",
      async ({ merchant, body, set, error }) => {
        try {
          const { amount, amountUsdt, rate, settlementAddress } = body;

          const pendingRequest = await db.settleRequest.findFirst({
            where: {
              merchantId: merchant.id,
              status: "PENDING",
            },
          });

          if (pendingRequest) {
            return error(400, {
              error: "У вас уже есть активный запрос на вывод средств",
            });
          }

          if (!amount || amount <= 0) {
            return error(400, {
              error: "Недостаточно средств для вывода",
            });
          }

          const finalAmountUsdt =
            amountUsdt ?? (rate ? amount / rate : undefined);

          const settleRequest = await db.settleRequest.create({
            data: {
              merchantId: merchant.id,
              amount,
              amountUsdt: finalAmountUsdt,
              rate,
              settlementAddress,
              updatedAt: new Date(),
            },
          });

          set.status = 201;

          return {
            success: true,
            request: {
              id: settleRequest.id,
              amount: settleRequest.amount,
              amountUsdt: settleRequest.amountUsdt,
              rate: settleRequest.rate,
              settlementAddress: settleRequest.settlementAddress,
              status: settleRequest.status,
              createdAt: settleRequest.createdAt.toISOString(),
            },
          };
        } catch (e) {
          console.error("Failed to create settle request - detailed error:", e);
          console.error(
            "Error stack:",
            e instanceof Error ? e.stack : "No stack trace"
          );
          return error(500, { error: "Failed to create settle request" });
        }
      },
      {
        body: t.Object({
          amount: t.Number(),
          amountUsdt: t.Optional(t.Number()),
          rate: t.Number(),
          settlementAddress: t.Optional(t.String()),
        }),
        tags: ["merchant-dashboard"],
        detail: { summary: "Создание запроса на Settle (вывод средств)" },
        headers: t.Object({ authorization: t.String() }),
        response: {
          201: t.Object({
            success: t.Boolean(),
            request: t.Object({
              id: t.String(),
              amount: t.Number(),
              amountUsdt: t.Number(),
              rate: t.Number(),
              settlementAddress: t.Optional(t.String()),
              status: t.String(),
              createdAt: t.String(),
            }),
          }),
          400: ErrorSchema,
          409: ErrorSchema,
          401: ErrorSchema,
        },
      }
    )

    /* ──────── GET /merchant/dashboard/settle-requests ──────── */
    .get(
      "/settle-requests",
      async ({ merchant, query }) => {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const skip = (page - 1) * limit;

        const where: any = { merchantId: merchant.id };
        if (query.status) {
          where.status = query.status;
        }

        const [requests, total] = await Promise.all([
          db.settleRequest.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
          }),
          db.settleRequest.count({ where }),
        ]);

        return {
          data: requests.map((r) => ({
            id: r.id,
            amount: r.amount,
            amountUsdt: r.amountUsdt,
            rate: r.rate,
            status: r.status,
            createdAt: r.createdAt.toISOString(),
            processedAt: r.processedAt?.toISOString() || null,
            processedBy: r.processedBy || null,
            cancelReason: r.cancelReason || null,
          })),
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
          },
        };
      },
      {
        tags: ["merchant-dashboard"],
        detail: { summary: "Получение истории запросов Settle" },
        headers: t.Object({ authorization: t.String() }),
        query: t.Object({
          page: t.Optional(t.String()),
          limit: t.Optional(t.String()),
          status: t.Optional(t.String()),
        }),
        response: {
          200: t.Object({
            data: t.Array(
              t.Object({
                id: t.String(),
                amount: t.Number(),
                amountUsdt: t.Number(),
                rate: t.Number(),
                status: t.String(),
                createdAt: t.String(),
                processedAt: t.Union([t.String(), t.Null()]),
                processedBy: t.Union([t.String(), t.Null()]),
                cancelReason: t.Union([t.String(), t.Null()]),
              })
            ),
            pagination: t.Object({
              total: t.Number(),
              page: t.Number(),
              limit: t.Number(),
              pages: t.Number(),
            }),
          }),
          401: ErrorSchema,
        },
      }
    )

    /* ──────── POST /merchant/dashboard/2fa/setup ──────── */
    .post(
      "/2fa/setup",
      async ({ merchant, error }) => {
        if (merchant.totpEnabled && merchant.totpSecret) {
          return error(400, { error: "2FA уже включена" });
        }
        const { authenticator } = await import("otplib");
        const secret = authenticator.generateSecret();
        const label = encodeURIComponent(`Merchant:${merchant.name}`);
        const issuer = encodeURIComponent("Chase");
        const otpauth = `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}`;
        // Сохраняем временно секрет в SystemConfig до подтверждения
        const setupId = Math.random().toString(36).slice(2);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await db.systemConfig.upsert({
          where: { key: `merchant_totp_setup_${setupId}` },
          update: {
            value: JSON.stringify({
              merchantId: merchant.id,
              secret,
              expiresAt,
            }),
          },
          create: {
            key: `merchant_totp_setup_${setupId}`,
            value: JSON.stringify({
              merchantId: merchant.id,
              secret,
              expiresAt,
            }),
          },
        });
        return { setupId, otpauth, secret };
      },
      {
        tags: ["merchant-dashboard"],
        detail: { summary: "Инициализация настройки 2FA (TOTP)" },
        headers: t.Object({ authorization: t.String() }),
        response: {
          200: t.Object({
            setupId: t.String(),
            otpauth: t.String(),
            secret: t.String(),
          }),
          400: ErrorSchema,
        },
      }
    )

    /* ──────── POST /merchant/dashboard/2fa/confirm ──────── */
    .post(
      "/2fa/confirm",
      async ({ merchant, body, error }) => {
        const { setupId, code } = body as { setupId: string; code: string };
        const setup = await db.systemConfig.findUnique({
          where: { key: `merchant_totp_setup_${setupId}` },
        });
        if (!setup) return error(400, { error: "Неверный setupId" });
        const payload = JSON.parse(setup.value);
        if (payload.merchantId !== merchant.id)
          return error(403, { error: "Доступ запрещен" });
        if (new Date(payload.expiresAt) < new Date()) {
          await db.systemConfig.delete({
            where: { key: `merchant_totp_setup_${setupId}` },
          });
          return error(400, { error: "Время настройки истекло" });
        }
        const { authenticator } = await import("otplib");
        const valid = authenticator.verify({
          token: code,
          secret: payload.secret,
        });
        if (!valid) return error(401, { error: "Неверный код" });
        await db.merchant.update({
          where: { id: merchant.id },
          data: { totpEnabled: true, totpSecret: payload.secret },
        });
        await db.systemConfig.delete({
          where: { key: `merchant_totp_setup_${setupId}` },
        });
        return { success: true };
      },
      {
        tags: ["merchant-dashboard"],
        detail: { summary: "Подтверждение и включение 2FA (TOTP)" },
        headers: t.Object({ authorization: t.String() }),
        body: t.Object({ setupId: t.String(), code: t.String() }),
        response: {
          200: t.Object({ success: t.Boolean() }),
          400: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      }
    )

    /* ──────── POST /merchant/dashboard/2fa/disable ──────── */
    .post(
      "/2fa/disable",
      async ({ merchant }) => {
        await db.merchant.update({
          where: { id: merchant.id },
          data: { totpEnabled: false, totpSecret: null },
        });
        return { success: true };
      },
      {
        tags: ["merchant-dashboard"],
        detail: { summary: "Отключение 2FA (TOTP) мерчантом" },
        headers: t.Object({ authorization: t.String() }),
        response: { 200: t.Object({ success: t.Boolean() }) },
      }
    );
