import { Elysia, t } from "elysia";
import { db } from "@/db";
import { Status } from "@prisma/client";
import ErrorSchema from "@/types/error";

const AuthHeader = t.Object({ "x-admin-key": t.String() });

export default (app: Elysia) =>
  app
    /* ───────── GET /admin/deal-disputes ───────── */
    .get(
      "/",
      async ({ query }) => {
        const page = parseInt(query.page || "1");
        const limit = parseInt(query.limit || "20");
        const skip = (page - 1) * limit;

        // Build filters
        const where: any = {};

        if (query.status && query.status !== "all") {
          where.status = query.status;
        }

        if (query.traderId) {
          where.traderId = query.traderId;
        }

        if (query.merchantId) {
          where.merchantId = query.merchantId;
        }

        // Get disputes with pagination
        const [disputes, total] = await Promise.all([
          db.dealDispute.findMany({
            where,
            include: {
              deal: {
                include: {
                  method: true,
                  requisites: true,
                },
              },
              trader: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              merchant: {
                select: {
                  id: true,
                  name: true,
                },
              },
              messages: {
                orderBy: { createdAt: "asc" },
                include: {
                  attachments: true,
                },
              },
              _count: {
                select: { messages: true },
              },
            },
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
          }),
          db.dealDispute.count({ where }),
        ]);

        return {
          disputes: disputes.map((dispute) => ({
            id: dispute.id,
            status: dispute.status,
            reason: "Спор по сделке", // Default reason since field doesn't exist
            resolution: dispute.resolution,
            createdAt: dispute.createdAt.toISOString(),
            updatedAt: dispute.updatedAt.toISOString(),
            resolvedAt: dispute.resolvedAt?.toISOString() || null,
            deal: {
              id: dispute.deal.id,
              numericId: dispute.deal.numericId,
              amount: dispute.deal.amount,
              status: dispute.deal.status,
              createdAt: dispute.deal.createdAt.toISOString(),
              method: dispute.deal.method,
              requisites: dispute.deal.requisites,
            },
            trader: dispute.trader,
            merchant: dispute.merchant,
            messagesCount: dispute._count.messages,
            messages: dispute.messages.map((msg) => ({
              id: msg.id,
              message: msg.message,
              senderId: msg.senderId,
              senderType: msg.senderType,
              sender: null, // Sender is not included in this query
              files: msg.attachments.map((file) => ({
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
          },
        };
      },
      {
        tags: ["admin"],
        detail: { summary: "Получить список споров по сделкам" },
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
            disputes: t.Array(
              t.Object({
                id: t.String(),
                status: t.String(),
                reason: t.String(),
                resolution: t.Union([t.String(), t.Null()]),
                createdAt: t.String(),
                updatedAt: t.String(),
                resolvedAt: t.Union([t.String(), t.Null()]),
                deal: t.Object({
                  id: t.String(),
                  numericId: t.Number(),
                  amount: t.Number(),
                  status: t.String(),
                  createdAt: t.String(),
                  method: t.Any(),
                  requisites: t.Any(),
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
                messages: t.Array(
                  t.Object({
                    id: t.String(),
                    message: t.String(),
                    senderId: t.String(),
                    senderType: t.String(),
                    sender: t.Union([
                      t.Object({
                        id: t.String(),
                        name: t.String(),
                        email: t.String(),
                      }),
                      t.Null(),
                    ]),
                    files: t.Array(
                      t.Object({
                        id: t.String(),
                        fileName: t.String(),
                        fileSize: t.Number(),
                        mimeType: t.String(),
                        url: t.String(),
                      })
                    ),
                    createdAt: t.String(),
                  })
                ),
              })
            ),
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

    /* ───────── GET /admin/deal-disputes/:id ───────── */
    .get(
      "/:id",
      async ({ params, error }) => {
        const dispute = await db.dealDispute.findUnique({
          where: { id: params.id },
          include: {
            deal: {
              include: {
                method: true,
                requisites: {
                  include: {
                    device: true,
                  },
                },
                receipts: true,
              },
            },
            trader: true,
            merchant: true,
            messages: {
              orderBy: { createdAt: "asc" },
              include: {
                attachments: true,
              },
            },
          },
        });

        if (!dispute) {
          return error(404, { error: "Спор не найден" });
        }

        return {
          id: dispute.id,
          status: dispute.status,
          reason: "Спор по сделке", // Default reason since field doesn't exist
          resolution: dispute.resolution,
          createdAt: dispute.createdAt.toISOString(),
          updatedAt: dispute.updatedAt.toISOString(),
          resolvedAt: dispute.resolvedAt?.toISOString() || null,
          deal: {
            ...dispute.deal,
            createdAt: dispute.deal.createdAt.toISOString(),
            updatedAt: dispute.deal.updatedAt.toISOString(),
            expired_at: dispute.deal.expired_at.toISOString(),
            acceptedAt: dispute.deal.acceptedAt?.toISOString() || null,
            completedAt: dispute.deal.completedAt?.toISOString() || null,
            receipts: dispute.deal.receipts.map((r) => ({
              ...r,
              createdAt: r.createdAt.toISOString(),
              updatedAt: r.updatedAt.toISOString(),
            })),
          },
          trader: dispute.trader,
          merchant: dispute.merchant,
          messages: dispute.messages.map((msg) => ({
            id: msg.id,
            message: msg.message,
            senderId: msg.senderId,
            senderType: msg.senderType,
            sender: null, // Not included in query
            files: msg.attachments.map((file) => ({
              id: file.id,
              fileName: file.filename,
              fileSize: file.size,
              mimeType: file.mimeType,
              url: file.url,
            })),
            createdAt: msg.createdAt.toISOString(),
          })),
        };
      },
      {
        tags: ["admin"],
        detail: { summary: "Получить детали спора по сделке" },
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

    /* ───────── POST /admin/deal-disputes/:id/resolve ───────── */
    .post(
      "/:id/resolve",
      async ({ params, body, error }) => {
        const dispute = await db.dealDispute.findUnique({
          where: { id: params.id },
          include: { deal: true },
        });

        if (!dispute) {
          return error(404, { error: "Спор не найден" });
        }

        if (dispute.status !== "OPEN" && dispute.status !== "IN_PROGRESS") {
          return error(400, { error: "Спор уже разрешен" });
        }

        // Start transaction
        await db.$transaction(async (tx) => {
          // Update dispute status
          await tx.dealDispute.update({
            where: { id: params.id },
            data: {
              status:
                body.inFavorOf === "MERCHANT"
                  ? "RESOLVED_SUCCESS"
                  : "RESOLVED_FAIL",
              resolution: body.resolution,
              resolvedAt: new Date(),
            },
          });

          // Add system message
          await tx.dealDisputeMessage.create({
            data: {
              disputeId: dispute.id,
              senderId: "system",
              senderType: "ADMIN",
              message: `Спор разрешен администратором в пользу ${
                body.inFavorOf === "MERCHANT" ? "мерчанта" : "трейдера"
              }. ${body.resolution || ""}`,
            },
          });

          // Handle resolution based on who wins the dispute
          const deal = dispute.deal;
          const frozenAmount = deal.frozenUsdtAmount || 0;

          if (body.inFavorOf === "MERCHANT") {
            // In favor of merchant - transaction becomes EXPIRED
            await tx.transaction.update({
              where: { id: dispute.dealId },
              data: {
                status: Status.EXPIRED,
              },
            });

            // If deal was READY before dispute, deduct from balance/deposit
            if (deal.status === Status.READY && deal.traderId && frozenAmount > 0) {
              const trader = await tx.user.findUnique({
                where: { id: deal.traderId },
                select: { trustBalance: true, deposit: true }
              });

              if (trader) {
                const roundedFrozenAmount = Math.ceil(frozenAmount * 100) / 100; // Round up to 2 decimal places
                
                if (trader.trustBalance >= roundedFrozenAmount) {
                  // Deduct from trust balance first
                  await tx.user.update({
                    where: { id: deal.traderId },
                    data: {
                      frozenUsdt: { decrement: frozenAmount },
                      trustBalance: { decrement: roundedFrozenAmount },
                    },
                  });
                  console.log(
                    `[DisputeResolution] Merchant won: deducted ${roundedFrozenAmount} USDT from trader ${deal.traderId} trust balance`
                  );
                } else {
                  // Deduct what's available from trust balance and the rest from deposit
                  const remainingAmount = roundedFrozenAmount - trader.trustBalance;
                  
                  await tx.user.update({
                    where: { id: deal.traderId },
                    data: {
                      frozenUsdt: { decrement: frozenAmount },
                      trustBalance: 0,
                      deposit: { decrement: remainingAmount },
                    },
                  });
                  console.log(
                    `[DisputeResolution] Merchant won: deducted ${trader.trustBalance} USDT from trust balance and ${remainingAmount} USDT from deposit for trader ${deal.traderId}`
                  );
                }
              }
            } else {
              // Just unfreeze if deal wasn't READY
              if (frozenAmount > 0 && deal.traderId) {
                await tx.user.update({
                  where: { id: deal.traderId },
                  data: {
                    frozenUsdt: { decrement: frozenAmount },
                  },
                });
                console.log(
                  `[DisputeResolution] Merchant won: unfrozen ${frozenAmount} USDT from trader ${deal.traderId} (deal wasn't READY)`
                );
              }
            }
          } else {
            // In favor of trader - transaction becomes READY
            await tx.transaction.update({
              where: { id: dispute.dealId },
              data: {
                status: Status.READY,
                acceptedAt: new Date(),
              },
            });

            // If deal was EXPIRED before, apply same logic as trader confirming the deal
            if (deal.status === Status.EXPIRED && frozenAmount > 0 && deal.traderId) {
              // Same calculations as when trader confirms deal
              await tx.user.update({
                where: { id: deal.traderId },
                data: {
                  frozenUsdt: { decrement: frozenAmount },
                  trustBalance: { decrement: frozenAmount },
                },
              });
              console.log(
                `[DisputeResolution] Trader won: unfrozen ${frozenAmount} USDT and deducted from trust balance for trader ${deal.traderId}`
              );
            } else {
              // Unfreeze funds and return to trustBalance (trader wins)
              if (frozenAmount > 0 && deal.traderId) {
                await tx.user.update({
                  where: { id: deal.traderId },
                  data: {
                    frozenUsdt: { decrement: frozenAmount },
                    trustBalance: { increment: frozenAmount },
                  },
                });
                console.log(
                  `[DisputeResolution] Trader won: unfrozen ${frozenAmount} USDT and returned to trust balance for trader ${deal.traderId}`
                );
              }
            }
          }
        });

        return { success: true };
      },
      {
        tags: ["admin"],
        detail: { summary: "Разрешить спор по сделке" },
        headers: AuthHeader,
        params: t.Object({ id: t.String() }),
        body: t.Object({
          inFavorOf: t.Union([t.Literal("MERCHANT"), t.Literal("TRADER")]),
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

    /* ───────── POST /admin/deal-disputes/:id/messages ───────── */
    .post(
      "/:id/messages",
      async ({ params, body, error }) => {
        const dispute = await db.dealDispute.findUnique({
          where: { id: params.id },
        });

        if (!dispute) {
          return error(404, { error: "Спор не найден" });
        }

        const message = await db.dealDisputeMessage.create({
          data: {
            disputeId: params.id,
            senderId: "admin",
            senderType: "ADMIN",
            message: body.message,
          },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        return {
          id: message.id,
          message: message.message,
          senderId: message.senderId,
          senderType: message.senderType,
          sender: message.sender,
          files: [],
          createdAt: message.createdAt.toISOString(),
        };
      },
      {
        tags: ["admin"],
        detail: { summary: "Отправить сообщение в спор" },
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
    );
