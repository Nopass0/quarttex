import { Aggregator, PSPWareRandomizationType } from '@prisma/client';
import axios from 'axios';
import { db } from '@/db';
import crypto from 'crypto';

export interface PSPWareOrderRequest {
  sum: number;
  currency?: string;
  order_type?: 'PAY-IN' | 'PAY-OUT';
  bank?: string;
  recipient?: string;
  requisite?: string;
  geos?: string[];
  pay_types?: string[];
}

export interface PSPWareOrderResponse {
  id: string;
  sum: number;
  currency: string;
  currency_rate?: number;
  order_type: string;
  status: string;
  card?: string;
  bank?: string;
  pay_type?: string;
  merchant_id?: string;
  recipient?: string;
  merchant_percent?: number;
  geo?: string;
  bik?: string | null;
  payment_url?: string | null;
  created_at: string;
  updated_at: string;
  bank_name?: string;
  merch_profit?: number;
  merch_profit_currency?: string;
}

export interface PSPWareCallbackData {
  order_id: string;
  status: 'success' | 'failed' | 'pending' | 'expired';
  amount: number;
  pspware_order_id: string;
  timestamp: number;
  sign: string;
}

export interface PSPWareOrderStatus {
  order_id: string;
  pspware_order_id: string;
  status: 'success' | 'failed' | 'pending' | 'expired';
  amount: number;
  created_at: string;
  updated_at: string;
  payment_details?: any;
}

export class PSPWareAdapterService {
  private static instance: PSPWareAdapterService;

  static getInstance(): PSPWareAdapterService {
    if (!PSPWareAdapterService.instance) {
      PSPWareAdapterService.instance = new PSPWareAdapterService();
    }
    return PSPWareAdapterService.instance;
  }

  /**
   * PSPWare v2 API doesn't use signatures, authentication is via X-API-KEY header
   */

  /**
   * Map our payment method to PSPWare v2 pay_types format
   */
  private mapPaymentMethodToPayTypes(method: string): string[] {
    const methodMap: Record<string, string[]> = {
      'SBP': ['sbp'],
      'C2C': ['c2c'],
      'ACCOUNT': ['account'],
      'NSPK': ['nspk']
    };
    return methodMap[method] || ['c2c', 'sbp'];
  }

  /**
   * Apply amount randomization based on aggregator settings
   */
  private applyAmountRandomization(
    amount: number, 
    randomizationType: PSPWareRandomizationType
  ): number {
    if (randomizationType === 'NONE') {
      return amount;
    }

    // Генерируем случайное смещение от -2 до +2
    const randomOffset = Math.floor(Math.random() * 5) - 2;

    if (randomizationType === 'FULL') {
      // Полная рандомизация: просто добавляем смещение
      return Math.max(1, amount + randomOffset);
    } else if (randomizationType === 'PARTIAL') {
      // Частичная рандомизация: только для сумм кратных 500
      if (amount % 500 === 0) {
        return Math.max(1, amount + randomOffset);
      }
    }

    return amount;
  }

