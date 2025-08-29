import { Elysia, t } from "elysia";
import { db } from "@/db";
import { IntegrationDirection } from "@prisma/client";
import { aggregatorServiceV2 } from "@/services/aggregator-v2.service";
import ErrorSchema from "@/types/error";

/**
 * API endpoint для приема callback'ов от агрегаторов
 * Поддерживает одиночные и массовые обновления
 */

// Схема одного callback'а
const CallbackSchema = t.Object({
  ourDealId: t.String({
    description: "ID сделки в нашей системе",
  }),
  status: t.Optional(
    t.Union([
      t.Literal("CREATED"),
      t.Literal("IN_PROGRESS"),
      t.Literal("READY"),
      t.Literal("CANCELED"),
      t.Literal("EXPIRED"),
      t.Literal("DISPUTE"),
      t.Literal("MILK"),
    ])
  ),
  amount: t.Optional(t.Number({ description: "Новая сумма транзакции" })),
  partnerDealId: t.Optional(t.String({ description: "ID сделки у агрегатора" })),
  updatedAt: t.Optional(t.String({ description: "ISO-8601 timestamp" })),
  reason: t.Optional(t.String({ description: "Причина изменения статуса" })),
  metadata: t.Optional(t.Object({}, { additionalProperties: true })),
});

// Схема массового callback'а
const BatchCallbackSchema = t.Array(CallbackSchema, {
  minItems: 1,
  maxItems: 100,
  description: "Массив callback'ов для обработки",
});

// Middleware для проверки токена агрегатора
const aggregatorCallbackAuth = async (context: any) => {
  const authHeader = context.headers["authorization"];
  const aggregatorToken = context.headers["x-aggregator-token"];
  
  let token: string | null = null;
  
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else if (aggregatorToken) {
    token = aggregatorToken;
  }
  
  if (!token) {
    return context.error(401, { error: "Missing authentication token" });
  }
  
  // Находим агрегатора по callbackToken
  const aggregator = await db.aggregator.findUnique({
    where: { callbackToken: token },
  });
  
  if (!aggregator) {
    return context.error(401, { error: "Invalid token" });
  }
  
  if (!aggregator.isActive) {
    return context.error(403, { error: "Aggregator is disabled" });
  }
  
  context.aggregator = aggregator;
};

