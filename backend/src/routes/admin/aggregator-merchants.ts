/**
 * admin/aggregator-merchants.ts
 * ---------------------------------------------------------------------------
 * Административные маршруты для управления мерчантами агрегаторов.
 * 
 * ▸ Управление связями агрегатор-мерчант
 * ▸ Настройка ставок и гибких ставок
 * ▸ Управление трафиком на мерчантов
 * ▸ Статистика по мерчантам агрегатора
 * ---------------------------------------------------------------------------
 */

import { Elysia, t } from 'elysia'
import { db } from '@/db'
import { Prisma, RateSource } from '@prisma/client'
import ErrorSchema from '@/types/error'
import { adminGuard } from '@/middleware/adminGuard'

/* ───────────────────── helpers ───────────────────── */

const serializeAggregatorMerchant = (am: any) => ({
  ...am,
  createdAt: am.createdAt.toISOString(),
  updatedAt: am.updatedAt.toISOString(),
  merchant: am.merchant ? {
    id: am.merchant.id,
    name: am.merchant.name,
    disabled: am.merchant.disabled,
    banned: am.merchant.banned,
  } : undefined,
  method: am.method ? {
    id: am.method.id,
    code: am.method.code,
    name: am.method.name,
    type: am.method.type,
  } : undefined,
  feeRanges: am.feeRanges?.map((fr: any) => ({
    ...fr,
    createdAt: fr.createdAt.toISOString(),
    updatedAt: fr.updatedAt.toISOString(),
  })) || [],
})

/* ───────────────────── schemas ───────────────────── */

const AggregatorMerchantSchema = t.Object({
  id: t.String(),
  aggregatorId: t.String(),
  merchantId: t.String(),
  methodId: t.String(),
  feeIn: t.Number(),
  feeOut: t.Number(),
  isFeeInEnabled: t.Boolean(),
  isFeeOutEnabled: t.Boolean(),
  isTrafficEnabled: t.Boolean(),
  rateSource: t.Union([t.Enum(RateSource), t.Null()]),
  useFlexibleRates: t.Boolean(),
  createdAt: t.String(),
  updatedAt: t.String(),
  merchant: t.Optional(t.Object({
    id: t.String(),
    name: t.String(),
    disabled: t.Boolean(),
    banned: t.Boolean(),
  })),
  method: t.Optional(t.Object({
    id: t.String(),
    code: t.String(),
    name: t.String(),
    type: t.String(),
  })),
  feeRanges: t.Array(t.Object({
    id: t.String(),
    minAmount: t.Number(),
    maxAmount: t.Number(),
    feeInPercent: t.Number(),
    feeOutPercent: t.Number(),
    isActive: t.Boolean(),
    createdAt: t.String(),
    updatedAt: t.String(),
  })),
})

/* ───────────────────── routes ───────────────────── */

