import { Elysia, t } from "elysia";
import { db } from "@/db";
import { traderGuard } from "@/middleware/traderGuard";
import { Status, DealDisputeStatus, WithdrawalDisputeStatus } from "@prisma/client";
import ErrorSchema from "@/types/error";

export const dashboardRoutes = new Elysia({ prefix: "/dashboard" })
  .use(traderGuard())
  
  // Get dashboard data
  .get("/", async ({ trader, query }) => {
    try {
      const period = query.period || "today";
      const now = new Date();
      let startDate: Date;

      // Calculate start date based on period
      switch (period) {
        case "today":
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case "week":
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case "month":
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case "year":
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
        default:
          startDate = new Date(now.setHours(0, 0, 0, 0));
      }

      const traderId = trader.id;

      // Get financial stats
      const [deals, regularProfits, btProfits] = await Promise.all([
        // Count and sum completed deals
        db.transaction.aggregate({
          where: {
            traderId,
            status: Status.READY,
            createdAt: { gte: startDate }
          },
          _count: true,
          _sum: {
            amount: true
          }
        }),
        // Calculate profits from regular deals (with devices)
        db.transaction.aggregate({
          where: {
            traderId,
            status: Status.READY,
            createdAt: { gte: startDate },
            // Regular deals have device
            requisites: {
              deviceId: { not: null }
            }
          },
          _sum: {
            calculatedCommission: true
          }
        }),
        // Calculate profits from BT-entrance deals (without devices)
        db.transaction.aggregate({
          where: {
            traderId,
            status: Status.READY,
            createdAt: { gte: startDate },
            OR: [
              // BT deals have no device
              { requisites: { deviceId: null } },
              // Or no requisites at all
              { requisites: null }
            ]
          },
          _sum: {
            traderProfit: true
          }
        })
      ]);

      // Get recent deals (last 10)
      const recentDeals = await db.transaction.findMany({
        where: {
          traderId
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          requisites: true
        }
      });

      // Get open disputes
      const [dealDisputes, withdrawalDisputes] = await Promise.all([
        db.dealDispute.findMany({
          where: {
            deal: { traderId },
            status: { in: [DealDisputeStatus.OPEN, DealDisputeStatus.IN_PROGRESS] }
          },
          orderBy: { createdAt: "desc" },
          take: 3,
          include: {
            deal: true
          }
        }),
        db.withdrawalDispute.findMany({
          where: {
            payout: { traderId },
            status: { in: [WithdrawalDisputeStatus.OPEN, WithdrawalDisputeStatus.IN_PROGRESS] }
          },
          orderBy: { createdAt: "desc" },
          take: 2,
          include: {
            payout: true
          }
        })
      ]);

      const openDisputes = [
        ...dealDisputes.map(d => ({
          id: d.id,
          type: 'transaction' as const,
          entityId: d.dealId,
          status: d.status,
          reason: d.resolution || "Спор открыт",
          createdAt: d.createdAt,
          transaction: d.deal
        })),
        ...withdrawalDisputes.map(d => ({
          id: d.id,
          type: 'withdrawal' as const,
          entityId: d.payoutId,
          status: d.status,
          reason: d.resolution || "Спор открыт",
          createdAt: d.createdAt,
          withdrawal: d.payout
        }))
      ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 5);

      // Get recent events (device status changes, failed transactions, etc.)
      const recentEvents = [];
      
      // Get recent device status changes
      const deviceEvents = await db.device.findMany({
        where: { 
          userId: traderId,
          updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
        },
        orderBy: { updatedAt: "desc" },
        take: 5
      });

      for (const device of deviceEvents) {
        recentEvents.push({
          id: `device-${device.id}`,
          type: device.isOnline ? "device_started" : "device_stopped",
          description: `${device.name} ${device.isOnline ? "запущено" : "остановлено"}`,
          createdAt: device.updatedAt
        });
      }

      // Get recent failed transactions
      const failedTransactions = await db.transaction.findMany({
        where: {
          traderId,
          status: { in: [Status.EXPIRED, Status.CANCELED] },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
        },
        orderBy: { createdAt: "desc" },
        take: 3
      });

      for (const tx of failedTransactions) {
        recentEvents.push({
          id: `tx-${tx.id}`,
          type: "deal_failed",
          description: `Сделка #${tx.numericId} ${tx.status === Status.EXPIRED ? "истекла" : "отменена"}`,
          createdAt: tx.createdAt
        });
      }

      // Get recent dispute events
      const [recentDealDisputes, recentWithdrawalDisputes] = await Promise.all([
        db.dealDispute.findMany({
          where: {
            deal: { traderId },
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
          },
          orderBy: { createdAt: "desc" },
          take: 1
        }),
        db.withdrawalDispute.findMany({
          where: {
            payout: { traderId },
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
          },
          orderBy: { createdAt: "desc" },
          take: 1
        })
      ]);

      for (const dispute of recentDealDisputes) {
        recentEvents.push({
          id: `deal-dispute-${dispute.id}`,
          type: "dispute_opened",
          description: `Открыт спор по сделке #${dispute.dealId}`,
          createdAt: dispute.createdAt
        });
      }

      for (const dispute of recentWithdrawalDisputes) {
        recentEvents.push({
          id: `withdrawal-dispute-${dispute.id}`,
          type: "dispute_opened",
          description: `Открыт спор по выплате #${dispute.payoutId}`,
          createdAt: dispute.createdAt
        });
      }

      // Sort events by date
      recentEvents.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // Get devices
      const devices = await db.device.findMany({
        where: { userId: traderId },
        orderBy: { createdAt: "desc" },
        include: {
          bankDetails: {
            where: {
              isArchived: false
            }
          }
        }
      });

      // Calculate total profit from both regular and BT deals
      const totalProfit = (regularProfits._sum.calculatedCommission || 0) + (btProfits._sum.traderProfit || 0);
      
      // Calculate RUB equivalent for profit
      const profitRub = totalProfit * 100; // Assuming 1 USDT = 100 RUB

      return {
        success: true,
        data: {
          financialStats: {
            deals: {
              count: deals._count || 0,
              amount: deals._sum.amount || 0,
              amountRub: (deals._sum.amount || 0) * 100
            },
            profit: {
              amount: totalProfit,
              amountRub: profitRub
            }
          },
          recentDeals: recentDeals.map(deal => ({
            id: deal.id,
            numericId: deal.numericId.toString(),
            amount: deal.amount,
            amountRub: deal.amount * (deal.rate || 100),
            status: deal.status,
            clientName: deal.clientName || "Неизвестен",
            createdAt: deal.createdAt.toISOString(),
            requisites: deal.requisites ? {
              bankType: deal.requisites.bankType,
              cardNumber: deal.requisites.cardNumber
            } : null
          })),
          openDisputes: openDisputes.map(dispute => ({
            id: dispute.id,
            entityId: dispute.entityId,
            status: dispute.status,
            reason: dispute.reason,
            createdAt: dispute.createdAt.toISOString()
          })),
          recentEvents: recentEvents.slice(0, 10).map(event => ({
            ...event,
            createdAt: event.createdAt.toISOString()
          })),
          devices: devices.map(device => ({
            id: device.id,
            name: device.name,
            token: device.token,
            isOnline: device.isOnline,
            isWorking: device.isWorking,
            isActive: device.isOnline || false,
            activeRequisites: device.bankDetails.length,
            linkedBankDetails: device.bankDetails.length,
            stoppedAt: !device.isOnline && device.updatedAt ? device.updatedAt.toISOString() : null,
            status: device.isOnline ? 'working' : 'stopped'
          }))
        }
      };
    } catch (error) {
      console.error("Failed to get dashboard data:", error);
      throw new Error("Failed to get dashboard data");
    }
  }, {
    tags: ["trader"],
    detail: { summary: "Get trader dashboard data" },
    query: t.Object({
      period: t.Optional(t.Union([
        t.Literal("today"),
        t.Literal("week"),
        t.Literal("month"),
        t.Literal("year")
      ]))
    }),
    response: {
      200: t.Object({
        success: t.Boolean(),
        data: t.Object({
          financialStats: t.Object({
            deals: t.Object({
              count: t.Number(),
              amount: t.Number(),
              amountRub: t.Number()
            }),
            profit: t.Object({
              amount: t.Number(),
              amountRub: t.Number()
            })
          }),
          recentDeals: t.Array(t.Object({
            id: t.String(),
            numericId: t.String(),
            amount: t.Number(),
            amountRub: t.Number(),
            status: t.String(),
            clientName: t.String(),
            createdAt: t.String(),
            requisites: t.Union([
              t.Object({
                bankType: t.String(),
                cardNumber: t.String()
              }),
              t.Null()
            ])
          })),
          openDisputes: t.Array(t.Object({
            id: t.String(),
            entityId: t.String(),
            status: t.String(),
            reason: t.String(),
            createdAt: t.String()
          })),
          recentEvents: t.Array(t.Object({
            id: t.String(),
            type: t.String(),
            description: t.String(),
            createdAt: t.String()
          })),
          devices: t.Array(t.Object({
            id: t.String(),
            name: t.String(),
            token: t.String(),
            isOnline: t.Boolean(),
            isWorking: t.Boolean(),
            isActive: t.Boolean(),
            activeRequisites: t.Number(),
            linkedBankDetails: t.Number(),
            stoppedAt: t.Union([t.String(), t.Null()]),
            status: t.String()
          }))
        })
      }),
      401: ErrorSchema,
      403: ErrorSchema,
      500: ErrorSchema
    }
  });