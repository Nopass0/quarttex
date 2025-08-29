/**
 * Обработчик входящих callback от внешних аукционных систем
 * Валидирует подписи и обновляет статусы сделок
 */

import {
  AuctionCallbackHandler,
  AuctionCallbackRequest,
  AuctionCallbackResponse,
  AuctionMerchantConfig,
  AuctionOrderStatus,
} from "../types/auction";
import {
  auctionSignatureUtils,
  AuctionSignatureHelpers,
} from "../utils/auction-signature";
import { db as prisma } from "../db";
import { Status } from "@prisma/client";

/**
 * Маппинг статусов аукционной системы на внутренние статусы
 */
const AUCTION_STATUS_MAPPING: Record<AuctionOrderStatus, Status> = {
  1: Status.CREATED,        // создана
  2: Status.IN_PROGRESS,    // назначен трейдер
  3: Status.IN_PROGRESS,    // реквизиты назначены
  4: Status.IN_PROGRESS,    // мерч подтвердил оплату
  5: Status.IN_PROGRESS,    // трейдер подтвердил оплату
  6: Status.READY,          // завершена
  7: Status.DISPUTE,        // спор
  8: Status.EXPIRED,        // отменена по таймауту
  9: Status.CANCELED,       // отменена мерчантом
  10: Status.CANCELED,      // отменена трейдером
  11: Status.CANCELED,      // отменена админом
  12: Status.CANCELED,      // отменена супервайзером
  13: Status.CANCELED,      // отменена по результату спора
};

/**
 * Реализация обработчика callback'ов
 */
export class AuctionCallbackHandlerImpl implements AuctionCallbackHandler {
  /**
   * Обрабатывает входящий callback от внешней системы
   */
  async handleCallback(
    merchantId: string,
    headers: Record<string, string>,
    body: AuctionCallbackRequest
  ): Promise<AuctionCallbackResponse> {
    try {
      console.log(`[AuctionCallback] Получен callback от мерчанта ${merchantId}`, {
        orderId: body.order_id,
        statusId: body.status_id,
        amount: body.amount,
      });

      // Получаем конфигурацию мерчанта
      const merchantConfig = await this.getMerchantConfig(merchantId);
      if (!merchantConfig) {
        console.error(`[AuctionCallback] Мерчант не найден: ${merchantId}`);
        return this.createErrorResponse("validation_error", "Мерчант не найден");
      }

      if (!merchantConfig.isAuctionEnabled) {
        console.error(`[AuctionCallback] Аукционная система не включена для мерчанта ${merchantId}`);
        return this.createErrorResponse("validation_error", "Аукционная система не включена");
      }

      // Валидируем подпись
      const signatureValidation = this.validateCallbackSignature(merchantConfig, headers, body);
      if (!signatureValidation) {
        console.error(`[AuctionCallback] Невалидная подпись от мерчанта ${merchantId}`);
        return this.createErrorResponse("signature_invalid", "Невалидная подпись");
      }

      // Находим сделку
      const transaction = await this.findTransaction(body.order_id);
      if (!transaction) {
        console.error(`[AuctionCallback] Сделка не найдена: ${body.order_id}`);
        return this.createErrorResponse("order_not_found", "Сделка не найдена");
      }

      // Проверяем, что сделка принадлежит этому мерчанту
      if (transaction.merchantId !== merchantId) {
        console.error(`[AuctionCallback] Сделка ${body.order_id} не принадлежит мерчанту ${merchantId}`);
        return this.createErrorResponse("validation_error", "Сделка не принадлежит мерчанту");
      }

      // Обновляем сделку
      await this.updateTransaction(transaction.id, body);

      console.log(`[AuctionCallback] Успешно обработан callback для сделки ${body.order_id}`);

      return {
        is_success: true,
        error_code: null,
        error_message: null,
      };
    } catch (error) {
      console.error(`[AuctionCallback] Ошибка обработки callback:`, error);
      return this.createErrorResponse("other", error instanceof Error ? error.message : "Внутренняя ошибка");
    }
  }

