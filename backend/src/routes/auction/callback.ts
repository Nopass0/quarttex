/**
 * Роуты для обработки callback'ов от внешних аукционных систем
 */

import { Elysia, t } from "elysia";
import { auctionCallbackHandler } from "@/services/auction-callback-handler";
import { AuctionCallbackRequest } from "@/types/auction";

/**
 * Роуты для аукционных callback'ов
 */
export default (app: Elysia) =>
  app
    /* ──────── POST /auction/callback/{merchantId} ──────── */
    .post(
      "/callback/:merchantId",
      async ({ params, headers, body, set }) => {
        try {
          const { merchantId } = params;
          
          // Логируем входящий запрос
          console.log(`[AuctionCallback] Получен callback для мерчанта ${merchantId}`, {
            headers: Object.keys(headers),
            bodyKeys: Object.keys(body as any),
          });

          // Обрабатываем callback
          const response = await auctionCallbackHandler.handleCallback(
            merchantId,
            headers as Record<string, string>,
            body as AuctionCallbackRequest
          );

          // Устанавливаем соответствующий HTTP статус
          if (!response.is_success) {
            // Определяем HTTP статус по коду ошибки
            switch (response.error_code) {
              case "signature_missing":
              case "signature_invalid":
              case "timestamp_invalid":
              case "timestamp_expired":
                set.status = 401; // Unauthorized
                break;
              case "validation_error":
              case "request_parameters_is_invalid":
                set.status = 400; // Bad Request
                break;
              case "order_not_found":
                set.status = 404; // Not Found
                break;
              default:
                set.status = 500; // Internal Server Error
                break;
            }
          } else {
            set.status = 200; // OK
          }

          return response;
        } catch (error) {
          console.error(`[AuctionCallback] Необработанная ошибка:`, error);
          
          set.status = 500;
          return {
            is_success: false,
            error_code: "other",
            error_message: "Внутренняя ошибка сервера",
          };
        }
      },
      {
        tags: ["auction"],
        detail: { 
          summary: "Обработка callback от внешней аукционной системы",
          description: "Принимает уведомления об изменении статуса заказов от внешних систем с проверкой RSA подписи"
        },
        params: t.Object({
          merchantId: t.String({
            description: "ID мерчанта в системе",
            examples: ["merchant_123"]
          })
        }),
        body: t.Object({
          order_id: t.String({
            description: "ID заказа (system_order_id или external_order_id)",
            examples: ["deal-123-456"]
          }),
          status_id: t.Optional(t.Number({
            description: "Новый статус заказа (1-13)",
            minimum: 1,
            maximum: 13,
            examples: [6]
          })),
          amount: t.Optional(t.Number({
            description: "Новая сумма заказа (если изменилась)",
            minimum: 0,
            examples: [1000.50]
          }))
        }),
        headers: t.Object({
          "Content-Type": t.Literal("application/json"),
          "X-Timestamp": t.String({
            description: "Unix timestamp в секундах",
            examples: ["1706534400"]
          }),
          "X-Signature": t.String({
            description: "Base64 RSA-SHA256 подпись канонической строки",
            examples: ["dGVzdF9zaWduYXR1cmU="]
          })
        }),
        response: {
          200: t.Object({
            is_success: t.Literal(true),
            error_code: t.Null(),
            error_message: t.Null()
          }),
          400: t.Object({
            is_success: t.Literal(false),
            error_code: t.Union([
              t.Literal("validation_error"),
              t.Literal("request_parameters_is_invalid")
            ]),
            error_message: t.String()
          }),
          401: t.Object({
            is_success: t.Literal(false),
            error_code: t.Union([
              t.Literal("signature_missing"),
              t.Literal("signature_invalid"),
              t.Literal("timestamp_invalid"),
              t.Literal("timestamp_expired")
            ]),
            error_message: t.String()
          }),
          404: t.Object({
            is_success: t.Literal(false),
            error_code: t.Literal("order_not_found"),
            error_message: t.String()
          }),
          500: t.Object({
            is_success: t.Literal(false),
            error_code: t.Literal("other"),
            error_message: t.String()
          })
        }
      }
    )

    /* ──────── GET /auction/callback/test/{merchantId} ──────── */
    .get(
      "/callback/test/:merchantId",
      async ({ params, query }) => {
        const { merchantId } = params;
        const { orderId = "test-order-123", statusId = "6" } = query;

        return {
          message: "Тестовый endpoint для callback'ов",
          merchantId,
          testCallback: {
            url: `/auction/callback/${merchantId}`,
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Timestamp": Math.floor(Date.now() / 1000).toString(),
              "X-Signature": "test_signature_here"
            },
            body: {
              order_id: orderId,
              status_id: parseInt(statusId as string, 10),
              amount: 1000.0
            }
          },
          note: "Для реального тестирования нужна валидная RSA подпись"
        };
      },
      {
        tags: ["auction"],
        detail: { 
          summary: "Тестовый endpoint для проверки callback'ов",
          description: "Возвращает пример запроса для тестирования callback'ов"
        },
        params: t.Object({
          merchantId: t.String()
        }),
        query: t.Object({
          orderId: t.Optional(t.String()),
          statusId: t.Optional(t.String())
        })
      }
    );
