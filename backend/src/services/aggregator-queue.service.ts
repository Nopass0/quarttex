import { db } from "@/db";
import { Aggregator, IntegrationDirection, AggregatorApiSchema } from "@prisma/client";
import axios from "axios";
import { pspwareAdapterService } from "./pspware-adapter.service";

export interface AggregatorDealRequest {
  ourDealId: string;
  amount: number;
  rate: number;
  paymentMethod: "SBP" | "C2C";
  bankType?: string;
  clientIdentifier?: string;
  callbackUrl: string;
  expiresAt?: string;
  metadata?: any;
}

export interface AggregatorDealResponse {
  accepted: boolean;
  partnerDealId?: string;
  requisites?: {
    bankName?: string;
    cardNumber?: string;
    phoneNumber?: string;
    recipientName?: string;
    bankCode?: string;
    additionalInfo?: string;
  };
  dealDetails?: {
    id: string;
    amount: number;
    status: string;
    createdAt: string;
    expiresAt: string;
    paymentMethod: string;
    metadata?: any;
  };
  message?: string;
}

export class AggregatorQueueService {
  private static instance: AggregatorQueueService;
  private lastUsedAggregatorId: string | null = null;
  private queueRotationTime = new Map<string, Date>();

  static getInstance(): AggregatorQueueService {
    if (!AggregatorQueueService.instance) {
      AggregatorQueueService.instance = new AggregatorQueueService();
    }
    return AggregatorQueueService.instance;
  }

  /**
   * Получить следующего агрегатора из очереди
   */
  private async getNextAggregator(): Promise<Aggregator | null> {
    // Получаем всех активных агрегаторов, отсортированных по приоритету и времени последнего использования
    const aggregators = await db.aggregator.findMany({
      where: {
        isActive: true,
        apiBaseUrl: { not: null }
      },
      orderBy: [
        { priority: 'asc' },
        { updatedAt: 'asc' }
      ]
    });

    if (aggregators.length === 0) {
      return null;
    }

    // Фильтруем агрегаторов по балансу и дневному лимиту
    const availableAggregators = aggregators.filter(agg => {
      // Проверка минимального депозита (1000 USDT)
      if (agg.depositUsdt < 1000) {
        console.log(`[AggregatorQueue] ${agg.name} skipped - insufficient deposit (${agg.depositUsdt} < 1000 USDT)`);
        return false;
      }

      // Проверка минимального баланса
      if (agg.minBalance > 0 && agg.balanceUsdt < agg.minBalance) {
        console.log(`[AggregatorQueue] ${agg.name} skipped - insufficient balance`);
        return false;
      }

      // Проверка дневного объёма
      if (agg.maxDailyVolume && agg.currentDailyVolume >= agg.maxDailyVolume) {
        console.log(`[AggregatorQueue] ${agg.name} skipped - daily volume exceeded`);
        return false;
      }

      // Проверка времени ротации (минимум 1 секунда между запросами к одному агрегатору)
      const lastRotation = this.queueRotationTime.get(agg.id);
      if (lastRotation && (Date.now() - lastRotation.getTime()) < 1000) {
        console.log(`[AggregatorQueue] ${agg.name} skipped - too soon after last request`);
        return false;
      }

      return true;
    });

    if (availableAggregators.length === 0) {
      return null;
    }

    // Находим позицию последнего использованного агрегатора
    let startIndex = 0;
    if (this.lastUsedAggregatorId) {
      const lastIndex = availableAggregators.findIndex(a => a.id === this.lastUsedAggregatorId);
      if (lastIndex !== -1) {
        startIndex = (lastIndex + 1) % availableAggregators.length;
      }
    }

    // Берём следующего по очереди
    const selectedAggregator = availableAggregators[startIndex];
    
    // Обновляем время последнего использования
    this.queueRotationTime.set(selectedAggregator.id, new Date());
    this.lastUsedAggregatorId = selectedAggregator.id;

    return selectedAggregator;
  }

