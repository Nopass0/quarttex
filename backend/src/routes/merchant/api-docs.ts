import { Elysia, t } from "elysia";
import { merchantSessionGuard } from "@/middleware/merchantSessionGuard";
import ErrorSchema from "@/types/error";

/**
 * Маршруты для интерактивной документации API мерчанта
 * Все эндпоинты защищены проверкой сессии мерчанта
 */
export default (app: Elysia) =>
  app
    .use(merchantSessionGuard())
    
    /* ──────── GET /merchant/api-docs/endpoints ──────── */
    .get(
      "/endpoints",
      async ({ merchant }) => {
        return {
          baseUrl: process.env.API_URL || "https://api.example.com",
          authentication: {
            type: "header",
            name: "x-merchant-api-key",
            description: "API ключ мерчанта для аутентификации запросов",
            example: merchant.token,
          },
          endpoints: [
            {
              id: "connect",
              method: "GET",
              path: "/merchant/connect",
              description: "Получение информации о мерчанте",
              category: "Общие",
              parameters: [],
              response: {
                example: {
                  id: "123",
                  name: "Название мерчанта",
                  createdAt: "2024-01-01T00:00:00.000Z",
                  totalTx: 100,
                  paidTx: 80,
                },
              },
            },
            {
              id: "balance",
              method: "GET",
              path: "/merchant/balance",
              description: "Получение текущего баланса мерчанта в USDT",
              category: "Общие",
              parameters: [],
              response: {
                example: {
                  balance: 1000.50,
                },
              },
            },
            {
              id: "methods",
              method: "GET",
              path: "/merchant/methods",
              description: "Получение списка доступных методов платежа",
              category: "Методы",
              parameters: [],
              response: {
                example: [
                  {
                    id: "method1",
                    code: "sbp",
                    name: "СБП",
                    type: "sbp",
                    currency: "usdt",
                    commissionPayin: 1.5,
                    commissionPayout: 2.0,
                    maxPayin: 100000,
                    minPayin: 100,
                    maxPayout: 50000,
                    minPayout: 500,
                    isEnabled: true,
                  },
                ],
              },
            },
            {
              id: "create-transaction",
              method: "POST",
              path: "/merchant/transactions/create",
              description: "Создание новой транзакции (платежа)",
              category: "Транзакции",
              parameters: [
                {
                  name: "amount",
                  type: "number",
                  required: true,
                  description: "Сумма транзакции в рублях",
                  example: 5000,
                },
                {
                  name: "orderId",
                  type: "string",
                  required: true,
                  description: "Уникальный ID заказа от мерчанта",
                  example: "ORDER-12345",
                },
                {
                  name: "methodId",
                  type: "string",
                  required: true,
                  description: "ID метода платежа",
                  example: "method1",
                },
                {
                  name: "rate",
                  type: "number",
                  required: true,
                  description: "Курс USDT/RUB",
                  example: 95.5,
                },
                {
                  name: "expired_at",
                  type: "string",
                  required: true,
                  description: "ISO дата истечения транзакции",
                  example: "2024-01-01T12:00:00.000Z",
                },
                {
                  name: "userIp",
                  type: "string",
                  required: false,
                  description: "IP адрес пользователя",
                  example: "192.168.1.1",
                },
                {
                  name: "userId",
                  type: "string",
                  required: false,
                  description: "ID пользователя (по умолчанию генерируется)",
                  example: "user123",
                },
                {
                  name: "type",
                  type: "string",
                  required: false,
                  description: "Тип транзакции: IN (ввод) или OUT (вывод). По умолчанию IN",
                  example: "IN",
                },
              ],
              response: {
                example: {
                  id: "tx123",
                  numericId: 1001,
                  amount: 5000,
                  crypto: 52.36,
                  status: "IN_PROGRESS",
                  traderId: "trader123",
                  requisites: {
                    id: "req123",
                    bankType: "SBERBANK",
                    cardNumber: "2202 **** **** 1234",
                    recipientName: "Иван И.",
                    traderName: "Trader Name",
                  },
                  createdAt: "2024-01-01T10:00:00.000Z",
                  updatedAt: "2024-01-01T10:00:00.000Z",
                  expired_at: "2024-01-01T12:00:00.000Z",
                  method: {
                    id: "method1",
                    code: "sbp",
                    name: "СБП",
                    type: "sbp",
                    currency: "usdt",
                  },
                },
              },
            },
            {
              id: "transaction-status",
              method: "GET",
              path: "/merchant/transactions/status/:id",
              description: "Получение статуса транзакции по ID",
              category: "Транзакции",
              parameters: [
                {
                  name: "id",
                  type: "string",
                  required: true,
                  description: "ID транзакции",
                  example: "tx123",
                  in: "path",
                },
              ],
              response: {
                example: {
                  id: "tx123",
                  orderId: "ORDER-12345",
                  amount: 5000,
                  status: "READY",
                  type: "IN",
                  createdAt: "2024-01-01T10:00:00.000Z",
                  updatedAt: "2024-01-01T10:05:00.000Z",
                  method: {
                    id: "method1",
                    code: "sbp",
                    name: "СБП",
                    type: "sbp",
                    currency: "usdt",
                  },
                },
              },
            },
            {
              id: "transaction-by-order",
              method: "GET",
              path: "/merchant/transactions/by-order-id/:orderId",
              description: "Получение транзакции по orderId",
              category: "Транзакции",
              parameters: [
                {
                  name: "orderId",
                  type: "string",
                  required: true,
                  description: "Order ID транзакции",
                  example: "ORDER-12345",
                  in: "path",
                },
              ],
              response: {
                example: {
                  id: "tx123",
                  orderId: "ORDER-12345",
                  amount: 5000,
                  status: "READY",
                  type: "IN",
                  createdAt: "2024-01-01T10:00:00.000Z",
                  updatedAt: "2024-01-01T10:05:00.000Z",
                  isMock: false,
                  method: {
                    id: "method1",
                    code: "sbp",
                    name: "СБП",
                    type: "sbp",
                    currency: "usdt",
                  },
                  requisites: {
                    id: "req123",
                    bankType: "SBERBANK",
                    cardNumber: "2202 **** **** 1234",
                    recipientName: "Иван И.",
                    traderId: "trader123",
                    traderName: "Trader Name",
                  },
                },
              },
            },
            {
              id: "cancel-transaction",
              method: "PATCH",
              path: "/merchant/transactions/by-order-id/:orderId/cancel",
              description: "Отмена транзакции по orderId",
              category: "Транзакции",
              parameters: [
                {
                  name: "orderId",
                  type: "string",
                  required: true,
                  description: "Order ID транзакции",
                  example: "ORDER-12345",
                  in: "path",
                },
              ],
              response: {
                example: {
                  success: true,
                  transaction: {
                    id: "tx123",
                    status: "CANCELED",
                    // ... остальные поля транзакции
                  },
                },
              },
            },
            {
              id: "list-transactions",
              method: "GET",
              path: "/merchant/transactions/list",
              description: "Получение списка транзакций с фильтрацией",
              category: "Транзакции",
              parameters: [
                {
                  name: "page",
                  type: "number",
                  required: false,
                  description: "Номер страницы (по умолчанию 1)",
                  example: 1,
                  in: "query",
                },
                {
                  name: "limit",
                  type: "number",
                  required: false,
                  description: "Количество записей на странице (по умолчанию 10)",
                  example: 10,
                  in: "query",
                },
                {
                  name: "status",
                  type: "string",
                  required: false,
                  description: "Фильтр по статусу: CREATED, IN_PROGRESS, DISPUTE, EXPIRED, READY, MILK, CANCELED",
                  example: "READY",
                  in: "query",
                },
                {
                  name: "type",
                  type: "string",
                  required: false,
                  description: "Фильтр по типу: IN, OUT",
                  example: "IN",
                  in: "query",
                },
                {
                  name: "methodId",
                  type: "string",
                  required: false,
                  description: "Фильтр по ID метода",
                  example: "method1",
                  in: "query",
                },
                {
                  name: "orderId",
                  type: "string",
                  required: false,
                  description: "Фильтр по orderId",
                  example: "ORDER",
                  in: "query",
                },
              ],
              response: {
                example: {
                  data: [
                    {
                      id: "tx123",
                      orderId: "ORDER-12345",
                      amount: 5000,
                      status: "READY",
                      type: "IN",
                      createdAt: "2024-01-01T10:00:00.000Z",
                      updatedAt: "2024-01-01T10:05:00.000Z",
                      isMock: false,
                      method: {
                        id: "method1",
                        code: "sbp",
                        name: "СБП",
                        type: "sbp",
                        currency: "usdt",
                      },
                    },
                  ],
                  pagination: {
                    total: 100,
                    page: 1,
                    limit: 10,
                    pages: 10,
                  },
                },
              },
            },
            {
              id: "upload-receipt",
              method: "POST",
              path: "/merchant/transactions/:id/receipt",
              description: "Загрузка чека для транзакции",
              category: "Чеки",
              parameters: [
                {
                  name: "id",
                  type: "string",
                  required: true,
                  description: "ID транзакции",
                  example: "tx123",
                  in: "path",
                },
                {
                  name: "fileData",
                  type: "string",
                  required: true,
                  description: "Файл в формате base64",
                  example: "data:image/png;base64,iVBORw0KGgoAAAANS...",
                },
                {
                  name: "fileName",
                  type: "string",
                  required: true,
                  description: "Имя файла",
                  example: "receipt.png",
                },
                {
                  name: "updateStatus",
                  type: "string",
                  required: false,
                  description: "Обновить статус транзакции",
                  example: "READY",
                },
              ],
              response: {
                example: {
                  id: "receipt123",
                  fileName: "receipt.png",
                  isChecked: false,
                  isFake: false,
                  isAuto: false,
                  createdAt: "2024-01-01T10:00:00.000Z",
                },
              },
            },
            {
              id: "get-receipts",
              method: "GET",
              path: "/merchant/transactions/:id/receipts",
              description: "Получение всех чеков для транзакции",
              category: "Чеки",
              parameters: [
                {
                  name: "id",
                  type: "string",
                  required: true,
                  description: "ID транзакции",
                  example: "tx123",
                  in: "path",
                },
              ],
              response: {
                example: [
                  {
                    id: "receipt123",
                    fileName: "receipt.png",
                    isChecked: true,
                    isFake: false,
                    isAuto: false,
                    createdAt: "2024-01-01T10:00:00.000Z",
                    updatedAt: "2024-01-01T10:05:00.000Z",
                  },
                ],
              },
            },
            {
              id: "get-enums",
              method: "GET",
              path: "/merchant/enums",
              description: "Получение всех enum значений",
              category: "Справочники",
              parameters: [],
              response: {
                example: {
                  status: ["CREATED", "IN_PROGRESS", "DISPUTE", "EXPIRED", "READY", "MILK", "CANCELED"],
                  transactionType: ["IN", "OUT"],
                  methodType: ["upi", "c2ckz", "c2cuz", "c2caz", "c2c", "sbp", "spay", "tpay", "vpay", "apay", "m2ctj", "m2ntj", "m2csber", "m2ctbank", "connectc2c", "connectsbp", "nspk", "ecom", "crypto"],
                  currency: ["rub", "usdt"],
                },
              },
            },
            // Payout endpoints (v1.6)
            {
              id: "create-payout",
              method: "POST",
              path: "/merchant/payouts",
              description: "Создание новой выплаты (OUT транзакции)",
              category: "Выплаты",
              parameters: [
                {
                  name: "amount",
                  type: "number",
                  required: true,
                  description: "Сумма выплаты в рублях",
                  example: 10000,
                },
                {
                  name: "wallet",
                  type: "string",
                  required: true,
                  description: "Кошелек получателя (USDT TRC-20)",
                  example: "TRx1234567890abcdef",
                },
                {
                  name: "bank",
                  type: "string",
                  required: true,
                  description: "Банк или платежная система",
                  example: "SBERBANK",
                },
                {
                  name: "isCard",
                  type: "boolean",
                  required: true,
                  description: "Является ли выплата на карту",
                  example: true,
                },
                {
                  name: "merchantRate",
                  type: "number",
                  required: false,
                  description: "Курс мерчанта USDT/RUB (если не указан, используется значение по умолчанию 100)",
                  example: 95.5,
                },
                {
                  name: "externalReference",
                  type: "string",
                  required: false,
                  description: "Внешний идентификатор для отслеживания",
                  example: "PAYOUT-12345",
                },
                {
                  name: "processingTime",
                  type: "number",
                  required: false,
                  description: "Время обработки в минутах (5-60, по умолчанию 15)",
                  example: 15,
                },
                {
                  name: "webhookUrl",
                  type: "string",
                  required: false,
                  description: "URL для webhook уведомлений",
                  example: "https://your-domain.com/webhook/payouts",
                },
                {
                  name: "metadata",
                  type: "object",
                  required: false,
                  description: "Дополнительные данные",
                  example: { userId: "user123", orderId: "order456" },
                },
              ],
              response: {
                example: {
                  success: true,
                  payout: {
                    id: "payout123",
                    numericId: 2001,
                    amount: 10000,
                    amountUsdt: 104.71,
                    total: 10000,
                    totalUsdt: 104.71,
                    rate: 95.5,
                    wallet: "TRx1234567890abcdef",
                    bank: "SBERBANK",
                    isCard: true,
                    status: "CREATED",
                    expireAt: "2024-01-01T12:00:00.000Z",
                    createdAt: "2024-01-01T10:00:00.000Z",
                  },
                },
              },
            },
            {
              id: "get-payout",
              method: "GET",
              path: "/merchant/payouts/:id",
              description: "Получение информации о выплате",
              category: "Выплаты",
              parameters: [
                {
                  name: "id",
                  type: "string",
                  required: true,
                  description: "ID выплаты",
                  example: "payout123",
                  in: "path",
                },
              ],
              response: {
                example: {
                  success: true,
                  payout: {
                    id: "payout123",
                    numericId: 2001,
                    amount: 10000,
                    amountUsdt: 104.71,
                    total: 10000,
                    totalUsdt: 104.71,
                    rate: 95.5,
                    wallet: "TRx1234567890abcdef",
                    bank: "SBERBANK",
                    isCard: true,
                    status: "ACTIVE",
                    expireAt: "2024-01-01T12:00:00.000Z",
                    createdAt: "2024-01-01T10:00:00.000Z",
                    acceptedAt: "2024-01-01T10:05:00.000Z",
                    confirmedAt: null,
                    cancelledAt: null,
                    proofFiles: [],
                    disputeFiles: [],
                    disputeMessage: null,
                    cancelReason: null,
                  },
                },
              },
            },
            {
              id: "list-payouts",
              method: "GET",
              path: "/merchant/payouts",
              description: "Получение списка выплат с фильтрацией",
              category: "Выплаты",
              parameters: [
                {
                  name: "status",
                  type: "string",
                  required: false,
                  description: "Фильтр по статусу (можно несколько через запятую)",
                  example: "CREATED,ACTIVE",
                  in: "query",
                },
                {
                  name: "direction",
                  type: "string",
                  required: false,
                  description: "Направление: IN или OUT",
                  example: "OUT",
                  in: "query",
                },
                {
                  name: "dateFrom",
                  type: "string",
                  required: false,
                  description: "Дата начала периода (ISO 8601)",
                  example: "2024-01-01T00:00:00.000Z",
                  in: "query",
                },
                {
                  name: "dateTo",
                  type: "string",
                  required: false,
                  description: "Дата конца периода (ISO 8601)",
                  example: "2024-01-31T23:59:59.999Z",
                  in: "query",
                },
                {
                  name: "page",
                  type: "number",
                  required: false,
                  description: "Номер страницы (по умолчанию 1)",
                  example: 1,
                  in: "query",
                },
                {
                  name: "limit",
                  type: "number",
                  required: false,
                  description: "Количество записей на странице (1-100, по умолчанию 20)",
                  example: 20,
                  in: "query",
                },
              ],
              response: {
                example: {
                  success: true,
                  data: [
                    {
                      id: "payout123",
                      numericId: 2001,
                      status: "COMPLETED",
                      direction: "OUT",
                      amount: 10000,
                      rate: 95.5,
                      total: 10000,
                      wallet: "TRx1234567890abcdef",
                      bank: "SBERBANK",
                      isCard: true,
                      externalReference: "PAYOUT-12345",
                      createdAt: "2024-01-01T10:00:00.000Z",
                      acceptedAt: "2024-01-01T10:05:00.000Z",
                      confirmedAt: "2024-01-01T10:10:00.000Z",
                      cancelledAt: null,
                      trader: {
                        numericId: 1001,
                        email: "trader@example.com",
                      },
                    },
                  ],
                  meta: {
                    total: 150,
                    page: 1,
                    limit: 20,
                    totalPages: 8,
                  },
                },
              },
            },
            {
              id: "approve-payout",
              method: "POST",
              path: "/merchant/payouts/:id/approve",
              description: "Подтверждение выплаты после проверки",
              category: "Выплаты",
              parameters: [
                {
                  name: "id",
                  type: "string",
                  required: true,
                  description: "ID выплаты",
                  example: "payout123",
                  in: "path",
                },
              ],
              response: {
                example: {
                  success: true,
                  payout: {
                    id: "payout123",
                    numericId: 2001,
                    status: "COMPLETED",
                  },
                },
              },
            },
            {
              id: "cancel-payout",
              method: "PATCH",
              path: "/merchant/payouts/:id/cancel",
              description: "Отмена выплаты (только для статуса CREATED)",
              category: "Выплаты",
              parameters: [
                {
                  name: "id",
                  type: "string",
                  required: true,
                  description: "ID выплаты",
                  example: "payout123",
                  in: "path",
                },
                {
                  name: "reasonCode",
                  type: "string",
                  required: true,
                  description: "Код причины отмены (минимум 3 символа)",
                  example: "INSUFFICIENT_FUNDS",
                },
              ],
              response: {
                example: {
                  success: true,
                  payout: {
                    id: "payout123",
                    numericId: 2001,
                    status: "CANCELLED",
                    cancelledAt: "2024-01-01T10:30:00.000Z",
                    cancelReasonCode: "INSUFFICIENT_FUNDS",
                  },
                },
              },
            },
            {
              id: "update-payout-rate",
              method: "PATCH",
              path: "/merchant/payouts/:id/rate",
              description: "Обновление курса или суммы выплаты (только для статуса CREATED)",
              category: "Выплаты",
              parameters: [
                {
                  name: "id",
                  type: "string",
                  required: true,
                  description: "ID выплаты",
                  example: "payout123",
                  in: "path",
                },
                {
                  name: "merchantRate",
                  type: "number",
                  required: false,
                  description: "Новый курс мерчанта",
                  example: 96.0,
                },
                {
                  name: "amount",
                  type: "number",
                  required: false,
                  description: "Новая сумма выплаты",
                  example: 15000,
                },
              ],
              response: {
                example: {
                  success: true,
                  payout: {
                    id: "payout123",
                    numericId: 2001,
                    amount: 15000,
                    merchantRate: 96.0,
                    rate: 96.0,
                    total: 15000,
                  },
                },
              },
            },
            {
              id: "create-dispute",
              method: "POST",
              path: "/merchant/payouts/:id/dispute",
              description: "Создание спора по выплате (только для статуса CHECKING)",
              category: "Выплаты",
              parameters: [
                {
                  name: "id",
                  type: "string",
                  required: true,
                  description: "ID выплаты",
                  example: "payout123",
                  in: "path",
                },
                {
                  name: "message",
                  type: "string",
                  required: true,
                  description: "Сообщение о причине спора (минимум 10 символов)",
                  example: "Неверные реквизиты получателя",
                },
                {
                  name: "files",
                  type: "array",
                  required: false,
                  description: "Массив URL файлов-доказательств",
                  example: ["https://example.com/proof1.png", "https://example.com/proof2.pdf"],
                },
              ],
              response: {
                example: {
                  success: true,
                  payout: {
                    id: "payout123",
                    numericId: 2001,
                    status: "DISPUTED",
                  },
                },
              },
            },
            {
              id: "create-deal-dispute",
              method: "POST",
              path: "/merchant/deal-disputes/deal/:dealId",
              description: "Создание спора по сделке (транзакции)",
              category: "Споры по сделкам",
              parameters: [
                {
                  name: "dealId",
                  type: "string",
                  required: true,
                  description: "ID сделки (транзакции)",
                  example: "tx123",
                  in: "path",
                },
                {
                  name: "message",
                  type: "string",
                  required: true,
                  description: "Сообщение спора",
                  example: "Не получил платеж от клиента",
                },
                {
                  name: "files",
                  type: "array",
                  required: false,
                  description: "Массив файлов (до 10 файлов, максимум 20MB каждый)",
                  example: "Файлы в формате multipart/form-data",
                },
              ],
              response: {
                example: {
                  success: true,
                  dispute: {
                    id: "dispute123",
                    dealId: "tx123",
                    merchantId: "merchant123",
                    traderId: "trader123",
                    status: "OPEN",
                    createdAt: "2024-01-01T10:00:00.000Z",
                    messages: [
                      {
                        id: "msg123",
                        message: "Не получил платеж от клиента",
                        senderType: "MERCHANT",
                        attachments: []
                      }
                    ]
                  }
                }
              }
            },
            {
              id: "get-deal-disputes",
              method: "GET",
              path: "/merchant/deal-disputes",
              description: "Получение списка споров по сделкам",
              category: "Споры по сделкам",
              parameters: [
                {
                  name: "page",
                  type: "string",
                  required: false,
                  description: "Номер страницы",
                  example: "1",
                  in: "query",
                },
                {
                  name: "limit",
                  type: "string",
                  required: false,
                  description: "Количество на странице",
                  example: "20",
                  in: "query",
                },
                {
                  name: "status",
                  type: "string",
                  required: false,
                  description: "Фильтр по статусу",
                  example: "OPEN",
                  in: "query",
                },
              ],
              response: {
                example: {
                  success: true,
                  data: [],
                  pagination: {
                    page: 1,
                    limit: 20,
                    total: 0,
                    totalPages: 0
                  }
                }
              }
            },
            {
              id: "get-deal-dispute",
              method: "GET",
              path: "/merchant/deal-disputes/:disputeId",
              description: "Получение деталей спора по сделке",
              category: "Споры по сделкам",
              parameters: [
                {
                  name: "disputeId",
                  type: "string",
                  required: true,
                  description: "ID спора",
                  example: "dispute123",
                  in: "path",
                },
              ],
              response: {
                example: {
                  success: true,
                  data: {
                    id: "dispute123",
                    dealId: "tx123",
                    status: "OPEN",
                    messages: []
                  }
                }
              }
            },
            {
              id: "send-deal-dispute-message",
              method: "POST",
              path: "/merchant/deal-disputes/:disputeId/messages",
              description: "Отправка сообщения в споре по сделке",
              category: "Споры по сделкам",
              parameters: [
                {
                  name: "disputeId",
                  type: "string",
                  required: true,
                  description: "ID спора",
                  example: "dispute123",
                  in: "path",
                },
                {
                  name: "message",
                  type: "string",
                  required: true,
                  description: "Текст сообщения",
                  example: "Вот дополнительные доказательства",
                },
                {
                  name: "files",
                  type: "array",
                  required: false,
                  description: "Массив файлов (до 10 файлов, максимум 20MB каждый)",
                  example: "Файлы в формате multipart/form-data",
                },
              ],
              response: {
                example: {
                  success: true,
                  message: {
                    id: "msg124",
                    message: "Вот дополнительные доказательства",
                    senderType: "MERCHANT",
                    attachments: []
                  }
                }
              }
            },
            {
              id: "create-payout-dispute-api",
              method: "POST",
              path: "/merchant/payout-disputes/payout/:payoutId",
              description: "Создание спора по выплате через API",
              category: "Споры по выплатам",
              parameters: [
                {
                  name: "payoutId",
                  type: "string",
                  required: true,
                  description: "ID выплаты",
                  example: "payout123",
                  in: "path",
                },
                {
                  name: "message",
                  type: "string",
                  required: true,
                  description: "Сообщение спора",
                  example: "Не получил средства на карту",
                },
                {
                  name: "files",
                  type: "array",
                  required: false,
                  description: "Массив файлов (до 10 файлов, максимум 20MB каждый)",
                  example: "Файлы в формате multipart/form-data",
                },
              ],
              response: {
                example: {
                  success: true,
                  dispute: {
                    id: "dispute456",
                    payoutId: "payout123",
                    merchantId: "merchant123",
                    traderId: "trader123",
                    status: "OPEN",
                    createdAt: "2024-01-01T10:00:00.000Z",
                    messages: []
                  }
                }
              }
            },
            {
              id: "get-payout-disputes",
              method: "GET",
              path: "/merchant/payout-disputes/payouts",
              description: "Получение списка споров по выплатам",
              category: "Споры по выплатам",
              parameters: [
                {
                  name: "page",
                  type: "string",
                  required: false,
                  description: "Номер страницы",
                  example: "1",
                  in: "query",
                },
                {
                  name: "limit",
                  type: "string",
                  required: false,
                  description: "Количество на странице",
                  example: "20",
                  in: "query",
                },
                {
                  name: "status",
                  type: "string",
                  required: false,
                  description: "Фильтр по статусу",
                  example: "OPEN",
                  in: "query",
                },
              ],
              response: {
                example: {
                  success: true,
                  data: [],
                  pagination: {
                    page: 1,
                    limit: 20,
                    total: 0,
                    totalPages: 0
                  }
                }
              }
            },
            {
              id: "get-payout-dispute",
              method: "GET",
              path: "/merchant/payout-disputes/dispute/:disputeId",
              description: "Получение деталей спора по выплате",
              category: "Споры по выплатам",
              parameters: [
                {
                  name: "disputeId",
                  type: "string",
                  required: true,
                  description: "ID спора",
                  example: "dispute456",
                  in: "path",
                },
              ],
              response: {
                example: {
                  success: true,
                  data: {
                    id: "dispute456",
                    payoutId: "payout123",
                    status: "OPEN",
                    messages: []
                  }
                }
              }
            },
            {
              id: "send-payout-dispute-message",
              method: "POST",
              path: "/merchant/payout-disputes/dispute/:disputeId/messages",
              description: "Отправка сообщения в споре по выплате",
              category: "Споры по выплатам",
              parameters: [
                {
                  name: "disputeId",
                  type: "string",
                  required: true,
                  description: "ID спора",
                  example: "dispute456",
                  in: "path",
                },
                {
                  name: "message",
                  type: "string",
                  required: true,
                  description: "Текст сообщения",
                  example: "Прикладываю скриншот транзакции",
                },
                {
                  name: "files",
                  type: "array",
                  required: false,
                  description: "Массив файлов (до 10 файлов, максимум 20MB каждый)",
                  example: "Файлы в формате multipart/form-data",
                },
              ],
              response: {
                example: {
                  success: true,
                  message: {
                    id: "msg125",
                    message: "Прикладываю скриншот транзакции",
                    senderType: "MERCHANT",
                    attachments: []
                  }
                }
              }
            },
          ],
          webhooks: {
            description: "Система автоматически отправляет уведомления при изменении статуса транзакций и выплат",
            transaction: {
              url: "https://your-domain.com/webhook",
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Signature": "HMAC-SHA256 подпись тела запроса",
              },
              body: {
                transactionId: "tx123",
                orderId: "ORDER-12345",
                status: "READY",
                amount: 5000,
                crypto: 52.36,
                timestamp: "2024-01-01T10:05:00.000Z",
              },
            },
            payout: {
              url: "https://your-domain.com/webhook/payouts",
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: {
                event: "ACTIVE", // ACTIVE, CHECKING, COMPLETED, CANCELLED, DISPUTED
                payout: {
                  id: "payout123",
                  numericId: 2001,
                  status: "ACTIVE",
                  amount: 10000,
                  amountUsdt: 104.71,
                  wallet: "TRx1234567890abcdef",
                  bank: "SBERBANK",
                  externalReference: "PAYOUT-12345",
                  proofFiles: [],
                  disputeFiles: [],
                  disputeMessage: null,
                  cancelReason: null,
                  cancelReasonCode: null,
                  metadata: { userId: "user123" },
                },
              },
            },
          },
          errors: {
            "400": "Неверный запрос - проверьте параметры",
            "401": "Неавторизован - проверьте API ключ",
            "403": "Доступ запрещен - мерчант заблокирован или деактивирован",
            "404": "Не найдено - ресурс не существует",
            "409": "Конфликт - дублирование данных (например, orderId)",
            "500": "Внутренняя ошибка сервера",
          },
        };
      },
      {
        tags: ["merchant-api-docs"],
        detail: { summary: "Получение полной документации API для мерчанта" },
        headers: t.Object({ authorization: t.String() }),
        response: {
          200: t.Object({
            baseUrl: t.String(),
            authentication: t.Object({
              type: t.String(),
              name: t.String(),
              description: t.String(),
              example: t.String(),
            }),
            endpoints: t.Array(
              t.Object({
                id: t.String(),
                method: t.String(),
                path: t.String(),
                description: t.String(),
                category: t.String(),
                parameters: t.Array(
                  t.Object({
                    name: t.String(),
                    type: t.String(),
                    required: t.Boolean(),
                    description: t.String(),
                    example: t.Any(),
                    in: t.Optional(t.String()),
                  })
                ),
                response: t.Object({
                  example: t.Any(),
                }),
              })
            ),
            webhooks: t.Object({
              description: t.String(),
              transaction: t.Optional(t.Object({
                url: t.String(),
                method: t.String(),
                headers: t.Any(),
                body: t.Any(),
              })),
              payout: t.Optional(t.Object({
                url: t.String(),
                method: t.String(),
                headers: t.Any(),
                body: t.Any(),
              })),
            }),
            errors: t.Any(),
          }),
          401: ErrorSchema,
        },
      },
    )

    /* ──────── POST /merchant/api-docs/test ──────── */
    .post(
      "/test",
      async ({ body, merchant, error }) => {
        try {
          // Формируем заголовки
          const headers: any = {
            "Content-Type": "application/json",
            "x-merchant-api-key": merchant.token,
          };

          // Добавляем дополнительные заголовки если есть
          if (body.headers) {
            Object.assign(headers, body.headers);
          }

          // Формируем URL
          const baseUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 3000}`;
          const url = `${baseUrl}${body.path}`;

          // Выполняем запрос
          const response = await fetch(url, {
            method: body.method,
            headers,
            body: body.method !== "GET" && body.body ? JSON.stringify(body.body) : undefined,
          });

          // Получаем ответ
          const responseData = await response.text();
          let parsedResponse;
          
          try {
            parsedResponse = JSON.parse(responseData);
          } catch {
            parsedResponse = responseData;
          }

          return {
            request: {
              method: body.method,
              url,
              headers,
              body: body.body,
            },
            response: {
              status: response.status,
              statusText: response.statusText,
              headers: Object.fromEntries(response.headers.entries()),
              body: parsedResponse,
            },
            duration: 0, // В реальной реализации можно замерить время выполнения
          };
        } catch (e: any) {
          return error(500, { 
            error: "Ошибка при выполнении тестового запроса", 
            details: e.message 
          });
        }
      },
      {
        tags: ["merchant-api-docs"],
        detail: { summary: "Тестирование API эндпоинта" },
        headers: t.Object({ authorization: t.String() }),
        body: t.Object({
          method: t.String({ description: "HTTP метод" }),
          path: t.String({ description: "Путь API" }),
          headers: t.Optional(t.Any({ description: "Дополнительные заголовки" })),
          body: t.Optional(t.Any({ description: "Тело запроса для POST/PUT/PATCH" })),
        }),
        response: {
          200: t.Object({
            request: t.Object({
              method: t.String(),
              url: t.String(),
              headers: t.Any(),
              body: t.Optional(t.Any()),
            }),
            response: t.Object({
              status: t.Number(),
              statusText: t.String(),
              headers: t.Any(),
              body: t.Any(),
            }),
            duration: t.Number(),
          }),
          401: ErrorSchema,
          500: ErrorSchema,
        },
      },
    );