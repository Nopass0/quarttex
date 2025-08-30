/**
 * Сервис интеграции аукционного флоу в основную логику создания сделок
 * Обрабатывает входящие заказы от мерчанта и уведомляет внешние системы
 */

import { db } from "@/db";
import { Status, TransactionType } from "@prisma/client";
import {
  AuctionMerchantConfig,
  PaymentDetails,
  PaymentMethod,
} from "@/types/auction";
import { auctionCallbackSender } from "@/services/auction-callback-sender";
import { calculateTransactionFreezing } from "@/utils/transaction-freezing";

/**
 * Результат попытки создания аукционного заказа
 */
export interface AuctionOrderResult {
  success: boolean;
  externalOrderId?: string;
  externalSystemId?: number;
  paymentDetails?: PaymentDetails;
  exchangeRate?: number;
  commission?: number;
  amount?: number;
  errorCode?: string;
  errorMessage?: string;
  responseTime: number;
  receivedAt: number;
  shouldCancel?: boolean;
  cancelReason?: string;
}

/**
 * Параметры для создания аукционного заказа
 */
export interface AuctionOrderParams {
  merchantId: string;
  systemOrderId: string;
  currency: string;
  amount: number;
  maxExchangeRate: number;
  maxCommission: number;
  allowedPaymentMethod: PaymentMethod;
  allowedBankName?: string;
  stopAuctionTimeUnix: number;
  cancelOrderTimeUnix: number;
  callbackUrl: string;
}

/**
 * Сервис для интеграции аукционной системы
 */
export class AuctionIntegrationService {
  /**
   * Проверяет, является ли мерчант аукционным
   */
  async isAuctionMerchant(merchantId: string): Promise<boolean> {
    try {
      const merchant = await db.merchant.findUnique({
        where: { id: merchantId },
        select: { isAuctionEnabled: true },
      });
      
      return merchant?.isAuctionEnabled || false;
    } catch (error) {
      console.error(`[AuctionIntegration] Ошибка проверки аукционного мерчанта:`, error);
      return false;
    }
  }

  /**
   * Получает конфигурацию аукционного мерчанта
   */
  async getAuctionMerchantConfig(merchantId: string): Promise<AuctionMerchantConfig | null> {
    try {
      const merchant = await db.merchant.findUnique({
        where: { id: merchantId },
        select: {
          id: true,
          name: true,
          isAuctionEnabled: true,
          auctionBaseUrl: true,
          auctionCallbackUrl: true,
          rsaPublicKeyPem: true,
          rsaPrivateKeyPem: true,
          keysGeneratedAt: true,
          externalSystemName: true,
        },
      });

      if (!merchant || !merchant.isAuctionEnabled) {
        return null;
      }

      return {
        id: merchant.id,
        name: merchant.name,
        isAuctionEnabled: merchant.isAuctionEnabled,
        auctionBaseUrl: merchant.auctionBaseUrl || undefined,
        auctionCallbackUrl: merchant.auctionCallbackUrl || undefined,
        rsaPublicKeyPem: merchant.rsaPublicKeyPem || undefined,
        rsaPrivateKeyPem: merchant.rsaPrivateKeyPem || undefined,
        keysGeneratedAt: merchant.keysGeneratedAt || undefined,
        externalSystemName: merchant.externalSystemName || undefined,
      };
    } catch (error) {
      console.error(`[AuctionIntegration] Ошибка получения конфигурации мерчанта:`, error);
      return null;
    }
  }

  /**
   * Уведомляет внешнюю систему об изменении статуса заказа
   */
  async notifyExternalSystem(
    merchantId: string,
    orderId: string,
    statusId: number,
    amount?: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`[AuctionIntegration] Уведомление внешней системы`, {
        merchantId,
        orderId,
        statusId,
        amount,
      });

      // Получаем конфигурацию мерчанта
      const merchantConfig = await this.getAuctionMerchantConfig(merchantId);
      if (!merchantConfig || !merchantConfig.auctionBaseUrl) {
        return { success: false, error: "Конфигурация мерчанта не найдена" };
      }

      // Определяем URL для callback'а
      const callbackUrl = merchantConfig.auctionCallbackUrl || 
                         (merchantConfig.auctionBaseUrl ? merchantConfig.auctionBaseUrl + "/callback" : null);
      
      if (!callbackUrl) {
        return { success: false, error: "URL для callback'ов не настроен" };
      }

      // Отправляем callback
      const result = await auctionCallbackSender.sendStatusUpdate(
        {
          callbackUrl,
          externalSystemName: merchantConfig.externalSystemName || "default",
          privateKeyPem: merchantConfig.rsaPrivateKeyPem!,
        },
        orderId,
        statusId,
        amount
      );

