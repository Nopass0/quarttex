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
import aggregatorMerchantsRoutes from './aggregator-merchants'
import aggregatorSettlementsRoutes from './aggregator-settlements'

/* ───────────────────── helpers ───────────────────── */

/** Сериализация агрегатора */
const serializeAggregator = (aggregator: any) => ({
  ...aggregator,
  createdAt: aggregator.createdAt.toISOString(),
  updatedAt: aggregator.updatedAt.toISOString(),
  lastVolumeReset: aggregator.lastVolumeReset?.toISOString(),
  lastPriorityChangeAt: aggregator.lastPriorityChangeAt?.toISOString() || null,
  lastPriorityChangeBy: aggregator.lastPriorityChangeBy || null,
  maxDailyVolume: aggregator.maxDailyVolume || null,
  apiBaseUrl: aggregator.apiBaseUrl || null,
  customApiToken: aggregator.customApiToken || null,
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
  customApiToken: t.Union([t.String(), t.Null()]),
  apiBaseUrl: t.Union([t.String(), t.Null()]),
  balanceUsdt: t.Number(),
  isActive: t.Boolean(),
  priority: t.Number(),
  maxSlaMs: t.Number(),
  minBalance: t.Number(),
  maxDailyVolume: t.Union([t.Number(), t.Null()]),
  currentDailyVolume: t.Number(),
  lastVolumeReset: t.String(),
  twoFactorEnabled: t.Boolean(),
  isChaseProject: t.Boolean(),
  isChaseCompatible: t.Boolean(),
  createdAt: t.String(),
  updatedAt: t.String(),
  lastPriorityChangeBy: t.Union([t.String(), t.Null()]),
  lastPriorityChangeAt: t.Union([t.String(), t.Null()])
})

/* ───────────────────── routes ───────────────────── */

