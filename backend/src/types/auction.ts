/**
 * Типы и интерфейсы для аукционной системы внешних мерчантов
 * Реализация HTTP POST JSON API с RSA-подписью (SHA256, ключ 2048)
 */

// ============================================================================
// Базовые типы
// ============================================================================

export type PaymentMethod = "card_number" | "phone_number" | "account_number" | "iban" | "sbp";

export type AuctionOrderStatus = 
  | 1  // создана
  | 2  // назначен трейдер
  | 3  // реквизиты назначены
  | 4  // мерч подтвердил оплату
  | 5  // трейдер подтвердил оплату
  | 6  // завершена
  | 7  // спор
  | 8  // отменена по таймауту
  | 9  // отменена мерчантом
  | 10 // отменена трейдером
  | 11 // отменена админом
  | 12 // отменена супервайзером
  | 13; // отменена по результату спора

export type CancelReason =
  | "too_long_response"
  | "not_valid_response"
  | "system_selected_another_performer"
  | "auction_timeout_after_finish"
  | "server_error"
  | "other";

export type DisputeType = "message" | "change_amount" | "dispute";

export type AuctionErrorCode =
  | "signature_missing"
  | "signature_invalid"
  | "timestamp_invalid"
  | "timestamp_expired"
  | "validation_error"
  | "request_parameters_is_invalid"
  | "order_not_found"
  | "no_available_traders"
  | "unable_process_required_payment_system"
  | "unable_process_required_payment_method"
  | "all_payments_details_busy"
  | "too_low_commission"
  | "too_high_exchange_rate"
  | "exists_same_amount_order"
  | "other";

// ============================================================================
// Детали платежа по типам
// ============================================================================

export type PaymentDetails =
  | {
      type: "card_number";
      name: string;
      bank_name: string;
      card: string;
      transfer_info?: string;
    }
  | {
      type: "phone_number";
      name: string;
      bank_name: string;
      phone_number: string;
      transfer_info?: string;
    }
  | {
      type: "account_number";
      account_number: string;
      name: string;
      bank_name: string;
      transfer_info?: string;
    }
  | {
      type: "iban";
      iban: string;
      name: string;
      bank_name: string;
      transfer_info?: string;
    }
  | {
      type: "sbp";
      phone_number: string;
      bank_name: string;
      name: string;
      transfer_info?: string;
    };

// ============================================================================
// Базовый конверт API
// ============================================================================

export interface ApiEnvelope {
  is_success: boolean;
  error_code: AuctionErrorCode | null;
  error_message: string | null;
}

// ============================================================================
// CreateOrder - Создание заказа
// ============================================================================

export interface CreateOrderRequest {
  system_order_id: string;
  currency: string;
  max_exchange_rate: number;
  max_commission: number;
  amount: number;
  cancel_order_time_unix: number;
  stop_auction_time_unix: number;
  callback_url: string;
  allowed_payment_method: PaymentMethod;
  iterative_sum_search_enabled: boolean;
  allowed_bank_name?: string;
}

export interface CreateOrderResponse extends ApiEnvelope {
  external_system_id?: number;
  external_order_id?: string;
  amount?: number;
  exchange_rate?: number;
  commission?: number;
  payment_details?: PaymentDetails;
}

// ============================================================================
// CancelOrder - Отмена заказа
// ============================================================================

export interface CancelOrderRequest {
  system_order_id: string;
  external_id: string;
  reason: CancelReason;
  reason_message?: string;
}

export interface CancelOrderResponse extends ApiEnvelope {}

// ============================================================================
// GetStatusOrder - Получение статуса заказа
// ============================================================================

export interface GetStatusOrderRequest {
  system_order_id: string;
  external_id: string;
}

export interface GetStatusOrderResponse extends ApiEnvelope {
  status?: AuctionOrderStatus;
}

// ============================================================================
// CreateDispute - Создание спора
// ============================================================================

export interface CreateDisputeRequest {
  system_order_id: string;
  external_order_id: string;
  comment: string;
  attachment_path?: string;
  type: DisputeType;
  new_amount?: number;
}

export interface CreateDisputeResponse extends ApiEnvelope {}

// ============================================================================
// AuctionCallback - Обратный вызов от внешней системы
// ============================================================================

export interface AuctionCallbackRequest {
  order_id: string;
  status_id?: number;
  amount?: number;
}