export default (app: Elysia) => {
  return app
    .use(adminGuard())
    
    /* ─────── GET /admin/aggregators-v2/:id/merchants ─────── */
    .get(
      '/merchants',
      async ({ params, query, error }) => {
        const aggregator = await db.aggregator.findUnique({
          where: { id: params.id },
        })
        
        if (!aggregator) {
          return error(404, { error: 'Агрегатор не найден' })
        }

        const where: Prisma.AggregatorMerchantWhereInput = {
          aggregatorId: params.id,
        }

        if (query.merchantId) {
          where.merchantId = query.merchantId
        }

        if (query.methodId) {
          where.methodId = query.methodId
        }

        if (query.isTrafficEnabled !== undefined) {
          where.isTrafficEnabled = query.isTrafficEnabled === 'true'
        }

        const merchants = await db.aggregatorMerchant.findMany({
          where,
          include: {
            merchant: true,
            method: true,
            feeRanges: {
              where: { isActive: true },
              orderBy: { minAmount: 'asc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        })

        // Получаем статистику по транзакциям
        const stats = await db.transaction.groupBy({
          by: ['merchantId'],
          where: {
            aggregatorId: params.id,
            merchantId: { in: merchants.map(m => m.merchantId) },
          },
          _count: { _all: true },
          _sum: { commission: true },
        })

        const statsMap = stats.reduce((acc, s) => {
          acc[s.merchantId] = {
            count: s._count._all,
            profit: s._sum.commission || 0,
          }
          return acc
        }, {} as Record<string, { count: number, profit: number }>)

        return {
          merchants: merchants.map(m => ({
            ...serializeAggregatorMerchant(m),
            stats: statsMap[m.merchantId] || { count: 0, profit: 0 },
          })),
          total: merchants.length,
        }
      },
      {
        tags: ['admin'],
        params: t.Object({ id: t.String() }),
        query: t.Object({
          merchantId: t.Optional(t.String()),
          methodId: t.Optional(t.String()),
          isTrafficEnabled: t.Optional(t.String()),
        }),
        response: {
          200: t.Object({
            merchants: t.Array(t.Composite([
              AggregatorMerchantSchema,
              t.Object({
                stats: t.Object({
                  count: t.Number(),
                  profit: t.Number(),
                }),
              }),
            ])),
            total: t.Number(),
          }),
          404: ErrorSchema,
          401: ErrorSchema,
        },
      }
    )
    
    /* ─────── POST /admin/aggregators-v2/:id/merchants ─────── */
    .post(
      '/merchants',
      async ({ params, body, error }) => {
        // Проверяем существование агрегатора
        const aggregator = await db.aggregator.findUnique({
          where: { id: params.id },
        })
        
        if (!aggregator) {
          return error(404, { error: 'Агрегатор не найден' })
        }

        // Проверяем существование мерчанта
        const merchant = await db.merchant.findUnique({
          where: { id: body.merchantId },
        })
        
        if (!merchant) {
          return error(404, { error: 'Мерчант не найден' })
        }

        // Проверяем существование метода
        const method = await db.method.findUnique({
          where: { id: body.methodId },
        })
        
        if (!method) {
          return error(404, { error: 'Метод не найден' })
        }

        // Проверяем уникальность связи
        const existing = await db.aggregatorMerchant.findUnique({
          where: {
            aggregatorId_merchantId_methodId: {
              aggregatorId: params.id,
              merchantId: body.merchantId,
              methodId: body.methodId,
            },
          },
        })

        if (existing) {
          return error(409, { error: 'Связь агрегатор-мерчант-метод уже существует' })
        }

        // Создаем связь
        const aggregatorMerchant = await db.aggregatorMerchant.create({
          data: {
            aggregatorId: params.id,
            merchantId: body.merchantId,
            methodId: body.methodId,
            feeIn: body.feeIn || 0,
            feeOut: body.feeOut || 0,
            isFeeInEnabled: body.isFeeInEnabled ?? true,
            isFeeOutEnabled: body.isFeeOutEnabled ?? true,
            isTrafficEnabled: body.isTrafficEnabled ?? true,
            rateSource: body.rateSource || null,
            useFlexibleRates: body.useFlexibleRates || false,
          },
          include: {
            merchant: true,
            method: true,
            feeRanges: true,
          },
        })

        return serializeAggregatorMerchant(aggregatorMerchant)
      },
      {
        tags: ['admin'],
        params: t.Object({ id: t.String() }),
        body: t.Object({
          merchantId: t.String(),
          methodId: t.String(),
          feeIn: t.Optional(t.Number()),
          feeOut: t.Optional(t.Number()),
          isFeeInEnabled: t.Optional(t.Boolean()),
          isFeeOutEnabled: t.Optional(t.Boolean()),
          isTrafficEnabled: t.Optional(t.Boolean()),
          rateSource: t.Optional(t.Union([t.Enum(RateSource), t.Null()])),
          useFlexibleRates: t.Optional(t.Boolean()),
        }),
        response: {
          200: AggregatorMerchantSchema,
          404: ErrorSchema,
          409: ErrorSchema,
          401: ErrorSchema,
        },
      }
    )
    
    /* ─── PUT /admin/aggregators-v2/:id/merchants/:merchantId/:methodId ─── */
    .put(
      '/merchants/:merchantId/:methodId',
      async ({ params, body, error }) => {
        const aggregatorMerchant = await db.aggregatorMerchant.findUnique({
          where: {
            aggregatorId_merchantId_methodId: {
              aggregatorId: params.id,
              merchantId: params.merchantId,
              methodId: params.methodId,
            },
          },
        })

        if (!aggregatorMerchant) {
          return error(404, { error: 'Связь агрегатор-мерчант не найдена' })
        }

        const updated = await db.aggregatorMerchant.update({
          where: {
            aggregatorId_merchantId_methodId: {
              aggregatorId: params.id,
              merchantId: params.merchantId,
              methodId: params.methodId,
            },
          },
          data: {
            feeIn: body.feeIn !== undefined ? body.feeIn : undefined,
            feeOut: body.feeOut !== undefined ? body.feeOut : undefined,
            isFeeInEnabled: body.isFeeInEnabled !== undefined ? body.isFeeInEnabled : undefined,
            isFeeOutEnabled: body.isFeeOutEnabled !== undefined ? body.isFeeOutEnabled : undefined,
            isTrafficEnabled: body.isTrafficEnabled !== undefined ? body.isTrafficEnabled : undefined,
            rateSource: body.rateSource !== undefined ? body.rateSource : undefined,
            useFlexibleRates: body.useFlexibleRates !== undefined ? body.useFlexibleRates : undefined,
          },
          include: {
            merchant: true,
            method: true,
            feeRanges: true,
          },
        })

        return serializeAggregatorMerchant(updated)
      },
      {
        tags: ['admin'],
        params: t.Object({
          id: t.String(),
          merchantId: t.String(),
          methodId: t.String(),
        }),
        body: t.Object({
          feeIn: t.Optional(t.Number()),
          feeOut: t.Optional(t.Number()),
          isFeeInEnabled: t.Optional(t.Boolean()),
          isFeeOutEnabled: t.Optional(t.Boolean()),
          isTrafficEnabled: t.Optional(t.Boolean()),
          rateSource: t.Optional(t.Union([t.Enum(RateSource), t.Null()])),
          useFlexibleRates: t.Optional(t.Boolean()),
        }),
        response: {
          200: AggregatorMerchantSchema,
          404: ErrorSchema,
          401: ErrorSchema,
        },
      }
    )
    
    /* ─── DELETE /admin/aggregators-v2/:id/merchants/:merchantId/:methodId ─── */
    .delete(
      '/merchants/:merchantId/:methodId',
      async ({ params, error }) => {
        const aggregatorMerchant = await db.aggregatorMerchant.findUnique({
          where: {
            aggregatorId_merchantId_methodId: {
              aggregatorId: params.id,
              merchantId: params.merchantId,
              methodId: params.methodId,
            },
          },
        })

        if (!aggregatorMerchant) {
          return error(404, { error: 'Связь агрегатор-мерчант не найдена' })
        }

        await db.aggregatorMerchant.delete({
          where: {
            aggregatorId_merchantId_methodId: {
              aggregatorId: params.id,
              merchantId: params.merchantId,
              methodId: params.methodId,
            },
          },
        })

        return { success: true }
      },
      {
        tags: ['admin'],
        params: t.Object({
          id: t.String(),
          merchantId: t.String(),
          methodId: t.String(),
        }),
        response: {
          200: t.Object({ success: t.Boolean() }),
          404: ErrorSchema,
          401: ErrorSchema,
        },
      }
    )

    /* ─── POST /admin/aggregators-v2/:id/merchants/:merchantId/:methodId/fee-ranges ─── */
    .post(
      '/merchants/:merchantId/:methodId/fee-ranges',
      async ({ params, body, error }) => {
        const aggregatorMerchant = await db.aggregatorMerchant.findUnique({
          where: {
            aggregatorId_merchantId_methodId: {
              aggregatorId: params.id,
              merchantId: params.merchantId,
              methodId: params.methodId,
            },
          },
        })

        if (!aggregatorMerchant) {
          return error(404, { error: 'Связь агрегатор-мерчант не найдена' })
        }

        // Проверяем пересечение диапазонов
        const existingRanges = await db.aggregatorMerchantFeeRange.findMany({
          where: {
            aggregatorMerchantId: aggregatorMerchant.id,
            isActive: true,
          },
        })

        for (const range of existingRanges) {
          if (
            (body.minAmount >= range.minAmount && body.minAmount <= range.maxAmount) ||
            (body.maxAmount >= range.minAmount && body.maxAmount <= range.maxAmount) ||
            (body.minAmount <= range.minAmount && body.maxAmount >= range.maxAmount)
          ) {
            return error(409, { error: 'Диапазон пересекается с существующим' })
          }
        }

        const feeRange = await db.aggregatorMerchantFeeRange.create({
          data: {
            aggregatorMerchantId: aggregatorMerchant.id,
            minAmount: body.minAmount,
            maxAmount: body.maxAmount,
            feeInPercent: body.feeInPercent,
            feeOutPercent: body.feeOutPercent,
            isActive: body.isActive ?? true,
          },
        })

        return {
          ...feeRange,
          createdAt: feeRange.createdAt.toISOString(),
          updatedAt: feeRange.updatedAt.toISOString(),
        }
      },
      {
        tags: ['admin'],
        params: t.Object({
          id: t.String(),
          merchantId: t.String(),
          methodId: t.String(),
        }),
        body: t.Object({
          minAmount: t.Number(),
          maxAmount: t.Number(),
          feeInPercent: t.Number(),
          feeOutPercent: t.Number(),
          isActive: t.Optional(t.Boolean()),
        }),
        response: {
          200: t.Object({
            id: t.String(),
            aggregatorMerchantId: t.String(),
            minAmount: t.Number(),
            maxAmount: t.Number(),
            feeInPercent: t.Number(),
            feeOutPercent: t.Number(),
            isActive: t.Boolean(),
            createdAt: t.String(),
            updatedAt: t.String(),
          }),
          404: ErrorSchema,
          409: ErrorSchema,
          401: ErrorSchema,
        },
      }
    )

    /* ─── DELETE /admin/aggregators-v2/:id/merchants/:merchantId/:methodId/fee-ranges/:rangeId ─── */
    .delete(
      '/merchants/:merchantId/:methodId/fee-ranges/:rangeId',
      async ({ params, error }) => {
        const feeRange = await db.aggregatorMerchantFeeRange.findUnique({
          where: { id: params.rangeId },
          include: {
            aggregatorMerchant: true,
          },
        })

        if (!feeRange || 
            feeRange.aggregatorMerchant.aggregatorId !== params.id ||
            feeRange.aggregatorMerchant.merchantId !== params.merchantId ||
            feeRange.aggregatorMerchant.methodId !== params.methodId) {
          return error(404, { error: 'Диапазон ставок не найден' })
        }

        await db.aggregatorMerchantFeeRange.delete({
          where: { id: params.rangeId },
        })

        return { success: true }
      },
      {
        tags: ['admin'],
        params: t.Object({
          aggregatorId: t.String(),
          merchantId: t.String(),
          methodId: t.String(),
          rangeId: t.String(),
        }),
        response: {
          200: t.Object({ success: t.Boolean() }),
          404: ErrorSchema,
          401: ErrorSchema,
        },
      }
    )
}
