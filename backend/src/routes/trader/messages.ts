import { Elysia, t } from "elysia"
import { db } from "@/db"
import { traderGuard } from "@/middleware/traderGuard"

export default (app: Elysia) =>
  app
    .get(
      "/messages",
      async ({ query, trader }) => {
        const page = Number(query.page) || 1
        const limit = Number(query.limit) || 20
        const offset = (page - 1) * limit

        const where: any = {}

        // Apply filters
        if (query.deviceId) {
          where.deviceId = query.deviceId
        }
        
        // Ensure we only get messages for devices belonging to this trader
        where.Device = {
          userId: trader.id
        }

        if (query.type && query.type !== 'all') {
          where.type = query.type === 'notification' ? 'AppNotification' : 'SMS'
        }

        if (query.isProcessed && query.isProcessed !== 'all') {
          where.isProcessed = query.isProcessed === 'true'
        }

        if (query.search) {
          where.message = {
            contains: query.search,
            mode: 'insensitive'
          }
        }

        const [messages, total] = await Promise.all([
          db.notification.findMany({
            where,
            include: {
              Device: {
                select: {
                  id: true,
                  name: true,
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
          }),
          db.notification.count({ where })
        ])

        return {
          data: messages.map(msg => ({
            id: msg.id,
            type: msg.type === 'AppNotification' ? 'notification' : 'sms',
            deviceId: msg.deviceId,
            device: msg.Device,
            packageName: msg.application,
            appName: msg.title || msg.application,
            phoneNumber: msg.metadata?.phoneNumber || null,
            sender: msg.metadata?.sender || null,
            content: msg.message,
            timestamp: msg.createdAt,
            createdAt: msg.createdAt,
            isProcessed: msg.isProcessed,
            matchedTransactionId: msg.metadata?.matchedTransactionId || null,
            transaction: msg.metadata?.transaction || null,
            amount: (msg.metadata as any)?.extractedAmount || (msg.metadata as any)?.amount || 0
          })),
          meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
          }
        }
      },
      {
        tags: ["trader"],
        query: t.Object({
          page: t.Optional(t.String()),
          limit: t.Optional(t.String()),
          search: t.Optional(t.String()),
          type: t.Optional(t.String()),
          deviceId: t.Optional(t.String()),
          isProcessed: t.Optional(t.String()),
        }),
      }
    )