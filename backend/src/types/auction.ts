/**
 * Типы для аукционной системы согласно документации IE Cloud Summit
 */

// Методы оплаты
export type PaymentMethod = "card_number" | "phone_number" | "account_number" | "iban" | "sbp";

// Типы реквизитов оплаты
export type PaymentDetails =
  | { type: "card_number"; name: string; bank_name: string; card: string; transfer_info?: string }
  | { type: "phone_number"; name: string; bank_name: string; phone_number: string; transfer_info?: string }
  | { type: "account_number"; account_number: string; name: string; bank_name: string; transfer_info?: string }
  | { type: "iban"; iban: string; name: string; bank_name: string; transfer_info?: string }
  | { type: "sbp"; phone_number: string; bank_name: string; name: string; transfer_info?: string };

// Причины отмены
export type CancelReason = 
  | "too_long_response"
  | "not_valid_response" 
  | "system_selected_another_performer"
  | "auction_timeout_after_finish"
  | "server_error"
  | "other";

// Типы диспутов
export type DisputeType = "message" | "change_amount" | "dispute";

// Статусы заказов (1-13)
export type AuctionOrderStatus = 1|2|3|4|5|6|7|8|9|10|11|12|13;

// Коды ошибок
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

// Базовый конверт ответа
export interface ApiEnvelope {
  is_success: boolean;
  error_code: AuctionErrorCode | null;
  error_message: string | null;
}

// Запросы к внешней системе
export interface CreateOrderRequest {
  system_order_id: string;              // GUID, наш ID заявки
  currency: string;                     // пример: "RUB"
  max_exchange_rate: number;            // макс курс к USDT
  max_commission: number;               // макс комиссия (%)
  amount: number;                       // сумма заявки
  cancel_order_time_unix: number;       // Unix(sec)
  stop_auction_time_unix: number;       // Unix(sec) - окончание аукциона
  callback_url: string;                 // куда им слать callback нам
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

export interface CancelOrderRequest {
  system_order_id: string;       // наш GUID
  external_id: string;           // их внутренний ID
  reason: CancelReason;
  reason_message?: string;
}

export interface CancelOrderResponse extends ApiEnvelope {}

export interface GetStatusOrderRequest {
  system_order_id: string;   // наш GUID
  external_id: string;       // их внутренний ID
}

export interface GetStatusOrderResponse extends ApiEnvelope {
  status?: AuctionOrderStatus;
}

export interface CreateDisputeRequest {
  system_order_id: string;        // наш GUID
  external_order_id: string;      // их ID
  comment: string;
  attachment_path?: string;        // URL изображения/скриншота
  type: DisputeType;
  new_amount?: number;             // только если type = "change_amount"
}

export interface CreateDisputeResponse extends ApiEnvelope {}

// Callback от внешней системы к нам
export interface AuctionCallbackRequest {
  order_id: string;       // совпадает с system_order_id или external_id
  status_id?: number;     // 1..100 при изменении статуса
  amount?: number;        // новая сумма (если корректировалась)
}

// Конфигурация аукционного мерчанта
export interface AuctionMerchantConfig {
  isAuctionEnabled: boolean;
  auctionBaseUrl?: string;
  auctionCallbackUrl?: string;
  rsaPublicKeyPem?: string;
  rsaPrivateKeyPem?: string;
  externalSystemName?: string;
  keysGeneratedAt?: Date;
}

// Результат валидации подписи
export interface SignatureValidationResult {
  valid: boolean;
  error?: AuctionErrorCode;
  message?: string;
}