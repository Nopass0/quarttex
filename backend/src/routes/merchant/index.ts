// src/routes/merchant/index.ts
import { Elysia, t } from "elysia";
import { db } from "@/db";
import {
  Prisma,
  Status,
  TransactionType,
  MethodType,
  Currency,
  BankType,
} from "@prisma/client";
import ErrorSchema from "@/types/error";
import { merchantGuard } from "@/middleware/merchantGuard";
import { endOfDay, endOfMonth, startOfDay, startOfMonth } from "date-fns";
import { truncate2, roundDown2, roundUp2 } from "@/utils/rounding";
import authRoutes from "./auth";
import dashboardRoutes from "./dashboard";
import apiDocsRoutes from "./api-docs";
import tradersRoutes from "./traders";
import payoutsRoutes from "./payouts";
import { disputesRoutes } from "./disputes";
import { dealDisputesRoutes } from "./deal-disputes";
import { dealDisputesApiRoutes } from "./deal-disputes-api";
import { payoutDisputesApiRoutes } from "./payout-disputes-api";
import staffRoutes from "./staff";
import { rapiraService } from "@/services/rapira.service";
import { bybitService } from "@/services/bybit.service";
import { ceilUp2 } from "@/utils/freezing";
import { merchantPayoutsApi } from "@/api/merchant/payouts";
import { validateFileUpload } from "@/middleware/fileUploadValidation";
import { MerchantRequestLogService } from "@/services/merchant-request-log.service";
import { MerchantRequestType } from "@prisma/client";
import { calculateMerchantBalance } from "@/services/merchant-balance.service";
import { auctionIntegrationService } from "@/services/auction-integration.service";
import { auctionMerchantGuard } from "@/middleware/auctionMerchantGuard";

