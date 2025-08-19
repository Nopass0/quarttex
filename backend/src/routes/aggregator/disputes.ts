import { Elysia, t } from "elysia";
import { db } from "@/db";
import ErrorSchema from "@/types/error";
import { Prisma, DealDisputeStatus, DisputeSenderType } from "@prisma/client";

/**
 * Система споров для агрегаторов
 */
export default (app: Elysia) =>
  app
    /* ──────── GET /aggregator/disputes ──────── */
    .get(
      "/",
      async ({ aggregator, query }) => {
        const where: Prisma.AggregatorDisputeWhereInput = {
          aggregatorId: aggregator.id
        };

        // Фильтры
        if (query.status) {
          where.status = query.status as DealDisputeStatus;
        }

        if (query.search) {
          where.OR = [
            { subject: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
            { transaction: { 
              orderId: { contains: query.search, mode: 'insensitive' } 
            } }
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

        const page = Number(query.page) || 1;
        const limit = Math.min(Number(query.limit) || 20, 100);
        const skip = (page - 1) * limit;

        const [disputes, total] = await Promise.all([
          db.aggregatorDispute.findMany({
            where,
            take: limit,
            skip,
            orderBy: { createdAt: "desc" },
            include: {
              transaction: {
                select: {
                  id: true,
                  numericId: true,
                  orderId: true,
                  amount: true,
                  status: true,
                  createdAt: true
                }
              },
              _count: {
                select: { messages: true }
              }
            }
          }),
          db.aggregatorDispute.count({ where })
        ]);

        return {
          data: disputes.map(dispute => ({
            ...dispute,
            createdAt: dispute.createdAt.toISOString(),
            updatedAt: dispute.updatedAt.toISOString(),
            resolvedAt: dispute.resolvedAt?.toISOString() || null,
            transaction: {
              ...dispute.transaction,
              createdAt: dispute.transaction.createdAt.toISOString()
            }
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
        tags: ["aggregator-disputes"],
        detail: { summary: "Список споров агрегатора" },
        query: t.Object({
          page: t.Optional(t.String()),
          limit: t.Optional(t.String()),
          status: t.Optional(t.String()),
          search: t.Optional(t.String()),
          dateFrom: t.Optional(t.String()),
          dateTo: t.Optional(t.String())
        }),
        response: {
          200: t.Object({
            data: t.Array(
              t.Object({
                id: t.String(),
                transactionId: t.String(),
                status: t.String(),
                subject: t.String(),
                description: t.Optional(t.String()),
                createdAt: t.String(),
                updatedAt: t.String(),
                resolvedAt: t.Optional(t.String()),
                transaction: t.Object({
                  id: t.String(),
                  numericId: t.Number(),
                  orderId: t.String(),
                  amount: t.Number(),
                  status: t.String(),
                  createdAt: t.String()
                }),
                _count: t.Object({
                  messages: t.Number()
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

    /* ──────── GET /aggregator/disputes/:id ──────── */
    .get(
      "/:id",
      async ({ aggregator, params, error }) => {
        const dispute = await db.aggregatorDispute.findFirst({
          where: { 
            id: params.id,
            aggregatorId: aggregator.id
          },
          include: {
            transaction: {
              select: {
                id: true,
                numericId: true,
                orderId: true,
                amount: true,
                status: true,
                clientName: true,
                createdAt: true
              }
            },
            messages: {
              orderBy: { createdAt: "asc" }
            }
          }
        });

        if (!dispute) {
          return error(404, { error: "Спор не найден" });
        }

        return {
          ...dispute,
          createdAt: dispute.createdAt.toISOString(),
          updatedAt: dispute.updatedAt.toISOString(),
          resolvedAt: dispute.resolvedAt?.toISOString() || null,
          transaction: {
            ...dispute.transaction,
            createdAt: dispute.transaction.createdAt.toISOString()
          },
          messages: dispute.messages.map(msg => ({
            ...msg,
            createdAt: msg.createdAt.toISOString()
          }))
        };
      },
      {
        tags: ["aggregator-disputes"],
        detail: { summary: "Детали спора" },
        params: t.Object({ id: t.String() }),
        response: {
          200: t.Any(),
          404: ErrorSchema
        }
      }
    )

    /* ──────── POST /aggregator/disputes/:id/messages ──────── */
    .post(
      "/:id/messages",
      async ({ aggregator, params, body, error }) => {
        // Проверяем, что спор принадлежит агрегатору
        const dispute = await db.aggregatorDispute.findFirst({
          where: { 
            id: params.id,
            aggregatorId: aggregator.id
          }
        });

        if (!dispute) {
          return error(404, { error: "Спор не найден" });
        }

        // Проверяем, что спор не закрыт
        if (dispute.status === "RESOLVED_SUCCESS" || dispute.status === "RESOLVED_FAIL" || dispute.status === "CANCELLED") {
          return error(400, { error: "Спор уже закрыт" });
        }

        try {
          const message = await db.aggregatorDisputeMessage.create({
            data: {
              disputeId: params.id,
              senderId: aggregator.id,
              senderType: DisputeSenderType.AGGREGATOR,
              message: body.message
            }
          });

          // Обновляем статус спора на IN_PROGRESS, если он был OPEN
          if (dispute.status === "OPEN") {
            await db.aggregatorDispute.update({
              where: { id: params.id },
              data: { 
                status: "IN_PROGRESS",
                updatedAt: new Date()
              }
            });
          }

          return {
            success: true,
            message: {
              ...message,
              createdAt: message.createdAt.toISOString()
            }
          };
        } catch (e) {
          console.error('Error creating dispute message:', e);
          return error(500, { error: "Ошибка отправки сообщения" });
        }
      },
      {
        tags: ["aggregator-disputes"],
        detail: { summary: "Отправить сообщение в споре" },
        params: t.Object({ id: t.String() }),
        body: t.Object({
          message: t.String({ minLength: 1, maxLength: 2000 })
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            message: t.Object({
              id: t.String(),
              disputeId: t.String(),
              senderId: t.String(),
              senderType: t.String(),
              message: t.String(),
              createdAt: t.String()
            })
          }),
          400: ErrorSchema,
          404: ErrorSchema,
          500: ErrorSchema
        }
      }
    )

    /* ──────── GET /aggregator/disputes/statistics ──────── */
    .get(
      "/statistics",
      async ({ aggregator }) => {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const [
          totalDisputes,
          openDisputes,
          inProgressDisputes,
          resolvedSuccessDisputes,
          resolvedFailDisputes,
          cancelledDisputes,
          monthlyDisputes,
          averageResolutionTime
        ] = await Promise.all([
          // Всего споров
          db.aggregatorDispute.count({
            where: { aggregatorId: aggregator.id }
          }),

          // Открытые споры
          db.aggregatorDispute.count({
            where: { 
              aggregatorId: aggregator.id,
              status: "OPEN"
            }
          }),

          // Споры в работе
          db.aggregatorDispute.count({
            where: { 
              aggregatorId: aggregator.id,
              status: "IN_PROGRESS"
            }
          }),

          // Успешно решенные
          db.aggregatorDispute.count({
            where: { 
              aggregatorId: aggregator.id,
              status: "RESOLVED_SUCCESS"
            }
          }),

          // Решенные не в пользу агрегатора
          db.aggregatorDispute.count({
            where: { 
              aggregatorId: aggregator.id,
              status: "RESOLVED_FAIL"
            }
          }),

          // Отмененные
          db.aggregatorDispute.count({
            where: { 
              aggregatorId: aggregator.id,
              status: "CANCELLED"
            }
          }),

          // Споры за месяц
          db.aggregatorDispute.count({
            where: { 
              aggregatorId: aggregator.id,
              createdAt: { gte: thirtyDaysAgo }
            }
          }),

          // Среднее время решения (в часах)
          db.aggregatorDispute.findMany({
            where: { 
              aggregatorId: aggregator.id,
              resolvedAt: { not: null }
            },
            select: {
              createdAt: true,
              resolvedAt: true
            }
          })
        ]);

        // Вычисляем среднее время решения
        let avgResolutionHours = 0;
        if (averageResolutionTime.length > 0) {
          const totalHours = averageResolutionTime.reduce((sum, dispute) => {
            const diffMs = dispute.resolvedAt!.getTime() - dispute.createdAt.getTime();
            return sum + (diffMs / (1000 * 60 * 60)); // в часах
          }, 0);
          avgResolutionHours = Math.round(totalHours / averageResolutionTime.length);
        }

        return {
          totalDisputes,
          openDisputes,
          inProgressDisputes,
          resolvedSuccessDisputes,
          resolvedFailDisputes,
          cancelledDisputes,
          monthlyDisputes,
          averageResolutionHours,
          successRate: totalDisputes > 0 
            ? Math.round((resolvedSuccessDisputes / totalDisputes) * 100) 
            : 0
        };
      },
      {
        tags: ["aggregator-disputes"],
        detail: { summary: "Статистика споров" },
        response: {
          200: t.Object({
            totalDisputes: t.Number(),
            openDisputes: t.Number(),
            inProgressDisputes: t.Number(),
            resolvedSuccessDisputes: t.Number(),
            resolvedFailDisputes: t.Number(),
            cancelledDisputes: t.Number(),
            monthlyDisputes: t.Number(),
            averageResolutionHours: t.Number(),
            successRate: t.Number()
          })
        }
      }
    );