import { Elysia, t } from "elysia";
import { externalAggregatorGuard } from "@/middleware/externalAggregatorGuard";
import { externalAggregatorService } from "@/services/external-aggregator.service";
import ErrorSchema from "@/types/error";
import { db } from "@/db";
import { Status } from "@prisma/client";

/**
 * API эндпоинты для приёма заявок от внешних систем
 * через агрегаторский интерфейс
 */
export default (app: Elysia) =>
  app
    .use(externalAggregatorGuard())
    
    /* ──────── POST /api/external/aggregator/deals ──────── */
    .post(
      "/deals",
      async ({ externalMerchant, body, set, error }) => {
        console.log('[ExternalAggregator] Received context:', { 
          hasExternalMerchant: !!externalMerchant,
          merchantId: externalMerchant?.id,
          body 
        });
        
        if (!externalMerchant) {
          console.error('[ExternalAggregator] No externalMerchant in context!');
          return error(500, {
            error: "Internal server error",
            details: "Merchant context not found"
          });
        }
        
        console.log(
          `[ExternalAggregator] Creating deal for merchant ${externalMerchant.name}`,
          body
        );
        
        // Проверяем обязательные поля
        if (!body.ourDealId || !body.amount || !body.paymentMethod) {
          return error(400, {
            error: "Missing required fields",
            details: "ourDealId, amount, and paymentMethod are required"
          });
        }
        
        // Валидация метода платежа
        if (!["SBP", "C2C"].includes(body.paymentMethod)) {
          return error(400, {
            error: "Invalid payment method",
            details: "paymentMethod must be 'SBP' or 'C2C'"
          });
        }
        
        // Проверяем уникальность ourDealId
        const existing = await db.transaction.findFirst({
          where: {
            merchantId: externalMerchant.id,
            orderId: body.ourDealId
          }
        });
        
        if (existing) {
          return error(409, {
            error: "Deal with this ourDealId already exists",
            details: `Deal ${body.ourDealId} already registered`
          });
        }
        
        // Создаём сделку через сервис
        const result = await externalAggregatorService.createDeal(
          externalMerchant,
          body
        );
        
        if (!result.accepted) {
          return error(400, {
            error: result.message || "Deal creation failed"
          });
        }
        
        set.status = 201;
        return result;
      },
      {
        tags: ["external-aggregator"],
        detail: { summary: "Создание сделки (как /merchant/transactions/in)" },
        body: t.Object({
          ourDealId: t.String({ description: "ID сделки во внешней системе" }),
          amount: t.Number({ description: "Сумма в рублях" }),
          rate: t.Optional(t.Number({ description: "Курс USDT/RUB" })),
          paymentMethod: t.String({ description: "Метод платежа: SBP или C2C" }),
          bankType: t.Optional(t.String({ description: "Тип банка для C2C" })),
          clientIdentifier: t.Optional(t.String({ description: "Идентификатор клиента" })),
          callbackUrl: t.Optional(t.String({ description: "URL для отправки колбэков" })),
          expiresAt: t.Optional(t.String({ description: "ISO дата истечения" })),
          metadata: t.Optional(t.Object({}, { additionalProperties: true }))
        }),
        response: {
          201: t.Object({
            accepted: t.Boolean(),
            partnerDealId: t.String({ description: "ID сделки в нашей системе" }),
            requisites: t.Optional(t.Object({
              bankName: t.Optional(t.String()),
              cardNumber: t.Optional(t.String()),
              phoneNumber: t.Optional(t.String()),
              recipientName: t.Optional(t.String()),
              bankCode: t.Optional(t.String()),
              additionalInfo: t.Optional(t.String())
            })),
            dealDetails: t.Optional(t.Object({
              id: t.String(),
              amount: t.Number(),
              status: t.String(),
              createdAt: t.String(),
              expiresAt: t.String(),
              paymentMethod: t.String(),
              metadata: t.Optional(t.Any())
            })),
            message: t.Optional(t.String())
          }),
          400: ErrorSchema,
          401: ErrorSchema,
          409: ErrorSchema
        }
      }
    )
    
    /* ──────── GET /api/external/aggregator/deals/:partnerDealId ──────── */
    .get(
      "/deals/:partnerDealId",
      async ({ externalMerchant, params, error }) => {
        const result = await externalAggregatorService.getDeal(
          externalMerchant,
          params.partnerDealId
        );
        
        if (!result) {
          return error(404, {
            error: "Deal not found",
            details: `Deal ${params.partnerDealId} not found`
          });
        }
        
        return result;
      },
      {
        tags: ["external-aggregator"],
        detail: { summary: "Получение информации о сделке" },
        params: t.Object({
          partnerDealId: t.String({ description: "ID сделки в нашей системе" })
        }),
        response: {
          200: t.Object({
            accepted: t.Boolean(),
            partnerDealId: t.String(),
            requisites: t.Optional(t.Object({
              bankName: t.Optional(t.String()),
              cardNumber: t.Optional(t.String()),
              phoneNumber: t.Optional(t.String()),
              recipientName: t.Optional(t.String())
            })),
            dealDetails: t.Optional(t.Object({
              id: t.String(),
              amount: t.Number(),
              status: t.String(),
              createdAt: t.String(),
              expiresAt: t.String(),
              paymentMethod: t.String()
            }))
          }),
          404: ErrorSchema
        }
      }
    )
    
    /* ──────── POST /api/external/aggregator/deals/:partnerDealId/cancel ──────── */
    .post(
      "/deals/:partnerDealId/cancel",
      async ({ externalMerchant, params, error }) => {
        const result = await externalAggregatorService.cancelDeal(
          externalMerchant,
          params.partnerDealId
        );
        
        if (!result.success) {
          return error(400, {
            error: result.message || "Cancel failed"
          });
        }
        
        return {
          success: true,
          message: result.message || "Deal cancelled successfully"
        };
      },
      {
        tags: ["external-aggregator"],
        detail: { summary: "Отмена сделки" },
        params: t.Object({
          partnerDealId: t.String({ description: "ID сделки в нашей системе" })
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            message: t.String()
          }),
          400: ErrorSchema
        }
      }
    )
    
    /* ──────── POST /api/external/aggregator/deals/:partnerDealId/disputes ──────── */
    .post(
      "/deals/:partnerDealId/disputes",
      async ({ externalMerchant, params, body, error }) => {
        if (!body.message) {
          return error(400, {
            error: "Message is required for dispute"
          });
        }
        
        const result = await externalAggregatorService.createDispute(
          externalMerchant,
          params.partnerDealId,
          body.message
        );
        
        if (!result.success) {
          return error(400, {
            error: result.message || "Dispute creation failed"
          });
        }
        
        return {
          success: true,
          disputeId: result.disputeId,
          message: result.message || "Dispute created successfully"
        };
      },
      {
        tags: ["external-aggregator"],
        detail: { summary: "Создание спора по сделке" },
        params: t.Object({
          partnerDealId: t.String({ description: "ID сделки в нашей системе" })
        }),
        body: t.Object({
          message: t.String({ description: "Сообщение спора" }),
          attachments: t.Optional(t.Array(t.String(), { description: "Ссылки на файлы" }))
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            disputeId: t.Optional(t.String()),
            message: t.String()
          }),
          400: ErrorSchema
        }
      }
    )
    
    /* ──────── POST /api/external/aggregator/callback ──────── */
    .post(
      "/callback",
      async ({ externalMerchant, body, headers }) => {
        console.log(
          `[ExternalAggregator] Received callback from merchant ${externalMerchant.name}`,
          body
        );
        
        // Здесь мерчант может отправлять нам колбэки о статусах
        // Это опциональный эндпоинт для двусторонней интеграции
        
        // Логируем колбэк
        if (body.ourDealId) {
          const transaction = await db.transaction.findFirst({
            where: {
              merchantId: externalMerchant.id,
              orderId: body.ourDealId
            }
          });
          
          if (transaction && body.status) {
            console.log(
              `[ExternalAggregator] Status update for transaction ${transaction.id}: ${body.status}`
            );
            
            // Мапим статус если нужно
            const statusMap: Record<string, Status> = {
              "READY": Status.READY,
              "CANCELED": Status.CANCELED,
              "EXPIRED": Status.EXPIRED,
              "DISPUTE": Status.DISPUTE
            };
            
            const newStatus = statusMap[body.status];
            if (newStatus && newStatus !== transaction.status) {
              await db.transaction.update({
                where: { id: transaction.id },
                data: { status: newStatus }
              });
            }
          }
        }
        
        return {
          accepted: true,
          message: "Callback received"
        };
      },
      {
        tags: ["external-aggregator"],
        detail: { summary: "Приём колбэков от внешней системы (опционально)" },
        body: t.Object({
          ourDealId: t.String({ description: "ID сделки во внешней системе" }),
          status: t.Optional(t.String({ description: "Новый статус" })),
          amount: t.Optional(t.Number({ description: "Сумма" })),
          metadata: t.Optional(t.Object({}, { additionalProperties: true }))
        }),
        response: {
          200: t.Object({
            accepted: t.Boolean(),
            message: t.String()
          })
        }
      }
    );