export default (app: Elysia) =>
  app
    // Публичные маршруты аутентификации (без merchantGuard)
    .group("/auth", (app) => app.use(authRoutes))

    // Защищенные маршруты дашборда (с merchantSessionGuard)
    .group("/dashboard", (app) => app.use(dashboardRoutes))

    // Защищенные маршруты API документации (с merchantSessionGuard)
    .group("/api-docs", (app) => app.use(apiDocsRoutes))

    // Payouts routes (с merchantSessionGuard)
    .group("/payouts", (app) => app.use(payoutsRoutes))

    // Deal dispute routes (с merchantSessionGuard)
    .group("/deal-disputes", (app) => app.use(dealDisputesRoutes))

    // Staff routes (с merchantSessionGuard, только для owner)
    .group("/staff", (app) => app.use(staffRoutes))

    // Основные API маршруты (с merchantGuard для API ключа)
    .use(merchantGuard())

    // Deal disputes API routes (с merchantGuard для API ключа)
    .group("/deal-disputes", (app) => app.use(dealDisputesApiRoutes))

    // Payout disputes API routes (с merchantGuard для API ключа)
    .group("/payout-disputes", (app) => app.use(payoutDisputesApiRoutes))

    // Traders routes
    .group("/traders", (app) => app.use(tradersRoutes))

    // Payout API routes
    .use(merchantPayoutsApi)

    // Dispute routes
    .use(disputesRoutes)

    /* ──────── GET /merchant/connect ──────── */
    .get(
      "/connect",
      async ({ merchant }) => {
        // merchant уже проверен в merchantGuard
        //get all transaction count for this merchant
        const transactions = await db.transaction.count({
          where: { merchantId: merchant.id },
        });
        //paid
        const paid = await db.transaction.count({
          where: { merchantId: merchant.id, status: Status.READY },
        });
        return {
          id: String(merchant.id), // bigint → string
          name: merchant.name,
          createdAt: merchant.createdAt.toISOString(),
          totalTx: transactions,
          paidTx: paid,
        };
      },
      {
        tags: ["merchant"],
        detail: { summary: "Получение информации о мерчанте" },
        headers: t.Object({ "x-merchant-api-key": t.String() }),
        response: {
          200: t.Object({
            id: t.String({ description: "ID мерчанта" }),
            name: t.String({ description: "Название мерчанта" }),
            createdAt: t.String({ description: "Дата создания мерчанта" }),
            totalTx: t.Number({ description: "Всего транзакций" }),
            paidTx: t.Number({ description: "Транзакций со статусом READY" }),
          }),
          401: ErrorSchema,
        },
      }
    )

    /* ──────── GET /merchant/balance ──────── */
    .get(
      "/balance",
      async ({ merchant }) => {
        const { total, totalUsdt } = await calculateMerchantBalance({
          id: merchant.id,
          countInRubEquivalent: merchant.countInRubEquivalent,
        });
        return {
          balance: merchant.countInRubEquivalent ? total : totalUsdt || 0,
        };
      },
      {
        tags: ["merchant"],
        detail: { summary: "Получение текущего баланса мерчанта" },
        headers: t.Object({ "x-merchant-api-key": t.String() }),
        response: {
          200: t.Object({ balance: t.Number() }),
          401: ErrorSchema,
        },
      }
    )
    
    /* ──────── GET /merchant/profile ──────── */
    .get(
      "/profile",
      async ({ merchant }) => {
        return {
          id: merchant.id,
          name: merchant.name,
          token: merchant.token,
          disabled: merchant.disabled,
          banned: merchant.banned,
          balanceUsdt: merchant.balanceUsdt,
          countInRubEquivalent: merchant.countInRubEquivalent,
          isAggregatorMode: merchant.isAggregatorMode || false,
          externalApiToken: merchant.externalApiToken,
          externalCallbackToken: merchant.externalCallbackToken,
          createdAt: merchant.createdAt.toISOString()
        };
      },
      {
        tags: ["merchant"],
        detail: { summary: "Получение профиля мерчанта" },
        response: {
          200: t.Object({
            id: t.String(),
            name: t.String(),
            token: t.String(),
            disabled: t.Boolean(),
            banned: t.Boolean(),
            balanceUsdt: t.Number(),
            countInRubEquivalent: t.Boolean(),
            isAggregatorMode: t.Boolean(),
            externalApiToken: t.Union([t.String(), t.Null()]),
            externalCallbackToken: t.Union([t.String(), t.Null()]),
            createdAt: t.String()
          }),
          401: ErrorSchema
        }
      }
    )
    
    /* ──────── PATCH /merchant/settings/aggregator-mode ──────── */
    .patch(
      "/settings/aggregator-mode",
      async ({ merchant, body, error }) => {
        try {
          const updateData: any = {};
          
          if (body.isAggregatorMode !== undefined) {
            updateData.isAggregatorMode = body.isAggregatorMode;
          }
          
          if (body.externalApiToken !== undefined) {
            // Проверяем уникальность токена
            if (body.externalApiToken) {
              const existing = await db.merchant.findFirst({
                where: {
                  externalApiToken: body.externalApiToken,
                  id: { not: merchant.id }
                }
              });
              
              if (existing) {
                return error(400, { error: "Этот API токен уже используется" });
              }
            }
            updateData.externalApiToken = body.externalApiToken;
          }
          
          if (body.externalCallbackToken !== undefined) {
            updateData.externalCallbackToken = body.externalCallbackToken;
          }
          
          const updated = await db.merchant.update({
            where: { id: merchant.id },
            data: updateData
          });
          
          return {
            success: true,
            merchant: {
              id: updated.id,
              name: updated.name,
              isAggregatorMode: updated.isAggregatorMode,
              externalApiToken: updated.externalApiToken,
              externalCallbackToken: updated.externalCallbackToken
            }
          };
        } catch (e) {
          console.error("Error updating aggregator mode settings:", e);
          return error(500, { error: "Ошибка при обновлении настроек" });
        }
      },
      {
        tags: ["merchant"],
        detail: { summary: "Обновление настроек агрегаторского режима" },
        body: t.Object({
          isAggregatorMode: t.Optional(t.Boolean()),
          externalApiToken: t.Optional(t.Union([t.String(), t.Null()])),
          externalCallbackToken: t.Optional(t.Union([t.String(), t.Null()]))
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            merchant: t.Object({
              id: t.String(),
              name: t.String(),
              isAggregatorMode: t.Union([t.Boolean(), t.Null()]),
              externalApiToken: t.Union([t.String(), t.Null()]),
              externalCallbackToken: t.Union([t.String(), t.Null()])
            })
          }),
          400: ErrorSchema,
          401: ErrorSchema,
          500: ErrorSchema
        }
      }
    )

    /* ──────── PATCH /merchant/transactions/by-order-id/:orderId/cancel ──────── */
    .patch(
      "/transactions/by-order-id/:orderId/cancel",
      async ({ params, merchant, error }) => {
        // merchant уже проверен в merchantGuard
        // Ищем транзакцию по orderId
        const transaction = await db.transaction.findFirst({
          where: { orderId: params.orderId, merchantId: merchant.id },
        });

        if (!transaction) {
          return error(404, { error: "Транзакция не найдена" });
        }

        // Проверяем, можно ли отменить транзакцию
        if (
          transaction.status === Status.EXPIRED ||
          transaction.status === Status.CANCELED
        ) {
          return error(400, {
            error: "Невозможно отменить завершенную транзакцию",
          });
        }

        const updated = await db.$transaction(async (prisma) => {
          const tx = await prisma.transaction.update({
            where: { id: transaction.id },
            data: { status: Status.CANCELED },
            include: {
              trader: true,
            },
          });

          // Размораживаем средства для IN транзакций при отмене
          if (
            tx.type === "IN" &&
            tx.traderId &&
            tx.frozenUsdtAmount &&
            tx.calculatedCommission
          ) {
            const totalToUnfreeze =
              tx.frozenUsdtAmount + tx.calculatedCommission;

            await prisma.user.update({
              where: { id: tx.traderId },
              data: {
                frozenUsdt: { decrement: truncate2(totalToUnfreeze) },
              },
            });
          }

          return tx;
        });

        return {
          success: true,
          transaction: {
            id: updated.id,
            numericId: updated.numericId,
            merchantId: updated.merchantId,
            amount: updated.amount,
            assetOrBank: updated.assetOrBank,
            orderId: updated.orderId,
            methodId: updated.methodId,
            currency: updated.currency,
            userId: updated.userId,
            userIp: updated.userIp,
            callbackUri: updated.callbackUri,
            successUri: updated.successUri,
            failUri: updated.failUri,
            type: updated.type,
            expired_at: updated.expired_at.toISOString(),
            commission: updated.commission,
            clientName: updated.clientName,
            status: updated.status,
            rate: updated.rate,
            traderId: updated.traderId,
            isMock: updated.isMock,
            createdAt: updated.createdAt.toISOString(),
            updatedAt: updated.updatedAt.toISOString(),
          },
        };
      },
      {
        tags: ["merchant"],
        detail: { summary: "Отмена транзакции по orderId" },
        headers: t.Object({ "x-merchant-api-key": t.String() }),
        params: t.Object({
          orderId: t.String({ description: "Order ID транзакции" }),
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            transaction: t.Object({
              id: t.String(),
              numericId: t.Number(),
              merchantId: t.String(),
              amount: t.Number(),
              assetOrBank: t.String(),
              orderId: t.String(),
              methodId: t.String(),
              currency: t.Nullable(t.String()),
              userId: t.String(),
              userIp: t.Nullable(t.String()),
              callbackUri: t.String(),
              successUri: t.String(),
              failUri: t.String(),
              type: t.String(),
              expired_at: t.String(),
              commission: t.Number(),
              clientName: t.String(),
              status: t.String(),
              rate: t.Nullable(t.Number()),
              traderId: t.Nullable(t.String()),
              isMock: t.Boolean(),
              createdAt: t.String(),
              updatedAt: t.String(),
            }),
          }),
          400: ErrorSchema,
          404: ErrorSchema,
          401: ErrorSchema,
        },
      }
    )

    /* ──────── GET /merchant/transactions/status/:id ──────── */
    .get(
      "/transactions/status/:id",
      async ({ params, merchant, error }) => {
        // merchant уже проверен в merchantGuard
        try {
          const transaction = await db.transaction.findUniqueOrThrow({
            where: { id: params.id, merchantId: merchant.id },
            select: {
              id: true,
              orderId: true,
              amount: true,
              status: true,
              type: true,
              createdAt: true,
              updatedAt: true,
              method: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  type: true,
                  currency: true,
                },
              },
            },
          });

          return {
            ...transaction,
            createdAt: transaction.createdAt.toISOString(),
            updatedAt: transaction.updatedAt.toISOString(),
          };
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2025"
          )
            return error(404, { error: "Транзакция не найдена" });
          throw e;
        }
      },
      {
        tags: ["merchant"],
        detail: { summary: "Получение статуса транзакции по ID" },
        headers: t.Object({ "x-merchant-api-key": t.String() }),
        params: t.Object({ id: t.String({ description: "ID транзакции" }) }),
        response: {
          200: t.Object({
            id: t.String(),
            orderId: t.String(),
            amount: t.Number(),
            status: t.Enum(Status),
            type: t.Enum(TransactionType),
            createdAt: t.String(),
            updatedAt: t.String(),
            method: t.Object({
              id: t.String(),
              code: t.String(),
              name: t.String(),
              type: t.Enum(MethodType),
              currency: t.Enum(Currency),
            }),
          }),
          404: ErrorSchema,
          401: ErrorSchema,
        },
      }
    )

    /* ──────── GET /merchant/transactions/list ──────── */
    .get(
      "/transactions/list",
      async ({ query, merchant, error }) => {
        // merchant уже проверен в merchantGuard
        const where: Prisma.TransactionWhereInput = {
          merchantId: merchant.id,
          ...(query.status && { status: query.status as Status }),
          ...(query.type && { type: query.type as TransactionType }),
          ...(query.methodId && { methodId: query.methodId }),
          ...(query.orderId && { orderId: query.orderId }),
        };

        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 10;
        const skip = (page - 1) * limit;

        const [transactions, total] = await Promise.all([
          db.transaction.findMany({
            where,
            select: {
              id: true,
              orderId: true,
              amount: true,
              status: true,
              type: true,
              createdAt: true,
              updatedAt: true,
              isMock: true,
              method: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  type: true,
                  currency: true,
                },
              },
            },
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
          }),
          db.transaction.count({ where }),
        ]);

        // Convert dates to ISO strings
        const data = transactions.map((tx) => ({
          ...tx,
          createdAt: tx.createdAt.toISOString(),
          updatedAt: tx.updatedAt.toISOString(),
          isMock: tx.isMock,
        }));

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
        tags: ["merchant"],
        detail: { summary: "Получение списка транзакций мерчанта" },
        headers: t.Object({ "x-merchant-api-key": t.String() }),
        query: t.Object({
          page: t.Optional(t.String()),
          limit: t.Optional(t.String()),
          status: t.Optional(t.String()),
          type: t.Optional(t.String()),
          methodId: t.Optional(t.String()),
          orderId: t.Optional(t.String()),
        }),
        response: {
          200: t.Object({
            data: t.Array(
              t.Object({
                id: t.String(),
                orderId: t.String(),
                amount: t.Number(),
                status: t.Enum(Status),
                type: t.Enum(TransactionType),
                createdAt: t.String(),
                updatedAt: t.String(),
                isMock: t.Boolean(),
                method: t.Object({
                  id: t.String(),
                  code: t.String(),
                  name: t.String(),
                  type: t.Enum(MethodType),
                  currency: t.Enum(Currency),
                }),
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

    /* ──────── POST /merchant/transactions/in ──────── */
    .use(auctionMerchantGuard())
    .post(
      "/transactions/in",
      async ({ body, merchant, set, error, isAuctionMerchant, auctionConfig }) => {
        const startTime = Date.now();
        console.log(`[Merchant IN] Starting transaction processing for order: ${body.orderId}`);
        
        // Проверяем, не отключен ли мерчант
        if (merchant.disabled) {
          return error(403, {
            error: "Ваш трафик временно отключен. Обратитесь к администратору.",
          });
        }

        // Логируем, если мерчант аукционный (но обрабатываем как обычный)
        if (isAuctionMerchant) {
          console.log(`[Merchant] Аукционный мерчант ${merchant.name}, будем уведомлять внешнюю систему`);
        }

        // 🚀 ОПТИМИЗАЦИЯ: Кэшируем курс на 30 секунд
        const cacheKey = 'rapira_rate';
        let rapiraRate: number;
        
        try {
          // Проверяем кэш курса (если есть Redis/Memory cache)
          rapiraRate = await rapiraService.getUsdtRubRate();
        } catch (error) {
          console.error("Failed to get rate from Rapira:", error);
          rapiraRate = 95; // Default fallback rate
        }

        // Validate rate based on merchant's countInRubEquivalent setting
        let rate: number;

        if (merchant.countInRubEquivalent) {
          if (body.rate !== undefined) {
            return error(400, {
              error: "Курс не должен передаваться при включенных расчетах в рублях. Курс автоматически получается от системы.",
            });
          }
          rate = rapiraRate;
        } else {
          if (body.rate === undefined) {
            return error(400, {
              error: "Курс обязателен при выключенных расчетах в рублях. Укажите параметр rate.",
            });
          }
          rate = body.rate;
        }

        // Генерируем значения по умолчанию
        const expired_at = body.expired_at
          ? new Date(body.expired_at)
          : new Date(Date.now() + 86_400_000);

        // 🚀 ОПТИМИЗАЦИЯ: Сначала получаем method и duplicate check параллельно
        const [merchantMethod, duplicateCheck] = await Promise.all([
          db.merchantMethod.findUnique({
            where: {
              merchantId_methodId: {
                merchantId: merchant.id,
                methodId: body.methodId,
              },
            },
            include: {
              method: true,
            },
          }),
          db.transaction.findFirst({
            where: {
              merchantId: merchant.id,
              orderId: body.orderId,
            },
          }),
        ]);

        if (!merchantMethod || !merchantMethod.isEnabled || !merchantMethod.method) {
          return error(404, {
            error: "Метод не найден или недоступен мерчанту",
          });
        }

        if (duplicateCheck) {
          return error(409, {
            error: "Транзакция с таким orderId уже существует",
          });
        }

        const method = merchantMethod.method;

        // 🚀 ОПТИМИЗАЦИЯ: Получаем трейдеров с правильным типом метода
        const eligibleTraders = await db.traderMerchant.findMany({
          where: {
            merchantId: merchant.id,
            isMerchantEnabled: true,
            isFeeInEnabled: true,
          },
          select: {
            traderId: true,
            trader: {
              select: {
                id: true,
                banned: true,
                deposit: true,
                trafficEnabled: true,
                minAmountPerRequisite: true,
                maxAmountPerRequisite: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                bankDetails: {
                  where: {
                    isArchived: false,
                    isActive: true,
                    methodType: { in: [method.type] },
                    minAmount: { lte: body.amount },
                    maxAmount: { gte: body.amount },
                    OR: [
                      { deviceId: null },
                      { device: { isWorking: true, isOnline: true } },
                    ],
                  },
                  select: {
                    id: true,
                    userId: true,
                    minAmount: true,
                    maxAmount: true,
                    operationLimit: true,
                    sumLimit: true,
                    intervalMinutes: true,
                    counterpartyLimit: true,
                    updatedAt: true,
                    bankType: true,
                    cardNumber: true,
                    recipientName: true,
                    device: {
                      select: {
                        id: true,
                        isWorking: true,
                        isOnline: true,
                      },
                    },
                  },
                  orderBy: { updatedAt: 'asc' },
                },
              },
            },
          },
        });

        // Мягкое предупреждение о лимитах метода
        if (body.amount < method.minPayin || body.amount > method.maxPayin) {
          console.log(
            `[Merchant] ⚠️ Предупреждение: сумма ${body.amount} вне стандартного диапазона метода ${method.minPayin}-${method.maxPayin}, но продолжаем обработку`
          );
        }

        // 🚀 ОПТИМИЗАЦИЯ: Классифицируем трафик сначала, затем получаем трейдеров
        const { trafficClassificationService } = await import("@/services/traffic-classification.service");
        const trafficType = await trafficClassificationService.classifyTransactionTraffic(
          merchant.id,
          body.clientIdentifier
        );
        const eligibleTraderIds = await trafficClassificationService.getEligibleTradersForTransactionTrafficType(
          trafficType,
          merchant.id
        );

        console.log(`[Merchant IN] Transaction classified as ${trafficType} traffic`);

        // Фильтруем трейдеров по доступности и типу трафика
        const validTraders = eligibleTraders.filter(tm => 
          !tm.trader.banned && 
          tm.trader.deposit >= 1000 && 
          tm.trader.trafficEnabled &&
          eligibleTraderIds.includes(tm.traderId)
        );

        if (validTraders.length === 0) {
          console.log(`[Merchant IN] No eligible traders found for ${trafficType} traffic`);
          // Переходим к агрегаторам сразу
        }

        // 🚀 ОПТИМИЗАЦИЯ: Плоский массив всех реквизитов с пре-фильтрацией
        const allBankDetails = validTraders.flatMap(tm => 
          tm.trader.bankDetails.filter(bd => 
            body.amount >= tm.trader.minAmountPerRequisite &&
            body.amount <= tm.trader.maxAmountPerRequisite
          ).map(bd => ({ ...bd, traderId: tm.traderId, trader: tm.trader }))
        );

        // 🚀 ОПТИМИЗАЦИЯ: Получаем все данные для проверок одним запросом
        const bankDetailIds = allBankDetails.map(bd => bd.id);
        const userIds = [...new Set(allBankDetails.map(bd => bd.userId))];
        
        console.log(`[Merchant IN] Checking ${allBankDetails.length} bank details for ${userIds.length} traders`);
        const batchStartTime = Date.now();
        
        // Параллельно получаем все необходимые данные для проверок
        const [counterpartyChecks, existingTransactions, operationCounts, sumAggregates, recentTransactions] = await Promise.all([
          // Проверка контрагентов для всех трейдеров
          Promise.all(userIds.map(userId => 
            trafficClassificationService.canTraderTakeTransaction(
              userId,
              merchant.id,
              body.clientIdentifier || '',
              allBankDetails.find(bd => bd.userId === userId)?.counterpartyLimit || 10
            ).then(result => ({ userId, canTake: result }))
          )),
          
          // Существующие транзакции с той же суммой
          db.transaction.findMany({
            where: {
              bankDetailId: { in: bankDetailIds },
              amount: body.amount,
              status: { in: [Status.CREATED, Status.IN_PROGRESS] },
              type: TransactionType.IN,
            },
            select: { bankDetailId: true }
          }),
          
          // Счетчики операций для всех реквизитов
          db.transaction.groupBy({
            by: ['bankDetailId'],
            where: {
              bankDetailId: { in: bankDetailIds },
              status: { in: [Status.IN_PROGRESS, Status.READY] },
            },
            _count: { id: true },
          }),
          
          // Суммы транзакций для всех реквизитов
          db.transaction.groupBy({
            by: ['bankDetailId'],
            where: {
              bankDetailId: { in: bankDetailIds },
              status: { in: [Status.IN_PROGRESS, Status.READY] },
            },
            _sum: { amount: true },
          }),
          
          // Последние транзакции для проверки интервалов
          db.transaction.findMany({
            where: {
              bankDetailId: { in: bankDetailIds },
              createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Последние 24 часа
              status: { notIn: [Status.CANCELED, Status.EXPIRED] },
            },
            select: {
              bankDetailId: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          }),
        ]);
        
        console.log(`[Merchant IN] Batch queries completed in ${Date.now() - batchStartTime}ms`);
        
        // Создаем быстрые lookup мапы
        const counterpartyMap = new Map(counterpartyChecks.map(c => [c.userId, c.canTake]));
        const existingTransMap = new Set(existingTransactions.map(t => t.bankDetailId).filter(id => id !== null) as string[]);
        const operationCountMap = new Map(operationCounts.map(o => [o.bankDetailId, o._count.id]).filter(([id]) => id !== null) as [string, number][]);
        const sumMap = new Map(sumAggregates.map(s => [s.bankDetailId, s._sum.amount || 0]).filter(([id]) => id !== null) as [string, number][]);
        const recentTransMap = new Map<string, Date>();
        recentTransactions.forEach(t => {
          if (t.bankDetailId) {
            const existing = recentTransMap.get(t.bankDetailId);
            if (!existing || t.createdAt > existing) {
              recentTransMap.set(t.bankDetailId, t.createdAt);
            }
          }
        });
        
        let chosen = null;
        for (const bd of allBankDetails) {
          // Быстрая проверка контрагентов из кэша
          if (!counterpartyMap.get(bd.userId)) {
            console.log(`[Merchant IN] Trader ${bd.userId} cannot take transaction due to counterparty limit`);
            continue;
          }

          if (body.amount < bd.minAmount || body.amount > bd.maxAmount)
            continue;
          if (
            body.amount < bd.trader.minAmountPerRequisite ||
            body.amount > bd.trader.maxAmountPerRequisite
          )
            continue;

          // Быстрая проверка существующих транзакций из кэша
          if (existingTransMap.has(bd.id)) {
            console.log(
              `[Merchant] Реквизит ${bd.id} отклонен: уже есть транзакция на сумму ${body.amount}`
            );
            continue;
          }

          // Быстрая проверка лимита операций из кэша
          if (bd.operationLimit > 0) {
            const totalOperations = operationCountMap.get(bd.id) || 0;
            console.log(
              `[Merchant] - Общее количество операций (IN_PROGRESS + READY): ${totalOperations}/${bd.operationLimit}`
            );
            if (totalOperations >= bd.operationLimit) {
              console.log(
                `[Merchant] Реквизит ${bd.id} отклонен: достигнут лимит количества операций. Текущее количество: ${totalOperations}, лимит: ${bd.operationLimit}`
              );
              continue;
            }
          }

          // Быстрая проверка лимита суммы из кэша
          if (bd.sumLimit > 0) {
            const currentSum = sumMap.get(bd.id) || 0;
            const totalSum = currentSum + body.amount;
            console.log(
              `[Merchant] - Общая сумма операций (IN_PROGRESS + READY): ${currentSum} + ${body.amount} = ${totalSum}/${bd.sumLimit}`
            );
            if (totalSum > bd.sumLimit) {
              console.log(
                `[Merchant] Реквизит ${bd.id} отклонен: превышение лимита общей суммы. Текущая сумма: ${currentSum}, новая сумма: ${totalSum}, лимит: ${bd.sumLimit}`
              );
              continue;
            }
          }

          // Быстрая проверка интервала из кэша
          if (bd.intervalMinutes > 0) {
            const lastTransaction = recentTransMap.get(bd.id);
            if (lastTransaction) {
              const timeSinceLastTransaction = Math.floor(
                (Date.now() - lastTransaction.getTime()) / (1000 * 60)
              );
              if (timeSinceLastTransaction < bd.intervalMinutes) {
                console.log(
                  `[Merchant] Реквизит ${bd.id} отклонен: интервал между сделками не соблюден. ` +
                  `Последняя сделка: ${timeSinceLastTransaction} мин назад, требуется интервал: ${bd.intervalMinutes} мин`
                );
                continue;
              }
            }
            console.log(
              `[Merchant] - Проверка интервала пройдена для реквизита ${bd.id}: ${bd.intervalMinutes} мин`
            );
          }

          chosen = bd;
          break;
        }

        if (!chosen) {
          // Если не найден трейдер, пробуем через очередь агрегаторов
          console.log("[Merchant IN] No trader found, trying aggregators queue...");
          console.log("[Merchant IN] Request details:", {
            orderId: body.orderId,
            amount: body.amount,
            methodType: method.type,
            merchantId: merchant.id
          });

          try {
            // Импортируем сервис очереди агрегаторов
            const { aggregatorQueueService } = await import(
              "@/services/aggregator-queue.service"
            );
            const aggregatorService = aggregatorQueueService;

            // Подготавливаем запрос для агрегаторов
            const aggregatorRequest = {
              ourDealId: body.orderId,
              amount: body.amount,
              rate: rate,
              paymentMethod: method.type === MethodType.sbp ? "SBP" : "C2C",
              bankType: undefined, // Будет заполнено если необходимо
              clientIdentifier: body.clientIdentifier,
              callbackUrl: `${process.env.API_URL || 'http://localhost:3000'}/api/aggregator/callback`,
              expiresAt: expired_at.toISOString(),
              metadata: {
                merchantId: merchant.id,
                methodId: method.id,
                isMock: body.isMock || false
              }
            };

            // Пробуем распределить через агрегаторов
            const routingResult = await aggregatorService.routeDealToAggregators(
              aggregatorRequest
            );

            if (routingResult.success && routingResult.response && routingResult.aggregator) {
              const aggResponse = routingResult.response;
              
              // Добавляем логирование для диагностики проблемы с реквизитами
              console.log(`[Merchant IN] Aggregator response:`, {
                aggregator: routingResult.aggregator.name,
                hasRequisites: !!aggResponse.requisites,
                requisites: aggResponse.requisites,
                fullResponse: aggResponse
              });
              
              // Создаем транзакцию с привязкой к агрегатору
              const transaction = await db.transaction.create({
                data: {
                  merchantId: merchant.id,
                  amount: body.amount,
                  assetOrBank: aggResponse.requisites 
                    ? `${aggResponse.requisites.bankName || routingResult.aggregator.name}: ${aggResponse.requisites.phoneNumber || aggResponse.requisites.cardNumber || 'Pending'}`
                    : `${routingResult.aggregator.name}: Pending`,
                  orderId: body.orderId,
                  methodId: method.id,
                  currency: "RUB",
                  userId: `user_${Date.now()}`,
                  userIp: body.userIp || null,
                  callbackUri: body.callbackUri || "",
                  successUri: "",
                  failUri: "",
                  type: TransactionType.IN,
                  expired_at: expired_at,
                  commission: 0,
                  clientName: `user_${Date.now()}`,
                  status: Status.IN_PROGRESS,
                  rate: rate,
                  merchantRate: body.rate || rate,
                  clientIdentifier: body.clientIdentifier,
                  aggregatorId: routingResult.aggregator.id,
                  aggregatorOrderId: aggResponse.pspwareOrderId || aggResponse.transactionId || aggResponse.orderId,
                  aggregatorResponse: aggResponse,
                  aggregatorRequisites: aggResponse.requisites,
                  isMock: body.isMock || false,
                },
                include: {
                  method: {
                    select: {
                      id: true,
                      code: true,
                      name: true,
                      type: true,
                      currency: true,
                      commissionPayin: true,
                    },
                  },
                },
              });
              
              // Рассчитываем сумму в USDT для списания с баланса агрегатора
              const usdtAmount = transaction.amount / rate; // transaction.amount в рублях, rate - курс RUB/USDT
              const truncatedUsdtAmount = Math.round(usdtAmount * 100) / 100; // Округляем до 2 знаков
              
              // Списываем баланс с агрегатора
              await db.aggregator.update({
                where: { id: routingResult.aggregator.id },
                data: { 
                  balanceUsdt: { decrement: truncatedUsdtAmount }
                }
              });
              
              console.log(
                `[Merchant IN] Deducted ${truncatedUsdtAmount} USDT from aggregator ${routingResult.aggregator.name} balance (${transaction.amount} RUB / ${rate} = ${truncatedUsdtAmount} USDT)`
              );

              // Логируем результат попыток
              await db.transactionAttempt.create({
                data: {
                  transactionId: transaction.id,
                  merchantId: merchant.id,
                  methodId: method.id,
                  amount: transaction.amount,
                  success: true,
                  status: "IN_PROGRESS",
                  message: `Создана через агрегатора: ${routingResult.aggregator.name}, списано ${truncatedUsdtAmount} USDT`,
                },
              });
              
              // Сохраняем связь с партнёрской сделкой
              if (aggResponse.partnerDealId) {
                await db.aggregatorIntegrationLog.create({
                  data: {
                    aggregatorId: routingResult.aggregator.id,
                    direction: "OUT",
                    eventType: "deal_routed_from_merchant",
                    method: "POST",
                    url: `${routingResult.aggregator.apiBaseUrl}/deals`,
                    headers: {},
                    requestBody: aggregatorRequest,
                    responseBody: aggResponse,
                    statusCode: 201,
                    ourDealId: body.orderId,
                    partnerDealId: aggResponse.partnerDealId,
                  }
                });
              }

              console.log(
                `[Merchant IN] Transaction created via aggregator ${routingResult.aggregator.name}`
              );

              set.status = 201;

              // Проверяем, является ли мерчант Wellbit
              const isWellbit = merchant.name.toLowerCase() === "wellbit";

              if (isWellbit) {
                // Для Wellbit возвращаем специальный формат с реквизитами
                let paymentCredential = transaction.assetOrBank;
                let paymentBank = "AGGREGATOR";
                
                if (aggResponse.requisites) {
                  const req = aggResponse.requisites;
                  paymentBank = req.bankName || "AGGREGATOR";
                  if (req.phoneNumber) {
                    paymentCredential = req.phoneNumber;
                  } else if (req.cardNumber) {
                    paymentCredential = req.cardNumber;
                  }
                }
                
                const wellbitResponse: any = {
                  payment_id: transaction.id,
                  payment_amount: transaction.amount,
                  payment_amount_usdt: transaction.rate ? transaction.amount / transaction.rate : null,
                  payment_amount_profit: null,
                  payment_amount_profit_usdt: null,
                  payment_fee_percent_profit: null,
                  payment_type: method.type === MethodType.sbp ? "sbp" : "card",
                  payment_bank: paymentBank,
                  payment_course: transaction.rate || null,
                  payment_lifetime: Math.floor(
                    (transaction.expired_at.getTime() - Date.now()) / 1000
                  ),
                  payment_status: "new",
                  payment_credential: paymentCredential,
                };

                // Если есть приватный ключ, добавляем HMAC подпись в заголовки
                if (merchant.apiKeyPrivate) {
                  const crypto = await import("crypto");
                  // Сортируем ключи и генерируем подпись
                  const sortedPayload = Object.keys(wellbitResponse)
                    .sort()
                    .reduce((obj: any, key) => {
                      obj[key] = wellbitResponse[key];
                      return obj;
                    }, {});

                  const jsonString = JSON.stringify(sortedPayload);
                  const signature = crypto
                    .createHmac("sha256", merchant.apiKeyPrivate)
                    .update(jsonString)
                    .digest("hex");

                  // Добавляем заголовок с подписью
                  set.headers = {
                    ...set.headers,
                    "x-api-token": signature,
                  };
                }

                return wellbitResponse;
              }

              // Уведомляем внешнюю систему, если мерчант аукционный
              if (isAuctionMerchant && auctionConfig) {
                // Асинхронно уведомляем внешнюю систему о создании заказа
                setImmediate(async () => {
                  try {
                    await auctionIntegrationService.notifyExternalSystem(
                      merchant.id,
                      transaction.orderId,
                      1, // статус "создана"
                      transaction.amount
                    );
                  } catch (error) {
                    console.error(`[Merchant] Ошибка уведомления внешней системы:`, error);
                  }
                });
              }

              // Для остальных мерчантов возвращаем стандартный формат с реквизитами
              return {
                id: transaction.id,
                numericId: transaction.numericId,
                amount: transaction.amount,
                crypto: transaction.method?.commissionPayin 
                  ? (transaction.amount / (transaction.rate || 100)) * (1 - transaction.method.commissionPayin / 100)
                  : null,
                status: transaction.status,
                traderId: routingResult.aggregator.id || `agg_${Date.now()}`,
                requisites: aggResponse.requisites ? {
                  id: `agg_${routingResult.aggregator.id}`,
                  bankType: aggregatorService.mapBankNameToCode(aggResponse.requisites.bankName || aggResponse.requisites.bankCode || "UNKNOWN"),
                  cardNumber: aggResponse.requisites.cardNumber || aggResponse.requisites.phoneNumber || "",
                  recipientName: aggResponse.requisites.recipientName || routingResult.aggregator.name,
                  traderName: routingResult.aggregator.name,
                } : null,
                createdAt: transaction.createdAt.toISOString(),
                updatedAt: transaction.updatedAt.toISOString(),
                expired_at: transaction.expired_at.toISOString(),
                method: transaction.method,
              };
            } else {
              // Ни один агрегатор не принял заявку
              console.log(
                `[Merchant IN] No aggregators accepted the deal. Tried: ${routingResult.triedAggregators.join(', ')}`
              );
              
              await db.transactionAttempt.create({
                data: {
                  merchantId: merchant.id,
                  methodId: method.id,
                  amount: body.amount,
                  success: false,
                  status: "NO_REQUISITE",
                  errorCode: "NO_AGGREGATOR",
                  message: `Все агрегаторы недоступны. Попытки: ${routingResult.triedAggregators.join(', ')}`,
                },
              });

              return error(409, { error: "NO_REQUISITE" });
            }
          } catch (aggregatorError) {
            console.error(
              "[Merchant IN] Error processing aggregator queue:",
              aggregatorError
            );
            await db.transactionAttempt.create({
              data: {
                merchantId: merchant.id,
                methodId: method.id,
                amount: body.amount,
                success: false,
                status: "NO_REQUISITE",
                errorCode: "AGGREGATOR_ERROR",
                message: aggregatorError instanceof Error ? aggregatorError.message : "Ошибка при обработке через агрегаторов",
              },
            });
            return error(409, { error: "NO_REQUISITE" });
          }
        }

        // Получаем параметры трейдера для расчета заморозки
        const traderMerchant = await db.traderMerchant.findUnique({
          where: {
            traderId_merchantId_methodId: {
              traderId: chosen.userId,
              merchantId: merchant.id,
              methodId: method.id,
            },
          },
        });

        // Рассчитываем параметры заморозки
        // Получаем KKK настройки для метода
        const rateSetting = await db.rateSettings.findUnique({
          where: { methodId: method.id },
        });

        // Если нет настроек для метода, используем глобальные
        let kkkPercent = 0;
        let kkkOperation: "PLUS" | "MINUS" = "MINUS";

        if (rateSetting) {
          kkkPercent = rateSetting.kkkPercent;
          kkkOperation = rateSetting.kkkOperation as "PLUS" | "MINUS";
        } else {
          const globalKkkSetting = await db.systemConfig.findUnique({
            where: { key: "kkk_percent" },
          });
          kkkPercent = globalKkkSetting
            ? parseFloat(globalKkkSetting.value)
            : 0;
        }

        const feeInPercent = traderMerchant?.feeIn || 0;

        // Get trader rate using new unified logic
        const { getTraderRate } = await import("@/utils/trader-rate");
        const traderRateData = await getTraderRate(chosen.userId);
        const selectedRate = traderRateData.rate;
        console.log(
          `[Merchant IN] Selected rate for trader (${traderRateData.sourceName}${traderRateData.isCustom ? ', индивидуальная' : ''}): ${selectedRate}`
        );

        // Check if merchant has rate source configuration that overrides rate provision
        const merchantRateSource = await db.merchantRateSource.findFirst({
          where: { 
            merchantId: merchant.id,
            isActive: true
          },
          include: {
            rateSource: true
          },
          orderBy: {
            priority: 'asc' // Use highest priority (lowest number)
          }
        });

        // Determine merchantRate based on configuration
        let merchantRate = body.rate;
        
        if (merchantRateSource && !merchantRateSource.merchantProvidesRate) {
          // Merchant is configured to use rate from source, not provide own rate
          console.log(`[Merchant IN] Merchant configured to use rate from source: ${merchantRateSource.rateSource.displayName}`);
          
          // Get rate from the configured source using the same logic as rate sources
          let sourceRate = 0;
          let baseRate = 0;
          
          if (merchantRateSource.rateSource.source === 'rapira') {
            const { rapiraService } = await import("@/services/rapira.service");
            baseRate = await rapiraService.getUsdtRubRate();
          } else if (merchantRateSource.rateSource.source === 'bybit') {
            const { bybitService } = await import("@/services/bybit.service");
            baseRate = await bybitService.getUsdtRubRate();
          }
          
          // Apply KKK from rate source configuration
          sourceRate = baseRate * (1 + (merchantRateSource.rateSource.kkkPercent / 100) * 
            (merchantRateSource.rateSource.kkkOperation === 'MINUS' ? -1 : 1));
          
          merchantRate = sourceRate;
          console.log(`[Merchant IN] Using rate from source: ${sourceRate} (base: ${baseRate}, KKK: ${merchantRateSource.rateSource.kkkOperation === 'MINUS' ? '-' : '+'}${merchantRateSource.rateSource.kkkPercent}%)`);
        } else if (merchantRate === undefined) {
          // Fallback: if no rate provided and no source configuration, use selected rate
          merchantRate = selectedRate;
          console.log(`[Merchant IN] Using fallback rate: ${selectedRate}`);
        } else {
          console.log(`[Merchant IN] Using merchant provided rate: ${merchantRate}`);
        }

        // rate field uses selected source with KKK
        const transactionRate = selectedRate;
        console.log(
          `[Merchant IN] Merchant rate (saved for reference): ${merchantRate}`
        );

        // ВСЕГДА рассчитываем заморозку с курсом Рапиры с ККК

        // Округление ВВЕРХ до 2 знаков: замораживаем ceil2(amount/rate)
        const frozenUsdtAmount = roundUp2(body.amount / transactionRate);

        // Комиссию и прибыль не замораживаем при создании сделки
        const calculatedCommission = 0;
        const totalRequired = frozenUsdtAmount; // Замораживаем только основную сумму

        const freezingParams = {
          adjustedRate: transactionRate, // Use Rapira rate with KKK for freezing
          frozenUsdtAmount,
          calculatedCommission,
          totalRequired,
        };

        // Проверяем достаточность баланса трейдера
        if (freezingParams && chosen.user) {
          const availableBalance = chosen.user.trustBalance;
          if (availableBalance < freezingParams.totalRequired) {
            console.log(
              `[Merchant IN] Недостаточно баланса. Нужно: ${freezingParams.totalRequired}, доступно: ${availableBalance}`
            );
            await db.transactionAttempt.create({
              data: {
                merchantId: merchant.id,
                methodId: method.id,
                amount: body.amount,
                success: false,
                status: "NO_REQUISITE",
                errorCode: "INSUFFICIENT_BALANCE",
                message: "Недостаточно баланса трейдера",
              },
            });
            return error(409, { error: "NO_REQUISITE" });
          }
        }

        await db.bankDetail.update({
          where: { id: chosen.id },
          data: {
            currentTotalAmount: body.amount,
          },
        });

        // Создаем транзакцию с параметрами заморозки и замораживаем средства
        console.log(
          `[Merchant IN] Creating transaction with rate=${transactionRate}, merchantRate=${merchantRate}`
        );
        const tx = await db.$transaction(async (prisma) => {
          const transaction = await prisma.transaction.create({
            data: {
              merchantId: merchant.id,
              amount: body.amount,
              assetOrBank:
                method.type === MethodType.sbp
                  ? chosen.cardNumber
                  : `${chosen.bankType}: ${chosen.cardNumber}`, // Для СБП только номер телефона
              orderId: body.orderId,
              methodId: method.id,
              currency: "RUB",
              userId: `user_${Date.now()}`,
              userIp: body.userIp || null,
              callbackUri: body.callbackUri || "",
              successUri: "",
              failUri: "",
              type: TransactionType.IN,
              expired_at: expired_at,
              commission: 0,
              clientName: `user_${Date.now()}`,
              status: Status.IN_PROGRESS,
              rate: transactionRate, // Always Rapira rate with KKK
              merchantRate: merchantRate, // Merchant provided rate or Rapira if not provided
              adjustedRate: freezingParams.adjustedRate,
              kkkPercent: kkkPercent,
              kkkOperation: kkkOperation,
              feeInPercent: feeInPercent,
              frozenUsdtAmount: freezingParams.frozenUsdtAmount,
              calculatedCommission: freezingParams.calculatedCommission,
              isMock: body.isMock || false,
              clientIdentifier: body.clientIdentifier,
              bankDetailId: chosen.id,
              traderId: chosen.userId,
            },
            include: {
              method: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  type: true,
                  currency: true,
                  commissionPayin: true,
                },
              },
            },
          });

          // Замораживаем средства трейдера
          if (freezingParams && chosen.user) {
            console.log(
              `[Merchant IN] Freezing funds for trader ${chosen.userId}: ${freezingParams.totalRequired} USDT`
            );
            console.log(
              `[Merchant IN] Trader balance before freezing - trustBalance: ${chosen.user.trustBalance}, frozenUsdt: ${chosen.user.frozenUsdt}`
            );

            const updatedUser = await prisma.user.update({
              where: { id: chosen.userId },
              data: {
                frozenUsdt: { increment: freezingParams.totalRequired },
                trustBalance: { decrement: freezingParams.totalRequired }, // Списываем с баланса при заморозке
              },
            });

            console.log(
              `[Merchant IN] Trader balance after freezing - trustBalance: ${updatedUser.trustBalance}, frozenUsdt: ${updatedUser.frozenUsdt}`
            );
          } else {
            console.log(
              `[Merchant IN] NOT freezing funds. freezingParams: ${!!freezingParams}, chosen.user: ${!!chosen.user}`
            );
          }

          return transaction;
        });
        await db.transactionAttempt.create({
          data: {
            transactionId: tx.id,
            merchantId: merchant.id,
            methodId: method.id,
            amount: tx.amount,
            success: true,
            status: tx.status,
          },
        });

        const crypto =
          tx.rate && tx.method && typeof tx.method.commissionPayin === "number"
            ? (tx.amount / tx.rate) * (1 - tx.method.commissionPayin / 100)
            : null;

        set.status = 201;

        // Проверяем, является ли мерчант Wellbit
        const isWellbit = merchant.name.toLowerCase() === "wellbit";

        if (isWellbit) {
          // Для Wellbit возвращаем специальный формат
          const wellbitResponse: any = {
            payment_id: tx.id,
            payment_amount: tx.amount,
            payment_amount_usdt: crypto || tx.amount / tx.rate,
            payment_amount_profit: tx.amount * 0.935, // С учетом комиссии 6.5%
            payment_amount_profit_usdt: (crypto || tx.amount / tx.rate) * 0.935,
            payment_fee_percent_profit: 6.5,
            payment_type: tx.method?.type === MethodType.sbp ? "sbp" : "card",
            payment_bank: chosen.bankType,
            payment_course: tx.rate,
            payment_lifetime: Math.floor(
              (tx.expired_at.getTime() - Date.now()) / 1000
            ),
            payment_status: "new",
            payment_credential: chosen.cardNumber,
          };

          // Если есть приватный ключ, добавляем HMAC подпись в заголовки
          if (merchant.apiKeyPrivate) {
            const crypto = await import("crypto");
            // Сортируем ключи и генерируем подпись
            const sortedPayload = Object.keys(wellbitResponse)
              .sort()
              .reduce((obj: any, key) => {
                obj[key] = wellbitResponse[key];
                return obj;
              }, {});

            const jsonString = JSON.stringify(sortedPayload);
            const signature = crypto
              .createHmac("sha256", merchant.apiKeyPrivate)
              .update(jsonString)
              .digest("hex");

            // Добавляем заголовок с подписью
            set.headers = {
              ...set.headers,
              "x-api-token": signature,
            };
          }

          return wellbitResponse;
        }

        // Уведомляем внешнюю систему, если мерчант аукционный
        if (isAuctionMerchant && auctionConfig) {
          // Асинхронно уведомляем внешнюю систему о создании заказа
          setImmediate(async () => {
            try {
              await auctionIntegrationService.notifyExternalSystem(
                merchant.id,
                tx.orderId,
                1, // статус "создана"
                tx.amount
              );
            } catch (error) {
              console.error(`[Merchant] Ошибка уведомления внешней системы:`, error);
            }
          });
        }

        // Для остальных мерчантов возвращаем стандартный формат
        const response = {
          id: tx.id,
          numericId: tx.numericId,
          amount: tx.amount,
          crypto,
          status: tx.status,
          traderId: tx.traderId,
          requisites: {
            id: chosen.id,
            bankType: chosen.bankType,
            cardNumber: chosen.cardNumber,
            recipientName: chosen.recipientName,
            traderName: chosen.user.name,
          },
          createdAt: tx.createdAt.toISOString(),
          updatedAt: tx.updatedAt.toISOString(),
          expired_at: tx.expired_at.toISOString(),
          method: tx.method,
        };
        
        console.log(`[Merchant IN] Transaction processing completed in ${Date.now() - startTime}ms for order: ${body.orderId}`);
        return response;
      },
      {
        headers: t.Object({ "x-merchant-api-key": t.String() }),
        body: t.Object({
          amount: t.Number({ description: "Сумма транзакции в рублях" }),
          orderId: t.String({
            description: "Уникальный ID заказа от мерчанта",
          }),
          methodId: t.String({ description: "ID метода платежа" }),
          rate: t.Optional(t.Number({ description: "Курс USDT/RUB" })),
          expired_at: t.String({
            description: "ISO дата истечения транзакции",
          }),
          userIp: t.Optional(
            t.String({ description: "IP адрес пользователя" })
          ),
          callbackUri: t.Optional(
            t.String({ description: "URL для callback уведомлений" })
          ),
          clientIdentifier: t.Optional(
            t.String({ description: "Идентификатор клиента для определения типа трафика", minLength: 1, maxLength: 255 })
          ),
          isMock: t.Optional(
            t.Boolean({ description: "Флаг для создания тестовой транзакции" })
          ),
        }),
        response: {
          201: t.Object({
            id: t.String(),
            numericId: t.Number(),
            amount: t.Number(),
            crypto: t.Union([t.Number(), t.Null()]),
            status: t.Enum(Status),
            traderId: t.String(),
            requisites: t.Object({
              id: t.String(),
              bankType: t.Enum(BankType),
              cardNumber: t.String(),
              recipientName: t.String(),
              traderName: t.String(),
            }),
            createdAt: t.String(),
            updatedAt: t.String(),
            expired_at: t.String(),
            method: t.Object({
              id: t.String(),
              code: t.String(),
              name: t.String(),
              type: t.Enum(MethodType),
              currency: t.Enum(Currency),
            }),
          }),
          400: t.Object({ error: t.String() }),
          404: t.Object({ error: t.String() }),
          409: t.Object({ error: t.String() }),
        },
        tags: ["merchant"],
        detail: { summary: "Создание входящей транзакции (IN)" },
      }
    )

    /* ──────── POST /merchant/transactions/out ──────── */
    .post(
      "/transactions/out",
      async ({ body, merchant, set, error }) => {
        // Проверяем, не отключен ли мерчант
        if (merchant.disabled) {
          return error(403, {
            error: "Ваш трафик временно отключен. Обратитесь к администратору.",
          });
        }

        // Always get the current rate from Rapira for trader calculations
        let rapiraRate: number;
        try {
          rapiraRate = await rapiraService.getUsdtRubRate();
        } catch (error) {
          console.error("Failed to get rate from Rapira:", error);
          rapiraRate = 95; // Default fallback rate
        }

        // Validate rate based on merchant's countInRubEquivalent setting
        let rate: number;

        if (merchant.countInRubEquivalent) {
          // If merchant has RUB calculations enabled, we provide the rate from Rapira
          if (body.rate !== undefined) {
            return error(400, {
              error:
                "Курс не должен передаваться при включенных расчетах в рублях. Курс автоматически получается от системы.",
            });
          }
          rate = rapiraRate;
        } else {
          // If RUB calculations are disabled, merchant must provide the rate
          if (body.rate === undefined) {
            return error(400, {
              error:
                "Курс обязателен при выключенных расчетах в рублях. Укажите параметр rate.",
            });
          }
          rate = body.rate;
        }

        // Генерируем значения по умолчанию
        const expired_at = body.expired_at
          ? new Date(body.expired_at)
          : new Date(Date.now() + 86_400_000);

        // Проверяем метод
        const method = await db.method.findUnique({
          where: { id: body.methodId },
        });
        if (!method || !method.isEnabled) {
          return error(404, { error: "Метод не найден или неактивен" });
        }

        // Проверяем доступ мерчанта к методу
        const mm = await db.merchantMethod.findUnique({
          where: {
            merchantId_methodId: {
              merchantId: merchant.id,
              methodId: method.id,
            },
          },
        });
        if (!mm || !mm.isEnabled) {
          return error(404, { error: "Метод недоступен мерчанту" });
        }

        // Мягкое предупреждение о лимитах метода для OUT транзакций
        if (body.amount < method.minPayout || body.amount > method.maxPayout) {
          console.log(
            `[Merchant] ⚠️ Предупреждение: сумма ${body.amount} вне стандартного диапазона метода для выплат ${method.minPayout}-${method.maxPayout}, но продолжаем обработку`
          );
        }

        // Проверяем уникальность orderId
        const duplicate = await db.transaction.findFirst({
          where: { merchantId: merchant.id, orderId: body.orderId },
        });
        if (duplicate) {
          return error(409, {
            error: "Транзакция с таким orderId уже существует",
          });
        }

        // Создаем OUT транзакцию
        const tx = await db.transaction.create({
          data: {
            merchantId: merchant.id,
            amount: body.amount,
            assetOrBank: "",
            orderId: body.orderId,
            methodId: method.id,
            currency: "RUB",
            userId: `user_${Date.now()}`,
            userIp: body.userIp || null,
            callbackUri: body.callbackUri || "",
            successUri: "",
            failUri: "",
            type: TransactionType.OUT,
            expired_at: expired_at,
            commission: 0,
            clientName: `user_${Date.now()}`,
            status: Status.IN_PROGRESS,
            rate: body.rate,
            clientIdentifier: body.clientIdentifier,
            isMock: body.isMock || false,
          },
          include: {
            method: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
                currency: true,
              },
            },
          },
        });

        set.status = 201;
        return {
          id: tx.id,
          numericId: tx.numericId,
          amount: tx.amount,
          crypto: null,
          status: tx.status,
          traderId: null,
          requisites: null,
          createdAt: tx.createdAt.toISOString(),
          updatedAt: tx.updatedAt.toISOString(),
          expired_at: tx.expired_at.toISOString(),
          method: tx.method,
        };
      },
      {
        headers: t.Object({ "x-merchant-api-key": t.String() }),
        body: t.Object({
          amount: t.Number({ description: "Сумма транзакции в рублях" }),
          orderId: t.String({
            description: "Уникальный ID заказа от мерчанта",
          }),
          methodId: t.String({ description: "ID метода платежа" }),
          rate: t.Number({ description: "Курс USDT/RUB" }),
          expired_at: t.String({
            description: "ISO дата истечения транзакции",
          }),
          userIp: t.Optional(
            t.String({ description: "IP адрес пользователя" })
          ),
          callbackUri: t.Optional(
            t.String({ description: "URL для callback уведомлений" })
          ),
          clientIdentifier: t.Optional(
            t.String({ description: "Идентификатор клиента для определения типа трафика", minLength: 1, maxLength: 255 })
          ),
          isMock: t.Optional(
            t.Boolean({ description: "Флаг для создания тестовой транзакции" })
          ),
        }),
        response: {
          201: t.Object({
            id: t.String(),
            numericId: t.Number(),
            amount: t.Number(),
            crypto: t.Null(),
            status: t.Enum(Status),
            traderId: t.Null(),
            requisites: t.Null(),
            createdAt: t.String(),
            updatedAt: t.String(),
            expired_at: t.String(),
            method: t.Object({
              id: t.String(),
              code: t.String(),
              name: t.String(),
              type: t.Enum(MethodType),
              currency: t.Enum(Currency),
            }),
          }),
          400: t.Object({ error: t.String() }),
          404: t.Object({ error: t.String() }),
          409: t.Object({ error: t.String() }),
        },
        tags: ["merchant"],
        detail: { summary: "Создание исходящей транзакции (OUT)" },
      }
    )

    /* ──────── GET /merchant/enums ──────── */
    .get(
      "/enums",
      async () => {
        return {
          status: Object.values(Status),
          transactionType: Object.values(TransactionType),
          methodType: Object.values(MethodType),
          currency: Object.values(Currency),
          bankType: Object.values(BankType),
        };
      },
      {
        tags: ["merchant"],
        detail: { summary: "Получение всех enum значений для мерчанта" },
        headers: t.Object({ "x-merchant-api-key": t.String() }),
        response: {
          200: t.Object({
            status: t.Array(t.Enum(Status)),
            transactionType: t.Array(t.Enum(TransactionType)),
            methodType: t.Array(t.Enum(MethodType)),
            currency: t.Array(t.Enum(Currency)),
            bankType: t.Array(t.Enum(BankType)),
          }),
          401: ErrorSchema,
        },
      }
    )

    /* ──────── GET /merchant/methods ──────── */
    .get(
      "/methods",
      async ({ merchant }) => {
        // merchant уже проверен в merchantGuard
        const merchantMethods = await db.merchantMethod.findMany({
          where: { merchantId: merchant.id, isEnabled: true },
          include: {
            method: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
                currency: true,
                commissionPayin: true,
                commissionPayout: true,
                maxPayin: true,
                minPayin: true,
                maxPayout: true,
                minPayout: true,
                isEnabled: true,
              },
            },
          },
        });

        // Фильтруем только активные методы
        const availableMethods = merchantMethods
          .filter((mm) => mm.method.isEnabled)
          .map((mm) => mm.method);

        return availableMethods;
      },
      {
        tags: ["merchant"],
        detail: { summary: "Получение доступных методов для мерчанта" },
        headers: t.Object({ "x-merchant-api-key": t.String() }),
        response: {
          200: t.Array(
            t.Object({
              id: t.String(),
              code: t.String(),
              name: t.String(),
              type: t.Enum(MethodType),
              currency: t.Enum(Currency),
              commissionPayin: t.Number(),
              commissionPayout: t.Number(),
              maxPayin: t.Number(),
              minPayin: t.Number(),
              maxPayout: t.Number(),
              minPayout: t.Number(),
              isEnabled: t.Boolean(),
            })
          ),
          401: ErrorSchema,
        },
      }
    )

    /* ──────── GET /merchant/transactions/by-order-id/:orderId ──────── */
    .get(
      "/transactions/by-order-id/:orderId",
      async ({ params, merchant, error }) => {
        // merchant уже проверен в merchantGuard
        try {
          const tx = await db.transaction.findFirst({
            where: { orderId: params.orderId, merchantId: merchant.id },
            select: {
              id: true,
              orderId: true,
              amount: true,
              status: true,
              type: true,
              createdAt: true,
              updatedAt: true,
              isMock: true,
              method: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  type: true,
                  currency: true,
                },
              },
              requisites: {
                select: {
                  id: true,
                  bankType: true,
                  cardNumber: true,
                  recipientName: true,
                  user: { select: { id: true, name: true } }, // трейдер-владелец
                },
              },
            },
          });

          if (!tx) return error(404, { error: "Транзакция не найдена" });

          return {
            ...tx,
            createdAt: tx.createdAt.toISOString(),
            updatedAt: tx.updatedAt.toISOString(),
            requisites: tx.requisites && {
              id: tx.requisites.id,
              bankType: tx.requisites.bankType,
              cardNumber: tx.requisites.cardNumber,
              recipientName: tx.requisites.recipientName,
              traderId: tx.requisites.user.id,
              traderName: tx.requisites.user.name,
            },
          };
        } catch (e) {
          throw e;
        }
      },
      {
        tags: ["merchant"],
        detail: { summary: "Получение транзакции по orderId (с реквизитами)" },
        headers: t.Object({ "x-merchant-api-key": t.String() }),
        params: t.Object({
          orderId: t.String({ description: "Order ID транзакции" }),
        }),
        response: {
          200: t.Object({
            id: t.String(),
            orderId: t.String(),
            amount: t.Number(),
            status: t.Enum(Status),
            type: t.Enum(TransactionType),
            createdAt: t.String(),
            updatedAt: t.String(),
            isMock: t.Boolean(),
            method: t.Object({
              id: t.String(),
              code: t.String(),
              name: t.String(),
              type: t.Enum(MethodType),
              currency: t.Enum(Currency),
            }),
            requisites: t.Optional(
              t.Object({
                id: t.String(),
                bankType: t.Enum(BankType),
                cardNumber: t.String(),
                recipientName: t.String(),
                traderId: t.String(),
                traderName: t.String(),
              })
            ),
          }),
          404: ErrorSchema,
          401: ErrorSchema,
        },
      }
    )

    /* ──────── POST /merchant/transactions/:id/receipt ──────── */
    .post(
      "/transactions/:id/receipt",
      async ({ params, body, merchant, set, error }) => {
        // merchant уже проверен в merchantGuard
        try {
          // Проверяем существование транзакции и принадлежность мерчанту
          const transaction = await db.transaction.findFirst({
            where: { id: params.id, merchantId: merchant.id },
          });

          if (!transaction) {
            return error(404, { error: "Транзакция не найдена" });
          }

          // Validate file upload
          const validation = validateFileUpload(body.fileData, body.fileName);
          if (!validation.valid) {
            return error(400, { error: validation.error });
          }

          // Создаем чек
          const receipt = await db.receipt.create({
            data: {
              transactionId: transaction.id,
              fileData: body.fileData,
              fileName: body.fileName,
            },
          });

          // Обновляем статус транзакции, если указан
          if (
            body.updateStatus &&
            Object.values(Status).includes(body.updateStatus)
          ) {
            await db.transaction.update({
              where: { id: transaction.id },
              data: { status: body.updateStatus },
            });
          }

          set.status = 201;
          return {
            id: receipt.id,
            fileName: receipt.fileName,
            isChecked: receipt.isChecked,
            isFake: receipt.isFake,
            isAuto: receipt.isAuto,
            createdAt: receipt.createdAt.toISOString(),
          };
        } catch (e) {
          throw e;
        }
      },
      {
        tags: ["merchant"],
        detail: { summary: "Загрузка чека для транзакции" },
        headers: t.Object({ "x-merchant-api-key": t.String() }),
        params: t.Object({ id: t.String({ description: "ID транзакции" }) }),
        body: t.Object({
          fileData: t.String({ description: "Файл в формате base64" }),
          fileName: t.String({ description: "Имя файла" }),
          updateStatus: t.Optional(
            t.Enum(Status, { description: "Обновить статус транзакции" })
          ),
        }),
        response: {
          201: t.Object({
            id: t.String(),
            fileName: t.String(),
            isChecked: t.Boolean(),
            isFake: t.Boolean(),
            isAuto: t.Boolean(),
            createdAt: t.String(),
          }),
          404: ErrorSchema,
          401: ErrorSchema,
        },
      }
    )

    /* ──────── GET /merchant/transactions/:id/receipts ──────── */
    .get(
      "/transactions/:id/receipts",
      async ({ params, merchant, error }) => {
        // merchant уже проверен в merchantGuard
        try {
          // Проверяем существование транзакции и принадлежность мерчанту
          const transaction = await db.transaction.findFirst({
            where: { id: params.id, merchantId: merchant.id },
          });

          if (!transaction) {
            return error(404, { error: "Транзакция не найдена" });
          }

          // Получаем все чеки для транзакции
          const receipts = await db.receipt.findMany({
            where: { transactionId: transaction.id },
            orderBy: { createdAt: "desc" },
          });

          // Форматируем даты
          return receipts.map((receipt) => ({
            id: receipt.id,
            fileName: receipt.fileName,
            isChecked: receipt.isChecked,
            isFake: receipt.isFake,
            isAuto: receipt.isAuto,
            createdAt: receipt.createdAt.toISOString(),
            updatedAt: receipt.updatedAt.toISOString(),
          }));
        } catch (e) {
          throw e;
        }
      },
      {
        tags: ["merchant"],
        detail: { summary: "Получение всех чеков для транзакции" },
        headers: t.Object({ "x-merchant-api-key": t.String() }),
        params: t.Object({ id: t.String({ description: "ID транзакции" }) }),
        response: {
          200: t.Array(
            t.Object({
              id: t.String(),
              fileName: t.String(),
              isChecked: t.Boolean(),
              isFake: t.Boolean(),
              isAuto: t.Boolean(),
              createdAt: t.String(),
              updatedAt: t.String(),
            })
          ),
          404: ErrorSchema,
          401: ErrorSchema,
        },
      }
    );