  /**
   * Send deal to PSPWare aggregator using v2 API
   */
  async sendDealToPSPWare(
    aggregator: Aggregator,
    request: {
      ourDealId: string;
      amount: number;
      rate: number;
      paymentMethod: string;
      bankType?: string;
      clientIdentifier?: string;
      callbackUrl: string;
      expiresAt?: string;
      metadata?: any;
    }
  ): Promise<{
    success: boolean;
    pspwareOrderId?: string;
    requisites?: any;
    paymentLink?: string;
    message?: string;
    error?: string;
    actualRequestBody?: any;
    actualResponseBody?: any;
    actualHeaders?: any;
  }> {
    // Use customApiToken if available, otherwise fall back to pspwareApiKey
    const apiKey = aggregator.customApiToken || aggregator.pspwareApiKey;
    
    if (!apiKey) {
      return {
        success: false,
        error: 'PSPWare API key not configured'
      };
    }

    // Apply amount randomization if enabled
    let finalAmount = request.amount;
    if (aggregator.enableRandomization && aggregator.randomizationType) {
      finalAmount = this.applyAmountRandomization(request.amount, aggregator.randomizationType);
      console.log(`[PSPWare] Amount randomized: ${request.amount} -> ${finalAmount}`);
    }

    // Prepare PSPWare v2 order request
    const pspwareRequest: PSPWareOrderRequest = {
      sum: finalAmount,
      currency: 'RUB',
      order_type: 'PAY-IN',
      bank: request.bankType || 'any-bank',
      geos: ['RU'],
      pay_types: this.mapPaymentMethodToPayTypes(request.paymentMethod)
    };

    try {

      // Ensure proper URL construction - remove duplicate /merchant if present
      const baseUrl = aggregator.apiBaseUrl.endsWith('/merchant') 
        ? aggregator.apiBaseUrl.slice(0, -9) // Remove '/merchant' from end
        : aggregator.apiBaseUrl;
      
      const ordersUrl = `${baseUrl}/merchant/v2/orders`;
      console.log(`[PSPWare] Sending order request to ${ordersUrl}`);

      // Prepare request headers
      const requestHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-KEY': apiKey
      };

      // Send request to PSPWare v2 API
      console.log(`[PSPWare] Sending request to ${ordersUrl}:`, {
        headers: requestHeaders,
        body: pspwareRequest
      });

      const response = await axios.post<PSPWareOrderResponse>(
        ordersUrl,
        pspwareRequest,
        {
          timeout: 2000,
          headers: requestHeaders,
          validateStatus: () => true // Принимаем любой статус для логирования
        }
      );

      console.log(`[PSPWare] Response status: ${response.status}`);
      console.log(`[PSPWare] Response data:`, response.data);
      console.log(`[PSPWare] Response headers:`, response.headers);

      // Check if response is successful
      if (response.status >= 200 && response.status < 300) {
        if (response.data && response.data.id) {
          console.log(`[PSPWare] Order created: ${response.data.id}`);
          
          // Extract requisites based on pay_type
          const requisites: any = {};
          if (response.data.card) {
            if (response.data.pay_type === 'sbp') {
              requisites.phoneNumber = response.data.card;
              requisites.recipientName = response.data.recipient;
            } else if (response.data.pay_type === 'c2c') {
              requisites.cardNumber = response.data.card;
              requisites.recipientName = response.data.recipient;
            } else if (response.data.pay_type === 'account') {
              requisites.accountNumber = response.data.card;
              requisites.bik = response.data.bik;
              requisites.recipientName = response.data.recipient;
            }
          }

          if (response.data.bank) {
            requisites.bankCode = response.data.bank;
            requisites.bankName = response.data.bank_name;
          }

          return {
            success: true,
            pspwareOrderId: response.data.id,
            requisites: requisites,
            paymentLink: response.data.payment_url,
            message: 'Order created successfully',
            actualRequestBody: pspwareRequest,
            actualResponseBody: response.data,
            actualHeaders: requestHeaders
          };
        } else {
          console.log('[PSPWare] Invalid response structure:', response.data);
          return {
            success: false,
            error: 'Invalid response from PSPWare',
            message: 'No order data received',
            actualRequestBody: pspwareRequest,
            actualResponseBody: response.data,
            actualHeaders: requestHeaders
          };
        }
      } else {
        // Handle error responses
        console.log(`[PSPWare] Error response (${response.status}):`, response.data);
        
        let errorMessage = 'PSPWare API error';
        if (response.data?.detail) {
          errorMessage = response.data.detail;
        } else if (response.data?.message) {
          errorMessage = response.data.message;
        } else if (response.data?.error) {
          errorMessage = response.data.error;
        }
        
        // Check for specific error messages
        if (errorMessage.includes('Не удалось найти подходящие реквизиты') || 
            errorMessage.includes('No suitable requisites found')) {
          errorMessage = 'NO_REQUISITE';
        }
        
        return {
          success: false,
          error: errorMessage,
          message: errorMessage,
          actualRequestBody: pspwareRequest,
          actualResponseBody: response.data,
          actualHeaders: requestHeaders
        };
      }

    } catch (error) {
      console.error('[PSPWare] Error sending deal:', error);
      
      // Extract actual response data from axios error
      let actualResponseBody = null;
      let errorMessage = 'Failed to send deal to PSPWare';
      let actualHeaders = requestHeaders;
      
      if (axios.isAxiosError(error)) {
        console.log(`[PSPWare] Axios error details:`, {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          statusText: error.response?.statusText,
          responseData: error.response?.data,
          requestUrl: error.config?.url,
          requestMethod: error.config?.method,
          requestHeaders: error.config?.headers,
          requestData: error.config?.data
        });
        
        if (error.response) {
          actualResponseBody = error.response.data;
          actualHeaders = error.config?.headers || requestHeaders;
          
          // Check for specific PSPWare error messages
          if ((error.response.status === 400 || error.response.status === 404) && actualResponseBody?.detail) {
            const detail = actualResponseBody.detail;
            if (detail.includes('Не удалось найти подходящие реквизиты') || 
                detail.includes('No suitable requisites found')) {
              errorMessage = 'NO_REQUISITE';
            } else {
              errorMessage = detail;
            }
          } else if (error.response.status === 401) {
            errorMessage = 'Invalid API key';
          } else if (error.response.status === 403) {
            errorMessage = 'Access forbidden';
          } else if (error.response.status >= 500) {
            errorMessage = 'PSPWare server error';
          }
        } else if (error.code === 'ECONNREFUSED') {
          errorMessage = 'Connection refused - PSPWare server unavailable';
        } else if (error.code === 'ETIMEDOUT') {
          errorMessage = 'Request timeout';
        } else if (error.code === 'ENOTFOUND') {
          errorMessage = 'PSPWare server not found';
        }
      }
      
      return {
        success: false,
        error: errorMessage,
        message: errorMessage,
        actualRequestBody: pspwareRequest,
        actualResponseBody: actualResponseBody,
        actualHeaders: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-API-KEY': apiKey
        }
      };
    }
  }

  /**
   * Get order status from PSPWare v2 API
   */
  async getOrderStatus(
    aggregator: Aggregator,
    orderId: string
  ): Promise<PSPWareOrderResponse | null> {
    const apiKey = aggregator.customApiToken || aggregator.pspwareApiKey;
    
    if (!apiKey) {
      console.error('[PSPWare] API key not configured');
      return null;
    }

    try {
      const baseUrl = aggregator.apiBaseUrl.endsWith('/merchant') 
        ? aggregator.apiBaseUrl.slice(0, -9)
        : aggregator.apiBaseUrl;

      const response = await axios.get<PSPWareOrderResponse>(
        `${baseUrl}/merchant/v2/orders/${orderId}`,
        {
          timeout: 5000,
          headers: {
            'Accept': 'application/json',
            'X-API-KEY': apiKey
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('[PSPWare] Error getting order status:', error);
      return null;
    }
  }

  /**
   * Handle PSPWare callback (PSPWare v2 API callbacks)
   */
  async handleCallback(
    callbackData: any, // PSPWare v2 callback structure
    aggregatorId: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const aggregator = await db.aggregator.findUnique({
        where: { id: aggregatorId }
      });

      const apiKey = aggregator?.customApiToken || aggregator?.pspwareApiKey;
      
      if (!aggregator || !apiKey) {
        return {
          success: false,
          message: 'Aggregator not found or not configured'
        };
      }

      // Find transaction by order ID - PSPWare sends order ID in 'id' field
      const transaction = await db.transaction.findFirst({
        where: {
          OR: [
            { id: callbackData.id },
            { orderId: callbackData.id },
            { aggregatorOrderId: callbackData.id }
          ]
        },
        include: {
          merchant: true,
          aggregator: true
        }
      });

      if (!transaction) {
        console.error(`[PSPWare] Transaction not found for order ${callbackData.id}`);
        return {
          success: false,
          message: 'Transaction not found'
        };
      }

      // Map PSPWare status to our status
      const statusMap: Record<string, string> = {
        'success': 'READY',
        'processing': 'PROCESSING', 
        'failed': 'CANCELLED',
        'expired': 'EXPIRED',
        'pending': 'PROCESSING'
      };

      const newStatus = statusMap[callbackData.status] || 'PROCESSING';

      // Update transaction status
      await db.transaction.update({
        where: { id: transaction.id },
        data: {
          status: newStatus as any,
          updatedAt: new Date()
        }
      });

      // Log callback
      await db.aggregatorCallbackLog.create({
        data: {
          aggregatorId: aggregator.id,
          transactionId: transaction.id,
          type: 'pspware_v2_status_update',
          payload: callbackData as any,
          response: 'OK',
          statusCode: 200
        }
      });

      console.log(`[PSPWare] Callback processed for transaction ${transaction.id}, status: ${callbackData.status} -> ${newStatus}`);

      // Forward callback to merchant using unified format
      if (transaction.callbackUri) {
        try {
          // Use the same format as regular trader callbacks
          const merchantCallback = {
            id: transaction.orderId, // orderId is used as 'id' in our standard format
            amount: transaction.amount,
            status: newStatus
          };

          // Send callback to merchant
          const axios = (await import('axios')).default;
          const callbackResponse = await axios.post(transaction.callbackUri, merchantCallback, {
            timeout: 5000,
            headers: {
              'Content-Type': 'application/json'
            }
          });

          console.log(`[PSPWare] Callback forwarded to merchant ${transaction.merchant?.name}`);

          // Log successful callback
          await db.callbackHistory.create({
            data: {
              transactionId: transaction.id,
              url: transaction.callbackUri,
              payload: merchantCallback as any,
              response: JSON.stringify(callbackResponse.data),
              statusCode: callbackResponse.status,
              success: true
            }
          });

          // Update callback sent flag
          await db.transaction.update({
            where: { id: transaction.id },
            data: { callbackSent: true }
          });

        } catch (error) {
          console.error(`[PSPWare] Failed to forward callback to merchant:`, error);
          // Log failed callback attempt
          await db.callbackHistory.create({
            data: {
              transactionId: transaction.id,
              url: transaction.callbackUri,
              payload: {
                id: transaction.orderId,
                amount: transaction.amount,
                status: newStatus
              } as any,
              response: error instanceof Error ? error.message : 'Failed',
              statusCode: 0,
              success: false
            }
          });
        }
      }
      
      // Also send to success/fail URLs based on status
      if (newStatus === 'READY' && transaction.successUri) {
        try {
          const axios = (await import('axios')).default;
          await axios.post(transaction.successUri, {
            id: transaction.orderId,
            amount: transaction.amount,
            status: newStatus
          }, {
            timeout: 5000,
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          console.error(`[PSPWare] Failed to send success callback:`, error);
        }
      } else if ((newStatus === 'CANCELLED' || newStatus === 'EXPIRED') && transaction.failUri) {
        try {
          const axios = (await import('axios')).default;
          await axios.post(transaction.failUri, {
            id: transaction.orderId,
            amount: transaction.amount,
            status: newStatus
          }, {
            timeout: 5000,
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          console.error(`[PSPWare] Failed to send fail callback:`, error);
        }
      }

      return {
        success: true,
        message: 'Callback processed successfully'
      };

    } catch (error) {
      console.error('[PSPWare] Error processing callback:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send withdrawal request to PSPWare
   */
  async sendWithdrawalToPSPWare(
    aggregator: Aggregator,
    request: {
      orderId: string;
      amount: number;
      cardNumber?: string;
      phoneNumber?: string;
      recipientName?: string;
      bankCode?: string;
      paymentMethod: string;
    }
  ): Promise<{
    success: boolean;
    pspwareOrderId?: string;
    message?: string;
    error?: string;
  }> {
    const apiKey = aggregator.customApiToken || aggregator.pspwareApiKey;
    
    if (!apiKey) {
      return {
        success: false,
        error: 'PSPWare API key not configured'
      };
    }

    try {
      const withdrawalRequest = {
        order_id: request.orderId,
        amount: request.amount,
        currency: 'RUB',
        method: this.mapPaymentMethod(request.paymentMethod),
        merchant_api: apiKey,
        payment_type: 'withdraw',
        requisites: {
          card_number: request.cardNumber,
          phone_number: request.phoneNumber,
          recipient_name: request.recipientName,
          bank_code: request.bankCode
        }
      };

      const baseUrl = aggregator.apiBaseUrl.endsWith('/merchant') 
        ? aggregator.apiBaseUrl.slice(0, -9)
        : aggregator.apiBaseUrl;

      const response = await axios.post(
        `${baseUrl}/merchant/v2/withdrawal`,
        withdrawalRequest,
        {
          timeout: 2000,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-API-KEY': apiKey
          }
        }
      );

      if (response.data.error) {
        return {
          success: false,
          error: response.data.error,
          message: response.data.message
        };
      }

      return {
        success: true,
        pspwareOrderId: response.data.order?.id,
        message: 'Withdrawal request sent successfully'
      };

    } catch (error) {
      console.error('[PSPWare] Error sending withdrawal:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check PSPWare health status
   */
  async checkHealth(aggregator: Aggregator): Promise<{
    healthy: boolean;
    message?: string;
    responseTime?: number;
  }> {
    const apiKey = aggregator.customApiToken || aggregator.pspwareApiKey;
    
    if (!apiKey) {
      return {
        healthy: false,
        message: 'PSPWare API key not configured'
      };
    }

    try {
      const startTime = Date.now();
      
      if (!aggregator.apiBaseUrl) {
        return {
          healthy: false,
          message: 'PSPWare API base URL not configured'
        };
      }

      const baseUrl = aggregator.apiBaseUrl.endsWith('/merchant') 
        ? aggregator.apiBaseUrl.slice(0, -9)
        : aggregator.apiBaseUrl;

      const response = await axios.get(
        `${baseUrl}/merchant/v2/health`,
        {
          timeout: 5000,
          headers: {
            'Accept': 'application/json',
            'X-API-KEY': apiKey
          }
        }
      );

      const responseTime = Date.now() - startTime;

      return {
        healthy: response.data.status === 'ok',
        message: response.data.message || 'Service is healthy',
        responseTime
      };

    } catch (error) {
      console.error('[PSPWare] Health check failed:', error);
      return {
        healthy: false,
        message: error instanceof Error ? error.message : 'Health check failed'
      };
    }
  }
}

export const pspwareAdapterService = PSPWareAdapterService.getInstance();