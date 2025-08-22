import { Elysia, t } from "elysia";
import { db } from "@/db";
import { Prisma, RateSource } from "@prisma/client";
import ErrorSchema from "@/types/error";

const authHeader = t.Object({ "x-admin-key": t.String() });

export default (app: Elysia) =>
  app
    /* ───────────────── Get merchant's traders ───────────────── */
    .get(
      "/merchants/:id/traders",
      async ({ params, error }) => {
        try {
          const traderMerchants = await db.traderMerchant.findMany({
            where: { merchantId: params.id },
            include: {
              trader: {
                select: {
                  id: true,
                  name: true,
                  email: true,
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
                where: { isActive: true },
                orderBy: { minAmount: 'asc' }
              },
            },
            orderBy: { createdAt: 'desc' },
          });

          const transactions = await db.transaction.findMany({
            where: {
              merchantId: params.id,
              status: 'READY',
            },
            select: {
              type: true,
              commission: true,
              traderId: true,
            },
          });

          const profitByTrader: Record<string, { profitIn: number; profitOut: number }> = {};

          transactions.forEach((tx) => {
            const traderId = tx.traderId;
            if (!traderId) return;
            if (!profitByTrader[traderId]) {
              profitByTrader[traderId] = { profitIn: 0, profitOut: 0 };
            }

            if (tx.type === 'IN') {
              profitByTrader[traderId].profitIn += tx.commission;
            } else {
              profitByTrader[traderId].profitOut += tx.commission;
            }
          });

          const totalProfit = {
            profitIn: Object.values(profitByTrader).reduce((sum, p) => sum + p.profitIn, 0),
            profitOut: Object.values(profitByTrader).reduce((sum, p) => sum + p.profitOut, 0),
            totalProfit: 0,
          };
          totalProfit.totalProfit = totalProfit.profitIn + totalProfit.profitOut;

          return {
            traders: traderMerchants.map((tm) => ({
              id: tm.id,
              traderId: tm.trader.id,
              traderName: tm.trader.name,
              traderEmail: tm.trader.email,
              method: tm.method.name,
              methodCode: tm.method.code,
              feeIn: tm.feeIn,
              feeOut: tm.feeOut,
              isFeeInEnabled: tm.isFeeInEnabled,
              isFeeOutEnabled: tm.isFeeOutEnabled,
              isMerchantEnabled: tm.isMerchantEnabled,
              rateSource: tm.rateSource || null,
              useFlexibleRates: tm.useFlexibleRates,
              feeRangesCount: tm.feeRanges.length,
              profitIn: profitByTrader[tm.traderId]?.profitIn || 0,
              profitOut: profitByTrader[tm.traderId]?.profitOut || 0,
            })),
            statistics: totalProfit,
          };
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2025"
          )
            return error(404, { error: "Мерчант не найден" });
          throw e;
        }
      },
      {
        tags: ["admin"],
        headers: authHeader,
        params: t.Object({ id: t.String() }),
        response: {
          200: t.Object({
            traders: t.Array(
              t.Object({
                id: t.String(),
                traderId: t.String(),
                traderName: t.String(),
                traderEmail: t.String(),
                method: t.String(),
                methodCode: t.String(),
                feeIn: t.Number(),
                feeOut: t.Number(),
                isFeeInEnabled: t.Boolean(),
                isFeeOutEnabled: t.Boolean(),
                isMerchantEnabled: t.Boolean(),
                rateSource: t.Union([t.Enum(RateSource), t.Null()]),
                useFlexibleRates: t.Boolean(),
                feeRangesCount: t.Number(),
                profitIn: t.Number(),
                profitOut: t.Number(),
              })
            ),
            statistics: t.Object({
              profitIn: t.Number(),
              profitOut: t.Number(),
              totalProfit: t.Number(),
            }),
          }),
          404: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    )

    /* ───────────────── Add trader to merchant ───────────────── */
    .post(
      "/merchants/:id/traders",
      async ({ params, body, error }) => {
        try {
          await db.merchant.findUniqueOrThrow({ where: { id: params.id } });
          await db.user.findUniqueOrThrow({ where: { id: body.traderId } });
          await db.method.findUniqueOrThrow({ where: { id: body.methodId } });

          const existing = await db.traderMerchant.findUnique({
            where: {
              traderId_merchantId_methodId: {
                traderId: body.traderId,
                merchantId: params.id,
                methodId: body.methodId,
              },
            },
          });

          if (existing) {
            return error(409, { error: "Связь трейдер-мерчант уже существует" });
          }

          const traderMerchant = await db.traderMerchant.create({
            data: {
              traderId: body.traderId,
              merchantId: params.id,
              methodId: body.methodId,
              feeIn: body.feeIn || 0,
              feeOut: body.feeOut || 0,
              rateSource: body.rateSource ?? null,
              useFlexibleRates: false,
            },
            include: {
              trader: true,
              method: true,
            },
          });

          return {
            id: traderMerchant.id,
            traderId: traderMerchant.trader.id,
            traderName: traderMerchant.trader.name,
            methodId: traderMerchant.method.id,
            methodName: traderMerchant.method.name,
            feeIn: traderMerchant.feeIn,
            feeOut: traderMerchant.feeOut,
            isFeeInEnabled: traderMerchant.isFeeInEnabled,
            isFeeOutEnabled: traderMerchant.isFeeOutEnabled,
            isMerchantEnabled: traderMerchant.isMerchantEnabled,
            rateSource: traderMerchant.rateSource || null,
          };
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2025"
          )
            return error(404, { error: "Трейдер, мерчант или метод не найден" });
          throw e;
        }
      },
      {
        tags: ["admin"],
        headers: authHeader,
        params: t.Object({ id: t.String() }),
        body: t.Object({
          traderId: t.String(),
          methodId: t.String(),
          feeIn: t.Optional(t.Number()),
          feeOut: t.Optional(t.Number()),
          rateSource: t.Optional(t.Enum(RateSource)),
        }),
        response: {
          200: t.Object({
            id: t.String(),
            traderId: t.String(),
            traderName: t.String(),
            methodId: t.String(),
            methodName: t.String(),
            feeIn: t.Number(),
            feeOut: t.Number(),
            isFeeInEnabled: t.Boolean(),
            isFeeOutEnabled: t.Boolean(),
            isMerchantEnabled: t.Boolean(),
            rateSource: t.Union([t.Enum(RateSource), t.Null()]),
          }),
          404: ErrorSchema,
          409: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    )

    /* ───────────────── Get available traders for merchant ───────────────── */
    .get(
      "/merchants/:id/available-traders",
      async ({ params }) => {
        const merchant = await db.merchant.findUnique({
          where: { id: params.id, banned: false, disabled: false },
          include: {
            merchantMethods: {
              include: { method: true },
              where: { isEnabled: true },
            },
          },
        });

        if (!merchant) return [];

        const allTraders = await db.user.findMany({ where: { banned: false } });

        const existingRelations = await db.traderMerchant.findMany({
          where: { merchantId: params.id },
          select: { traderId: true, methodId: true },
        });

        const existingSet = new Set(
          existingRelations.map((r) => `${r.traderId}-${r.methodId}`)
        );

        const availableTraders = allTraders
          .map((trader) => ({
            id: trader.id,
            name: trader.name,
            methods: merchant.merchantMethods
              .filter((mm) => !existingSet.has(`${trader.id}-${mm.methodId}`))
              .map((mm) => ({
                id: mm.method.id,
                code: mm.method.code,
                name: mm.method.name,
                type: mm.method.type,
              })),
          }))
          .filter((t) => t.methods.length > 0);

        return availableTraders;
      },
      {
        tags: ["admin"],
        headers: authHeader,
        params: t.Object({ id: t.String() }),
        response: {
          200: t.Array(
            t.Object({
              id: t.String(),
              name: t.String(),
              methods: t.Array(
                t.Object({
                  id: t.String(),
                  code: t.String(),
                  name: t.String(),
                  type: t.String(),
                })
              ),
            })
          ),
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    );
