/**
 * routes/merchant/payouts.ts
 * ---------------------------------------------------------------------------
 * Маршруты для работы с выплатами мерчанта
 *
 *   GET    /merchant/payouts        — список выплат мерчанта
 *   GET    /merchant/payouts/:id    — детали выплаты
 * ---------------------------------------------------------------------------
 */

import { Elysia, t } from "elysia";
import { db } from "@/db";
import { PayoutStatus } from "@prisma/client";
import ErrorSchema from "@/types/error";
import { merchantGuard } from "@/middleware/merchantGuard";

export default (app: Elysia) =>
  app
    .use(merchantGuard())
    
    /* ──────── GET /merchant/payouts ──────── */
    .get(
      "/",
      async ({ merchant, query }) => {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const skip = (page - 1) * limit;

        // Построение фильтров
        const where: any = {
          merchantId: merchant.id,
        };

        if (query.status && query.status !== 'ALL') {
          where.status = query.status as PayoutStatus;
        }

        if (query.search) {
          const searchNumber = Number(query.search);
          const isNumber = !isNaN(searchNumber);
          
          where.OR = [
            { id: { contains: query.search } },
            { wallet: { contains: query.search, mode: 'insensitive' } },
            { bank: { contains: query.search, mode: 'insensitive' } },
            { externalReference: { contains: query.search, mode: 'insensitive' } },
            ...(isNumber ? [
              { numericId: searchNumber },
              { amount: searchNumber }
            ] : []),
          ];
        }

        // Фильтры по датам
        if (query.dateFrom && !query.dateTo) {
          where.createdAt = { gte: new Date(query.dateFrom) };
        } else if (!query.dateFrom && query.dateTo) {
          where.createdAt = { lte: new Date(query.dateTo) };
        } else if (query.dateFrom && query.dateTo) {
          where.createdAt = {
            gte: new Date(query.dateFrom),
            lte: new Date(query.dateTo)
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
            lte: Number(query.amountTo)
          };
        }

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

        const [payouts, total] = await Promise.all([
          db.payout.findMany({
            where,
            select: {
              id: true,
              numericId: true,
              status: true,
              amount: true,
              amountUsdt: true,
              rate: true,
              wallet: true,
              bank: true,
              isCard: true,
              feePercent: true,
              createdAt: true,
              acceptedAt: true,
              confirmedAt: true,
              cancelledAt: true,
              externalReference: true,
              method: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  type: true,
                  currency: true,
                },
              },
              trader: {
                select: {
                  id: true,
                  name: true,
                  numericId: true,
                  email: true,
                },
              },
            },
            skip,
            take: limit,
            orderBy,
          }),
          db.payout.count({ where }),
        ]);

        // Форматируем данные
        const data = payouts.map((payout) => ({
          id: payout.id,
          numericId: payout.numericId,
          status: payout.status,
          amount: payout.amount,
          amountUsdt: payout.amountUsdt,
          rate: payout.rate,
          wallet: payout.wallet,
          bank: payout.bank,
          isCard: payout.isCard,
          feePercent: payout.feePercent,
          createdAt: payout.createdAt.toISOString(),
          acceptedAt: payout.acceptedAt?.toISOString() || null,
          confirmedAt: payout.confirmedAt?.toISOString() || null,
          cancelledAt: payout.cancelledAt?.toISOString() || null,
          externalReference: payout.externalReference,
          method: payout.method,
          trader: payout.trader,
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
        detail: {
          tags: ["merchant", "payouts"],
          summary: "Получение списка выплат мерчанта с фильтрами"
        },
        query: t.Object({
          page: t.Optional(t.String()),
          limit: t.Optional(t.String()),
          status: t.Optional(t.String()),
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
                status: t.Enum(PayoutStatus),
                amount: t.Number(),
                amountUsdt: t.Number(),
                rate: t.Number(),
                wallet: t.String(),
                bank: t.String(),
                isCard: t.Boolean(),
                feePercent: t.Number(),
                createdAt: t.String(),
                acceptedAt: t.Union([t.String(), t.Null()]),
                confirmedAt: t.Union([t.String(), t.Null()]),
                cancelledAt: t.Union([t.String(), t.Null()]),
                externalReference: t.Union([t.String(), t.Null()]),
                method: t.Union([
                  t.Object({
                    id: t.String(),
                    code: t.String(),
                    name: t.String(),
                    type: t.String(),
                    currency: t.String(),
                  }),
                  t.Null()
                ]),
                trader: t.Union([
                  t.Object({
                    id: t.String(),
                    name: t.String(),
                    numericId: t.Number(),
                    email: t.String(),
                  }),
                  t.Null()
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
        },
      }
    )

    /* ──────── GET /merchant/payouts/:id ──────── */
    .get(
      "/:id",
      async ({ merchant, params, error }) => {
        const payout = await db.payout.findFirst({
          where: { 
            id: params.id, 
            merchantId: merchant.id 
          },
          select: {
            id: true,
            numericId: true,
            status: true,
            amount: true,
            amountUsdt: true,
            total: true,
            totalUsdt: true,
            rate: true,
            wallet: true,
            bank: true,
            isCard: true,
            feePercent: true,
            createdAt: true,
            acceptedAt: true,
            confirmedAt: true,
            cancelledAt: true,
            expireAt: true,
            externalReference: true,
            method: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
                currency: true,
                commissionPayout: true,
              },
            },
            trader: {
              select: {
                id: true,
                name: true,
                numericId: true,
                email: true,
              },
            },
          },
        });

        if (!payout) {
          return error(404, { error: "Выплата не найдена" });
        }

        return {
          ...payout,
          createdAt: payout.createdAt.toISOString(),
          acceptedAt: payout.acceptedAt?.toISOString() || null,
          confirmedAt: payout.confirmedAt?.toISOString() || null,
          cancelledAt: payout.cancelledAt?.toISOString() || null,
          expireAt: payout.expireAt.toISOString(),
        };
      },
      {
        detail: {
          tags: ["merchant", "payouts"],
          summary: "Получение детальной информации о выплате"
        },
        params: t.Object({ 
          id: t.String({ description: "ID выплаты" }) 
        }),
        response: {
          200: t.Object({
            id: t.String(),
            numericId: t.Number(),
            status: t.Enum(PayoutStatus),
            amount: t.Number(),
            amountUsdt: t.Number(),
            total: t.Number(),
            totalUsdt: t.Number(),
            rate: t.Number(),
            wallet: t.String(),
            bank: t.String(),
            isCard: t.Boolean(),
            feePercent: t.Number(),
            createdAt: t.String(),
            acceptedAt: t.Union([t.String(), t.Null()]),
            confirmedAt: t.Union([t.String(), t.Null()]),
            cancelledAt: t.Union([t.String(), t.Null()]),
            expireAt: t.String(),
            externalReference: t.Union([t.String(), t.Null()]),
            method: t.Union([
              t.Object({
                id: t.String(),
                code: t.String(),
                name: t.String(),
                type: t.String(),
                currency: t.String(),
                commissionPayout: t.Number(),
              }),
              t.Null()
            ]),
            trader: t.Union([
              t.Object({
                id: t.String(),
                name: t.String(),
                numericId: t.Number(),
                email: t.String(),
              }),
              t.Null()
            ]),
          }),
          404: ErrorSchema,
          401: ErrorSchema,
        },
      }
    );