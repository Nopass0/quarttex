/**
 * admin/aggregators-v2.ts
 * ---------------------------------------------------------------------------
 * Административные маршруты для управления агрегаторами v2.
 * 
 * ▸ Управление приоритетами агрегаторов
 * ▸ Просмотр и регенерация токенов
 * ▸ Статистика и метрики интеграций
 * ▸ Управление настройками SLA и лимитов
 * ---------------------------------------------------------------------------
 */

import { Elysia, t } from 'elysia'
import { db } from '@/db'
import { Prisma } from '@prisma/client'
import ErrorSchema from '@/types/error'
import { aggregatorServiceV2 } from '@/services/aggregator-v2.service'
import { fallbackRoutingService } from '@/services/fallback-routing.service'
import { adminGuard } from '@/middleware/adminGuard'

/* ───────────────────── helpers ───────────────────── */

/** Сериализация агрегатора */
const serializeAggregator = (aggregator: any) => ({
  ...aggregator,
  createdAt: aggregator.createdAt.toISOString(),
  updatedAt: aggregator.updatedAt.toISOString(),
  lastVolumeReset: aggregator.lastVolumeReset?.toISOString(),
  lastPriorityChangeAt: aggregator.lastPriorityChangeAt?.toISOString(),
  // Скрываем пароль и 2FA секрет
  password: undefined,
  twoFactorSecret: undefined
})

/* ───────────────────── schemas ───────────────────── */

const AggregatorResponseSchema = t.Object({
  id: t.String(),
  email: t.String(),
  name: t.String(),
  apiToken: t.String(),
  callbackToken: t.String(),
  apiBaseUrl: t.Optional(t.String()),
  balanceUsdt: t.Number(),
  isActive: t.Boolean(),
  priority: t.Number(),
  maxSlaMs: t.Number(),
  minBalance: t.Number(),
  maxDailyVolume: t.Optional(t.Number()),
  currentDailyVolume: t.Number(),
  lastVolumeReset: t.String(),
  twoFactorEnabled: t.Boolean(),
  createdAt: t.String(),
  updatedAt: t.String(),
  lastPriorityChangeBy: t.Optional(t.String()),
  lastPriorityChangeAt: t.Optional(t.String())
})

/* ───────────────────── routes ───────────────────── */

