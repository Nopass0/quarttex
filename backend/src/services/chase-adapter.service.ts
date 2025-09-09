import axios, { AxiosError } from "axios";
import { db } from "@/db";
import { Status } from "@prisma/client";

interface ChaseCreateDealRequest {
  merchantId: string;
  amount: number;
  paymentMethod: string;
  bankType?: string;
  callbackUrl?: string;
  successUrl?: string;
  failureUrl?: string;
  metadata?: any;
}

interface ChaseCreateDealResponse {
  success: boolean;
  transactionId?: string;
  paymentUrl?: string;
  error?: string;
}

interface ChaseCallbackRequest {
  transactionId: string;
  status: Status;
  amount: number;
  fee?: number;
  metadata?: any;
}

export class ChaseAdapterService {
  static instance: ChaseAdapterService;

  static getInstance(): ChaseAdapterService {
    if (!ChaseAdapterService.instance) {
      ChaseAdapterService.instance = new ChaseAdapterService();
    }
    return ChaseAdapterService.instance;
  }

  /**
   * Создает сделку на другом экземпляре Chase, выступающем в роли агрегатора
   */
  async createDeal(
    request: ChaseCreateDealRequest,
    aggregatorId: string
  ): Promise<ChaseCreateDealResponse> {
    try {
      const aggregator = await db.aggregator.findUnique({
        where: { id: aggregatorId },
      });

      if (!aggregator) {
        throw new Error("Aggregator not found");
      }

      if (!aggregator.isChaseProject) {
        throw new Error("This aggregator is not a Chase project");
      }

      if (!aggregator.apiBaseUrl) {
        throw new Error("API base URL not configured for this aggregator");
      }

      console.log(`[ChaseAdapter] Creating deal on Chase aggregator ${aggregator.name}:`, {
        amount: request.amount,
        paymentMethod: request.paymentMethod,
      });

      // Формируем запрос в формате API мерчанта Chase
      const chaseRequest = {
        amount: request.amount,
        method: request.paymentMethod,
        bankType: request.bankType,
        callbackUrl: request.callbackUrl || `${process.env.BASE_URL}/api/aggregator/chase-callback/${aggregatorId}`,
        successUrl: request.successUrl,
        failureUrl: request.failureUrl,
        metadata: {
          ...request.metadata,
          sourceAggregatorId: aggregatorId,
          sourceMerchantId: request.merchantId,
        },
      };

      // Отправляем запрос на создание транзакции
      const response = await axios.post(
        `${aggregator.apiBaseUrl}/api/merchant/create-transaction`,
        chaseRequest,
        {
          headers: {
            "Content-Type": "application/json",
            "x-merchant-api-key": aggregator.customApiToken || aggregator.apiToken,
          },
          timeout: aggregator.maxSlaMs || 5000,
        }
      );

      console.log(`[ChaseAdapter] Chase aggregator response:`, response.data);

      if (response.data.success) {
        return {
          success: true,
          transactionId: response.data.transactionId,
          paymentUrl: response.data.paymentUrl,
        };
      } else {
        return {
          success: false,
          error: response.data.error || "Unknown error from Chase aggregator",
        };
      }
    } catch (error) {
      console.error(`[ChaseAdapter] Error creating deal:`, error);
      
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<any>;
        return {
          success: false,
          error: axiosError.response?.data?.error || axiosError.message,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Обрабатывает callback от Chase-агрегатора
   */
  async handleCallback(
    payload: ChaseCallbackRequest,
    aggregatorId: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      console.log(`[ChaseAdapter] Received callback from Chase aggregator:`, {
        aggregatorId,
        transactionId: payload.transactionId,
        status: payload.status,
      });

      // Находим нашу транзакцию
      const transaction = await db.transaction.findFirst({
        where: {
          aggregatorId,
          partnerDealId: payload.transactionId,
        },
        include: {
          merchant: true,
          method: true,
        },
      });

      if (!transaction) {
        console.error(`[ChaseAdapter] Transaction not found for partner deal ID: ${payload.transactionId}`);
        return {
          success: false,
          message: "Transaction not found",
        };
      }

      // Обновляем статус транзакции
      const updatedTransaction = await db.transaction.update({
        where: { id: transaction.id },
        data: {
          status: payload.status,
          updatedAt: new Date(),
          ...(payload.status === "READY" && { acceptedAt: new Date() }),
        },
        include: {
          merchant: true,
          method: true,
        },
      });

      console.log(`[ChaseAdapter] Transaction status updated:`, {
        transactionId: transaction.id,
        oldStatus: transaction.status,
        newStatus: payload.status,
      });

      // Обрабатываем финансовые операции при успешном завершении
      if (payload.status === "READY" && transaction.status !== "READY") {
        await this.processSuccessfulTransaction(updatedTransaction, aggregatorId, payload);
      }

      // Отправляем callback мерчанту
      await this.sendMerchantCallback(updatedTransaction);

      return {
        success: true,
        message: "Callback processed successfully",
      };
    } catch (error) {
      console.error(`[ChaseAdapter] Error processing callback:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Обрабатывает успешную транзакцию
   */
  private async processSuccessfulTransaction(
    transaction: any,
    aggregatorId: string,
    payload: ChaseCallbackRequest
  ): Promise<void> {
    await db.$transaction(async (prisma) => {
      // Получаем агрегатора
      const aggregator = await prisma.aggregator.findUnique({
        where: { id: aggregatorId },
      });

      if (!aggregator) {
        throw new Error("Aggregator not found");
      }

      // Рассчитываем суммы
      const rate = transaction.rate || 100;
      const merchantCredit = transaction.amount / rate;
      const aggregatorFee = payload.fee || 0;
      const finalCredit = merchantCredit - aggregatorFee;

      // Начисляем мерчанту
      if (transaction.type === "IN") {
        await prisma.merchant.update({
          where: { id: transaction.merchantId },
          data: {
            balanceUsdt: { increment: finalCredit },
          },
        });

        // Списываем с баланса агрегатора
        await prisma.aggregator.update({
          where: { id: aggregatorId },
          data: {
            balanceUsdt: { decrement: finalCredit },
          },
        });

        console.log(`[ChaseAdapter] Financial operations completed:`, {
          merchantCredit: finalCredit,
          aggregatorDebit: finalCredit,
        });
      }
    });
  }

  /**
   * Отправляет callback мерчанту
   */
  private async sendMerchantCallback(transaction: any): Promise<void> {
    try {
      if (!transaction.merchant?.callbackUrl) {
        console.log(`[ChaseAdapter] No callback URL for merchant ${transaction.merchantId}`);
        return;
      }

      const callbackData = {
        transactionId: transaction.id,
        status: transaction.status,
        amount: transaction.amount,
        currency: transaction.method.currency,
        timestamp: new Date().toISOString(),
      };

      const response = await axios.post(
        transaction.merchant.callbackUrl,
        callbackData,
        {
          headers: {
            "Content-Type": "application/json",
            "x-signature": this.generateSignature(callbackData, transaction.merchant.token),
          },
          timeout: 5000,
        }
      );

      console.log(`[ChaseAdapter] Merchant callback sent successfully:`, {
        merchantId: transaction.merchantId,
        status: response.status,
      });

      // Логируем callback
      await db.callbackHistory.create({
        data: {
          transactionId: transaction.id,
          url: transaction.merchant.callbackUrl,
          payload: callbackData,
          statusCode: response.status,
          response: JSON.stringify(response.data),
        },
      });
    } catch (error) {
      console.error(`[ChaseAdapter] Error sending merchant callback:`, error);
      
      // Логируем неудачную попытку
      await db.callbackHistory.create({
        data: {
          transactionId: transaction.id,
          url: transaction.merchant?.callbackUrl || "",
          payload: {},
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  }

  /**
   * Генерирует подпись для callback
   */
  private generateSignature(data: any, secret: string): string {
    const crypto = require("crypto");
    const payload = JSON.stringify(data);
    return crypto.createHmac("sha256", secret).update(payload).digest("hex");
  }

  /**
   * Проверяет доступность Chase-агрегатора
   */
  async checkHealth(aggregatorId: string): Promise<boolean> {
    try {
      const aggregator = await db.aggregator.findUnique({
        where: { id: aggregatorId },
      });

      if (!aggregator || !aggregator.isChaseProject || !aggregator.apiBaseUrl) {
        return false;
      }

      const response = await axios.get(
        `${aggregator.apiBaseUrl}/api/health`,
        {
          timeout: 3000,
        }
      );

      return response.status === 200;
    } catch (error) {
      console.error(`[ChaseAdapter] Health check failed:`, error);
      return false;
    }
  }
}

export const chaseAdapterService = ChaseAdapterService.getInstance();