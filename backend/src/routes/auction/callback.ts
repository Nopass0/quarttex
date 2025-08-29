/**
 * Обработка callback'ов от внешних аукционных систем
 * Согласно документации IE Cloud Summit
 */

import { Elysia, t } from "elysia";
import { db } from "@/db";
import { Status } from "@prisma/client";
import { 
  AuctionCallbackRequest, 
  AuctionCallbackResponse,
  AuctionErrorCode,
} from "@/types/auction";
import { validateAuctionRequest } from "@/utils/auction-signature";
import { sendTransactionCallbacks } from "@/utils/notify";

/**
 * Маппинг аукционных статусов на внутренние
 */
const AUCTION_TO_STATUS: Record<number, Status> = {
  1: Status.CREATED,     // создана
  2: Status.IN_PROGRESS, // назначен трейдер
  3: Status.IN_PROGRESS, // реквизиты назначены
  4: Status.IN_PROGRESS, // мерч подтвердил оплату
  5: Status.IN_PROGRESS, // трейдер подтвердил оплату
  6: Status.READY,       // завершена
  7: Status.DISPUTE,     // спор
  8: Status.EXPIRED,     // отменена по таймауту
  9: Status.CANCELED,    // отменена мерчантом
  10: Status.CANCELED,   // отменена трейдером
  11: Status.CANCELED,   // отменена админом
  12: Status.CANCELED,   // отменена супервайзером
  13: Status.CANCELED,   // отменена по результату спора
};

/**
 * Обработчик callback'ов от внешних аукционных систем
 */
class AuctionCallbackHandler {
  /**
   * Обрабатывает входящий callback
   */
  async handleCallback(
    merchantId: string,
    headers: Record<string, string>,
    body: AuctionCallbackRequest
  ): Promise<AuctionCallbackResponse> {
    try {
      console.log(`[AuctionCallback] Получен callback для мерчанта ${merchantId}:`, {
        order_id: body.order_id,
        status_id: body.status_id,
        amount: body.amount,
      });

      // Находим мерчанта
      const merchant = await db.merchant.findUnique({
        where: { id: merchantId },
        select: {
          id: true,
          name: true,
          isAuctionEnabled: true,
          rsaPublicKeyPem: true,
          externalSystemName: true,
        },
      });

      if (!merchant) {
        return {
          is_success: false,
          error_code: "validation_error",
          error_message: "Мерчант не найден",
        };
      }

      if (!merchant.isAuctionEnabled) {
        return {
          is_success: false,
          error_code: "validation_error",
          error_message: "Аукционная система не включена для данного мерчанта",
        };
      }

      if (!merchant.rsaPublicKeyPem || !merchant.externalSystemName) {
        return {
          is_success: false,
          error_code: "validation_error",
          error_message: "RSA ключи не настроены для мерчанта",
        };
      }

      // Валидируем подпись callback'а
      const signatureValidation = validateAuctionRequest(
        headers,
        body,
        merchant.rsaPublicKeyPem,
        merchant.externalSystemName,
        body.order_id,
        "AuctionCallback"
      );

      if (!signatureValidation.valid) {
        console.log(`[AuctionCallback] Signature validation failed:`, signatureValidation);
        return {
          is_success: false,
          error_code: signatureValidation.error as AuctionErrorCode,
          error_message: signatureValidation.message || "Ошибка валидации подписи",
        };
      }

      // Находим транзакцию
      const transaction = await db.transaction.findFirst({
        where: {
          OR: [
            { orderId: body.order_id },
            { id: body.order_id },
            { externalOrderId: body.order_id },
          ],
          merchantId: merchantId,
        },
        include: {
          merchant: true,
          method: true,
          trader: true,
          requisites: true,
        },
      });

      if (!transaction) {
        return {
          is_success: false,
          error_code: "order_not_found",
          error_message: "Транзакция не найдена",
        };
      }

      // Обновляем статус если указан
      if (body.status_id !== undefined) {
        const newStatus = AUCTION_TO_STATUS[body.status_id];
        
        if (newStatus) {
          console.log(`[AuctionCallback] Updating status: ${transaction.status} → ${newStatus}`);
          
          await db.transaction.update({
            where: { id: transaction.id },
            data: { status: newStatus },
          });

          // Отправляем callback'и при изменении статуса
          const updatedTransaction = await db.transaction.findFirst({
            where: { id: transaction.id },
            include: {
              merchant: true,
              method: true,
              trader: true,
              requisites: true,
            },
          });

          if (updatedTransaction) {
            await sendTransactionCallbacks(updatedTransaction);
          }
        }
      }

      // Обновляем сумму если указана
      if (body.amount !== undefined && body.amount !== transaction.amount) {
        console.log(`[AuctionCallback] Updating amount: ${transaction.amount} → ${body.amount}`);
        
        await db.transaction.update({
          where: { id: transaction.id },
          data: { amount: body.amount },
        });
      }

      console.log(`[AuctionCallback] Callback обработан успешно для транзакции ${transaction.id}`);

      return {
        is_success: true,
        error_code: null,
        error_message: null,
      };

    } catch (error) {
      console.error(`[AuctionCallback] Ошибка обработки callback'а:`, error);
      return {
        is_success: false,
        error_code: "other",
        error_message: `Внутренняя ошибка: ${error}`,
      };
    }
  }
}

const auctionCallbackHandler = new AuctionCallbackHandler();

/**
 * Роуты для аукционных callback'ов
 */
export default (app: Elysia) =>
  app
    /* ──────── POST /auction/callback/{merchantId} ──────── */
    .post(
      "/callback/:merchantId",
      async ({ params, headers, body }) => {
        const { merchantId } = params;
        
        return await auctionCallbackHandler.handleCallback(
          merchantId,
          headers as Record<string, string>,
          body as AuctionCallbackRequest
        );
      },
      {
        tags: ["auction", "callback"],
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
            is_success: t.Boolean(),
            error_code: t.Nullable(t.String()),
            error_message: t.Nullable(t.String()),
          }),
          400: t.Object({
            is_success: t.Literal(false),
            error_code: t.String(),
            error_message: t.String(),
          }),
          500: t.Object({
            is_success: t.Literal(false),
            error_code: t.Literal("other"),
            error_message: t.String(),
          }),
        },
      }
    );

export { auctionCallbackHandler };