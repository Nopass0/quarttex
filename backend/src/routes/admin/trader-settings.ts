import { Elysia, t } from "elysia";
import { db } from "@/db";
import { Prisma } from "@prisma/client";

const ErrorSchema = t.Object({
  error: t.String(),
});

const authHeader = t.Object({
  "x-admin-key": t.String(),
});

export default new Elysia({ prefix: "/traders" })
  /* ───────────────── Get traders list ───────────────── */
  .get(
    "/",
    async ({ query }) => {
      const page = query.page || 1;
      const limit = query.limit || 50;
      const offset = (page - 1) * limit;
      
      const where: Prisma.UserWhereInput = {};
      
      // Search filter
      if (query.search) {
        where.OR = [
          { email: { contains: query.search, mode: 'insensitive' } },
          { name: { contains: query.search, mode: 'insensitive' } },
          { numericId: parseInt(query.search) || 0 },
        ];
      }
      
      // Status filters
      if (query.banned !== undefined) {
        where.banned = query.banned === 'true';
      }
      
      if (query.trafficEnabled !== undefined) {
        where.trafficEnabled = query.trafficEnabled === 'true';
      }
      
      const [traders, total] = await Promise.all([
        db.user.findMany({
          where,
          include: {
            bankDetails: {
              select: {
                id: true,
                cardNumber: true,
                bankType: true,
                recipientName: true,
              }
            },
            devices: {
              select: {
                id: true,
                name: true,
                isOnline: true,
              }
            },
            team: {
              include: {
                agent: {
                  select: {
                    id: true,
                    name: true,
                  }
                }
              }
            },
            rateSourceConfig: {
              select: {
                id: true,
                source: true,
                displayName: true,
              }
            },
            _count: {
              select: {
                tradedTransactions: {
                  where: {
                    status: 'READY'
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit,
        }),
        db.user.count({ where }),
      ]);
      
      const formattedTraders = traders.map(trader => ({
        id: trader.id,
        numericId: trader.numericId,
        email: trader.email,
        name: trader.name,
        banned: trader.banned,
        trafficEnabled: trader.trafficEnabled,
        balanceUsdt: trader.balanceUsdt,
        balanceRub: trader.balanceRub,
        frozenUsdt: trader.frozenUsdt,
        frozenRub: trader.frozenRub,
        payoutBalance: trader.payoutBalance,
        frozenPayoutBalance: trader.frozenPayoutBalance,
        deposit: trader.deposit,
        profitFromDeals: trader.profitFromDeals,
        profitFromPayouts: trader.profitFromPayouts,
        completedTransactions: trader._count.tradedTransactions,
        bankDetailsCount: trader.bankDetails.length,
        devicesCount: trader.devices.length,
        onlineDevices: trader.devices.filter(d => d.isOnline).length,
        teamName: trader.team?.name || null,
        agentName: trader.team?.agent?.name || null,
        rateSourceConfig: trader.rateSourceConfig,
        createdAt: trader.createdAt,
      }));
      
      return {
        traders: formattedTraders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        }
      };
    },
    {
      tags: ["admin"],
      headers: authHeader,
      query: t.Object({
        page: t.Optional(t.Number({ minimum: 1 })),
        limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
        search: t.Optional(t.String()),
        banned: t.Optional(t.String()),
        trafficEnabled: t.Optional(t.String()),
      }),
      response: {
        200: t.Object({
          traders: t.Array(t.Object({
            id: t.String(),
            numericId: t.Number(),
            email: t.String(),
            name: t.String(),
            banned: t.Boolean(),
            trafficEnabled: t.Boolean(),
            balanceUsdt: t.Number(),
            balanceRub: t.Number(),
            frozenUsdt: t.Number(),
            frozenRub: t.Number(),
            payoutBalance: t.Number(),
            frozenPayoutBalance: t.Number(),
            deposit: t.Number(),
            profitFromDeals: t.Number(),
            profitFromPayouts: t.Number(),
            completedTransactions: t.Number(),
            bankDetailsCount: t.Number(),
            devicesCount: t.Number(),
            onlineDevices: t.Number(),
            teamName: t.Nullable(t.String()),
            agentName: t.Nullable(t.String()),
            createdAt: t.Date(),
          })),
          pagination: t.Object({
            page: t.Number(),
            limit: t.Number(),
            total: t.Number(),
            totalPages: t.Number(),
          })
        }),
        401: ErrorSchema,
        403: ErrorSchema,
      },
    },
  )
  
  /* ───────────────── Get trader full details ───────────────── */
  .get(
    "/:id/full",
    async ({ params, error }) => {
      try {
        const trader = await db.user.findUnique({
          where: { id: params.id },
          include: {
            team: {
              include: {
                agent: {
                  select: {
                    id: true,
                    name: true,
                  }
                }
              }
            },
            rateSourceConfig: {
              select: {
                id: true,
                source: true,
                displayName: true,
              }
            }
          }
        });

        if (!trader) {
          return error(404, { error: "Трейдер не найден" });
        }

        return trader;
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === "P2025"
        )
          return error(404, { error: "Трейдер не найден" });
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
          numericId: t.Number(),
          email: t.String(),
          name: t.String(),
          minInsuranceDeposit: t.Number(),
          maxInsuranceDeposit: t.Number(),
          minAmountPerRequisite: t.Number(),
          maxAmountPerRequisite: t.Number(),
          disputeLimit: t.Number(),
          teamId: t.Nullable(t.String()),
          team: t.Nullable(t.Object({
            id: t.String(),
            name: t.String(),
            agentId: t.String(),
            agent: t.Object({
              id: t.String(),
              name: t.String(),
            })
          })),
          telegramChatId: t.Nullable(t.String()),
          telegramDisputeChatId: t.Nullable(t.String()),
          telegramBotToken: t.Nullable(t.String()),
          deposit: t.Number(),
          maxSimultaneousPayouts: t.Number(),
          minPayoutAmount: t.Number(),
          maxPayoutAmount: t.Number(),
          payoutRateDelta: t.Number(),
          payoutFeePercent: t.Number(),
          payoutAcceptanceTime: t.Number()
        }),
        404: ErrorSchema,
        401: ErrorSchema,
        403: ErrorSchema,
      },
    },
  )

  /* ───────────────── Update trader settings ───────────────── */
  .patch(
    "/:id/settings",
    async ({ params, body, error }) => {
      try {
        const trader = await db.user.findUnique({
          where: { id: params.id }
        });

        if (!trader) {
          return error(404, { error: "Трейдер не найден" });
        }

        const updated = await db.user.update({
          where: { id: params.id },
          data: {
            email: body.email,
            name: body.name,
            minInsuranceDeposit: body.minInsuranceDeposit,
            maxInsuranceDeposit: body.maxInsuranceDeposit,
            minAmountPerRequisite: body.minAmountPerRequisite,
            maxAmountPerRequisite: body.maxAmountPerRequisite,
            disputeLimit: body.disputeLimit,
            teamId: body.teamId,
            telegramChatId: body.telegramChatId,
            telegramDisputeChatId: body.telegramDisputeChatId,
            telegramBotToken: body.telegramBotToken,
            maxSimultaneousPayouts: body.maxSimultaneousPayouts,
            minPayoutAmount: body.minPayoutAmount,
            maxPayoutAmount: body.maxPayoutAmount,
            payoutRateDelta: body.payoutRateDelta,
            payoutFeePercent: body.payoutFeePercent,
            payoutAcceptanceTime: body.payoutAcceptanceTime,
            rateSourceConfigId: body.rateSourceConfigId,
          }
        });

        return { success: true, trader: updated };
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === "P2025"
        )
          return error(404, { error: "Трейдер не найден" });
        throw e;
      }
    },
    {
      tags: ["admin"],
      headers: authHeader,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        email: t.String(),
        name: t.String(),
        minInsuranceDeposit: t.Number(),
        maxInsuranceDeposit: t.Number(),
        minAmountPerRequisite: t.Number(),
        maxAmountPerRequisite: t.Number(),
        disputeLimit: t.Number(),
        teamId: t.Nullable(t.String()),
        telegramChatId: t.Nullable(t.String()),
        telegramDisputeChatId: t.Nullable(t.String()),
        telegramBotToken: t.Nullable(t.String()),
        maxSimultaneousPayouts: t.Number(),
        minPayoutAmount: t.Number(),
        maxPayoutAmount: t.Number(),
        payoutRateDelta: t.Number(),
        payoutFeePercent: t.Number(),
        payoutAcceptanceTime: t.Number(),
        rateSourceConfigId: t.Optional(t.Nullable(t.String())),
      }),
      response: {
        200: t.Object({ 
          success: t.Boolean(),
          trader: t.Object({
            id: t.String(),
            email: t.String(),
            name: t.String(),
          })
        }),
        404: ErrorSchema,
        401: ErrorSchema,
        403: ErrorSchema,
      },
    },
  )
  
  /* ───────────────── Update trader payout limit ───────────────── */
  .put(
    "/:id/payout-limit",
    async ({ params, body, error }) => {
      try {
        const trader = await db.user.findUnique({
          where: { id: params.id }
        });

        if (!trader) {
          return error(404, { error: "Трейдер не найден" });
        }

        const updated = await db.user.update({
          where: { id: params.id },
          data: {
            maxSimultaneousPayouts: body.maxSimultaneousPayouts,
          },
          select: {
            id: true,
            numericId: true,
            email: true,
            maxSimultaneousPayouts: true,
          }
        });

        return { success: true, trader: updated };
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === "P2025"
        )
          return error(404, { error: "Трейдер не найден" });
        throw e;
      }
    },
    {
      tags: ["admin"],
      headers: authHeader,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        maxSimultaneousPayouts: t.Number({ minimum: 1, maximum: 100 }),
      }),
      response: {
        200: t.Object({
          success: t.Boolean(),
          trader: t.Object({
            id: t.String(),
            numericId: t.Number(),
            email: t.String(),
            maxSimultaneousPayouts: t.Number(),
          })
        }),
        404: ErrorSchema,
        401: ErrorSchema,
        403: ErrorSchema,
      },
    },
  )
  
  /* ───────────────── Get trader payout stats ───────────────── */
  .get(
    "/:id/payout-stats",
    async ({ params, error }) => {
      try {
        const trader = await db.user.findUnique({
          where: { id: params.id }
        });

        if (!trader) {
          return error(404, { error: "Трейдер не найден" });
        }

        const [activePayouts, createdPayouts] = await Promise.all([
          db.payout.count({
            where: {
              traderId: params.id,
              status: "ACTIVE",
            },
          }),
          db.payout.count({
            where: {
              traderId: params.id,
              status: "CREATED",
            },
          }),
        ]);

        return {
          traderId: params.id,
          activePayouts,
          createdPayouts,
          totalPayouts: activePayouts + createdPayouts,
          maxSimultaneousPayouts: trader.maxSimultaneousPayouts,
        };
      } catch (e) {
        throw e;
      }
    },
    {
      tags: ["admin"],
      headers: authHeader,
      params: t.Object({ id: t.String() }),
      response: {
        200: t.Object({
          traderId: t.String(),
          activePayouts: t.Number(),
          createdPayouts: t.Number(),
          totalPayouts: t.Number(),
          maxSimultaneousPayouts: t.Number(),
        }),
        404: ErrorSchema,
        401: ErrorSchema,
        403: ErrorSchema,
      },
    },
  )
  
  /* ───────────────── Get trader withdrawal history ───────────────── */
  .get(
    "/:id/withdrawals",
    async ({ params, query, error }) => {
      try {
        const trader = await db.user.findUnique({
          where: { id: params.id }
        });

        if (!trader) {
          return error(404, { error: "Трейдер не найден" });
        }

        const page = query.page || 1;
        const limit = query.limit || 20;
        const offset = (page - 1) * limit;

        const where = {
          traderId: params.id,
          status: { in: ["COMPLETED", "CANCELLED", "EXPIRED"] }
        };

        const [withdrawals, total] = await Promise.all([
          db.payout.findMany({
            where,
            select: {
              id: true,
              numericId: true,
              amount: true,
              amountUsdt: true,
              total: true,
              totalUsdt: true,
              status: true,
              createdAt: true,
              acceptedAt: true,
              confirmedAt: true,
              cancelledAt: true,
              cancelReason: true,
              merchant: {
                select: {
                  id: true,
                  name: true,
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            skip: offset,
            take: limit,
          }),
          db.payout.count({ where }),
        ]);

        const formattedWithdrawals = withdrawals.map(withdrawal => ({
          id: withdrawal.id,
          numericId: withdrawal.numericId,
          amount: withdrawal.total, // Total amount earned
          status: withdrawal.status.toLowerCase(),
          createdAt: withdrawal.createdAt,
          acceptedAt: withdrawal.acceptedAt,
          confirmedAt: withdrawal.confirmedAt,
          cancelledAt: withdrawal.cancelledAt,
          cancelReason: withdrawal.cancelReason,
          type: 'payout',
          merchantName: withdrawal.merchant.name,
        }));

        return {
          withdrawals: formattedWithdrawals,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          }
        };
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === "P2025"
        )
          return error(404, { error: "Трейдер не найден" });
        throw e;
      }
    },
    {
      tags: ["admin"],
      headers: authHeader,
      params: t.Object({ id: t.String() }),
      query: t.Object({
        page: t.Optional(t.Number({ minimum: 1 })),
        limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
      }),
      response: {
        200: t.Object({
          withdrawals: t.Array(t.Object({
            id: t.String(),
            numericId: t.Number(),
            amount: t.Number(),
            status: t.String(),
            createdAt: t.Date(),
            acceptedAt: t.Nullable(t.Date()),
            confirmedAt: t.Nullable(t.Date()),
            cancelledAt: t.Nullable(t.Date()),
            cancelReason: t.Nullable(t.String()),
            type: t.String(),
            merchantName: t.String(),
          })),
          pagination: t.Object({
            page: t.Number(),
            limit: t.Number(),
            total: t.Number(),
            totalPages: t.Number(),
          })
        }),
        404: ErrorSchema,
        401: ErrorSchema,
        403: ErrorSchema,
      },
    },
  );