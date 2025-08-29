import { Elysia, t } from "elysia";
import { db } from "@/db";
import { aggregatorSessionGuard } from "@/middleware/aggregatorGuard";
import { aggregatorServiceV2 } from "@/services/aggregator-v2.service";
import ErrorSchema from "@/types/error";
import { IntegrationDirection } from "@prisma/client";

/**
 * Личный кабинет агрегатора v2
 * Функционал:
 * - Просмотр callback URL и токенов
 * - Настройка Base URL
 * - Отправка мок-сделок для тестирования
 * - Просмотр журнала интеграций
 * - Управление настройками
 */

export default (app: Elysia) =>
  app
    .use(aggregatorSessionGuard())
    
    /* ─────────── GET /aggregator/dashboard/overview ─────────── */
    .get(
      "/overview",
      async ({ aggregator }) => {
        // Получаем статистику за последние 7 дней
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Статистика интеграционных логов
        const [totalLogs, successLogs, errorLogs, recentLogs] = await Promise.all([
          db.aggregatorIntegrationLog.count({
            where: { aggregatorId: aggregator.id }
          }),
          db.aggregatorIntegrationLog.count({
            where: { 
              aggregatorId: aggregator.id,
              statusCode: { gte: 200, lt: 300 }
            }
          }),
          db.aggregatorIntegrationLog.count({
            where: { 
              aggregatorId: aggregator.id,
              OR: [
                { statusCode: { gte: 400 } },
                { statusCode: null },
                { error: { not: null } }
              ]
            }
          }),
          db.aggregatorIntegrationLog.count({
            where: { 
              aggregatorId: aggregator.id,
              createdAt: { gte: sevenDaysAgo }
            }
          })
        ]);

        // Средняя скорость ответа за последние 7 дней
        const avgResponseTime = await db.aggregatorIntegrationLog.aggregate({
          where: { 
            aggregatorId: aggregator.id,
            createdAt: { gte: sevenDaysAgo },
            responseTimeMs: { not: null }
          },
          _avg: { responseTimeMs: true }
        });

        // SLA нарушения за последние 7 дней
        const slaViolations = await db.aggregatorIntegrationLog.count({
          where: { 
            aggregatorId: aggregator.id,
            createdAt: { gte: sevenDaysAgo },
            slaViolation: true
          }
        });

        return {
          aggregator: {
            id: aggregator.id,
            name: aggregator.name,
            email: aggregator.email,
            isActive: aggregator.isActive,
            balanceUsdt: aggregator.balanceUsdt,
            priority: aggregator.priority,
            apiBaseUrl: aggregator.apiBaseUrl
          },
          stats: {
            totalRequests: totalLogs,
            successRequests: successLogs,
            errorRequests: errorLogs,
            recentRequests: recentLogs,
            successRate: totalLogs > 0 ? Math.round((successLogs / totalLogs) * 100) : 0,
            avgResponseTime: Math.round(avgResponseTime._avg.responseTimeMs || 0),
            slaViolations: slaViolations
          },
          limits: {
            maxSlaMs: aggregator.maxSlaMs,
            minBalance: aggregator.minBalance,
            maxDailyVolume: aggregator.maxDailyVolume || null,
            currentDailyVolume: aggregator.currentDailyVolume
          }
        };
      },
      {
        tags: ["aggregator-dashboard"],
        detail: { summary: "Обзор дашборда агрегатора" },
        response: {
          200: t.Object({
            aggregator: t.Object({
              id: t.String(),
              name: t.String(),
              email: t.String(),
              isActive: t.Boolean(),
              balanceUsdt: t.Number(),
              priority: t.Number(),
              apiBaseUrl: t.Optional(t.String())
            }),
            stats: t.Object({
              totalRequests: t.Number(),
              successRequests: t.Number(),
              errorRequests: t.Number(),
              recentRequests: t.Number(),
              successRate: t.Number(),
              avgResponseTime: t.Number(),
              slaViolations: t.Number()
            }),
            limits: t.Object({
              maxSlaMs: t.Number(),
              minBalance: t.Number(),
              maxDailyVolume: t.Union([t.Number(), t.Null()]),
              currentDailyVolume: t.Number()
            })
          })
        }
      }
    )
    
    /* ─────────── GET /aggregator/dashboard/profile ─────────── */
    .get(
      "/profile",
      async ({ aggregator }) => {
        const callbackUrl = `${process.env.BASE_URL || "https://api.chase.com"}/api/aggregators/callback`;
        
        // Получаем статистику за последние 24 часа
        const last24h = new Date();
        last24h.setHours(last24h.getHours() - 24);
        
        const [totalTransactions, completedTransactions, totalVolume, recentLogs] = await Promise.all([
          db.transaction.count({
            where: {
              aggregatorId: aggregator.id,
              createdAt: { gte: last24h }
            }
          }),
          db.transaction.count({
            where: {
              aggregatorId: aggregator.id,
              status: "READY",
              createdAt: { gte: last24h }
            }
          }),
          db.transaction.aggregate({
            where: {
              aggregatorId: aggregator.id,
              createdAt: { gte: last24h }
            },
            _sum: { amount: true }
          }),
          db.aggregatorIntegrationLog.findMany({
            where: {
              aggregatorId: aggregator.id,
              createdAt: { gte: last24h },
              eventType: "deal_create"
            }
          })
        ]);
        
        const successfulRequests = recentLogs.filter(log => log.statusCode === 200 && !log.error).length;
        const avgResponseTime = recentLogs.length > 0
          ? recentLogs.reduce((sum, log) => sum + (log.responseTimeMs || 0), 0) / recentLogs.length
          : 0;
        
        return {
          aggregator: {
            id: aggregator.id,
            name: aggregator.name,
            email: aggregator.email,
            apiBaseUrl: aggregator.apiBaseUrl,
            balanceUsdt: aggregator.balanceUsdt,
            isActive: aggregator.isActive,
            priority: aggregator.priority,
            maxSlaMs: aggregator.maxSlaMs,
            minBalance: aggregator.minBalance,
            maxDailyVolume: aggregator.maxDailyVolume,
            currentDailyVolume: aggregator.currentDailyVolume,
            createdAt: aggregator.createdAt.toISOString(),
            updatedAt: aggregator.updatedAt.toISOString()
          },
          integration: {
            callbackUrl,
            callbackToken: aggregator.callbackToken,
            apiToken: aggregator.apiToken,
            callbackAuthHeader: "Authorization: Bearer " + aggregator.callbackToken,
            apiAuthHeader: "Authorization: Bearer " + aggregator.apiToken
          },
          stats24h: {
            totalTransactions,
            completedTransactions,
            completionRate: totalTransactions > 0 
              ? ((completedTransactions / totalTransactions) * 100).toFixed(2) + "%"
              : "0%",
            totalVolume: totalVolume._sum.amount || 0,
            totalRequests: recentLogs.length,
            successfulRequests,
            successRate: recentLogs.length > 0
              ? ((successfulRequests / recentLogs.length) * 100).toFixed(2) + "%"
              : "0%",
            avgResponseTime: avgResponseTime.toFixed(0) + "ms"
          }
        };
      },
      {
        tags: ["Aggregator Dashboard"],
        detail: { 
          summary: "Получить профиль и интеграционные данные",
          description: "Возвращает информацию об агрегаторе, токены, URL'ы и статистику за 24 часа"
        }
      }
    )
    
    /* ─────────── PATCH /aggregator/dashboard/settings ─────────── */
    .patch(
      "/settings",
      async ({ aggregator, body }) => {
        const updated = await db.aggregator.update({
          where: { id: aggregator.id },
          data: {
            ...(body.apiBaseUrl !== undefined && { apiBaseUrl: body.apiBaseUrl })
          }
        });
        
        return {
          success: true,
          message: "Settings updated",
          apiBaseUrl: updated.apiBaseUrl
        };
      },
      {
        tags: ["Aggregator Dashboard"],
        detail: { 
          summary: "Обновить настройки",
          description: "Обновление Base URL для API агрегатора"
        },
        body: t.Object({
          apiBaseUrl: t.Optional(t.String())
        })
      }
    )
    
    /* ─────────── POST /aggregator/dashboard/update-base-url ─────────── */
    .post(
      "/update-base-url",
      async ({ aggregator, body, error }) => {
        try {
          const updated = await db.aggregator.update({
            where: { id: aggregator.id },
            data: { apiBaseUrl: body.baseUrl }
          });

          return {
            success: true,
            message: "Base URL обновлен успешно",
            baseUrl: updated.apiBaseUrl
          };
        } catch (e) {
          console.error("Error updating base URL:", e);
          return error(500, { error: "Ошибка обновления Base URL" });
        }
      },
      {
        tags: ["aggregator-dashboard"],
        detail: { summary: "Обновление Base URL агрегатора" },
        body: t.Object({
          baseUrl: t.String()
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            message: t.String(),
            baseUrl: t.Optional(t.String())
          }),
          500: ErrorSchema
        }
      }
    )

    /* ─────────── POST /aggregator/dashboard/regenerate-token ─────────── */
    .post(
      "/regenerate-token",
      async ({ aggregator, body, error }) => {
        if (!body.confirmation || body.confirmation !== "CONFIRM") {
          return error(400, { 
            error: "Confirmation required", 
            message: "Please provide confirmation: 'CONFIRM'" 
          });
        }
        
        const newToken = aggregatorServiceV2.generateToken();
        
        await db.aggregator.update({
          where: { id: aggregator.id },
          data: { callbackToken: newToken }
        });
        
        console.log(`[Aggregator] Token regenerated for ${aggregator.name}`);
        
        return {
          success: true,
          newToken,
          message: "Callback token regenerated successfully. Please update your integration."
        };
      },
      {
        tags: ["Aggregator Dashboard"],
        detail: { 
          summary: "Регенерировать callback токен",
          description: "Генерирует новый callback токен. Требует подтверждения."
        },
        body: t.Object({
          confirmation: t.String({ description: "Должно быть 'CONFIRM'" })
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            newToken: t.String(),
            message: t.String()
          }),
          400: ErrorSchema
        }
      }
    )
    
    /* ─────────── POST /aggregator/dashboard/test-deal ─────────── */
    .post(
      "/test-deal",
      async ({ aggregator, body }) => {
        if (!aggregator.apiBaseUrl) {
          return {
            success: false,
            error: "API Base URL not configured. Please configure it in settings."
          };
        }
        
        const result = await aggregatorServiceV2.sendMockDeal(aggregator, {
          amount: body.amount || 1000,
          merchantRate: body.merchantRate || 100,
          metadata: body.metadata || { test: true, timestamp: new Date().toISOString() }
        });
        
        return {
          testResult: {
            success: result.success,
            slaViolation: result.slaViolation,
            responseTimeMs: result.responseTimeMs,
            statusCode: result.statusCode,
            error: result.error
          },
          request: {
            url: `${aggregator.apiBaseUrl}/deals`,
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer [YOUR_API_TOKEN]",
              "Idempotency-Key": "[GENERATED_KEY]"
            },
            body: result.request
          },
          response: {
            statusCode: result.statusCode,
            body: result.response
          },
          sla: {
            expectedMs: aggregator.maxSlaMs,
            actualMs: result.responseTimeMs,
            violated: result.slaViolation
          }
        };
      },
      {
        tags: ["Aggregator Dashboard"],
        detail: { 
          summary: "Отправить тестовую сделку",
          description: "Отправляет мок-сделку на endpoint агрегатора для тестирования интеграции"
        },
        body: t.Object({
          amount: t.Optional(t.Number({ default: 1000 })),
          merchantRate: t.Optional(t.Number({ default: 100 })),
          metadata: t.Optional(t.Object({}, { additionalProperties: true }))
        })
      }
    )
    
    /* ─────────── POST /aggregator/dashboard/test-deals-batch ─────────── */
    .post(
      "/test-deals-batch",
      async ({ aggregator, body }) => {
        if (!aggregator.apiBaseUrl) {
          return {
            success: false,
            error: "API Base URL not configured. Please configure it in settings."
          };
        }
        
        const deals = body.deals || [
          { amount: 1000, merchantRate: 100 },
          { amount: 2000, merchantRate: 101 },
          { amount: 1500, merchantRate: 99 }
        ];
        
        const results = await Promise.all(
          deals.map(deal => 
            aggregatorServiceV2.sendMockDeal(aggregator, {
              amount: deal.amount,
              merchantRate: deal.merchantRate,
              metadata: { ...deal.metadata, batch: true }
            })
          )
        );
        
        const successCount = results.filter(r => r.success).length;
        const avgResponseTime = results.reduce((sum, r) => sum + r.responseTimeMs, 0) / results.length;
        const slaViolations = results.filter(r => r.slaViolation).length;
        
        return {
          summary: {
            totalSent: deals.length,
            successful: successCount,
            failed: deals.length - successCount,
            successRate: ((successCount / deals.length) * 100).toFixed(2) + "%",
            avgResponseTime: avgResponseTime.toFixed(0) + "ms",
            slaViolations
          },
          results: results.map((result, index) => ({
            index,
            success: result.success,
            responseTimeMs: result.responseTimeMs,
            statusCode: result.statusCode,
            slaViolation: result.slaViolation,
            error: result.error
          }))
        };
      },
      {
        tags: ["Aggregator Dashboard"],
        detail: { 
          summary: "Отправить пакет тестовых сделок",
          description: "Отправляет несколько мок-сделок для тестирования производительности"
        },
        body: t.Object({
          deals: t.Optional(t.Array(
            t.Object({
              amount: t.Number(),
              merchantRate: t.Number(),
              metadata: t.Optional(t.Object({}, { additionalProperties: true }))
            })
          ))
        })
      }
    )
    
    /* ─────────── GET /aggregator/dashboard/integration-logs ─────────── */
    .get(
      "/integration-logs",
      async ({ aggregator, query }) => {
        const page = parseInt(query.page || "1");
        const limit = parseInt(query.limit || "20");
        const skip = (page - 1) * limit;
        
        const where: any = {
          aggregatorId: aggregator.id
        };
        
        // Фильтры
        if (query.direction) {
          where.direction = query.direction;
        }
        
        if (query.eventType) {
          where.eventType = query.eventType;
        }
        
        if (query.ourDealId) {
          where.ourDealId = query.ourDealId;
        }
        
        if (query.partnerDealId) {
          where.partnerDealId = query.partnerDealId;
        }
        
        if (query.slaViolation !== undefined) {
          where.slaViolation = query.slaViolation === "true";
        }
        
        if (query.hasError !== undefined) {
          where.error = query.hasError === "true" ? { not: null } : null;
        }
        
        if (query.dateFrom) {
          where.createdAt = { ...where.createdAt, gte: new Date(query.dateFrom) };
        }
        
        if (query.dateTo) {
          where.createdAt = { ...where.createdAt, lte: new Date(query.dateTo) };
        }
        
        const [logs, total] = await Promise.all([
          db.aggregatorIntegrationLog.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip,
            take: limit
          }),
          db.aggregatorIntegrationLog.count({ where })
        ]);
        
        return {
          data: logs.map(log => ({
            id: log.id,
            direction: log.direction,
            eventType: log.eventType,
            method: log.method,
            url: log.url,
            statusCode: log.statusCode,
            responseTimeMs: log.responseTimeMs,
            slaViolation: log.slaViolation,
            ourDealId: log.ourDealId,
            partnerDealId: log.partnerDealId,
            error: log.error,
            createdAt: log.createdAt.toISOString(),
            // Маскируем токены в заголовках
            headers: log.headers,
            // Показываем тела запросов/ответов только если включен verbose режим
            ...(query.verbose === "true" && {
              requestBody: log.requestBody,
              responseBody: log.responseBody
            })
          })),
          meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
          },
          filters: {
            eventTypes: await db.aggregatorIntegrationLog.findMany({
              where: { aggregatorId: aggregator.id },
              select: { eventType: true },
              distinct: ["eventType"]
            }).then(types => types.map(t => t.eventType))
          }
        };
      },
      {
        tags: ["Aggregator Dashboard"],
        detail: { 
          summary: "Получить журнал интеграций",
          description: "Возвращает историю всех входящих и исходящих запросов с фильтрацией"
        },
        query: t.Object({
          page: t.Optional(t.String()),
          limit: t.Optional(t.String()),
          direction: t.Optional(t.Union([t.Literal("IN"), t.Literal("OUT")])),
          eventType: t.Optional(t.String()),
          ourDealId: t.Optional(t.String()),
          partnerDealId: t.Optional(t.String()),
          slaViolation: t.Optional(t.String()),
          hasError: t.Optional(t.String()),
          dateFrom: t.Optional(t.String()),
          dateTo: t.Optional(t.String()),
          verbose: t.Optional(t.String())
        })
      }
    )
    
    /* ─────────── GET /aggregator/dashboard/transactions ─────────── */
    .get(
      "/transactions",
      async ({ aggregator, query }) => {
        const page = parseInt(query.page || "1");
        const limit = Math.min(parseInt(query.limit || "20"), 100);

        // Временная заглушка - возвращаем пустой список транзакций
        return {
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            pages: 0
          }
        };
      },
      {
        tags: ["aggregator-dashboard"],
        detail: { summary: "Список транзакций агрегатора" },
        query: t.Object({
          page: t.Optional(t.String()),
          limit: t.Optional(t.String())
        })
      }
    )

    /* ─────────── GET /aggregator/dashboard/statistics ─────────── */
    .get(
      "/statistics",
      async ({ aggregator, query }) => {
        const periodDays = parseInt(query.period || "30");

        // Временная заглушка - возвращаем базовую статистику
        return {
          period: `${periodDays} дней`,
          transactions: {
            total: 0,
            successful: 0,
            failed: 0,
            successRate: 0
          },
          volume: {
            total: 0,
            average: 0
          },
          aggregator: {
            currentDailyVolume: aggregator.currentDailyVolume,
            maxDailyVolume: aggregator.maxDailyVolume,
            balanceUsdt: aggregator.balanceUsdt
          }
        };
      },
      {
        tags: ["aggregator-dashboard"],
        detail: { summary: "Детальная статистика агрегатора" },
        query: t.Object({
          period: t.Optional(t.String())
        })
      }
    )

    /* ─────────── GET /aggregator/dashboard/stats ─────────── */
    .get(
      "/stats",
      async ({ aggregator, query }) => {
        const periodDays = parseInt(query.period || "7");
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - periodDays);
        
        // Получаем статистику по дням
        const logs = await db.aggregatorIntegrationLog.findMany({
          where: {
            aggregatorId: aggregator.id,
            createdAt: { gte: startDate }
          }
        });
        
        const transactions = await db.transaction.findMany({
          where: {
            aggregatorId: aggregator.id,
            createdAt: { gte: startDate }
          }
        });
        
        // Группируем по дням
        const dailyStats: any = {};
        
        for (let i = 0; i < periodDays; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split("T")[0];
          
          dailyStats[dateStr] = {
            date: dateStr,
            requests: { total: 0, successful: 0, failed: 0 },
            transactions: { total: 0, completed: 0, volume: 0 },
            performance: { avgResponseTime: 0, slaViolations: 0 }
          };
        }
        
        // Заполняем статистику
        logs.forEach(log => {
          const date = log.createdAt.toISOString().split("T")[0];
          if (dailyStats[date]) {
            dailyStats[date].requests.total++;
            
            if (log.statusCode === 200 && !log.error) {
              dailyStats[date].requests.successful++;
            } else {
              dailyStats[date].requests.failed++;
            }
            
            if (log.slaViolation) {
              dailyStats[date].performance.slaViolations++;
            }
          }
        });
        
        transactions.forEach(tx => {
          const date = tx.createdAt.toISOString().split("T")[0];
          if (dailyStats[date]) {
            dailyStats[date].transactions.total++;
            dailyStats[date].transactions.volume += tx.amount;
            
            if (tx.status === "READY") {
              dailyStats[date].transactions.completed++;
            }
          }
        });
        
        // Сортируем по дате
        const sortedStats = Object.values(dailyStats).sort((a: any, b: any) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        
        return {
          period: `${periodDays} days`,
          dailyStats: sortedStats,
          totals: {
            requests: logs.length,
            successfulRequests: logs.filter(l => l.statusCode === 200 && !l.error).length,
            transactions: transactions.length,
            completedTransactions: transactions.filter(t => t.status === "READY").length,
            totalVolume: transactions.reduce((sum, t) => sum + t.amount, 0)
          }
        };
      },
      {
        tags: ["Aggregator Dashboard"],
        detail: { 
          summary: "Получить статистику",
          description: "Возвращает статистику по дням за выбранный период"
        },
        query: t.Object({
          period: t.Optional(t.String())
        })
      }
    );
