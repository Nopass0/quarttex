/**
 * API endpoints для приема запросов от внешних аукционных систем
 * Внешние системы отправляют нам запросы на создание, отмену и управление заказами
 */

import { Elysia, t } from "elysia";
import { db } from "@/db";
import { Status, TransactionType } from "@prisma/client";
import {
  CreateOrderRequest,
  CreateOrderResponse,
  CancelOrderRequest,
  CancelOrderResponse,
  GetStatusOrderRequest,
  GetStatusOrderResponse,
  CreateDisputeRequest,
  CreateDisputeResponse,
  PaymentDetails,
  AuctionOrderStatus,
} from "@/types/auction";
import {
  auctionSignatureUtils,
  AuctionSignatureHelpers,
} from "@/utils/auction-signature";
import { calculateTransactionFreezing } from "@/utils/transaction-freezing";

/**
 * Маппинг внутренних статусов на аукционные
 */
const STATUS_TO_AUCTION: Record<Status, AuctionOrderStatus> = {
  CREATED: 1,
  IN_PROGRESS: 2,
  READY: 6,
  CANCELED: 9,
  EXPIRED: 8,
  DISPUTE: 7,
  MILK: 1, // Специальный статус маппим как создана
};

/**
 * Сервис для работы с аукционными заказами
 */
class AuctionOrderService {
  /**
   * Находит мерчанта по имени внешней системы
   */
  async findMerchantBySystemName(externalSystemName: string) {
    return await db.merchant.findFirst({
      where: {
        isAuctionEnabled: true,
        externalSystemName: externalSystemName,
      },
      include: {
        merchantMethods: {
          include: { method: true },
          where: { isEnabled: true },
        },
      },
    });
  }

  /**
   * Валидирует подпись входящего запроса
   */
  validateRequestSignature(
    headers: Record<string, string>,
    body: any,
    publicKeyPem: string,
    externalSystemName: string,
    keyField: string,
    operation: string
  ): { valid: boolean; error?: string } {
    const timestamp = headers["x-timestamp"] || headers["X-Timestamp"];
    const signature = headers["x-signature"] || headers["X-Signature"];

    if (!timestamp) {
      return { valid: false, error: "timestamp_missing" };
    }

    if (!signature) {
      return { valid: false, error: "signature_missing" };
    }

    const timestampNum = parseInt(timestamp, 10);
    if (isNaN(timestampNum)) {
      return { valid: false, error: "timestamp_invalid" };
    }

    if (!auctionSignatureUtils.validateTimestamp(timestampNum)) {
      return { valid: false, error: "timestamp_expired" };
    }

    const canonicalString = auctionSignatureUtils.createCanonicalString(
      timestampNum,
      externalSystemName,
      keyField,
      operation
    );

    if (!auctionSignatureUtils.verifySignature(canonicalString, signature, publicKeyPem)) {
      return { valid: false, error: "signature_invalid" };
    }

    return { valid: true };
  }

  /**
   * Создает реквизиты для заказа на основе доступных трейдеров
   */
  async createPaymentDetails(
    merchantId: string,
    methodId: string,
    amount: number,
    paymentMethod: string
  ): Promise<PaymentDetails | null> {
    try {
      // Находим доступные реквизиты трейдеров
      const bankDetails = await db.bankDetail.findMany({
        where: {
          user: {
            traderMerchants: {
              some: {
                merchantId: merchantId,
                methodId: methodId,
                isMerchantEnabled: true,
              },
            },
            trafficEnabled: true,
            banned: false,
          },
          isActive: true,
        },
        include: {
          user: true,
        },
        take: 10, // Берем первые 10 доступных
      });

      if (bankDetails.length === 0) {
        return null;
      }

      // Выбираем случайный реквизит
      const chosen = bankDetails[Math.floor(Math.random() * bankDetails.length)];

      // Формируем payment_details в зависимости от типа
      switch (paymentMethod) {
        case "sbp":
          return {
            type: "sbp",
            phone_number: chosen.phoneNumber || "+79001234567",
            bank_name: chosen.bankType || "Сбербанк",
            name: chosen.recipientName || "Получатель",
            transfer_info: `Перевод ${amount} руб.`,
          };

        case "card_number":
          return {
            type: "card_number",
            name: chosen.recipientName || "Получатель",
            bank_name: chosen.bankType || "Сбербанк", 
            card: chosen.cardNumber || "4111111111111111",
            transfer_info: `Перевод ${amount} руб.`,
          };

        case "phone_number":
          return {
            type: "phone_number",
            name: chosen.recipientName || "Получатель",
            bank_name: chosen.bankType || "Сбербанк",
            phone_number: chosen.phoneNumber || "+79001234567",
            transfer_info: `Перевод ${amount} руб.`,
          };

        default:
          return {
            type: "sbp",
            phone_number: chosen.phoneNumber || "+79001234567",
            bank_name: chosen.bankType || "Сбербанк",
            name: chosen.recipientName || "Получатель",
            transfer_info: `Перевод ${amount} руб.`,
          };
      }
    } catch (error) {
      console.error("[AuctionOrder] Ошибка создания реквизитов:", error);
      return null;
    }
  }

