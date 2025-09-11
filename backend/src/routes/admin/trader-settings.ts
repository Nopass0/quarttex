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
          select: {
            id: true,
            numericId: true,
            name: true,
            email: true,
            role: true,
            balance: true,
            frozenBalance: true,
            rubBalance: true,
            frozenRubBalance: true,
            banned: true,
            createdAt: true,
            minCheckAmount: true,
            maxCheckAmount: true,
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
        minCheckAmount: trader.minCheckAmount,
        maxCheckAmount: trader.maxCheckAmount,
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
            minCheckAmount: t.Number(),
            maxCheckAmount: t.Number(),
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
          select: {
            id: true,
            numericId: true,
            email: true,
            name: true,
            minInsuranceDeposit: true,
            maxInsuranceDeposit: true,
            minAmountPerRequisite: true,
            maxAmountPerRequisite: true,
            disputeLimit: true,
            teamId: true,
            telegramChatId: true,
            telegramDisputeChatId: true,
            telegramBotToken: true,
            deposit: true,
            maxSimultaneousPayouts: true,
            minPayoutAmount: true,
            maxPayoutAmount: true,
            payoutRateDelta: true,
            payoutFeePercent: true,
            payoutAcceptanceTime: true,
            displayStakePercent: true,
            displayAmountFrom: true,
            displayAmountTo: true,
            minCheckAmount: true,
            maxCheckAmount: true,
            displayRates: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                stakePercent: true,
                amountFrom: true,
                amountTo: true,
                sortOrder: true
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
            }
          }
        });

        if (!trader) {
          return error(404, { error: "Трейдер не найден" });
        }

        console.log("[Admin] Returning trader data:", {
          traderId: params.id,
          displayRates: trader.displayRates,
          displayRatesCount: trader.displayRates?.length || 0
        });

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
          payoutAcceptanceTime: t.Number(),
          displayStakePercent: t.Nullable(t.Number()),
          displayAmountFrom: t.Nullable(t.Number()),
          displayAmountTo: t.Nullable(t.Number()),
          minCheckAmount: t.Number(),
          maxCheckAmount: t.Number(),
          displayRates: t.Array(
            t.Object({
              id: t.String(),
              stakePercent: t.Number(),
              amountFrom: t.Number(),
              amountTo: t.Number(),
              sortOrder: t.Number(),
            })
          ),
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

        console.log("[Admin] Updating trader settings:", {
          traderId: params.id,
          displayRates: body.displayRates,
          hasDisplayRates: !!body.displayRates,
          displayRatesLength: body.displayRates?.length || 0
        });

        // Валидация диапазона сумм чека
        if (body.minCheckAmount >= body.maxCheckAmount) {
          return error(400, { error: "Минимальная сумма чека должна быть меньше максимальной" });
        }

        // Используем транзакцию для обновления трейдера и его отображаемых ставок
        const updated = await db.$transaction(async (prisma) => {
          // Обновляем основные данные трейдера
          const updatedTrader = await prisma.user.update({
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
              rateSourceConfigId: body.rateSourceConfigId || null,
              displayStakePercent: body.displayStakePercent ?? null,
              displayAmountFrom: body.displayAmountFrom ?? null,
              displayAmountTo: body.displayAmountTo ?? null,
              minCheckAmount: body.minCheckAmount,
              maxCheckAmount: body.maxCheckAmount,
            }
          });

          // Если есть новые отображаемые ставки, обновляем их
          if (body.displayRates && Array.isArray(body.displayRates)) {
            console.log("[Admin] Processing display rates:", body.displayRates);
            
            // Удаляем старые ставки
            const deletedCount = await prisma.traderDisplayRate.deleteMany({
              where: { traderId: params.id }
            });
            console.log("[Admin] Deleted old rates count:", deletedCount.count);

            // Создаем новые ставки
            if (body.displayRates.length > 0) {
              const ratesToCreate = body.displayRates.map((rate, index) => ({
                traderId: params.id,
                stakePercent: rate.stakePercent,
                amountFrom: rate.amountFrom,
                amountTo: rate.amountTo,
                sortOrder: index,
                isActive: true
              }));
              console.log("[Admin] Creating new rates:", ratesToCreate);
              
              const created = await prisma.traderDisplayRate.createMany({
                data: ratesToCreate
              });
              console.log("[Admin] Created rates count:", created.count);
            }
          } else {
            console.log("[Admin] No displayRates provided or not an array");
          }

          return updatedTrader;
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
        displayStakePercent: t.Optional(t.Nullable(t.Number())),
        displayAmountFrom: t.Optional(t.Nullable(t.Number())),
        displayAmountTo: t.Optional(t.Nullable(t.Number())),
        minCheckAmount: t.Number({ minimum: 0, maximum: 999999999 }),
        maxCheckAmount: t.Number({ minimum: 0, maximum: 999999999 }),
        displayRates: t.Optional(t.Array(t.Object({
          stakePercent: t.Number(),
          amountFrom: t.Number(),
          amountTo: t.Number()
        }))),
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
        400: ErrorSchema,
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
  )

  /* ───────────────── Create display rate ───────────────── */
  .post(
    "/:id/display-rates",
    async ({ params, body, error }) => {
      try {
        console.log("[Admin] Creating display rate for trader:", params.id);

        const trader = await db.user.findUnique({
          where: { id: params.id }
        });

        if (!trader) {
          return error(404, { error: "Трейдер не найден" });
        }

        // Получаем максимальный sortOrder для этого трейдера
        const maxOrder = await db.traderDisplayRate.findFirst({
          where: { traderId: params.id },
          orderBy: { sortOrder: 'desc' },
          select: { sortOrder: true }
        });

        const newRate = await db.traderDisplayRate.create({
          data: {
            traderId: params.id,
            stakePercent: body.stakePercent || 0,
            amountFrom: body.amountFrom || 0,
            amountTo: body.amountTo || 0,
            sortOrder: (maxOrder?.sortOrder || 0) + 1,
            isActive: true
          }
        });

        console.log("[Admin] Created display rate:", newRate.id);
        return { success: true, rate: newRate };
      } catch (e) {
        console.error("[Admin] Error creating display rate:", e);
        throw e;
      }
    },
    {
      tags: ["admin"],
      headers: authHeader,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        stakePercent: t.Optional(t.Number()),
        amountFrom: t.Optional(t.Number()),
        amountTo: t.Optional(t.Number())
      }),
      response: {
        200: t.Object({ 
          success: t.Boolean(),
          rate: t.Object({
            id: t.String(),
            stakePercent: t.Number(),
            amountFrom: t.Number(),
            amountTo: t.Number(),
            sortOrder: t.Number()
          })
        }),
        404: ErrorSchema,
        401: ErrorSchema,
        403: ErrorSchema,
      },
    }
  )

  /* ───────────────── Update display rate ───────────────── */
  .patch(
    "/:id/display-rates/:rateId",
    async ({ params, body, error }) => {
      try {
        console.log("[Admin] Updating display rate:", params.rateId, "for trader:", params.id);

        const rate = await db.traderDisplayRate.findFirst({
          where: { 
            id: params.rateId,
            traderId: params.id 
          }
        });

        if (!rate) {
          return error(404, { error: "Ставка не найдена" });
        }

        const updatedRate = await db.traderDisplayRate.update({
          where: { id: params.rateId },
          data: {
            stakePercent: body.stakePercent ?? rate.stakePercent,
            amountFrom: body.amountFrom ?? rate.amountFrom,
            amountTo: body.amountTo ?? rate.amountTo,
          }
        });

        console.log("[Admin] Updated display rate:", updatedRate.id);
        return { success: true, rate: updatedRate };
      } catch (e) {
        console.error("[Admin] Error updating display rate:", e);
        throw e;
      }
    },
    {
      tags: ["admin"],
      headers: authHeader,
      params: t.Object({ 
        id: t.String(),
        rateId: t.String() 
      }),
      body: t.Object({
        stakePercent: t.Optional(t.Number()),
        amountFrom: t.Optional(t.Number()),
        amountTo: t.Optional(t.Number())
      }),
      response: {
        200: t.Object({ 
          success: t.Boolean(),
          rate: t.Object({
            id: t.String(),
            stakePercent: t.Number(),
            amountFrom: t.Number(),
            amountTo: t.Number(),
            sortOrder: t.Number()
          })
        }),
        404: ErrorSchema,
        401: ErrorSchema,
        403: ErrorSchema,
      },
    }
  )

  /* ───────────────── Delete display rate ───────────────── */
  .delete(
    "/:id/display-rates/:rateId",
    async ({ params, error }) => {
      try {
        console.log("[Admin] Deleting display rate:", params.rateId, "for trader:", params.id);

        const rate = await db.traderDisplayRate.findFirst({
          where: { 
            id: params.rateId,
            traderId: params.id 
          }
        });

        if (!rate) {
          return error(404, { error: "Ставка не найдена" });
        }

        await db.traderDisplayRate.delete({
          where: { id: params.rateId }
        });

        console.log("[Admin] Deleted display rate:", params.rateId);
        return { success: true };
      } catch (e) {
        console.error("[Admin] Error deleting display rate:", e);
        throw e;
      }
    },
    {
      tags: ["admin"],
      headers: authHeader,
      params: t.Object({ 
        id: t.String(),
        rateId: t.String() 
      }),
      response: {
        200: t.Object({ success: t.Boolean() }),
        404: ErrorSchema,
        401: ErrorSchema,
        403: ErrorSchema,
      },
    }
  );