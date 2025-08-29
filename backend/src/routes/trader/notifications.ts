import { Elysia, t } from "elysia";
import { db } from "@/db";
import ErrorSchema from "@/types/error";
import { NotificationType } from "@prisma/client";
import { truncate2 } from "@/utils/rounding";
import { getFlexibleFeePercent } from "@/utils/flexible-fee-calculator";

/* ---------- DTOs ---------- */
const NotificationDTO = t.Object({
  id: t.String(),
  type: t.String(),
  application: t.Union([t.String(), t.Null()]),
  packageName: t.Union([t.String(), t.Null()]),
  title: t.Union([t.String(), t.Null()]),
  message: t.String(),
  metadata: t.Any(),
  isRead: t.Boolean(),
  isProcessed: t.Boolean(),
  createdAt: t.String(),
  deviceId: t.Union([t.String(), t.Null()]),
  deviceName: t.Union([t.String(), t.Null()]),
  matchedTransaction: t.Union([
    t.Object({
      id: t.String(),
      numericId: t.Number(),
      amount: t.Number(),
      status: t.String(),
      merchantName: t.String(),
    }),
    t.Null(),
  ]),
});

/* ---------- Routes ---------- */
export const notificationRoutes = new Elysia({ prefix: "/notifications" })

  /* ---------- GET /trader/notifications - список уведомлений ---------- */
  .get(
    "/",
    async ({ trader, query }) => {
      const page = query.page || 1;
      const limit = query.limit || 20;
      const offset = (page - 1) * limit;

      // Получаем все устройства трейдера
      const traderDevices = await db.device.findMany({
        where: { userId: trader.id },
        select: { id: true },
      });

      const deviceIds = traderDevices.map((d) => d.id);

      const where: any = {
        deviceId: { in: deviceIds },
        type: NotificationType.AppNotification,
      };

      // Фильтры
      if (query.search) {
        where.message = { contains: query.search, mode: "insensitive" };
      }

      if (query.isProcessed !== undefined) {
        where.isProcessed = query.isProcessed === "true";
      }

      if (query.deviceId) {
        where.deviceId = query.deviceId;
      }

      // Получаем уведомления
      const [notifications, total] = await Promise.all([
        db.notification.findMany({
          where,
          include: {
            Device: {
              select: {
                id: true,
                name: true,
              },
            },
            matchedTransactions: {
              select: {
                id: true,
                numericId: true,
                amount: true,
                status: true,
                merchant: {
                  select: {
                    name: true,
                  },
                },
              },
              take: 1, // Берем только первую связанную транзакцию
            },
          },
          orderBy: { createdAt: "desc" },
          skip: offset,
          take: limit,
        }),
        db.notification.count({ where }),
      ]);

      // Форматируем ответ
      const formattedNotifications = notifications.map((n) => ({
        id: n.id,
        type: n.type,
        application: n.application,
        packageName: n.packageName,
        title: n.title,
        message: n.message,
        metadata: n.metadata,
        isRead: n.isRead,
        isProcessed: n.isProcessed,
        createdAt: n.createdAt.toISOString(),
        deviceId: n.deviceId,
        deviceName: n.Device?.name || null,
        matchedTransaction: n.matchedTransactions[0]
          ? {
              id: n.matchedTransactions[0].id,
              numericId: n.matchedTransactions[0].numericId,
              amount: n.matchedTransactions[0].amount,
              status: n.matchedTransactions[0].status,
              merchantName: n.matchedTransactions[0].merchant.name,
            }
          : null,
      }));

      return {
        data: formattedNotifications,
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
      detail: { summary: "Получить список уведомлений трейдера" },
      query: t.Object({
        page: t.Optional(t.Number()),
        limit: t.Optional(t.Number()),
        search: t.Optional(t.String()),
        isProcessed: t.Optional(t.String()),
        deviceId: t.Optional(t.String()),
      }),
      response: {
        200: t.Object({
          data: t.Array(NotificationDTO),
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

  /* ---------- GET /trader/notifications/:id - детали уведомления ---------- */
  .get(
    "/:id",
    async ({ trader, params, error }) => {
      // Получаем все устройства трейдера
      const traderDevices = await db.device.findMany({
        where: { userId: trader.id },
        select: { id: true },
      });

      const deviceIds = traderDevices.map((d) => d.id);

      const notification = await db.notification.findFirst({
        where: {
          id: params.id,
          deviceId: { in: deviceIds },
        },
        include: {
          Device: {
            select: {
              id: true,
              name: true,
            },
          },
          matchedTransactions: {
            include: {
              merchant: true,
              method: true,
              requisites: {
                select: {
                  id: true,
                  cardNumber: true,
                  bankType: true,
                  recipientName: true,
                },
              },
            },
          },
        },
      });

      if (!notification) {
        return error(404, { error: "Уведомление не найдено" });
      }

      // Помечаем как прочитанное
      if (!notification.isRead) {
        await db.notification.update({
          where: { id: notification.id },
          data: { isRead: true },
        });
      }

      return {
        id: notification.id,
        type: notification.type,
        application: notification.application,
        packageName: notification.packageName,
        title: notification.title,
        message: notification.message,
        metadata: notification.metadata,
        isRead: true,
        isProcessed: notification.isProcessed,
        createdAt: notification.createdAt.toISOString(),
        updatedAt: notification.updatedAt.toISOString(),
        deviceId: notification.deviceId,
        deviceName: notification.Device?.name || null,
        matchedTransactions: notification.matchedTransactions.map((tx) => ({
          id: tx.id,
          numericId: tx.numericId,
          amount: tx.amount,
          status: tx.status,
          createdAt: tx.createdAt.toISOString(),
          merchant: {
            id: tx.merchant.id,
            name: tx.merchant.name,
          },
          method: {
            id: tx.method.id,
            name: tx.method.name,
            type: tx.method.type,
          },
          requisites: tx.requisites
            ? {
                id: tx.requisites.id,
                cardNumber: tx.requisites.cardNumber,
                bankType: tx.requisites.bankType,
                recipientName: tx.requisites.recipientName,
              }
            : null,
        })),
      };
    },
    {
      tags: ["trader"],
      detail: { summary: "Получить детали уведомления" },
      params: t.Object({ id: t.String() }),
      response: {
        200: t.Object({
          id: t.String(),
          type: t.String(),
          application: t.Union([t.String(), t.Null()]),
          packageName: t.Union([t.String(), t.Null()]),
          title: t.Union([t.String(), t.Null()]),
          message: t.String(),
          metadata: t.Any(),
          isRead: t.Boolean(),
          isProcessed: t.Boolean(),
          createdAt: t.String(),
          updatedAt: t.String(),
          deviceId: t.Union([t.String(), t.Null()]),
          deviceName: t.Union([t.String(), t.Null()]),
          matchedTransactions: t.Array(
            t.Object({
              id: t.String(),
              numericId: t.Number(),
              amount: t.Number(),
              status: t.String(),
              createdAt: t.String(),
              merchant: t.Object({
                id: t.String(),
                name: t.String(),
              }),
              method: t.Object({
                id: t.String(),
                name: t.String(),
                type: t.String(),
              }),
              requisites: t.Union([
                t.Object({
                  id: t.String(),
                  cardNumber: t.String(),
                  bankType: t.String(),
                  recipientName: t.String(),
                }),
                t.Null(),
              ]),
            })
          ),
        }),
        401: ErrorSchema,
        403: ErrorSchema,
        404: ErrorSchema,
      },
    }
  )

  /* ---------- PUT /trader/notifications/:id/read - пометить как прочитанное ---------- */
  .put(
    "/:id/read",
    async ({ trader, params, error }) => {
      // Получаем все устройства трейдера
      const traderDevices = await db.device.findMany({
        where: { userId: trader.id },
        select: { id: true },
      });

      const deviceIds = traderDevices.map((d) => d.id);

      const notification = await db.notification.findFirst({
        where: {
          id: params.id,
          deviceId: { in: deviceIds },
        },
      });

      if (!notification) {
        return error(404, { error: "Уведомление не найдено" });
      }

      await db.notification.update({
        where: { id: notification.id },
        data: { isRead: true },
      });

      return { success: true };
    },
    {
      tags: ["trader"],
      detail: { summary: "Пометить уведомление как прочитанное" },
      params: t.Object({ id: t.String() }),
      response: {
        200: t.Object({ success: t.Boolean() }),
        401: ErrorSchema,
        403: ErrorSchema,
        404: ErrorSchema,
      },
    }
  )

  /* ---------- POST /trader/notifications/:id/link-transaction - привязать уведомление к транзакции ---------- */
  .post(
    "/:id/link-transaction",
    async ({ trader, params, body, error }) => {
      // Получаем все устройства трейдера
      const traderDevices = await db.device.findMany({
        where: { userId: trader.id },
        select: { id: true },
      });

      const deviceIds = traderDevices.map((d) => d.id);

      // Проверяем, что уведомление принадлежит трейдеру
      const notification = await db.notification.findFirst({
        where: {
          id: params.id,
          deviceId: { in: deviceIds },
        },
      });

      if (!notification) {
        return error(404, { error: "Уведомление не найдено" });
      }

      // Проверяем, что транзакция принадлежит трейдеру
      const transaction = await db.transaction.findFirst({
        where: {
          id: body.transactionId,
          traderId: trader.id,
        },
      });

      if (!transaction) {
        return error(404, { error: "Транзакция не найдена" });
      }

      // Привязываем уведомление к транзакции
      await db.notification.update({
        where: { id: notification.id },
        data: {
          matchedTransactions: {
            connect: { id: transaction.id },
          },
          isProcessed: true,
        },
      });

      // Обновляем статус транзакции на READY если она была CREATED или IN_PROGRESS (но НЕ DISPUTE - споры обрабатываются отдельно)
      if (
        transaction.status === "CREATED" ||
        transaction.status === "IN_PROGRESS"
      ) {
        await db.transaction.update({
          where: { id: transaction.id },
          data: {
            status: "READY",
            acceptedAt: new Date(),
          },
        });

        // Выполняем финансовые операции
        await db.$transaction(async (prisma) => {
          // Рассчитываем прибыль трейдера с учетом гибких ставок (как в БТ-входе)
          const spentUsdt = transaction.rate
            ? transaction.amount / transaction.rate
            : 0;
          const commissionPercent = await getFlexibleFeePercent(
            transaction.traderId,
            transaction.merchantId,
            transaction.methodId,
            transaction.amount,
            "IN"
          );
          const traderProfit = truncate2(spentUsdt * (commissionPercent / 100));

          // Обновляем транзакцию с рассчитанной прибылью
          await prisma.transaction.update({
            where: { id: transaction.id },
            data: {
              traderProfit: traderProfit,
            },
          });

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
          if (transaction.frozenUsdtAmount) {
            await prisma.user.update({
              where: { id: trader.id },
              data: {
                frozenUsdt: {
                  decrement: truncate2(transaction.frozenUsdtAmount),
                },
              },
            });
          }

          // Начисляем прибыль трейдеру
          if (traderProfit > 0) {
            await prisma.user.update({
              where: { id: trader.id },
              data: {
                profitFromDeals: {
                  increment: truncate2(traderProfit),
                },
              },
            });
          }
        });

        // Отправляем webhook
        const { notifyByStatus } = await import("@/utils/notify");
        await notifyByStatus({
          id: transaction.orderId, // Pass orderId instead of id
          status: "READY",
          successUri: transaction.successUri,
          failUri: transaction.failUri,
          callbackUri: transaction.callbackUri,
          amount: transaction.amount,
        });
      }

      return {
        success: true,
        transaction: {
          id: transaction.id,
          status: "READY",
        },
      };
    },
    {
      tags: ["trader"],
      detail: {
        summary: "Привязать уведомление к транзакции и обновить статус",
      },
      params: t.Object({ id: t.String() }),
      body: t.Object({
        transactionId: t.String(),
      }),
      response: {
        200: t.Object({
          success: t.Boolean(),
          transaction: t.Object({
            id: t.String(),
            status: t.String(),
          }),
        }),
        401: ErrorSchema,
        403: ErrorSchema,
        404: ErrorSchema,
      },
    }
  );