  /**
   * Создает транзакцию для аукционного заказа
   */
  async createTransaction(
    merchant: any,
    request: CreateOrderRequest,
    paymentDetails: PaymentDetails,
    chosenBankDetail: any
  ) {
    try {
      // Получаем метод по коду (нужно добавить маппинг)
      const method = merchant.merchantMethods[0]?.method; // Берем первый доступный метод
      if (!method) {
        throw new Error("Нет доступных методов для мерчанта");
      }

      // Рассчитываем курс (можно использовать текущий курс системы)
      const rate = 95.0; // Базовый курс, можно получать из сервиса курсов

      // Создаем транзакцию
      const transaction = await db.transaction.create({
        data: {
          orderId: request.system_order_id,
          merchantId: merchant.id,
          amount: request.amount,
          assetOrBank: "RUB",
          currency: request.currency,
          userId: "system", // Системный пользователь для аукционных заказов
          userIp: "0.0.0.0",
          callbackUri: request.callback_url,
          successUri: request.callback_url,
          failUri: request.callback_url,
          type: TransactionType.IN,
          expired_at: new Date(request.cancel_order_time_unix * 1000),
          commission: (request.amount * (request.max_commission / 100)),
          clientName: "Аукционный заказ",
          status: Status.CREATED,
          rate: rate,
          traderId: chosenBankDetail.userId,
          methodId: method.id,
          bankDetailId: chosenBankDetail.id,
          // Сохраняем информацию об аукционе
          // Можно добавить JSON поле для метаданных аукциона
        },
        include: {
          method: true,
          trader: true,
          requisites: true,
        },
      });

      return transaction;
    } catch (error) {
      console.error("[AuctionOrder] Ошибка создания транзакции:", error);
      throw error;
    }
  }
}

const auctionOrderService = new AuctionOrderService();

/**
 * Роуты для внешних аукционных систем
 */
