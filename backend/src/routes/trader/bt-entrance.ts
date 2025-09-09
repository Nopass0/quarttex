import { Elysia, t } from "elysia";
import { db } from "@/db";
import { BankType, MethodType, Status } from "@prisma/client";
import ErrorSchema from "@/types/error";
import { startOfDay, endOfDay } from "date-fns";
import { notifyByStatus } from "@/utils/notify";
import { truncate2 } from "@/utils/rounding";
import { roundUp2 } from "@/utils/rounding";
import { getFlexibleFeePercent } from "@/utils/flexible-fee-calculator";

/* ---------- DTOs ---------- */
const BtDealDTO = t.Object({
  id: t.String(),
  numericId: t.Number(),
  amount: t.Number(),
  merchantId: t.String(),
  merchantName: t.String(),
  methodType: t.String(),
  bankType: t.String(),
  cardNumber: t.String(),
  recipientName: t.String(),
  status: t.String(),
  type: t.String(),
  createdAt: t.String(),
  updatedAt: t.String(),
  acceptedAt: t.Optional(t.String()),
  completedAt: t.Optional(t.String()),
  expiredAt: t.Optional(t.String()),
  requisiteId: t.String(),
  commission: t.Number(),
  rate: t.Number(),
  btOnly: t.Boolean(),
  traderProfit: t.Union([t.Number(), t.Null()]),
});

const BtRequisiteDTO = t.Object({
  id: t.String(),
  methodType: t.String(),
  bankType: t.String(),
  cardNumber: t.String(),
  recipientName: t.String(),
  phoneNumber: t.Optional(t.String()),
  minAmount: t.Number(),
  maxAmount: t.Number(),
  intervalMinutes: t.Number(),
  isActive: t.Boolean(),
  btOnly: t.Boolean(),
  turnoverDay: t.Number(),
  turnoverTotal: t.Number(),
  createdAt: t.String(),
  updatedAt: t.String(),
  sumLimit: t.Number(),
  operationLimit: t.Number(),
  currentTotalAmount: t.Number(),
  activeDeals: t.Number(),
  transactionsInProgress: t.Number(),
  transactionsReady: t.Number(),
});

/* ---------- helpers ---------- */
const formatBtDeal = (transaction: any) => {
  return {
    id: transaction.id,
    numericId: transaction.numericId,
    amount: transaction.amount,
    merchantId: transaction.merchantId,
    merchantName: transaction.merchant?.name || "Unknown",
    methodType: transaction.requisites?.methodType || "UNKNOWN",
    bankType: transaction.requisites?.bankType || "UNKNOWN",
    cardNumber: transaction.requisites?.cardNumber || "****",
    recipientName: transaction.requisites?.recipientName || "Unknown",
    status: transaction.status,
    type: transaction.type,
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
    acceptedAt: transaction.acceptedAt?.toISOString(),
    completedAt: transaction.completedAt?.toISOString(),
    expiredAt: transaction.expired_at?.toISOString(),
    requisiteId: transaction.bankDetailId || "",
    commission: transaction.commission || 0,
    rate: transaction.rate || 0,
    btOnly: true, // All deals in this endpoint are BT-only
    traderProfit: transaction.traderProfit,
  };
};

const formatBtRequisite = (
  requisite: any,
  turnoverDay = 0,
  turnoverTotal = 0,
  additionalData?: any
) => {
  return {
    id: requisite.id,
    methodType: requisite.methodType,
    bankType: requisite.bankType,
    cardNumber: requisite.cardNumber,
    recipientName: requisite.recipientName,
    phoneNumber: requisite.phoneNumber || "",
    minAmount: requisite.minAmount,
    maxAmount: requisite.maxAmount,
    intervalMinutes: requisite.intervalMinutes,
    isActive: !requisite.isArchived,
    btOnly: true, // All requisites in this endpoint are BT-only
    turnoverDay,
    turnoverTotal,
    createdAt: requisite.createdAt.toISOString(),
    updatedAt: requisite.updatedAt.toISOString(),
    sumLimit: requisite.sumLimit || 0,
    operationLimit: requisite.operationLimit || 0,
    currentTotalAmount: additionalData?.currentTotalAmount || 0,
    activeDeals: additionalData?.activeDeals || 0,
    transactionsInProgress: additionalData?.transactionsInProgress || 0,
    transactionsReady: additionalData?.transactionsReady || 0,
  };
};

