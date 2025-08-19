import { Elysia, t } from 'elysia'
import { db } from '@/db'
import ErrorSchema from '@/types/error'

const AuthHeader = t.Object({ 'x-admin-key': t.String() })

export default (app: Elysia) =>
  app
    /* ───────── GET /admin/withdrawal-disputes ───────── */
    .get(
      '/',
      async ({ query }) => {
        const page = parseInt(query.page || '1')
        const limit = parseInt(query.limit || '20')
        const skip = (page - 1) * limit

        // Build filters
        const where: any = {}
        
        if (query.status && query.status !== 'all') {
          where.status = query.status
        }
        
        if (query.traderId) {
          where.traderId = query.traderId
        }
        
        if (query.merchantId) {
          where.merchantId = query.merchantId
        }

        // Get disputes with pagination
        const [disputes, total] = await Promise.all([
          db.withdrawalDispute.findMany({
            where,
            include: {
              payout: {
                include: {
                  bankDetail: true,
                }
              },
              trader: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                }
              },
              merchant: {
                select: {
                  id: true,
                  name: true,
                }
              },
              messages: {
                orderBy: { createdAt: 'asc' },
                include: {
                  attachments: true,
                }
              },
              _count: {
                select: { messages: true }
              }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
          }),
          db.withdrawalDispute.count({ where })
        ])

        return {
          disputes: disputes.map(dispute => ({
            id: dispute.id,
            status: dispute.status,
            reason: 'Спор по выплате', // Default reason since field doesn't exist
            resolution: dispute.resolution,
            createdAt: dispute.createdAt.toISOString(),
            updatedAt: dispute.updatedAt.toISOString(),
            resolvedAt: dispute.resolvedAt?.toISOString() || null,
            payout: {
              id: dispute.payout.id,
              numericId: dispute.payout.numericId,
              amount: dispute.payout.amount,
              status: dispute.payout.status,
              currency: dispute.payout.currency,
              createdAt: dispute.payout.createdAt.toISOString(),
              bankDetail: dispute.payout.bankDetail,
            },
            trader: dispute.trader,
            merchant: dispute.merchant,
            messagesCount: dispute._count.messages,
            messages: dispute.messages.map(msg => ({
              id: msg.id,
              message: msg.message,
              senderId: msg.senderId,
              senderType: msg.senderType,
              sender: null, // Not included in query
              files: msg.attachments.map(file => ({
                id: file.id,
                fileName: file.filename,
                fileSize: file.size,
                mimeType: file.mimeType,
                url: file.url,
              })),
              createdAt: msg.createdAt.toISOString(),
            })),
          })),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          }
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Получить список споров по выплатам' },
        headers: AuthHeader,
        query: t.Object({
          page: t.Optional(t.String()),
          limit: t.Optional(t.String()),
          status: t.Optional(t.String()),
          traderId: t.Optional(t.String()),
          merchantId: t.Optional(t.String()),
        }),
        response: {
          200: t.Object({
            disputes: t.Array(t.Object({
              id: t.String(),
              status: t.String(),
              reason: t.String(),
              resolution: t.Union([t.String(), t.Null()]),
              createdAt: t.String(),
              updatedAt: t.String(),
              resolvedAt: t.Union([t.String(), t.Null()]),
              payout: t.Object({
                id: t.String(),
                numericId: t.Number(),
                amount: t.Number(),
                status: t.String(),
                currency: t.String(),
                createdAt: t.String(),
                bankDetail: t.Any(),
              }),
              trader: t.Object({
                id: t.String(),
                name: t.String(),
                email: t.String(),
              }),
              merchant: t.Object({
                id: t.String(),
                name: t.String(),
              }),
              messagesCount: t.Number(),
              messages: t.Array(t.Object({
                id: t.String(),
                message: t.String(),
                senderId: t.String(),
                senderType: t.String(),
                sender: t.Union([t.Object({
                  id: t.String(),
                  name: t.String(),
                  email: t.String(),
                }), t.Null()]),
                files: t.Array(t.Object({
                  id: t.String(),
                  fileName: t.String(),
                  fileSize: t.Number(),
                  mimeType: t.String(),
                  url: t.String(),
                })),
                createdAt: t.String(),
              })),
            })),
            pagination: t.Object({
              page: t.Number(),
              limit: t.Number(),
              total: t.Number(),
              totalPages: t.Number(),
            }),
          }),
          401: ErrorSchema,
          403: ErrorSchema,
        },
      }
    )

    /* ───────── GET /admin/withdrawal-disputes/:id ───────── */
    .get(
      '/:id',
      async ({ params, error }) => {
        const dispute = await db.withdrawalDispute.findUnique({
          where: { id: params.id },
          include: {
            payout: {
              include: {
                bankDetail: {
                  include: {
                    device: true,
                  }
                },
                receipts: true,
              }
            },
            trader: true,
            merchant: true,
            messages: {
              orderBy: { createdAt: 'asc' },
              include: {
                sender: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  }
                },
                files: true,
              }
            },
          }
        })

        if (!dispute) {
          return error(404, { error: 'Спор не найден' })
        }

        return {
          id: dispute.id,
          status: dispute.status,
          reason: dispute.reason,
          resolution: dispute.resolution,
          createdAt: dispute.createdAt.toISOString(),
          updatedAt: dispute.updatedAt.toISOString(),
          resolvedAt: dispute.resolvedAt?.toISOString() || null,
          payout: {
            ...dispute.payout,
            createdAt: dispute.payout.createdAt.toISOString(),
            updatedAt: dispute.payout.updatedAt.toISOString(),
            acceptedAt: dispute.payout.acceptedAt?.toISOString() || null,
            completedAt: dispute.payout.completedAt?.toISOString() || null,
            rejectedAt: dispute.payout.rejectedAt?.toISOString() || null,
            receipts: dispute.payout.receipts.map(r => ({
              ...r,
              createdAt: r.createdAt.toISOString(),
              updatedAt: r.updatedAt.toISOString(),
            })),
          },
          trader: dispute.trader,
          merchant: dispute.merchant,
          messages: dispute.messages.map(msg => ({
            id: msg.id,
            message: msg.message,
            senderId: msg.senderId,
            senderType: msg.senderType,
            sender: msg.sender,
            files: msg.files.map(file => ({
              id: file.id,
              fileName: file.fileName,
              fileSize: file.fileSize,
              mimeType: file.mimeType,
              url: `/api/uploads/${file.fileName}`,
            })),
            createdAt: msg.createdAt.toISOString(),
          })),
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Получить детали спора по выплате' },
        headers: AuthHeader,
        params: t.Object({ id: t.String() }),
        response: {
          200: t.Any(),
          401: ErrorSchema,
          403: ErrorSchema,
          404: ErrorSchema,
        },
      }
    )

    /* ───────── POST /admin/withdrawal-disputes/:id/resolve ───────── */
    .post(
      '/:id/resolve',
      async ({ params, body, error }) => {
        const dispute = await db.withdrawalDispute.findUnique({
          where: { id: params.id },
          include: { payout: true }
        })

        if (!dispute) {
          return error(404, { error: 'Спор не найден' })
        }

        if (dispute.status !== 'OPEN' && dispute.status !== 'IN_PROGRESS') {
          return error(400, { error: 'Спор уже разрешен' })
        }

        // Start transaction
        await db.$transaction(async (tx) => {
          // Update dispute status
          await tx.withdrawalDispute.update({
            where: { id: params.id },
            data: {
              status: body.inFavorOf === 'MERCHANT' ? 'RESOLVED_SUCCESS' : 'RESOLVED_FAIL',
              resolution: body.resolution,
              resolvedAt: new Date(),
            }
          })

          // Add system message
          await tx.withdrawalDisputeMessage.create({
            data: {
              disputeId: dispute.id,
              senderId: 'system',
              senderType: 'ADMIN',
              message: `Спор разрешен администратором в пользу ${body.inFavorOf === 'MERCHANT' ? 'мерчанта' : 'трейдера'}. ${body.resolution || ''}`,
            }
          })

          // Update payout status based on resolution and handle frozen funds
          const payout = dispute.payout;
          const frozenAmountRub = payout.amount || 0;

          if (body.inFavorOf === 'MERCHANT') {
            // In favor of merchant - payout is rejected, return frozen funds to trader
            await tx.payout.update({
              where: { id: dispute.payoutId },
              data: {
                status: 'REJECTED',
                rejectedAt: new Date(),
                rejectionReason: `Спор разрешен в пользу мерчанта. ${body.resolution || ''}`,
              }
            })

            // Return frozen funds to trader's balances
            if (frozenAmountRub > 0 && payout.traderId) {
              await tx.user.update({
                where: { id: payout.traderId },
                data: {
                  frozenRub: { decrement: frozenAmountRub },
                  balanceRub: { increment: frozenAmountRub },
                  frozenPayoutBalance: { decrement: frozenAmountRub },
                  payoutBalance: { increment: frozenAmountRub }
                }
              });
              console.log(`[WithdrawalDisputeResolution] Merchant won: returned ${frozenAmountRub} RUB to trader ${payout.traderId}`);
            }
          } else {
            // In favor of trader - payout is completed, remove frozen funds (payout succeeds)
            await tx.payout.update({
              where: { id: dispute.payoutId },
              data: {
                status: 'COMPLETED',
                completedAt: new Date(),
              }
            })

            // Remove frozen funds without returning to balance (payout goes through)
            if (frozenAmountRub > 0 && payout.traderId) {
              await tx.user.update({
                where: { id: payout.traderId },
                data: {
                  frozenRub: { decrement: frozenAmountRub },
                  frozenPayoutBalance: { decrement: frozenAmountRub }
                }
              });
              console.log(`[WithdrawalDisputeResolution] Trader won: completed payout of ${frozenAmountRub} RUB for trader ${payout.traderId}`);
            }
          }
        })

        return { success: true }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Разрешить спор по выплате' },
        headers: AuthHeader,
        params: t.Object({ id: t.String() }),
        body: t.Object({
          inFavorOf: t.Union([t.Literal('MERCHANT'), t.Literal('TRADER')]),
          resolution: t.Optional(t.String()),
        }),
        response: {
          200: t.Object({ success: t.Boolean() }),
          400: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
          404: ErrorSchema,
        },
      }
    )

    /* ───────── POST /admin/withdrawal-disputes/:id/messages ───────── */
    .post(
      '/:id/messages',
      async ({ params, body, error }) => {
        const dispute = await db.withdrawalDispute.findUnique({
          where: { id: params.id }
        })

        if (!dispute) {
          return error(404, { error: 'Спор не найден' })
        }

        const message = await db.withdrawalDisputeMessage.create({
          data: {
            disputeId: params.id,
            senderId: 'admin',
            senderType: 'ADMIN',
            message: body.message,
          },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        })

        return {
          id: message.id,
          message: message.message,
          senderId: message.senderId,
          senderType: message.senderType,
          sender: message.sender,
          files: [],
          createdAt: message.createdAt.toISOString(),
        }
      },
      {
        tags: ['admin'],
        detail: { summary: 'Отправить сообщение в спор' },
        headers: AuthHeader,
        params: t.Object({ id: t.String() }),
        body: t.Object({
          message: t.String(),
        }),
        response: {
          200: t.Object({
            id: t.String(),
            message: t.String(),
            senderId: t.String(),
            senderType: t.String(),
            sender: t.Any(),
            files: t.Array(t.Any()),
            createdAt: t.String(),
          }),
          401: ErrorSchema,
          403: ErrorSchema,
          404: ErrorSchema,
        },
      }
    )