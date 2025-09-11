/**
 * admin/aggregator-settlements.ts
 * ---------------------------------------------------------------------------
 * Административные маршруты для управления сеттлами агрегаторов.
 * 
 * ▸ Просмотр истории сеттлов
 * ▸ Добавление новых записей о сеттлах
 * ▸ Статистика по сеттлам
 * ---------------------------------------------------------------------------
 */

import { Elysia, t } from 'elysia'
import { db } from '@/db'
import { Prisma, SettlementDirection } from '@prisma/client'
import ErrorSchema from '@/types/error'
import { adminGuard } from '@/middleware/adminGuard'
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns'

/* ───────────────────── helpers ───────────────────── */

const serializeSettlement = (settlement: any) => ({
  ...settlement,
  date: settlement.date.toISOString(),
  createdAt: settlement.createdAt.toISOString(),
  updatedAt: settlement.updatedAt.toISOString(),
})

/* ───────────────────── schemas ───────────────────── */

const SettlementSchema = t.Object({
  id: t.String(),
  aggregatorId: t.String(),
  amount: t.Number(),
  direction: t.Enum(SettlementDirection),
  description: t.Union([t.String(), t.Null()]),
  date: t.String(),
  createdAt: t.String(),
  updatedAt: t.String(),
  createdBy: t.Union([t.String(), t.Null()]),
})

/* ───────────────────── routes ───────────────────── */