/* ---------- routes ---------- */
export const btEntranceRoutes = new Elysia({ prefix: "/bt-entrance" })
  // Stats for BT deals
  .get(
    "/stats",
    async ({ trader, query }) => {
      // Determine period
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

      // Base where for trader, BT-eligible methods and READY status
      const where: any = {
        traderId: trader.id,
        method: {
          type: {
            in: [MethodType.c2c, MethodType.sbp],
          },
        },
        status: Status.READY,
        acceptedAt: { gte: start, ...(end ? { lt: end } : {}) },
      };

      // Fetch transactions and reduce stats only for BT deals (no device requisites or missing requisites)
      const txs = await db.transaction.findMany({
        where,
        select: {
          amount: true,
          rate: true,
          frozenUsdtAmount: true,
          traderProfit: true,
          requisites: { select: { deviceId: true } },
        },
      });

      const btTxs = txs.filter((tx) => !tx.requisites || tx.requisites.deviceId === null);

      const stats = btTxs.reduce(
        (acc, tx) => {
          const calculatedFromRate = tx.rate && tx.rate > 0 ? truncate2(tx.amount / tx.rate) : 0;
          const usdtAmount = (tx.frozenUsdtAmount ?? calculatedFromRate) ?? 0;
          acc.count += 1;
          acc.totalAmount += usdtAmount ?? 0;
          acc.totalProfit += tx.traderProfit ?? 0;
          acc.totalAmountRub += tx.amount ?? 0;
          return acc;
        },
        { count: 0, totalAmount: 0, totalProfit: 0, totalAmountRub: 0 }
      );

      return { stats };
    },
    {
      tags: ["trader"],
      detail: { summary: "Статистика по BT-входу" },
      query: t.Object({
        period: t.Optional(t.String()),
      }),
      response: {
        200: t.Object({
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
  // Get BT deals (main list)
  .get(
    "/deals",
    async ({ trader, query }) => {
      const page = query.page || 1;
      const limit = query.limit || 50;
      const offset = (page - 1) * limit;

      // Get trader transactions for BT deals (bank methods)
      const where: any = {
        traderId: trader.id,
        method: {
          type: {
            in: [MethodType.c2c, MethodType.sbp],
          },
        },
      };

      // Add status filter if provided
      if (query.status && query.status !== "all") {
        where.status = query.status;
      }

      // Add search filter if provided
      if (query.search) {
        where.OR = [
          { numericId: { contains: query.search } },
          { amount: { contains: query.search } },
          {
            merchant: { name: { contains: query.search, mode: "insensitive" } },
          },
        ];
      }

      // First fetch all transactions for this trader with bank methods
      const allDeals = await db.transaction.findMany({
        where,
        include: {
          merchant: true,
          requisites: true,
          method: true,
        },
        orderBy: { createdAt: "desc" },
      });

      // Filter to include deals with requisites without devices
      // and deals with deleted requisites
      const btDeals = allDeals.filter(
        (deal) => !deal.requisites || deal.requisites.deviceId === null
      );

      // Apply pagination to filtered results
      const paginatedDeals = btDeals.slice(offset, offset + limit);
      const total = btDeals.length;

      return {
        data: paginatedDeals.map(formatBtDeal),
        total,
        page,
        limit,
      };
    },
    {
      tags: ["trader"],
      detail: { summary: "Получить список BT сделок" },
      query: t.Object({
        status: t.Optional(t.String()),
        search: t.Optional(t.String()),
        page: t.Optional(t.Number()),
        limit: t.Optional(t.Number()),
      }),
      response: {
        200: t.Object({
          data: t.Array(BtDealDTO),
          total: t.Number(),
          page: t.Number(),
          limit: t.Number(),
        }),
        401: ErrorSchema,
        403: ErrorSchema,
      },
    }
  )

  // Update BT deal status
  .patch(
    "/deals/:id/status",
    async ({ trader, params, body, error }) => {
      const deal = await db.transaction.findFirst({
        where: {
          id: params.id,
          traderId: trader.id,
          // Проверяем что транзакция связана с реквизитом
          bankDetailId: { not: null },
        },
        include: {
          requisites: true,
          method: true,
          merchant: true,
        },
      });

      if (!deal) {
        return error(404, { error: "BT сделка не найдена" });
      }

      // Ensure it's actually a BT deal (requisite without device)
      if (deal.requisites?.deviceId !== null) {
        return error(404, { error: "Это не BT сделка" });
      }

      // Если статус меняется на READY, нужно выполнить финансовые операции (но НЕ для споров - они обрабатываются отдельно)
      if (
        body.status === "READY" &&
        deal.status !== "READY" &&
        deal.status !== "DISPUTE"
      ) {
        const wasExpired = deal.status === "EXPIRED";
        console.log("[BT-Entrance] Processing status change to READY:", {
          transactionId: deal.id,
          wasExpired,
          currentStatus: deal.status,
          frozenUsdtAmount: deal.frozenUsdtAmount,
        });

        const updatedDeal = await db.$transaction(async (prisma) => {
          // Получаем настройки комиссии трейдера
          const traderMerchant = await prisma.traderMerchant.findUnique({
            where: {
              traderId_merchantId_methodId: {
                traderId: deal.traderId,
                merchantId: deal.merchantId,
                methodId: deal.method.id,
              },
            },
          });

          // Базовая USDT: прибыль от truncate2(amount/rate), списания по roundUp2(amount/rate)
          const baseUsdtTruncated = deal.rate ? truncate2(deal.amount / deal.rate) : 0;
          const baseUsdtRoundedUp = deal.rate ? roundUp2(deal.amount / deal.rate) : 0;
          const commissionPercent = await getFlexibleFeePercent(
            deal.traderId,
            deal.merchantId,
            deal.method.id,
            deal.amount,
            "IN"
          );
          const traderProfit = truncate2(baseUsdtTruncated * (commissionPercent / 100));

          // Обновляем транзакцию
          const updated = await prisma.transaction.update({
            where: { id: params.id },
            data: {
              status: body.status,
              acceptedAt: new Date(),
              traderProfit: traderProfit,
            },
          });

          // Обновляем балансы трейдера
          if (wasExpired) {
            // Для истекших транзакций средства уже были разморожены и возвращены на trustBalance
            // Теперь нужно списать их оттуда при подтверждении
            const amountToDeduct = deal.frozenUsdtAmount || baseUsdtRoundedUp;

            console.log(
              "[BT-Entrance] Processing EXPIRED transaction approval:",
              {
                amountToDeduct,
                frozenUsdtAmount: deal.frozenUsdtAmount,
              }
            );

            const trader = await prisma.user.findUnique({
              where: { id: deal.traderId },
              select: { trustBalance: true, deposit: true },
            });

            if (trader && amountToDeduct > 0) {
              let remaining = amountToDeduct;
              const trustDeduct = Math.min(trader.trustBalance || 0, remaining);
              remaining -= trustDeduct;

              const updateFields: any = {
                // Всегда добавляем прибыль
                profitFromDeals: { increment: truncate2(traderProfit) },
              };

              if (trustDeduct > 0) {
                updateFields.trustBalance = {
                  decrement: truncate2(trustDeduct),
                };
              }

              // Если trustBalance недостаточно, списываем остаток с deposit
              if (remaining > 0) {
                updateFields.deposit = { decrement: truncate2(remaining) };
              }

              console.log("[BT-Entrance] EXPIRED transaction balance update:", {
                trustBalance: trader.trustBalance,
                trustDeduct,
                depositDeduct: remaining,
                updateFields,
              });

              await prisma.user.update({
                where: { id: deal.traderId },
                data: updateFields,
              });
            }

            // ВАЖНО: Для истекших транзакций НЕ трогаем frozenUsdt
          } else {
            // Обычная транзакция (не истекшая)
            console.log(
              "[BT-Entrance] Processing NON-EXPIRED transaction approval"
            );

            await prisma.user.update({
              where: { id: deal.traderId },
              data: {
                // Уменьшаем замороженный баланс
                frozenUsdt: {
                  decrement: deal.frozenUsdtAmount || 0,
                },
                // НЕ уменьшаем trustBalance - он уже был уменьшен при заморозке!
                // Увеличиваем прибыль от сделок
                profitFromDeals: {
                  increment: traderProfit,
                },
                // НЕ увеличиваем депозит - он остается неизменным
              },
            });
          }

          return updated;
        });

        // Отправляем колбэк после успешного обновления
        await notifyByStatus({
          id: deal.orderId, // Use orderId instead of internal transaction ID
          transactionId: deal.id, // Pass internal ID for history tracking
          merchantId: deal.merchantId,
          status: "READY",
          successUri: deal.successUri,
          failUri: deal.failUri,
          callbackUri: deal.callbackUri,
          amount: deal.amount,
        });

        return formatBtDeal(
          await db.transaction.findUnique({
            where: { id: params.id },
            include: { merchant: true, requisites: true },
          })
        );
      }

      // Для других статусов просто обновляем
      const updatedDeal = await db.transaction.update({
        where: { id: params.id },
        data: {
          status: body.status,
          ...(body.status === "READY" ? { completedAt: new Date() } : {}),
        },
        include: {
          merchant: true,
          requisites: true,
        },
      });

      // Отправляем колбэк для любого статуса
      await notifyByStatus({
        id: updatedDeal.orderId, // Use orderId instead of internal transaction ID
        transactionId: updatedDeal.id, // Pass internal ID for history tracking
        merchantId: updatedDeal.merchantId,
        status: updatedDeal.status,
        successUri: updatedDeal.successUri,
        failUri: updatedDeal.failUri,
        callbackUri: updatedDeal.callbackUri,
        amount: updatedDeal.amount,
      });

      return formatBtDeal(updatedDeal);
    },
    {
      tags: ["trader"],
      detail: { summary: "Обновить статус BT сделки" },
      params: t.Object({ id: t.String() }),
      body: t.Object({
        status: t.String(),
      }),
      response: {
        200: BtDealDTO,
        400: ErrorSchema,
        401: ErrorSchema,
        403: ErrorSchema,
        404: ErrorSchema,
      },
    }
  )

  // Get BT requisites (additional tab)
  .get(
    "/requisites",
    async ({ trader, query }) => {
      const todayStart = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());

      // Get bank details that don't have devices (BT-only logic)
      const requisites = await db.bankDetail.findMany({
        where: {
          userId: trader.id,
          deviceId: null, // BT requisites don't have devices
          ...(query.status && query.status !== "all"
            ? {
                isArchived: query.status === "INACTIVE",
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
      });

      const result = await Promise.all(
        requisites.map(async (requisite) => {
          // Calculate daily turnover
          const {
            _sum: { amount: daySum },
          } = await db.transaction.aggregate({
            where: {
              bankDetailId: requisite.id,
              createdAt: { gte: todayStart, lte: todayEnd },
              status: "READY",
            },
            _sum: { amount: true },
          });

          // Calculate total turnover
          const {
            _sum: { amount: totalSum },
          } = await db.transaction.aggregate({
            where: {
              bankDetailId: requisite.id,
              status: "READY",
            },
            _sum: { amount: true },
          });

          // Calculate current total amount for sumLimit
          const currentTotalResult = await db.transaction.aggregate({
            where: {
              bankDetailId: requisite.id,
              status: { in: ["CREATED", "IN_PROGRESS", "READY"] },
            },
            _sum: { amount: true },
          });

          // Count transactions by status
          const transactionsInProgress = await db.transaction.count({
            where: {
              bankDetailId: requisite.id,
              status: "IN_PROGRESS",
            },
          });

          const transactionsReady = await db.transaction.count({
            where: {
              bankDetailId: requisite.id,
              status: "READY",
            },
          });

          const activeDeals = await db.transaction.count({
            where: {
              bankDetailId: requisite.id,
              status: { in: ["CREATED", "IN_PROGRESS"] },
            },
          });

          return formatBtRequisite(requisite, daySum ?? 0, totalSum ?? 0, {
            currentTotalAmount: currentTotalResult._sum.amount || 0,
            activeDeals,
            transactionsInProgress,
            transactionsReady,
          });
        })
      );

      return {
        data: result,
        total: result.length,
      };
    },
    {
      tags: ["trader"],
      detail: { summary: "Получить список BT реквизитов" },
      query: t.Object({
        status: t.Optional(t.String()),
        search: t.Optional(t.String()),
        page: t.Optional(t.Number()),
        limit: t.Optional(t.Number()),
      }),
      response: {
        200: t.Object({
          data: t.Array(BtRequisiteDTO),
          total: t.Number(),
        }),
        401: ErrorSchema,
        403: ErrorSchema,
      },
    }
  )

  // Create BT requisite
  .post(
    "/requisites",
    async ({ trader, body, error }) => {
      // Validate trader limits
      if (body.minAmount < trader.minAmountPerRequisite) {
        return error(400, {
          error: `Минимальная сумма должна быть не менее ${trader.minAmountPerRequisite}`,
        });
      }

      if (body.maxAmount > trader.maxAmountPerRequisite) {
        return error(400, {
          error: `Максимальная сумма не должна превышать ${trader.maxAmountPerRequisite}`,
        });
      }

      if (body.minAmount > body.maxAmount) {
        return error(400, {
          error: "Минимальная сумма не может быть больше максимальной",
        });
      }

      // Use bankType as is since frontend should send correct values
      const bankType = body.bankType;

      const requisite = await db.bankDetail.create({
        data: {
          cardNumber: body.cardNumber,
          bankType: bankType as BankType,
          methodType: body.methodType as MethodType,
          recipientName: body.recipientName,
          phoneNumber: body.phoneNumber,
          minAmount: body.minAmount,
          maxAmount: body.maxAmount,
          intervalMinutes: body.intervalMinutes,
          userId: trader.id,
          deviceId: null, // BT requisites don't have devices
          sumLimit: body.sumLimit ?? 0,
          operationLimit: body.operationLimit ?? 0,
        },
      });

      return formatBtRequisite(requisite, 0, 0, {
        currentTotalAmount: 0,
        activeDeals: 0,
        transactionsInProgress: 0,
        transactionsReady: 0,
      });
    },
    {
      tags: ["trader"],
      detail: { summary: "Создать BT реквизит" },
      body: t.Object({
        cardNumber: t.String(),
        bankType: t.Enum(BankType),
        methodType: t.Enum(MethodType),
        recipientName: t.String(),
        phoneNumber: t.Optional(t.String()),
        minAmount: t.Number(),
        maxAmount: t.Number(),
        intervalMinutes: t.Number(),
        sumLimit: t.Optional(t.Number()),
        operationLimit: t.Optional(t.Number()),
      }),
      response: {
        200: BtRequisiteDTO,
        400: ErrorSchema,
        401: ErrorSchema,
        403: ErrorSchema,
      },
    }
  )

  // Update BT requisite
  .put(
    "/requisites/:id",
    async ({ trader, params, body, error }) => {
      const exists = await db.bankDetail.findFirst({
        where: {
          id: params.id,
          userId: trader.id,
          deviceId: null, // Ensure it's a BT requisite
        },
      });

      if (!exists) {
        return error(404, { error: "BT реквизит не найден" });
      }

      // Запрещаем изменение номера телефона у существующих реквизитов
      if (body.phoneNumber !== undefined && body.phoneNumber !== exists.phoneNumber) {
        return error(400, { 
          error: "Номер телефона нельзя изменить после создания реквизита" 
        });
      }

      // Map TINK to TBANK for consistency if bankType is being updated
      const updateData = {
        ...body,
        sumLimit: body.sumLimit ?? 0,
        operationLimit: body.operationLimit ?? 0,
      };

      // Удаляем phoneNumber из данных обновления, чтобы гарантировать его неизменность
      delete updateData.phoneNumber;

      if (updateData.bankType === "TINK") {
        updateData.bankType = "TBANK";
      }

      const requisite = await db.bankDetail.update({
        where: { id: params.id },
        data: updateData,
      });

      return formatBtRequisite(requisite, 0, 0, {
        currentTotalAmount: 0,
        activeDeals: 0,
        transactionsInProgress: 0,
        transactionsReady: 0,
      });
    },
    {
      tags: ["trader"],
      detail: { summary: "Обновить BT реквизит" },
      params: t.Object({ id: t.String() }),
      body: t.Partial(
        t.Object({
          cardNumber: t.String(),
          bankType: t.Enum(BankType),
          methodType: t.Enum(MethodType),
          recipientName: t.String(),
          phoneNumber: t.Optional(t.String()),
          minAmount: t.Number(),
          maxAmount: t.Number(),
          intervalMinutes: t.Number(),
          sumLimit: t.Number(),
          operationLimit: t.Number(),
          isArchived: t.Boolean(),
        })
      ),
      response: {
        200: BtRequisiteDTO,
        400: ErrorSchema,
        401: ErrorSchema,
        403: ErrorSchema,
        404: ErrorSchema,
      },
    }
  )

  // Delete BT requisite
  .delete(
    "/requisites/:id",
    async ({ trader, params, error }) => {
      const exists = await db.bankDetail.findFirst({
        where: {
          id: params.id,
          userId: trader.id,
          deviceId: null, // Ensure it's a BT requisite
        },
      });

      if (!exists) {
        return error(404, { error: "BT реквизит не найден" });
      }

      await db.bankDetail.update({
        where: { id: params.id },
        data: { isArchived: true },
      });

      return { ok: true, message: "BT реквизит архивирован" };
    },
    {
      tags: ["trader"],
      detail: { summary: "Архивировать BT реквизит" },
      params: t.Object({ id: t.String() }),
      response: {
        200: t.Object({ ok: t.Boolean(), message: t.String() }),
        401: ErrorSchema,
        403: ErrorSchema,
        404: ErrorSchema,
      },
    }
  );
