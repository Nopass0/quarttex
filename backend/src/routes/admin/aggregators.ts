/**
 * admin/aggregators.ts
 * ---------------------------------------------------------------------------
 * Административные маршруты для управления агрегаторами.
 *
 * ▸ Elysia + Prisma + TypeBox (t)
 * ▸ Создание/редактирование/удаление агрегаторов
 * ▸ Включение/выключение агрегаторов
 * ▸ Просмотр баланса и статистики
 * ▸ Управление токенами API
 * ▸ Просмотр логов интеграций
 * ---------------------------------------------------------------------------
 */

import { Elysia, t } from 'elysia'
import { db } from '@/db'
import { Prisma, AggregatorApiSchema, PSPWareRandomizationType } from '@prisma/client'
import ErrorSchema from '@/types/error'
import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'

/* ───────────────────── helpers ───────────────────── */

/** Генерация API токена */
const generateApiToken = () => randomBytes(32).toString('hex')

/** Генерация пароля */
const generatePassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

/** Сериализация агрегатора */
const serializeAggregator = (aggregator: any) => ({
  ...aggregator,
  createdAt: aggregator.createdAt.toISOString(),
  updatedAt: aggregator.updatedAt.toISOString(),
  customApiToken: aggregator.customApiToken || null,
  apiSchema: aggregator.apiSchema || 'DEFAULT',
  // Сериализуем транзакции если они есть
  transactions: aggregator.transactions?.map((tx: any) => ({
    ...tx,
    createdAt: tx.createdAt.toISOString()
  })),
  // Не возвращаем пароль и 2FA секрет
  password: undefined,
  twoFactorSecret: undefined
})

/* ───────────────────── reusable schemas ───────────────────── */

const AggregatorResponseSchema = t.Object({
  id: t.String(),
  email: t.String(),
  name: t.String(),
  apiToken: t.String(),
  customApiToken: t.Union([t.String(), t.Null()]),
  apiBaseUrl: t.Union([t.String(), t.Null()]),
  apiSchema: t.String(),
  balanceUsdt: t.Number(),
  isActive: t.Boolean(),
  twoFactorEnabled: t.Boolean(),
  createdAt: t.String(),
  updatedAt: t.String()
})

const AggregatorDetailResponseSchema = t.Object({
  id: t.String(),
  email: t.String(),
  name: t.String(),
  apiToken: t.String(),
  customApiToken: t.Union([t.String(), t.Null()]),
  apiBaseUrl: t.Union([t.String(), t.Null()]),
  apiSchema: t.String(),
  balanceUsdt: t.Number(),
  isActive: t.Boolean(),
  twoFactorEnabled: t.Boolean(),
  createdAt: t.String(),
  updatedAt: t.String(),
  _count: t.Object({
    transactions: t.Number(),
    disputes: t.Number(),
    sessions: t.Number(),
    apiLogs: t.Number()
  }),
  transactions: t.Array(t.Object({
    id: t.String(),
    numericId: t.Number(),
    amount: t.Number(),
    status: t.String(),
    createdAt: t.String(),
    merchant: t.Object({
      name: t.String()
    })
  }))
})

const AuthHeaderSchema = t.Object({ 'x-admin-key': t.String() })

/* ───────────────────── router ───────────────────── */

