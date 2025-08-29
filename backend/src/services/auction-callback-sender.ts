/**
 * Сервис для отправки callback'ов внешним аукционным системам
 * Уведомляет внешние системы об изменениях статуса заказов
 */

import axios from "axios";
import { AuctionCallbackRequest } from "@/types/auction";
import { auctionSignatureUtils } from "@/utils/auction-signature";

/**
 * Конфигурация для отправки callback'а
 */
export interface CallbackConfig {
  callbackUrl: string;
  externalSystemName: string;
  privateKeyPem: string;
}

/**
 * Сервис для отправки callback'ов
 */
export class AuctionCallbackSender {
  /**
   * Отправляет callback внешней системе
   */
  async sendCallback(
    config: CallbackConfig,
    callbackData: AuctionCallbackRequest
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`[AuctionCallback] Отправка callback в ${config.callbackUrl}`, {
        orderId: callbackData.order_id,
        statusId: callbackData.status_id,
        amount: callbackData.amount,
      });

      const timestamp = Math.floor(Date.now() / 1000);
      
      // Создаем каноничную строку для callback
      const canonicalString = auctionSignatureUtils.createCanonicalString(
        timestamp,
        config.externalSystemName,
        callbackData.order_id,
        "AuctionCallback"
      );

      // Подписываем
      const signature = auctionSignatureUtils.signCanonicalString(
        canonicalString,
        config.privateKeyPem
      );

      // Отправляем запрос
      const response = await axios.post(config.callbackUrl, callbackData, {
        headers: {
          "Content-Type": "application/json",
          "X-Timestamp": timestamp.toString(),
          "X-Signature": signature,
        },
        timeout: 10000, // 10 секунд таймаут
        validateStatus: () => true, // Не бросать ошибку на HTTP статусы
      });

      if (response.status >= 200 && response.status < 300) {
        console.log(`[AuctionCallback] Callback успешно отправлен`, {
          orderId: callbackData.order_id,
          status: response.status,
        });
        return { success: true };
      } else {
        console.warn(`[AuctionCallback] Callback вернул ошибку`, {
          orderId: callbackData.order_id,
          status: response.status,
          data: response.data,
        });
        return { success: false, error: `HTTP ${response.status}` };
      }
    } catch (error) {
      console.error(`[AuctionCallback] Ошибка отправки callback:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }

  /**
   * Отправляет callback об изменении статуса
   */
  async sendStatusUpdate(
    config: CallbackConfig,
    orderId: string,
    statusId: number,
    amount?: number
  ) {
    const callbackData: AuctionCallbackRequest = {
      order_id: orderId,
      status_id: statusId,
      ...(amount && { amount }),
    };

    return await this.sendCallback(config, callbackData);
  }

  /**
   * Отправляет callback об изменении суммы
   */
  async sendAmountUpdate(
    config: CallbackConfig,
    orderId: string,
    newAmount: number
  ) {
    const callbackData: AuctionCallbackRequest = {
      order_id: orderId,
      amount: newAmount,
    };

    return await this.sendCallback(config, callbackData);
  }
}

/**
 * Синглтон экземпляр
 */
export const auctionCallbackSender = new AuctionCallbackSender();
