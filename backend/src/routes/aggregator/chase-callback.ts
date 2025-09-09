import { Elysia, t } from "elysia";
import { db } from "@/db";
import { Status } from "@prisma/client";
import { chaseAdapterService } from "@/services/chase-adapter.service";
import ErrorSchema from "@/types/error";

/**
 * Эндпоинт для приема колбэков от Chase-агрегаторов
 */
export default new Elysia()
  .post(
    "/chase-callback/:aggregatorId",
    async ({ params, body, headers, error }) => {
      const startTime = Date.now();
      
      try {
        console.log(`[ChaseCallback] Received callback from Chase aggregator ${params.aggregatorId}:`, body);
        
        // Проверяем существование агрегатора
        const aggregator = await db.aggregator.findUnique({
          where: { id: params.aggregatorId }
        });
        
        if (!aggregator) {
          console.error(`[ChaseCallback] Aggregator ${params.aggregatorId} not found`);
          return error(404, { error: "Aggregator not found" });
        }
        
        // Проверяем, что это Chase-агрегатор
        if (!aggregator.isChaseProject) {
          console.error(`[ChaseCallback] Aggregator ${params.aggregatorId} is not a Chase project`);
          return error(400, { error: "This aggregator is not configured as a Chase project" });
        }
        
        // Проверяем токен авторизации
        const authToken = headers["x-merchant-api-key"] || headers["authorization"]?.replace("Bearer ", "");
        const expectedToken = aggregator.callbackToken || aggregator.customApiToken || aggregator.apiToken;
        
        if (!authToken || authToken !== expectedToken) {
          console.error(`[ChaseCallback] Invalid authentication token`);
          return error(401, { error: "Unauthorized" });
        }
        
        // Логируем входящий колбэк
        const responseTime = Date.now() - startTime;
        
        await db.aggregatorIntegrationLog.create({
          data: {
            aggregatorId: params.aggregatorId,
            direction: "IN" as any,
            eventType: "chase_callback",
            method: "POST",
            url: `/api/aggregator/chase-callback/${params.aggregatorId}`,
            headers: {
              "x-merchant-api-key": authToken ? "[PRESENT]" : "[MISSING]",
              "content-type": headers["content-type"] || "application/json"
            },
            requestBody: body as any,
            responseBody: { success: true } as any,
            statusCode: 200,
            responseTimeMs: responseTime,
            ourDealId: body.transactionId,
            error: null
          }
        });
        
        // Обрабатываем колбэк через адаптер
        const result = await chaseAdapterService.handleCallback({
          transactionId: body.transactionId,
          status: body.status as Status,
          amount: body.amount,
          fee: body.fee,
          metadata: body.metadata
        }, params.aggregatorId);
        
        if (result.success) {
          console.log(`[ChaseCallback] Successfully processed callback for transaction ${body.transactionId}`);
          return { 
            success: true, 
            message: result.message || "Callback processed successfully" 
          };
        } else {
          console.error(`[ChaseCallback] Failed to process callback: ${result.message}`);
          return error(400, { error: result.message || "Failed to process callback" });
        }
      } catch (err) {
        console.error("[ChaseCallback] Error processing callback:", err);
        
        // Логируем ошибку
        await db.aggregatorIntegrationLog.create({
          data: {
            aggregatorId: params.aggregatorId,
            direction: "IN" as any,
            eventType: "chase_callback_error",
            method: "POST",
            url: `/api/aggregator/chase-callback/${params.aggregatorId}`,
            headers: {},
            requestBody: body as any,
            responseBody: { error: "Internal server error" } as any,
            statusCode: 500,
            responseTimeMs: Date.now() - startTime,
            error: err instanceof Error ? err.message : "Unknown error"
          }
        });
        
        return error(500, { error: "Internal server error" });
      }
    },
    {
      params: t.Object({
        aggregatorId: t.String()
      }),
      body: t.Object({
        transactionId: t.String(),
        status: t.String(),
        amount: t.Number(),
        fee: t.Optional(t.Number()),
        currency: t.Optional(t.String()),
        timestamp: t.Optional(t.String()),
        metadata: t.Optional(t.Any())
      }),
      response: {
        200: t.Object({
          success: t.Boolean(),
          message: t.String()
        }),
        400: ErrorSchema,
        401: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema
      },
      detail: {
        tags: ["aggregator"],
        summary: "Chase aggregator callback endpoint"
      }
    }
  );