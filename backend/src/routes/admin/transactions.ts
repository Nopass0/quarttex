/**
 * admin/transactions.ts
 * ---------------------------------------------------------------------------
 * Полный набор административных маршрутов для управления транзакциями.
 *
 * ▸ Elysia + Prisma + TypeBox (t)
 * ▸ Все даты сериализуются в ISO-формат, поэтому схемы t.String() валидны.
 * ▸ В ответах не возвращаем `rate: null` (заменяем на undefined).
 * ▸ Добавлено частичное редактирование (PATCH /:id).
 * ▸ Каждый маршрут снабжён полной документацией — headers, params/query/body,
 *   описания, схемы ответов и ошибок.
 * ---------------------------------------------------------------------------
 */

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
import { notifyByStatus, sendTransactionCallbacks } from "@/utils/notify";
import axios from "axios";
import { roundDown2, truncate2 } from "@/utils/rounding";
import { getFlexibleFeePercent } from "@/utils/flexible-fee-calculator";
import { rapiraService } from "@/services/rapira.service";
import {
  calculateTransactionFreezing,
  freezeTraderBalance,
} from "@/utils/transaction-freezing";
import {
  calculateFreezingParams,
  calculateTraderProfit,
} from "@/utils/freezing";

/* ───────────────────── helpers ───────────────────── */

/** Унифицированная сериализация транзакции и связанных сущностей */
const serializeTransaction = (trx: any) => ({
  ...trx,
  expired_at: trx.expired_at.toISOString(),
  createdAt: trx.createdAt.toISOString(),
  updatedAt: trx.updatedAt.toISOString(),
  merchant: {
    ...trx.merchant,
    createdAt: trx.merchant.createdAt.toISOString(),
  },
  trader: trx.trader
    ? { ...trx.trader, createdAt: trx.trader.createdAt.toISOString() }
    : null,
  requisites: trx.requisites ?? null,
  ...(trx.rate === null ? { rate: undefined } : {}),
});

/** Обновление + include + сериализация (чтобы не дублировать код) */
const updateTrx = async (id: string, data: Prisma.TransactionUpdateInput) =>
  serializeTransaction(
    await db.transaction.update({
      where: { id },
      data,
      include: {
        merchant: true,
        method: true,
        trader: true,
        requisites: {
          select: {
            id: true,
            bankType: true,
            cardNumber: true,
            phoneNumber: true,
            recipientName: true,
          },
        },
      },
    })
  );

/* ───────────────────── reusable schemas ───────────────────── */

const TransactionResponseSchema = t.Object({
  id: t.String(),
  merchantId: t.String(),
  amount: t.Number(),
  assetOrBank: t.String(),
  orderId: t.String(),
  methodId: t.String(),
  currency: t.Optional(t.String()),
  userId: t.String(),
  userIp: t.Optional(t.String()),
  callbackUri: t.String(),
  successUri: t.String(),
  failUri: t.String(),
  type: t.Enum(TransactionType),
  expired_at: t.String(),
  commission: t.Number(),
  clientName: t.String(),
  status: t.Enum(Status),
  rate: t.Optional(t.Number()),
  isMock: t.Boolean(),
  createdAt: t.String(),
  updatedAt: t.String(),
  merchant: t.Object({
    id: t.String(),
    name: t.String(),
    token: t.String(),
    createdAt: t.String(),
  }),
  method: t.Object({
    id: t.String(),
    code: t.String(),
    name: t.String(),
    type: t.Enum(MethodType),
    currency: t.Enum(Currency),
  }),
  trader: t.Object({
    id: t.String(),
    email: t.String(),
    banned: t.Boolean(),
    createdAt: t.String(),
  }),
  requisites: t.Optional(
    t.Union([
      t.Object({
        id: t.String(),
        bankType: t.Enum(BankType),
        cardNumber: t.String(),
        phoneNumber: t.Optional(t.String()),
        recipientName: t.String(),
      }),
      t.Null(),
    ])
  ),
});

const TransactionWithHookSchema = t.Object({
  transaction: TransactionResponseSchema,
  hook: t.Optional(t.Unknown()),
});

const AuthHeaderSchema = t.Object({ "x-admin-key": t.String() });

/* ───────────────────── router ───────────────────── */

