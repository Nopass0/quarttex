import { Elysia, t } from "elysia";
import { db } from "@/db";
import { Prisma, Status, TransactionType } from "@prisma/client";
import ErrorSchema from "@/types/error";
import { traderGuard } from "@/middleware/traderGuard";
import { sendTransactionCallbacks } from "@/utils/notify";
import { truncate2 } from "@/utils/rounding";

// Функция округления вверх до 2 знаков
const roundUp2 = (value: number): number => Math.ceil(value * 100) / 100;
import { getFlexibleFeePercent } from "@/utils/flexible-fee-calculator";
import {
  startOfDay,
  subDays,
  startOfWeek,
  startOfMonth,
  startOfQuarter,
  startOfYear,
} from "date-fns";

/**
 * Маршруты для управления транзакциями трейдера
 */
export default (app: Elysia) =>
  app
    .use(traderGuard())

    /* ───────── GET /trader/transactions - получение списка транзакций трейдера ───────── */
    .get(
      "",
      async ({ trader, query }) => {
        // Параметры фильтрации и пагинации
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 50;
        const skip = (page - 1) * limit;

        

        // Формируем условия фильтрации
        const where: Prisma.TransactionWhereInput = {
          traderId: trader.id,
          // Проверяем, что транзакция связана с реквизитом
          bankDetailId: { not: null },
          // Показываем только транзакции с реквизитами, которые привязаны к устройствам
          requisites: {
            deviceId: { not: null },
          },
        };

        // Фильтрация по статусу, если указан
        if (query.status) {
          where.status = query.status as Status;
        }

        // Фильтрация по типу транзакции, если указан
        if (query.type) {
          where.type = query.type as TransactionType;
        }

        // Фильтрация по наличию споров
        if (query.hasDispute === "true") {
          where.dealDispute = {
            isNot: null,
          };
        } else if (query.hasDispute === "false") {
          where.dealDispute = {
            is: null,
          };
        }

        // Получаем транзакции с пагинацией
        console.log(
          `[Trader API] Поиск транзакций для трейдера ${trader.id}, условия:`,
          where
        );
        const transactions = await db.transaction.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
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
                name: true,
                type: true,
              },
            },
            receipts: {
              select: {
                id: true,
                fileName: true,
                isChecked: true,
                isFake: true,
              },
            },
            requisites: {
              select: {
                id: true,
                recipientName: true,
                cardNumber: true,
                bankType: true,
                deviceId: true,
                device: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            dealDispute: {
              select: {
                id: true,
                status: true,
                createdAt: true,
                updatedAt: true,
              },
            },
            matchedNotification: {
              select: {
                id: true,
                message: true,
                createdAt: true,
                deviceId: true,
                metadata: true,
              },
            },
          },
        });

        // Получаем общее количество транзакций для пагинации
        const total = await db.transaction.count({ where });

        console.log(
          `[Trader API] Найдено ${transactions.length} транзакций из ${total} общих для трейдера ${trader.id}`
        );

        // Calculate summary statistics for selected period (exactly like dashboard)
        const period = (query.period as string) || "today";
        const now = new Date();
        let start: Date;
        let end: Date | undefined;
        switch (period) {
          case "today":
            start = new Date(now.setHours(0, 0, 0, 0));
            break;
          case "yesterday": {
            const d = new Date(now);
            d.setDate(d.getDate() - 1);
            start = new Date(d.setHours(0, 0, 0, 0));
            end = new Date(new Date(start).setDate(start.getDate() + 1));
            break;
          }
          case "week":
            // Последние 7 дней
            start = new Date(now);
            start.setDate(now.getDate() - 7);
            start.setHours(0, 0, 0, 0);
            break;
          case "month":
            // Начало текущего месяца
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case "quarter":
            // Начало текущего квартала
            const currentMonth = now.getMonth();
            const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
            start = new Date(now.getFullYear(), quarterStartMonth, 1);
            break;
          case "halfyear":
            // Начало текущего полугодия
            const halfYearStartMonth = now.getMonth() < 6 ? 0 : 6;
            start = new Date(now.getFullYear(), halfYearStartMonth, 1);
            break;
          case "year":
            // Начало текущего года
            start = new Date(now.getFullYear(), 0, 1);
            break;
          default:
            start = new Date(now.setHours(0, 0, 0, 0));
        }

        const statsWhere: Prisma.TransactionWhereInput = {
          traderId: trader.id,
          bankDetailId: { not: null },
          requisites: { deviceId: { not: null } },
          status: Status.READY,
          acceptedAt: { gte: start, ...(end ? { lt: end } : {}) },
        };

        const statsTransactions = await db.transaction.findMany({
          where: statsWhere,
          select: {
            amount: true,
            rate: true,
            frozenUsdtAmount: true,
            traderProfit: true,
          },
        });

        const stats = statsTransactions.reduce(
          (acc, tx) => {
            // Берём замороженную сумму, а если её нет, считаем из amount/rate
            const calculatedFromRate =
              tx.rate && tx.rate > 0 ? truncate2(tx.amount / tx.rate) : 0;
            const usdtAmount = (tx.frozenUsdtAmount ?? calculatedFromRate) ?? 0;
            acc.count += 1;
            acc.totalAmount += usdtAmount ?? 0;
            acc.totalProfit += tx.traderProfit ?? 0;
            // Добавляем рублевую сумму
            acc.totalAmountRub += tx.amount ?? 0;
            return acc;
          },
          { count: 0, totalAmount: 0, totalProfit: 0, totalAmountRub: 0 }
        );

        // Преобразуем даты в ISO формат
        const formattedTransactions = transactions.map((tx) => {
          // ВСЕГДА показываем оригинальный rate (курс Рапиры с ККК)
          const displayRate = tx.rate;

          // Используем сохраненную прибыль из базы данных
          const profit = tx.traderProfit || 0;

          // Извлекаем информацию об устройстве
          const device = tx.requisites?.device;

          return {
            ...tx,
            rate: displayRate, // Всегда показываем курс Рапиры с ККК
            profit,
            calculatedCommission: profit, // Добавляем для совместимости с фронтендом
            deviceId: device?.id || tx.requisites?.deviceId || null,
            deviceName: device?.name || null,
            createdAt: tx.createdAt.toISOString(),
            updatedAt: tx.updatedAt.toISOString(),
            expired_at: tx.expired_at.toISOString(),
            acceptedAt: tx.acceptedAt ? tx.acceptedAt.toISOString() : null,
            dealDispute: tx.dealDispute
              ? {
                  ...tx.dealDispute,
                  createdAt: tx.dealDispute.createdAt.toISOString(),
                  updatedAt: tx.dealDispute.updatedAt.toISOString(),
                }
              : null,
            matchedNotification: tx.matchedNotification
              ? {
                  ...tx.matchedNotification,
                  createdAt: tx.matchedNotification.createdAt.toISOString(),
                }
              : null,
          };
        });

        return {
          data: formattedTransactions,
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
          },
          stats,
        };
      },
      {
        tags: ["trader"],
        detail: { summary: "Получение списка транзакций трейдера" },
        query: t.Object({
          page: t.Optional(t.String()),
          limit: t.Optional(t.String()),
          status: t.Optional(t.String()),
          type: t.Optional(t.String()),
          hasDispute: t.Optional(t.String()),
          period: t.Optional(t.String()),
        }),
        response: {
          200: t.Object({
            data: t.Array(
              t.Object({
                id: t.String(),
                numericId: t.Number(),
                merchantId: t.String(),
                amount: t.Number(),
                assetOrBank: t.String(),
                orderId: t.String(),
                methodId: t.String(),
                currency: t.Union([t.String(), t.Null()]),
                userId: t.String(),
                userIp: t.Union([t.String(), t.Null()]),
                callbackUri: t.String(),
                successUri: t.String(),
                failUri: t.String(),
                type: t.String(),
                expired_at: t.String(),
                commission: t.Number(),
                clientName: t.String(),
                status: t.String(),
                rate: t.Union([t.Number(), t.Null()]),
                profit: t.Union([t.Number(), t.Null()]),
                frozenUsdtAmount: t.Union([t.Number(), t.Null()]),
                calculatedCommission: t.Union([t.Number(), t.Null()]),
                traderId: t.Union([t.String(), t.Null()]),
                isMock: t.Boolean(),
                createdAt: t.String(),
                updatedAt: t.String(),
                acceptedAt: t.Union([t.String(), t.Null()]),
                merchant: t.Object({
                  id: t.String(),
                  name: t.String(),
                }),
                method: t.Object({
                  id: t.String(),
                  name: t.String(),
                  type: t.String(),
                }),
                receipts: t.Array(
                  t.Object({
                    id: t.String(),
                    fileName: t.String(),
                    isChecked: t.Boolean(),
                    isFake: t.Boolean(),
                  })
                ),
                requisites: t.Union([
                  t.Object({
                    id: t.String(),
                    recipientName: t.String(),
                    cardNumber: t.String(),
                    bankType: t.String(),
                  }),
                  t.Null(),
                ]),
                deviceId: t.Union([t.String(), t.Null()]),
                deviceName: t.Union([t.String(), t.Null()]),
                dealDispute: t.Union([
                  t.Object({
                    id: t.String(),
                    status: t.String(),
                    createdAt: t.String(),
                    updatedAt: t.String(),
                  }),
                  t.Null(),
                ]),
                matchedNotification: t.Union([
                  t.Object({
                    id: t.String(),
                    message: t.String(),
                    createdAt: t.String(),
                    deviceId: t.Union([t.String(), t.Null()]),
                    metadata: t.Any(),
                  }),
                  t.Null(),
                ]),
              })
            ),
            pagination: t.Object({
              total: t.Number(),
              page: t.Number(),
              limit: t.Number(),
              pages: t.Number(),
            }),
            stats: t.Object({
              count: t.Number(),
              totalAmount: t.Number(),
              totalProfit: t.Number(),
              totalAmountRub: t.Number(),
            }),
          }),
          401: ErrorSchema,
          403: ErrorSchema,
        },
      }
    )

    /* ───────── GET /trader/transactions/bt-input - получение транзакций без устройств (БТ-Вход) ───────── */
    .get(
      "/bt-input",
      async ({ trader, query }) => {
        // Параметры фильтрации и пагинации
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 50;
        const skip = (page - 1) * limit;

        // Формируем условия фильтрации - только транзакции без устройств
        const where: Prisma.TransactionWhereInput = {
          traderId: trader.id,
          requisites: {
            OR: [{ deviceId: null }, { device: null }],
          },
        };

        // Фильтрация по статусу, если указан
        if (query.status) {
          where.status = query.status as Status;
        }

        // Фильтрация по типу транзакции, если указан
        if (query.type) {
          where.type = query.type as TransactionType;
        }

        // Получаем транзакции с пагинацией
        console.log(
          `[Trader API] Поиск БТ-Вход транзакций для трейдера ${trader.id}, условия:`,
          where
        );
        const transactions = await db.transaction.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
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
                name: true,
                type: true,
              },
            },
            receipts: {
              select: {
                id: true,
                fileName: true,
                isChecked: true,
                isFake: true,
              },
            },
            requisites: {
              select: {
                id: true,
                recipientName: true,
                cardNumber: true,
                bankType: true,
                deviceId: true,
                device: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            dealDispute: {
              select: {
                id: true,
                status: true,
                createdAt: true,
                updatedAt: true,
              },
            },
            matchedNotification: {
              select: {
                id: true,
                message: true,
                createdAt: true,
                deviceId: true,
                metadata: true,
              },
            },
          },
        });

        // Получаем общее количество транзакций для пагинации
        const total = await db.transaction.count({ where });

        console.log(
          `[Trader API] Найдено ${transactions.length} БТ-Вход транзакций из ${total} общих для трейдера ${trader.id}`
        );

        // Преобразуем даты в ISO формат
        const formattedTransactions = transactions.map((tx) => {
          // ВСЕГДА показываем оригинальный rate (курс Рапиры с ККК)
          const displayRate = tx.rate;

          // Используем сохраненную прибыль из базы данных
          const profit = tx.traderProfit || 0;

          // Извлекаем информацию об устройстве
          const device = tx.requisites?.device;

          return {
            ...tx,
            rate: displayRate, // Всегда показываем курс Рапиры с ККК
            profit,
            calculatedCommission: profit, // Добавляем для совместимости с фронтендом
            deviceId: device?.id || tx.requisites?.deviceId || null,
            deviceName: device?.name || null,
            createdAt: tx.createdAt.toISOString(),
            updatedAt: tx.updatedAt.toISOString(),
            expired_at: tx.expired_at.toISOString(),
            acceptedAt: tx.acceptedAt ? tx.acceptedAt.toISOString() : null,
            dealDispute: tx.dealDispute
              ? {
                  ...tx.dealDispute,
                  createdAt: tx.dealDispute.createdAt.toISOString(),
                  updatedAt: tx.dealDispute.updatedAt.toISOString(),
                }
              : null,
            matchedNotification: tx.matchedNotification
              ? {
                  ...tx.matchedNotification,
                  createdAt: tx.matchedNotification.createdAt.toISOString(),
                }
              : null,
          };
        });

        return {
          data: formattedTransactions,
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
          },
        };
      },
      {
        tags: ["trader"],
        detail: {
          summary: "Получение списка БТ-Вход транзакций (без устройств)",
        },
        query: t.Object({
          page: t.Optional(t.String()),
          limit: t.Optional(t.String()),
          status: t.Optional(t.String()),
          type: t.Optional(t.String()),
        }),
        response: {
          200: t.Object({
            data: t.Array(
              t.Object({
                id: t.String(),
                numericId: t.Number(),
                merchantId: t.String(),
                amount: t.Number(),
                assetOrBank: t.String(),
                orderId: t.String(),
                methodId: t.String(),
                currency: t.Union([t.String(), t.Null()]),
                userId: t.String(),
                userIp: t.Union([t.String(), t.Null()]),
                callbackUri: t.String(),
                successUri: t.String(),
                failUri: t.String(),
                type: t.String(),
                expired_at: t.String(),
                commission: t.Number(),
                clientName: t.String(),
                status: t.String(),
                rate: t.Union([t.Number(), t.Null()]),
                profit: t.Union([t.Number(), t.Null()]),
                frozenUsdtAmount: t.Union([t.Number(), t.Null()]),
                calculatedCommission: t.Union([t.Number(), t.Null()]),
                traderId: t.Union([t.String(), t.Null()]),
                isMock: t.Boolean(),
                createdAt: t.String(),
                updatedAt: t.String(),
                acceptedAt: t.Union([t.String(), t.Null()]),
                merchant: t.Object({
                  id: t.String(),
                  name: t.String(),
                }),
                method: t.Object({
                  id: t.String(),
                  name: t.String(),
                  type: t.String(),
                }),
                receipts: t.Array(
                  t.Object({
                    id: t.String(),
                    fileName: t.String(),
                    isChecked: t.Boolean(),
                    isFake: t.Boolean(),
                  })
                ),
                requisites: t.Union([
                  t.Object({
                    id: t.String(),
                    recipientName: t.String(),
                    cardNumber: t.String(),
                    bankType: t.String(),
                  }),
                  t.Null(),
                ]),
                deviceId: t.Union([t.String(), t.Null()]),
                deviceName: t.Union([t.String(), t.Null()]),
                dealDispute: t.Union([
                  t.Object({
                    id: t.String(),
                    status: t.String(),
                    createdAt: t.String(),
                    updatedAt: t.String(),
                  }),
                  t.Null(),
                ]),
                matchedNotification: t.Union([
                  t.Object({
                    id: t.String(),
                    message: t.String(),
                    createdAt: t.String(),
                    deviceId: t.Union([t.String(), t.Null()]),
                    metadata: t.Any(),
                  }),
                  t.Null(),
                ]),
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
          403: ErrorSchema,
        },
      }
    )

    /* ───────── GET /trader/transactions/:id - получение детальной информации о транзакции ───────── */
    .get(
      "/:id",
      async ({ trader, params, error }) => {
        const transaction = await db.transaction.findUnique({
          where: {
            id: params.id,
            traderId: trader.id,
          },
          include: {
            merchant: true,
            method: true,
            receipts: true,
            requisites: {
              select: {
                id: true,
                recipientName: true,
                cardNumber: true,
                bankType: true,
                phoneNumber: true,
                minAmount: true,
                maxAmount: true,
                dailyLimit: true,
                monthlyLimit: true,
                intervalMinutes: true,
                methodType: true,
                isArchived: true,
                createdAt: true,
                updatedAt: true,
              },
            },
            dealDispute: {
              include: {
                messages: {
                  orderBy: { createdAt: "desc" },
                  take: 1,
                },
              },
            },
            matchedNotification: {
              select: {
                id: true,
                message: true,
                createdAt: true,
                deviceId: true,
                metadata: true,
              },
            },
          },
        });

        if (!transaction) {
          return error(404, { error: "Транзакция не найдена" });
        }

        // Используем сохраненный adjustedRate, если есть, иначе вычисляем с округлением вниз
        const traderRate =
          transaction.adjustedRate ||
          (transaction.rate !== null && transaction.kkkPercent !== null
            ? Math.floor(
                transaction.rate * (1 - transaction.kkkPercent / 100) * 100
              ) / 100
            : transaction.rate);

        // Рассчитываем профит на основе скорректированного курса
        const profit =
          traderRate !== null ? transaction.amount / traderRate : null;

        // Преобразуем даты в ISO формат и включаем requisites
        return {
          ...transaction,
          rate: traderRate,
          profit,
          createdAt: transaction.createdAt.toISOString(),
          updatedAt: transaction.updatedAt.toISOString(),
          expired_at: transaction.expired_at.toISOString(),
          acceptedAt: transaction.acceptedAt
            ? transaction.acceptedAt.toISOString()
            : null,
          merchant: {
            ...transaction.merchant,
            createdAt: transaction.merchant.createdAt.toISOString(),
          },
          requisites: transaction.requisites
            ? {
                ...transaction.requisites,
                phoneNumber: transaction.requisites.phoneNumber || "",
                createdAt: transaction.requisites.createdAt.toISOString(),
                updatedAt: transaction.requisites.updatedAt.toISOString(),
              }
            : null,
          dealDispute: transaction.dealDispute
            ? {
                ...transaction.dealDispute,
                createdAt: transaction.dealDispute.createdAt.toISOString(),
                updatedAt: transaction.dealDispute.updatedAt.toISOString(),
                messages: transaction.dealDispute.messages.map((msg) => ({
                  ...msg,
                  createdAt: msg.createdAt.toISOString(),
                })),
              }
            : null,
          matchedNotification: transaction.matchedNotification
            ? {
                ...transaction.matchedNotification,
                createdAt:
                  transaction.matchedNotification.createdAt.toISOString(),
              }
            : null,
        };
      },
      {
        tags: ["trader"],
        detail: { summary: "Получение детальной информации о транзакции" },
        params: t.Object({
          id: t.String({
            description: "ID транзакции",
          }),
        }),
        response: {
          200: t.Object({
            id: t.String(),
            numericId: t.Number(),
            merchantId: t.String(),
            amount: t.Number(),
            assetOrBank: t.String(),
            orderId: t.String(),
            methodId: t.String(),
            currency: t.Union([t.String(), t.Null()]),
            userId: t.String(),
            userIp: t.Union([t.String(), t.Null()]),
            callbackUri: t.String(),
            successUri: t.String(),
            failUri: t.String(),
            type: t.String(),
            expired_at: t.String(),
            commission: t.Number(),
            clientName: t.String(),
            status: t.String(),
            rate: t.Union([t.Number(), t.Null()]),
            profit: t.Union([t.Number(), t.Null()]),
            frozenUsdtAmount: t.Union([t.Number(), t.Null()]),
            calculatedCommission: t.Union([t.Number(), t.Null()]),
            traderId: t.Union([t.String(), t.Null()]),
            isMock: t.Boolean(),
            createdAt: t.String(),
            updatedAt: t.String(),
            acceptedAt: t.Union([t.String(), t.Null()]),
            merchant: t.Object({
              id: t.String(),
              name: t.String(),
              token: t.String(),
              disabled: t.Boolean(),
              banned: t.Boolean(),
              createdAt: t.String(),
            }),
            method: t.Object({
              id: t.String(),
              code: t.String(),
              name: t.String(),
              type: t.String(),
              currency: t.String(),
              commissionPayin: t.Number(),
              commissionPayout: t.Number(),
              maxPayin: t.Number(),
              minPayin: t.Number(),
              maxPayout: t.Number(),
              minPayout: t.Number(),
              chancePayin: t.Number(),
              chancePayout: t.Number(),
              isEnabled: t.Boolean(),
              rateSource: t.String(),
            }),
            receipts: t.Array(
              t.Object({
                id: t.String(),
                transactionId: t.String(),
                fileData: t.String(),
                fileName: t.String(),
                isChecked: t.Boolean(),
                isFake: t.Boolean(),
                isAuto: t.Boolean(),
                createdAt: t.String(),
                updatedAt: t.String(),
              })
            ),
            requisites: t.Union([
              t.Object({
                id: t.String(),
                recipientName: t.String(),
                cardNumber: t.String(),
                bankType: t.String(),
                phoneNumber: t.String(),
                minAmount: t.Number(),
                maxAmount: t.Number(),
                dailyLimit: t.Number(),
                monthlyLimit: t.Number(),
                intervalMinutes: t.Number(),
                methodType: t.String(),
                isArchived: t.Boolean(),
                createdAt: t.String(),
                updatedAt: t.String(),
              }),
              t.Null(),
            ]),
            matchedNotification: t.Union([
              t.Object({
                id: t.String(),
                message: t.String(),
                createdAt: t.String(),
                deviceId: t.Union([t.String(), t.Null()]),
                metadata: t.Any(),
              }),
              t.Null(),
            ]),
          }),
          401: ErrorSchema,
          403: ErrorSchema,
          404: ErrorSchema,
        },
      }
    )

    /* ───────── PATCH /trader/transactions/:id/status - обновление статуса транзакции ───────── */
    .patch(
      "/:id/status",
      async ({ trader, params, body, error }) => {
        try {
          console.log(
            `[Trader Status Update] Starting for transaction ${params.id} by trader ${trader.id}`
          );
          console.log(
            `[Trader Status Update] Requested status: ${body.status}`
          );

          // Проверяем, существует ли транзакция и принадлежит ли она трейдеру
          const transaction = await db.transaction.findFirst({
            where: {
              id: params.id,
              traderId: trader.id,
            },
          });

          if (!transaction) {
            console.error(
              `[Trader Status Update] Transaction ${params.id} not found for trader ${trader.id}`
            );
            return error(404, { error: "Транзакция не найдена" });
          }

          console.log(
            `[Trader Status Update] Transaction found: status=${transaction.status}, callbackUri=${transaction.callbackUri}`
          );

          // Проверяем, можно ли обновить статус транзакции
          if (transaction.status === Status.CANCELED) {
            return error(400, {
              error: "Невозможно обновить статус завершенной транзакции",
            });
          }

          const isReadyTransition = body.status === Status.READY;
          const wasExpired = transaction.status === Status.EXPIRED;

          // Разрешенные переходы статусов (DISPUTE не включен - споры обрабатываются отдельно)
          if (
            (transaction.status === Status.IN_PROGRESS &&
              body.status === Status.READY) ||
            (transaction.status === Status.EXPIRED &&
              body.status === Status.READY)
          ) {
            // Allowed transitions
          } else {
            return error(400, {
              error:
                "Можно установить статус 'Готово' только для транзакций 'В процессе' или 'Истекла'. Споры обрабатываются через систему споров.",
            });
          }

          // Обновляем статус транзакции
          const updateData: any = { status: body.status };

          if (isReadyTransition) {
            updateData.acceptedAt = new Date();

            // Calculate and set traderProfit if not already set
            console.log("[Trader Profit] Checking conditions:", {
              traderProfitIsNull: transaction.traderProfit === null,
              traderProfit: transaction.traderProfit,
              rateNotNull: transaction.rate !== null,
              rate: transaction.rate,
              willCalculate:
                transaction.traderProfit === null && transaction.rate !== null,
            });

            if (
              transaction.traderProfit === null &&
              transaction.rate !== null
            ) {
              // Get trader merchant settings for commission percentage
              console.log("[Trader Profit] Looking for traderMerchant with:", {
                traderId: transaction.traderId,
                merchantId: transaction.merchantId,
                methodId: transaction.methodId,
              });

              // Используем гибкие ставки для расчета комиссии (как в БТ-входе)
              const feeInPercent = await getFlexibleFeePercent(
                transaction.traderId!,
                transaction.merchantId,
                transaction.methodId,
                transaction.amount,
                "IN"
              );
              console.log("[Trader Profit] Using flexible fee result:", {
                amount: transaction.amount,
                feeInPercent: feeInPercent,
              });

              if (
                feeInPercent > 0 &&
                transaction.rate &&
                transaction.rate > 0
              ) {
                // Правильная формула прибыли как в БТ-входе: спенс в USDT * процент комиссии
                const spentUsdt = transaction.amount / transaction.rate;
                const profit = spentUsdt * (feeInPercent / 100);
                // Обрезаем до 2 знаков после запятой
                updateData.traderProfit = truncate2(profit);
                console.log("[Trader Profit] Calculation details:", {
                  amount: transaction.amount,
                  rate: transaction.rate,
                  feeInPercent: feeInPercent,
                  spentUsdt: spentUsdt,
                  profit: profit,
                  finalProfit: updateData.traderProfit,
                });
              } else {
                console.log("[Trader Profit] Cannot calculate profit:", {
                  feeInPercent: feeInPercent,
                  rate: transaction.rate,
                  reason:
                    feeInPercent <= 0 ? "No fee configured" : "Invalid rate",
                });
                updateData.traderProfit = 0; // Явно устанавливаем 0, чтобы избежать undefined
              }
            }
          }

          console.log(
            `[Trader Status Update] Updating transaction with data:`,
            updateData
          );

          const updatedTransaction = await db.transaction.update({
            where: { id: params.id },
            data: updateData,
          });

          console.log(
            `[Trader Status Update] Transaction updated successfully: new status=${updatedTransaction.status}`
          );

          // If IN transaction moved to READY, handle freezing and merchant balance
          if (transaction.type === TransactionType.IN && isReadyTransition) {
            await db.$transaction(async (prisma) => {
              // Начисляем мерчанту
              const method = await prisma.method.findUnique({
                where: { id: transaction.methodId },
              });
              if (method && transaction.rate) {
                const netAmount =
                  transaction.amount -
                  (transaction.amount * method.commissionPayin) / 100;
                const increment = netAmount / transaction.rate;
                await prisma.merchant.update({
                  where: { id: transaction.merchantId },
                  data: { balanceUsdt: { increment } },
                });
              }

              // Обрабатываем заморозку трейдера
              const txWithFreezing = await prisma.transaction.findUnique({
                where: { id: transaction.id },
              });

              if (txWithFreezing?.frozenUsdtAmount || wasExpired) {
                if (wasExpired) {
                  // Для истекших транзакций средства уже были разморожены и возвращены на trustBalance
                  // Теперь нужно списать их оттуда при подтверждении
                  // Используем сохраненную сумму frozenUsdtAmount, либо пересчитываем с округлением вверх
                  const amountToDeduct = txWithFreezing?.frozenUsdtAmount ||
                    (transaction.rate ? roundUp2(transaction.amount / transaction.rate) : 0);

                  console.log(
                    "[Trader Deduct After Expiry] Processing EXPIRED transaction approval:",
                    {
                      transactionId: transaction.id,
                      amountToDeduct,
                      frozenUsdtAmount: txWithFreezing?.frozenUsdtAmount,
                      wasExpired,
                    }
                  );

                  const balances = await prisma.user.findUnique({
                    where: { id: trader.id },
                    select: { trustBalance: true, deposit: true },
                  });

                  if (balances && amountToDeduct > 0) {
                    let remaining = amountToDeduct;
                    const trustDeduct = Math.min(
                      balances.trustBalance || 0,
                      remaining
                    );
                    remaining -= trustDeduct;

                    const updateFields: any = {};
                    if (trustDeduct > 0) {
                      updateFields.trustBalance = {
                        decrement: truncate2(trustDeduct),
                      };
                    }
                    // Если trustBalance недостаточно, списываем остаток с deposit
                    if (remaining > 0) {
                      updateFields.deposit = {
                        decrement: truncate2(remaining),
                      };
                    }

                    console.log(
                      "[Trader Deduct After Expiry] Balance update details:",
                      {
                        trustBalance: balances.trustBalance,
                        trustDeduct,
                        depositDeduct: remaining,
                        updateFields,
                      }
                    );

                    if (Object.keys(updateFields).length > 0) {
                      await prisma.user.update({
                        where: { id: trader.id },
                        data: updateFields,
                      });
                    }
                  }

                  // ВАЖНО: Для истекших транзакций НЕ трогаем frozenUsdt (он уже был уменьшен при истечении)
                } else if (txWithFreezing?.frozenUsdtAmount) {
                  // Размораживаем ПОЛНУЮ сумму (основная + комиссия)
                  const totalToUnfreeze =
                    txWithFreezing.frozenUsdtAmount +
                    (txWithFreezing.calculatedCommission || 0);
                  console.log("[Trader Unfreeze] Unfreezing total amount:", {
                    frozenUsdtAmount: txWithFreezing.frozenUsdtAmount,
                    calculatedCommission: txWithFreezing.calculatedCommission,
                    totalToUnfreeze: totalToUnfreeze,
                  });
                  await prisma.user.update({
                    where: { id: trader.id },
                    data: {
                      frozenUsdt: { decrement: truncate2(totalToUnfreeze) },
                    },
                  });
                }
              }

              // Начисляем прибыль трейдеру
              // Используем traderProfit который мы рассчитали выше при установке статуса READY
              console.log(
                "[Trader Profit] updateData.traderProfit:",
                updateData.traderProfit
              );
              console.log(
                "[Trader Profit] Type:",
                typeof updateData.traderProfit
              );

              if (
                typeof updateData.traderProfit === "number" &&
                updateData.traderProfit > 0
              ) {
                console.log(
                  "[Trader Profit] Adding profit to trader:",
                  trader.id,
                  "amount:",
                  updateData.traderProfit
                );
                await prisma.user.update({
                  where: { id: trader.id },
                  data: {
                    profitFromDeals: {
                      increment: truncate2(updateData.traderProfit),
                    },
                  },
                });
              } else {
                console.log(
                  "[Trader Profit] Skipping profit update - profit is 0 or invalid"
                );
              }

              // Обновляем currentTotalAmount для реквизита
              if (transaction.bankDetailId) {
                await prisma.bankDetail.update({
                  where: { id: transaction.bankDetailId },
                  data: {
                    currentTotalAmount: { increment: transaction.amount },
                  },
                });
              }
            });
          }

          // If OUT transaction moved to READY, deduct from trust balance
          if (transaction.type === TransactionType.OUT && isReadyTransition) {
            const stake = trader.stakePercent ?? 0;
            const commission = trader.profitPercent ?? 0;
            const rubAfter = transaction.amount * (1 - commission / 100);
            const rateAdj = transaction.rate
              ? transaction.rate * (1 - stake / 100)
              : undefined;
            const deduct =
              !rateAdj || transaction.currency?.toLowerCase() === "usdt"
                ? rubAfter
                : rubAfter / rateAdj;

            // Проверяем доступный траст баланс
            const traderRecord = await db.user.findUnique({
              where: { id: trader.id },
            });
            const availableTrustBalance = traderRecord?.trustBalance ?? 0;
            if (availableTrustBalance < deduct) {
              return error(400, { error: "Недостаточно баланса" });
            }

            await db.user.update({
              where: { id: trader.id },
              data: { trustBalance: { decrement: truncate2(deduct) } },
            });
          }

          // Отправляем колбэк напрямую при изменении статуса (ПОСЛЕ всех финансовых операций)
          let callbackResult = null;

          console.log(
            `[Trader Status Update] About to send callback for transaction ${updatedTransaction.id}`
          );
          console.log(
            `[Trader Status Update] Callback URI: ${updatedTransaction.callbackUri}`
          );
          console.log(
            `[Trader Status Update] Success URI: ${updatedTransaction.successUri}`
          );
          console.log(
            `[Trader Status Update] Final status: ${updatedTransaction.status}`
          );

          // Отправляем callback'и используя универсальную функцию
          try {
            callbackResult = await sendTransactionCallbacks(updatedTransaction);
          } catch (callbackError) {
            console.error(
              `[Trader Status Update] Critical error in callback section:`,
              callbackError
            );
            // Не прерываем выполнение, продолжаем
          }

          const hook = callbackResult;

          console.log(
            `[Trader Status Update] Success! Returning response with hook:`,
            hook ? "yes" : "no"
          );

          return {
            success: true,
            transaction: {
              ...updatedTransaction,
              rate:
                updatedTransaction.adjustedRate ||
                (updatedTransaction.rate !== null &&
                updatedTransaction.kkkPercent !== null
                  ? Math.floor(
                      updatedTransaction.rate *
                        (1 - updatedTransaction.kkkPercent / 100) *
                        100
                    ) / 100
                  : updatedTransaction.rate),
              profit:
                updatedTransaction.adjustedRate !== null
                  ? updatedTransaction.amount / updatedTransaction.adjustedRate
                  : updatedTransaction.rate !== null &&
                    updatedTransaction.kkkPercent !== null
                  ? updatedTransaction.amount /
                    (Math.floor(
                      updatedTransaction.rate *
                        (1 - updatedTransaction.kkkPercent / 100) *
                        100
                    ) /
                      100)
                  : null,
              createdAt: updatedTransaction.createdAt.toISOString(),
              updatedAt: updatedTransaction.updatedAt.toISOString(),
              expired_at: updatedTransaction.expired_at.toISOString(),
              acceptedAt: updatedTransaction.acceptedAt?.toISOString() ?? null,
            },
            hook,
          };
        } catch (err) {
          console.error(`[Trader Status Update] Error:`, err);
          return error(500, {
            error: "Не удалось обновить статус транзакции",
            details: err instanceof Error ? err.message : String(err),
          });
        }
      },
      {
        tags: ["trader"],
        detail: { summary: "Обновление статуса транзакции" },
        params: t.Object({
          id: t.String({
            description: "ID транзакции",
          }),
        }),
        body: t.Object({
          status: t.Enum(Status, {
            description: "Новый статус транзакции",
          }),
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
              currency: t.Union([t.String(), t.Null()]),
              userId: t.String(),
              userIp: t.Union([t.String(), t.Null()]),
              callbackUri: t.String(),
              successUri: t.String(),
              failUri: t.String(),
              type: t.String(),
              expired_at: t.String(),
              commission: t.Number(),
              clientName: t.String(),
              status: t.String(),
              rate: t.Union([t.Number(), t.Null()]),
              profit: t.Union([t.Number(), t.Null()]),
              frozenUsdtAmount: t.Union([t.Number(), t.Null()]),
              calculatedCommission: t.Union([t.Number(), t.Null()]),
              traderId: t.Union([t.String(), t.Null()]),
              isMock: t.Boolean(),
              createdAt: t.String(),
              updatedAt: t.String(),
              acceptedAt: t.Union([t.String(), t.Null()]),
            }),
            hook: t.Optional(t.Unknown()),
          }),
          400: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
          404: ErrorSchema,
        },
      }
    );
