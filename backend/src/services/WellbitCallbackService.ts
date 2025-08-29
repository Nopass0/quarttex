import { Transaction, Merchant } from "@prisma/client";
import { db as prisma } from "../db";
import crypto from 'crypto';

export interface WellbitCallbackPayload {
  callback: "payment";
  payment_id: string;
  payment_status: string;
}

export class WellbitCallbackService {
  
  private static generateHmacSignature(secretKey: string, requestBody: any): string {
    // Сортируем ключи объекта в алфавитном порядке
    const sortedData = Object.keys(requestBody)
      .sort()
      .reduce((obj: any, key) => {
        obj[key] = requestBody[key];
        return obj;
      }, {});
    
    // Преобразуем в JSON строку без escape символов
    const jsonString = JSON.stringify(sortedData);
    
    // Генерируем HMAC-SHA256 подпись
    return crypto.createHmac('sha256', secretKey).update(jsonString).digest('hex');
  }

  private static mapStatusToWellbit(status: string): string {
    // Маппинг статусов Chase на статусы Wellbit
    const statusMap: Record<string, string> = {
      'PENDING': 'new',
      'IN_PROGRESS': 'new',
      'READY': 'complete',
      'CANCELED': 'cancel',
      'EXPIRED': 'cancel',
      'FAILED': 'cancel',
      'REFUNDED': 'chargeback',
      'DISPUTE': 'appeal'
    };
    
    return statusMap[status] || 'new';
  }

  static async isWellbitMerchant(merchantId: string): Promise<boolean> {
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { name: true }
    });
    
    if (!merchant) return false;
    
    // Проверяем, что мерчант - это Wellbit (любой регистр)
    return merchant.name.toLowerCase() === 'wellbit';
  }

  static async sendWellbitCallback(
    transaction: Transaction & { merchant?: Merchant },
    status?: string,
    secretKey?: string,
    publicKey?: string
  ): Promise<void> {
    const callbackUrl = transaction.callbackUri;
    
    if (!callbackUrl || callbackUrl === "none" || callbackUrl === "") {
      console.log(`[WellbitCallbackService] No callback URL for transaction ${transaction.id}`);
      return;
    }

    // Получаем ключи мерчанта, если не переданы
    if ((!secretKey || !publicKey) && transaction.merchantId) {
      const merchant = transaction.merchant || await prisma.merchant.findUnique({
        where: { id: transaction.merchantId },
        select: { apiKeyPrivate: true, apiKeyPublic: true }
      });

      if (!secretKey) {
        secretKey = merchant?.apiKeyPrivate || undefined;
      }
      if (!publicKey) {
        publicKey = merchant?.apiKeyPublic || undefined;
      }
    }

    const wellbitStatus = this.mapStatusToWellbit(status || transaction.status);
    
    const payload: WellbitCallbackPayload = {
      callback: "payment",
      payment_id: transaction.orderId,
      payment_status: wellbitStatus
    };

    let responseText: string | null = null;
    let statusCode: number | null = null;
    let errorMessage: string | null = null;

    try {
      console.log(`[WellbitCallbackService] Sending Wellbit callback to ${callbackUrl} for transaction ${transaction.id}`);
      console.log(`[WellbitCallbackService] Payload:`, payload);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "Chase/1.0"
      };

      // Добавляем публичный ключ, если он есть
      if (publicKey) {
        headers["x-api-key"] = publicKey;
      }

      // Добавляем HMAC подпись, если есть секретный ключ
      if (secretKey) {
        const signature = this.generateHmacSignature(secretKey, payload);
        headers["x-api-token"] = signature;
        console.log(`[WellbitCallbackService] Added HMAC signature to headers`);
      }

      const response = await fetch(callbackUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });

      statusCode = response.status;
      responseText = await response.text();

      if (!response.ok && response.status !== 200) {
        console.error(`[WellbitCallbackService] Callback failed with status ${response.status}`);
        console.error(`[WellbitCallbackService] Response:`, responseText);
      } else {
        console.log(`[WellbitCallbackService] Callback sent successfully to ${callbackUrl}`);
        if (responseText) {
          console.log(`[WellbitCallbackService] Response:`, responseText);
        }
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[WellbitCallbackService] Error sending callback:`, error);
    }

    // Сохраняем историю колбэка в БД
    try {
      await prisma.callbackHistory.create({
        data: {
          transactionId: transaction.id,
          url: callbackUrl,
          payload: payload as any,
          response: responseText,
          statusCode: statusCode,
          error: errorMessage
        }
      });
    } catch (dbError) {
      console.error(`[WellbitCallbackService] Error saving callback history:`, dbError);
    }
  }
}