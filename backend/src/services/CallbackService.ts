import { Transaction } from "@prisma/client";
import { db as prisma } from "../db";
import { WellbitCallbackService } from "./WellbitCallbackService";

export interface CallbackPayload {
  id: string;
  amount: number; 
  status: string;
}

export class CallbackService {
  static async sendCallback(transaction: Transaction, status?: string): Promise<void> {
    const callbackUrl = transaction.callbackUri;
    
    if (!callbackUrl || callbackUrl === "none" || callbackUrl === "") {
      console.log(`[CallbackService] No callback URL for transaction ${transaction.id}`);
      return;
    }

    // Проверяем, является ли мерчант Wellbit
    if (transaction.merchantId) {
      const isWellbit = await WellbitCallbackService.isWellbitMerchant(transaction.merchantId);
      if (isWellbit) {
        console.log(`[CallbackService] Detected Wellbit merchant, using Wellbit callback format`);
        return await WellbitCallbackService.sendWellbitCallback(transaction, status);
      }
    }

    const payload: CallbackPayload = {
      id: transaction.orderId,
      amount: transaction.amount,
      status: status || transaction.status
    };

    let responseText: string | null = null;
    let statusCode: number | null = null;
    let errorMessage: string | null = null;

    try {
      console.log(`[CallbackService] Sending callback to ${callbackUrl} for transaction ${transaction.id}`);
      console.log(`[CallbackService] Payload:`, payload);

      const response = await fetch(callbackUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Chase/1.0"
        },
        body: JSON.stringify(payload)
      });

      statusCode = response.status;
      responseText = await response.text();

      if (!response.ok) {
        console.error(`[CallbackService] Callback failed with status ${response.status}`);
        console.error(`[CallbackService] Response:`, responseText);
      } else {
        console.log(`[CallbackService] Callback sent successfully to ${callbackUrl}`);
        if (responseText) {
          console.log(`[CallbackService] Response:`, responseText);
        }
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[CallbackService] Error sending callback:`, error);
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
      console.error(`[CallbackService] Error saving callback history:`, dbError);
    }
  }

  static async sendTestCallback(transactionId: string, amount: number, status: string, callbackUrl: string): Promise<void> {
    const payload: CallbackPayload = {
      id: transactionId,
      amount: amount,
      status: status
    };

    let responseText: string | null = null;
    let statusCode: number | null = null;
    let errorMessage: string | null = null;

    try {
      console.log(`[CallbackService] Sending TEST callback to ${callbackUrl}`);
      console.log(`[CallbackService] Payload:`, payload);

      const response = await fetch(callbackUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Chase/1.0 (Test)"
        },
        body: JSON.stringify(payload)
      });

      statusCode = response.status;
      responseText = await response.text();

      if (!response.ok) {
        console.error(`[CallbackService] TEST callback failed with status ${response.status}`);
        console.error(`[CallbackService] Response:`, responseText);
      } else {
        console.log(`[CallbackService] TEST callback sent successfully`);
        if (responseText) {
          console.log(`[CallbackService] Response:`, responseText);
        }
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[CallbackService] Error sending TEST callback:`, error);
    }

    // Сохраняем историю тестового колбэка в БД (если транзакция существует)
    if (transactionId && transactionId !== 'test-transaction-id') {
      try {
        // Проверяем, существует ли транзакция
        const transaction = await prisma.transaction.findUnique({
          where: { id: transactionId }
        });
        
        if (transaction) {
          await prisma.callbackHistory.create({
            data: {
              transactionId: transactionId,
              url: callbackUrl,
              payload: payload as any,
              response: responseText,
              statusCode: statusCode,
              error: errorMessage
            }
          });
        }
      } catch (dbError) {
        console.error(`[CallbackService] Error saving test callback history:`, dbError);
      }
    }
  }
}