import { Elysia, t } from "elysia";
import { db } from "@/db";
import { Prisma } from "@prisma/client";
import ErrorSchema from "@/types/error";

const authHeader = t.Object({ "x-admin-key": t.String() });

export default (app: Elysia) =>
  app
    /* ───────────────── Get fee ranges for trader-merchant ───────────────── */
    .get(
      "/trader-merchant/:id/fee-ranges",
      async ({ params, error }) => {
        try {
          const traderMerchant = await db.traderMerchant.findUnique({
            where: { id: params.id },
            include: {
              feeRanges: {
                where: { isActive: true },
                orderBy: { minAmount: 'asc' }
              },
              merchant: {
                select: {
                  id: true,
                  name: true,
                }
              },
              method: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                }
              },
              trader: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                }
              }
            }
          });

          if (!traderMerchant) {
            return error(404, { error: "Связь трейдер-мерчант не найдена" });
          }

          return {
            id: traderMerchant.id,
            useFlexibleRates: traderMerchant.useFlexibleRates,
            defaultFeeIn: traderMerchant.feeIn,
            defaultFeeOut: traderMerchant.feeOut,
            merchant: traderMerchant.merchant,
            method: traderMerchant.method,
            trader: traderMerchant.trader,
            feeRanges: traderMerchant.feeRanges.map(range => ({
              id: range.id,
              minAmount: range.minAmount,
              maxAmount: range.maxAmount,
              feeInPercent: range.feeInPercent,
              feeOutPercent: range.feeOutPercent,
              createdAt: range.createdAt.toISOString(),
              updatedAt: range.updatedAt.toISOString(),
            })),
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
        response: {
          200: t.Object({
            id: t.String(),
            useFlexibleRates: t.Boolean(),
            defaultFeeIn: t.Number(),
            defaultFeeOut: t.Number(),
            merchant: t.Object({
              id: t.String(),
              name: t.String(),
            }),
            method: t.Object({
              id: t.String(),
              name: t.String(),
              code: t.String(),
            }),
            trader: t.Object({
              id: t.String(),
              name: t.String(),
              email: t.String(),
            }),
            feeRanges: t.Array(t.Object({
              id: t.String(),
              minAmount: t.Number(),
              maxAmount: t.Number(),
              feeInPercent: t.Number(),
              feeOutPercent: t.Number(),
              createdAt: t.String(),
              updatedAt: t.String(),
            })),
          }),
          404: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    )

    /* ───────────────── Add fee range ───────────────── */
    .post(
      "/trader-merchant/:id/fee-ranges",
      async ({ params, body, error }) => {
        try {
          // Проверяем что связь трейдер-мерчант существует
          const traderMerchant = await db.traderMerchant.findUnique({
            where: { id: params.id }
          });

          if (!traderMerchant) {
            return error(404, { error: "Связь трейдер-мерчант не найдена" });
          }

          // Проверяем что промежуток не пересекается с существующими
          const overlappingRange = await db.traderMerchantFeeRange.findFirst({
            where: {
              traderMerchantId: params.id,
              isActive: true,
              OR: [
                // Новый промежуток начинается внутри существующего
                {
                  AND: [
                    { minAmount: { lte: body.minAmount } },
                    { maxAmount: { gte: body.minAmount } }
                  ]
                },
                // Новый промежуток заканчивается внутри существующего
                {
                  AND: [
                    { minAmount: { lte: body.maxAmount } },
                    { maxAmount: { gte: body.maxAmount } }
                  ]
                },
                // Новый промежуток полностью покрывает существующий
                {
                  AND: [
                    { minAmount: { gte: body.minAmount } },
                    { maxAmount: { lte: body.maxAmount } }
                  ]
                }
              ]
            }
          });

          if (overlappingRange) {
            return error(400, { 
              error: "Промежуток пересекается с существующим", 
              details: `Пересечение с промежутком ${overlappingRange.minAmount}-${overlappingRange.maxAmount}` 
            });
          }

          const feeRange = await db.traderMerchantFeeRange.create({
            data: {
              traderMerchantId: params.id,
              minAmount: body.minAmount,
              maxAmount: body.maxAmount,
              feeInPercent: body.feeInPercent,
              feeOutPercent: body.feeOutPercent,
            }
          });

          return {
            id: feeRange.id,
            minAmount: feeRange.minAmount,
            maxAmount: feeRange.maxAmount,
            feeInPercent: feeRange.feeInPercent,
            feeOutPercent: feeRange.feeOutPercent,
            createdAt: feeRange.createdAt.toISOString(),
            updatedAt: feeRange.updatedAt.toISOString(),
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
          minAmount: t.Number({ minimum: 0 }),
          maxAmount: t.Number({ minimum: 0 }),
          feeInPercent: t.Number({ minimum: 0, maximum: 100 }),
          feeOutPercent: t.Number({ minimum: 0, maximum: 100 }),
        }),
        response: {
          200: t.Object({
            id: t.String(),
            minAmount: t.Number(),
            maxAmount: t.Number(),
            feeInPercent: t.Number(),
            feeOutPercent: t.Number(),
            createdAt: t.String(),
            updatedAt: t.String(),
          }),
          400: ErrorSchema,
          404: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    )

    /* ───────────────── Update fee range ───────────────── */
    .patch(
      "/trader-merchant/fee-range/:id",
      async ({ params, body, error }) => {
        try {
          const feeRange = await db.traderMerchantFeeRange.findUnique({
            where: { id: params.id }
          });

          if (!feeRange) {
            return error(404, { error: "Промежуток ставок не найден" });
          }

          // Если обновляются границы промежутка, проверяем пересечения
          if (body.minAmount !== undefined || body.maxAmount !== undefined) {
            const newMinAmount = body.minAmount ?? feeRange.minAmount;
            const newMaxAmount = body.maxAmount ?? feeRange.maxAmount;

            const overlappingRange = await db.traderMerchantFeeRange.findFirst({
              where: {
                traderMerchantId: feeRange.traderMerchantId,
                isActive: true,
                id: { not: params.id }, // Исключаем текущий промежуток
                OR: [
                  {
                    AND: [
                      { minAmount: { lte: newMinAmount } },
                      { maxAmount: { gte: newMinAmount } }
                    ]
                  },
                  {
                    AND: [
                      { minAmount: { lte: newMaxAmount } },
                      { maxAmount: { gte: newMaxAmount } }
                    ]
                  },
                  {
                    AND: [
                      { minAmount: { gte: newMinAmount } },
                      { maxAmount: { lte: newMaxAmount } }
                    ]
                  }
                ]
              }
            });

            if (overlappingRange) {
              return error(400, { 
                error: "Промежуток пересекается с существующим",
                details: `Пересечение с промежутком ${overlappingRange.minAmount}-${overlappingRange.maxAmount}`
              });
            }
          }

          const updatedRange = await db.traderMerchantFeeRange.update({
            where: { id: params.id },
            data: {
              ...(body.minAmount !== undefined && { minAmount: body.minAmount }),
              ...(body.maxAmount !== undefined && { maxAmount: body.maxAmount }),
              ...(body.feeInPercent !== undefined && { feeInPercent: body.feeInPercent }),
              ...(body.feeOutPercent !== undefined && { feeOutPercent: body.feeOutPercent }),
              updatedAt: new Date(),
            }
          });

          return {
            id: updatedRange.id,
            minAmount: updatedRange.minAmount,
            maxAmount: updatedRange.maxAmount,
            feeInPercent: updatedRange.feeInPercent,
            feeOutPercent: updatedRange.feeOutPercent,
            createdAt: updatedRange.createdAt.toISOString(),
            updatedAt: updatedRange.updatedAt.toISOString(),
          };
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2025"
          )
            return error(404, { error: "Промежуток ставок не найден" });
          throw e;
        }
      },
      {
        tags: ["admin"],
        headers: authHeader,
        params: t.Object({ id: t.String() }),
        body: t.Object({
          minAmount: t.Optional(t.Number({ minimum: 0 })),
          maxAmount: t.Optional(t.Number({ minimum: 0 })),
          feeInPercent: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
          feeOutPercent: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
        }),
        response: {
          200: t.Object({
            id: t.String(),
            minAmount: t.Number(),
            maxAmount: t.Number(),
            feeInPercent: t.Number(),
            feeOutPercent: t.Number(),
            createdAt: t.String(),
            updatedAt: t.String(),
          }),
          400: ErrorSchema,
          404: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    )

    /* ───────────────── Delete fee range ───────────────── */
    .delete(
      "/trader-merchant/fee-range/:id",
      async ({ params, error }) => {
        try {
          await db.traderMerchantFeeRange.delete({
            where: { id: params.id },
          });
          return { success: true };
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2025"
          )
            return error(404, { error: "Промежуток ставок не найден" });
          throw e;
        }
      },
      {
        tags: ["admin"],
        headers: authHeader,
        params: t.Object({ id: t.String() }),
        response: {
          200: t.Object({ success: t.Boolean() }),
          404: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    )

    /* ───────────────── Toggle flexible rates mode ───────────────── */
    .patch(
      "/trader-merchant/:id/flexible-rates",
      async ({ params, body, error }) => {
        try {
          const updatedRelation = await db.traderMerchant.update({
            where: { id: params.id },
            data: {
              useFlexibleRates: body.useFlexibleRates,
              updatedAt: new Date(),
            },
          });

          return {
            id: updatedRelation.id,
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
          useFlexibleRates: t.Boolean(),
        }),
        response: {
          200: t.Object({
            id: t.String(),
            useFlexibleRates: t.Boolean(),
          }),
          404: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    );