export default (app: Elysia) =>
  app
    /* ─────────── GET /admin/transactions/attempts ─────────── */
    .get(
      "/attempts",
      async ({ query }) => {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const skip = (page - 1) * limit;

        const where: Prisma.TransactionAttemptWhereInput = {};
        if (query.merchantId) where.merchantId = query.merchantId;
        if (query.methodId) where.methodId = query.methodId;
        if (query.amount) {
          const amt = Number(query.amount);
          if (!Number.isNaN(amt)) where.amount = amt;
        }
        if (query.methodType) {
          where.method = { type: query.methodType as MethodType };
        }

        if (query.id) {
          const num = Number(query.id);
          if (!Number.isNaN(num)) where.transaction = { numericId: num };
          else where.id = { contains: query.id, mode: "insensitive" };
        }

        if (query.createdFrom)
          where.createdAt = {
            ...where.createdAt,
            gte: new Date(query.createdFrom),
          };
        if (query.createdTo)
          where.createdAt = {
            ...where.createdAt,
            lte: new Date(query.createdTo),
          };
        if (query.search) {
          const s = query.search;
          where.OR = [
            { merchant: { name: { contains: s, mode: "insensitive" } } },
            { method: { name: { contains: s, mode: "insensitive" } } },
          ];
        }

        const [attempts, total] = await db.$transaction([
          db.transactionAttempt.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
            include: {
              merchant: { select: { id: true, name: true } },
              method: { select: { id: true, name: true, type: true } },
            },
          }),
          db.transactionAttempt.count({ where }),
        ]);

        const transactionMap = attempts.length
          ? await db.transaction
              .findMany({
                where: {
                  id: {
                    in: attempts
                      .filter((a) => a.transactionId)
                      .map((a) => a.transactionId!),
                  },
                },
                select: { id: true, numericId: true },
              })
              .then((trxs) =>
                trxs.reduce((acc, t) => ({ ...acc, [t.id]: t.numericId }), {})
              )
          : {};

        return {
          data: attempts.map((a) => ({
            id: a.id,
            transactionId: a.transactionId,

            transactionNumericId: a.transactionId
              ? transactionMap[a.transactionId] ?? null
              : null,

            merchantId: a.merchantId,
            merchantName: a.merchant?.name ?? null,
            methodId: a.methodId,
            methodName: a.method?.name ?? null,
            amount: a.amount,
            success: a.success,
            status: a.status,
            errorCode: a.errorCode,
            message: a.message,
            createdAt: a.createdAt.toISOString(),
          })),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        };
      },
      {
        tags: ["admin"],
        detail: { summary: "Список запросов на создание сделок" },

        headers: AuthHeaderSchema,

        query: t.Object({
          page: t.Optional(t.String()),
          limit: t.Optional(t.String()),
          merchantId: t.Optional(t.String()),
          methodId: t.Optional(t.String()),
          methodType: t.Optional(t.String()),
          amount: t.Optional(t.String()),
          createdFrom: t.Optional(t.String()),
          createdTo: t.Optional(t.String()),

          id: t.Optional(t.String()),
          numericId: t.Optional(t.String()),

          search: t.Optional(t.String()),
        }),
        response: {
          200: t.Object({
            data: t.Array(
              t.Object({
                id: t.String(),
                transactionId: t.Union([t.String(), t.Null()]),
                transactionNumericId: t.Union([t.Number(), t.Null()]),
                merchantId: t.String(),
                merchantName: t.Union([t.String(), t.Null()]),
                methodId: t.String(),
                methodName: t.Union([t.String(), t.Null()]),
                amount: t.Number(),
                success: t.Boolean(),
                status: t.Union([t.String(), t.Null()]),
                errorCode: t.Union([t.String(), t.Null()]),
                message: t.Union([t.String(), t.Null()]),
                createdAt: t.String(),
              })
            ),
            pagination: t.Object({
              page: t.Number(),
              limit: t.Number(),
              total: t.Number(),
              totalPages: t.Number(),
            }),
          }),
        },
      }
    )
    /* ─────────── POST /admin/transactions/create ─────────── */
    .post(
      "/create",
      async ({ body, error }) => {
        try {
          /* Проверка FK */
          const [merchant, method, user] = await Promise.all([
            db.merchant.findUnique({ where: { id: body.merchantId } }),
            db.method.findUnique({ where: { id: body.methodId } }),
            db.user.findUnique({ where: { id: body.userId } }),
          ]);
          if (!merchant) return error(404, { error: "Мерчант не найден" });
          if (!method) return error(404, { error: "Метод не найден" });
          if (!user) return error(404, { error: "Пользователь не найден" });

          // Get current rate based on trader-merchant rateSource (default bybit)
          const rateSettingRecord = await db.rateSetting.findFirst({
            where: { id: 1 },
          });
          const kkk = rateSettingRecord?.rapiraKkk || 0;
          const traderMerchant =
            body.userId && body.methodId && body.merchantId
              ? await db.traderMerchant.findUnique({
                  where: {
                    traderId_merchantId_methodId: {
                      traderId: body.userId,
                      merchantId: body.merchantId,
                      methodId: body.methodId,
                    },
                  },
                })
              : null;

          let baseRate = 0;
          let rateWithKkk = 0;
          if ((traderMerchant as any)?.rateSource === "rapira") {
            baseRate = await rapiraService.getUsdtRubRate();
            rateWithKkk = await rapiraService.getRateWithKkk(kkk);
          } else {
            const { bybitService } = await import("@/services/bybit.service");
            baseRate = await bybitService.getUsdtRubRate();
            rateWithKkk = await bybitService.getRateWithKkk(kkk);
          }

          // Determine merchant rate
          const merchantRate = merchant.countInRubEquivalent
            ? baseRate
            : body.rate || baseRate;

          // Создаем транзакцию с заморозкой баланса если указан трейдер
          const trx = await db.$transaction(async (prisma) => {
            let freezingParams = null;

            // Если указан трейдер и это IN транзакция, рассчитываем и замораживаем
            if (body.userId && body.type === "IN") {
              // Проверяем, что userId это трейдер
              const trader = await prisma.user.findUnique({
                where: { id: body.userId },
              });
              if (trader) {
                freezingParams = await calculateTransactionFreezing(
                  body.amount,
                  rateWithKkk,
                  body.userId,
                  body.merchantId,
                  body.methodId
                );

                // Замораживаем баланс
                await freezeTraderBalance(prisma, body.userId, freezingParams);
              }
            }

            // Создаем транзакцию
            return await prisma.transaction.create({
              data: {
                ...body,
                rate: rateWithKkk,
                merchantRate: merchantRate,
                adjustedRate: rateWithKkk,
                expired_at:
                  body.expired_at ?? new Date(Date.now() + 24 * 60 * 60 * 1000),
                isMock: true,
                ...(freezingParams
                  ? {
                      frozenUsdtAmount: freezingParams.frozenUsdtAmount,
                      calculatedCommission: freezingParams.calculatedCommission,
                      kkkPercent: freezingParams.kkkPercent,
                      feeInPercent: freezingParams.feeInPercent,
                    }
                  : {}),
              },
              include: { merchant: true, method: true, trader: true },
            });
          });

          return new Response(JSON.stringify(serializeTransaction(trx)), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2002"
          )
            return error(409, { error: "orderId уже используется" });
          throw e;
        }
      },
      {
        tags: ["admin"],
        detail: { summary: "Создание новой транзакции (моковая)" },
        headers: AuthHeaderSchema,
        body: t.Object({
          merchantId: t.String({ description: "ID мерчанта" }),
          amount: t.Number({ description: "Сумма" }),
          assetOrBank: t.String({ description: "Актив/банк" }),
          orderId: t.String({ description: "Уникальный orderId" }),
          methodId: t.String({ description: "ID метода" }),
          currency: t.Optional(t.String()),
          userId: t.String({ description: "ID пользователя" }),
          userIp: t.Optional(t.String()),
          callbackUri: t.String(),
          successUri: t.String(),
          failUri: t.String(),
          type: t.Optional(t.Enum(TransactionType)),
          expired_at: t.Optional(t.String()),
          commission: t.Number(),
          clientName: t.String(),
          status: t.Optional(t.Enum(Status)),
          rate: t.Optional(t.Number()),
        }),
        response: {
          201: TransactionResponseSchema,
          404: ErrorSchema,
          409: ErrorSchema,
        },
      }
    )

    /* ──────────── GET /admin/transactions/list ──────────── */
    .get(
      "/list",
      async ({ query }) => {
        const where: Prisma.TransactionWhereInput = {};

        /* ------- фильтры из query-строки ------- */
        if (query.status) where.status = query.status as Status;
        if (query.type) where.type = query.type as TransactionType;
        if (query.merchantId) where.merchantId = query.merchantId;
        if (query.methodId) where.methodId = query.methodId;

        if (query.userId) where.userId = query.userId;
        if (query.methodType)
          where.method = { type: query.methodType as MethodType };

        // Поиск по numericId, orderId или ID транзакции
        const searchConditions = [];

        if (query.numericId) {
          const num = Number(query.numericId);
          if (!Number.isNaN(num)) {
            searchConditions.push({ numericId: num });
          }
        }

        if (query.id) {
          // Поиск по ID транзакции (UUID) - не пытаемся парсить как число
          searchConditions.push({
            id: { contains: query.id, mode: "insensitive" as const },
          });
        }

        if (query.search) {
          const s = query.search;
          searchConditions.push(
            { id: { contains: s, mode: "insensitive" as const } },
            { orderId: { contains: s, mode: "insensitive" as const } },
            { assetOrBank: { contains: s, mode: "insensitive" as const } },
            { clientName: { contains: s, mode: "insensitive" as const } },
            { currency: { contains: s, mode: "insensitive" as const } },
            { userIp: { contains: s, mode: "insensitive" as const } }
          );
        }

        // Если есть условия поиска, объединяем их через OR
        if (searchConditions.length > 0) {
          where.OR = searchConditions;
        }

        if (query.isMock !== undefined) where.isMock = query.isMock === "true";
        if (query.amount) {
          const amount = Number(query.amount);
          if (!Number.isNaN(amount)) where.amount = amount;
        }

        if (query.createdFrom)
          where.createdAt = {
            ...where.createdAt,
            gte: new Date(query.createdFrom),
          };
        if (query.createdTo)
          where.createdAt = {
            ...where.createdAt,
            lte: new Date(query.createdTo),
          };

        const orderBy: Record<string, "asc" | "desc"> = {};
        if (query.sortBy)
          orderBy[query.sortBy] = query.sortOrder === "desc" ? "desc" : "asc";
        else orderBy.updatedAt = "desc";

        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const skip = (page - 1) * limit;

        const [rows, total] = await Promise.all([
          db.transaction.findMany({
            where,
            orderBy,
            skip,
            take: limit,
            include: {
              merchant: true,
              method: true,

              trader: {
                select: { id: true, name: true, email: true, numericId: true },
              },

              requisites: {
                select: {
                  id: true,
                  bankType: true,
                  cardNumber: true,
                  phoneNumber: true,
                  recipientName: true,
                  deviceId: true,
                  device: { select: { id: true, name: true } },
                  minAmount: true,
                  maxAmount: true,
                  totalAmountLimit: true,
                  currentTotalAmount: true,
                  intervalMinutes: true,
                  operationLimit: true,
                  sumLimit: true,
                },
              },
            },
          }),
          db.transaction.count({ where }),
        ]);

        /* сериализация дат → ISO */
        const data = rows.map((t) => ({
          ...t,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
        }));

        return {
          data,
          meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
      },
      {
        tags: ["admin"],
        detail: {
          summary: "Список транзакций (фильтры, сортировка, пагинация)",
        },
        headers: AuthHeaderSchema,
        query: t.Object({
          page: t.Optional(t.String()),
          limit: t.Optional(t.String()),
          status: t.Optional(t.String()),
          type: t.Optional(t.String()),
          merchantId: t.Optional(t.String()),
          methodId: t.Optional(t.String()),

          methodType: t.Optional(t.String()),
          userId: t.Optional(t.String()),
          id: t.Optional(t.String()),
          numericId: t.Optional(t.String()),

          isMock: t.Optional(t.String()),
          amount: t.Optional(t.String()),
          createdFrom: t.Optional(t.String()),
          createdTo: t.Optional(t.String()),
          search: t.Optional(t.String()),
          sortBy: t.Optional(t.String()),
          sortOrder: t.Optional(t.String()),
        }),
      }
    )

    /* ─────────── GET /admin/transactions/:id ─────────── */
    .get(
      "/:id",
      async ({ params, error }) => {
        try {
          const trx = await db.transaction.findUniqueOrThrow({
            where: { id: params.id },
            include: { merchant: true, method: true, trader: true },
          });
          return serializeTransaction(trx);
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
        tags: ["admin"],
        detail: { summary: "Получить транзакцию по ID" },
        headers: AuthHeaderSchema,
        params: t.Object({ id: t.String() }),
        response: { 200: TransactionResponseSchema, 404: ErrorSchema },
      }
    )

    /* ─────────── PATCH /admin/transactions/:id ─────────── */
    .patch(
      "/:id",
      async ({ params, body, error }) => {
        try {
          const trx = await updateTrx(params.id, {
            ...body,
            expired_at: body.expired_at ? new Date(body.expired_at) : undefined,
            isMock: true,
          });

          const hook = await notifyByStatus({
            id: trx.id,
            status: trx.status,
            successUri: trx.successUri,
            failUri: trx.failUri,
            callbackUri: trx.callbackUri,
            amount: trx.amount,
          });

          return { transaction: trx, hook };
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2025"
          )
            return error(404, { error: "Транзакция не найдена" });
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2002"
          )
            return error(409, { error: "orderId уже используется" });
          throw e;
        }
      },
      {
        tags: ["admin"],
        detail: { summary: "Частичное редактирование транзакции" },
        headers: AuthHeaderSchema,
        params: t.Object({ id: t.String() }),
        body: t.Partial(
          t.Object({
            amount: t.Number(),
            assetOrBank: t.String(),
            orderId: t.String(),
            methodId: t.String(),
            merchantId: t.String(),
            currency: t.Optional(t.String()),
            userId: t.String(),
            userIp: t.Optional(t.String()),
            callbackUri: t.String(),
            successUri: t.String(),
            failUri: t.String(),
            type: t.Enum(TransactionType),
            expired_at: t.Optional(t.String()),
            commission: t.Number(),
            clientName: t.String(),
            status: t.Enum(Status),
            rate: t.Optional(t.Number()),
          })
        ),
        response: {
          200: TransactionWithHookSchema,
          404: ErrorSchema,
          409: ErrorSchema,
        },
      }
    )

    /* ─────────── PUT /admin/transactions/update ─────────── */
    .put(
      "/update",
      async ({ body, error }) =>
        updateTrx(body.id, {
          ...body,
          expired_at: body.expired_at ? new Date(body.expired_at) : undefined,
          isMock: true,
        }).catch((e) => {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2025"
          )
            return error(404, { error: "Транзакция не найдена" });
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2002"
          )
            return error(409, { error: "orderId уже используется" });
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2003"
          )
            return error(400, {
              error: "Указанный мерчант, метод или пользователь не существует",
            });
          throw e;
        }),
      {
        tags: ["admin"],
        detail: { summary: "Полное обновление транзакции" },
        headers: AuthHeaderSchema,
        body: t.Object({
          id: t.String(),
          merchantId: t.String(),
          amount: t.Number(),
          assetOrBank: t.String(),
          orderId: t.String(),
          methodId: t.String(),
          currency: t.Optional(t.String()),
          userId: t.String(),
          userIp: t.Optional(t.String()),
          callbackUri: t.String(),
          successUri: t.String(),
          failUri: t.String(),
          type: t.Enum(TransactionType),
          expired_at: t.Optional(t.String()),
          commission: t.Number(),
          clientName: t.String(),
          status: t.Enum(Status),
          rate: t.Optional(t.Number()),
        }),
        response: {
          200: TransactionResponseSchema,
          404: ErrorSchema,
          409: ErrorSchema,
          400: ErrorSchema,
        },
      }
    )

    /* ─────────── PUT /admin/transactions/status ─────────── */
    .put(
      "/status",
      async ({ body, error }) => {
        try {
          const existing = await db.transaction.findUnique({
            where: { id: body.id },
          });
          if (!existing) return error(404, { error: "Транзакция не найдена" });

          // Рассчитываем traderProfit заранее, если нужно
          let traderProfit = 0;
          if (
            existing.status !== Status.READY &&
            body.status === Status.READY &&
            existing.type === TransactionType.IN &&
            existing.traderId
          ) {
            // Получаем настройки комиссии трейдера
            const traderMerchant =
              existing.methodId && existing.merchantId
                ? await db.traderMerchant.findUnique({
                    where: {
                      traderId_merchantId_methodId: {
                        traderId: existing.traderId,
                        merchantId: existing.merchantId,
                        methodId: existing.methodId,
                      },
                    },
                  })
                : null;

            // Рассчитываем прибыль трейдера на основе гибких ставок комиссии
            const spentUsdt = existing.rate
              ? existing.amount / existing.rate
              : 0;
            const commissionPercent = await getFlexibleFeePercent(
              existing.traderId,
              existing.merchantId,
              existing.methodId,
              existing.amount,
              "IN"
            );
            traderProfit = truncate2(spentUsdt * (commissionPercent / 100));
          }

          // Обновляем транзакцию со статусом и прибылью трейдера
          const trx = await updateTrx(body.id, {
            status: body.status,
            ...(body.status === Status.READY &&
            existing.type === TransactionType.IN &&
            existing.traderId
              ? { traderProfit }
              : {}),
          });

          // Обрабатываем средства при отмене транзакции в зависимости от предыдущего статуса
          if (
            existing.status !== Status.CANCELED &&
            body.status === Status.CANCELED &&
            existing.type === TransactionType.IN &&
            existing.traderId
          ) {
            if (existing.status === Status.EXPIRED) {
              // Для истекших транзакций списываем с trustBalance и депозита
              const usdtAmount = existing.rate
                ? existing.amount / existing.rate
                : 0;

              if (usdtAmount > 0) {
                console.log(
                  `[Admin PUT Cancel] Processing EXPIRED->CANCELED: trader=${existing.traderId}, usdtAmount=${usdtAmount}`
                );

                const trader = await db.user.findUnique({
                  where: { id: existing.traderId },
                  select: { trustBalance: true, deposit: true },
                });

                if (trader) {
                  let remaining = usdtAmount;
                  const trustDeduct = Math.min(
                    trader.trustBalance || 0,
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
                    updateFields.deposit = { decrement: truncate2(remaining) };
                  }

                  console.log(`[Admin PUT Cancel] EXPIRED balance deduction:`, {
                    trustBalance: trader.trustBalance,
                    trustDeduct,
                    depositDeduct: remaining,
                    updateFields,
                  });

                  if (Object.keys(updateFields).length > 0) {
                    await db.user.update({
                      where: { id: existing.traderId },
                      data: updateFields,
                    });
                  }
                }
              }
            } else if (existing.status === Status.IN_PROGRESS) {
              // Для транзакций в процессе размораживаем средства из frozenUsdt
              if (existing.frozenUsdtAmount) {
                console.log(
                  `[Admin PUT Cancel] Processing IN_PROGRESS->CANCELED: trader=${existing.traderId}, frozenAmount=${existing.frozenUsdtAmount}`
                );

                await db.user.update({
                  where: { id: existing.traderId },
                  data: {
                    frozenUsdt: {
                      decrement: truncate2(existing.frozenUsdtAmount),
                    },
                    // Добавляем сумму заморозки к trustBalance при отмене сделки "В работе"
                    trustBalance: {
                      increment: truncate2(existing.frozenUsdtAmount),
                    },
                  },
                });
              }
            } else if (existing.status === Status.READY) {
              // Для готовых сделок при отмене списываем с trustBalance и убираем прибыль
              const usdtAmount = existing.rate
                ? existing.amount / existing.rate
                : 0;

              if (usdtAmount > 0) {
                console.log(
                  `[Admin PUT Cancel] Processing READY->CANCELED: trader=${existing.traderId}, usdtAmount=${usdtAmount}`
                );

                const updateFields: any = {
                  // Списываем сумму в USDT с trustBalance
                  trustBalance: { decrement: truncate2(usdtAmount) },
                };

                // Если у сделки была прибыль, убираем её
                if (existing.traderProfit && existing.traderProfit > 0) {
                  updateFields.profitFromDeals = {
                    decrement: truncate2(existing.traderProfit),
                  };
                }

                console.log(`[Admin PUT Cancel] READY balance deduction:`, {
                  usdtAmount,
                  traderProfit: existing.traderProfit,
                  updateFields,
                });

                await db.user.update({
                  where: { id: existing.traderId },
                  data: updateFields,
                });
              }
            }
          }

          if (
            existing.status !== Status.READY &&
            body.status === Status.READY &&
            existing.type === TransactionType.IN
          ) {
            await db.$transaction(async (prisma) => {
              // Начисляем мерчанту
              const method = await prisma.method.findUnique({
                where: { id: existing.methodId },
              });
              if (method && existing.rate) {
                const rateWithFee =
                  existing.rate * (1 + method.commissionPayin / 100);
                const increment = existing.amount / rateWithFee;
                await prisma.merchant.update({
                  where: { id: existing.merchantId },
                  data: { balanceUsdt: { increment } },
                });
              }

              // Обрабатываем заморозку трейдера
              if (existing.traderId) {
                const wasExpired = existing.status === Status.EXPIRED;
                console.log(
                  "[Admin Transaction Update] Processing trader balance:",
                  {
                    transactionId: existing.id,
                    wasExpired,
                    existingStatus: existing.status,
                    newStatus: body.status,
                    frozenUsdtAmount: existing.frozenUsdtAmount,
                    traderProfit,
                  }
                );

                // Для истекшей сделки не размораживаем frozenUsdt (уже разморожен при истечении)
                // Списываем с trustBalance и deposit, а не с balanceUsdt
                if (wasExpired) {
                  // Для истекших транзакций средства уже были разморожены и возвращены на trustBalance
                  // Теперь нужно списать их оттуда при подтверждении
                  const spentUsdt = existing.rate
                    ? existing.amount / existing.rate
                    : 0;
                  const amountToDeduct = existing.frozenUsdtAmount || spentUsdt;

                  console.log(
                    "[Admin Transaction Update] Processing EXPIRED transaction approval:",
                    {
                      amountToDeduct,
                      frozenUsdtAmount: existing.frozenUsdtAmount,
                    }
                  );

                  if (amountToDeduct > 0) {
                    // Получаем текущие балансы трейдера
                    const trader = await prisma.user.findUnique({
                      where: { id: existing.traderId },
                      select: { trustBalance: true, deposit: true },
                    });

                    if (trader) {
                      let remaining = amountToDeduct;
                      // Сначала списываем с trustBalance
                      const trustDeduct = Math.min(
                        trader.trustBalance || 0,
                        remaining
                      );
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
                        updateFields.deposit = {
                          decrement: truncate2(remaining),
                        };
                      }

                      console.log(
                        "[Admin Transaction Update] EXPIRED transaction balance update:",
                        {
                          trustBalance: trader.trustBalance,
                          trustDeduct,
                          depositDeduct: remaining,
                          updateFields,
                        }
                      );

                      await prisma.user.update({
                        where: { id: existing.traderId },
                        data: updateFields,
                      });
                    }
                  }

                  // ВАЖНО: Для истекших транзакций НЕ трогаем frozenUsdt
                } else {
                  // Обычная транзакция (не истекшая)
                  console.log(
                    "[Admin Transaction Update] Processing NON-EXPIRED transaction approval"
                  );

                  await prisma.user.update({
                    where: { id: existing.traderId },
                    data: {
                      // Уменьшаем замороженный баланс
                      frozenUsdt: {
                        decrement: existing.frozenUsdtAmount || 0,
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
              }
            });
          }

          if (
            existing.status !== Status.READY &&
            body.status === Status.READY &&
            existing.type === TransactionType.OUT &&
            existing.traderId
          ) {
            const trader = await db.user.findUnique({
              where: { id: existing.traderId },
            });
            if (trader) {
              const stake = trader.stakePercent ?? 0;
              const commission = trader.profitPercent ?? 0;
              const rubAfter = existing.amount * (1 - commission / 100);
              const rateAdj = existing.rate
                ? existing.rate * (1 - stake / 100)
                : undefined;
              const deduct =
                !rateAdj || existing.currency?.toLowerCase() === "usdt"
                  ? rubAfter
                  : rubAfter / rateAdj;
              await db.user.update({
                where: { id: trader.id },
                data: { trustBalance: { decrement: deduct } },
              });
            }
          }

          const hook = await notifyByStatus({
            id: trx.orderId,
            transactionId: trx.id,
            status: trx.status,
            successUri: trx.successUri,
            failUri: trx.failUri,
            callbackUri: trx.callbackUri,
            amount: trx.amount,
            merchantId: trx.merchantId,
          });
          return { transaction: trx, hook };
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
        tags: ["admin"],
        detail: { summary: "Сменить статус транзакции" },
        headers: AuthHeaderSchema,
        body: t.Object({
          id: t.String(),
          status: t.Enum(Status),
        }),
        response: { 200: TransactionWithHookSchema, 404: ErrorSchema },
      }
    )

    /* ─────────── PUT /admin/transactions/trader ─────────── */
    .put(
      "/trader",
      async ({ body, error }) => {
        // Используем транзакцию БД для атомарности операции
        return await db
          .$transaction(async (prisma) => {
            const updateData: any = { traderId: body.traderId };

            // Получаем текущую транзакцию
            const tx = await prisma.transaction.findUnique({
              where: { id: body.id },
              include: { trader: true },
            });
            if (!tx) throw new Error("Транзакция не найдена");

            // Если убираем трейдера (traderId = null)
            if (body.traderId === null && tx.traderId) {
              // Размораживаем баланс старого трейдера
              if (tx.frozenUsdtAmount && tx.calculatedCommission) {
                // Из замороженного баланса вычитаем только USDT часть, а не прибыль
                await prisma.user.update({
                  where: { id: tx.traderId },
                  data: {
                    frozenUsdt: { decrement: truncate2(tx.frozenUsdtAmount) },
                  },
                });
                console.log(
                  `[Admin] Unfrozen ${truncate2(
                    tx.frozenUsdtAmount
                  )} USDT for trader ${tx.traderId}`
                );
              }

              // Очищаем параметры заморозки
              updateData.frozenUsdtAmount = null;
              updateData.calculatedCommission = null;
              updateData.kkkPercent = null;
              updateData.feeInPercent = null;
            }

            // Если назначаем нового трейдера
            if (body.traderId) {
              const trader = await prisma.user.findUnique({
                where: { id: body.traderId },
              });
              if (!trader) throw new Error("Указанный трейдер не существует");

              // Для IN транзакций проверяем дубликаты и рассчитываем заморозку
              if (tx.type === TransactionType.IN && tx.rate !== null) {
                // Проверяем наличие активной транзакции с той же суммой на том же реквизите
                if (tx.bankDetailId) {
                  const existingTransaction =
                    await prisma.transaction.findFirst({
                      where: {
                        bankDetailId: tx.bankDetailId,
                        amount: tx.amount,
                        status: {
                          in: [Status.CREATED, Status.IN_PROGRESS],
                        },
                        type: TransactionType.IN,
                        id: { not: tx.id }, // Исключаем текущую транзакцию
                      },
                    });

                  if (existingTransaction) {
                    throw new Error(
                      `Невозможно назначить трейдера: на реквизите уже есть активная транзакция на сумму ${tx.amount} рублей`
                    );
                  }
                }
                // Сначала размораживаем баланс старого трейдера, если он был
                if (
                  tx.traderId &&
                  tx.traderId !== body.traderId &&
                  tx.frozenUsdtAmount &&
                  tx.calculatedCommission
                ) {
                  // Из замороженного баланса вычитаем только USDT часть, а не прибыль
                  await prisma.user.update({
                    where: { id: tx.traderId },
                    data: {
                      frozenUsdt: { decrement: truncate2(tx.frozenUsdtAmount) },
                    },
                  });
                  console.log(
                    `[Admin] Unfrozen ${truncate2(
                      tx.frozenUsdtAmount
                    )} USDT for old trader ${tx.traderId}`
                  );
                }

                // Рассчитываем параметры заморозки для нового трейдера
                const freezingParams = await calculateTransactionFreezing(
                  tx.amount,
                  tx.rate,
                  body.traderId,
                  tx.merchantId,
                  tx.methodId
                );

                // Замораживаем баланс нового трейдера
                await freezeTraderBalance(
                  prisma,
                  body.traderId,
                  freezingParams
                );

                // Добавляем параметры заморозки к обновлению
                updateData.frozenUsdtAmount = freezingParams.frozenUsdtAmount;
                updateData.calculatedCommission =
                  freezingParams.calculatedCommission;
                updateData.kkkPercent = freezingParams.kkkPercent;
                updateData.feeInPercent = freezingParams.feeInPercent;
                updateData.adjustedRate = tx.rate; // Deprecated
              }
            }

            // Обновляем транзакцию
            return await prisma.transaction.update({
              where: { id: body.id },
              data: updateData,
              include: {
                merchant: true,
                method: true,
                trader: true,
                requisites: {
                  select: {
                    id: true,
                    bankType: true,
                    cardNumber: true,
                    phoneNumber: true,
                    recipientName: true,
                  },
                },
              },
            });
          })
          .then((trx) => serializeTransaction(trx))
          .catch((e) => {
            if (e?.message === "Транзакция не найдена") {
              return error(404, { error: e.message });
            }
            if (e?.message === "Указанный трейдер не существует") {
              return error(400, { error: e.message });
            }
            if (e?.message?.includes("Недостаточно баланса")) {
              return error(400, { error: e.message });
            }
            if (
              e instanceof Prisma.PrismaClientKnownRequestError &&
              e.code === "P2025"
            )
              return error(404, { error: "Транзакция не найдена" });
            if (
              e instanceof Prisma.PrismaClientKnownRequestError &&
              e.code === "P2003"
            )
              return error(400, { error: "Указанный трейдер не существует" });
            throw e;
          });
      },
      {
        tags: ["admin"],
        detail: { summary: "Назначить трейдера транзакции" },
        headers: AuthHeaderSchema,
        body: t.Object({
          id: t.String(),
          traderId: t.Union([t.String(), t.Null()]),
        }),
        response: {
          200: TransactionResponseSchema,
          404: ErrorSchema,
          400: ErrorSchema,
        },
      }
    )

    /* ─────────── POST /admin/transactions/:id/callback ─────────── */
    .post(
      "/:id/callback",
      async ({ params, body, error }) => {
        try {
          const trx = await db.transaction.findUniqueOrThrow({
            where: { id: params.id },
            include: { merchant: true },
          });

          // Определяем URL и данные в зависимости от типа callback
          let url: string | null = null;
          let callbackData: any = {};

          if (body.type === "success") {
            url = trx.successUri;
            callbackData = {
              transactionId: trx.id,
              orderId: trx.orderId,
              status: "success",
              amount: trx.amount,
              timestamp: new Date().toISOString(),
            };
          } else if (body.type === "fail") {
            url = trx.failUri;
            callbackData = {
              transactionId: trx.id,
              orderId: trx.orderId,
              status: "failed",
              amount: trx.amount,
              timestamp: new Date().toISOString(),
            };
          } else if (body.type === "standard") {
            // Стандартный callback на callbackUri
            url = trx.callbackUri;
            callbackData = {
              id: trx.id,
              amount: trx.amount,
              status: body.status || trx.status,
            };
          }

          if (!url) {
            return error(400, {
              error: `URL для ${body.type} callback не установлен в транзакции`,
            });
          }

          let result;
          let responseText: string | null = null;
          let statusCode: number | null = null;
          let errorMessage: string | null = null;

          try {
            const headers: any = {
              "Content-Type": "application/json",
            };

            // Добавляем токен мерчанта для аутентификации
            if (trx.merchant?.token) {
              headers["X-Merchant-Token"] = trx.merchant.token;
            }

            const res = await axios.post(url, callbackData, { headers });
            statusCode = res.status;
            responseText =
              typeof res.data === "string"
                ? res.data
                : JSON.stringify(res.data);
            result = { status: res.status, data: res.data };
          } catch (e: any) {
            errorMessage = e?.message ?? "request failed";
            statusCode = e?.response?.status || null;
            result = {
              error: errorMessage,
              status: statusCode,
              data: e?.response?.data,
            };
          }

          // Сохраняем историю колбэка в БД
          let callbackHistoryEntry = null;
          try {
            callbackHistoryEntry = await db.callbackHistory.create({
              data: {
                transactionId: trx.id,
                url: url,
                payload: callbackData as any,
                response: responseText,
                statusCode: statusCode,
                error: errorMessage,
              },
            });
          } catch (dbError) {
            console.error(
              `[Admin Callback] Error saving callback history:`,
              dbError
            );
          }

          return {
            callback: body.type,
            url,
            payload: callbackData,
            result,
            callbackHistoryEntry: callbackHistoryEntry
              ? {
                  ...callbackHistoryEntry,
                  createdAt: callbackHistoryEntry.createdAt.toISOString(),
                }
              : null,
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
        tags: ["admin"],
        detail: {
          summary:
            "Отправить callback вручную (успешный, неудачный или стандартный)",
        },
        headers: AuthHeaderSchema,
        params: t.Object({ id: t.String() }),
        body: t.Object({
          type: t.Union(
            [t.Literal("success"), t.Literal("fail"), t.Literal("standard")],
            {
              description:
                "Тип callback: success (successUri), fail (failUri) или standard (callbackUri)",
            }
          ),
          status: t.Optional(
            t.String({ description: "Статус для standard callback" })
          ),
        }),
        response: {
          200: t.Object({
            callback: t.String(),
            url: t.String(),
            payload: t.Unknown(),
            result: t.Unknown(),
            callbackHistoryEntry: t.Union([
              t.Object({
                id: t.String(),
                transactionId: t.String(),
                url: t.String(),
                payload: t.Any(),
                response: t.Union([t.String(), t.Null()]),
                statusCode: t.Union([t.Number(), t.Null()]),
                error: t.Union([t.String(), t.Null()]),
                createdAt: t.String(),
              }),
              t.Null(),
            ]),
          }),
          400: ErrorSchema,
          404: ErrorSchema,
        },
      }
    )

    /* ─────────── POST /admin/transactions/test/in ─────────── */
    .post(
      "/test/in",
      async ({ body, set, error }) => {
        try {
          // Ищем тестового мерчанта
          const testMerchant = await db.merchant.findFirst({
            where: { name: "test" },
          });

          if (!testMerchant) {
            return error(404, {
              error:
                'Тестовый мерчант не найден. Сначала создайте мерчанта с именем "test"',
            });
          }

          // Проверяем метод
          const method = await db.method.findUnique({
            where: { id: body.methodId },
          });
          if (!method) {
            return error(404, { error: "Метод не найден" });
          }

          // Генерируем дефолтные значения если не указаны
          const amount = body.amount || Math.floor(Math.random() * 9000) + 1000;
          const rate = body.rate || 95 + Math.random() * 10;
          const orderId =
            body.orderId ||
            `TEST_IN_${Date.now()}_${Math.random().toString(36).substring(7)}`;
          const expired_at =
            body.expired_at || new Date(Date.now() + 3600000).toISOString();
          const userIp =
            body.userIp ||
            `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(
              Math.random() * 255
            )}`;
          const callbackUri = body.callbackUri || "";

          // Create the transaction directly instead of calling the merchant API
          // This avoids middleware issues and is simpler for test transactions

          // Find available bank requisite for the method
          const pool = await db.bankDetail.findMany({
            where: {
              isArchived: false,
              methodType: method.type,
              user: {
                banned: false,
                deposit: { gte: 1000 },
                trafficEnabled: true,
              },
              OR: [
                { deviceId: null },
                { device: { isWorking: true, isOnline: true } },
              ],
            },
            orderBy: { updatedAt: "asc" },
            include: { user: true },
          });

          let chosen = null;
          for (const bd of pool) {
            if (amount < bd.minAmount || amount > bd.maxAmount) continue;
            if (
              amount < bd.user.minAmountPerRequisite ||
              amount > bd.user.maxAmountPerRequisite
            )
              continue;

            // Проверяем наличие активной транзакции с той же суммой на этом реквизите
            const existingTransaction = await db.transaction.findFirst({
              where: {
                bankDetailId: bd.id,
                amount: amount,
                status: {
                  in: [Status.CREATED, Status.IN_PROGRESS],
                },
                type: TransactionType.IN,
              },
            });

            if (existingTransaction) {
              console.log(
                `[Admin Test] Реквизит ${bd.id} отклонен: уже есть транзакция на сумму ${amount} в статусе ${existingTransaction.status}`
              );
              continue;
            }

            // Проверяем дневной лимит транзакций
            if (bd.maxCountTransactions && bd.maxCountTransactions > 0) {
              const todayStart = new Date();
              todayStart.setHours(0, 0, 0, 0);
              const todayEnd = new Date();
              todayEnd.setHours(23, 59, 59, 999);

              const todayCount = await db.transaction.count({
                where: {
                  bankDetailId: bd.id,
                  createdAt: { gte: todayStart, lte: todayEnd },
                  status: { not: Status.CANCELED },
                },
              });

              if (todayCount + 1 > bd.maxCountTransactions) {
                console.log(
                  `[Admin Test] Реквизит ${bd.id} отклонен: превышение лимита транзакций. Текущий: ${todayCount}, лимит: ${bd.maxCountTransactions}`
                );
                continue;
              }
            }

            chosen = bd;
            break;
          }

          if (!chosen) {
            return error(409, {
              error: "NO_REQUISITE: подходящий реквизит не найден",
            });
          }

          // Get current Rapira rates for test transaction
          const rapiraBaseRate = await rapiraService.getUsdtRubRate();
          const rateSettingRecord = await db.rateSetting.findFirst({
            where: { id: 1 },
          });
          const rapiraKkk = rateSettingRecord?.rapiraKkk || 0;
          const rapiraRateWithKkk = await rapiraService.getRateWithKkk(
            rapiraKkk
          );

          // Determine merchant rate (for test merchant, use rate if provided)
          const merchantRate = testMerchant.countInRubEquivalent
            ? rapiraBaseRate
            : rate || rapiraBaseRate;

          // Create test transaction with balance freezing
          const transaction = await db.$transaction(async (prisma) => {
            // Рассчитываем параметры заморозки
            const freezingParams = await calculateTransactionFreezing(
              amount,
              rapiraRateWithKkk,
              chosen.userId,
              testMerchant.id,
              body.methodId
            );

            // Замораживаем баланс трейдера
            await freezeTraderBalance(prisma, chosen.userId, freezingParams);
            console.log(
              `[Admin Test] Frozen ${freezingParams.totalRequired} USDT for trader ${chosen.userId}`
            );

            // Обновляем updatedAt реквизита для ротации
            await prisma.bankDetail.update({
              where: { id: chosen.id },
              data: { updatedAt: new Date() },
            });

            // Создаем транзакцию
            return await prisma.transaction.create({
              data: {
                merchantId: testMerchant.id,
                amount,
                assetOrBank: chosen.cardNumber,
                orderId,
                methodId: body.methodId,
                currency: "RUB",
                userId: `test_user_${Date.now()}`,
                userIp,
                callbackUri,
                successUri: "",
                failUri: "",
                type: "IN",
                expired_at: new Date(expired_at),
                commission: 0,
                clientName: `Test User`,
                status: "IN_PROGRESS",
                rate: rapiraRateWithKkk, // Always Rapira rate with KKK for calculations
                merchantRate: merchantRate, // Merchant's display rate
                adjustedRate: rapiraRateWithKkk, // Deprecated, kept for compatibility
                isMock: true,
                bankDetailId: chosen.id,
                traderId: chosen.userId,
                // Параметры заморозки
                frozenUsdtAmount: freezingParams.frozenUsdtAmount,
                calculatedCommission: freezingParams.calculatedCommission,
                kkkPercent: freezingParams.kkkPercent,
                feeInPercent: freezingParams.feeInPercent,
                // Рассчитываем traderProfit сразу при создании
                traderProfit: freezingParams.calculatedCommission
                  ? truncate2(freezingParams.calculatedCommission)
                  : null,
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
                requisites: {
                  select: {
                    id: true,
                    bankType: true,
                    cardNumber: true,
                    recipientName: true,
                    user: { select: { id: true, name: true } },
                  },
                },
              },
            });
          });

          const crypto =
            rate && transaction.method
              ? (transaction.amount / rate) *
                (1 - transaction.method.commissionPayin / 100)
              : null;

          set.status = 201;
          return {
            success: true,
            transaction: {
              id: transaction.id,
              numericId: transaction.numericId,
              amount: transaction.amount,
              crypto,
              status: transaction.status,
              traderId: transaction.traderId,
              requisites: transaction.requisites && {
                id: transaction.requisites.id,
                bankType: transaction.requisites.bankType,
                cardNumber: transaction.requisites.cardNumber,
                recipientName: transaction.requisites.recipientName,
                traderName: transaction.requisites.user.name,
              },
              createdAt: transaction.createdAt.toISOString(),
              updatedAt: transaction.updatedAt.toISOString(),
              expired_at: transaction.expired_at.toISOString(),
              method: transaction.method,
            },
          };
        } catch (e: any) {
          console.error("Test transaction creation error:", e);
          return error(500, {
            error: "Ошибка создания тестовой транзакции",
            details: e.message,
          });
        }
      },
      {
        tags: ["admin"],
        detail: {
          summary: "Создать тестовую IN транзакцию от имени тестового мерчанта",
        },
        headers: AuthHeaderSchema,
        body: t.Object({
          methodId: t.String({ description: "ID метода платежа" }),
          amount: t.Optional(
            t.Number({
              description: "Сумма транзакции (по умолчанию случайная)",
            })
          ),
          rate: t.Optional(
            t.Number({ description: "Курс USDT/RUB (по умолчанию случайный)" })
          ),
          orderId: t.Optional(
            t.String({ description: "ID заказа (по умолчанию генерируется)" })
          ),
          expired_at: t.Optional(
            t.String({
              description: "Дата истечения ISO (по умолчанию через час)",
            })
          ),
          userIp: t.Optional(
            t.String({
              description: "IP пользователя (по умолчанию случайный)",
            })
          ),
          callbackUri: t.Optional(
            t.String({ description: "URL для колбэков" })
          ),
        }),
        response: {
          201: t.Object({
            success: t.Boolean(),
            transaction: t.Any(),
          }),
          404: ErrorSchema,
          500: ErrorSchema,
        },
      }
    )

    /* ─────────── POST /admin/transactions/test/out ─────────── */
    .post(
      "/test/out",
      async ({ body, set, error, headers }) => {
        try {
          // First, check if test merchant exists and get its countInRubEquivalent setting
          const testMerchant = await db.merchant.findFirst({
            where: { name: "test" },
          });

          if (!testMerchant) {
            return error(404, {
              error:
                'Тестовый мерчант не найден. Сначала создайте мерчанта с именем "test"',
            });
          }

          // Prepare request data based on merchant's countInRubEquivalent setting
          const payoutData: any = {
            amount: body.amount,
            wallet:
              body.assetOrBank ||
              `7${Math.floor(Math.random() * 9000000000 + 1000000000)}`, // Используем assetOrBank как wallet
            bank: "Сбербанк", // Дефолтный банк
            isCard: true,
            direction: "OUT",
            metadata: {
              orderId: body.orderId,
              userIp: body.userIp,
              clientName: body.clientName,
            },
          };

          // Only include rate if countInRubEquivalent is false
          if (!testMerchant.countInRubEquivalent) {
            payoutData.rate = body.rate || 95 + Math.random() * 10;
          } else if (body.rate !== undefined) {
            // If rate is passed but countInRubEquivalent is true, return error
            return error(400, {
              error:
                "Курс не должен передаваться при включенных расчетах в рублях у мерчанта",
            });
          }

          // Перенаправляем на правильный эндпоинт для создания выплат
          const baseUrl =
            process.env.API_URL ||
            `http://localhost:${process.env.PORT || "3000"}/api`;
          const response = await fetch(`${baseUrl}/admin/payouts/test`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-admin-key": headers["x-admin-key"] || "", // Используем тот же admin key из запроса
            },
            body: JSON.stringify(payoutData),
          });

          if (response.ok) {
            const result = await response.json();
            set.status = 201;
            return {
              success: true,
              transaction: {
                id: result.payout.id,
                numericId: result.payout.numericId,
                status: result.payout.status,
                amount: result.payout.amount,
                type: "OUT",
                assetOrBank: result.payout.wallet,
                bank: result.payout.bank,
                rate: result.payout.rate,
                expireAt: result.payout.expireAt,
                traderId: result.payout.traderId,
              },
            };
          } else {
            const responseText = await response.text();
            console.error("Merchant API error response:", responseText);
            try {
              const errorData = JSON.parse(responseText);
              return error(response.status, errorData);
            } catch {
              return error(response.status, { error: responseText });
            }
          }
        } catch (e: any) {
          console.error("Test transaction creation error:", e);
          return error(500, {
            error: "Ошибка создания тестовой транзакции",
            details: e.message,
          });
        }
      },
      {
        tags: ["admin"],
        detail: {
          summary:
            "Создать тестовую OUT транзакцию от имени тестового мерчанта",
        },
        headers: AuthHeaderSchema,
        body: t.Object({
          methodId: t.String({ description: "ID метода платежа" }),
          amount: t.Optional(
            t.Number({
              description: "Сумма транзакции (по умолчанию случайная)",
            })
          ),
          assetOrBank: t.Optional(
            t.String({ description: "Номер карты или кошелька" })
          ),
          rate: t.Optional(
            t.Number({ description: "Курс USDT/RUB (по умолчанию случайный)" })
          ),
          orderId: t.Optional(
            t.String({ description: "ID заказа (по умолчанию генерируется)" })
          ),
          expired_at: t.Optional(
            t.String({
              description: "Дата истечения ISO (по умолчанию через час)",
            })
          ),
          userIp: t.Optional(
            t.String({
              description: "IP пользователя (по умолчанию случайный)",
            })
          ),
          callbackUri: t.Optional(
            t.String({ description: "URL для колбэков" })
          ),
          clientName: t.Optional(t.String({ description: "Имя клиента" })),
        }),
        response: {
          201: t.Object({
            success: t.Boolean(),
            transaction: t.Any(),
          }),
          404: ErrorSchema,
          500: ErrorSchema,
        },
      }
    )

    /* ─────────── POST /admin/transactions/mock/in ─────────── */
    .post(
      "/mock/in",
      async ({ body, set, error }) => {
        try {
          // 1) Проверяем мерчанта
          const merchant = await db.merchant.findUnique({
            where: { id: body.merchantId },
          });
          if (!merchant) return error(404, { error: "Мерчант не найден" });

          // 2) Проверяем метод
          const method = await db.method.findUnique({
            where: { id: body.methodId },
          });
          if (!method) return error(404, { error: "Метод не найден" });

          const amount = body.amount;
          const orderId = body.orderId || `MOCK_IN_${Date.now()}`;
          const expiredAt = body.expired_at
            ? new Date(body.expired_at)
            : new Date(Date.now() + 60 * 60 * 1000);
          const userIp = body.userIp || "127.0.0.1";
          const callbackUri = body.callbackUri || "";
          const rate = body.rate ?? null;

          // 3) Подбираем подходящий реквизит как в /test/in
          const pool = await db.bankDetail.findMany({
            where: {
              isArchived: false,
              methodType: method.type,
              user: {
                banned: false,
                deposit: { gte: 1000 },
                trafficEnabled: true,
              },
              OR: [
                { deviceId: null },
                { device: { isWorking: true, isOnline: true } },
              ],
            },
            orderBy: { updatedAt: "asc" },
            include: { user: true },
          });

          let chosen: any = null;
          for (const bd of pool) {
            if (amount < bd.minAmount || amount > bd.maxAmount) continue;
            if (
              amount < bd.user.minAmountPerRequisite ||
              amount > bd.user.maxAmountPerRequisite
            )
              continue;

            const existing = await db.transaction.findFirst({
              where: {
                bankDetailId: bd.id,
                amount,
                status: { in: [Status.CREATED, Status.IN_PROGRESS] },
                type: TransactionType.IN,
              },
            });
            if (existing) continue;

            // Проверяем интервал между сделками
            if (bd.intervalMinutes > 0) {
              const { canCreateDealOnRequisite } = await import("@/utils/requisite-interval");
              const canCreate = await canCreateDealOnRequisite(bd.id, bd.intervalMinutes);
              if (!canCreate) {
                console.log(
                  `[AdminTransactions] Реквизит ${bd.id} отклонен: не прошел интервал ${bd.intervalMinutes} минут между сделками`
                );
                continue;
              }
            }

            if (bd.maxCountTransactions && bd.maxCountTransactions > 0) {
              const todayStart = new Date();
              todayStart.setHours(0, 0, 0, 0);
              const todayEnd = new Date();
              todayEnd.setHours(23, 59, 59, 999);
              const todayCount = await db.transaction.count({
                where: {
                  bankDetailId: bd.id,
                  createdAt: { gte: todayStart, lte: todayEnd },
                  status: { not: Status.CANCELED },
                },
              });
              if (todayCount + 1 > bd.maxCountTransactions) continue;
            }
            chosen = bd;
            break;
          }

          if (!chosen)
            return error(409, {
              error: "NO_REQUISITE: подходящий реквизит не найден",
            });

          // 4) Получаем текущие курсы Rapira
          const rapiraBaseRate = await rapiraService.getUsdtRubRate();
          const rateSettingRecord = await db.rateSetting.findFirst({
            where: { id: 1 },
          });
          const rapiraKkk = rateSettingRecord?.rapiraKkk || 0;
          const rapiraRateWithKkk = await rapiraService.getRateWithKkk(
            rapiraKkk
          );
          const merchantRate = merchant.countInRubEquivalent
            ? rapiraBaseRate
            : rate ?? rapiraBaseRate;

          // 5) Транзакция с заморозкой
          const trx = await db.$transaction(async (prisma) => {
            const freezingParams = await calculateTransactionFreezing(
              amount,
              rapiraRateWithKkk,
              chosen.userId,
              merchant.id,
              body.methodId
            );
            await freezeTraderBalance(prisma, chosen.userId, freezingParams);
            await prisma.bankDetail.update({
              where: { id: chosen.id },
              data: { updatedAt: new Date() },
            });
            return await prisma.transaction.create({
              data: {
                merchantId: merchant.id,
                amount,
                assetOrBank: chosen.cardNumber,
                orderId,
                methodId: body.methodId,
                currency: "RUB",
                userId: body.userId || `mock_user_${Date.now()}`,
                userIp,
                callbackUri,
                successUri: body.successUri || "",
                failUri: body.failUri || "",
                type: "IN",
                expired_at: expiredAt,
                commission: 0,
                clientName: body.clientName || "Mock User",
                status: "IN_PROGRESS",
                rate: rapiraRateWithKkk,
                merchantRate,
                adjustedRate: rapiraRateWithKkk,
                isMock: true,
                bankDetailId: chosen.id,
                traderId: chosen.userId,
                frozenUsdtAmount: freezingParams.frozenUsdtAmount,
                calculatedCommission: freezingParams.calculatedCommission,
                kkkPercent: freezingParams.kkkPercent,
                feeInPercent: freezingParams.feeInPercent,
                metadata: body.metadata ?? { isMock: true },
              },
              include: {
                merchant: true,
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
                requisites: {
                  select: {
                    id: true,
                    bankType: true,
                    cardNumber: true,
                    recipientName: true,
                    user: { select: { id: true, name: true } },
                  },
                },
              },
            });
          });

          set.status = 201;
          return {
            success: true,
            transaction: {
              id: trx.id,
              numericId: trx.numericId,
              amount: trx.amount,
              status: trx.status,
              traderId: trx.traderId,
              requisites: trx.requisites && {
                id: trx.requisites.id,
                bankType: trx.requisites.bankType,
                cardNumber: trx.requisites.cardNumber,
                recipientName: trx.requisites.recipientName,
                traderName: trx.requisites.user.name,
              },
              createdAt: trx.createdAt.toISOString(),
              updatedAt: trx.updatedAt.toISOString(),
              expired_at: trx.expired_at.toISOString(),
              method: trx.method,
            },
          };
        } catch (e: any) {
          console.error("Mock transaction creation error:", e);
          return error(500, {
            error: "Ошибка создания моковой транзакции",
            details: e.message,
          });
        }
      },
      {
        tags: ["admin"],
        detail: {
          summary: "Создать моковую IN транзакцию для выбранного мерчанта",
        },
        headers: AuthHeaderSchema,
        body: t.Object({
          merchantId: t.String(),
          methodId: t.String(),
          amount: t.Number(),
          orderId: t.Optional(t.String()),
          rate: t.Optional(t.Number()),
          expired_at: t.Optional(t.String()),
          userId: t.Optional(t.String()),
          userIp: t.Optional(t.String()),
          callbackUri: t.Optional(t.String()),
          successUri: t.Optional(t.String()),
          failUri: t.Optional(t.String()),
          clientName: t.Optional(t.String()),
          metadata: t.Optional(t.Unknown()),
        }),
        response: {
          201: t.Object({ success: t.Boolean(), transaction: t.Any() }),
          404: ErrorSchema,
          409: ErrorSchema,
          500: ErrorSchema,
        },
      }
    )

    /* ─────────── PATCH /admin/transactions/:id/recalc ─────────── */
    .patch(
      "/:id/recalc",
      async ({ params, body, error }) => {
        const existing = await db.transaction.findUnique({
          where: { id: params.id },
          include: { method: true },
        });
        if (!existing) return error(404, { error: "Транзакция не найдена" });

        const amount = body.amount;
        const rateBase = existing.rate || 0;
        const kkkPercent = existing.kkkPercent || 0;
        const feePercent = existing.feeInPercent || 0;

        const freezing = calculateFreezingParams(
          amount,
          rateBase,
          kkkPercent,
          feePercent
        );
        const profit = calculateTraderProfit(
          freezing.frozenUsdtAmount,
          freezing.calculatedCommission,
          amount,
          freezing.adjustedRate
        );
        const traderProfit = truncate2(profit);

        const oldRateWithFee =
          (existing.rate || 0) *
          (1 + (existing.method?.commissionPayin || 0) / 100);
        const newRateWithFee =
          freezing.adjustedRate *
          (1 + (existing.method?.commissionPayin || 0) / 100);
        const oldMerchantCredit = existing.amount / oldRateWithFee;
        const newMerchantCredit = amount / newRateWithFee;
        const merchantDiff = newMerchantCredit - oldMerchantCredit;

        const oldSpent = existing.amount / (existing.rate || 1);
        const newSpent = amount / freezing.adjustedRate;
        const spentDiff = newSpent - oldSpent;
        const profitDiff = traderProfit - (existing.traderProfit || 0);

        const updated = await db.$transaction(async (prisma) => {
          const trx = await prisma.transaction.update({
            where: { id: params.id },
            data: {
              amount,
              rate: freezing.adjustedRate,
              commission: freezing.calculatedCommission,
              frozenUsdtAmount: freezing.frozenUsdtAmount,
              calculatedCommission: freezing.calculatedCommission,
              traderProfit,
            },
            include: {
              merchant: true,
              method: true,
              trader: true,
              requisites: {
                select: {
                  id: true,
                  bankType: true,
                  cardNumber: true,
                  phoneNumber: true,
                  recipientName: true,
                },
              },
            },
          });

          if (
            existing.status === Status.READY &&
            existing.type === TransactionType.IN
          ) {
            if (merchantDiff > 0)
              await prisma.merchant.update({
                where: { id: existing.merchantId },
                data: { balanceUsdt: { increment: merchantDiff } },
              });
            else if (merchantDiff < 0)
              await prisma.merchant.update({
                where: { id: existing.merchantId },
                data: { balanceUsdt: { decrement: -merchantDiff } },
              });

            if (existing.traderId) {
              const balanceUpdate: any = {};
              if (spentDiff > 0)
                balanceUpdate.trustBalance = {
                  decrement: truncate2(spentDiff),
                };
              else if (spentDiff < 0)
                balanceUpdate.trustBalance = {
                  increment: truncate2(-spentDiff),
                };

              if (profitDiff > 0)
                balanceUpdate.profitFromDeals = {
                  increment: truncate2(profitDiff),
                };
              else if (profitDiff < 0)
                balanceUpdate.profitFromDeals = {
                  decrement: truncate2(-profitDiff),
                };

              if (Object.keys(balanceUpdate).length > 0)
                await prisma.user.update({
                  where: { id: existing.traderId },
                  data: balanceUpdate,
                });
            }
          }

          return trx;
        });

        return serializeTransaction(updated);
      },
      {
        tags: ["admin"],
        detail: { summary: "Перерасчёт параметров транзакции" },
        headers: AuthHeaderSchema,
        params: t.Object({ id: t.String() }),
        body: t.Object({ amount: t.Number() }),
        response: { 200: TransactionResponseSchema, 404: ErrorSchema },
      }
    )

    /* ─────────── PATCH /admin/transactions/:id/status - обновление статуса транзакции ─────────── */
    .patch(
      "/:id/status",
      async ({ params, body, error }) => {
        try {
          const existing = await db.transaction.findUnique({
            where: { id: params.id },
            include: {
              trader: true,
              merchant: true,
              method: true,
            },
          });

          if (!existing) {
            return error(404, { error: "Транзакция не найдена" });
          }

          const newStatus = body.status as Status;

          // Проверяем валидность перехода статуса
          const validTransitions: Record<Status, Status[]> = {
            CREATED: [
              Status.IN_PROGRESS,
              Status.CANCELED,
              Status.EXPIRED,
              Status.READY,
            ],
            IN_PROGRESS: [
              Status.READY,
              Status.DISPUTE,
              Status.CANCELED,
              Status.EXPIRED,
            ],
            DISPUTE: [Status.READY, Status.CANCELED],
            READY: [Status.CANCELED], // READY можно только отменить
            EXPIRED: [Status.CANCELED, Status.READY], // EXPIRED можно отменить или подтвердить
            CANCELED: [], // CANCELED - финальный статус
            MILK: [Status.CANCELED, Status.READY], // MILK можно отменить или подтвердить
          };

          if (!validTransitions[existing.status]?.includes(newStatus)) {
            return error(400, {
              error: `Недопустимый переход статуса с ${existing.status} на ${newStatus}`,
            });
          }

          // Обновляем статус транзакции
          await db.transaction.update({
            where: { id: params.id },
            data: {
              status: newStatus,
              updatedAt: new Date(),
              ...(newStatus === Status.READY && { acceptedAt: new Date() }),
            },
          });

          // Если статус изменен на READY, размораживаем средства трейдера и начисляем прибыль
          if (newStatus === Status.READY && existing.status !== Status.READY) {
            if (existing.traderId) {
              // ВАЖНО: Используем сохраненные параметры транзакции, а не актуальные курсы
              const savedRate = existing.rate;
              const savedKkkPercent = existing.kkkPercent || 0;

              if (!savedRate) {
                return error(400, {
                  error:
                    "Не удается обработать транзакцию: отсутствует сохраненный курс",
                });
              }

              // Используем гибкие ставки для расчета комиссии
              const feeInPercent = await getFlexibleFeePercent(
                existing.traderId,
                existing.merchantId,
                existing.methodId,
                existing.amount,
                "IN"
              );

              // Обрабатываем баланс трейдера
              const wasExpired = existing.status === Status.EXPIRED;

              if (wasExpired) {
                console.log(
                  "[Admin Transaction Patch Status] Processing EXPIRED transaction:",
                  {
                    transactionId: existing.id,
                    existingStatus: existing.status,
                    newStatus: body.status,
                    frozenUsdtAmount: existing.frozenUsdtAmount,
                    savedRate: savedRate,
                  }
                );

                // Для истекшей транзакции используем сохраненные параметры, не пересчитываем заново
                const spentUsdt =
                  existing.frozenUsdtAmount ||
                  roundDown2(existing.amount / savedRate);

                // Рассчитываем прибыль трейдера на основе сохраненных параметров
                const traderProfit =
                  existing.traderProfit ||
                  (existing.calculatedCommission
                    ? truncate2(existing.calculatedCommission)
                    : truncate2(
                        (existing.amount / savedRate) * (feeInPercent / 100)
                      ));

                const trader = await db.user.findUnique({
                  where: { id: existing.traderId },
                });
                if (trader && spentUsdt > 0) {
                  // Для истекших транзакций списываем с trustBalance и deposit, а не с balanceUsdt
                  // (средства уже были разморожены при истечении и добавлены в trustBalance)
                  let remaining = spentUsdt;
                  const trustDeduct = Math.min(
                    trader.trustBalance || 0,
                    remaining
                  );
                  remaining -= trustDeduct;

                  const updateFields: any = {
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

                  await db.user.update({
                    where: { id: existing.traderId },
                    data: updateFields,
                  });
                }

                // НЕ обновляем параметры транзакции для истекших сделок
              } else {
                // Для неистекших транзакций используем сохраненные параметры
                // ВАЖНО: НЕ пересчитываем курсы, используем сохраненные при создании
                const spentUsdt = existing.amount / savedRate;
                const traderProfit = truncate2(
                  spentUsdt * (feeInPercent / 100)
                );

                // Обновляем только traderProfit, остальные параметры остаются как при создании
                await db.transaction.update({
                  where: { id: params.id },
                  data: {
                    traderProfit,
                    // НЕ обновляем rate, commission, frozenUsdtAmount - используем сохраненные
                  },
                });

                // Размораживаем средства и начисляем прибыль
                if (existing.frozenUsdtAmount) {
                  // Из замороженного баланса вычитаем изначально замороженную сумму
                  await db.user.update({
                    where: { id: existing.traderId },
                    data: {
                      frozenUsdt: {
                        decrement: truncate2(existing.frozenUsdtAmount),
                      },
                      profitFromDeals: { increment: truncate2(traderProfit) },
                    },
                  });
                }
              }

              // Обновляем баланс мерчанта используя сохраненный курс
              if (existing.type === TransactionType.IN) {
                // ВАЖНО: всегда используем сохраненный курс из транзакции
                const merchantCredit = existing.amount / savedRate;
                await db.merchant.update({
                  where: { id: existing.merchantId },
                  data: {
                    balanceUsdt: { increment: merchantCredit },
                  },
                });
              }

              // Обновляем currentTotalAmount для реквизита
              if (existing.bankDetailId) {
                await db.bankDetail.update({
                  where: { id: existing.bankDetailId },
                  data: {
                    currentTotalAmount: { increment: existing.amount },
                  },
                });
              }
            }
          }

          // Если статус изменен на CANCELED, обрабатываем средства трейдера в зависимости от предыдущего статуса
          if (
            newStatus === Status.CANCELED &&
            existing.status !== Status.CANCELED &&
            existing.traderId
          ) {
            if (existing.status === Status.EXPIRED) {
              // Для истекших транзакций списываем с trustBalance и депозита
              const usdtAmount = existing.rate
                ? existing.amount / existing.rate
                : 0;

              if (usdtAmount > 0) {
                console.log(
                  `[Admin Cancel] Processing EXPIRED->CANCELED: trader=${existing.traderId}, usdtAmount=${usdtAmount}`
                );

                const trader = await db.user.findUnique({
                  where: { id: existing.traderId },
                  select: { trustBalance: true, deposit: true },
                });

                if (trader) {
                  let remaining = usdtAmount;
                  const trustDeduct = Math.min(
                    trader.trustBalance || 0,
                    remaining
                  );
                  remaining -= trustDeduct;

                  const updateFields: any = {};

                  if (trustDeduct > 0) {
                    updateFields.trustBalance = { decrement: trustDeduct };
                  }

                  // Если trustBalance недостаточно, списываем остаток с deposit
                  if (remaining > 0) {
                    updateFields.deposit = { decrement: remaining };
                  }

                  console.log(`[Admin Cancel] EXPIRED balance deduction:`, {
                    trustBalance: trader.trustBalance,
                    trustDeduct,
                    depositDeduct: remaining,
                    updateFields,
                  });

                  if (Object.keys(updateFields).length > 0) {
                    await db.user.update({
                      where: { id: existing.traderId },
                      data: updateFields,
                    });
                  }
                }
              }
            } else if (existing.status === Status.IN_PROGRESS) {
              // Для транзакций в процессе размораживаем средства из frozenUsdt
              if (existing.frozenUsdtAmount) {
                console.log(
                  `[Admin Cancel] Processing IN_PROGRESS->CANCELED: trader=${existing.traderId}, frozenAmount=${existing.frozenUsdtAmount}`
                );

                await db.user.update({
                  where: { id: existing.traderId },
                  data: {
                    frozenUsdt: {
                      decrement: truncate2(existing.frozenUsdtAmount),
                    },
                    // Добавляем сумму заморозки к trustBalance при отмене сделки "В работе"
                    trustBalance: {
                      increment: truncate2(existing.frozenUsdtAmount),
                    },
                  },
                });
              }
            } else if (existing.status === Status.READY) {
              // Для готовых сделок при отмене списываем с trustBalance и убираем прибыль
              const usdtAmount = existing.rate
                ? existing.amount / existing.rate
                : 0;

              if (usdtAmount > 0) {
                console.log(
                  `[Admin Cancel] Processing READY->CANCELED: trader=${existing.traderId}, usdtAmount=${usdtAmount}`
                );

                const updateFields: any = {
                  // Списываем сумму в USDT с trustBalance
                  trustBalance: { decrement: truncate2(usdtAmount) },
                };

                // Если у сделки была прибыль, убираем её
                if (existing.traderProfit && existing.traderProfit > 0) {
                  updateFields.profitFromDeals = {
                    decrement: truncate2(existing.traderProfit),
                  };
                }

                console.log(`[Admin Cancel] READY balance deduction:`, {
                  usdtAmount,
                  traderProfit: existing.traderProfit,
                  updateFields,
                });

                await db.user.update({
                  where: { id: existing.traderId },
                  data: updateFields,
                });
              }
            }
          }

          // Если OUT транзакция переведена в READY, снимаем с траст баланса
          if (
            newStatus === Status.READY &&
            existing.type === TransactionType.OUT &&
            existing.traderId
          ) {
            const trader = await db.user.findUnique({
              where: { id: existing.traderId },
            });
            if (trader) {
              const stake = trader.stakePercent ?? 0;
              const commission = trader.profitPercent ?? 0;
              const rubAfter = existing.amount * (1 - commission / 100);
              const rateAdj = existing.rate
                ? existing.rate * (1 - stake / 100)
                : undefined;
              const deduct =
                !rateAdj || existing.currency?.toLowerCase() === "usdt"
                  ? rubAfter
                  : rubAfter / rateAdj;

              // Проверяем доступный траст баланс
              const availableTrustBalance = trader.trustBalance ?? 0;
              if (availableTrustBalance < deduct) {
                return error(400, { error: "Недостаточно баланса у трейдера" });
              }

              await db.user.update({
                where: { id: existing.traderId },
                data: { trustBalance: { decrement: deduct } },
              });
            }
          }

          // Если статус изменен на EXPIRED, размораживаем средства и возвращаем в trustBalance
          if (
            newStatus === Status.EXPIRED &&
            existing.status !== Status.EXPIRED &&
            existing.traderId &&
            existing.frozenUsdtAmount
          ) {
            console.log(
              `[Admin Status Update] Processing IN_PROGRESS->EXPIRED: trader=${existing.traderId}, frozenAmount=${existing.frozenUsdtAmount}`
            );

            // Размораживаем средства и возвращаем в trustBalance
            await db.user.update({
              where: { id: existing.traderId },
              data: {
                frozenUsdt: {
                  decrement: truncate2(existing.frozenUsdtAmount), // Обрезаем до 2 знаков
                },
                trustBalance: {
                  increment: truncate2(existing.frozenUsdtAmount), // Обрезаем до 2 знаков
                },
              },
            });
          }

          // Получаем полную транзакцию для возврата и отправки колбэка
          const updatedTransaction = await db.transaction.findUnique({
            where: { id: params.id },
            include: {
              merchant: true,
              method: true,
              trader: true,
              requisites: {
                select: {
                  id: true,
                  bankType: true,
                  cardNumber: true,
                  phoneNumber: true,
                  recipientName: true,
                },
              },
            },
          });

          if (!updatedTransaction) {
            return error(404, {
              error: "Транзакция не найдена после обновления",
            });
          }

          // Отправляем колбэк при изменении статуса (ПОСЛЕ всех финансовых операций)
          let callbackResult = null;

          console.log(
            `[Admin Status Update] About to send callback for transaction ${updatedTransaction.id}`
          );
          console.log(
            `[Admin Status Update] Callback URI: ${updatedTransaction.callbackUri}`
          );
          console.log(
            `[Admin Status Update] Success URI: ${updatedTransaction.successUri}`
          );
          console.log(
            `[Admin Status Update] Final status: ${updatedTransaction.status}`
          );

          try {
            callbackResult = await sendTransactionCallbacks(updatedTransaction);
            console.log(
              `[Admin Status Update] Callback sent successfully:`,
              callbackResult
            );
          } catch (callbackError) {
            console.error(
              `[Admin Status Update] Error sending callback:`,
              callbackError
            );
            // Не прерываем выполнение, продолжаем
          }

          return serializeTransaction(updatedTransaction);
        } catch (e: any) {
          console.error("Error updating transaction status:", e);
          return error(500, {
            error: "Ошибка при обновлении статуса транзакции",
          });
        }
      },
      {
        tags: ["admin"],
        detail: { summary: "Обновление статуса транзакции" },
        headers: AuthHeaderSchema,
        params: t.Object({ id: t.String() }),
        body: t.Object({
          status: t.Enum(Status, { description: "Новый статус транзакции" }),
        }),
        response: {
          200: TransactionResponseSchema,
          400: ErrorSchema,
          404: ErrorSchema,
          500: ErrorSchema,
        },
      }
    )

    /* ─────────── GET /admin/transactions/:id/callbacks ─────────── */
    .get(
      "/:id/callbacks",
      async ({ params, error }) => {
        const transaction = await db.transaction.findUnique({
          where: { id: params.id },
          include: {
            callbackHistory: {
              orderBy: { createdAt: "desc" },
            },
          },
        });

        if (!transaction) {
          return error(404, { error: "Транзакция не найдена" });
        }

        return {
          callbackHistory: transaction.callbackHistory.map((cb) => ({
            ...cb,
            createdAt: cb.createdAt.toISOString(),
          })),
        };
      },
      {
        tags: ["admin"],
        detail: { summary: "Получение истории колбэков транзакции" },
        headers: AuthHeaderSchema,
        params: t.Object({ id: t.String() }),
        response: {
          200: t.Object({
            callbackHistory: t.Array(
              t.Object({
                id: t.String(),
                transactionId: t.String(),
                url: t.String(),
                payload: t.Any(),
                response: t.Union([t.String(), t.Null()]),
                statusCode: t.Union([t.Number(), t.Null()]),
                error: t.Union([t.String(), t.Null()]),
                createdAt: t.String(),
              })
            ),
          }),
          404: ErrorSchema,
        },
      }
    )

    /* ─────────── DELETE /admin/transactions/delete ─────────── */
    .delete(
      "/delete",
      async ({ body, error }) => {
        try {
          await db.transaction.delete({ where: { id: body.id } });
          return { ok: true };
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
        tags: ["admin"],
        detail: { summary: "Удаление транзакции" },
        headers: AuthHeaderSchema,
        body: t.Object({ id: t.String() }),
        response: {
          200: t.Object({ ok: t.Boolean() }),
          404: ErrorSchema,
        },
      }
    );