export default (app: Elysia) =>
  app
    /* ─────────── GET /admin/aggregators ─────────── */
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

        const orderBy: Record<string, 'asc' | 'desc'> = {}
        if (query.sortBy) {
          orderBy[query.sortBy] = query.sortOrder === 'desc' ? 'desc' : 'asc'
        } else {
          orderBy.createdAt = 'desc'
        }

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
                  sessions: true
                }
              }
            }
          }),
          db.aggregator.count({ where })
        ])

        return {
          data: aggregators.map(serializeAggregator),
          meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Список агрегаторов' },
        headers: AuthHeaderSchema,
        query: t.Object({
          page: t.Optional(t.String()),
          limit: t.Optional(t.String()),
          search: t.Optional(t.String()),
          isActive: t.Optional(t.String()),
          sortBy: t.Optional(t.String()),
          sortOrder: t.Optional(t.String())
        }),
        response: {
          200: t.Object({
            data: t.Array(t.Intersect([
              AggregatorResponseSchema,
              t.Object({
                _count: t.Object({
                  transactions: t.Number(),
                  disputes: t.Number(),
                  sessions: t.Number()
                })
              })
            ])),
            meta: t.Object({
              total: t.Number(),
              page: t.Number(),
              limit: t.Number(),
              totalPages: t.Number()
            })
          })
        }
      }
    )

    /* ─────────── POST /admin/aggregators ─────────── */
    .post(
      '/',
      async ({ body, error }) => {
        try {
          // Проверяем уникальность email
          const existingAggregator = await db.aggregator.findUnique({
            where: { email: body.email }
          })
          if (existingAggregator) {
            return error(409, { error: 'Агрегатор с таким email уже существует' })
          }

          // Генерируем пароль и токены
          const password = generatePassword()
          const hashedPassword = await bcrypt.hash(password, 10)
          const apiToken = generateApiToken()
          const callbackToken = generateApiToken() // Генерируем callback токен

          const aggregator = await db.aggregator.create({
            data: {
              email: body.email,
              name: body.name,
              password: hashedPassword,
              apiToken,
              callbackToken, // Добавляем обязательное поле
              apiBaseUrl: body.apiBaseUrl,
              isActive: body.isActive ?? true,
              balanceUsdt: body.balanceUsdt || 0,
              // PSPWare поля
              apiSchema: body.isPSPWare ? AggregatorApiSchema.PSPWARE : AggregatorApiSchema.DEFAULT,
              pspwareApiKey: body.pspwareApiKey || null,
              enableRandomization: body.enableRandomization || false,
              randomizationType: body.randomizationType || PSPWareRandomizationType.NONE,
              // Chase project поле
              isChaseProject: body.isChaseProject || false
            }
          })

          // Возвращаем с сгенерированным паролем (только при создании)
          return {
            ...serializeAggregator(aggregator),
            generatedPassword: password
          }
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError) {
            if (e.code === 'P2002') {
              return error(409, { error: 'Email уже используется' })
            }
          }
          console.error('Error creating aggregator:', e)
          return error(500, { error: 'Ошибка создания агрегатора' })
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Создание агрегатора' },
        headers: AuthHeaderSchema,
        body: t.Object({
          email: t.String({ format: 'email', description: 'Email агрегатора' }),
          name: t.String({ description: 'Название агрегатора' }),
          apiBaseUrl: t.Optional(t.Union([t.String({ description: 'Базовый URL API агрегатора' }), t.Null()])),
          isActive: t.Optional(t.Boolean()),
          balanceUsdt: t.Optional(t.Number()),
          // PSPWare поля
          isPSPWare: t.Optional(t.Boolean({ description: 'Использует PSPWare API схему' })),
          pspwareApiKey: t.Optional(t.String({ description: 'API ключ PSPWare' })),
          enableRandomization: t.Optional(t.Boolean({ description: 'Включить рандомизацию сумм' })),
          randomizationType: t.Optional(t.Union([
            t.Literal('FULL'),
            t.Literal('PARTIAL'),
            t.Literal('NONE')
          ], { description: 'Тип рандомизации' })),
          // Chase project поле
          isChaseProject: t.Optional(t.Boolean({ description: 'Это другой экземпляр Chase' }))
        }),
        response: {
          201: t.Intersect([
            AggregatorResponseSchema,
            t.Object({ generatedPassword: t.String() })
          ]),
          409: ErrorSchema,
          500: ErrorSchema
        }
      }
    )

    /* ─────────── GET /admin/aggregators/:id ─────────── */
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
                sessions: true,
                apiLogs: true
              }
            },
            transactions: {
              take: 5,
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                numericId: true,
                amount: true,
                status: true,
                createdAt: true,
                merchant: { select: { name: true } }
              }
            }
          }
        })

        if (!aggregator) {
          return error(404, { error: 'Агрегатор не найден' })
        }

        return serializeAggregator(aggregator)
      },
      {
        tags: ['admin'],
        detail: { summary: 'Получить агрегатора по ID' },
        headers: AuthHeaderSchema,
        params: t.Object({ id: t.String() }),
        response: {
          200: AggregatorDetailResponseSchema,
          404: ErrorSchema
        }
      }
    )

    /* ─────────── PATCH /admin/aggregators/:id ─────────── */
    .patch(
      '/:id',
      async ({ params, body, error }) => {
        try {
          const updateData: Prisma.AggregatorUpdateInput = {}

          if (body.name) updateData.name = body.name
          if (body.email) updateData.email = body.email
          if (body.apiBaseUrl !== undefined) updateData.apiBaseUrl = body.apiBaseUrl
          if (body.isActive !== undefined) updateData.isActive = body.isActive
          if (body.balanceUsdt !== undefined) updateData.balanceUsdt = body.balanceUsdt
          if (body.customApiToken !== undefined) updateData.customApiToken = body.customApiToken
          // PSPWare поля
          if (body.isPSPWare !== undefined) updateData.apiSchema = body.isPSPWare ? AggregatorApiSchema.PSPWARE : AggregatorApiSchema.DEFAULT
          if (body.pspwareApiKey !== undefined) updateData.pspwareApiKey = body.pspwareApiKey
          if (body.enableRandomization !== undefined) updateData.enableRandomization = body.enableRandomization
          if (body.randomizationType !== undefined) updateData.randomizationType = body.randomizationType
          if (body.isChaseProject !== undefined) updateData.isChaseProject = body.isChaseProject

          const aggregator = await db.aggregator.update({
            where: { id: params.id },
            data: updateData
          })

          return serializeAggregator(aggregator)
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError) {
            if (e.code === 'P2025') {
              return error(404, { error: 'Агрегатор не найден' })
            }
            if (e.code === 'P2002') {
              return error(409, { error: 'Email уже используется' })
            }
          }
          console.error('Error updating aggregator:', e)
          return error(500, { error: 'Ошибка обновления агрегатора' })
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Обновление агрегатора' },
        headers: AuthHeaderSchema,
        params: t.Object({ id: t.String() }),
        body: t.Partial(t.Object({
          email: t.String({ format: 'email' }),
          name: t.String(),
          apiBaseUrl: t.Union([t.String(), t.Null()]),
          isActive: t.Boolean(),
          balanceUsdt: t.Number(),
          customApiToken: t.Union([t.String(), t.Null()]),
          // PSPWare поля
          isPSPWare: t.Boolean({ description: 'Использует PSPWare API схему' }),
          pspwareApiKey: t.String({ description: 'API ключ PSPWare' }),
          enableRandomization: t.Boolean({ description: 'Включить рандомизацию сумм' }),
          randomizationType: t.Union([
            t.Literal('FULL'),
            t.Literal('PARTIAL'),
            t.Literal('NONE')
          ], { description: 'Тип рандомизации' }),
          // Chase project поле
          isChaseProject: t.Boolean({ description: 'Это другой экземпляр Chase' })
        })),
        response: {
          200: AggregatorResponseSchema,
          404: ErrorSchema,
          409: ErrorSchema,
          500: ErrorSchema
        }
      }
    )

    /* ─────────── POST /admin/aggregators/:id/regenerate-token ─────────── */
    .post(
      '/:id/regenerate-token',
      async ({ params, error }) => {
        try {
          const newToken = generateApiToken()

          const aggregator = await db.aggregator.update({
            where: { id: params.id },
            data: { apiToken: newToken }
          })

          return {
            ...serializeAggregator(aggregator),
            newToken
          }
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
            return error(404, { error: 'Агрегатор не найден' })
          }
          console.error('Error regenerating token:', e)
          return error(500, { error: 'Ошибка перегенерации токена' })
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Перегенерация API токена' },
        headers: AuthHeaderSchema,
        params: t.Object({ id: t.String() }),
        response: {
          200: t.Intersect([
            AggregatorResponseSchema,
            t.Object({ newToken: t.String() })
          ]),
          404: ErrorSchema,
          500: ErrorSchema
        }
      }
    )

    /* ─────────── POST /admin/aggregators/:id/reset-password ─────────── */
    .post(
      '/:id/reset-password',
      async ({ params, error }) => {
        try {
          const newPassword = generatePassword()
          const hashedPassword = await bcrypt.hash(newPassword, 10)

          await db.aggregator.update({
            where: { id: params.id },
            data: { 
              password: hashedPassword,
              // Отключаем 2FA при сбросе пароля
              twoFactorEnabled: false,
              twoFactorSecret: null
            }
          })

          // Удаляем все активные сессии
          await db.aggregatorSession.deleteMany({
            where: { aggregatorId: params.id }
          })

          return { newPassword }
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
            return error(404, { error: 'Агрегатор не найден' })
          }
          console.error('Error resetting password:', e)
          return error(500, { error: 'Ошибка сброса пароля' })
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Сброс пароля агрегатора' },
        headers: AuthHeaderSchema,
        params: t.Object({ id: t.String() }),
        response: {
          200: t.Object({ newPassword: t.String() }),
          404: ErrorSchema,
          500: ErrorSchema
        }
      }
    )

    /* ─────────── GET /admin/aggregators/:id/api-logs ─────────── */
    .get(
      '/:id/api-logs',
      async ({ params, query, error }) => {
        const where: Prisma.AggregatorIntegrationLogWhereInput = {
          aggregatorId: params.id
        }

        if (query.endpoint) {
          where.url = { contains: query.endpoint, mode: 'insensitive' }
        }

        if (query.method) {
          where.method = query.method
        }

        if (query.hasError !== undefined) {
          if (query.hasError === 'true') {
            where.error = { not: null }
          } else {
            where.error = null
          }
        }

        const page = Number(query.page) || 1
        const limit = Number(query.limit) || 50
        const skip = (page - 1) * limit

        try {
          const [logs, total] = await Promise.all([
            db.aggregatorIntegrationLog.findMany({
              where,
              orderBy: { createdAt: 'desc' },
              skip,
              take: limit
            }),
            db.aggregatorIntegrationLog.count({ where })
          ])

          return {
            data: logs.map(log => ({
              id: log.id,
              endpoint: log.url,
              method: log.method,
              requestData: log.requestBody,
              responseData: log.responseBody,
              headers: log.headers,
              statusCode: log.statusCode || undefined,
              error: log.error || undefined,
              duration: log.responseTimeMs || undefined,
              eventType: log.eventType,
              direction: log.direction,
              slaViolation: log.slaViolation,
              ourDealId: log.ourDealId,
              partnerDealId: log.partnerDealId,
              createdAt: log.createdAt.toISOString()
            })),
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
          }
        } catch (e) {
          console.error('Error getting API logs:', e)
          return error(500, { error: 'Ошибка получения логов API' })
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Логи API интеграций агрегатора' },
        headers: AuthHeaderSchema,
        params: t.Object({ id: t.String() }),
        query: t.Object({
          page: t.Optional(t.String()),
          limit: t.Optional(t.String()),
          endpoint: t.Optional(t.String()),
          method: t.Optional(t.String()),
          hasError: t.Optional(t.String())
        }),
        response: {
          200: t.Object({
            data: t.Array(t.Object({
              id: t.String(),
              endpoint: t.String(),
              method: t.String(),
              requestData: t.Any(),
              responseData: t.Any(),
              headers: t.Any(),
              statusCode: t.Optional(t.Number()),
              error: t.Optional(t.String()),
              duration: t.Optional(t.Number()),
              createdAt: t.String()
            })),
            meta: t.Object({
              total: t.Number(),
              page: t.Number(),
              limit: t.Number(),
              totalPages: t.Number()
            })
          }),
          500: ErrorSchema
        }
      }
    )

    /* ─────────── POST /admin/aggregators/:id/deposit ─────────── */
    .post(
      '/:id/deposit',
      async ({ params, body, error }) => {
        try {
          const { aggregatorMetricsService } = await import('@/services/aggregator-metrics.service');
          
          const aggregator = await db.aggregator.findUnique({
            where: { id: params.id }
          })

          if (!aggregator) {
            return error(404, { error: 'Агрегатор не найден' })
          }

          // Определяем тип пополнения
          if (body.type === 'deposit') {
            await aggregatorMetricsService.addDeposit(params.id, body.amount);
            const updated = await db.aggregator.findUnique({
              where: { id: params.id }
            });
            return {
              success: true,
              message: `Депозит агрегатора пополнен на ${body.amount} USDT`,
              newDeposit: updated?.depositUsdt || 0
            }
          } else {
            await aggregatorMetricsService.addBalance(params.id, body.amount);
            const updated = await db.aggregator.findUnique({
              where: { id: params.id }
            });
            return {
              success: true,
              message: `Баланс агрегатора пополнен на ${body.amount} USDT`,
              newBalance: updated?.balanceUsdt || 0
            }
          }
        } catch (e) {
          console.error('Error adding deposit to aggregator:', e)
          return error(500, { error: 'Ошибка пополнения агрегатора' })
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Пополнение баланса или депозита агрегатора' },
        headers: AuthHeaderSchema,
        params: t.Object({ id: t.String() }),
        body: t.Object({
          amount: t.Number({ minimum: 0.01 }),
          type: t.Optional(t.Union([t.Literal('balance'), t.Literal('deposit')], { default: 'balance' }))
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            message: t.String(),
            newBalance: t.Optional(t.Number()),
            newDeposit: t.Optional(t.Number())
          }),
          404: ErrorSchema,
          500: ErrorSchema
        }
      }
    )

    /* ─────────── POST /admin/aggregators/:id/balance ─────────── */
    .post(
      '/:id/balance',
      async ({ params, body, error }) => {
        try {
          const amount = body.amount;
          if (amount <= 0) {
            return error(400, { error: 'Сумма должна быть положительной' });
          }

          const aggregator = await db.aggregator.update({
            where: { id: params.id },
            data: {
              balanceUsdt: { increment: amount }
            }
          });

          return {
            success: true,
            message: `Баланс пополнен на ${amount} USDT`,
            balanceUsdt: aggregator.balanceUsdt
          };
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
            return error(404, { error: 'Агрегатор не найден' })
          }
          console.error('Error adding balance:', e)
          return error(500, { error: 'Ошибка пополнения баланса' })
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Пополнение основного баланса агрегатора' },
        headers: AuthHeaderSchema,
        params: t.Object({ id: t.String() }),
        body: t.Object({
          amount: t.Number({ minimum: 0.01 }),
          description: t.Optional(t.String())
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            message: t.String(),
            balanceUsdt: t.Number()
          }),
          400: ErrorSchema,
          404: ErrorSchema,
          500: ErrorSchema
        }
      }
    )

    /* ─────────── GET /admin/aggregators/:id/metrics ─────────── */
    .get(
      '/:id/metrics',
      async ({ params, error }) => {
        try {
          const { aggregatorMetricsService } = await import('@/services/aggregator-metrics.service');
          const metrics = await aggregatorMetricsService.getAggregatorMetrics(params.id);
          return metrics;
        } catch (e) {
          console.error('Error getting aggregator metrics:', e)
          return error(500, { error: 'Ошибка получения метрик агрегатора' })
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Получение метрик агрегатора' },
        headers: AuthHeaderSchema,
        params: t.Object({ id: t.String() }),
        response: {
          200: t.Object({
            balanceUsdt: t.Number(),
            depositUsdt: t.Number(),
            balanceNoRequisite: t.Number(),
            balanceSuccess: t.Number(),
            balanceExpired: t.Number(),
            totalPlatformProfit: t.Number(),
            totalTransactions: t.Number(),
            successRate: t.Number()
          }),
          500: ErrorSchema
        }
      }
    )

    /* ─────────── GET /admin/aggregators/:id/method-fees ─────────── */
    .get(
      '/:id/method-fees',
      async ({ params, error }) => {
        try {
          const fees = await db.aggregatorMethodFee.findMany({
            where: { aggregatorId: params.id },
            include: {
              method: true
            }
          });

          return {
            fees: fees.map(fee => ({
              id: fee.id,
              methodId: fee.methodId,
              methodName: fee.method.name,
              methodCode: fee.method.code,
              feePercent: fee.feePercent,
              isActive: fee.isActive
            }))
          };
        } catch (e) {
          console.error('Error getting method fees:', e)
          return error(500, { error: 'Ошибка получения процентных ставок' })
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Получение процентных ставок по методам' },
        headers: AuthHeaderSchema,
        params: t.Object({ id: t.String() }),
        response: {
          200: t.Object({
            fees: t.Array(t.Object({
              id: t.String(),
              methodId: t.String(),
              methodName: t.String(),
              methodCode: t.String(),
              feePercent: t.Number(),
              isActive: t.Boolean()
            }))
          }),
          500: ErrorSchema
        }
      }
    )

    /* ─────────── POST /admin/aggregators/:id/method-fees ─────────── */
    .post(
      '/:id/method-fees',
      async ({ params, body, error }) => {
        try {
          const fee = await db.aggregatorMethodFee.upsert({
            where: {
              aggregatorId_methodId: {
                aggregatorId: params.id,
                methodId: body.methodId
              }
            },
            update: {
              feePercent: body.feePercent,
              isActive: body.isActive ?? true
            },
            create: {
              aggregatorId: params.id,
              methodId: body.methodId,
              feePercent: body.feePercent,
              isActive: body.isActive ?? true
            }
          });

          return { success: true, fee };
        } catch (e) {
          console.error('Error setting method fee:', e)
          return error(500, { error: 'Ошибка установки процентной ставки' })
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Установка процентной ставки для метода' },
        headers: AuthHeaderSchema,
        params: t.Object({ id: t.String() }),
        body: t.Object({
          methodId: t.String(),
          feePercent: t.Number({ minimum: 0, maximum: 100 }),
          isActive: t.Optional(t.Boolean())
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            fee: t.Object({
              id: t.String(),
              aggregatorId: t.String(),
              methodId: t.String(),
              feePercent: t.Number(),
              isActive: t.Boolean()
            })
          }),
          500: ErrorSchema
        }
      }
    )

    /* ─────────── POST /admin/aggregators/:id/rate-source ─────────── */
    .post(
      '/:id/rate-source',
      async ({ params, body, error }) => {
        try {
          const rateSource = await db.aggregatorRateSource.upsert({
            where: {
              aggregatorId: params.id
            },
            update: {
              rateSourceId: body.rateSourceId,
              kkkPercent: body.kkkPercent,
              kkkOperation: body.kkkOperation,
              isActive: body.isActive ?? true
            },
            create: {
              aggregatorId: params.id,
              rateSourceId: body.rateSourceId,
              kkkPercent: body.kkkPercent,
              kkkOperation: body.kkkOperation,
              isActive: body.isActive ?? true
            }
          });

          return { success: true, rateSource };
        } catch (e) {
          console.error('Error setting rate source:', e)
          return error(500, { error: 'Ошибка установки источника курса' })
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Установка источника курса для агрегатора' },
        headers: AuthHeaderSchema,
        params: t.Object({ id: t.String() }),
        body: t.Object({
          rateSourceId: t.String(),
          kkkPercent: t.Number({ minimum: -100, maximum: 100 }),
          kkkOperation: t.Union([t.Literal('PLUS'), t.Literal('MINUS')]),
          isActive: t.Optional(t.Boolean())
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            rateSource: t.Object({
              id: t.String(),
              aggregatorId: t.String(),
              rateSourceId: t.String(),
              kkkPercent: t.Number(),
              kkkOperation: t.String(),
              isActive: t.Boolean()
            })
          }),
          500: ErrorSchema
        }
      }
    )

    /* ─────────── GET /admin/aggregators/:id/rate-sources ─────────── */
    .get(
      '/:id/rate-sources',
      async ({ params, error }) => {
        try {
          const rateSources = await db.aggregatorRateSource.findMany({
            where: { aggregatorId: params.id },
            include: {
              rateSource: {
                select: {
                  id: true,
                  displayName: true,
                  source: true,
                  isActive: true
                }
              }
            }
          });

          return rateSources.map(rs => ({
            id: rs.id,
            rateSourceId: rs.rateSourceId,
            kkkAdjustment: rs.kkkPercent * (rs.kkkOperation === 'MINUS' ? -1 : 1),
            rateSource: {
              id: rs.rateSource.id,
              name: rs.rateSource.displayName || rs.rateSource.source,
              type: rs.rateSource.source,
              isActive: rs.rateSource.isActive
            }
          }));
        } catch (e) {
          console.error('Error fetching aggregator rate sources:', e)
          return error(500, { error: 'Ошибка получения источников курса' })
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Получение источников курса агрегатора' },
        headers: AuthHeaderSchema,
        params: t.Object({ id: t.String() }),
        response: {
          200: t.Array(t.Object({
            id: t.String(),
            rateSourceId: t.String(),
            kkkAdjustment: t.Number(),
            rateSource: t.Object({
              id: t.String(),
              name: t.String(),
              type: t.String(),
              isActive: t.Boolean()
            })
          })),
          500: ErrorSchema
        }
      }
    )

    /* ─────────── POST /admin/aggregators/:id/rate-sources ─────────── */
    .post(
      '/:id/rate-sources',
      async ({ params, body, error }) => {
        try {
          // Проверяем, что источник еще не добавлен
          const existing = await db.aggregatorRateSource.findFirst({
            where: {
              aggregatorId: params.id,
              rateSourceId: body.rateSourceId
            }
          });

          if (existing) {
            return error(409, { error: 'Этот источник курса уже добавлен' });
          }

          const kkkOperation = body.kkkAdjustment < 0 ? 'MINUS' : 'PLUS';
          const kkkPercent = Math.abs(body.kkkAdjustment);

          const rateSource = await db.aggregatorRateSource.create({
            data: {
              aggregatorId: params.id,
              rateSourceId: body.rateSourceId,
              kkkPercent,
              kkkOperation,
              isActive: true
            },
            include: {
              rateSource: {
                select: {
                  id: true,
                  displayName: true,
                  source: true,
                  isActive: true
                }
              }
            }
          });

          return {
            success: true,
            rateSource: {
              id: rateSource.id,
              rateSourceId: rateSource.rateSourceId,
              kkkAdjustment: rateSource.kkkPercent * (rateSource.kkkOperation === 'MINUS' ? -1 : 1),
              rateSource: {
                id: rateSource.rateSource.id,
                name: rateSource.rateSource.displayName || rateSource.rateSource.source,
                type: rateSource.rateSource.source,
                isActive: rateSource.rateSource.isActive
              }
            }
          };
        } catch (e) {
          console.error('Error adding rate source:', e)
          return error(500, { error: 'Ошибка добавления источника курса' })
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Добавление источника курса для агрегатора' },
        headers: AuthHeaderSchema,
        params: t.Object({ id: t.String() }),
        body: t.Object({
          rateSourceId: t.String(),
          kkkAdjustment: t.Number({ minimum: -100, maximum: 100 })
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            rateSource: t.Object({
              id: t.String(),
              rateSourceId: t.String(),
              kkkAdjustment: t.Number(),
              rateSource: t.Object({
                id: t.String(),
                name: t.String(),
                type: t.String(),
                isActive: t.Boolean()
              })
            })
          }),
          409: ErrorSchema,
          500: ErrorSchema
        }
      }
    )

    /* ─────────── PUT /admin/aggregators/:id/rate-sources/:sourceId ─────────── */
    .put(
      '/:id/rate-sources/:sourceId',
      async ({ params, body, error }) => {
        try {
          const kkkOperation = body.kkkAdjustment < 0 ? 'MINUS' : 'PLUS';
          const kkkPercent = Math.abs(body.kkkAdjustment);

          const rateSource = await db.aggregatorRateSource.update({
            where: { id: params.sourceId },
            data: {
              rateSourceId: body.rateSourceId,
              kkkPercent,
              kkkOperation
            },
            include: {
              rateSource: true
            }
          });

          return {
            success: true,
            rateSource: {
              id: rateSource.id,
              rateSourceId: rateSource.rateSourceId,
              kkkAdjustment: rateSource.kkkPercent * (rateSource.kkkOperation === 'MINUS' ? -1 : 1),
              rateSource: {
                id: rateSource.rateSource.id,
                name: rateSource.rateSource.name,
                type: rateSource.rateSource.type,
                isActive: rateSource.rateSource.isActive
              }
            }
          };
        } catch (e) {
          console.error('Error updating rate source:', e)
          return error(500, { error: 'Ошибка обновления источника курса' })
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Обновление источника курса агрегатора' },
        headers: AuthHeaderSchema,
        params: t.Object({ id: t.String(), sourceId: t.String() }),
        body: t.Object({
          rateSourceId: t.String(),
          kkkAdjustment: t.Number({ minimum: -100, maximum: 100 })
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            rateSource: t.Object({
              id: t.String(),
              rateSourceId: t.String(),
              kkkAdjustment: t.Number(),
              rateSource: t.Object({
                id: t.String(),
                name: t.String(),
                type: t.String(),
                isActive: t.Boolean()
              })
            })
          }),
          500: ErrorSchema
        }
      }
    )

    /* ─────────── DELETE /admin/aggregators/:id/rate-sources/:sourceId ─────────── */
    .delete(
      '/:id/rate-sources/:sourceId',
      async ({ params, error }) => {
        try {
          await db.aggregatorRateSource.delete({
            where: { id: params.sourceId }
          });

          return { success: true };
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
            return error(404, { error: 'Источник курса не найден' })
          }
          console.error('Error deleting rate source:', e)
          return error(500, { error: 'Ошибка удаления источника курса' })
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Удаление источника курса агрегатора' },
        headers: AuthHeaderSchema,
        params: t.Object({ id: t.String(), sourceId: t.String() }),
        response: {
          200: t.Object({ success: t.Boolean() }),
          404: ErrorSchema,
          500: ErrorSchema
        }
      }
    )

    /* ─────────── PATCH /admin/aggregators/:id/toggle ─────────── */
    .patch(
      '/:id/toggle',
      async ({ params, error }) => {
        try {
          const aggregator = await db.aggregator.findUnique({
            where: { id: params.id }
          })

          if (!aggregator) {
            return error(404, { error: 'Агрегатор не найден' })
          }

          const updatedAggregator = await db.aggregator.update({
            where: { id: params.id },
            data: { isActive: !aggregator.isActive }
          })

          return {
            success: true,
            isActive: updatedAggregator.isActive,
            message: updatedAggregator.isActive ? 'Агрегатор активирован' : 'Агрегатор деактивирован'
          }
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
            return error(404, { error: 'Агрегатор не найден' })
          }
          console.error('Error toggling aggregator:', e)
          return error(500, { error: 'Ошибка переключения статуса агрегатора' })
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Переключение статуса активности агрегатора' },
        headers: AuthHeaderSchema,
        params: t.Object({ id: t.String() }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            isActive: t.Boolean(),
            message: t.String()
          }),
          404: ErrorSchema,
          500: ErrorSchema
        }
      }
    )

    /* ─────────── DELETE /admin/aggregators/:id ─────────── */
    .delete(
      '/:id',
      async ({ params, error }) => {
        try {
          // Проверяем, есть ли активные транзакции
          const activeTransactions = await db.transaction.count({
            where: {
              aggregatorId: params.id,
              status: { in: ['CREATED', 'IN_PROGRESS', 'DISPUTE'] }
            }
          })

          if (activeTransactions > 0) {
            return error(409, { 
              error: `Невозможно удалить агрегатора. Есть ${activeTransactions} активных транзакций` 
            })
          }

          // Удаляем все связанные данные в транзакции
          await db.$transaction([
            db.aggregatorSession.deleteMany({ where: { aggregatorId: params.id } }),
            db.aggregatorApiLog.deleteMany({ where: { aggregatorId: params.id } }),
            db.aggregator.delete({ where: { id: params.id } })
          ])

          return { success: true }
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
            return error(404, { error: 'Агрегатор не найден' })
          }
          console.error('Error deleting aggregator:', e)
          return error(500, { error: 'Ошибка удаления агрегатора' })
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Удаление агрегатора' },
        headers: AuthHeaderSchema,
        params: t.Object({ id: t.String() }),
        response: {
          200: t.Object({ success: t.Boolean() }),
          404: ErrorSchema,
          409: ErrorSchema,
          500: ErrorSchema
        }
      }
    )