import { db } from "@/db";
import axios from "axios";
import { Transaction, Aggregator } from "@prisma/client";

interface AggregatorTransactionRequest {
  transactionId: string;
  merchantId: string;
  amount: number;
  orderId: string;
  methodId: string;
  methodType: string;
  currency: string;
  clientName: string;
  callbackUrl: string;
  successUrl: string;
  failUrl: string;
  expiresAt: string;
  clientIdentifier?: string;
}

interface AggregatorTransactionResponse {
  success: boolean;
  transactionId?: string;
  status?: string;
  paymentData?: {
    requisites?: any;
    instructions?: string;
  };
  error?: string;
}

interface AggregatorStatusRequest {
  transactionId: string;
  status: string;
}

export class AggregatorService {
  private async logApiCall(
    aggregatorId: string,
    endpoint: string,
    method: string,
    requestData?: any,
    responseData?: any,
    statusCode?: number,
    error?: string,
    duration?: number
  ) {
    try {
      await db.aggregatorApiLog.create({
        data: {
          aggregatorId,
          endpoint,
          method,
          requestData: requestData || null,
          responseData: responseData || null,
          statusCode,
          error,
          duration
        }
      });
    } catch (e) {
      console.error('[AggregatorService] Failed to log API call:', e);
    }
  }

  async createTransaction(
    aggregator: Aggregator,
    transaction: Transaction & { method: any }
  ): Promise<AggregatorTransactionResponse> {
    if (!aggregator.apiBaseUrl) {
      throw new Error(`Aggregator ${aggregator.name} has no API base URL configured`);
    }

    const startTime = Date.now();
    const endpoint = `${aggregator.apiBaseUrl}/transaction/create`;
    
    const requestData: AggregatorTransactionRequest = {
      transactionId: transaction.id,
      merchantId: transaction.merchantId,
      amount: transaction.amount,
      orderId: transaction.orderId,
      methodId: transaction.methodId,
      methodType: transaction.method.type,
      currency: transaction.currency || "RUB",
      clientName: transaction.clientName,
      callbackUrl: `${process.env.API_URL || 'http://localhost:3000'}/api/aggregator/callback`,
      successUrl: transaction.successUri,
      failUrl: transaction.failUri,
      expiresAt: transaction.expired_at.toISOString(),
      clientIdentifier: transaction.clientIdentifier
    };

    try {
      console.log(`[AggregatorService] Creating transaction on ${aggregator.name}:`, {
        endpoint,
        transactionId: transaction.id,
        amount: transaction.amount
      });

      const response = await axios.post(endpoint, requestData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aggregator.customApiToken || aggregator.apiToken}`
        },
        timeout: aggregator.maxSlaMs || 2000 // Используем настройки агрегатора или 2 секунды по умолчанию
      });

      const duration = Date.now() - startTime;

      await this.logApiCall(
        aggregator.id,
        endpoint,
        'POST',
        requestData,
        response.data,
        response.status,
        undefined,
        duration
      );

      if (response.data.success) {
        console.log(`[AggregatorService] Transaction created successfully on ${aggregator.name}:`, response.data);
        return response.data;
      } else {
        console.log(`[AggregatorService] Transaction creation failed on ${aggregator.name}:`, response.data);
        return {
          success: false,
          error: response.data.error || 'Unknown error from aggregator'
        };
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorMessage = error?.response?.data?.error || error?.message || 'Network error';
      const statusCode = error?.response?.status;

      console.error(`[AggregatorService] Error creating transaction on ${aggregator.name}:`, {
        error: errorMessage,
        statusCode,
        transactionId: transaction.id
      });

      await this.logApiCall(
        aggregator.id,
        endpoint,
        'POST',
        requestData,
        error?.response?.data,
        statusCode,
        errorMessage,
        duration
      );

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async updateTransactionStatus(
    aggregator: Aggregator,
    transactionId: string,
    status: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!aggregator.apiBaseUrl) {
      throw new Error(`Aggregator ${aggregator.name} has no API base URL configured`);
    }

    const startTime = Date.now();
    const endpoint = `${aggregator.apiBaseUrl}/transaction/status`;
    
    const requestData: AggregatorStatusRequest = {
      transactionId,
      status
    };

    try {
      console.log(`[AggregatorService] Updating transaction status on ${aggregator.name}:`, {
        endpoint,
        transactionId,
        status
      });

      const response = await axios.post(endpoint, requestData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aggregator.customApiToken || aggregator.apiToken}`
        },
        timeout: aggregator.maxSlaMs || 2000 // Используем настройки агрегатора или 2 секунды по умолчанию
      });

      const duration = Date.now() - startTime;

      await this.logApiCall(
        aggregator.id,
        endpoint,
        'POST',
        requestData,
        response.data,
        response.status,
        undefined,
        duration
      );

      return {
        success: response.data.success || false
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorMessage = error?.response?.data?.error || error?.message || 'Network error';
      const statusCode = error?.response?.status;

      console.error(`[AggregatorService] Error updating transaction status on ${aggregator.name}:`, {
        error: errorMessage,
        statusCode,
        transactionId
      });

      await this.logApiCall(
        aggregator.id,
        endpoint,
        'POST',
        requestData,
        error?.response?.data,
        statusCode,
        errorMessage,
        duration
      );

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async getTransactionInfo(
    aggregator: Aggregator,
    transactionId: string
  ): Promise<any> {
    if (!aggregator.apiBaseUrl) {
      throw new Error(`Aggregator ${aggregator.name} has no API base URL configured`);
    }

    const startTime = Date.now();
    const endpoint = `${aggregator.apiBaseUrl}/transaction/${transactionId}`;

    try {
      console.log(`[AggregatorService] Getting transaction info from ${aggregator.name}:`, {
        endpoint,
        transactionId
      });

      const response = await axios.get(endpoint, {
        headers: {
          'Authorization': `Bearer ${aggregator.customApiToken || aggregator.apiToken}`
        },
        timeout: aggregator.maxSlaMs || 2000 // Используем настройки агрегатора или 2 секунды по умолчанию
      });

      const duration = Date.now() - startTime;

      await this.logApiCall(
        aggregator.id,
        endpoint,
        'GET',
        { transactionId },
        response.data,
        response.status,
        undefined,
        duration
      );

      return response.data;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorMessage = error?.response?.data?.error || error?.message || 'Network error';
      const statusCode = error?.response?.status;

      console.error(`[AggregatorService] Error getting transaction info from ${aggregator.name}:`, {
        error: errorMessage,
        statusCode,
        transactionId
      });

      await this.logApiCall(
        aggregator.id,
        endpoint,
        'GET',
        { transactionId },
        error?.response?.data,
        statusCode,
        errorMessage,
        duration
      );

      throw new Error(errorMessage);
    }
  }

  async findAvailableAggregators(
    methodId: string,
    amount: number
  ): Promise<Aggregator[]> {
    // Находим активных агрегаторов с достаточным балансом
    const aggregators = await db.aggregator.findMany({
      where: {
        isActive: true,
        balanceUsdt: { gte: amount / 100 }, // Примерный расчет USDT
        apiBaseUrl: { not: null }
      },
      orderBy: [
        { balanceUsdt: 'desc' }, // Сначала с большим балансом
        { createdAt: 'asc' }     // Потом по времени создания
      ]
    });

    return aggregators;
  }
}

export const aggregatorService = new AggregatorService();