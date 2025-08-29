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
import { Prisma } from '@prisma/client'
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
  apiBaseUrl: t.Union([t.String(), t.Null()]),
  balanceUsdt: t.Number(),
  isActive: t.Boolean(),
  twoFactorEnabled: t.Boolean(),
  createdAt: t.String(),
  updatedAt: t.String()
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
              balanceUsdt: body.balanceUsdt || 0
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
          balanceUsdt: t.Optional(t.Number())
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
          200: t.Intersect([
            AggregatorResponseSchema,
            t.Object({
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
          ]),
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
          balanceUsdt: t.Number()
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
        const where: Prisma.AggregatorApiLogWhereInput = {
          aggregatorId: params.id
        }

        if (query.endpoint) {
          where.endpoint = { contains: query.endpoint, mode: 'insensitive' }
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
            db.aggregatorApiLog.findMany({
              where,
              orderBy: { createdAt: 'desc' },
              skip,
              take: limit
            }),
            db.aggregatorApiLog.count({ where })
          ])

          return {
            data: logs.map(log => ({
              ...log,
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