export default (app: Elysia) =>
  app
    /* ──────── POST /auction/external/CreateOrder ──────── */
    .post(
      "/external/CreateOrder",
      async ({ body, headers, error }) => {
        try {
          const request = body as CreateOrderRequest;
          
          console.log(`[AuctionExternal] Получен CreateOrder`, {
            systemOrderId: request.system_order_id,
            amount: request.amount,
            currency: request.currency,
            paymentMethod: request.allowed_payment_method,
          });

          // Находим мерчанта по system_order_id или другим параметрам
          // В реальности нужно определить, как идентифицировать мерчанта
          const merchant = await auctionOrderService.findMerchantBySystemName("test-auction-system");
          
          if (!merchant) {
            return {
              is_success: false,
              error_code: "validation_error",
              error_message: "Мерчант не найден или аукционная система не настроена",
            } as CreateOrderResponse;
          }

          // Валидируем подпись
          const signatureValidation = auctionOrderService.validateRequestSignature(
            headers as Record<string, string>,
            request,
            merchant.rsaPublicKeyPem!,
            merchant.externalSystemName!,
            request.system_order_id,
            "CreateOrder"
          );

          if (!signatureValidation.valid) {
            return {
              is_success: false,
              error_code: signatureValidation.error as any,
              error_message: "Ошибка валидации подписи",
            } as CreateOrderResponse;
          }

          // Проверяем, не истекло ли время аукциона
          const now = Math.floor(Date.now() / 1000);
          if (now > request.stop_auction_time_unix) {
            return {
              is_success: false,
              error_code: "auction_timeout_after_finish",
              error_message: "Время аукциона истекло",
            } as CreateOrderResponse;
          }

          // Создаем реквизиты
          const paymentDetails = await auctionOrderService.createPaymentDetails(
            merchant.id,
            merchant.merchantMethods[0]?.methodId || "",
            request.amount,
            request.allowed_payment_method
          );

          if (!paymentDetails) {
            return {
              is_success: false,
              error_code: "no_available_traders",
              error_message: "Нет доступных трейдеров",
            } as CreateOrderResponse;
          }

          // Находим подходящий метод для мерчанта
          const merchantMethod = merchant.merchantMethods?.find(mm => mm.isEnabled);
          if (!merchantMethod) {
            return {
              is_success: false,
              error_code: "no_available_methods",
              error_message: "У мерчанта нет активных методов оплаты",
            } as CreateOrderResponse;
          }

          // Получаем подключенных трейдеров (та же логика что и для обычных транзакций)
          const connectedTraders = await db.traderMerchant.findMany({
            where: {
              merchantId: merchant.id,
              isMerchantEnabled: true,
              trader: {
                banned: false,
                deposit: { gte: 1000 },
                trafficEnabled: true,
              },
            },
            select: { traderId: true },
          });

          if (connectedTraders.length === 0) {
            return {
              is_success: false,
              error_code: "no_available_traders",
              error_message: "Нет подключенных трейдеров",
            } as CreateOrderResponse;
          }

          const traderIds = connectedTraders.map((ct) => ct.traderId);

          // Подбираем реквизит (та же логика что и для обычных транзакций)
          const pool = await db.bankDetail.findMany({
            where: {
              isArchived: false,
              isActive: true,
              methodType: merchantMethod.method.type,
              userId: { in: traderIds },
              user: {
                banned: false,
                deposit: { gte: 1000 },
                trafficEnabled: true,
              },
              // Проверяем, что устройство банковской карты работает
              OR: [
                { deviceId: null }, // Карта без устройства
                { device: { isWorking: true, isOnline: true } }, // Или устройство активно
              ],
            },
            orderBy: { updatedAt: "asc" },
            include: { user: true, device: true },
          });

          if (pool.length === 0) {
            return {
              is_success: false,
              error_code: "no_available_requisites",
              error_message: "Нет подходящих реквизитов для обработки платежа",
            } as CreateOrderResponse;
          }

          // Выбираем первый подходящий реквизит (можно добавить более сложную логику)
          let bankDetail = null;
          for (const bd of pool) {
            // Проверяем, что реквизит не занят другой активной транзакцией
            const activeTransaction = await db.transaction.findFirst({
              where: {
                requisitesId: bd.id,
                status: { in: ["CREATED", "IN_PROGRESS"] },
              },
            });

            if (!activeTransaction) {
              bankDetail = bd;
              break;
            }
          }

          if (!bankDetail) {
            return {
              is_success: false,
              error_code: "no_available_requisites",
              error_message: "Все подходящие реквизиты заняты",
            } as CreateOrderResponse;
          }

          // Создаем транзакцию
          const transaction = await auctionOrderService.createTransaction(
            merchant,
            request,
            paymentDetails,
            bankDetail
          );

          console.log(`[AuctionExternal] Создана транзакция для аукционного заказа`, {
            transactionId: transaction.id,
            systemOrderId: request.system_order_id,
          });

          // Возвращаем успешный ответ
          return {
            is_success: true,
            error_code: null,
            error_message: null,
            external_system_id: parseInt(transaction.numericId.toString()),
            external_order_id: transaction.id,
            amount: transaction.amount,
            exchange_rate: transaction.rate || 95.0,
            commission: request.max_commission,
            payment_details: paymentDetails,
          } as CreateOrderResponse;

        } catch (err) {
          console.error(`[AuctionExternal] Ошибка CreateOrder:`, err);
          return {
            is_success: false,
            error_code: "other",
            error_message: "Внутренняя ошибка сервера",
          } as CreateOrderResponse;
        }
      },
      {
        tags: ["auction-external"],
        detail: { 
          summary: "Создание заказа от внешней аукционной системы",
          description: "Принимает запрос на создание заказа от внешней системы и возвращает реквизиты для оплаты"
        },
        body: t.Object({
          system_order_id: t.String(),
          currency: t.String(),
          max_exchange_rate: t.Number(),
          max_commission: t.Number(),
          amount: t.Number(),
          cancel_order_time_unix: t.Number(),
          stop_auction_time_unix: t.Number(),
          callback_url: t.String(),
          allowed_payment_method: t.Union([
            t.Literal("card_number"),
            t.Literal("phone_number"),
            t.Literal("account_number"),
            t.Literal("iban"),
            t.Literal("sbp")
          ]),
          iterative_sum_search_enabled: t.Boolean(),
          allowed_bank_name: t.Optional(t.String()),
        }),
        response: {
          200: t.Object({
            is_success: t.Boolean(),
            error_code: t.Nullable(t.String()),
            error_message: t.Nullable(t.String()),
            external_system_id: t.Optional(t.Number()),
            external_order_id: t.Optional(t.String()),
            amount: t.Optional(t.Number()),
            exchange_rate: t.Optional(t.Number()),
            commission: t.Optional(t.Number()),
            payment_details: t.Optional(t.Any()),
          })
        }
      }
    )

    /* ──────── POST /auction/external/CancelOrder ──────── */
    .post(
      "/external/CancelOrder",
      async ({ body, headers }) => {
        try {
          const request = body as CancelOrderRequest;
          
          console.log(`[AuctionExternal] Получен CancelOrder`, {
            systemOrderId: request.system_order_id,
            externalId: request.external_id,
            reason: request.reason,
          });

          // Находим транзакцию
          const transaction = await db.transaction.findFirst({
            where: {
              OR: [
                { orderId: request.system_order_id },
                { id: request.external_id },
              ],
            },
          });

          if (!transaction) {
            return {
              is_success: false,
              error_code: "order_not_found",
              error_message: "Заказ не найден",
            } as CancelOrderResponse;
          }

          // Отменяем транзакцию
          await db.transaction.update({
            where: { id: transaction.id },
            data: { 
              status: Status.CANCELED,
              // Можно добавить причину отмены в JSON поле
            },
          });

          console.log(`[AuctionExternal] Заказ отменен`, {
            transactionId: transaction.id,
            reason: request.reason,
          });

          return {
            is_success: true,
            error_code: null,
            error_message: null,
          } as CancelOrderResponse;

        } catch (err) {
          console.error(`[AuctionExternal] Ошибка CancelOrder:`, err);
          return {
            is_success: false,
            error_code: "other",
            error_message: "Внутренняя ошибка сервера",
          } as CancelOrderResponse;
        }
      },
      {
        tags: ["auction-external"],
        detail: { 
          summary: "Отмена заказа от внешней аукционной системы",
        },
        body: t.Object({
          system_order_id: t.String(),
          external_id: t.String(),
          reason: t.String(),
          reason_message: t.Optional(t.String()),
        }),
      }
    )

    /* ──────── POST /auction/external/GetStatusOrder ──────── */
    .post(
      "/external/GetStatusOrder",
      async ({ body, headers }) => {
        try {
          const request = body as GetStatusOrderRequest;
          
          // Находим транзакцию
          const transaction = await db.transaction.findFirst({
            where: {
              OR: [
                { orderId: request.system_order_id },
                { id: request.external_id },
              ],
            },
          });

          if (!transaction) {
            return {
              is_success: false,
              error_code: "order_not_found",
              error_message: "Заказ не найден",
            } as GetStatusOrderResponse;
          }

          // Маппим статус
          const auctionStatus = STATUS_TO_AUCTION[transaction.status];

          return {
            is_success: true,
            error_code: null,
            error_message: null,
            status: auctionStatus,
          } as GetStatusOrderResponse;

        } catch (err) {
          console.error(`[AuctionExternal] Ошибка GetStatusOrder:`, err);
          return {
            is_success: false,
            error_code: "other",
            error_message: "Внутренняя ошибка сервера",
          } as GetStatusOrderResponse;
        }
      },
      {
        tags: ["auction-external"],
        detail: { 
          summary: "Получение статуса заказа",
        },
        body: t.Object({
          system_order_id: t.String(),
          external_id: t.String(),
        }),
      }
    )

    /* ──────── POST /auction/external/CreateDispute ──────── */
    .post(
      "/external/CreateDispute",
      async ({ body, headers }) => {
        try {
          const request = body as CreateDisputeRequest;
          
          console.log(`[AuctionExternal] Получен CreateDispute`, {
            systemOrderId: request.system_order_id,
            externalOrderId: request.external_order_id,
            type: request.type,
          });

          // Находим транзакцию
          const transaction = await db.transaction.findFirst({
            where: {
              OR: [
                { orderId: request.system_order_id },
                { id: request.external_order_id },
              ],
            },
          });

          if (!transaction) {
            return {
              is_success: false,
              error_code: "order_not_found",
              error_message: "Заказ не найден",
            } as CreateDisputeResponse;
          }

          // Создаем спор или обновляем сумму
          if (request.type === "change_amount" && request.new_amount) {
            await db.transaction.update({
              where: { id: transaction.id },
              data: { amount: request.new_amount },
            });
          } else if (request.type === "dispute") {
            await db.transaction.update({
              where: { id: transaction.id },
              data: { status: Status.DISPUTE },
            });
          }

          return {
            is_success: true,
            error_code: null,
            error_message: null,
          } as CreateDisputeResponse;

        } catch (err) {
          console.error(`[AuctionExternal] Ошибка CreateDispute:`, err);
          return {
            is_success: false,
            error_code: "other",
            error_message: "Внутренняя ошибка сервера",
          } as CreateDisputeResponse;
        }
      },
      {
        tags: ["auction-external"],
        detail: { 
          summary: "Создание спора по заказу",
        },
        body: t.Object({
          system_order_id: t.String(),
          external_order_id: t.String(),
          comment: t.String(),
          attachment_path: t.Optional(t.String()),
          type: t.Union([
            t.Literal("message"),
            t.Literal("change_amount"),
            t.Literal("dispute")
          ]),
          new_amount: t.Optional(t.Number()),
        }),
      }
    );
