import { Elysia, t } from "elysia";
import { db } from "@/db";

/**
 * Обновленная API документация для агрегаторов
 * Включает:
 * - Callback'и с поддержкой изменения статуса, суммы и диспутов
 * - Массовые callback'и
 * - Работу с файлами в диспутах
 * - Логирование всех операций
 */
export default (app: Elysia) =>
  app
    /* ──────── GET /aggregator/api-docs/endpoints ──────── */
    .get(
      "/endpoints",
      async ({ aggregator }) => {
        const baseUrl = aggregator.apiBaseUrl || "https://your-aggregator-api.com";
        
        // Получаем базовый URL из настроек сайта
        const siteBaseUrlConfig = await db.systemConfig.findUnique({
          where: { key: "site_base_url" }
        });
        const ourBaseUrl = siteBaseUrlConfig?.value || "https://chasepay.pro/api";

        return {
          baseUrl,
          ourApiUrl: ourBaseUrl,
          description: "API эндпоинты для интеграции с нашей платформой",
          
          // Эндпоинты, которые должен реализовать агрегатор
          aggregatorEndpoints: [
            {
              method: "POST",
              path: "/transaction/create",
              url: `${baseUrl}/transaction/create`,
              description: "Создание транзакции на вашей платформе с возвратом реквизитов",
              headers: {
                "Content-Type": "application/json",
                "X-Api-Token": aggregator.apiToken,
              },
              requestBody: {
                transactionId: "string (UUID нашей транзакции)",
                merchantId: "string (ID мерчанта)",
                amount: "number (сумма в рублях)",
                orderId: "string (ID заказа мерчанта)",
                methodId: "string (ID метода платежа)",
                methodType: "string (C2C | SBP - тип метода платежа)",
                currency: "string (валюта: RUB)",
                clientName: "string (имя клиента)",
                callbackUrl: "string (URL для колбэков на chasepay.pro)",
                successUrl: "string (URL успеха)",
                failUrl: "string (URL ошибки)",
                expiresAt: "string (ISO дата истечения)",
              },
              responseBody: {
                success: "boolean",
                transactionId: "string (ваш внутренний ID транзакции)",
                status: "string (CREATED | IN_PROGRESS | READY | FAILED)",
                paymentData: {
                  requisites: {
                    // Для SBP метода
                    phoneNumber: "string? (номер телефона для СБП)",
                    bankName: "string? (название банка)",
                    // Для C2C метода  
                    cardNumber: "string? (номер карты)",
                    bankCode: "string? (код банка из константы BANK_TYPES)",
                    cardHolder: "string? (держатель карты)",
                    // Общие поля
                    amount: "number (точная сумма к оплате)",
                    currency: "string (валюта)",
                  },
                  instructions: "string (инструкции для клиента)",
                },
              },
              errors: {
                "400": "Некорректные данные",
                "404": "NO_REQUISITE - нет подходящего реквизита",
                "409": "DUPLICATE - транзакция уже существует",
                "500": "Внутренняя ошибка сервера",
              },
              example: {
                title: "Создание SBP транзакции",
                request: {
                  transactionId: "clh4n5kx40001qw8g7d3f9xyz",
                  merchantId: "merchant123",
                  amount: 5000,
                  orderId: "ORDER_12345",
                  methodId: "sbp_method_id",
                  methodType: "SBP",
                  currency: "RUB",
                  clientName: "Иван Иванов",
                  callbackUrl: "https://chasepay.pro/api/aggregator/callback",
                  successUrl: "https://merchant.com/success",
                  failUrl: "https://merchant.com/fail",
                  expiresAt: "2024-01-15T11:30:00Z",
                },
                response: {
                  success: true,
                  transactionId: "aggr_tx_123456",
                  status: "CREATED",
                  paymentData: {
                    requisites: {
                      phoneNumber: "+79001234567",
                      bankName: "Сбербанк",
                      amount: 5000,
                      currency: "RUB",
                    },
                    instructions: "Переведите указанную сумму на номер телефона через СБП",
                  },
                },
              },
            },
            {
              method: "GET",
              path: "/transaction/:transactionId",
              url: `${baseUrl}/transaction/{transactionId}`,
              description: "Получение полной информации о транзакции с реквизитами",
              headers: {
                "X-Api-Token": aggregator.apiToken,
              },
              responseBody: {
                transactionId: "string (ваш внутренний ID)",
                ourTransactionId: "string (наш UUID)",
                status: "string (статус из TRANSACTION_STATUSES)",
                amount: "number (сумма транзакции)",
                methodType: "string (C2C | SBP)",
                currency: "string (валюта)",
                requisites: {
                  // Для SBP
                  phoneNumber: "string? (номер телефона)",
                  bankName: "string? (название банка)",
                  // Для C2C
                  cardNumber: "string? (номер карты)",
                  bankCode: "string? (код банка)",
                  cardHolder: "string? (держатель карты)",
                },
                createdAt: "string (ISO дата создания)",
                updatedAt: "string (ISO дата обновления)",
                expiresAt: "string (ISO дата истечения)",
              },
              example: {
                title: "Получение C2C транзакции",
                response: {
                  transactionId: "aggr_tx_123456",
                  ourTransactionId: "clh4n5kx40001qw8g7d3f9xyz",
                  status: "READY",
                  amount: 3500,
                  methodType: "C2C",
                  currency: "RUB",
                  requisites: {
                    cardNumber: "5536 9137 **** 1234",
                    bankCode: "SBERBANK",
                    cardHolder: "IVAN IVANOV",
                  },
                  createdAt: "2024-01-15T10:00:00Z",
                  updatedAt: "2024-01-15T10:15:00Z",
                  expiresAt: "2024-01-15T11:00:00Z",
                },
              },
            },
            {
              method: "GET",
              path: "/file/:fileId",
              url: `${baseUrl}/file/{fileId}`,
              description: "Получение файла по ID (для диспутов)",
              headers: {
                "X-Api-Token": aggregator.apiToken,
              },
              responseBody: "Binary file data или URL для скачивания",
            },
          ],
          
          // Эндпоинты нашего API для агрегаторов
          ourApiEndpoints: [
            {
              method: "POST",
              path: "/aggregator/callback",
              url: `${ourBaseUrl}/aggregator/callback`,
              description: "Одиночный callback для обновления транзакции",
              headers: {
                "Content-Type": "application/json",
                "X-Aggregator-Api-Token": "YOUR_API_TOKEN",
              },
              requestBody: {
                type: "string (status_update | amount_change | dispute_init | dispute_message)",
                transactionId: "string (UUID транзакции)",
                data: {
                  // Для status_update
                  status: "string? (CREATED | IN_PROGRESS | READY | CANCELED | EXPIRED | DISPUTE)",
                  // Для amount_change
                  amount: "number? (новая сумма)",
                  // Для dispute_init
                  disputeSubject: "string? (тема спора)",
                  disputeDescription: "string? (описание спора)",
                  disputeMessage: "string? (начальное сообщение)",
                  disputeFileUrls: "string[]? (массив ссылок на файлы)",
                  // Для dispute_message
                  disputeMessage: "string? (сообщение в споре)",
                  disputeFileUrls: "string[]? (массив ссылок на файлы)",
                  // Общие
                  timestamp: "string? (ISO дата)",
                },
              },
              responseBody: {
                success: "boolean",
                message: "string",
                disputeId: "string? (ID созданного/обновленного спора)",
              },
              examples: [
                {
                  title: "Обновление статуса",
                  request: {
                    type: "status_update",
                    transactionId: "clh4n5kx40001qw8g7d3f9xyz",
                    data: {
                      status: "READY",
                      timestamp: "2024-01-15T10:30:00Z",
                    },
                  },
                },
                {
                  title: "Изменение суммы",
                  request: {
                    type: "amount_change",
                    transactionId: "clh4n5kx40001qw8g7d3f9xyz",
                    data: {
                      amount: 5500.50,
                      timestamp: "2024-01-15T10:30:00Z",
                    },
                  },
                },
                {
                  title: "Инициация спора с файлами",
                  request: {
                    type: "dispute_init",
                    transactionId: "clh4n5kx40001qw8g7d3f9xyz",
                    data: {
                      disputeSubject: "Неверная сумма платежа",
                      disputeDescription: "Клиент перевел 5000 вместо 5500",
                      disputeMessage: "Прикладываю скриншот перевода",
                      disputeFileUrls: [
                        "https://your-api.com/file/abc123",
                        "https://your-api.com/file/def456",
                      ],
                    },
                  },
                },
              ],
            },
            {
              method: "POST",
              path: "/aggregator/callback/batch",
              url: `${ourBaseUrl}/aggregator/callback/batch`,
              description: "Массовые callback'и для обновления нескольких транзакций",
              headers: {
                "Content-Type": "application/json",
                "X-Aggregator-Api-Token": "YOUR_API_TOKEN",
              },
              requestBody: {
                callbacks: [
                  {
                    type: "string",
                    transactionId: "string",
                    data: "object (как в одиночном callback)",
                  },
                  "// ... до 100 callback'ов",
                ],
              },
              responseBody: {
                success: "boolean",
                message: "string",
                results: [
                  {
                    transactionId: "string",
                    success: "boolean",
                    message: "string",
                    disputeId: "string?",
                    error: "string?",
                  },
                ],
                processed: "number (всего обработано)",
                successful: "number (успешно)",
                failed: "number (с ошибками)",
              },
              example: {
                title: "Массовое обновление статусов",
                request: {
                  callbacks: [
                    {
                      type: "status_update",
                      transactionId: "clh4n5kx40001qw8g7d3f9xyz",
                      data: { status: "READY" },
                    },
                    {
                      type: "amount_change",
                      transactionId: "clh4n5kx40002qw8g7d3f9abc",
                      data: { amount: 3000 },
                    },
                    {
                      type: "status_update",
                      transactionId: "clh4n5kx40003qw8g7d3f9def",
                      data: { status: "CANCELED" },
                    },
                  ],
                },
              },
            },
            {
              method: "GET",
              path: "/aggregator/callback/logs",
              url: `${ourBaseUrl}/aggregator/callback/logs`,
              description: "История всех callback'ов агрегатора",
              headers: {
                "X-Aggregator-Api-Token": "YOUR_API_TOKEN",
              },
              queryParams: {
                page: "number? (страница, по умолчанию 1)",
                limit: "number? (лимит записей, макс 100)",
                transactionId: "string? (фильтр по транзакции)",
                type: "string? (фильтр по типу callback'а)",
                dateFrom: "string? (ISO дата начала периода)",
                dateTo: "string? (ISO дата конца периода)",
              },
              responseBody: {
                data: [
                  {
                    id: "string",
                    aggregatorId: "string",
                    transactionId: "string?",
                    type: "string",
                    payload: "object",
                    response: "string?",
                    statusCode: "number?",
                    error: "string?",
                    createdAt: "string (ISO)",
                    transaction: {
                      id: "string",
                      orderId: "string",
                      amount: "number",
                      status: "string",
                    },
                  },
                ],
                pagination: {
                  page: "number",
                  limit: "number",
                  total: "number",
                  totalPages: "number",
                },
              },
            },
          ],
        };
      },
      {
        tags: ["aggregator-api-docs"],
        detail: { summary: "Описание всех API эндпоинтов" },
        response: {
          200: t.Object({
            baseUrl: t.String(),
            ourApiUrl: t.String(),
            description: t.String(),
            aggregatorEndpoints: t.Array(t.Any()),
            ourApiEndpoints: t.Array(t.Any()),
          }),
        },
      }
    )

    /* ──────── GET /aggregator/api-docs/constants ──────── */
    .get(
      "/constants",
      async ({ aggregator }) => {
        return {
          description: "Константы и справочники для интеграции",
          
          callbackTypes: {
            description: "Типы callback'ов",
            values: [
              {
                value: "status_update",
                description: "Обновление статуса транзакции",
                requiredFields: ["status"],
              },
              {
                value: "amount_change",
                description: "Изменение суммы транзакции",
                requiredFields: ["amount"],
              },
              {
                value: "dispute_init",
                description: "Инициация спора по транзакции",
                requiredFields: ["disputeSubject"],
                optionalFields: ["disputeDescription", "disputeMessage", "disputeFileUrls"],
              },
              {
                value: "dispute_message",
                description: "Добавление сообщения в существующий спор",
                optionalFields: ["disputeMessage", "disputeFileUrls"],
              },
            ],
          },
          
          transactionStatuses: {
            description: "Статусы транзакций",
            values: [
              { value: "CREATED", description: "Транзакция создана, ожидает оплаты" },
              { value: "IN_PROGRESS", description: "В процессе обработки" },
              { value: "READY", description: "Успешно завершена, средства зачислены" },
              { value: "CANCELED", description: "Отменена мерчантом или системой" },
              { value: "EXPIRED", description: "Истекло время оплаты" },
              { value: "DISPUTE", description: "Открыт спор по транзакции" },
              { value: "MILK", description: "Подозрительная транзакция, требует проверки" },
              { value: "FAILED", description: "Транзакция не удалась" },
              { value: "PENDING", description: "Ожидает подтверждения" },
            ],
          },
          
          disputeStatuses: {
            description: "Статусы споров",
            values: [
              { value: "OPEN", description: "Спор открыт" },
              { value: "IN_PROGRESS", description: "Спор в процессе рассмотрения" },
              { value: "RESOLVED_SUCCESS", description: "Спор решен в пользу агрегатора" },
              { value: "RESOLVED_FAIL", description: "Спор решен в пользу мерчанта" },
              { value: "CANCELLED", description: "Спор отменен" },
            ],
          },
          
          bankTypes: {
            description: "Коды банков для реквизитов (используются в поле bankCode)",
            values: [
              { code: "SBERBANK", name: "ПАО Сбербанк" },
              { code: "RAIFFEISEN", name: "АО «Райффайзенбанк»" },
              { code: "GAZPROMBANK", name: "ГПБ (АО)" },
              { code: "POCHTABANK", name: "ПАО «Почта Банк»" },
              { code: "VTB", name: "Банк ВТБ (ПАО)" },
              { code: "ROSSELKHOZBANK", name: "АО «Россельхозбанк»" },
              { code: "ALFABANK", name: "АО «Альфа-Банк»" },
              { code: "URALSIB", name: "Банк «УРАЛСИБ» (ПАО)" },
              { code: "LOKOBANK", name: "Локо-Банк (АО)" },
              { code: "AKBARS", name: "АК БАРС БАНК (ПАО)" },
              { code: "MKB", name: "ПАО «Московский Кредитный Банк»" },
              { code: "SPBBANK", name: "Банк «Санкт-Петербург» (ПАО)" },
              { code: "MTSBANK", name: "ПАО «МТС-Банк»" },
              { code: "PROMSVYAZBANK", name: "ПАО «Промсвязьбанк»" },
              { code: "OZONBANK", name: "ООО «Озон Банк»" },
              { code: "RENAISSANCE", name: "Ренессанс Кредит Банк (ООО)" },
              { code: "OTPBANK", name: "АО ОТП Банк" },
              { code: "AVANGARD", name: "Банк «Авангард» (АО)" },
              { code: "TAVRICHESKIY", name: "АО «Таврический Банк»" },
              { code: "FORABANK", name: "ПАО АКБ «ФОРА-БАНК»" },
              { code: "BCSBANK", name: "ООО «БКС Банк»" },
              { code: "HOMECREDIT", name: "ООО «Хоум Кредит Банк»" },
              { code: "BBRBANK", name: "ООО «ББР Банк»" },
              { code: "CREDITEUROPE", name: "КредитЕвропа Банк (АО)" },
              { code: "RNKB", name: "РНКБ Банк (ПАО)" },
              { code: "UBRIR", name: "УБРиР (АО)" },
              { code: "GENBANK", name: "Генбанк (АО)" },
              { code: "SINARA", name: "АО «Синара-Банк»" },
              { code: "ABSOLUTBANK", name: "АО «Абсолют Банк»" },
              { code: "MTSMONEY", name: "ООО «МТС Деньги»" },
              { code: "SVOYBANK", name: "АО «СВОЙ Банк»" },
              { code: "TRANSKAPITALBANK", name: "ООО «Транскапиталбанк»" },
              { code: "DOLINSK", name: "АО «Долинск»" },
              { code: "TBANK", name: "Т-Банк (АО)" },
              { code: "SOVCOMBANK", name: "Совкомбанк (ПАО)" },
              { code: "ROSBANK", name: "ПАО РОСБАНК" },
              { code: "UNICREDIT", name: "АО ЮниКредит Банк" },
              { code: "CITIBANK", name: "АО «Ситибанк»" },
              { code: "RUSSIANSTANDARD", name: "АО «Банк Русский Стандарт»" },
              { code: "OTKRITIE", name: "Банк «ФК Открытие» (ПАО)" },
              { code: "OTP", name: "АО ОТП Банк" },
              { code: "RNCB", name: "АО «РНКБ Банк»" },
              { code: "YOOMONEY", name: "ООО НКО «ЮMoney»" },
            ],
          },
          
          methodTypes: {
            description: "Типы методов платежа",
            values: [
              "upi", "c2ckz", "c2cuz", "c2caz", "c2c", "sbp", "spay",
              "tpay", "vpay", "apay", "m2ctj", "m2ntj", "m2csber",
              "m2ctbank", "connectc2c", "connectsbp", "nspk", "ecom", "crypto",
            ],
          },
          
          currencies: {
            description: "Поддерживаемые валюты",
            values: ["rub", "usdt"],
          },
          
          limits: {
            description: "Ограничения API",
            values: {
              maxBatchCallbacks: 100,
              maxFileUrls: 10,
              maxMessageLength: 5000,
              callbackTimeout: 30,
              retryAttempts: 5,
              retryDelay: "Экспоненциальная задержка: 1s, 2s, 4s, 8s, 16s",
            },
          },
        };
      },
      {
        tags: ["aggregator-api-docs"],
        detail: { summary: "Константы и справочники" },
        response: {
          200: t.Any(),
        },
      }
    )

    /* ──────── GET /aggregator/api-docs/integration-flow ──────── */
    .get(
      "/integration-flow",
      async ({ aggregator }) => {
        return {
          description: "Пошаговая инструкция по интеграции с платформой",
          
          steps: [
            {
              step: 1,
              title: "Настройка базового URL",
              description:
                "Укажите базовый URL вашего API в настройках личного кабинета. Все запросы от нашей платформы будут отправляться на этот адрес.",
              actions: [
                "Перейдите в раздел 'Настройки'",
                "Введите базовый URL вашего API",
                "Сохраните изменения",
              ],
            },
            {
              step: 2,
              title: "Реализация эндпоинтов",
              description:
                "Реализуйте необходимые эндпоинты на вашей стороне для приема транзакций и обработки запросов.",
              endpoints: [
                "/transaction/create - создание транзакций",
                "/transaction/:id - получение информации",
                "/file/:id - получение файлов (для диспутов)",
              ],
            },
            {
              step: 3,
              title: "Настройка URL для коллбэков",
              description:
                "Настройте URL для получения коллбэков от нашей системы и используйте наш API для отправки обновлений.",
              important: [
                "URL для коллбэков должен быть: https://chasepay.pro/api/aggregator/callback",
                "Используйте заголовок X-Aggregator-Api-Token для авторизации",
                "Отправляйте callback'и сразу при изменении статуса",
                "Для массовых обновлений используйте /callback/batch",
                "Все callback'и автоматически логируются",
              ],
            },
            {
              step: 4,
              title: "Работа с диспутами",
              description:
                "При возникновении спорных ситуаций используйте систему диспутов для коммуникации с мерчантами.",
              features: [
                "Инициация спора через callback type='dispute_init'",
                "Прикрепление файлов через disputeFileUrls",
                "Добавление сообщений через type='dispute_message'",
                "Отслеживание статуса спора в личном кабинете",
              ],
            },
            {
              step: 5,
              title: "Пополнение баланса",
              description:
                "Пополните баланс USDT в личном кабинете. Транзакции будут приходить только в пределах доступного баланса.",
              info: "Минимальная сумма пополнения: 100 USDT",
            },
            {
              step: 6,
              title: "Мониторинг и отладка",
              description:
                "Используйте инструменты мониторинга для отслеживания транзакций и callback'ов.",
              tools: [
                "История callback'ов: GET /aggregator/callback/logs",
                "Список транзакций в личном кабинете",
                "Список споров и их статусы",
                "API логи для отладки интеграции",
              ],
            },
          ],
          
          errorHandling: {
            "400": "Неверный формат запроса - проверьте соответствие данных документации",
            "401": "Неверный API токен - проверьте правильность токена в заголовке",
            "403": "Доступ запрещен - агрегатор деактивирован или недостаточно прав",
            "404": "Ресурс не найден - проверьте правильность ID транзакции",
            "409": "Конфликт - транзакция уже существует или спор уже создан",
            "500": "Внутренняя ошибка сервера - повторите запрос позже",
          },
          
          bestPractices: [
            "Всегда проверяйте подпись запросов для безопасности",
            "Логируйте все входящие и исходящие запросы для отладки",
            "Реализуйте retry-механизм для callback'ов с экспоненциальной задержкой",
            "Обновляйте статусы транзакций как можно быстрее",
            "Используйте массовые callback'и для оптимизации при большом количестве обновлений",
            "При инициации спора сразу прикладывайте все доступные доказательства",
            "Используйте HTTPS для всех эндпоинтов",
            "Регулярно проверяйте баланс USDT",
            "Настройте мониторинг доступности ваших эндпоинтов",
            "Проверяйте историю callback'ов для отладки проблем",
          ],
        };
      },
      {
        tags: ["aggregator-api-docs"],
        detail: { summary: "Схема интеграции с платформой" },
        response: {
          200: t.Any(),
        },
      }
    )

    /* ──────── GET /aggregator/api-docs/callback-format ──────── */
    .get(
      "/callback-format",
      async ({ aggregator }) => {
        return {
          description: "Детальное описание форматов callback'ов",
          
          singleCallback: {
            description: "Формат одиночного callback'а",
            endpoint: "/aggregator/callback",
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Aggregator-Api-Token": aggregator.apiToken,
            },
            formats: [
              {
                type: "status_update",
                description: "Обновление статуса транзакции",
                example: {
                  type: "status_update",
                  transactionId: "clh4n5kx40001qw8g7d3f9xyz",
                  data: {
                    status: "READY",
                    timestamp: "2024-01-15T10:30:00Z",
                  },
                },
              },
              {
                type: "amount_change",
                description: "Изменение суммы транзакции (например, после частичной оплаты)",
                example: {
                  type: "amount_change",
                  transactionId: "clh4n5kx40001qw8g7d3f9xyz",
                  data: {
                    amount: 4500.00,
                    timestamp: "2024-01-15T10:30:00Z",
                  },
                },
              },
              {
                type: "dispute_init",
                description: "Инициация спора с возможностью прикрепления файлов",
                example: {
                  type: "dispute_init",
                  transactionId: "clh4n5kx40001qw8g7d3f9xyz",
                  data: {
                    disputeSubject: "Неверная сумма платежа",
                    disputeDescription: "Клиент перевел меньшую сумму, чем указано в заказе",
                    disputeMessage: "Прикладываю скриншоты перевода и выписку",
                    disputeFileUrls: [
                      "https://your-api.com/file/screenshot1.jpg",
                      "https://your-api.com/file/bank-statement.pdf",
                    ],
                    timestamp: "2024-01-15T10:30:00Z",
                  },
                },
              },
              {
                type: "dispute_message",
                description: "Добавление сообщения в существующий спор",
                example: {
                  type: "dispute_message",
                  transactionId: "clh4n5kx40001qw8g7d3f9xyz",
                  data: {
                    disputeMessage: "Дополнительная информация по спору",
                    disputeFileUrls: [
                      "https://your-api.com/file/additional-proof.jpg",
                    ],
                    timestamp: "2024-01-15T10:35:00Z",
                  },
                },
              },
            ],
          },
          
          batchCallback: {
            description: "Формат массовых callback'ов",
            endpoint: "/aggregator/callback/batch",
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Aggregator-Api-Token": aggregator.apiToken,
            },
            example: {
              callbacks: [
                {
                  type: "status_update",
                  transactionId: "clh4n5kx40001qw8g7d3f9xyz",
                  data: { status: "READY" },
                },
                {
                  type: "amount_change",
                  transactionId: "clh4n5kx40002qw8g7d3f9abc",
                  data: { amount: 3000 },
                },
                {
                  type: "dispute_init",
                  transactionId: "clh4n5kx40003qw8g7d3f9def",
                  data: {
                    disputeSubject: "Платеж не поступил",
                    disputeDescription: "Клиент утверждает, что оплатил",
                  },
                },
              ],
            },
            response: {
              success: true,
              message: "Все callback'и успешно обработаны",
              results: [
                {
                  transactionId: "clh4n5kx40001qw8g7d3f9xyz",
                  success: true,
                  message: "Статус транзакции обновлен на READY",
                },
                {
                  transactionId: "clh4n5kx40002qw8g7d3f9abc",
                  success: true,
                  message: "Сумма транзакции изменена на 3000",
                },
                {
                  transactionId: "clh4n5kx40003qw8g7d3f9def",
                  success: true,
                  message: "Спор успешно создан",
                  disputeId: "clh4n5kx40004qw8g7d3f9ghi",
                },
              ],
              processed: 3,
              successful: 3,
              failed: 0,
            },
          },
          
          fileHandling: {
            description: "Работа с файлами в диспутах",
            requirements: [
              "Файлы должны быть доступны по HTTPS",
              "Максимум 10 файлов на одно сообщение",
              "Поддерживаемые форматы: jpg, jpeg, png, pdf, doc, docx",
              "Максимальный размер файла: 10MB",
              "Файлы должны быть доступны минимум 30 дней",
            ],
            implementation: [
              "Загрузите файлы на ваш сервер",
              "Получите публичные URL для каждого файла",
              "Передайте массив URL в поле disputeFileUrls",
              "Убедитесь, что файлы доступны по указанным URL",
            ],
          },
          
          notes: [
            "Все callback'и автоматически логируются в нашей системе",
            "При ошибке мы повторяем отправку до 5 раз с экспоненциальной задержкой",
            "Таймаут ожидания ответа: 30 секунд",
            "Ваш сервер должен отвечать HTTP 200 со статусом success: true",
            "При массовых callback'ах каждый обрабатывается независимо",
            "История всех callback'ов доступна через API и в личном кабинете",
            "Callback'и по транзакции отправляются также мерчанту",
          ],
        };
      },
      {
        tags: ["aggregator-api-docs"],
        detail: { summary: "Детальное описание форматов callback'ов" },
        response: {
          200: t.Any(),
        },
      }
    );
