import { Elysia, t } from "elysia";
import { db } from "@/db";
import { Prisma, RateSource } from "@prisma/client";
import ErrorSchema from "@/types/error";

const authHeader = t.Object({ "x-admin-key": t.String() });

export default (app: Elysia) =>
  app
    /* ───────────────── Get trader's merchants ───────────────── */
    .get(
      "/traders/:id/merchants",
      async ({ params, error }) => {
        try {
          const traderMerchants = await db.traderMerchant.findMany({
            where: { traderId: params.id },
            include: {
              merchant: {
                select: {
                  id: true,
                  name: true,
                  token: true,
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

          // Calculate profit statistics
          const transactions = await db.transaction.findMany({
            where: {
              traderId: params.id,
              status: 'READY',
            },
            select: {
              type: true,
              amount: true,
              commission: true,
              merchantId: true,
            },
          });

          const profitByMerchant: Record<string, { profitIn: number; profitOut: number }> = {};
          
          transactions.forEach((tx) => {
            const merchantId = tx.merchantId;
            if (!profitByMerchant[merchantId]) {
              profitByMerchant[merchantId] = { profitIn: 0, profitOut: 0 };
            }
            
            if (tx.type === 'IN') {
              profitByMerchant[merchantId].profitIn += tx.commission;
            } else {
              profitByMerchant[merchantId].profitOut += tx.commission;
            }
          });

          const totalProfit = {
            profitIn: Object.values(profitByMerchant).reduce((sum, p) => sum + p.profitIn, 0),
            profitOut: Object.values(profitByMerchant).reduce((sum, p) => sum + p.profitOut, 0),
            totalProfit: 0,
          };
          totalProfit.totalProfit = totalProfit.profitIn + totalProfit.profitOut;

          // Get trader's insurance deposit settings
          const trader = await db.user.findUnique({
            where: { id: params.id },
            select: {
              minInsuranceDeposit: true,
              maxInsuranceDeposit: true,
            }
          });

          const insuranceStats = {
            minInsuranceDeposit: trader?.minInsuranceDeposit || 0,
            maxInsuranceDeposit: trader?.maxInsuranceDeposit || 100000,
          };

          return {
            merchants: traderMerchants.map((tm) => ({
              id: tm.id,
              merchantId: tm.merchant.id,
              merchantCode: tm.merchant.token,
              merchantName: tm.merchant.name,
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
              profitIn: profitByMerchant[tm.merchantId]?.profitIn || 0,
              profitOut: profitByMerchant[tm.merchantId]?.profitOut || 0,
            })),
            statistics: {
              ...totalProfit,
              ...insuranceStats,
            },
          };
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2025"
          )
            return error(404, { error: "Трейдер не найден" });
          throw e;
        }
      },
      {
        tags: ["admin"],
        headers: authHeader,
        params: t.Object({ id: t.String() }),
        response: {
          200: t.Object({
            merchants: t.Array(
              t.Object({
                id: t.String(),
                merchantId: t.String(),
                merchantCode: t.String(),
                merchantName: t.String(),
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
              minInsuranceDeposit: t.Number(),
              maxInsuranceDeposit: t.Number(),
            }),
          }),
          404: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    )

    /* ───────────────── Add merchant to trader ───────────────── */
    .post(
      "/traders/:id/merchants",
      async ({ params, body, error }) => {
        try {
          // Check if trader exists
          await db.user.findUniqueOrThrow({
            where: { id: params.id },
          });

          // Check if merchant exists
          await db.merchant.findUniqueOrThrow({
            where: { id: body.merchantId },
          });

          // Check if method exists
          await db.method.findUniqueOrThrow({
            where: { id: body.methodId },
          });

          // Check if relation already exists
          const existing = await db.traderMerchant.findUnique({
            where: {
              traderId_merchantId_methodId: {
                traderId: params.id,
                merchantId: body.merchantId,
                methodId: body.methodId,
              },
            },
          });

          if (existing) {
            return error(409, { error: "Связь трейдер-мерчант уже существует" });
          }

          const traderMerchant = await db.traderMerchant.create({
            data: {
              traderId: params.id,
              merchantId: body.merchantId,
              methodId: body.methodId,
              feeIn: body.feeIn || 0,
              feeOut: body.feeOut || 0,
              rateSource: body.rateSource ?? null,
              useFlexibleRates: false, // По умолчанию отключено
            },
            include: {
              merchant: true,
              method: true,
            },
          });

          return {
            id: traderMerchant.id,
            merchantId: traderMerchant.merchant.id,
            merchantName: traderMerchant.merchant.name,
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
          merchantId: t.String(),
          methodId: t.String(),
          feeIn: t.Optional(t.Number()),
          feeOut: t.Optional(t.Number()),
          rateSource: t.Optional(t.Enum(RateSource)),
        }),
        response: {
          200: t.Object({
            id: t.String(),
            merchantId: t.String(),
            merchantName: t.String(),
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

    /* ───────────────── Update trader-merchant relation ───────────────── */
    .patch(
      "/trader-merchant/:id",
      async ({ params, body, error }) => {
        try {
          const updatedRelation = await db.traderMerchant.update({
            where: { id: params.id },
            data: {
              feeIn: body.feeIn !== undefined ? body.feeIn : undefined,
              feeOut: body.feeOut !== undefined ? body.feeOut : undefined,
              isFeeInEnabled: body.isFeeInEnabled !== undefined ? body.isFeeInEnabled : undefined,
              isFeeOutEnabled: body.isFeeOutEnabled !== undefined ? body.isFeeOutEnabled : undefined,
              isMerchantEnabled: body.isMerchantEnabled !== undefined ? body.isMerchantEnabled : undefined,
              rateSource: body.rateSource !== undefined ? body.rateSource : undefined,
              useFlexibleRates: body.useFlexibleRates !== undefined ? body.useFlexibleRates : undefined,
            },
          });

          return {
            id: updatedRelation.id,
            feeIn: updatedRelation.feeIn,
            feeOut: updatedRelation.feeOut,
            isFeeInEnabled: updatedRelation.isFeeInEnabled,
            isFeeOutEnabled: updatedRelation.isFeeOutEnabled,
            isMerchantEnabled: updatedRelation.isMerchantEnabled,
            rateSource: updatedRelation.rateSource || null,
            useFlexibleRates: updatedRelation.useFlexibleRates,
          };
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2025"
          )
            return error(404, { error: "Связь трейдер-мерчант не найдена" });
          throw e;
        }
      },
      {
        tags: ["admin"],
        headers: authHeader,
        params: t.Object({ id: t.String() }),
        body: t.Object({
          feeIn: t.Optional(t.Number()),
          feeOut: t.Optional(t.Number()),
          isFeeInEnabled: t.Optional(t.Boolean()),
          isFeeOutEnabled: t.Optional(t.Boolean()),
          isMerchantEnabled: t.Optional(t.Boolean()),
          rateSource: t.Optional(t.Enum(RateSource)),
          useFlexibleRates: t.Optional(t.Boolean()),
        }),
        response: {
          200: t.Object({
            id: t.String(),
            feeIn: t.Number(),
            feeOut: t.Number(),
            isFeeInEnabled: t.Boolean(),
            isFeeOutEnabled: t.Boolean(),
            isMerchantEnabled: t.Boolean(),
            rateSource: t.Union([t.Enum(RateSource), t.Null()]),
          }),
          404: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    )

    /* ───────────────── Delete trader-merchant relation ───────────────── */
    .delete(
      "/trader-merchant/:id",
      async ({ params, error }) => {
        try {
          await db.traderMerchant.delete({
            where: { id: params.id },
          });
          return { ok: true };
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2025"
          )
            return error(404, { error: "Связь трейдер-мерчант не найдена" });
          throw e;
        }
      },
      {
        tags: ["admin"],
        headers: authHeader,
        params: t.Object({ id: t.String() }),
        response: {
          200: t.Object({ ok: t.Boolean() }),
          404: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    )

    /* ───────────────── Get available merchants for trader ───────────────── */
    .get(
      "/traders/:id/available-merchants",
      async ({ params }) => {
        // Get all merchants
        const allMerchants = await db.merchant.findMany({
          where: {
            banned: false,
            disabled: false,
          },
          include: {
            merchantMethods: {
              include: {
                method: true,
              },
            },
          },
        });

        // Get existing trader-merchant relations
        const existingRelations = await db.traderMerchant.findMany({
          where: { traderId: params.id },
          select: {
            merchantId: true,
            methodId: true,
          },
        });

        // Create a set of existing merchant-method combinations
        const existingSet = new Set(
          existingRelations.map((r) => `${r.merchantId}-${r.methodId}`)
        );

        // Format available merchants with their methods
        const availableMerchants = allMerchants.map((merchant) => ({
          id: merchant.id,
          name: merchant.name,
          token: merchant.token,
          methods: merchant.merchantMethods
            .filter((mm) => mm.isEnabled && !existingSet.has(`${merchant.id}-${mm.methodId}`))
            .map((mm) => ({
              id: mm.method.id,
              code: mm.method.code,
              name: mm.method.name,
              type: mm.method.type,
            })),
        })).filter((m) => m.methods.length > 0);

        return availableMerchants;
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
              token: t.String(),
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