export interface AuctionCallbackResponse extends ApiEnvelope {}

// ============================================================================
// Заголовки для подписи
// ============================================================================

export interface AuctionHeaders {
  "Content-Type": "application/json";
  "X-Timestamp": string;
  "X-Signature": string;
}

// ============================================================================
// Операции для канонических строк
// ============================================================================

export type AuctionOperation = 
  | "CreateOrder"
  | "CancelOrder" 
  | "GetOrderStatus"
  | "CreateDispute"
  | "AuctionCallback";

// ============================================================================
// Конфигурация аукционного мерчанта
// ============================================================================

export interface AuctionMerchantConfig {
  id: string;
  name: string;
  isAuctionEnabled: boolean;
  auctionBaseUrl?: string;
  rsaPublicKeyPem?: string;
  rsaPrivateKeyPem?: string;
  keysGeneratedAt?: Date;
  externalSystemName?: string;
}

// ============================================================================
// Контекст аукциона для сделки
// ============================================================================

export interface AuctionContext {
  systemOrderId: string;
  externalOrderId?: string;
  externalSystemId?: number;
  stopAuctionTimeUnix: number;
  cancelOrderTimeUnix: number;
  callbackUrl: string;
  merchantConfig: AuctionMerchantConfig;
}

// ============================================================================
// Результат аукциона
// ============================================================================

export interface AuctionResult {
  success: boolean;
  externalOrderId?: string;
  externalSystemId?: number;
  paymentDetails?: PaymentDetails;
  exchangeRate?: number;
  commission?: number;
  amount?: number;
  errorCode?: AuctionErrorCode;
  errorMessage?: string;
  responseTime: number;
  receivedAt: number;
}

// ============================================================================
// Утилиты для подписи
// ============================================================================

export interface SignatureUtils {
  /**
   * Создает каноничную строку для подписи
   */
  createCanonicalString(
    timestamp: number,
    externalSystemName: string,
    keyField: string,
    operation: AuctionOperation
  ): string;

  /**
   * Подписывает каноничную строку приватным ключом
   */
  signCanonicalString(canonicalString: string, privateKeyPem: string): string;

  /**
   * Проверяет подпись публичным ключом
   */
  verifySignature(
    canonicalString: string,
    signature: string,
    publicKeyPem: string
  ): boolean;

  /**
   * Проверяет валидность timestamp (±120 секунд)
   */
  validateTimestamp(timestamp: number): boolean;
}

// ============================================================================
// Клиент для работы с внешними системами
// ============================================================================

export interface AuctionApiClient {
  /**
   * Отправляет запрос на создание заказа
   */
  createOrder(
    config: AuctionMerchantConfig,
    request: CreateOrderRequest
  ): Promise<CreateOrderResponse>;

  /**
   * Отправляет запрос на отмену заказа
   */
  cancelOrder(
    config: AuctionMerchantConfig,
    request: CancelOrderRequest
  ): Promise<CancelOrderResponse>;

  /**
   * Получает статус заказа
   */
  getOrderStatus(
    config: AuctionMerchantConfig,
    request: GetStatusOrderRequest
  ): Promise<GetStatusOrderResponse>;

  /**
   * Создает спор по заказу
   */
  createDispute(
    config: AuctionMerchantConfig,
    request: CreateDisputeRequest
  ): Promise<CreateDisputeResponse>;
}

// ============================================================================
// Обработчик callback'ов
// ============================================================================

export interface AuctionCallbackHandler {
  /**
   * Обрабатывает входящий callback от внешней системы
   */
  handleCallback(
    merchantId: string,
    headers: Record<string, string>,
    body: AuctionCallbackRequest
  ): Promise<AuctionCallbackResponse>;

  /**
   * Валидирует подпись callback'а
   */
  validateCallbackSignature(
    merchantConfig: AuctionMerchantConfig,
    headers: Record<string, string>,
    body: AuctionCallbackRequest
  ): boolean;
}

// ============================================================================
// Генератор RSA ключей
// ============================================================================

export interface RSAKeyPair {
  publicKeyPem: string;
  privateKeyPem: string;
}

export interface RSAKeyGenerator {
  /**
   * Генерирует пару RSA ключей 2048 бит
   */
  generateKeyPair(): Promise<RSAKeyPair>;

  /**
   * Проверяет валидность ключей
   */
  validateKeyPair(publicKeyPem: string, privateKeyPem: string): boolean;
}
