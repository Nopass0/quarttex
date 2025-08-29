/**
 * Клиент для работы с внешними аукционными системами
 * Реализует отправку HTTP POST запросов с RSA подписью
 */

import axios, { AxiosResponse, AxiosError } from "axios";
import {
  AuctionApiClient,
  AuctionMerchantConfig,
  CreateOrderRequest,
  CreateOrderResponse,
  CancelOrderRequest,
  CancelOrderResponse,
  GetStatusOrderRequest,
  GetStatusOrderResponse,
  CreateDisputeRequest,
  CreateDisputeResponse,
  AuctionErrorCode,
} from "../types/auction";
import {
  auctionSignatureUtils,
  AuctionSignatureHelpers,
  AUCTION_CONSTANTS,
} from "../utils/auction-signature";

/**
 * Реализация клиента для аукционного API
 */
export class AuctionApiClientImpl implements AuctionApiClient {
  private readonly timeout: number;

  constructor(timeout: number = AUCTION_CONSTANTS.MAX_RESPONSE_TIMEOUT) {
    this.timeout = timeout;
  }

  /**
   * Отправляет запрос на создание заказа
   */
  async createOrder(
    config: AuctionMerchantConfig,
    request: CreateOrderRequest
  ): Promise<CreateOrderResponse> {
    const startTime = Date.now();
    
    try {
      this.validateConfig(config);
      
      const timestamp = Math.floor(Date.now() / 1000);
      const canonicalString = AuctionSignatureHelpers.createOrderCanonical(
        timestamp,
        config.externalSystemName!,
        request.system_order_id
      );

      const headers = auctionSignatureUtils.createSignedHeaders(
        canonicalString,
        config.rsaPrivateKeyPem!,
        timestamp
      );

      const url = `${config.auctionBaseUrl}/CreateOrder`;
      
      console.log(`[AuctionAPI] Отправка CreateOrder к ${url}`, {
        systemOrderId: request.system_order_id,
        amount: request.amount,
        paymentMethod: request.allowed_payment_method,
        stopAuctionTime: new Date(request.stop_auction_time_unix * 1000).toISOString(),
      });

      const response: AxiosResponse<CreateOrderResponse> = await axios.post(
        url,
        request,
        {
          headers,
          timeout: this.timeout,
          validateStatus: () => true, // Не бросать ошибку на HTTP статусы
        }
      );

      const responseTime = Date.now() - startTime;
      
      console.log(`[AuctionAPI] Ответ CreateOrder за ${responseTime}ms`, {
        status: response.status,
        success: response.data?.is_success,
        externalOrderId: response.data?.external_order_id,
      });

      // Проверяем, что ответ пришел до stop_auction_time_unix
      const receivedAt = Math.floor(Date.now() / 1000);
      if (receivedAt > request.stop_auction_time_unix) {
        console.warn(`[AuctionAPI] Ответ получен после stop_auction_time_unix`, {
          receivedAt,
          stopAuctionTime: request.stop_auction_time_unix,
          delay: receivedAt - request.stop_auction_time_unix,
        });
        
        // Если ответ пришел поздно, но в пределах 5 секунд - отправим CancelOrder
        if (responseTime <= this.timeout) {
          this.scheduleCancelOrder(config, request.system_order_id, response.data?.external_order_id, "too_long_response");
        }
      }

      return this.processResponse(response, responseTime, receivedAt);
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`[AuctionAPI] Ошибка CreateOrder за ${responseTime}ms:`, error);
      
      return this.createErrorResponse(error, responseTime);
    }
  }

  /**
   * Отправляет запрос на отмену заказа
   */
  async cancelOrder(
    config: AuctionMerchantConfig,
    request: CancelOrderRequest
  ): Promise<CancelOrderResponse> {
    const startTime = Date.now();
    
    try {
      this.validateConfig(config);
      
      const timestamp = Math.floor(Date.now() / 1000);
      const canonicalString = AuctionSignatureHelpers.cancelOrderCanonical(
        timestamp,
        config.externalSystemName!,
        request.system_order_id
      );

      const headers = auctionSignatureUtils.createSignedHeaders(
        canonicalString,
        config.rsaPrivateKeyPem!,
        timestamp
      );

      const url = `${config.auctionBaseUrl}/CancelOrder`;
      
      console.log(`[AuctionAPI] Отправка CancelOrder к ${url}`, {
        systemOrderId: request.system_order_id,
        externalId: request.external_id,
        reason: request.reason,
      });

      const response: AxiosResponse<CancelOrderResponse> = await axios.post(
        url,
        request,
        {
          headers,
          timeout: this.timeout,
          validateStatus: () => true,
        }
      );

      const responseTime = Date.now() - startTime;
      const receivedAt = Math.floor(Date.now() / 1000);
      
      console.log(`[AuctionAPI] Ответ CancelOrder за ${responseTime}ms`, {
        status: response.status,
        success: response.data?.is_success,
      });

      return this.processResponse(response, responseTime, receivedAt);
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`[AuctionAPI] Ошибка CancelOrder за ${responseTime}ms:`, error);
      
      return this.createErrorResponse(error, responseTime);
    }
  }

  /**
   * Получает статус заказа
   */
  async getOrderStatus(
    config: AuctionMerchantConfig,
    request: GetStatusOrderRequest
  ): Promise<GetStatusOrderResponse> {
    const startTime = Date.now();
    
    try {
      this.validateConfig(config);
      
      const timestamp = Math.floor(Date.now() / 1000);
      const canonicalString = AuctionSignatureHelpers.getOrderStatusCanonical(
        timestamp,
        config.externalSystemName!,
        request.system_order_id
      );

      const headers = auctionSignatureUtils.createSignedHeaders(
        canonicalString,
        config.rsaPrivateKeyPem!,
        timestamp
      );

      const url = `${config.auctionBaseUrl}/GetStatusOrder`;
      
      console.log(`[AuctionAPI] Отправка GetStatusOrder к ${url}`, {
        systemOrderId: request.system_order_id,
        externalId: request.external_id,
      });

      const response: AxiosResponse<GetStatusOrderResponse> = await axios.post(
        url,
        request,
        {
          headers,
          timeout: this.timeout,
          validateStatus: () => true,
        }
      );

      const responseTime = Date.now() - startTime;
      const receivedAt = Math.floor(Date.now() / 1000);
      
      console.log(`[AuctionAPI] Ответ GetStatusOrder за ${responseTime}ms`, {
        status: response.status,
        success: response.data?.is_success,
        orderStatus: response.data?.status,
      });

      return this.processResponse(response, responseTime, receivedAt);
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`[AuctionAPI] Ошибка GetStatusOrder за ${responseTime}ms:`, error);
      
      return this.createErrorResponse(error, responseTime);
    }
  }

  /**
   * Создает спор по заказу
   */
  async createDispute(
    config: AuctionMerchantConfig,
    request: CreateDisputeRequest
  ): Promise<CreateDisputeResponse> {
    const startTime = Date.now();
    
    try {
      this.validateConfig(config);
      
      const timestamp = Math.floor(Date.now() / 1000);
      const canonicalString = AuctionSignatureHelpers.createDisputeCanonical(
        timestamp,
        config.externalSystemName!,
        request.system_order_id
      );

      const headers = auctionSignatureUtils.createSignedHeaders(
        canonicalString,
        config.rsaPrivateKeyPem!,
        timestamp
      );

      const url = `${config.auctionBaseUrl}/CreateDispute`;
      
      console.log(`[AuctionAPI] Отправка CreateDispute к ${url}`, {
        systemOrderId: request.system_order_id,
        externalOrderId: request.external_order_id,
        type: request.type,
        comment: request.comment?.substring(0, 100) + "...",
      });

      const response: AxiosResponse<CreateDisputeResponse> = await axios.post(
        url,
        request,
        {
          headers,
          timeout: this.timeout,
          validateStatus: () => true,
        }
      );

      const responseTime = Date.now() - startTime;
      const receivedAt = Math.floor(Date.now() / 1000);
      
      console.log(`[AuctionAPI] Ответ CreateDispute за ${responseTime}ms`, {
        status: response.status,
        success: response.data?.is_success,
      });

      return this.processResponse(response, responseTime, receivedAt);
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`[AuctionAPI] Ошибка CreateDispute за ${responseTime}ms:`, error);
      
      return this.createErrorResponse(error, responseTime);
    }
  }

  /**
   * Валидирует конфигурацию мерчанта
   */
  private validateConfig(config: AuctionMerchantConfig): void {
    if (!config.isAuctionEnabled) {
      throw new Error("Аукционная система не включена для мерчанта");
    }
    
    if (!config.auctionBaseUrl) {
      throw new Error("Не указан базовый URL для аукционного API");
    }
    
    if (!config.rsaPrivateKeyPem) {
      throw new Error("Не указан приватный RSA ключ");
    }
    
    if (!config.externalSystemName) {
      throw new Error("Не указано имя внешней системы");
    }
  }

  /**
   * Обрабатывает HTTP ответ от внешней системы
   */
  private processResponse<T extends { is_success: boolean }>(
    response: AxiosResponse<T>,
    responseTime: number,
    receivedAt: number
  ): T {
    // Если HTTP статус не 2xx, создаем ошибочный ответ
    if (response.status < 200 || response.status >= 300) {
      return {
        is_success: false,
        error_code: "other" as AuctionErrorCode,
        error_message: `HTTP ${response.status}: ${response.statusText}`,
      } as T;
    }

    // Если нет данных в ответе
    if (!response.data) {
      return {
        is_success: false,
        error_code: "other" as AuctionErrorCode,
        error_message: "Пустой ответ от внешней системы",
      } as T;
    }

    return response.data;
  }

  /**
   * Создает ответ об ошибке
   */
  private createErrorResponse<T extends { is_success: boolean }>(
    error: unknown,
    responseTime: number
  ): T {
    let errorCode: AuctionErrorCode = "other";
    let errorMessage = "Неизвестная ошибка";

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      if (axiosError.code === "ECONNABORTED" || axiosError.code === "ETIMEDOUT") {
        errorCode = "other";
        errorMessage = `Таймаут запроса (${responseTime}ms)`;
      } else if (axiosError.code === "ECONNREFUSED") {
        errorCode = "other";
        errorMessage = "Соединение отклонено";
      } else if (axiosError.code === "ENOTFOUND") {
        errorCode = "other";
        errorMessage = "Хост не найден";
      } else {
        errorCode = "other";
        errorMessage = axiosError.message;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      is_success: false,
      error_code: errorCode,
      error_message: errorMessage,
    } as T;
  }

  /**
   * Планирует отправку CancelOrder (асинхронно)
   */
  private scheduleCancelOrder(
    config: AuctionMerchantConfig,
    systemOrderId: string,
    externalOrderId?: string,
    reason: string = "too_long_response"
  ): void {
    if (!externalOrderId) {
      console.warn(`[AuctionAPI] Не удалось отправить CancelOrder - нет external_order_id`);
      return;
    }

    // Отправляем CancelOrder асинхронно, не блокируя основной поток
    setImmediate(async () => {
      try {
        await this.cancelOrder(config, {
          system_order_id: systemOrderId,
          external_id: externalOrderId,
          reason: reason as any,
          reason_message: "Ответ получен после истечения времени аукциона",
        });
      } catch (error) {
        console.error(`[AuctionAPI] Ошибка отправки CancelOrder:`, error);
      }
    });
  }
}

/**
 * Синглтон экземпляр клиента
 */
export const auctionApiClient = new AuctionApiClientImpl();

/**
 * Фабрика для создания клиентов с кастомными настройками
 */
export class AuctionApiClientFactory {
  /**
   * Создает клиент с кастомным таймаутом
   */
  static createWithTimeout(timeout: number): AuctionApiClient {
    return new AuctionApiClientImpl(timeout);
  }

  /**
   * Создает клиент для тестирования
   */
  static createForTesting(): AuctionApiClient {
    return new AuctionApiClientImpl(1000); // 1 секунда для тестов
  }
}