export default (app: Elysia) =>
  app
    
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
            ...(body.maxDailyVolume !== undefined && { maxDailyVolume: body.maxDailyVolume }),
            ...(body.customApiToken !== undefined && { customApiToken: body.customApiToken })
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
          maxDailyVolume: t.Optional(t.Number()),
          customApiToken: t.Optional(t.Union([t.String(), t.Null()]))
        }),
        response: {
          200: AggregatorResponseSchema,
          404: ErrorSchema
        }
      }
    )

    /* ─────────── GET /admin/aggregators-v2/:id ─────────── */
    .get(
      '/:id',
      async ({ params, error }) => {
        const aggregator = await db.aggregator.findUnique({
          where: { id: params.id },
          include: {
            _count: {
              select: {
                transactions: true,
                disputes: true,
                integrationLogs: true
              }
            }
          }
        })
        
        if (!aggregator) {
          return error(404, { error: 'Aggregator not found' })
        }
        
        return serializeAggregator(aggregator)
      },
      {
        tags: ['admin'],
        detail: { summary: 'Получение деталей агрегатора' },
        params: t.Object({
          id: t.String()
        }),
        response: {
          200: AggregatorResponseSchema,
          404: ErrorSchema
        }
      }
    )

    /* ─────────── PUT /admin/aggregators-v2/:id ─────────── */
    .put(
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
            ...(body.maxDailyVolume !== undefined && { maxDailyVolume: body.maxDailyVolume }),
            ...(body.customApiToken !== undefined && { customApiToken: body.customApiToken }),
            ...(body.requiresInsuranceDeposit !== undefined && { requiresInsuranceDeposit: body.requiresInsuranceDeposit }),
            ...(body.isChaseProject !== undefined && { isChaseProject: body.isChaseProject }),
            ...(body.isChaseCompatible !== undefined && { isChaseCompatible: body.isChaseCompatible })
          }
        })
        
        return serializeAggregator(updated)
      },
      {
        tags: ['admin'],
        detail: { summary: 'Полное обновление настроек агрегатора' },
        params: t.Object({
          id: t.String()
        }),
        body: t.Object({
          name: t.Optional(t.String()),
          apiBaseUrl: t.Optional(t.String()),
          isActive: t.Optional(t.Boolean()),
          maxSlaMs: t.Optional(t.Number()),
          minBalance: t.Optional(t.Number()),
          maxDailyVolume: t.Optional(t.Number()),
          customApiToken: t.Optional(t.Union([t.String(), t.Null()])),
          requiresInsuranceDeposit: t.Optional(t.Boolean()),
          isChaseProject: t.Optional(t.Boolean()),
          isChaseCompatible: t.Optional(t.Boolean())
        }),
        response: {
          200: AggregatorResponseSchema,
          404: ErrorSchema
        }
      }
    )

    /* ─────────── GET /admin/aggregators-v2/:id/transactions ─────────── */
    .get(
      '/:id/transactions',
      async ({ params, query, error }) => {
        const aggregator = await db.aggregator.findUnique({
          where: { id: params.id }
        })
        
        if (!aggregator) {
          return error(404, { error: 'Aggregator not found' })
        }
        
        const limit = Math.min(query.limit || 100, 1000)
        const offset = query.offset || 0
        
        const transactions = await db.transaction.findMany({
          where: {
            aggregatorId: params.id
          },
          include: {
            merchant: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: limit,
          skip: offset
        })
        
        const total = await db.transaction.count({
          where: {
            aggregatorId: params.id
          }
        })
        
        return {
          transactions: transactions.map(tx => ({
            id: tx.id,
            numericId: tx.numericId,
            amount: tx.amount,
            status: tx.status,
            createdAt: tx.createdAt.toISOString(),
            merchant: tx.merchant
          })),
          total,
          limit,
          offset
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Получение транзакций агрегатора' },
        params: t.Object({
          id: t.String()
        }),
        query: t.Object({
          limit: t.Optional(t.Number({ minimum: 1, maximum: 1000 })),
          offset: t.Optional(t.Number({ minimum: 0 }))
        }),
        response: {
          200: t.Object({
            transactions: t.Array(t.Object({
              id: t.String(),
              numericId: t.Number(),
              amount: t.Number(),
              status: t.String(),
              createdAt: t.String(),
              merchant: t.Object({
                id: t.String(),
                name: t.String()
              })
            })),
            total: t.Number(),
            limit: t.Number(),
            offset: t.Number()
          }),
          404: ErrorSchema
        }
      }
    )

    /* ─────────── GET /admin/aggregators-v2/:id/metrics ─────────── */
    .get(
      '/:id/metrics',
      async ({ params, error }) => {
        const aggregator = await db.aggregator.findUnique({
          where: { id: params.id }
        })
        
        if (!aggregator) {
          return error(404, { error: 'Aggregator not found' })
        }
        
        // Получаем статистику по транзакциям
        const [totalTransactions, successTransactions, inProgressTransactions, expiredTransactions, failedDealCreateLogs, successTransactionsData] = await Promise.all([
          db.transaction.count({
            where: { aggregatorId: params.id }
          }),
          db.transaction.count({
            where: { 
              aggregatorId: params.id,
              status: 'READY'
            }
          }),
          db.transaction.count({
            where: { 
              aggregatorId: params.id,
              status: 'IN_PROGRESS'
            }
          }),
          db.transaction.count({
            where: { 
              aggregatorId: params.id,
              status: 'EXPIRED'
            }
          }),
          db.aggregatorIntegrationLog.findMany({
            where: { 
              aggregatorId: params.id,
              eventType: { 
                in: ['deal_create', 'chase_deal_create', 'pspware_deal_create', 'deal_routed_from_merchant', 'deal_routed']
              },
              direction: 'OUT',
              OR: [
                { statusCode: { not: 200 } },
                { error: { not: null } }
              ]
            },
            select: {
              requestBody: true,
              createdAt: true
            }
          }),
          db.transaction.findMany({
            where: { 
              aggregatorId: params.id,
              status: 'READY'
            },
            select: {
              amount: true,
              rate: true,
              commission: true,
              methodId: true
            }
          })
        ])
        
        // Вычисляем USDT эквиваленты для каждого типа баланса
        const balanceNoRequisite = failedDealCreateLogs.reduce((sum, log) => {
          // Извлекаем сумму и курс из requestBody
          const requestBody = log.requestBody as any;
          if (requestBody && requestBody.amount && requestBody.rate) {
            const usdtAmount = requestBody.rate > 0 ? requestBody.amount / requestBody.rate : 0;
            return sum + usdtAmount;
          }
          return sum;
        }, 0);
        
        // Получаем данные для расчета балансов
        const [expiredTransactionsData, inProgressTransactionsData] = await Promise.all([
          db.transaction.findMany({
            where: { 
              aggregatorId: params.id,
              status: 'EXPIRED'
            },
            select: {
              amount: true,
              rate: true
            }
          }),
          db.transaction.findMany({
            where: { 
              aggregatorId: params.id,
              status: 'IN_PROGRESS'
            },
            select: {
              amount: true,
              rate: true
            }
          })
        ]);
        
        const balanceExpired = expiredTransactionsData.reduce((sum, tx) => {
          const usdtAmount = tx.rate && tx.rate > 0 ? tx.amount / tx.rate : 0;
          return sum + usdtAmount;
        }, 0);
        
        const balanceInProgress = inProgressTransactionsData.reduce((sum, tx) => {
          const usdtAmount = tx.rate && tx.rate > 0 ? tx.amount / tx.rate : 0;
          return sum + usdtAmount;
        }, 0);
        
        const balanceSuccess = successTransactionsData.reduce((sum, tx) => {
          const usdtAmount = tx.rate && tx.rate > 0 ? tx.amount / tx.rate : 0;
          return sum + usdtAmount;
        }, 0);
        
        // Получаем данные для расчета прибыли
        const [methods, aggregatorMerchants] = await Promise.all([
          db.method.findMany({
            where: { 
              id: { in: [...new Set(successTransactionsData.map(tx => tx.methodId))] }
            }
          }),
          db.aggregatorMerchant.findMany({
            where: { aggregatorId: params.id },
            select: { 
              merchantId: true, 
              methodId: true, 
              feeIn: true,
              feeRanges: {
                where: { isActive: true },
                orderBy: { minAmount: 'asc' }
              }
            }
          })
        ]);
        
        const methodCommissionMap = methods.reduce((map, method) => {
          map[method.id] = method.commissionPayin;
          return map;
        }, {} as Record<string, number>);
        
        const aggregatorMerchantMap = aggregatorMerchants.reduce((map: Record<string, any>, am: any) => {
          const key = `${am.merchantId}-${am.methodId}`;
          map[key] = am;
          return map;
        }, {} as Record<string, any>);
        
        // Получаем данные о мерчантах для транзакций
        const transactionMerchants = await db.transaction.findMany({
          where: { 
            aggregatorId: params.id,
            status: 'READY'
          },
          select: {
            id: true,
            merchantId: true,
            methodId: true,
            amount: true,
            rate: true,
            // Новые поля для прибыли
            merchantProfit: true,
            aggregatorProfit: true,
            platformProfit: true,
            merchantFeeInPercent: true,
            aggregatorFeeInPercent: true,
            usdtRubRate: true
          }
        });
        
        // Вычисляем реальную прибыль платформы из сохраненных данных
        const totalPlatformProfit = transactionMerchants.reduce((sum, tx) => {
          // Используем сохраненную прибыль платформы, если она есть
          if (tx.platformProfit !== null && tx.platformProfit !== undefined) {
            return sum + tx.platformProfit;
          }
          
          // Fallback к старому расчету, если данные не сохранены
          if (!tx.rate || tx.rate <= 0) return sum;
          
          // USDT эквивалент рублевой суммы
          const usdtAmount = tx.amount / tx.rate;
          
          // Комиссия на вход для этого метода (ценник от мерчанта)
          const merchantCommissionPercent = methodCommissionMap[tx.methodId] || 0;
          const merchantFee = usdtAmount * (merchantCommissionPercent / 100);
          
          // Ставка агрегатора для этого мерчанта и метода
          const aggregatorMerchantKey = `${tx.merchantId}-${tx.methodId}`;
          const aggregatorMerchant = aggregatorMerchantMap[aggregatorMerchantKey];
          
          let aggregatorFee = 0;
          if (aggregatorMerchant) {
            // Проверяем, есть ли гибкие ставки
            if (aggregatorMerchant.feeRanges && aggregatorMerchant.feeRanges.length > 0) {
              // Ищем подходящий диапазон по рублевой сумме
              const applicableRange = aggregatorMerchant.feeRanges.find((range: any) => 
                tx.amount >= range.minAmount && tx.amount <= range.maxAmount
              );
              if (applicableRange) {
                aggregatorFee = usdtAmount * (applicableRange.feeInPercent / 100);
              } else {
                // Если нет подходящего диапазона, используем базовую ставку
                aggregatorFee = usdtAmount * (aggregatorMerchant.feeIn / 100);
              }
            } else {
              // Используем базовую ставку
              aggregatorFee = usdtAmount * (aggregatorMerchant.feeIn / 100);
            }
          }
          
          // Прибыль с одной сделки = ценник от мерчанта - ценник от агрегатора
          const profitFromTransaction = merchantFee - aggregatorFee;
          
          return sum + profitFromTransaction;
        }, 0);
        
        const successRate = totalTransactions > 0 
          ? (successTransactions / totalTransactions) * 100 
          : 0

        // Рассчитываем USDT метрики
        let totalUsdtIn = 0;
        let totalUsdtOut = 0;

        // Вход в USDT - сумма, которую мы отдали трафик (с учетом % от агрегатора)
        for (const tx of transactionMerchants) {
          if (tx.platformProfit !== null && tx.platformProfit !== undefined) {
            // Используем сохраненные данные
            const usdtAmount = tx.amount / (tx.usdtRubRate || tx.rate || 100);
            const aggregatorFee = usdtAmount * ((tx.aggregatorFeeInPercent || 0) / 100);
            totalUsdtIn += usdtAmount - aggregatorFee; // Сумма, которую нам должен засетлить провайдер
          } else {
            // Fallback к старому расчету
            if (tx.rate && tx.rate > 0) {
              const usdtAmount = tx.amount / tx.rate;
              const aggregatorMerchantKey = `${tx.merchantId}-${tx.methodId}`;
              const aggregatorMerchant = aggregatorMerchantMap[aggregatorMerchantKey];
              
              if (aggregatorMerchant) {
                let aggregatorFee = 0;
                if (aggregatorMerchant.feeRanges && aggregatorMerchant.feeRanges.length > 0) {
                  const applicableRange = aggregatorMerchant.feeRanges.find((range: any) => 
                    tx.amount >= range.minAmount && tx.amount <= range.maxAmount
                  );
                  if (applicableRange) {
                    aggregatorFee = usdtAmount * (applicableRange.feeInPercent / 100);
                  } else {
                    aggregatorFee = usdtAmount * (aggregatorMerchant.feeIn / 100);
                  }
                } else {
                  aggregatorFee = usdtAmount * (aggregatorMerchant.feeIn / 100);
                }
                totalUsdtIn += usdtAmount - aggregatorFee;
              } else {
                totalUsdtIn += usdtAmount;
              }
            }
          }
        }

        // Выход в USDT - сумма, которую провайдер провел выплаты (с учетом % от агрегатора)
        // Пока используем тот же расчет, что и для входа, так как это одна и та же сумма
        totalUsdtOut = totalUsdtIn;

        // Разница между входом и выходом
        const usdtDifference = totalUsdtIn - totalUsdtOut;
        
        return {
          balanceUsdt: aggregator.balanceUsdt,
          depositUsdt: aggregator.depositUsdt,
          balanceNoRequisite: Math.round(balanceNoRequisite * 100) / 100, // Округляем до 2 знаков
          balanceSuccess: Math.round(balanceSuccess * 100) / 100,
          balanceExpired: Math.round(balanceExpired * 100) / 100,
          balanceInProgress: Math.round(balanceInProgress * 100) / 100,
          totalPlatformProfit: Math.round(totalPlatformProfit * 100) / 100,
          totalUsdtIn: Math.round(totalUsdtIn * 100) / 100,
          totalUsdtOut: Math.round(totalUsdtOut * 100) / 100,
          usdtDifference: Math.round(usdtDifference * 100) / 100,
          totalTransactions,
          successRate: Math.round(successRate * 100) / 100, // Округляем до 2 знаков
          successTransactions,
          inProgressTransactions,
          expiredTransactions,
          noRequisiteTransactions: failedDealCreateLogs.length, // Количество неуспешных API запросов
          requiresInsuranceDeposit: aggregator.requiresInsuranceDeposit
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Получение метрик агрегатора' },
        params: t.Object({
          id: t.String()
        }),
        response: {
          200: t.Object({
            balanceUsdt: t.Number(),
            depositUsdt: t.Number(),
            balanceNoRequisite: t.Number(),
            balanceSuccess: t.Number(),
            balanceExpired: t.Number(),
            balanceInProgress: t.Number(),
            totalPlatformProfit: t.Number(),
            totalTransactions: t.Number(),
            successRate: t.Number(),
            successTransactions: t.Number(),
            inProgressTransactions: t.Number(),
            expiredTransactions: t.Number(),
            noRequisiteTransactions: t.Number(),
            requiresInsuranceDeposit: t.Boolean()
          }),
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
    
    // Добавляем маршруты для управления мерчантами агрегаторов
    .group('/:id', app => app.use(aggregatorMerchantsRoutes))
    
    // Добавляем маршруты для управления сеттлами агрегаторов
    .group('/:id', app => app.use(aggregatorSettlementsRoutes))
