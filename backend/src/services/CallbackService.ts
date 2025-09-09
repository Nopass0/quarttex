import { Transaction } from "@prisma/client";
import { db as prisma } from "../db";
import { WellbitCallbackService } from "./WellbitCallbackService";
import { auctionIntegrationService } from "./auction-integration.service";
import { Status } from "@prisma/client";

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

      // Проверяем, работает ли мерчант в режиме агрегатора
      const merchantWithAggregatorMode = await prisma.merchant.findUnique({
        where: { id: transaction.merchantId },
        select: { 
          isAggregatorMode: true, 
          externalCallbackToken: true,
          name: true 
        }
      });
      
      if (merchantWithAggregatorMode?.isAggregatorMode && merchantWithAggregatorMode.externalCallbackToken) {
        console.log(`[CallbackService] Detected aggregator mode merchant ${merchantWithAggregatorMode.name}, sending aggregator callback`);
        return await this.sendAggregatorCallback(transaction, merchantWithAggregatorMode.externalCallbackToken, status);
      }
      
      // Проверяем, является ли мерчант аукционным
      const isAuction = await auctionIntegrationService.isAuctionMerchant(transaction.merchantId);
      if (isAuction) {
        console.log(`[CallbackService] Detected auction merchant, sending auction callback`);
        
        // Маппим статус на аукционный
        const statusMapping: Record<Status, number> = {
          CREATED: 1,
          IN_PROGRESS: 2,
          READY: 6,
          CANCELED: 9,
          EXPIRED: 8,
          DISPUTE: 7,
          MILK: 1,
        };

        const auctionStatusId = statusMapping[status as Status] || statusMapping[transaction.status];
        
        try {
          const result = await auctionIntegrationService.notifyExternalSystem(
            transaction.merchantId,
            transaction.id,
            auctionStatusId,
            transaction.amount
          );
          
          if (result.success) {
            console.log(`[CallbackService] Auction callback sent successfully`);
          } else {
            console.log(`[CallbackService] Auction callback failed: ${result.error}`);
          }
        } catch (error) {
          console.error(`[CallbackService] Error sending auction callback:`, error);
        }
        
        // Продолжаем с обычным callback'ом для мерчанта
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

  static async sendAggregatorCallback(transaction: Transaction, callbackToken: string, status?: string): Promise<void> {
    const callbackUrl = transaction.callbackUri;
    
    if (!callbackUrl || callbackUrl === "none" || callbackUrl === "") {
      console.log(`[CallbackService] No callback URL for aggregator transaction ${transaction.id}`);
      return;
    }
    
    // Формируем payload в агрегаторском формате
    const payload = {
      ourDealId: transaction.orderId,
      status: status || transaction.status,
      amount: transaction.amount,
      partnerDealId: transaction.id,
      updatedAt: new Date().toISOString(),
      metadata: {}
    };
    
    let responseText: string | null = null;
    let statusCode: number | null = null;
    let errorMessage: string | null = null;
    
    try {
      console.log(`[CallbackService] Sending aggregator callback to ${callbackUrl} for transaction ${transaction.id}`);
      console.log(`[CallbackService] Aggregator payload:`, payload);
      
      const response = await fetch(callbackUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${callbackToken}`,
          "x-aggregator-token": callbackToken,
          "User-Agent": "Chase/1.0 (Aggregator)"
        },
        body: JSON.stringify(payload)
      });
      
      statusCode = response.status;
      responseText = await response.text();
      
      if (!response.ok) {
        console.error(`[CallbackService] Aggregator callback failed with status ${response.status}`);
        console.error(`[CallbackService] Response:`, responseText);
      } else {
        console.log(`[CallbackService] Aggregator callback sent successfully to ${callbackUrl}`);
        if (responseText) {
          console.log(`[CallbackService] Response:`, responseText);
        }
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[CallbackService] Error sending aggregator callback:`, error);
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
      console.error(`[CallbackService] Error saving aggregator callback history:`, dbError);
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