export default (app: Elysia) =>
  app
    .group("/api/aggregators", (app) =>
      app
        // Одиночный callback
        .post(
          "/callback",
          async ({ aggregator, body, headers, error }) => {
            const startTime = Date.now();
            
            try {
              // Логируем входящий запрос
              await db.aggregatorIntegrationLog.create({
                data: {
                  aggregatorId: aggregator.id,
                  direction: IntegrationDirection.IN,
                  eventType: "callback_single",
                  method: "POST",
                  url: "/api/aggregators/callback",
                  headers: JSON.parse(JSON.stringify(headers)),
                  requestBody: body,
                  ourDealId: body.ourDealId,
                  partnerDealId: body.partnerDealId,
                },
              });
              
              // Обрабатываем callback
              const result = await aggregatorServiceV2.processCallback(aggregator, body);
              
              const responseTimeMs = Date.now() - startTime;
              
              // Обновляем лог с результатом
              await db.aggregatorIntegrationLog.updateMany({
                where: {
                  aggregatorId: aggregator.id,
                  ourDealId: body.ourDealId,
                  createdAt: {
                    gte: new Date(startTime),
                  },
                },
                data: {
                  responseBody: result,
                  statusCode: result.success ? 200 : 400,
                  responseTimeMs,
                },
              });
              
              if (result.success) {
                return {
                  status: "accepted",
                  ourDealId: body.ourDealId,
                  message: "Callback processed successfully",
                };
              } else {
                return error(400, {
                  status: "error",
                  ourDealId: body.ourDealId,
                  error: result.error,
                });
              }
            } catch (e) {
              console.error("[AggregatorCallback] Error processing callback:", e);
              
              const responseTimeMs = Date.now() - startTime;
              
              // Логируем ошибку
              await db.aggregatorIntegrationLog.updateMany({
                where: {
                  aggregatorId: aggregator.id,
                  ourDealId: body.ourDealId,
                  createdAt: {
                    gte: new Date(startTime),
                  },
                },
                data: {
                  error: String(e),
                  statusCode: 500,
                  responseTimeMs,
                },
              });
              
              return error(500, {
                status: "error",
                ourDealId: body.ourDealId,
                error: "Internal server error",
              });
            }
          },
          {
            beforeHandle: aggregatorCallbackAuth,
            body: CallbackSchema,
            response: {
              200: t.Object({
                status: t.String(),
                ourDealId: t.String(),
                message: t.String(),
              }),
              400: t.Object({
                status: t.String(),
                ourDealId: t.String(),
                error: t.String(),
              }),
              401: ErrorSchema,
              403: ErrorSchema,
              500: t.Object({
                status: t.String(),
                ourDealId: t.String(),
                error: t.String(),
              }),
            },
            detail: {
              tags: ["Aggregator Callbacks"],
              summary: "Process single callback from aggregator",
              description: "Receive and process a single status update or amount change from aggregator",
            },
          }
        )
        
        // Массовый callback
        .post(
          "/callback/batch",
          async ({ aggregator, body, headers, error }) => {
            const startTime = Date.now();
            
            try {
              // Логируем входящий запрос
              await db.aggregatorIntegrationLog.create({
                data: {
                  aggregatorId: aggregator.id,
                  direction: IntegrationDirection.IN,
                  eventType: "callback_batch",
                  method: "POST",
                  url: "/api/aggregators/callback/batch",
                  headers: JSON.parse(JSON.stringify(headers)),
                  requestBody: body,
                  metadata: { count: body.length },
                },
              });
              
              // Обрабатываем callbacks
              const result = await aggregatorServiceV2.processCallback(aggregator, body);
              
              const responseTimeMs = Date.now() - startTime;
              
              // Обновляем лог с результатом
              await db.aggregatorIntegrationLog.updateMany({
                where: {
                  aggregatorId: aggregator.id,
                  eventType: "callback_batch",
                  createdAt: {
                    gte: new Date(startTime),
                  },
                },
                data: {
                  responseBody: result,
                  statusCode: 200,
                  responseTimeMs,
                  slaViolation: responseTimeMs > 2000,
                },
              });
              
              return {
                status: "accepted",
                processed: body.length,
                results: result.results,
              };
            } catch (e) {
              console.error("[AggregatorCallback] Error processing batch callback:", e);
              
              const responseTimeMs = Date.now() - startTime;
              
              // Логируем ошибку
              await db.aggregatorIntegrationLog.updateMany({
                where: {
                  aggregatorId: aggregator.id,
                  eventType: "callback_batch",
                  createdAt: {
                    gte: new Date(startTime),
                  },
                },
                data: {
                  error: String(e),
                  statusCode: 500,
                  responseTimeMs,
                },
              });
              
              return error(500, {
                status: "error",
                error: "Internal server error",
              });
            }
          },
          {
            beforeHandle: aggregatorCallbackAuth,
            body: BatchCallbackSchema,
            response: {
              200: t.Object({
                status: t.String(),
                processed: t.Number(),
                results: t.Array(
                  t.Object({
                    ourDealId: t.String(),
                    status: t.String(),
                    message: t.String(),
                  })
                ),
              }),
              401: ErrorSchema,
              403: ErrorSchema,
              500: t.Object({
                status: t.String(),
                error: t.String(),
              }),
            },
            detail: {
              tags: ["Aggregator Callbacks"],
              summary: "Process batch callbacks from aggregator",
              description: "Receive and process multiple status updates or amount changes from aggregator (up to 100)",
            },
          }
        )
        
        // Получение журнала интеграций (для ЛК агрегатора)
        .get(
          "/integration-logs",
          async ({ aggregator, query }) => {
            const page = parseInt(query.page || "1");
            const limit = parseInt(query.limit || "20");
            const skip = (page - 1) * limit;
            
            const where: any = {
              aggregatorId: aggregator.id,
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
                take: limit,
              }),
              db.aggregatorIntegrationLog.count({ where }),
            ]);
            
            return {
              data: logs.map((log) => ({
                ...log,
                createdAt: log.createdAt.toISOString(),
              })),
              meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
              },
            };
          },
          {
            beforeHandle: aggregatorCallbackAuth,
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              direction: t.Optional(t.Union([t.Literal("IN"), t.Literal("OUT")])),
              eventType: t.Optional(t.String()),
              ourDealId: t.Optional(t.String()),
              partnerDealId: t.Optional(t.String()),
              slaViolation: t.Optional(t.String()),
              dateFrom: t.Optional(t.String()),
              dateTo: t.Optional(t.String()),
            }),
            response: {
              200: t.Object({
                data: t.Array(
                  t.Object({
                    id: t.String(),
                    aggregatorId: t.String(),
                    direction: t.String(),
                    eventType: t.String(),
                    method: t.String(),
                    url: t.String(),
                    headers: t.Any(),
                    requestBody: t.Any(),
                    responseBody: t.Any(),
                    statusCode: t.Optional(t.Number()),
                    responseTimeMs: t.Optional(t.Number()),
                    slaViolation: t.Boolean(),
                    idempotencyKey: t.Optional(t.String()),
                    ourDealId: t.Optional(t.String()),
                    partnerDealId: t.Optional(t.String()),
                    error: t.Optional(t.String()),
                    metadata: t.Any(),
                    createdAt: t.String(),
                  })
                ),
                meta: t.Object({
                  total: t.Number(),
                  page: t.Number(),
                  limit: t.Number(),
                  totalPages: t.Number(),
                }),
              }),
              401: ErrorSchema,
              403: ErrorSchema,
            },
            detail: {
              tags: ["Aggregator Integration"],
              summary: "Get integration logs",
              description: "Get paginated list of integration logs for the authenticated aggregator",
            },
          }
        )
    );