export default (app: Elysia) =>
  app
    .use(adminGuard())
    
    /* ─────────── GET /admin/aggregators-v2 ─────────── */
    .get(
      '/',
      async ({ query }) => {
        const where: Prisma.AggregatorWhereInput = {}

        // Фильтры
        if (query.search) {
          const s = query.search
          where.OR = [
            { email: { contains: s, mode: 'insensitive' } },
            { name: { contains: s, mode: 'insensitive' } },
          ]
        }

        if (query.isActive !== undefined) {
          where.isActive = query.isActive === 'true'
        }

        const orderBy: any = query.sortBy 
          ? { [query.sortBy]: query.sortOrder || 'asc' }
          : { priority: 'asc' } // По умолчанию сортируем по приоритету

        const page = Number(query.page) || 1
        const limit = Number(query.limit) || 20
        const skip = (page - 1) * limit

        const [aggregators, total] = await Promise.all([
          db.aggregator.findMany({
            where,
            orderBy,
            skip,
            take: limit,
            include: {
              _count: {
                select: {
                  transactions: true,
                  disputes: true,
                  integrationLogs: true
                }
              }
            }
          }),
          db.aggregator.count({ where })
        ])

        // Получаем статистику для каждого агрегатора
        const aggregatorsWithStats = await Promise.all(
          aggregators.map(async (agg) => {
            const last24h = new Date()
            last24h.setHours(last24h.getHours() - 24)
            
            const recentLogs = await db.aggregatorIntegrationLog.findMany({
              where: {
                aggregatorId: agg.id,
                createdAt: { gte: last24h },
                eventType: 'deal_create'
              }
            })
            
            const successCount = recentLogs.filter(log => log.statusCode === 200 && !log.error).length
            const totalCount = recentLogs.length
            const avgResponseTime = totalCount > 0
              ? recentLogs.reduce((sum, log) => sum + (log.responseTimeMs || 0), 0) / totalCount
              : 0
            const slaViolations = recentLogs.filter(log => log.slaViolation).length
            
            return {
              ...serializeAggregator(agg),
              stats: {
                last24h: {
                  totalRequests: totalCount,
                  successRate: totalCount > 0 ? ((successCount / totalCount) * 100).toFixed(2) : '0',
                  avgResponseTime: avgResponseTime.toFixed(0),
                  slaViolations
                }
              }
            }
          })
        )

        return {
          data: aggregatorsWithStats,
          meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Список агрегаторов с статистикой' },
        query: t.Object({
          page: t.Optional(t.String()),
          limit: t.Optional(t.String()),
          search: t.Optional(t.String()),
          isActive: t.Optional(t.String()),
          sortBy: t.Optional(t.String()),
          sortOrder: t.Optional(t.String())
        })
      }
    )

    /* ─────────── PUT /admin/aggregators-v2/priorities ─────────── */
    .put(
      '/priorities',
      async ({ body, admin }) => {
        const { priorities } = body
        
        // Валидация: проверяем уникальность ID и приоритетов
        const ids = priorities.map(p => p.aggregatorId)
        const uniqueIds = new Set(ids)
        if (ids.length !== uniqueIds.size) {
          throw new Error('Duplicate aggregator IDs')
        }
        
        const priorityValues = priorities.map(p => p.priority)
        const uniquePriorities = new Set(priorityValues)
        if (priorityValues.length !== uniquePriorities.size) {
          throw new Error('Duplicate priority values')
        }
        
        // Обновляем приоритеты в транзакции
        await db.$transaction(async (prisma) => {
          for (const { aggregatorId, priority } of priorities) {
            await prisma.aggregator.update({
              where: { id: aggregatorId },
              data: {
                priority,
                lastPriorityChangeBy: admin.id,
                lastPriorityChangeAt: new Date()
              }
            })
          }
        })
        
        console.log(`[Admin] Priorities updated by admin ${admin.id}:`, priorities)
        
        return {
          success: true,
          message: 'Priorities updated successfully'
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Обновление приоритетов агрегаторов' },
        body: t.Object({
          priorities: t.Array(
            t.Object({
              aggregatorId: t.String(),
              priority: t.Number()
            })
          )
        })
      }
    )

    /* ─────────── PATCH /admin/aggregators-v2/:id ─────────── */
    .patch(
      '/:id',
      async ({ params, body, error }) => {
        const aggregator = await db.aggregator.findUnique({
          where: { id: params.id }
        })
        
        if (!aggregator) {
          return error(404, { error: 'Aggregator not found' })
        }
        
        const updated = await db.aggregator.update({
          where: { id: params.id },
          data: {
            ...(body.name && { name: body.name }),
            ...(body.apiBaseUrl !== undefined && { apiBaseUrl: body.apiBaseUrl }),
            ...(body.isActive !== undefined && { isActive: body.isActive }),
            ...(body.maxSlaMs !== undefined && { maxSlaMs: body.maxSlaMs }),
            ...(body.minBalance !== undefined && { minBalance: body.minBalance }),
            ...(body.maxDailyVolume !== undefined && { maxDailyVolume: body.maxDailyVolume })
          }
        })
        
        return serializeAggregator(updated)
      },
      {
        tags: ['admin'],
        detail: { summary: 'Обновление настроек агрегатора' },
        params: t.Object({
          id: t.String()
        }),
        body: t.Object({
          name: t.Optional(t.String()),
          apiBaseUrl: t.Optional(t.String()),
          isActive: t.Optional(t.Boolean()),
          maxSlaMs: t.Optional(t.Number()),
          minBalance: t.Optional(t.Number()),
          maxDailyVolume: t.Optional(t.Number())
        }),
        response: {
          200: AggregatorResponseSchema,
          404: ErrorSchema
        }
      }
    )

    /* ─────────── POST /admin/aggregators-v2/:id/regenerate-token ─────────── */
    .post(
      '/:id/regenerate-token',
      async ({ params, body, error, admin }) => {
        const aggregator = await db.aggregator.findUnique({
          where: { id: params.id }
        })
        
        if (!aggregator) {
          return error(404, { error: 'Aggregator not found' })
        }
        
        const tokenType = body.tokenType
        const newToken = aggregatorServiceV2.generateToken()
        
        const updated = await db.aggregator.update({
          where: { id: params.id },
          data: tokenType === 'api' 
            ? { apiToken: newToken }
            : { callbackToken: newToken }
        })
        
        console.log(
          `[Admin] Token regenerated for aggregator ${aggregator.name}`,
          { tokenType, adminId: admin.id }
        )
        
        return {
          success: true,
          newToken,
          tokenType
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Регенерация токена агрегатора' },
        params: t.Object({
          id: t.String()
        }),
        body: t.Object({
          tokenType: t.Union([t.Literal('api'), t.Literal('callback')])
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            newToken: t.String(),
            tokenType: t.String()
          }),
          404: ErrorSchema
        }
      }
    )

    /* ─────────── GET /admin/aggregators-v2/:id/stats ─────────── */
    .get(
      '/:id/stats',
      async ({ params, query, error }) => {
        const aggregator = await db.aggregator.findUnique({
          where: { id: params.id }
        })
        
        if (!aggregator) {
          return error(404, { error: 'Aggregator not found' })
        }
        
        const periodDays = parseInt(query.period || '7')
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - periodDays)
        
        // Получаем логи интеграций
        const logs = await db.aggregatorIntegrationLog.findMany({
          where: {
            aggregatorId: params.id,
            createdAt: { gte: startDate }
          },
          orderBy: { createdAt: 'desc' }
        })
        
        // Получаем транзакции
        const transactions = await db.transaction.findMany({
          where: {
            aggregatorId: params.id,
            createdAt: { gte: startDate }
          }
        })
        
        // Группируем статистику по дням
        const dailyStats: any = {}
        
        logs.forEach(log => {
          const date = log.createdAt.toISOString().split('T')[0]
          if (!dailyStats[date]) {
            dailyStats[date] = {
              date,
              totalRequests: 0,
              successfulRequests: 0,
              failedRequests: 0,
              avgResponseTime: 0,
              slaViolations: 0,
              responseTimes: []
            }
          }
          
          dailyStats[date].totalRequests++
          
          if (log.statusCode === 200 && !log.error) {
            dailyStats[date].successfulRequests++
          } else {
            dailyStats[date].failedRequests++
          }
          
          if (log.slaViolation) {
            dailyStats[date].slaViolations++
          }
          
          if (log.responseTimeMs) {
            dailyStats[date].responseTimes.push(log.responseTimeMs)
          }
        })
        
        // Вычисляем средние значения
        Object.values(dailyStats).forEach((day: any) => {
          if (day.responseTimes.length > 0) {
            day.avgResponseTime = Math.round(
              day.responseTimes.reduce((a: number, b: number) => a + b, 0) / day.responseTimes.length
            )
          }
          delete day.responseTimes
        })
        
        // Общая статистика
        const totalLogs = logs.length
        const successfulLogs = logs.filter(l => l.statusCode === 200 && !l.error).length
        const avgResponseTime = totalLogs > 0
          ? logs.reduce((sum, l) => sum + (l.responseTimeMs || 0), 0) / totalLogs
          : 0
        const slaViolations = logs.filter(l => l.slaViolation).length
        
        const totalTransactions = transactions.length
        const completedTransactions = transactions.filter(t => t.status === 'READY').length
        const totalVolume = transactions.reduce((sum, t) => sum + t.amount, 0)
        
        return {
          aggregator: serializeAggregator(aggregator),
          period: `${periodDays} days`,
          summary: {
            totalRequests: totalLogs,
            successfulRequests: successfulLogs,
            successRate: totalLogs > 0 ? ((successfulLogs / totalLogs) * 100).toFixed(2) : '0',
            avgResponseTime: avgResponseTime.toFixed(0),
            slaViolations,
            slaViolationRate: totalLogs > 0 ? ((slaViolations / totalLogs) * 100).toFixed(2) : '0',
            totalTransactions,
            completedTransactions,
            completionRate: totalTransactions > 0 
              ? ((completedTransactions / totalTransactions) * 100).toFixed(2) 
              : '0',
            totalVolume
          },
          dailyStats: Object.values(dailyStats).sort((a: any, b: any) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          ),
          recentLogs: logs.slice(0, 10).map(log => ({
            id: log.id,
            eventType: log.eventType,
            direction: log.direction,
            statusCode: log.statusCode,
            responseTimeMs: log.responseTimeMs,
            slaViolation: log.slaViolation,
            error: log.error,
            createdAt: log.createdAt.toISOString()
          }))
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Статистика агрегатора' },
        params: t.Object({
          id: t.String()
        }),
        query: t.Object({
          period: t.Optional(t.String())
        }),
        response: {
          404: ErrorSchema
        }
      }
    )

    /* ─────────── POST /admin/aggregators-v2/:id/test-deal ─────────── */
    .post(
      '/:id/test-deal',
      async ({ params, body, error }) => {
        const aggregator = await db.aggregator.findUnique({
          where: { id: params.id }
        })
        
        if (!aggregator) {
          return error(404, { error: 'Aggregator not found' })
        }
        
        const result = await aggregatorServiceV2.sendMockDeal(aggregator, {
          amount: body.amount,
          merchantRate: body.merchantRate,
          metadata: body.metadata
        })
        
        return result
      },
      {
        tags: ['admin'],
        detail: { summary: 'Отправка тестовой сделки агрегатору' },
        params: t.Object({
          id: t.String()
        }),
        body: t.Object({
          amount: t.Number(),
          merchantRate: t.Number(),
          metadata: t.Optional(t.Object({}, { additionalProperties: true }))
        }),
        response: {
          404: ErrorSchema
        }
      }
    )

    /* ─────────── GET /admin/aggregators-v2/stats/overview ─────────── */
    .get(
      '/stats/overview',
      async ({ query }) => {
        const periodDays = parseInt(query.period || '7')
        const stats = await fallbackRoutingService.getAggregatorStats(periodDays)
        
        return {
          period: `${periodDays} days`,
          aggregators: stats
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Общая статистика всех агрегаторов' },
        query: t.Object({
          period: t.Optional(t.String())
        })
      }
    )

    /* ─────────── POST /admin/aggregators-v2/update-priorities-auto ─────────── */
    .post(
      '/update-priorities-auto',
      async () => {
        await fallbackRoutingService.updateAggregatorPriorities()
        
        const aggregators = await db.aggregator.findMany({
          orderBy: { priority: 'asc' }
        })
        
        return {
          success: true,
          message: 'Priorities updated based on performance metrics',
          priorities: aggregators.map(a => ({
            id: a.id,
            name: a.name,
            priority: a.priority
          }))
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Автоматическое обновление приоритетов на основе метрик' }
      }
    )
