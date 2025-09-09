import { Elysia, t } from "elysia";
import { db } from "@/db";
import { traderGuard } from "@/middleware/traderGuard";
import { Status, DealDisputeStatus, WithdrawalDisputeStatus } from "@prisma/client";
import ErrorSchema from "@/types/error";
import { truncate2 } from "@/utils/rounding";

export const dashboardRoutes = new Elysia({ prefix: "/dashboard" })
  .use(traderGuard())

  // Получить данные дашборда
  .get("/", async ({ trader, query }) => {
    try {
      const period = query.period || "today";
      const now = new Date();
      let startDate: Date;

      // Определяем дату начала периода
      switch (period) {
        case "today":
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case "week":
          // Последние 7 дней
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          startDate.setHours(0, 0, 0, 0);
          break;
        case "month":
          // Начало текущего месяца
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "year":
          // Начало текущего года
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.setHours(0, 0, 0, 0));
      }

      const traderId = trader.id;

      // Получаем финансовую статистику
      const [deals, profitTransactions] = await Promise.all([
        // Считаем и суммируем завершённые сделки
        db.transaction.aggregate({
          where: {
            traderId,
            status: Status.READY,
            acceptedAt: { gte: startDate } // Используем acceptedAt вместо createdAt для более точного расчета
          },
          _count: true,
          _sum: {
            amount: true,
            frozenUsdtAmount: true
          }
        }),
        // Получаем все завершённые сделки для точного расчета прибыли (как в профиле)
        db.transaction.findMany({
          where: {
            traderId,
            status: Status.READY,
            acceptedAt: { gte: startDate } // Используем acceptedAt вместо createdAt для более точного расчета
          },
          select: {
            traderProfit: true
          }
        })
      ]);

      // Получаем последние сделки (10)
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

      // Получаем открытые споры
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

      // Получаем последние события (смены статуса устройств, неудачные сделки и т.д.)
      const recentEvents = [];
      
      // Последние изменения статуса устройств
      const deviceEvents = await db.device.findMany({
        where: { 
          userId: traderId,
          updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // За 7 дней
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

      // Последние неудачные сделки
      const failedTransactions = await db.transaction.findMany({
        where: {
          traderId,
          status: { in: [Status.EXPIRED, Status.CANCELED] },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // За 24 часа
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

      // Последние события по спорам
      const [recentDealDisputes, recentWithdrawalDisputes] = await Promise.all([
        db.dealDispute.findMany({
          where: {
            deal: { traderId },
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // За 24 часа
          },
          orderBy: { createdAt: "desc" },
          take: 1
        }),
        db.withdrawalDispute.findMany({
          where: {
            payout: { traderId },
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // За 24 часа
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

      // Сортируем события по дате
      recentEvents.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // Получаем устройства
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

      // Считаем прибыль точно так же, как она записывается в профиль (с округлением каждой транзакции)
      const totalProfit = profitTransactions.reduce((sum, tx) => {
        return sum + truncate2(tx.traderProfit || 0);
      }, 0);


      // Переводим прибыль в рубли (условно 1 USDT = 100 RUB)
      const profitRub = totalProfit * 100;

      return {
        success: true,
        data: {
          financialStats: {
            deals: {
              count: deals._count || 0,
              amount: deals._sum.frozenUsdtAmount || 0,
              amountRub: (deals._sum.amount || 0)
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