  /**
   * Отправить запрос на создание сделки агрегатору
   */
  private async sendDealToAggregator(
    aggregator: Aggregator,
    request: AggregatorDealRequest
  ): Promise<AggregatorDealResponse> {
    const startTime = Date.now();
    
    try {
      console.log(`[AggregatorQueue] Sending deal to ${aggregator.name} (${aggregator.apiBaseUrl})`);
      
      // Check if this is a Chase project aggregator
      if (aggregator.isChaseProject) {
        const { chaseAdapterService } = await import('./chase-adapter.service');
        
        console.log(`[AggregatorQueue] Routing to Chase aggregator: ${aggregator.name}`);
        
        const chaseResult = await chaseAdapterService.createDeal({
          merchantId: request.merchantId || 'default',
          amount: request.amount,
          paymentMethod: request.paymentMethod,
          bankType: request.bankType,
          callbackUrl: request.callbackUrl,
          successUrl: request.successUrl,
          failureUrl: request.failureUrl,
          metadata: request.metadata
        }, aggregator.id);
        
        // Log the integration
        await this.logIntegration({
          aggregatorId: aggregator.id,
          direction: IntegrationDirection.OUT,
          eventType: 'chase_deal_create',
          method: 'POST',
          url: `${aggregator.apiBaseUrl}/api/merchant/create-transaction`,
          headers: {
            'Content-Type': 'application/json',
            'x-merchant-api-key': '[MASKED]'
          },
          requestBody: request,
          responseBody: chaseResult,
          statusCode: chaseResult.success ? 200 : 400,
          responseTimeMs: Date.now() - startTime,
          slaViolation: (Date.now() - startTime) > (aggregator.maxSlaMs || 2000),
          ourDealId: transactionId,
          partnerDealId: chaseResult.transactionId || null,
          error: chaseResult.success ? null : chaseResult.error || null
        });
        
        if (chaseResult.success && chaseResult.transactionId) {
          console.log(`[AggregatorQueue] Chase aggregator accepted deal: ${chaseResult.transactionId}`);
          
          // Сохраняем ID партнерской сделки
          if (transactionId) {
            await db.transaction.update({
              where: { id: transactionId },
              data: { partnerDealId: chaseResult.transactionId }
            });
          }
          
          return {
            accepted: true,
            aggregator: {
              id: aggregator.id,
              name: aggregator.name,
              dealId: chaseResult.transactionId,
              paymentUrl: chaseResult.paymentUrl
            },
            message: 'Deal accepted by Chase aggregator'
          };
        } else {
          console.log(`[AggregatorQueue] Chase aggregator rejected deal: ${chaseResult.error}`);
          return {
            accepted: false,
            message: chaseResult.error || 'Chase aggregator rejected the deal'
          };
        }
      }
      
      // Check if aggregator uses PSPWare API schema
      if (aggregator.apiSchema === AggregatorApiSchema.PSPWARE) {
        console.log(`[AggregatorQueue] Using PSPWare adapter for ${aggregator.name}`);
        
        const pspwareResult = await pspwareAdapterService.sendDealToPSPWare(aggregator, {
          ourDealId: request.ourDealId,
          amount: request.amount,
          rate: request.rate,
          paymentMethod: request.paymentMethod,
          bankType: request.bankType,
          clientIdentifier: request.clientIdentifier,
          callbackUrl: request.callbackUrl,
          expiresAt: request.expiresAt,
          metadata: request.metadata
        });
        
        const responseTime = Date.now() - startTime;
        
        // Log integration
        const baseUrl = aggregator.apiBaseUrl.endsWith('/merchant') 
          ? aggregator.apiBaseUrl.slice(0, -9)
          : aggregator.apiBaseUrl;
        
        await this.logIntegration({
          aggregatorId: aggregator.id,
          direction: IntegrationDirection.OUT,
          eventType: 'pspware_deal_create',
          method: 'POST',
          url: `${baseUrl}/merchant/v2/orders`,
          headers: pspwareResult.actualHeaders || {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-API-KEY': aggregator.pspwareApiKey || aggregator.customApiToken || aggregator.apiToken
          },
          requestBody: pspwareResult.actualRequestBody || request,
          responseBody: pspwareResult.actualResponseBody || pspwareResult,
          statusCode: pspwareResult.success ? 200 : 400,
          responseTimeMs: responseTime,
          ourDealId: request.ourDealId,
          partnerDealId: pspwareResult.pspwareOrderId,
          slaViolation: responseTime > (aggregator.maxSlaMs || 2000),
          error: pspwareResult.error
        });
        
        if (pspwareResult.success) {
          console.log(`[AggregatorQueue] PSPWare deal accepted: ${pspwareResult.pspwareOrderId}`);
          
          // Update daily volume
          await db.aggregator.update({
            where: { id: aggregator.id },
            data: {
              currentDailyVolume: { increment: request.amount },
              updatedAt: new Date()
            }
          });
          
          return {
            accepted: true,
            partnerDealId: pspwareResult.pspwareOrderId,
            requisites: pspwareResult.requisites,
            dealDetails: {
              id: pspwareResult.pspwareOrderId!,
              amount: request.amount,
              status: 'pending',
              createdAt: new Date().toISOString(),
              expiresAt: request.expiresAt || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
              paymentMethod: request.paymentMethod,
              metadata: { paymentLink: pspwareResult.paymentLink }
            },
            message: pspwareResult.message
          };
        } else {
          console.log(`[AggregatorQueue] PSPWare deal rejected: ${pspwareResult.error}`);
          return {
            accepted: false,
            message: pspwareResult.error || pspwareResult.message || 'PSPWare rejected the deal'
          };
        }
      }
      
      // Default behavior for standard API schema
      const authToken = aggregator.customApiToken || aggregator.apiToken;
      
      const response = await axios.post(
        `${aggregator.apiBaseUrl}/deals`,
        request,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
            'x-aggregator-token': authToken,
            'x-api-token': authToken
          },
          timeout: aggregator.maxSlaMs || 2000,
          validateStatus: () => true // Принимаем любой статус для логирования
        }
      );