export default (app: Elysia) => {
  return app
    .use(adminGuard())
    
    /* ─────── GET /admin/aggregators-v2/:id/settlements ─────── */
    .get(
      '/settlements',
      async ({ params, query, error }) => {
        const aggregator = await db.aggregator.findUnique({
          where: { id: params.id },
        })
        
        if (!aggregator) {
          return error(404, { error: 'Агрегатор не найден' })
        }

        const where: Prisma.AggregatorSettlementWhereInput = {
          aggregatorId: params.id,
        }

        // Фильтры по направлению
        if (query.direction) {
          where.direction = query.direction as SettlementDirection
        }

        // Фильтры по дате
        if (query.dateFrom || query.dateTo) {
          where.date = {}
          if (query.dateFrom) {
            where.date.gte = new Date(query.dateFrom)
          }
          if (query.dateTo) {
            where.date.lte = new Date(query.dateTo)
          }
        }

        // Фильтр по месяцу
        if (query.month) {
          const monthDate = new Date(query.month)
          where.date = {
            gte: startOfMonth(monthDate),
            lte: endOfMonth(monthDate),
          }
        }

        const orderBy = query.sortBy || 'date'
        const sortOrder = query.sortOrder || 'desc'

        const page = Number(query.page) || 1
        const limit = Number(query.limit) || 20
        const skip = (page - 1) * limit

        const [settlements, total] = await Promise.all([
          db.aggregatorSettlement.findMany({
            where,
            orderBy: { [orderBy]: sortOrder },
            skip,
            take: limit,
          }),
          db.aggregatorSettlement.count({ where }),
        ])

        // Получаем статистику
        const stats = await db.aggregatorSettlement.groupBy({
          by: ['direction'],
          where: {
            aggregatorId: params.id,
            ...(query.month ? {
              date: {
                gte: startOfMonth(new Date(query.month)),
                lte: endOfMonth(new Date(query.month)),
              }
            } : {}),
          },
          _sum: { amount: true },
        })

        const totalIn = stats.find(s => s.direction === 'IN')?._sum.amount || 0
        const totalOut = stats.find(s => s.direction === 'OUT')?._sum.amount || 0
        const balance = totalIn - totalOut

        return {
          settlements: settlements.map(serializeSettlement),
          total,
          page,
          pages: Math.ceil(total / limit),
          stats: {
            totalIn,
            totalOut,
            balance,
          },
        }
      },
      {
        tags: ['admin'],
        params: t.Object({ id: t.String() }),
        query: t.Object({
          direction: t.Optional(t.Enum(SettlementDirection)),
          dateFrom: t.Optional(t.String()),
          dateTo: t.Optional(t.String()),
          month: t.Optional(t.String()),
          page: t.Optional(t.String()),
          limit: t.Optional(t.String()),
          sortBy: t.Optional(t.String()),
          sortOrder: t.Optional(t.String()),
        }),
        response: {
          200: t.Object({
            settlements: t.Array(SettlementSchema),
            total: t.Number(),
            page: t.Number(),
            pages: t.Number(),
            stats: t.Object({
              totalIn: t.Number(),
              totalOut: t.Number(),
              balance: t.Number(),
            }),
          }),
          404: ErrorSchema,
          401: ErrorSchema,
        },
      }
    )
    
    /* ─────── POST /admin/aggregators-v2/:id/settlements ─────── */
    .post(
      '/settlements',
      async ({ params, body, error, adminId }) => {
        const aggregator = await db.aggregator.findUnique({
          where: { id: params.id },
        })
        
        if (!aggregator) {
          return error(404, { error: 'Агрегатор не найден' })
        }

        const settlement = await db.aggregatorSettlement.create({
          data: {
            aggregatorId: params.id,
            amount: body.amount,
            direction: body.direction,
            description: body.description || null,
            date: body.date ? new Date(body.date) : new Date(),
            createdBy: adminId,
          },
        })

        return serializeSettlement(settlement)
      },
      {
        tags: ['admin'],
        params: t.Object({ id: t.String() }),
        body: t.Object({
          amount: t.Number(),
          direction: t.Enum(SettlementDirection),
          description: t.Optional(t.String()),
          date: t.Optional(t.String()),
        }),
        response: {
          200: SettlementSchema,
          404: ErrorSchema,
          401: ErrorSchema,
        },
      }
    )
    
    /* ─────── PUT /admin/aggregators-v2/:id/settlements/:settlementId ─────── */
    .put(
      '/settlements/:settlementId',
      async ({ params, body, error }) => {
        const settlement = await db.aggregatorSettlement.findUnique({
          where: { id: params.settlementId },
        })

        if (!settlement || settlement.aggregatorId !== params.id) {
          return error(404, { error: 'Запись о сеттле не найдена' })
        }

        const updated = await db.aggregatorSettlement.update({
          where: { id: params.settlementId },
          data: {
            amount: body.amount !== undefined ? body.amount : undefined,
            direction: body.direction !== undefined ? body.direction : undefined,
            description: body.description !== undefined ? body.description : undefined,
            date: body.date !== undefined ? new Date(body.date) : undefined,
          },
        })

        return serializeSettlement(updated)
      },
      {
        tags: ['admin'],
        params: t.Object({
          id: t.String(),
          settlementId: t.String(),
        }),
        body: t.Object({
          amount: t.Optional(t.Number()),
          direction: t.Optional(t.Enum(SettlementDirection)),
          description: t.Optional(t.String()),
          date: t.Optional(t.String()),
        }),
        response: {
          200: SettlementSchema,
          404: ErrorSchema,
          401: ErrorSchema,
        },
      }
    )
    
    /* ─────── DELETE /admin/aggregators-v2/:id/settlements/:settlementId ─────── */
    .delete(
      '/settlements/:settlementId',
      async ({ params, error }) => {
        const settlement = await db.aggregatorSettlement.findUnique({
          where: { id: params.settlementId },
        })

        if (!settlement || settlement.aggregatorId !== params.id) {
          return error(404, { error: 'Запись о сеттле не найдена' })
        }

        await db.aggregatorSettlement.delete({
          where: { id: params.settlementId },
        })

        return { success: true }
      },
      {
        tags: ['admin'],
        params: t.Object({
          id: t.String(),
          settlementId: t.String(),
        }),
        response: {
          200: t.Object({ success: t.Boolean() }),
          404: ErrorSchema,
          401: ErrorSchema,
        },
      }
    )
    
    /* ─────── GET /admin/aggregators-v2/:id/settlements/stats ─────── */
    .get(
      '/settlements/stats',
      async ({ params, query, error }) => {
        const aggregator = await db.aggregator.findUnique({
          where: { id: params.id },
        })
        
        if (!aggregator) {
          return error(404, { error: 'Агрегатор не найден' })
        }

        const currentMonth = new Date()
        const lastMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)

        // Статистика за текущий месяц
        const currentMonthStats = await db.aggregatorSettlement.groupBy({
          by: ['direction'],
          where: {
            aggregatorId: params.id,
            date: {
              gte: startOfMonth(currentMonth),
              lte: endOfMonth(currentMonth),
            },
          },
          _sum: { amount: true },
          _count: { _all: true },
        })

        // Статистика за прошлый месяц
        const lastMonthStats = await db.aggregatorSettlement.groupBy({
          by: ['direction'],
          where: {
            aggregatorId: params.id,
            date: {
              gte: startOfMonth(lastMonth),
              lte: endOfMonth(lastMonth),
            },
          },
          _sum: { amount: true },
          _count: { _all: true },
        })

        // Общая статистика
        const totalStats = await db.aggregatorSettlement.groupBy({
          by: ['direction'],
          where: { aggregatorId: params.id },
          _sum: { amount: true },
          _count: { _all: true },
        })

        const formatStats = (stats: any[]) => {
          const inStats = stats.find(s => s.direction === 'IN')
          const outStats = stats.find(s => s.direction === 'OUT')
          
          return {
            in: {
              amount: inStats?._sum.amount || 0,
              count: inStats?._count._all || 0,
            },
            out: {
              amount: outStats?._sum.amount || 0,
              count: outStats?._count._all || 0,
            },
            balance: (inStats?._sum.amount || 0) - (outStats?._sum.amount || 0),
          }
        }

        return {
          currentMonth: formatStats(currentMonthStats),
          lastMonth: formatStats(lastMonthStats),
          total: formatStats(totalStats),
        }
      },
      {
        tags: ['admin'],
        params: t.Object({ id: t.String() }),
        response: {
          200: t.Object({
            currentMonth: t.Object({
              in: t.Object({ amount: t.Number(), count: t.Number() }),
              out: t.Object({ amount: t.Number(), count: t.Number() }),
              balance: t.Number(),
            }),
            lastMonth: t.Object({
              in: t.Object({ amount: t.Number(), count: t.Number() }),
              out: t.Object({ amount: t.Number(), count: t.Number() }),
              balance: t.Number(),
            }),
            total: t.Object({
              in: t.Object({ amount: t.Number(), count: t.Number() }),
              out: t.Object({ amount: t.Number(), count: t.Number() }),
              balance: t.Number(),
            }),
          }),
          404: ErrorSchema,
          401: ErrorSchema,
        },
      }
    )
}
