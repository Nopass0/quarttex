import { Elysia, t } from "elysia";
import { BankType, Status, MethodType } from "@prisma/client";
import { BANKS } from "../../constants/banks";
import { aggregatorSessionGuard } from "@/middleware/aggregatorGuard";

/**
 * API документация для агрегаторов v3
 * Полное описание всех endpoints, которые должен реализовать агрегатор
 */
export default (app: Elysia) =>
  app
    .use(aggregatorSessionGuard())
    /* ──────── GET /aggregator/api-docs ──────── */
    .get(
      "/",
      async ({ aggregator }) => {
        const baseUrl = aggregator.apiBaseUrl || "https://your-api.example.com";
        const ourBaseUrl = "https://chasepay.pro/api";

        return {
          version: "2.1",
          lastUpdated: "2025-01-29",
          aggregatorInfo: {
            name: aggregator.name,
            apiToken: aggregator.apiToken,
            callbackToken: aggregator.callbackToken,
            baseUrl: baseUrl,
          },
          integration: {
            ourApiUrl: ourBaseUrl,
            callbackUrl: `${ourBaseUrl}/aggregators/callback`,
            batchCallbackUrl: `${ourBaseUrl}/aggregators/callback/batch`,
          },
          quickLinks: {
            summary: {
              title: "📋 Краткая сводка",
              description: "Быстрый старт интеграции за 3 шага",
              url: "/api/aggregator/api-docs/summary"
            },
            testing: {
              title: "🧪 Тестирование",
              description: "Отправить тестовую сделку",
              url: "/api/aggregator/dashboard/test-deal"
            }
          },
          sections: {
            yourEndpoints: {
              title: "🔧 Endpoints которые вы должны реализовать",
              description: "Документация по API endpoints, которые должен реализовать агрегатор на своей стороне",
              url: "/api/aggregator/api-docs/your-endpoints",
              baseUrl: baseUrl,
              authentication: `Bearer ${aggregator.apiToken}`,
              endpoints: [
                {
                  method: "POST",
                  path: "/deals",
                  fullUrl: `${baseUrl}/deals`,
                  description: "Создание сделки с обязательным возвратом реквизитов",
                  required: true,
                  keyPoints: [
                    "Принимает paymentMethod: 'SBP' или 'C2C'",
                    "ОБЯЗАТЕЛЬНО возвращать реквизиты в ответе",
                    "SBP: phoneNumber + bankName",
                    "C2C: cardNumber + bankName", 
                    "Время ответа ≤ 2 секунды"
                  ]
                },
                {
                  method: "GET", 
                  path: "/deals/{partnerDealId}",
                  fullUrl: `${baseUrl}/deals/{partnerDealId}`,
                  description: "Получение информации о сделке",
                  required: true,
                  keyPoints: [
                    "Возвращает актуальный статус сделки",
                    "Включает реквизиты и детали сделки"
                  ]
                },
                {
                  method: "POST",
                  path: "/deals/{partnerDealId}/disputes",
                  fullUrl: `${baseUrl}/deals/{partnerDealId}/disputes`,
                  description: "Создание спора по сделке",
                  required: true,
                  keyPoints: [
                    "Принимает текст спора и файлы",
                    "Возвращает статус принятия спора"
                  ]
                }
              ],
              slaRequirements: {
                responseTime: "≤ 2 секунды",
                httpStatus: "2xx для успешных операций",
                availability: "99.9% uptime"
              }
            },
            callbacks: {
              title: "📞 Callbacks",
              description: "Полное описание формата коллбэков от агрегатора к нам",
              url: "/api/aggregator/api-docs/callbacks"
            },
            ourCallbacks: {
              title: "Наши callback endpoints",
              description: "Как отправлять callback'и в нашу систему",
              url: "/api/aggregator/api-docs/our-callbacks"
            },
            constants: {
              title: "Константы и справочники",
              description: "Статусы сделок, коды банков, методы платежа",
              url: "/api/aggregator/api-docs/constants"
            },
            examples: {
              title: "Примеры кода",
              description: "Готовые примеры интеграции на Python и Node.js",
              url: "/api/aggregator/api-docs/examples"
            },
            testing: {
              title: "Тестирование",
              description: "Как тестировать интеграцию через личный кабинет",
              url: "/api/aggregator/api-docs/testing"
            }
          }
        };
      },
      {
        tags: ["aggregator-api-docs"],
        detail: { summary: "Основная информация об интеграции" },
      }
    )

    /* ──────── GET /aggregator/api-docs/summary ──────── */
    .get(
      "/summary",
      async ({ aggregator }) => {
        const baseUrl = aggregator.apiBaseUrl || "https://your-api.example.com";
        
        return {
          title: "📋 Краткая сводка интеграции",
          aggregator: {
            name: aggregator.name,
            baseUrl: baseUrl,
            apiToken: aggregator.apiToken
          },
          quickStart: {
            step1: {
              title: "1. Реализуйте endpoints на своей стороне",
              endpoints: [
                `POST ${baseUrl}/deals - создание сделки с реквизитами`,
                `GET ${baseUrl}/deals/{id} - получение информации о сделке`,
                `POST ${baseUrl}/deals/{id}/disputes - создание спора`
              ]
            },
            step2: {
              title: "2. Настройте отправку callback'ов",
              callbackUrl: "https://chasepay.pro/api/aggregators/callback",
              authentication: `Bearer ${aggregator.callbackToken}`,
              format: "JSON с полями: ourDealId, status, amount, partnerDealId"
            },
            step3: {
              title: "3. Обязательные требования",
              requirements: [
                "SBP: возвращать phoneNumber + bankName в реквизитах",
                "C2C: возвращать cardNumber + bankName в реквизитах", 
                "Время ответа ≤ 2 секунды",
                "HTTP статус 2xx для успешных операций",
                "Поддержка Idempotency-Key"
              ]
            }
          },
          testingUrl: "/api/aggregator/dashboard/test-deal",
          fullDocumentationUrl: "/api/aggregator/api-docs/your-endpoints"
        };
      },
      {
        tags: ["aggregator-api-docs"],
        detail: { summary: "Краткая сводка интеграции" }
      }
    )

    /* ──────── GET /aggregator/api-docs/your-endpoints ──────── */
    .get(
      "/your-endpoints",
      async ({ aggregator }) => {
        const baseUrl = aggregator.apiBaseUrl || "https://your-api.example.com";

        return {
          description: "Endpoints которые вы должны реализовать на своей стороне",
          baseUrl: baseUrl,
          authentication: {
            method: "Bearer Token",
            header: "Authorization: Bearer <YOUR_API_TOKEN>",
            token: "Мы будем передавать ваш API токен в заголовке Authorization",
            yourToken: aggregator.apiToken,
            note: "ВАЖНО: Проверяйте токен на соответствие вашему сохраненному токену для безопасности"
          },
          endpoints: [
            {
              id: "create-deal",
              title: "1. Создание сделки",
              method: "POST",
              path: "/deals",
              fullUrl: `${baseUrl}/deals`,
              description: "Создание новой сделки с обязательным возвратом реквизитов для оплаты",
              headers: {
                "Authorization": "Bearer <YOUR_API_TOKEN>",
                "Content-Type": "application/json",
                "Idempotency-Key": "<UUID> (опционально)"
              },
              request: {
                body: {
                  ourDealId: {
                    type: "string",
                    required: true,
                    description: "ID сделки в системе ChasePay",
                    example: "deal-123-456-789"
                  },
                  paymentMethod: {
                    type: "string",
                    required: true,
                    enum: ["SBP", "C2C"],
                    description: "ОБЯЗАТЕЛЬНО: Метод платежа",
                    example: "SBP"
                  },
                  amount: {
                    type: "number",
                    required: true,
                    description: "Сумма сделки в копейках (100 = 1 рубль)",
                    example: 10000
                  },
                  rate: {
                    type: "number",
                    required: true,
                    description: "Курс для мерчанта (передается как rate, но это merchantRate)",
                    example: 100.5
                  },
                  status: {
                    type: "string",
                    required: true,
                    description: "Начальный статус сделки",
                    example: "CREATED"
                  },
                  expiryDate: {
                    type: "string",
                    required: true,
                    description: "Дата истечения сделки (ISO 8601)",
                    example: "2024-01-29T15:30:00Z"
                  },
                  callbackUrl: {
                    type: "string",
                    required: true,
                    description: "URL для отправки callback'ов",
                    example: "https://chasepay.pro/api/aggregators/callback"
                  },
                  metadata: {
                    type: "object",
                    required: false,
                    description: "Дополнительные данные"
                  }
                },
                example: {
                  ourDealId: "deal-123-456",
                  paymentMethod: "SBP",
                  amount: 10000,
                  rate: 100.5,
                  status: "CREATED",
                  expiryDate: "2024-01-29T15:30:00Z",
                  callbackUrl: "https://chasepay.pro/api/aggregators/callback",
                  metadata: {
                    merchantName: "Example Shop"
                  }
                }
              },
              response: {
                success: {
                  status: 200,
                  description: "Полная запись сделки с реквизитами",
                  body: {
                    accepted: {
                      type: "boolean",
                      required: true,
                      description: "Принята ли сделка",
                      example: true
                    },
                    deal: {
                      type: "object",
                      required: true,
                      description: "ОБЯЗАТЕЛЬНО! Полная запись сделки",
                      properties: {
                        partnerDealId: {
                          type: "string",
                          description: "ID сделки в вашей системе",
                          example: "AGG-2024-001"
                        },
                        ourDealId: {
                          type: "string",
                          description: "ID сделки ChasePay (тот же что пришел)",
                          example: "deal-123-456"
                        },
                        status: {
                          type: "string",
                          description: "Текущий статус сделки",
                          example: "CREATED"
                        },
                        amount: {
                          type: "number",
                          description: "Сумма сделки",
                          example: 10000
                        },
                        paymentMethod: {
                          type: "string",
                          description: "Метод платежа",
                          example: "SBP"
                        },
                        requisites: {
                          type: "object",
                          required: true,
                          description: "ОБЯЗАТЕЛЬНО! Реквизиты для оплаты",
                          properties: {
                            bankType: {
                              type: "string",
                              description: "Код банка из наших констант",
                              example: "SBERBANK"
                            },
                            phoneNumber: {
                              type: "string",
                              description: "Номер телефона (ОБЯЗАТЕЛЬНО для SBP)",
                              example: "+79001234567"
                            },
                            cardNumber: {
                              type: "string",
                              description: "Номер карты (ОБЯЗАТЕЛЬНО для C2C)",
                              example: "4111111111111111"
                            },
                            recipientName: {
                              type: "string",
                              description: "Имя получателя",
                              example: "Иван Иванов"
                            }
                          }
                        },
                        expiryDate: {
                          type: "string",
                          description: "Дата истечения",
                          example: "2024-01-29T15:30:00Z"
                        },
                        createdAt: {
                          type: "string",
                          description: "Дата создания",
                          example: "2024-01-29T14:30:00Z"
                        }
                      }
                    }
                  },
                  example: {
                    accepted: true,
                    deal: {
                      partnerDealId: "AGG-2024-001",
                      ourDealId: "deal-123-456",
                      status: "CREATED",
                      amount: 10000,
                      paymentMethod: "SBP",
                      requisites: {
                        bankType: "SBERBANK",
                        phoneNumber: "+79001234567",
                        recipientName: "Иванов Иван"
                      },
                      expiryDate: "2024-01-29T15:30:00Z",
                      createdAt: "2024-01-29T14:30:00Z"
                    }
                  }
                },
                error: {
                  status: 200,
                  body: {
                    accepted: false,
                    message: "Reason for rejection"
                  }
                }
              },
              requirements: [
                "ОБЯЗАТЕЛЬНО проверяйте токен в заголовке Authorization на соответствие вашему сохраненному токену",
                "Для SBP обязательно вернуть phoneNumber и bankType в реквизитах",
                "Для C2C обязательно вернуть cardNumber и bankType в реквизитах",
                "bankType должен быть из наших констант банков",
                "Возвращайте полную запись сделки, а не только accepted/rejected",
                "Время ответа не должно превышать 2 секунды",
                "При повторном запросе с тем же Idempotency-Key вернуть кешированный результат"
              ]
            },
            {
              id: "get-deal",
              title: "2. Получение информации о сделке",
              method: "GET",
              path: "/deals/{partnerDealId}",
              fullUrl: `${baseUrl}/deals/{partnerDealId}`,
              description: "Получение актуальной информации о сделке",
              headers: {
                "Authorization": "Bearer <YOUR_API_TOKEN>"
              },
              parameters: {
                partnerDealId: {
                  type: "string",
                  in: "path",
                  required: true,
                  description: "ID сделки в вашей системе",
                  example: "AGG-2024-001"
                }
              },
              response: {
                success: {
                  status: 200,
                  body: {
                    id: {
                      type: "string",
                      description: "ID сделки у вас",
                      example: "AGG-2024-001"
                    },
                    ourDealId: {
                      type: "string",
                      description: "ID сделки в ChasePay",
                      example: "deal-123-456"
                    },
                    status: {
                      type: "string",
                      description: "Текущий статус",
                      example: "IN_PROGRESS"
                    },
                    amount: {
                      type: "number",
                      description: "Сумма",
                      example: 10000
                    },
                    paymentMethod: {
                      type: "string",
                      description: "Метод платежа",
                      example: "SBP"
                    },
                    requisites: {
                      type: "object",
                      description: "Реквизиты"
                    },
                    createdAt: {
                      type: "string",
                      description: "Время создания",
                      example: "2024-01-29T12:00:00Z"
                    },
                    expiresAt: {
                      type: "string",
                      description: "Время истечения",
                      example: "2024-01-29T12:30:00Z"
                    }
                  }
                },
                notFound: {
                  status: 404,
                  body: {
                    error: "Deal not found"
                  }
                }
              },
              requirements: [
                "ОБЯЗАТЕЛЬНО проверяйте токен в заголовке Authorization",
                "Возвращайте всю информацию о сделке включая реквизиты",
                "Время ответа не должно превышать 2 секунды"
              ]
            },
            {
              id: "create-dispute",
              title: "3. Создание спора по сделке",
              method: "POST",
              path: "/deals/{partnerDealId}/disputes",
              fullUrl: `${baseUrl}/deals/{partnerDealId}/disputes`,
              description: "Инициация спора по существующей сделке",
              headers: {
                "Authorization": "Bearer <YOUR_API_TOKEN>",
                "Content-Type": "application/json"
              },
              parameters: {
                partnerDealId: {
                  type: "string",
                  in: "path",
                  required: true,
                  description: "ID сделки в вашей системе"
                }
              },
              request: {
                body: {
                  ourDealId: {
                    type: "string",
                    required: true,
                    description: "ID сделки в ChasePay (по которому спор)",
                    example: "deal-123-456"
                  },
                  message: {
                    type: "string",
                    required: true,
                    description: "Сообщение/текст спора",
                    example: "Клиент не получил средства"
                  },
                  attachments: {
                    type: "array",
                    required: true,
                    description: "Массив ссылок на файлы на нашем сервере",
                    items: {
                      type: "string",
                      description: "URL файла на сервере ChasePay"
                    },
                    example: [
                      "https://chasepay.pro/files/dispute-screenshot-1.jpg",
                      "https://chasepay.pro/files/dispute-document-2.pdf"
                    ]
                  }
                },
                example: {
                  ourDealId: "deal-123-456",
                  message: "Клиент не получил средства, прикладываю скриншоты",
                  attachments: [
                    "https://chasepay.pro/files/dispute-screenshot-1.jpg",
                    "https://chasepay.pro/files/dispute-document-2.pdf"
                  ]
                }
              },
              response: {
                success: {
                  status: 200,
                  body: {
                    accepted: true,
                    message: "Dispute created"
                  }
                }
              },
              requirements: [
                "ОБЯЗАТЕЛЬНО проверяйте токен в заголовке Authorization",
                "Принимайте массив ссылок на файлы с нашего сервера",
                "Обрабатывайте сообщение и ID сделки для создания спора",
                "Время ответа не должно превышать 2 секунды"
              ]
            }
          ]
        };
      },
      {
        tags: ["aggregator-api-docs"],
        detail: { summary: "Endpoints которые должен реализовать агрегатор" },
      }
    )

    /* ──────── GET /aggregator/api-docs/our-callbacks ──────── */
    .get(
      "/our-callbacks",
      async ({ aggregator }) => {
        return {
          description: "Как отправлять callback'и в нашу систему",
          authentication: {
            method: "Bearer Token",
            header: "Authorization: Bearer <CALLBACK_TOKEN>",
            token: "Используйте ваш Callback Token для авторизации",
            yourToken: aggregator.callbackToken
          },
          endpoints: [
            {
              title: "1. Одиночный callback",
              method: "POST",
              url: "https://chasepay.pro/api/aggregators/callback",
              headers: {
                "Authorization": `Bearer ${aggregator.callbackToken}`,
                "Content-Type": "application/json"
              },
              body: {
                ourDealId: {
                  type: "string",
                  required: true,
                  description: "ID сделки в ChsPay"
                },
                status: {
                  type: "string",
                  required: false,
                  enum: ["CREATED", "IN_PROGRESS", "READY", "CANCELED", "EXPIRED", "DISPUTE"],
                  description: "Новый статус"
                },
                amount: {
                  type: "number",
                  required: false,
                  description: "Новая сумма (если изменилась)"
                },
                partnerDealId: {
                  type: "string",
                  required: false,
                  description: "Ваш ID сделки"
                },
                reason: {
                  type: "string",
                  required: false,
                  description: "Причина изменения"
                }
              },
              examples: [
                {
                  title: "Обновление статуса",
                  body: {
                    ourDealId: "deal-123",
                    status: "READY"
                  }
                },
                {
                  title: "Отмена с причиной",
                  body: {
                    ourDealId: "deal-456",
                    status: "CANCELED",
                    reason: "User cancelled"
                  }
                }
              ],
              response: {
                success: {
                  status: 200,
                  body: {
                    status: "accepted",
                    ourDealId: "deal-123",
                    message: "Callback processed"
                  }
                }
              }
            },
            {
              title: "2. Массовый callback",
              method: "POST",
              url: "https://chasepay.pro/api/aggregators/callback/batch",
              description: "До 100 callback'ов одним запросом",
              headers: {
                "Authorization": `Bearer ${aggregator.callbackToken}`,
                "Content-Type": "application/json"
              },
              body: {
                type: "array",
                maxItems: 100,
                items: {
                  ourDealId: "string",
                  status: "string",
                  amount: "number",
                  reason: "string"
                }
              },
              example: [
                {
                  ourDealId: "deal-1",
                  status: "READY"
                },
                {
                  ourDealId: "deal-2",
                  status: "CANCELED",
                  reason: "Timeout"
                }
              ],
              response: {
                success: {
                  status: 200,
                  body: {
                    status: "accepted",
                    processed: 2,
                    results: [
                      {
                        ourDealId: "deal-1",
                        status: "accepted",
                        message: "Status updated"
                      }
                    ]
                  }
                }
              }
            }
          ]
        };
      },
      {
        tags: ["aggregator-api-docs"],
        detail: { summary: "Как отправлять callback'и к нам" },
      }
    )

    /* ──────── GET /aggregator/api-docs/callbacks ──────── */
    .get(
      "/callbacks",
      async ({ aggregator }) => {
        return {
          title: "📞 Callbacks - Коллбэки от агрегатора к нам",
          description: "Полное описание как агрегатор должен присылать коллбэки в нашу систему для обновления статусов сделок",
          
          overview: {
            purpose: "Коллбэки используются для уведомления нашей системы об изменениях в статусе сделок на стороне агрегатора",
            frequency: "Отправляйте коллбэк при каждом изменении статуса сделки",
            reliability: "При неуспешной доставке повторите запрос через 30 секунд, затем через 5 минут, затем через час"
          },

          authentication: {
            method: "Bearer Token",
            header: "Authorization: Bearer <CALLBACK_TOKEN>",
            token: aggregator.callbackToken,
            description: "Используйте ваш Callback Token для авторизации всех коллбэков",
            security: "Токен должен храниться безопасно и не логироваться в открытом виде"
          },

          endpoints: [
            {
              id: "single-callback",
              title: "1. Одиночный коллбэк",
              method: "POST",
              url: "https://chasepay.pro/api/aggregators/callback",
              description: "Отправка обновления для одной сделки",
              
              headers: {
                "Authorization": `Bearer ${aggregator.callbackToken}`,
                "Content-Type": "application/json",
                "User-Agent": "YourAggregatorName/1.0"
              },

              requestBody: {
                description: "JSON объект с информацией об обновлении сделки",
                required: ["ourDealId"],
                properties: {
                  ourDealId: {
                    type: "string",
                    required: true,
                    description: "ID сделки в нашей системе (тот, который мы передали при создании)",
                    example: "deal-123-456-789"
                  },
                  status: {
                    type: "string",
                    required: false,
                    enum: ["CREATED", "IN_PROGRESS", "READY", "CANCELED", "EXPIRED", "DISPUTE"],
                    description: "Новый статус сделки",
                    example: "READY"
                  },
                  amount: {
                    type: "number",
                    required: false,
                    description: "Новая сумма сделки в копейках (если изменилась)",
                    example: 10000
                  },
                  partnerDealId: {
                    type: "string",
                    required: false,
                    description: "Ваш ID сделки в системе агрегатора",
                    example: "AGG-2024-001"
                  },
                  reason: {
                    type: "string",
                    required: false,
                    description: "Причина изменения статуса (особенно важно для CANCELED, DISPUTE)",
                    example: "Пользователь отменил платеж"
                  },
                  updatedAt: {
                    type: "string",
                    required: false,
                    description: "Время обновления в формате ISO 8601",
                    example: "2024-01-29T15:30:00Z"
                  },
                  metadata: {
                    type: "object",
                    required: false,
                    description: "Дополнительные данные (опционально)",
                    example: { "processor": "internal", "fee": 50 }
                  }
                },
                
                examples: [
                  {
                    title: "Успешное завершение сделки",
                    description: "Платеж был успешно обработан",
                    body: {
                      ourDealId: "deal-123-456",
                      status: "READY",
                      partnerDealId: "AGG-2024-001"
                    }
                  },
                  {
                    title: "Отмена сделки с причиной",
                    description: "Пользователь отменил платеж",
                    body: {
                      ourDealId: "deal-789-012",
                      status: "CANCELED",
                      reason: "Пользователь отменил операцию",
                      partnerDealId: "AGG-2024-002"
                    }
                  },
                  {
                    title: "Изменение суммы",
                    description: "Сумма сделки была скорректирована",
                    body: {
                      ourDealId: "deal-345-678",
                      status: "IN_PROGRESS",
                      amount: 9500,
                      reason: "Корректировка комиссии"
                    }
                  },
                  {
                    title: "Инициация спора",
                    description: "Возникли проблемы с платежом",
                    body: {
                      ourDealId: "deal-456-789",
                      status: "DISPUTE",
                      reason: "Средства не поступили на счет получателя"
                    }
                  }
                ]
              },

              responses: {
                success: {
                  status: 200,
                  description: "Коллбэк успешно обработан",
                  body: {
                    status: "accepted",
                    ourDealId: "deal-123-456",
                    message: "Callback processed successfully",
                    processedAt: "2024-01-29T15:30:00Z"
                  }
                },
                ignored: {
                  status: 200,
                  description: "Коллбэк проигнорирован (дублирующий или неактуальный)",
                  body: {
                    status: "ignored",
                    ourDealId: "deal-123-456",
                    message: "Callback ignored - no changes needed"
                  }
                },
                error: {
                  status: 400,
                  description: "Ошибка в данных коллбэка",
                  body: {
                    status: "error",
                    message: "Invalid status transition",
                    details: "Cannot change from READY to IN_PROGRESS"
                  }
                },
                notFound: {
                  status: 404,
                  description: "Сделка не найдена",
                  body: {
                    status: "error",
                    message: "Deal not found",
                    ourDealId: "deal-123-456"
                  }
                },
                unauthorized: {
                  status: 401,
                  description: "Неверный токен авторизации",
                  body: {
                    error: "Unauthorized",
                    message: "Invalid callback token"
                  }
                }
              }
            },

            {
              id: "batch-callback",
              title: "2. Массовый коллбэк",
              method: "POST",
              url: "https://chasepay.pro/api/aggregators/callback/batch",
              description: "Отправка обновлений для нескольких сделок одним запросом (до 100 сделок)",
              
              headers: {
                "Authorization": `Bearer ${aggregator.callbackToken}`,
                "Content-Type": "application/json",
                "User-Agent": "YourAggregatorName/1.0"
              },

              requestBody: {
                description: "Массив объектов коллбэков (максимум 100 элементов)",
                type: "array",
                maxItems: 100,
                items: "Такие же объекты как в одиночном коллбэке",
                example: [
                  {
                    ourDealId: "deal-001",
                    status: "READY",
                    partnerDealId: "AGG-001"
                  },
                  {
                    ourDealId: "deal-002", 
                    status: "CANCELED",
                    reason: "Timeout"
                  },
                  {
                    ourDealId: "deal-003",
                    status: "IN_PROGRESS"
                  }
                ]
              },

              responses: {
                success: {
                  status: 200,
                  description: "Массовый коллбэк обработан",
                  body: {
                    status: "processed",
                    totalCount: 3,
                    successCount: 2,
                    ignoredCount: 1,
                    errorCount: 0,
                    results: [
                      {
                        ourDealId: "deal-001",
                        status: "accepted",
                        message: "Status updated"
                      },
                      {
                        ourDealId: "deal-002",
                        status: "accepted", 
                        message: "Deal canceled"
                      },
                      {
                        ourDealId: "deal-003",
                        status: "ignored",
                        message: "No changes needed"
                      }
                    ]
                  }
                }
              }
            }
          ],

          statusTransitions: {
            title: "Допустимые переходы статусов",
            description: "Не все переходы между статусами разрешены. Следуйте этой схеме:",
            transitions: {
              CREATED: {
                allowed: ["IN_PROGRESS", "CANCELED", "EXPIRED"],
                description: "Сделка создана, ожидает обработки"
              },
              IN_PROGRESS: {
                allowed: ["READY", "CANCELED", "EXPIRED", "DISPUTE"],
                description: "Сделка в процессе обработки"
              },
              READY: {
                allowed: ["DISPUTE"],
                description: "Сделка успешно завершена"
              },
              CANCELED: {
                allowed: [],
                description: "Сделка отменена (финальный статус)"
              },
              EXPIRED: {
                allowed: [],
                description: "Сделка истекла (финальный статус)"
              },
              DISPUTE: {
                allowed: ["READY", "CANCELED"],
                description: "По сделке открыт спор"
              }
            }
          },

          bestPractices: {
            title: "Лучшие практики",
            recommendations: [
              {
                title: "Своевременность",
                description: "Отправляйте коллбэки сразу при изменении статуса, не накапливайте их"
              },
              {
                title: "Идемпотентность", 
                description: "Повторная отправка того же коллбэка должна быть безопасной"
              },
              {
                title: "Обработка ошибок",
                description: "При получении 4xx/5xx ответа повторите запрос через 30 сек, 5 мин, 1 час"
              },
              {
                title: "Логирование",
                description: "Логируйте все исходящие коллбэки и ответы от нашей системы"
              },
              {
                title: "Таймауты",
                description: "Устанавливайте таймаут запроса не менее 10 секунд"
              },
              {
                title: "Причины отмены",
                description: "Всегда указывайте причину для статусов CANCELED и DISPUTE"
              }
            ]
          },

          troubleshooting: {
            title: "Решение проблем",
            commonIssues: [
              {
                issue: "401 Unauthorized",
                solution: "Проверьте правильность callback токена в заголовке Authorization"
              },
              {
                issue: "404 Deal not found",
                solution: "Убедитесь что ourDealId соответствует ID из нашей системы"
              },
              {
                issue: "400 Invalid status transition",
                solution: "Проверьте допустимые переходы статусов в таблице выше"
              },
              {
                issue: "Коллбэк игнорируется",
                solution: "Возможно статус уже был обновлен или переход недопустим"
              },
              {
                issue: "Таймаут запроса",
                solution: "Увеличьте таймаут до 10+ секунд, повторите через 30 секунд"
              }
            ]
          },

          testing: {
            title: "Тестирование коллбэков",
            description: "Используйте эти инструменты для тестирования интеграции:",
            tools: [
              {
                name: "curl",
                example: `curl -X POST https://chasepay.pro/api/aggregators/callback \\
  -H "Authorization: Bearer ${aggregator.callbackToken}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "ourDealId": "test-deal-123",
    "status": "READY",
    "partnerDealId": "your-test-id"
  }'`
              },
              {
                name: "Журнал коллбэков",
                description: "Все входящие коллбэки логируются и доступны в личном кабинете агрегатора",
                url: "/api/aggregator/dashboard"
              }
            ]
          }
        };
      },
      {
        tags: ["aggregator-api-docs"],
        detail: { summary: "Полное описание формата коллбэков от агрегатора" },
      }
    )

    /* ──────── GET /aggregator/api-docs/constants ──────── */
    .get(
      "/constants",
      async () => {
        // Получаем все статусы из enum
        const statusDescriptions: Record<Status, string> = {
          CREATED: "Создана",
          IN_PROGRESS: "В обработке", 
          READY: "Завершена успешно",
          CANCELED: "Отменена",
          EXPIRED: "Истекла",
          DISPUTE: "Спор",
          MILK: "Специальный статус"
        };

        // Получаем все банки из enum и констант
        const bankNames: Record<string, string> = {};
        
        // Добавляем банки из констант
        BANKS.forEach(bank => {
          bankNames[bank.code] = bank.label;
        });

        // Добавляем банки из enum, которых нет в константах
        Object.values(BankType).forEach(bankType => {
          if (!bankNames[bankType]) {
            // Простое преобразование для банков без описания
            bankNames[bankType] = bankType.replace(/_/g, ' ').toLowerCase()
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
          }
        });

        return {
          statuses: Object.entries(statusDescriptions).reduce((acc, [code, description]) => {
            acc[code] = { code, description };
            return acc;
          }, {} as Record<string, { code: string; description: string }>),
          
          banks: Object.entries(bankNames).reduce((acc, [code, name]) => {
            acc[code] = { code, name };
            return acc;
          }, {} as Record<string, { code: string; name: string }>),
          
          paymentMethods: {
            SBP: { 
              code: "SBP", 
              description: "Система быстрых платежей (по номеру телефона)",
              requiredFields: ["phoneNumber", "bankName"]
            },
            C2C: { 
              code: "C2C", 
              description: "Card to Card (перевод с карты на карту)",
              requiredFields: ["cardNumber", "bankName"]
            }
          },
          
          requirements: {
            sla: {
              maxResponseTime: "2000ms",
              recommendedResponseTime: "< 500ms",
              httpStatus: "2xx для успешных операций"
            },
            requisites: {
              SBP: "Обязательно поля: phoneNumber, bankName",
              C2C: "Обязательно поля: cardNumber, bankName"
            },
            security: {
              protocol: "HTTPS only",
              tokens: "Храните токены безопасно, не логируйте их",
              headers: "Authorization: Bearer <your-api-token>"
            }
          }
        };
      },
      {
        tags: ["aggregator-api-docs"],
        detail: { summary: "Все константы системы: статусы, банки, методы платежа" },
      }
    )

    /* ──────── GET /aggregator/api-docs/examples ──────── */
    .get(
      "/examples",
      async () => {
        return {
          description: "Примеры реализации",
          languages: ["Python", "Node.js", "PHP"],
          examples: {
            python: {
              createDeal: `from flask import Flask, request, jsonify
import uuid

app = Flask(__name__)

@app.route('/deals', methods=['POST'])
def create_deal():
    auth = request.headers.get('Authorization')
    if not auth or not auth.startswith('Bearer '):
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.json
    payment_method = data.get('paymentMethod')
    
    # Генерация реквизитов
    requisites = {
        'bankName': 'Сбербанк',
        'recipientName': 'ООО Компания'
    }
    
    if payment_method == 'SBP':
        requisites['phoneNumber'] = '+79001234567'
    elif payment_method == 'C2C':
        requisites['cardNumber'] = '4111111111111111'
    
    return jsonify({
        'accepted': True,
        'partnerDealId': f"AGG-{uuid.uuid4()}",
        'requisites': requisites
    })`,
              
              sendCallback: `import requests

def send_callback(deal_id, status):
    url = "https://chasepay.pro/api/aggregators/callback"
    headers = {
        "Authorization": "Bearer YOUR_CALLBACK_TOKEN",
        "Content-Type": "application/json"
    }
    data = {
        "ourDealId": deal_id,
        "status": status
    }
    response = requests.post(url, json=data, headers=headers)
    return response.json()`
            },
            nodejs: {
              createDeal: `app.post('/deals', (req, res) => {
    const { paymentMethod, amount } = req.body;
    
    const requisites = {
        bankName: 'Сбербанк',
        recipientName: 'ООО Компания'
    };
    
    if (paymentMethod === 'SBP') {
        requisites.phoneNumber = '+79001234567';
    } else if (paymentMethod === 'C2C') {
        requisites.cardNumber = '4111111111111111';
    }
    
    res.json({
        accepted: true,
        partnerDealId: \`AGG-\${Date.now()}\`,
        requisites
    });
});`,
              
              sendCallback: `const axios = require('axios');

async function sendCallback(dealId, status) {
    const response = await axios.post(
        'https://chasepay.pro/api/aggregators/callback',
        {
            ourDealId: dealId,
            status: status
        },
        {
            headers: {
                'Authorization': 'Bearer YOUR_CALLBACK_TOKEN'
            }
        }
    );
    return response.data;
}`
            }
          }
        };
      },
      {
        tags: ["aggregator-api-docs"],
        detail: { summary: "Примеры кода" },
      }
    )

    /* ──────── GET /aggregator/api-docs/endpoints ──────── */
    .get(
      "/endpoints",
      async ({ aggregator }) => {
        const baseUrl = aggregator.apiBaseUrl || "https://your-api.example.com";
        
        return {
          title: "Endpoints которые должен реализовать агрегатор",
          baseUrl: baseUrl,
          endpoints: [
            {
              method: "POST",
              path: "/deals",
              url: `${baseUrl}/deals`,
              description: "Создание сделки в системе агрегатора",
              headers: {
                "Authorization": `Bearer ${aggregator.apiToken}`,
                "Content-Type": "application/json",
                "Idempotency-Key": "optional-uuid-v4"
              },
              requestBody: {
                ourDealId: "string (required) - ID сделки в нашей системе",
                status: "string (required) - Начальный статус (обычно 'PENDING')",
                amount: "number (required) - Сумма сделки в рублях",
                merchantRate: "number (required) - Комиссия мерчанта",
                paymentMethod: "string (required) - Метод платежа: 'SBP' или 'C2C'",
                bankType: "string (optional) - Код банка для C2C операций",
                partnerDealId: "string (optional) - Ваш ID сделки (если заранее известен)",
                callbackUrl: "string (required) - URL для коллбеков: https://chasepay.pro/api/aggregators/callback"
              },
              responseBody: {
                accepted: "boolean (required) - Принята ли сделка",
                partnerDealId: "string (optional but recommended) - Ваш ID сделки",
                message: "string (optional) - Сообщение об ошибке или статусе",
                requisites: {
                  _description: "object (required if accepted=true) - Реквизиты для оплаты",
                  bankName: "string - Название банка",
                  cardNumber: "string - Номер карты (для C2C)",
                  phoneNumber: "string - Номер телефона (для SBP)",
                  recipientName: "string - Имя получателя"
                },
                dealDetails: {
                  _description: "object (optional) - Дополнительная информация о сделке",
                  expiresAt: "string (ISO-8601) - Время истечения сделки",
                  minAmount: "number - Минимальная сумма",
                  maxAmount: "number - Максимальная сумма"
                }
              },
              slaRequirement: "HTTP 2xx и время ответа ≤ 2 секунды"
            },
            {
              method: "GET", 
              path: "/deals/{partnerDealId}",
              url: `${baseUrl}/deals/{partnerDealId}`,
              description: "Получение информации о сделке",
              headers: {
                "Authorization": `Bearer ${aggregator.apiToken}`
              },
              responseBody: {
                partnerDealId: "string - Ваш ID сделки",
                ourDealId: "string - Наш ID сделки", 
                status: "string - Текущий статус сделки",
                amount: "number - Сумма сделки",
                createdAt: "string (ISO-8601) - Время создания",
                updatedAt: "string (ISO-8601) - Время последнего обновления",
                requisites: "object - Реквизиты для оплаты",
                dealDetails: "object - Детали сделки"
              }
            },
            {
              method: "POST",
              path: "/deals/{partnerDealId}/disputes", 
              url: `${baseUrl}/deals/{partnerDealId}/disputes`,
              description: "Создание спора по сделке",
              headers: {
                "Authorization": `Bearer ${aggregator.apiToken}`,
                "Content-Type": "application/json"
              },
              requestBody: {
                ourDealId: "string (required) - Наш ID сделки",
                message: "string (required) - Текст спора",
                attachments: "array of string URLs (required) - Ссылки на файлы"
              },
              responseBody: {
                accepted: "boolean - Принят ли спор",
                message: "string - Сообщение о результате"
              }
            }
          ]
        };
      },
      {
        tags: ["aggregator-api-docs"],
        detail: { summary: "Endpoints для реализации агрегатором" }
      }
    )

    /* ──────── GET /aggregator/api-docs/callback-format ──────── */
    .get(
      "/callback-format",
      async ({ aggregator }) => {
        return {
          title: "Формат callback'ов в нашу систему",
          callbackUrl: "https://chasepay.pro/api/aggregators/callback",
          authentication: {
            header: "Authorization",
            value: `Bearer ${aggregator.callbackToken}`,
            alternative: {
              header: "X-Aggregator-Token",
              value: aggregator.callbackToken
            }
          },
          singleCallback: {
            method: "POST",
            url: "https://chasepay.pro/api/aggregators/callback",
            headers: {
              "Authorization": `Bearer ${aggregator.callbackToken}`,
              "Content-Type": "application/json"
            },
            body: {
              ourDealId: "string (required) - Наш ID сделки",
              status: "string (required) - Новый статус из справочника",
              amount: "number (optional) - Новая сумма (если изменилась)",
              partnerDealId: "string (optional) - Ваш ID сделки",
              updatedAt: "string (optional, ISO-8601) - Время обновления",
              reason: "string (optional) - Причина изменения статуса",
              metadata: "object (optional) - Дополнительные данные"
            },
            response: {
              status: "string - 'accepted' | 'ignored' | 'error'",
              message: "string - Описание результата",
              ourDealId: "string - Наш ID сделки"
            }
          },
          batchCallback: {
            method: "POST", 
            url: "https://chasepay.pro/api/aggregators/callback",
            body: "array of callback objects",
            response: "array of result objects"
          },
          idempotency: "Повторные callback'и с теми же данными игнорируются"
        };
      },
      {
        tags: ["aggregator-api-docs"],
        detail: { summary: "Формат callback'ов" }
      }
    )

    /* ──────── GET /aggregator/api-docs/integration-flow ──────── */
    .get(
      "/integration-flow",
      async ({ aggregator }) => {
        return {
          title: "Схема интеграции и поток данных",
          flow: [
            {
              step: 1,
              title: "Создание сделки",
              description: "Мы отправляем POST запрос на ваш endpoint /deals",
              direction: "Мы → Агрегатор",
              endpoint: `${aggregator.apiBaseUrl}/deals`,
              data: "ourDealId, amount, paymentMethod, bankType, callbackUrl"
            },
            {
              step: 2,
              title: "Ответ с реквизитами",
              description: "Вы возвращаете реквизиты для оплаты",
              direction: "Агрегатор → Мы",
              data: "accepted=true, partnerDealId, requisites (bankName, cardNumber/phoneNumber)"
            },
            {
              step: 3,
              title: "Обновления статуса",
              description: "Вы отправляете callback'и при изменении статуса сделки",
              direction: "Агрегатор → Мы",
              endpoint: "https://chasepay.pro/api/aggregators/callback",
              data: "ourDealId, status, amount, partnerDealId"
            },
            {
              step: 4,
              title: "Уведомление мерчанта",
              description: "Мы автоматически уведомляем мерчанта об изменениях",
              direction: "Мы → Мерчант",
              data: "Стандартный формат callback'а мерчанта"
            }
          ],
          paymentMethods: {
            SBP: {
              description: "Система быстрых платежей",
              requiredRequisites: ["phoneNumber", "bankName"],
              optionalRequisites: ["recipientName"]
            },
            C2C: {
              description: "Перевод с карты на карту", 
              requiredRequisites: ["cardNumber", "bankName"],
              optionalRequisites: ["recipientName"],
              bankTypeRequired: true
            }
          },
          errorHandling: {
            slaViolation: "Если ответ > 2 сек или не HTTP 2xx - переходим к следующему агрегатору",
            rejectedDeal: "Если accepted=false - пробуем следующего агрегатора по приоритету",
            failedCallback: "Неуспешные callback'и логируются, но не блокируют процесс"
          }
        };
      },
      {
        tags: ["aggregator-api-docs"],
        detail: { summary: "Схема интеграции" }
      }
    )

    /* ──────── GET /aggregator/api-docs/testing ──────── */
    .get(
      "/testing",
      async ({ aggregator }) => {
        return {
          description: "Инструкции по тестированию интеграции",
          testEndpoint: aggregator.apiBaseUrl ? `${aggregator.apiBaseUrl}/deals` : "Не настроен",
          steps: [
            {
              step: 1,
              title: "Настройте Base URL",
              description: "В личном кабинете укажите базовый URL вашего API",
              currentValue: aggregator.apiBaseUrl || "Не указан"
            },
            {
              step: 2,
              title: "Реализуйте endpoint создания сделки",
              description: "POST /deals должен возвращать реквизиты",
              requirements: [
                "Для SBP - номер телефона",
                "Для C2C - номер карты",
                "Время ответа < 2 секунд"
              ]
            },
            {
              step: 3,
              title: "Протестируйте через личный кабинет",
              description: "Используйте кнопку 'Отправить тестовую сделку'",
              checks: [
                "Проверка времени ответа",
                "Проверка наличия реквизитов",
                "Проверка формата ответа"
              ]
            },
            {
              step: 4,
              title: "Отправьте тестовый callback",
              description: "Проверьте отправку callback'ов в нашу систему",
              example: {
                url: "https://chasepay.pro/api/aggregators/callback",
                headers: {
                  "Authorization": `Bearer ${aggregator.callbackToken}`
                },
                body: {
                  ourDealId: "test-deal-123",
                  status: "READY"
                }
              }
            },
            {
              step: 5,
              title: "Проверьте журнал интеграций",
              description: "Все запросы логируются и доступны в личном кабинете"
            }
          ],
          testScenarios: [
            {
              name: "SBP платеж",
              description: "Тест создания SBP сделки",
              request: {
                paymentMethod: "SBP",
                amount: 1000
              },
              expectedResponse: {
                requisites: {
                  phoneNumber: "+7XXXXXXXXXX"
                }
              }
            },
            {
              name: "C2C платеж",
              description: "Тест создания C2C сделки",
              request: {
                paymentMethod: "C2C",
                amount: 2000
              },
              expectedResponse: {
                requisites: {
                  cardNumber: "XXXXXXXXXXXXXXXX"
                }
              }
            }
          ]
        };
      },
      {
        tags: ["aggregator-api-docs"],
        detail: { summary: "Инструкции по тестированию" },
      }
    );