  /**
   * Валидирует подпись callback'а
   */
  validateCallbackSignature(
    merchantConfig: AuctionMerchantConfig,
    headers: Record<string, string>,
    body: AuctionCallbackRequest
  ): boolean {
    try {
      if (!merchantConfig.rsaPublicKeyPem || !merchantConfig.externalSystemName) {
        console.error(`[AuctionCallback] Отсутствуют ключи или имя системы для мерчанта ${merchantConfig.id}`);
        return false;
      }

      const timestamp = headers["x-timestamp"] || headers["X-Timestamp"];
      if (!timestamp) {
        console.error(`[AuctionCallback] Отсутствует заголовок X-Timestamp`);
        return false;
      }

      const timestampNum = parseInt(timestamp, 10);
      if (isNaN(timestampNum)) {
        console.error(`[AuctionCallback] Невалидный timestamp: ${timestamp}`);
        return false;
      }

      // Создаем каноничную строку для callback
      const canonicalString = AuctionSignatureHelpers.auctionCallbackCanonical(
        timestampNum,
        merchantConfig.externalSystemName,
        body.order_id
      );

      // Валидируем заголовки и подпись
      const validation = auctionSignatureUtils.validateIncomingHeaders(
        headers,
        canonicalString,
        merchantConfig.rsaPublicKeyPem
      );

      if (!validation.valid) {
        console.error(`[AuctionCallback] Ошибка валидации подписи: ${validation.error}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`[AuctionCallback] Ошибка валидации подписи:`, error);
      return false;
    }
  }

  /**
   * Получает конфигурацию мерчанта из базы данных
   */
  private async getMerchantConfig(merchantId: string): Promise<AuctionMerchantConfig | null> {
    try {
      const merchant = await prisma.merchant.findUnique({
        where: { id: merchantId },
        select: {
          id: true,
          name: true,
          isAuctionEnabled: true,
          auctionBaseUrl: true,
          rsaPublicKeyPem: true,
          rsaPrivateKeyPem: true,
          keysGeneratedAt: true,
          externalSystemName: true,
        },
      });

      if (!merchant) {
        return null;
      }

      return {
        id: merchant.id,
        name: merchant.name,
        isAuctionEnabled: merchant.isAuctionEnabled,
        auctionBaseUrl: merchant.auctionBaseUrl || undefined,
        rsaPublicKeyPem: merchant.rsaPublicKeyPem || undefined,
        rsaPrivateKeyPem: merchant.rsaPrivateKeyPem || undefined,
        keysGeneratedAt: merchant.keysGeneratedAt || undefined,
        externalSystemName: merchant.externalSystemName || undefined,
      };
    } catch (error) {
      console.error(`[AuctionCallback] Ошибка получения конфигурации мерчанта:`, error);
      return null;
    }
  }

  /**
   * Находит сделку по ID (может быть system_order_id или external_order_id)
   */
  private async findTransaction(orderId: string) {
    try {
      // Сначала ищем по нашему ID (orderId в Transaction)
      let transaction = await prisma.transaction.findFirst({
        where: { orderId: orderId },
      });

      // Если не найдено, ищем по внешнему ID в метаданных или других полях
      if (!transaction) {
        // Можно добавить поиск по дополнительным полям, если они есть
        // Например, если external_order_id хранится в отдельном поле
      }

      return transaction;
    } catch (error) {
      console.error(`[AuctionCallback] Ошибка поиска сделки:`, error);
      return null;
    }
  }

  /**
   * Обновляет сделку на основе данных callback'а
   */
  private async updateTransaction(
    transactionId: string,
    callbackData: AuctionCallbackRequest
  ): Promise<void> {
    try {
      const updateData: any = {
        updatedAt: new Date(),
      };

      // Обновляем статус, если он передан
      if (callbackData.status_id !== undefined) {
        const auctionStatus = callbackData.status_id as AuctionOrderStatus;
        const internalStatus = AUCTION_STATUS_MAPPING[auctionStatus];
        
        if (internalStatus) {
          updateData.status = internalStatus;
          console.log(`[AuctionCallback] Обновляем статус сделки ${transactionId}: ${auctionStatus} -> ${internalStatus}`);
        } else {
          console.warn(`[AuctionCallback] Неизвестный статус аукциона: ${auctionStatus}`);
        }
      }

      // Обновляем сумму, если она передана
      if (callbackData.amount !== undefined) {
        updateData.amount = callbackData.amount;
        console.log(`[AuctionCallback] Обновляем сумму сделки ${transactionId}: ${callbackData.amount}`);
      }

      // Выполняем обновление
      await prisma.transaction.update({
        where: { id: transactionId },
        data: updateData,
      });

      // Логируем изменения
      await this.logCallbackUpdate(transactionId, callbackData);

      // Отправляем callback мерчанту, если нужно
      await this.notifyMerchantIfNeeded(transactionId, updateData);
    } catch (error) {
      console.error(`[AuctionCallback] Ошибка обновления сделки:`, error);
      throw error;
    }
  }

  /**
   * Логирует обновления от callback'а
   */
  private async logCallbackUpdate(
    transactionId: string,
    callbackData: AuctionCallbackRequest
  ): Promise<void> {
    try {
      // Можно добавить запись в таблицу логов или аудита
      console.log(`[AuctionCallback] Логируем обновление сделки ${transactionId}`, {
        orderId: callbackData.order_id,
        statusId: callbackData.status_id,
        amount: callbackData.amount,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`[AuctionCallback] Ошибка логирования:`, error);
    }
  }

  /**
   * Уведомляет мерчанта об изменениях, если необходимо
   */
  private async notifyMerchantIfNeeded(
    transactionId: string,
    updateData: any
  ): Promise<void> {
    try {
      // Получаем сделку с обновленными данными
      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: { merchant: true },
      });

      if (!transaction) {
        console.error(`[AuctionCallback] Сделка не найдена для уведомления: ${transactionId}`);
        return;
      }

      // Проверяем, нужно ли отправлять callback мерчанту
      // Это зависит от логики приложения - возможно, нужно отправлять callback
      // только при определенных статусах или изменениях

      if (updateData.status && this.shouldNotifyMerchant(updateData.status)) {
        console.log(`[AuctionCallback] Планируем уведомление мерчанта для сделки ${transactionId}`);
        // Здесь можно добавить логику отправки callback'а мерчанту
        // Например, через очередь задач или сразу
      }
    } catch (error) {
      console.error(`[AuctionCallback] Ошибка уведомления мерчанта:`, error);
    }
  }

  /**
   * Определяет, нужно ли уведомлять мерчанта о изменении статуса
   */
  private shouldNotifyMerchant(status: Status): boolean {
    // Уведомляем мерчанта о финальных статусах
    return [Status.READY, Status.CANCELED, Status.EXPIRED, Status.DISPUTE].includes(status);
  }

  /**
   * Создает ответ об ошибке
   */
  private createErrorResponse(
    errorCode: string,
    errorMessage: string
  ): AuctionCallbackResponse {
    return {
      is_success: false,
      error_code: errorCode as any,
      error_message: errorMessage,
    };
  }
}

/**
 * Синглтон экземпляр обработчика
 */
export const auctionCallbackHandler = new AuctionCallbackHandlerImpl();

/**
 * Вспомогательные функции для работы с callback'ами
 */
export const AuctionCallbackHelpers = {
  /**
   * Извлекает timestamp из заголовков
   */
  extractTimestamp(headers: Record<string, string>): number | null {
    const timestamp = headers["x-timestamp"] || headers["X-Timestamp"];
    if (!timestamp) return null;
    
    const num = parseInt(timestamp, 10);
    return isNaN(num) ? null : num;
  },

  /**
   * Извлекает подпись из заголовков
   */
  extractSignature(headers: Record<string, string>): string | null {
    return headers["x-signature"] || headers["X-Signature"] || null;
  },

  /**
   * Проверяет, является ли статус финальным
   */
  isFinalStatus(status: AuctionOrderStatus): boolean {
    return [6, 7, 8, 9, 10, 11, 12, 13].includes(status);
  },

  /**
   * Получает описание статуса аукциона
   */
  getStatusDescription(status: AuctionOrderStatus): string {
    const descriptions: Record<AuctionOrderStatus, string> = {
      1: "создана",
      2: "назначен трейдер",
      3: "реквизиты назначены",
      4: "мерч подтвердил оплату",
      5: "трейдер подтвердил оплату",
      6: "завершена",
      7: "спор",
      8: "отменена по таймауту",
      9: "отменена мерчантом",
      10: "отменена трейдером",
      11: "отменена админом",
      12: "отменена супервайзером",
      13: "отменена по результату спора",
    };
    
    return descriptions[status] || "неизвестный статус";
  },
};
