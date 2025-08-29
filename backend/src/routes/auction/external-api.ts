/**
 * API endpoints для внешних аукционных систем
 * Реализация согласно документации IE Cloud Summit
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
  AuctionErrorCode,
  PaymentMethod,
} from "@/types/auction";
import { validateAuctionRequest } from "@/utils/auction-signature";
import { calculateTransactionFreezing } from "@/utils/transaction-freezing";
import { roundDown2 } from "@/utils/rounding";

/**
 * Маппинг внутренних статусов на аукционные согласно документации
 */
const STATUS_TO_AUCTION: Record<Status, AuctionOrderStatus> = {
  CREATED: 1,     // создана
  IN_PROGRESS: 2, // назначен трейдер  
  READY: 6,       // завершена
  CANCELED: 9,    // отменена мерчантом
  EXPIRED: 8,     // отменена по таймауту
  DISPUTE: 7,     // спор
  MILK: 1,        // специальный статус
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
        rsaPublicKeyPem: { not: null },
        rsaPrivateKeyPem: { not: null },
      },
    });
  }

  /**
   * Валидация подписи запроса
   */
  validateRequestSignature(
    headers: Record<string, string>,
    body: any,
    publicKeyPem: string,
    externalSystemName: string,
    systemOrderId: string,
    operation: string
  ) {
    return validateAuctionRequest(
      headers,
      body,
      publicKeyPem,
      externalSystemName,
      systemOrderId,
      operation as any
    );
  }

  /**
   * Создание деталей платежа согласно документации
   */
  async createPaymentDetails(
    merchantId: string,
    methodId: string,
    amount: number,
    paymentMethod: PaymentMethod
  ): Promise<PaymentDetails | null> {
    try {
      // Находим подходящего трейдера и реквизиты
      const traderMerchant = await db.traderMerchant.findFirst({
        where: {
          merchantId,
          methodId,
          isMerchantEnabled: true,
          trader: {
            banned: false,
            trafficEnabled: true,
          },
        },
        include: {
          trader: {
            include: {
              bankDetails: {
                where: {
                  isActive: true,
                  isArchived: false,
                },
              },
            },
          },
        },
      });

      if (!traderMerchant || !traderMerchant.trader.bankDetails.length) {
        return null;
      }

      const bankDetail = traderMerchant.trader.bankDetails[0];

      // Формируем детали платежа согласно типу
      switch (paymentMethod) {
        case "card_number":
          return {
            type: "card_number",
            name: `${traderMerchant.trader.name}`,
            bank_name: bankDetail.bankType,
            card: bankDetail.cardNumber,
            transfer_info: `Перевод на карту ${bankDetail.bankType}`,
          };

        case "phone_number":
          return {
            type: "phone_number", 
            name: `${traderMerchant.trader.name}`,
            bank_name: bankDetail.bankType,
            phone_number: bankDetail.phoneNumber || "+7XXXXXXXXXX",
            transfer_info: `СБП перевод на телефон`,
          };

        case "sbp":
          return {
            type: "sbp",
            phone_number: bankDetail.phoneNumber || "+7XXXXXXXXXX", 
            bank_name: bankDetail.bankType,
            name: `${traderMerchant.trader.name}`,
            transfer_info: `СБП перевод`,
          };

        default:
          return {
            type: "card_number",
            name: `${traderMerchant.trader.name}`,
            bank_name: bankDetail.bankType,
            card: bankDetail.cardNumber,
            transfer_info: `Перевод на карту`,
          };
      }
    } catch (error) {
      console.error("Error creating payment details:", error);
      return null;
    }
  }

  /**
   * Создание транзакции с заморозкой (точно как в обычном флоу)
   */
  async createTransaction(
    merchant: any,
    request: CreateOrderRequest,
    paymentDetails: PaymentDetails,
    chosenBankDetail: any
  ) {
    try {
      const traderId = chosenBankDetail.userId;
      const methodId = chosenBankDetail.methodId || "default-method";

      // Рассчитываем заморозку точно как в обычных сделках
      const freezingParams = await calculateTransactionFreezing(
        request.amount,
        request.max_exchange_rate,
        traderId,
        merchant.id,
        methodId
      );

      console.log(`[AuctionOrder] Freezing calculation:`, {
        amount: request.amount,
        rate: request.max_exchange_rate,
        frozen: freezingParams.frozenUsdtAmount,
        commission: freezingParams.calculatedCommission,
      });

      // Создаем транзакцию в рамках транзакции БД
      const transaction = await db.$transaction(async (prisma) => {
        // Проверяем и замораживаем баланс
        const trader = await prisma.user.findUnique({
          where: { id: traderId },
          select: { trustBalance: true, frozenUsdt: true },
        });

        if (!trader) {
          throw new Error("Трейдер не найден");
        }

        const availableBalance = trader.trustBalance - trader.frozenUsdt;
        if (availableBalance < freezingParams.totalRequired) {
          throw new Error("Недостаточно средств у трейдера");
        }

        // Замораживаем баланс
        await prisma.user.update({
          where: { id: traderId },
          data: {
            frozenUsdt: { increment: freezingParams.totalRequired },
          },
        });

        // Создаем транзакцию
        const newTransaction = await prisma.transaction.create({
          data: {
            orderId: request.system_order_id,
            amount: request.amount,
            type: TransactionType.IN,
            status: Status.IN_PROGRESS,
            merchantId: merchant.id,
            traderId: traderId,
            bankDetailId: chosenBankDetail.id,
            rate: request.max_exchange_rate,
            merchantRate: request.max_exchange_rate,
            frozenUsdtAmount: freezingParams.frozenUsdtAmount,
            calculatedCommission: freezingParams.calculatedCommission,
            traderProfit: roundDown2((request.amount / request.max_exchange_rate) * (freezingParams.feeInPercent / 100)),
            adjustedRate: request.max_exchange_rate,
            feeInPercent: freezingParams.feeInPercent,
            kkkPercent: freezingParams.kkkPercent,
            kkkOperation: "MINUS",
            expired_at: new Date(request.cancel_order_time_unix * 1000),
            callbackUri: request.callback_url,
            userIp: "127.0.0.1",
            // Аукционные поля
            externalOrderId: null, // Будет заполнено из ответа
            externalSystemId: null,
          },
          include: {
            merchant: true,
            method: true,
            trader: true,
            requisites: true,
          },
        });

        return newTransaction;
      });

      console.log(`[AuctionOrder] Transaction created: ${transaction.id}`);
      return transaction;
    } catch (error) {
      console.error("Error creating auction transaction:", error);
      throw error;
    }
  }
}