      return result;
    } catch (error) {
      console.error(`[AuctionIntegration] Ошибка уведомления внешней системы:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Неизвестная ошибка" 
      };
    }
  }

  /**
   * Создает транзакцию для аукционного заказа
   */
  async createAuctionTransaction(
    params: AuctionOrderParams,
    auctionResult: AuctionOrderResult,
    originalTransactionData: any
  ) {
    try {
      console.log(`[AuctionIntegration] Создание транзакции для аукционного заказа`, {
        systemOrderId: params.systemOrderId,
        externalOrderId: auctionResult.externalOrderId,
        success: auctionResult.success,
      });

      // Базовые данные транзакции (сохраняем все расчеты как в обычном флоу)
      const transactionData = {
        ...originalTransactionData,
        orderId: params.systemOrderId,
        status: auctionResult.success ? Status.CREATED : Status.CANCELED,
        // Сохраняем информацию об аукционе в метаданных или дополнительных полях
        // Можно добавить поля в схему или использовать JSON поле
      };

      // Если есть реквизиты от внешней системы, сохраняем их
      if (auctionResult.success && auctionResult.paymentDetails) {
        // Здесь можно создать реквизиты на основе payment_details
        // или сохранить их в специальном формате
      }

      // Создаем транзакцию с теми же расчетами, что и в обычном флоу
      const transaction = await db.transaction.create({
        data: transactionData,
        include: {
          merchant: true,
          method: true,
          trader: true,
          requisites: true,
        },
      });

      // Логируем создание
      console.log(`[AuctionIntegration] Транзакция создана для аукционного заказа`, {
        transactionId: transaction.id,
        systemOrderId: params.systemOrderId,
        externalOrderId: auctionResult.externalOrderId,
      });

      return transaction;
    } catch (error) {
      console.error(`[AuctionIntegration] Ошибка создания транзакции:`, error);
      throw error;
    }
  }

  /**
   * Обрабатывает полный цикл создания аукционного заказа
   */
  async processAuctionOrder(
    merchantId: string,
    originalTransactionData: any,
    auctionParams: Partial<AuctionOrderParams>
  ) {
    try {
      // Проверяем, что мерчант аукционный
      if (!(await this.isAuctionMerchant(merchantId))) {
        throw new Error("Мерчант не является аукционным");
      }

      // Генерируем system_order_id
      const systemOrderId = `auction-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      
      // Устанавливаем временные рамки аукциона
      const now = Math.floor(Date.now() / 1000);
      const stopAuctionTimeUnix = now + 30; // 30 секунд на аукцион
      const cancelOrderTimeUnix = now + 300; // 5 минут на выполнение

      // Формируем полные параметры
      const fullParams: AuctionOrderParams = {
        merchantId,
        systemOrderId,
        currency: "RUB", // По умолчанию рубли
        amount: originalTransactionData.amount,
        maxExchangeRate: 120, // Максимальный курс
        maxCommission: 5, // Максимальная комиссия 5%
        allowedPaymentMethod: this.mapMethodToPaymentMethod(originalTransactionData.methodId),
        stopAuctionTimeUnix,
        cancelOrderTimeUnix,
        callbackUrl: `${process.env.BASE_URL || "https://chasepay.pro"}/api/auction/callback/${merchantId}`,
        ...auctionParams,
      };

      // Создаем заказ в аукционной системе
      const auctionResult = await this.createAuctionOrder(fullParams);

      // Создаем транзакцию
      const transaction = await this.createAuctionTransaction(
        fullParams,
        auctionResult,
        originalTransactionData
      );

      return {
        transaction,
        auctionResult,
        systemOrderId,
      };
    } catch (error) {
      console.error(`[AuctionIntegration] Ошибка обработки аукционного заказа:`, error);
      throw error;
    }
  }

  /**
   * Маппинг внутренних методов на типы платежей аукционной системы
   */
  private mapMethodToPaymentMethod(methodId: string): PaymentMethod {
    // Здесь нужно реализовать маппинг на основе реальных методов
    // Пока возвращаем SBP по умолчанию
    return "sbp";
  }

  /**
   * Создает результат ошибки
   */
  private createErrorResult(
    startTime: number,
    errorCode: string,
    errorMessage: string
  ): AuctionOrderResult {
    return {
      success: false,
      errorCode,
      errorMessage,
      responseTime: Date.now() - startTime,
      receivedAt: Math.floor(Date.now() / 1000),
    };
  }
}

/**
 * Синглтон экземпляр сервиса
 */
export const auctionIntegrationService = new AuctionIntegrationService();