      const responseTime = Date.now() - startTime;
      
      // Подготавливаем заголовки для логирования (маскируем чувствительные данные)
      const logHeaders = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer [MASKED]',
        'x-aggregator-token': '[MASKED]',
        'x-api-token': '[MASKED]'
      };
      
      // Логируем интеграцию
      await this.logIntegration({
        aggregatorId: aggregator.id,
        direction: IntegrationDirection.OUT,
        eventType: 'deal_create',
        method: 'POST',
        url: `${aggregator.apiBaseUrl}/deals`,
        headers: logHeaders,
        requestBody: request,
        responseBody: response.data,
        statusCode: response.status,
        responseTimeMs: responseTime,
        ourDealId: request.ourDealId,
        partnerDealId: response.data?.partnerDealId,
        slaViolation: responseTime > (aggregator.maxSlaMs || 2000)
      });

      // Проверяем успешный ответ
      if (response.status === 201 && response.data?.accepted) {
        console.log(`[AggregatorQueue] Deal accepted by ${aggregator.name}: ${response.data.partnerDealId}`);
        
        // Обновляем дневной объём агрегатора
        await db.aggregator.update({
          where: { id: aggregator.id },
          data: {
            currentDailyVolume: { increment: request.amount },
            updatedAt: new Date() // Обновляем время для ротации очереди
          }
        });

        return response.data;
      }

      console.log(`[AggregatorQueue] Deal rejected by ${aggregator.name}: ${response.data?.message || response.status}`);
      return {
        accepted: false,
        message: response.data?.message || `Rejected with status ${response.status}`
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Подготавливаем заголовки для логирования ошибки
      const errorLogHeaders = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer [MASKED]',
        'x-aggregator-token': '[MASKED]',
        'x-api-token': '[MASKED]'
      };
      
      // Логируем ошибку
      await this.logIntegration({
        aggregatorId: aggregator.id,
        direction: IntegrationDirection.OUT,
        eventType: 'deal_create_error',
        method: 'POST',
        url: `${aggregator.apiBaseUrl}/deals`,
        headers: errorLogHeaders,
        requestBody: request,
        statusCode: 0,
        responseTimeMs: responseTime,
        ourDealId: request.ourDealId,
        error: error instanceof Error ? error.message : String(error),
        slaViolation: true
      });

      console.error(`[AggregatorQueue] Error sending to ${aggregator.name}:`, error);
      
      return {
        accepted: false,
        message: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Рассчитать стоимость сделки для агрегатора и платформы
   */
  private async calculateDealCosts(
    aggregator: any,
    request: AggregatorDealRequest,
    merchantFeePercent: number = 0
  ): Promise<{
    aggregatorCostUsdt: number;
    merchantCostUsdt: number;
    platformProfit: number;
    rate: number;
    aggregatorFeePercent: number;
  }> {
    // Получаем источник курса для агрегатора
    const aggregatorRateSource = await db.aggregatorRateSource.findUnique({
      where: { aggregatorId: aggregator.id },
      include: { rateSource: true }
    });

    // Получаем базовый курс
    let rate = 100; // Default rate
    if (aggregatorRateSource?.rateSource) {
      rate = aggregatorRateSource.rateSource.baseRate || 100;
      
      // Применяем ККК агрегатора
      if (aggregatorRateSource.kkkPercent) {
        const kkkAmount = rate * (aggregatorRateSource.kkkPercent / 100);
        if (aggregatorRateSource.kkkOperation === 'PLUS') {
          rate += kkkAmount;
        } else {
          rate -= kkkAmount;
        }
      }
    }

    // Получаем процент агрегатора для данного метода
    let aggregatorFeePercent = 0;
    if (request.paymentMethod) {
      // Пытаемся найти метод по коду
      const method = await db.method.findFirst({
        where: { code: request.paymentMethod }
      });
      
      if (method) {
        const methodFee = await db.aggregatorMethodFee.findUnique({
          where: {
            aggregatorId_methodId: {
              aggregatorId: aggregator.id,
              methodId: method.id
            }
          }
        });
        
        if (methodFee && methodFee.isActive) {
          aggregatorFeePercent = methodFee.feePercent;
        }
      }
    }

    // Рассчитываем стоимости
    const baseUsdt = request.amount / rate;
    const aggregatorCostUsdt = baseUsdt * (1 + aggregatorFeePercent / 100);
    const merchantCostUsdt = baseUsdt * (1 + merchantFeePercent / 100);
    const platformProfit = merchantCostUsdt - aggregatorCostUsdt;

    return {
      aggregatorCostUsdt,
      merchantCostUsdt,
      platformProfit,
      rate,
      aggregatorFeePercent
    };
  }

  /**
   * Попытаться распределить сделку через агрегаторов
   */
  async routeDealToAggregators(
    request: AggregatorDealRequest,
    merchantFeePercent: number = 0
  ): Promise<{
    success: boolean;
    aggregator?: Aggregator;
    response?: AggregatorDealResponse;
    triedAggregators: string[];
    platformProfit?: number;
  }> {
    const triedAggregators: string[] = [];
    const maxAttempts = 10; // Максимум попыток (чтобы избежать бесконечного цикла)
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Получаем следующего агрегатора из очереди
      const aggregator = await this.getNextAggregator();
      
      if (!aggregator) {
        console.log('[AggregatorQueue] No available aggregators');
        break;
      }

      // Проверяем, что не пробовали этого агрегатора
      if (triedAggregators.includes(aggregator.id)) {
        console.log('[AggregatorQueue] All aggregators tried');
        break;
      }

      triedAggregators.push(aggregator.id);

      // Рассчитываем стоимость сделки
      const costs = await this.calculateDealCosts(aggregator, request, merchantFeePercent);
      
      // Проверяем достаточность баланса
      if (aggregator.balanceUsdt < costs.aggregatorCostUsdt) {
        console.log(`[AggregatorQueue] Aggregator ${aggregator.name} has insufficient balance for deal (${aggregator.balanceUsdt} < ${costs.aggregatorCostUsdt})`);
        continue;
      }

      // Отправляем запрос агрегатору
      const response = await this.sendDealToAggregator(aggregator, request);
      
      if (response.accepted) {
        // Списываем баланс и обновляем метрики
        await db.aggregator.update({
          where: { id: aggregator.id },
          data: {
            balanceUsdt: { decrement: costs.aggregatorCostUsdt },
            totalPlatformProfit: { increment: costs.platformProfit }
          }
        });

        console.log(`[AggregatorQueue] Deal accepted by ${aggregator.name}:`, {
          amount: request.amount,
          rate: costs.rate,
          aggregatorCost: costs.aggregatorCostUsdt,
          platformProfit: costs.platformProfit
        });

        return {
          success: true,
          aggregator,
          response,
          triedAggregators,
          platformProfit: costs.platformProfit
        };
      }

      console.log(`[AggregatorQueue] Aggregator ${aggregator.name} declined, trying next...`);
    }

    return {
      success: false,
      triedAggregators
    };
  }

  /**
   * Логирование интеграции
   */
  private async logIntegration(params: {
    aggregatorId: string;
    direction: IntegrationDirection;
    eventType: string;
    method: string;
    url: string;
    headers?: any;
    requestBody?: any;
    responseBody?: any;
    statusCode?: number;
    responseTimeMs?: number;
    ourDealId?: string;
    partnerDealId?: string;
    error?: string;
    slaViolation?: boolean;
  }) {
    try {
      await db.aggregatorIntegrationLog.create({
        data: {
          aggregatorId: params.aggregatorId,
          direction: params.direction,
          eventType: params.eventType,
          method: params.method,
          url: params.url,
          headers: params.headers || {}, // Переданные заголовки
          requestBody: params.requestBody || null,
          responseBody: params.responseBody || null,
          statusCode: params.statusCode || null,
          responseTimeMs: params.responseTimeMs || null,
          slaViolation: params.slaViolation || false,
          ourDealId: params.ourDealId || null,
          partnerDealId: params.partnerDealId || null,
          error: params.error || null,
        }
      });
    } catch (e) {
      console.error('[AggregatorQueue] Error logging integration:', e);
    }
  }

  /**
   * Сброс дневных объёмов (вызывается по расписанию)
   */
  async resetDailyVolumes() {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    await db.aggregator.updateMany({
      where: {
        lastVolumeReset: { lt: yesterday }
      },
      data: {
        currentDailyVolume: 0,
        lastVolumeReset: now
      }
    });
    
    console.log('[AggregatorQueue] Daily volumes reset');
  }
}

export const aggregatorQueueService = AggregatorQueueService.getInstance();