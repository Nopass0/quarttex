import { Elysia, t } from "elysia";
import { db } from "@/db";
import ErrorSchema from "@/types/error";

/**
 * Маршруты дашборда агрегатора
 */
export default (app: Elysia) =>
  app
    /* ──────── GET /aggregator/dashboard/overview ──────── */
    .get(
      "/overview",
      async ({ aggregator }) => {
        // Статистика за последние 30 дней
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        const [
          todayTransactions,
          monthTransactions,
          successfulTransactions,
          failedTransactions,
          totalVolume,
          activeDisputes,
          recentTransactions
        ] = await Promise.all([
          // Транзакции за сегодня
          db.transaction.count({
            where: {
              aggregatorId: aggregator.id,
              createdAt: {
                gte: new Date(new Date().setHours(0, 0, 0, 0))
              }
            }
          }),
          
          // Транзакции за месяц
          db.transaction.count({
            where: {
              aggregatorId: aggregator.id,
              createdAt: { gte: thirtyDaysAgo }
            }
          }),
          
          // Успешные транзакции за месяц
          db.transaction.count({
            where: {
              aggregatorId: aggregator.id,
              status: "READY",
              createdAt: { gte: thirtyDaysAgo }
            }
          }),
          
          // Неудачные транзакции за месяц
          db.transaction.count({
            where: {
              aggregatorId: aggregator.id,
              status: { in: ["CANCELED", "EXPIRED"] },
              createdAt: { gte: thirtyDaysAgo }
            }
          }),
          
          // Общий объем за месяц
          db.transaction.aggregate({
            where: {
              aggregatorId: aggregator.id,
              status: "READY",
              createdAt: { gte: thirtyDaysAgo }
            },
            _sum: { amount: true }
          }),
          
          // Активные споры
          db.aggregatorDispute.count({
            where: {
              aggregatorId: aggregator.id,
              status: { in: ["OPEN", "IN_PROGRESS"] }
            }
          }),
          
          // Последние 10 транзакций
          db.transaction.findMany({
            where: { aggregatorId: aggregator.id },
            take: 10,
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              numericId: true,
              amount: true,
              status: true,
              type: true,
              createdAt: true,
              merchant: {
                select: { name: true }
              },
              method: {
                select: { name: true, type: true }
              }
            }
          })
        ]);

        const successRate = monthTransactions > 0 
          ? Math.round((successfulTransactions / monthTransactions) * 100) 
          : 0;

        return {
          balanceUsdt: aggregator.balanceUsdt,
          todayTransactions,
          monthTransactions,
          successfulTransactions,
          failedTransactions,
          totalVolume: totalVolume._sum.amount || 0,
          activeDisputes,
          recentTransactions: recentTransactions.map(tx => ({
            ...tx,
            createdAt: tx.createdAt.toISOString(),
            merchant: tx.merchant || { name: "Unknown" }
          }))
        };
      },
      {
        tags: ["aggregator-dashboard"],
        detail: { summary: "Обзор дашборда агрегатора" },
        response: {
          200: t.Object({
            balanceUsdt: t.Number(),
            todayTransactions: t.Number(),
            monthTransactions: t.Number(),
            successfulTransactions: t.Number(),
            failedTransactions: t.Number(),
            totalVolume: t.Number(),
            activeDisputes: t.Number(),
            recentTransactions: t.Array(
              t.Object({
                id: t.String(),
                numericId: t.Number(),
                amount: t.Number(),
                status: t.String(),
                type: t.String(),
                createdAt: t.String(),
                merchant: t.Object({
                  name: t.String()
                }),
                method: t.Optional(t.Object({
                  name: t.String(),
                  type: t.String()
                }))
              })
            )
          })
        }
      }
    )

    /* ──────── GET /aggregator/dashboard/transactions ──────── */
    .get(
      "/transactions",
      async ({ aggregator, query }) => {
        const page = Number(query.page) || 1;
        const limit = Math.min(Number(query.limit) || 20, 100);
        const skip = (page - 1) * limit;

        const where: any = {
          aggregatorId: aggregator.id
        };

        // Фильтры
        if (query.status) {
          where.status = query.status;
        }

        if (query.type) {
          where.type = query.type;
        }

        if (query.search) {
          where.OR = [
            { id: { contains: query.search } },
            { orderId: { contains: query.search } },
            { clientName: { contains: query.search } }
          ];
        }

        if (query.dateFrom) {
          where.createdAt = { gte: new Date(query.dateFrom) };
        }

        if (query.dateTo) {
          where.createdAt = { 
            ...where.createdAt,
            lte: new Date(query.dateTo) 
          };
        }

        const [transactions, total] = await Promise.all([
          db.transaction.findMany({
            where,
            take: limit,
            skip,
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              numericId: true,
              amount: true,
              status: true,
              type: true,
              orderId: true,
              currency: true,
              methodId: true,
              clientName: true,
              createdAt: true,
              updatedAt: true,
              acceptedAt: true,
              expired_at: true,
              merchant: {
                select: { name: true }
              },
              method: {
                select: { name: true, type: true }
              }
            }
          }),
          db.transaction.count({ where })
        ]);

        return {
          data: transactions.map(tx => ({
            ...tx,
            createdAt: tx.createdAt.toISOString(),
            updatedAt: tx.updatedAt.toISOString(),
            acceptedAt: tx.acceptedAt?.toISOString() || null,
            expired_at: tx.expired_at.toISOString()
          })),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        };
      },
      {
        tags: ["aggregator-dashboard"],
        detail: { summary: "Список транзакций агрегатора" },
        query: t.Object({
          page: t.Optional(t.String()),
          limit: t.Optional(t.String()),
          status: t.Optional(t.String()),
          type: t.Optional(t.String()),
          search: t.Optional(t.String()),
          dateFrom: t.Optional(t.String()),
          dateTo: t.Optional(t.String())
        }),
        response: {
          200: t.Object({
            data: t.Array(
              t.Object({
                id: t.String(),
                numericId: t.Number(),
                amount: t.Number(),
                status: t.String(),
                type: t.String(),
                orderId: t.String(),
                currency: t.String(),
                methodId: t.String(),
                clientName: t.Optional(t.String()),
                createdAt: t.String(),
                updatedAt: t.String(),
                acceptedAt: t.Optional(t.String()),
                expired_at: t.String(),
                merchant: t.Object({
                  name: t.String()
                }),
                method: t.Object({
                  name: t.String(),
                  type: t.String()
                })
              })
            ),
            pagination: t.Object({
              page: t.Number(),
              limit: t.Number(),
              total: t.Number(),
              totalPages: t.Number()
            })
          })
        }
      }
    )

    /* ──────── GET /aggregator/dashboard/balance ──────── */
    .get(
      "/balance",
      async ({ aggregator }) => {
        // История операций с балансом за последние 30 дней
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const successfulTransactions = await db.transaction.findMany({
          where: {
            aggregatorId: aggregator.id,
            status: "READY",
            createdAt: { gte: thirtyDaysAgo }
          },
          select: {
            id: true,
            amount: true,
            createdAt: true,
            merchant: {
              select: { name: true }
            }
          },
          orderBy: { createdAt: "desc" }
        });

        // Подсчитываем заработок
        const totalEarnings = successfulTransactions.reduce((sum, tx) => sum + tx.amount, 0);

        return {
          currentBalance: aggregator.balanceUsdt,
          totalEarnings,
          recentOperations: successfulTransactions.slice(0, 10).map(tx => ({
            ...tx,
            createdAt: tx.createdAt.toISOString()
          }))
        };
      },
      {
        tags: ["aggregator-dashboard"],
        detail: { summary: "Информация о балансе агрегатора" },
        response: {
          200: t.Object({
            currentBalance: t.Number(),
            totalEarnings: t.Number(),
            recentOperations: t.Array(
              t.Object({
                id: t.String(),
                amount: t.Number(),
                createdAt: t.String(),
                merchant: t.Object({
                  name: t.String()
                })
              })
            )
          })
        }
      }
    )

    /* ──────── GET /aggregator/dashboard/statistics ──────── */
    .get(
      "/statistics",
      async ({ aggregator, query }) => {
        const period = query?.period || "month";
        
        let dateFrom: Date;
        const now = new Date();
        
        switch (period) {
          case "today":
            dateFrom = new Date(now.setHours(0, 0, 0, 0));
            break;
          case "week":
            dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "month":
            dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case "year":
            dateFrom = new Date(now.getFullYear(), 0, 1);
            break;
          default:
            dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        const [
          totalTransactions,
          successfulTransactions,
          failedTransactions,
          inProgressTransactions,
          totalVolume
        ] = await Promise.all([
          db.transaction.count({
            where: {
              aggregatorId: aggregator.id,
              createdAt: { gte: dateFrom }
            }
          }),
          db.transaction.count({
            where: {
              aggregatorId: aggregator.id,
              status: "READY",
              createdAt: { gte: dateFrom }
            }
          }),
          db.transaction.count({
            where: {
              aggregatorId: aggregator.id,
              status: { in: ["CANCELED", "EXPIRED"] },
              createdAt: { gte: dateFrom }
            }
          }),
          db.transaction.count({
            where: {
              aggregatorId: aggregator.id,
              status: "IN_PROGRESS",
              createdAt: { gte: dateFrom }
            }
          }),
          db.transaction.aggregate({
            where: {
              aggregatorId: aggregator.id,
              status: "READY",
              createdAt: { gte: dateFrom }
            },
            _sum: { amount: true }
          })
        ]);

        const successRate = totalTransactions > 0 
          ? Math.round((successfulTransactions / totalTransactions) * 100)
          : 0;

        return {
          totalTransactions,
          successfulTransactions,
          failedTransactions,
          inProgressTransactions,
          successRate,
          totalVolume: totalVolume._sum.amount || 0
        };
      },
      {
        tags: ["aggregator-dashboard"],
        detail: { summary: "Статистика агрегатора за период" },
        query: t.Object({
          period: t.Optional(t.String())
        }),
        response: {
          200: t.Object({
            totalTransactions: t.Number(),
            successfulTransactions: t.Number(),
            failedTransactions: t.Number(),
            inProgressTransactions: t.Number(),
            successRate: t.Number(),
            totalVolume: t.Number()
          })
        }
      }
    )

    /* ──────── POST /aggregator/dashboard/deposit ──────── */
    .post(
      "/deposit",
      async ({ aggregator, body, error }) => {
        const { amount } = body;

        if (amount <= 0) {
          return error(400, { error: "Сумма должна быть больше 0" });
        }

        if (amount > 100000) {
          return error(400, { error: "Максимальная сумма депозита: 100,000 USDT" });
        }

        // В реальной системе здесь была бы интеграция с платежным процессором
        // Пока что просто увеличиваем баланс
        const updatedAggregator = await db.aggregator.update({
          where: { id: aggregator.id },
          data: { 
            balanceUsdt: { increment: amount } 
          }
        });

        return {
          success: true,
          newBalance: updatedAggregator.balanceUsdt,
          depositAmount: amount,
          message: "Депозит успешно зачислен"
        };
      },
      {
        tags: ["aggregator-dashboard"],
        detail: { summary: "Пополнение баланса агрегатора" },
        body: t.Object({
          amount: t.Number({ minimum: 0.01, maximum: 100000 })
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            newBalance: t.Number(),
            depositAmount: t.Number(),
            message: t.String()
          }),
          400: ErrorSchema
        }
      }
    );