const auctionOrderService = new AuctionOrderService();

/**
 * External API routes для аукционных систем
 */
export default (app: Elysia) =>
  app
    .group("/external", (app) =>
      app
        /* ──────── POST /auction/external/CreateOrder ──────── */
        .post(
          "/CreateOrder",
          async ({ body, headers, error }) => {
            try {
              const request = body as CreateOrderRequest;
              
              console.log(`[AuctionExternal] CreateOrder запрос:`, {
                system_order_id: request.system_order_id,
                amount: request.amount,
                currency: request.currency,
                max_exchange_rate: request.max_exchange_rate,
                allowed_payment_method: request.allowed_payment_method,
              });

              // Находим мерчанта (в реальности нужно определить как идентифицировать мерчанта)
              const merchant = await auctionOrderService.findMerchantBySystemName("test-auction-system");
              
              if (!merchant) {
                return {
                  is_success: false,
                  error_code: "validation_error",
                  error_message: "Аукционный мерчант не найден или не настроен",
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
                  error_code: signatureValidation.error as AuctionErrorCode,
                  error_message: signatureValidation.message || "Ошибка валидации подписи",
                } as CreateOrderResponse;
              }

              // Проверяем время аукциона
              const now = Math.floor(Date.now() / 1000);
              if (now >= request.stop_auction_time_unix) {
                return {
                  is_success: false,
                  error_code: "auction_timeout_after_finish",
                  error_message: "Время аукциона истекло",
                } as CreateOrderResponse;
              }

              // Создаем детали платежа
              const paymentDetails = await auctionOrderService.createPaymentDetails(
                merchant.id,
                "default-method-id", // В реальности нужно определить метод
                request.amount,
                request.allowed_payment_method
              );

              if (!paymentDetails) {
                return {
                  is_success: false,
                  error_code: "no_available_traders",
                  error_message: "Нет доступных трейдеров для данного метода оплаты",
                } as CreateOrderResponse;
              }

              // Создаем транзакцию (точно как в обычном флоу)
              const chosenBankDetail = { 
                id: "test-bank-detail-id", 
                userId: "test-trader-id",
                methodId: "test-method-id"
              };
              
              const transaction = await auctionOrderService.createTransaction(
                merchant,
                request,
                paymentDetails,
                chosenBankDetail
              );

              // Успешный ответ
              return {
                is_success: true,
                error_code: null,
                error_message: null,
                external_system_id: 123,
                external_order_id: transaction.id,
                amount: request.amount,
                exchange_rate: request.max_exchange_rate,
                commission: request.max_commission,
                payment_details: paymentDetails,
              } as CreateOrderResponse;

            } catch (err) {
              console.error("CreateOrder error:", err);
              return {
                is_success: false,
                error_code: "other",
                error_message: `Внутренняя ошибка: ${err}`,
              } as CreateOrderResponse;
            }
          },
          {
            tags: ["auction", "external"],
            detail: {
              summary: "Создание заказа в аукционной системе",
              description: "Создает новый заказ для обработки через аукционную систему с RSA подписью"
            },
            body: t.Object({
              system_order_id: t.String({ description: "GUID, наш ID заявки" }),
              currency: t.String({ description: "Валюта, например RUB" }),
              max_exchange_rate: t.Number({ description: "Максимальный курс к USDT" }),
              max_commission: t.Number({ description: "Максимальная комиссия %" }),
              amount: t.Number({ description: "Сумма заявки" }),
              cancel_order_time_unix: t.Number({ description: "Unix время отмены" }),
              stop_auction_time_unix: t.Number({ description: "Unix время окончания аукциона" }),
              callback_url: t.String({ description: "URL для callback'ов" }),
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
            headers: t.Object({
              "Content-Type": t.Literal("application/json"),
              "X-Timestamp": t.String({ description: "Unix timestamp в секундах" }),
              "X-Signature": t.String({ description: "Base64 RSA-SHA256 подпись" }),
            }),
          }
        )

        /* ──────── POST /auction/external/CancelOrder ──────── */
        .post(
          "/CancelOrder",
          async ({ body, headers, error }) => {
            try {
              const request = body as CancelOrderRequest;
              
              console.log(`[AuctionExternal] CancelOrder запрос:`, {
                system_order_id: request.system_order_id,
                external_id: request.external_id,
                reason: request.reason,
              });

              // Находим транзакцию
              const transaction = await db.transaction.findFirst({
                where: {
                  OR: [
                    { orderId: request.system_order_id },
                    { id: request.external_id },
                    { externalOrderId: request.external_id },
                  ],
                },
                include: { merchant: true },
              });

              if (!transaction) {
                return {
                  is_success: false,
                  error_code: "order_not_found",
                  error_message: "Заказ не найден",
                } as CancelOrderResponse;
              }

              // Валидируем подпись
              const merchant = transaction.merchant;
              if (!merchant?.rsaPublicKeyPem || !merchant.externalSystemName) {
                return {
                  is_success: false,
                  error_code: "validation_error",
                  error_message: "Мерчант не настроен для аукционной системы",
                } as CancelOrderResponse;
              }

              const signatureValidation = this.validateRequestSignature(
                headers as Record<string, string>,
                request,
                merchant.rsaPublicKeyPem,
                merchant.externalSystemName,
                request.system_order_id,
                "CancelOrder"
              );

              if (!signatureValidation.valid) {
                return {
                  is_success: false,
                  error_code: signatureValidation.error as AuctionErrorCode,
                  error_message: signatureValidation.message || "Ошибка валидации подписи",
                } as CancelOrderResponse;
              }

              // Отменяем заказ
              await db.transaction.update({
                where: { id: transaction.id },
                data: { status: Status.CANCELED },
              });

              console.log(`[AuctionExternal] Order cancelled: ${transaction.id}`);

              return {
                is_success: true,
                error_code: null,
                error_message: null,
              } as CancelOrderResponse;

            } catch (err) {
              console.error("CancelOrder error:", err);
              return {
                is_success: false,
                error_code: "other",
                error_message: `Ошибка отмены: ${err}`,
              } as CancelOrderResponse;
            }
          },
          {
            tags: ["auction", "external"],
            detail: {
              summary: "Отмена заказа в аукционной системе",
              description: "Отменяет существующий заказ с указанием причины"
            },
            body: t.Object({
              system_order_id: t.String({ description: "Наш GUID заявки" }),
              external_id: t.String({ description: "Их внутренний ID" }),
              reason: t.Union([
                t.Literal("too_long_response"),
                t.Literal("not_valid_response"),
                t.Literal("system_selected_another_performer"),
                t.Literal("auction_timeout_after_finish"),
                t.Literal("server_error"),
                t.Literal("other")
              ]),
              reason_message: t.Optional(t.String()),
            }),
            headers: t.Object({
              "Content-Type": t.Literal("application/json"),
              "X-Timestamp": t.String(),
              "X-Signature": t.String(),
            }),
          }
        )

        /* ──────── POST /auction/external/GetStatusOrder ──────── */
        .post(
          "/GetStatusOrder", 
          async ({ body, headers, error }) => {
            try {
              const request = body as GetStatusOrderRequest;
              
              console.log(`[AuctionExternal] GetStatusOrder запрос:`, {
                system_order_id: request.system_order_id,
                external_id: request.external_id,
              });

              // Находим транзакцию
              const transaction = await db.transaction.findFirst({
                where: {
                  OR: [
                    { orderId: request.system_order_id },
                    { id: request.external_id },
                    { externalOrderId: request.external_id },
                  ],
                },
                include: { merchant: true },
              });

              if (!transaction) {
                return {
                  is_success: false,
                  error_code: "order_not_found",
                  error_message: "Заказ не найден",
                } as GetStatusOrderResponse;
              }

              // Валидируем подпись
              const merchant = transaction.merchant;
              if (!merchant?.rsaPublicKeyPem || !merchant.externalSystemName) {
                return {
                  is_success: false,
                  error_code: "validation_error",
                  error_message: "Мерчант не настроен для аукционной системы",
                } as GetStatusOrderResponse;
              }

              const signatureValidation = auctionOrderService.validateRequestSignature(
                headers as Record<string, string>,
                request,
                merchant.rsaPublicKeyPem,
                merchant.externalSystemName,
                request.system_order_id,
                "GetOrderStatus"
              );

              if (!signatureValidation.valid) {
                return {
                  is_success: false,
                  error_code: signatureValidation.error as AuctionErrorCode,
                  error_message: signatureValidation.message || "Ошибка валидации подписи",
                } as GetStatusOrderResponse;
              }

              // Возвращаем статус
              const auctionStatus = STATUS_TO_AUCTION[transaction.status] || 1;

              return {
                is_success: true,
                error_code: null,
                error_message: null,
                status: auctionStatus,
              } as GetStatusOrderResponse;

            } catch (err) {
              console.error("GetStatusOrder error:", err);
              return {
                is_success: false,
                error_code: "other",
                error_message: `Ошибка получения статуса: ${err}`,
              } as GetStatusOrderResponse;
            }
          },
          {
            tags: ["auction", "external"],
            detail: {
              summary: "Получение статуса заказа",
              description: "Возвращает текущий статус заказа в аукционной системе"
            },
            body: t.Object({
              system_order_id: t.String({ description: "Наш GUID заявки" }),
              external_id: t.String({ description: "Их внутренний ID" }),
            }),
            headers: t.Object({
              "Content-Type": t.Literal("application/json"),
              "X-Timestamp": t.String(),
              "X-Signature": t.String(),
            }),
          }
        )

        /* ──────── POST /auction/external/CreateDispute ──────── */
        .post(
          "/CreateDispute",
          async ({ body, headers, error }) => {
            try {
              const request = body as CreateDisputeRequest;
              
              console.log(`[AuctionExternal] CreateDispute запрос:`, {
                system_order_id: request.system_order_id,
                external_order_id: request.external_order_id,
                type: request.type,
                comment: request.comment?.substring(0, 100),
              });

              // Находим транзакцию
              const transaction = await db.transaction.findFirst({
                where: {
                  OR: [
                    { orderId: request.system_order_id },
                    { id: request.external_order_id },
                    { externalOrderId: request.external_order_id },
                  ],
                },
                include: { merchant: true },
              });

              if (!transaction) {
                return {
                  is_success: false,
                  error_code: "order_not_found",
                  error_message: "Заказ не найден",
                } as CreateDisputeResponse;
              }

              // Валидируем подпись
              const merchant = transaction.merchant;
              if (!merchant?.rsaPublicKeyPem || !merchant.externalSystemName) {
                return {
                  is_success: false,
                  error_code: "validation_error",
                  error_message: "Мерчант не настроен для аукционной системы",
                } as CreateDisputeResponse;
              }

              const signatureValidation = auctionOrderService.validateRequestSignature(
                headers as Record<string, string>,
                request,
                merchant.rsaPublicKeyPem,
                merchant.externalSystemName,
                request.system_order_id,
                "CreateDispute"
              );

              if (!signatureValidation.valid) {
                return {
                  is_success: false,
                  error_code: signatureValidation.error as AuctionErrorCode,
                  error_message: signatureValidation.message || "Ошибка валидации подписи",
                } as CreateDisputeResponse;
              }

              // Создаем диспут
              await db.transaction.update({
                where: { id: transaction.id },
                data: { status: Status.DISPUTE },
              });

              // Если тип change_amount, обновляем сумму
              if (request.type === "change_amount" && request.new_amount) {
                await db.transaction.update({
                  where: { id: transaction.id },
                  data: { amount: request.new_amount },
                });
              }

              console.log(`[AuctionExternal] Dispute created for: ${transaction.id}`);

              return {
                is_success: true,
                error_code: null,
                error_message: null,
              } as CreateDisputeResponse;

            } catch (err) {
              console.error("CreateDispute error:", err);
              return {
                is_success: false,
                error_code: "other",
                error_message: `Ошибка создания диспута: ${err}`,
              } as CreateDisputeResponse;
            }
          },
          {
            tags: ["auction", "external"],
            detail: {
              summary: "Создание спора по заказу",
              description: "Создает спор по заказу с возможностью изменения суммы"
            },
            body: t.Object({
              system_order_id: t.String({ description: "Наш GUID заявки" }),
              external_order_id: t.String({ description: "Их ID" }),
              comment: t.String({ description: "Комментарий к спору" }),
              attachment_path: t.Optional(t.String({ description: "URL изображения/скриншота" })),
              type: t.Union([
                t.Literal("message"),
                t.Literal("change_amount"), 
                t.Literal("dispute")
              ]),
              new_amount: t.Optional(t.Number({ description: "Новая сумма (только для change_amount)" })),
            }),
            headers: t.Object({
              "Content-Type": t.Literal("application/json"),
              "X-Timestamp": t.String(),
              "X-Signature": t.String(),
            }),
          }
        )
    );