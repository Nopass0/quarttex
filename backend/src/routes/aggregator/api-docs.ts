import { Elysia, t } from "elysia";

/**
 * API документация для агрегаторов
 * Содержит описание эндпоинтов, которые должны реализовать агрегаторы
 */
export default (app: Elysia) =>
  app
    /* ──────── GET /aggregator/api-docs/endpoints ──────── */
    .get(
      "/endpoints",
      async ({ aggregator }) => {
        const baseUrl =
          aggregator.apiBaseUrl || "https://your-aggregator-api.com";

        return {
          baseUrl,
          description: "Эндпоинты, которые должен реализовать ваш агрегатор",
          endpoints: [
            {
              method: "POST",
              path: "/transaction/create",
              url: `${baseUrl}/transaction/create`,
              description: "Создание транзакции на вашей платформе",
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
                methodType: "string (тип метода: sbp, c2c, и т.д.)",
                currency: "string (валюта: RUB)",
                clientName: "string (имя клиента)",
                callbackUrl: "string (URL для колбэков)",
                successUrl: "string (URL успеха)",
                failUrl: "string (URL ошибки)",
                expiresAt: "string (ISO дата истечения)",
              },
              responseBody: {
                success: "boolean",
                transactionId: "string (ваш внутренний ID транзакции)",
                status: "string (CREATED | IN_PROGRESS | READY | FAILED)",
                paymentData: {
                  requisites: "object (реквизиты для оплаты)",
                  instructions: "string (инструкции для клиента)",
                },
              },
              errors: {
                "400": "Некорректные данные",
                "404": "NO_REQUISITE - нет подходящего реквизита",
                "409": "DUPLICATE - транзакция уже существует",
                "500": "Внутренняя ошибка сервера",
              },
            },
            {
              method: "POST",
              path: "/transaction/status",
              url: `${baseUrl}/transaction/status`,
              description: "Обновление статуса транзакции",
              headers: {
                "Content-Type": "application/json",
                "X-Api-Token": aggregator.apiToken,
              },
              requestBody: {
                transactionId: "string (UUID нашей транзакции)",
                status: "string (READY | FAILED | CANCELED | EXPIRED)",
              },
              responseBody: {
                success: "boolean",
                message: "string",
              },
            },
            {
              method: "GET",
              path: "/transaction/:transactionId",
              url: `${baseUrl}/transaction/{transactionId}`,
              description: "Получение информации о транзакции",
              headers: {
                "X-Api-Token": aggregator.apiToken,
              },
              responseBody: {
                transactionId: "string (ваш внутренний ID)",
                ourTransactionId: "string (наш UUID)",
                status: "string",
                amount: "number",
                createdAt: "string (ISO дата)",
                updatedAt: "string (ISO дата)",
              },
            },
          ],
        };
      },
      {
        tags: ["aggregator-api-docs"],
        detail: { summary: "Описание API эндпоинтов для реализации" },
        response: {
          200: t.Object({
            baseUrl: t.String(),
            description: t.String(),
            endpoints: t.Array(t.Any()),
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
          bankTypes: {
            description: "Типы банков, которые мы поддерживаем",
            values: [
              "SBERBANK",
              "RAIFFEISEN",
              "GAZPROMBANK",
              "POCHTABANK",
              "VTB",
              "ROSSELKHOZBANK",
              "ALFABANK",
              "URALSIB",
              "LOKOBANK",
              "AKBARS",
              "MKB",
              "SPBBANK",
              "MTSBANK",
              "PROMSVYAZBANK",
              "OZONBANK",
              "RENAISSANCE",
              "OTPBANK",
              "AVANGARD",
              "TAVRICHESKIY",
              "FORABANK",
              "BCSBANK",
              "HOMECREDIT",
              "BBRBANK",
              "CREDITEUROPE",
              "RNKB",
              "UBRIR",
              "GENBANK",
              "SINARA",
              "ABSOLUTBANK",
              "MTSMONEY",
              "SVOYBANK",
              "TRANSKAPITALBANK",
              "DOLINSK",
              "TBANK",
              "SOVCOMBANK",
              "ROSBANK",
              "UNICREDIT",
              "CITIBANK",
              "RUSSIANSTANDARD",
              "OTKRITIE",
              "OTP",
              "RNCB",
              "YOOMONEY",
            ],
          },
          methodTypes: {
            description: "Типы методов платежа",
            values: [
              "upi",
              "c2ckz",
              "c2cuz",
              "c2caz",
              "c2c",
              "sbp",
              "spay",
              "tpay",
              "vpay",
              "apay",
              "m2ctj",
              "m2ntj",
              "m2csber",
              "m2ctbank",
              "connectc2c",
              "connectsbp",
              "nspk",
              "ecom",
              "crypto",
            ],
          },
          transactionStatuses: {
            description: "Статусы транзакций",
            values: [
              "CREATED",
              "IN_PROGRESS",
              "DISPUTE",
              "EXPIRED",
              "READY",
              "MILK",
              "CANCELED",
            ],
          },
          currencies: {
            description: "Поддерживаемые валюты",
            values: ["rub", "usdt"],
          },
        };
      },
      {
        tags: ["aggregator-api-docs"],
        detail: { summary: "Константы и справочники" },
        response: {
          200: t.Object({
            description: t.String(),
            bankTypes: t.Object({
              description: t.String(),
              values: t.Array(t.String()),
            }),
            methodTypes: t.Object({
              description: t.String(),
              values: t.Array(t.String()),
            }),
            transactionStatuses: t.Object({
              description: t.String(),
              values: t.Array(t.String()),
            }),
            currencies: t.Object({
              description: t.String(),
              values: t.Array(t.String()),
            }),
          }),
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
            },
            {
              step: 2,
              title: "Реализация эндпоинтов",
              description:
                "Реализуйте необходимые эндпоинты на вашей стороне: /transaction/create для создания транзакций и /transaction/status для обновления статусов.",
            },
            {
              step: 3,
              title: "Настройка авторизации",
              description:
                "Используйте заголовок X-Aggregator-Api-Token с вашим API токеном для авторизации запросов к нашей платформе.",
            },
            {
              step: 4,
              title: "Пополнение баланса",
              description:
                "Пополните баланс USDT в личном кабинете. Транзакции будут приходить только в пределах доступного баланса.",
            },
            {
              step: 5,
              title: "Обработка транзакций",
              description:
                "При получении транзакции от нашей платформы, обработайте её и отправьте колбэк с обновлением статуса.",
            },
            {
              step: 6,
              title: "Мониторинг и споры",
              description:
                "Отслеживайте транзакции и споры в личном кабинете. При возникновении спора, оперативно реагируйте через систему сообщений.",
            },
          ],
          errorHandling: {
            "400":
              "Неверный формат запроса - проверьте соответствие данных документации",
            "401":
              "Неверный API токен - проверьте правильность токена в заголовке",
            "403":
              "Доступ запрещен - агрегатор деактивирован или недостаточно прав",
            "404": "Ресурс не найден - проверьте правильность ID транзакции",
            "500": "Внутренняя ошибка сервера - повторите запрос позже",
          },
          bestPractices: [
            "Всегда проверяйте подпись запросов для безопасности",
            "Логируйте все входящие и исходящие запросы для отладки",
            "Реализуйте retry-механизм для колбэков с экспоненциальной задержкой",
            "Обновляйте статусы транзакций как можно быстрее",
            "Используйте HTTPS для всех эндпоинтов",
            "Регулярно проверяйте баланс USDT",
            "Настройте мониторинг доступности ваших эндпоинтов",
          ],
        };
      },
      {
        tags: ["aggregator-api-docs"],
        detail: { summary: "Схема интеграции с платформой" },
        response: {
          200: t.Object({
            description: t.String(),
            steps: t.Array(
              t.Object({
                step: t.Number(),
                title: t.String(),
                description: t.String(),
              })
            ),
            errorHandling: t.Record(t.String(), t.String()),
            bestPractices: t.Array(t.String()),
          }),
        },
      }
    )

    /* ──────── GET /aggregator/api-docs/callback-format ──────── */
    .get(
      "/callback-format",
      async ({ aggregator }) => {
        return {
          description: "Формат колбэков, которые мы отправляем агрегатору",
          callbackUrl: `${
            aggregator.apiBaseUrl || "https://your-api.com"
          }/callback`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Api-Token": aggregator.apiToken,
          },
          requestBody: {
            type: "string (transaction_status_update | dispute_created)",
            transactionId: "string (UUID нашей транзакции)",
            data: {
              status: "string (новый статус)",
              amount: "number (сумма)",
              merchantId: "string (ID мерчанта)",
              timestamp: "string (ISO дата)",
            },
          },
          expectedResponse: {
            success: "boolean",
            message: "string (опционально)",
          },
          notes: [
            "Мы отправляем колбэки при изменении статуса транзакции",
            "Мы отправляем колбэки при создании спора по транзакции",
            "Ваш сервер должен отвечать HTTP 200 со статусом success: true",
            "При ошибке мы будем повторять отправку до 5 раз с экспоненциальной задержкой",
            "Таймаут ожидания ответа: 30 секунд",
          ],
        };
      },
      {
        tags: ["aggregator-api-docs"],
        detail: { summary: "Формат колбэков от нашей системы" },
        response: {
          200: t.Object({
            description: t.String(),
            callbackUrl: t.String(),
            method: t.String(),
            headers: t.Object({
              "Content-Type": t.String(),
              "X-Api-Token": t.String(),
            }),
            requestBody: t.Any(),
            expectedResponse: t.Any(),
            notes: t.Array(t.String()),
          }),
        },
      }
    );
