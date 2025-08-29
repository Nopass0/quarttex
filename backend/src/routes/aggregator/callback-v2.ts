import { Elysia, t } from "elysia";
import { db } from "@/db";
import ErrorSchema from "@/types/error";
import { aggregatorApiGuard } from "@/middleware/aggregatorGuard";
import { sendTransactionCallbacks } from "@/utils/notify";
import { Status } from "@prisma/client";

/**
 * Обновленный API эндпоинт для получения колбэков от агрегаторов
 * Поддерживает:
 * - Обновление статуса транзакций
 * - Изменение суммы транзакций
 * - Инициацию диспутов с файлами и сообщениями
 * - Массовые обновления транзакций
 * - Логирование всех callback'ов
 */

// Типы callback'ов
const CallbackType = t.Union([
  t.Literal("status_update"),
  t.Literal("amount_change"),
  t.Literal("dispute_init"),
  t.Literal("dispute_message"),
]);

// Схема для одиночного callback'а
const SingleCallbackSchema = t.Object({
  type: CallbackType,
  transactionId: t.String({
    description: "UUID транзакции в нашей системе",
  }),
  data: t.Object({
    // Для обновления статуса
    status: t.Optional(
      t.Union([
        t.Literal("CREATED"),
        t.Literal("IN_PROGRESS"),
        t.Literal("READY"),
        t.Literal("CANCELED"),
        t.Literal("EXPIRED"),
        t.Literal("DISPUTE"),
      ])
    ),
    // Для изменения суммы
    amount: t.Optional(t.Number({ description: "Новая сумма транзакции" })),
    // Для диспута
    disputeSubject: t.Optional(t.String()),
    disputeDescription: t.Optional(t.String()),
    disputeMessage: t.Optional(t.String()),
    disputeFileUrls: t.Optional(
      t.Array(t.String({ description: "Массив ссылок на файлы" }))
    ),
    // Общие поля
    timestamp: t.Optional(t.String()),
  }),
});

// Схема для массового callback'а
const BatchCallbackSchema = t.Object({
  callbacks: t.Array(SingleCallbackSchema, {
    minItems: 1,
    maxItems: 100,
    description: "Массив callback'ов для обработки",
  }),
});

// Функция логирования callback'а
async function logCallback(
  aggregatorId: string,
  type: string,
  transactionId: string | null,
  payload: any,
  response: any,
  statusCode: number,
  error?: string
) {
  try {
    await db.aggregatorCallbackLog.create({
      data: {
        aggregatorId,
        type,
        transactionId,
        payload,
        response: JSON.stringify(response),
        statusCode,
        error,
      },
    });
  } catch (e) {
    console.error("[CallbackLog] Error logging callback:", e);
  }
}

// Обработка одиночного callback'а
async function processSingleCallback(
  aggregator: any,
  callback: any
): Promise<{ success: boolean; message: string; disputeId?: string; error?: string }> {
  const { type, transactionId, data } = callback;

  try {
    // Проверяем, что транзакция принадлежит этому агрегатору
    const transaction = await db.transaction.findFirst({
      where: {
        id: transactionId,
        aggregatorId: aggregator.id,
      },
      include: {
        merchant: true,
        method: true,
      },
    });

    if (!transaction) {
      return {
        success: false,
        message: "Транзакция не найдена или не принадлежит агрегатору",
        error: "TRANSACTION_NOT_FOUND",
      };
    }

    // Обработка по типу callback'а
    switch (type) {
      case "status_update": {
        if (!data.status) {
          return {
            success: false,
            message: "Статус не указан",
            error: "STATUS_REQUIRED",
          };
        }

        const newStatus = data.status as Status;

        // Обновляем статус транзакции
        const updatedTransaction = await db.transaction.update({
          where: { id: transactionId },
          data: {
            status: newStatus,
            updatedAt: new Date(),
            ...(newStatus === "READY" && { acceptedAt: new Date() }),
          },
          include: {
            merchant: true,
            method: true,
          },
        });

        // Обрабатываем финансовые операции при завершении транзакции
        if (newStatus === "READY" && transaction.status !== "READY") {
          await db.$transaction(async (prisma) => {
            if (transaction.type === "IN") {
              const rate = transaction.rate || 100;
              const merchantCredit = transaction.amount / rate;

              await prisma.merchant.update({
                where: { id: transaction.merchantId },
                data: {
                  balanceUsdt: { increment: merchantCredit },
                },
              });

              await prisma.aggregator.update({
                where: { id: aggregator.id },
                data: {
                  balanceUsdt: { decrement: merchantCredit },
                },
              });
            }
          });
        }

        // Отправляем колбэк мерчанту
        try {
          await sendTransactionCallbacks(updatedTransaction);
        } catch (callbackError) {
          console.error("[Callback] Error sending merchant callback:", callbackError);
        }

        return {
          success: true,
          message: `Статус транзакции обновлен на ${newStatus}`,
        };
      }

      case "amount_change": {
        if (!data.amount) {
          return {
            success: false,
            message: "Новая сумма не указана",
            error: "AMOUNT_REQUIRED",
          };
        }

        // Обновляем сумму транзакции
        const updatedTransaction = await db.transaction.update({
          where: { id: transactionId },
          data: {
            amount: data.amount,
            updatedAt: new Date(),
          },
          include: {
            merchant: true,
            method: true,
          },
        });

        // Отправляем колбэк мерчанту об изменении суммы
        try {
          await sendTransactionCallbacks(updatedTransaction);
        } catch (callbackError) {
          console.error("[Callback] Error sending merchant callback:", callbackError);
        }

        return {
          success: true,
          message: `Сумма транзакции изменена на ${data.amount}`,
        };
      }

      case "dispute_init": {
        if (!data.disputeSubject) {
          return {
            success: false,
            message: "Тема спора не указана",
            error: "DISPUTE_SUBJECT_REQUIRED",
          };
        }

        // Создаем спор
        const dispute = await db.aggregatorDispute.create({
          data: {
            transactionId,
            aggregatorId: aggregator.id,
            merchantId: transaction.merchantId,
            subject: data.disputeSubject,
            description: data.disputeDescription || "",
            status: "OPEN",
          },
        });

        // Если есть начальное сообщение и/или файлы
        if (data.disputeMessage || data.disputeFileUrls?.length) {
          await db.aggregatorDisputeMessage.create({
            data: {
              disputeId: dispute.id,
              senderId: aggregator.id,
              senderType: "AGGREGATOR",
              message: data.disputeMessage || "Инициация спора",
              fileUrls: data.disputeFileUrls || [],
            },
          });
        }

        // Обновляем статус транзакции на DISPUTE
        await db.transaction.update({
          where: { id: transactionId },
          data: {
            status: "DISPUTE",
            updatedAt: new Date(),
          },
        });

        return {
          success: true,
          message: "Спор успешно создан",
          disputeId: dispute.id,
        };
      }

      case "dispute_message": {
        // Находим активный спор по транзакции
        const dispute = await db.aggregatorDispute.findFirst({
          where: {
            transactionId,
            aggregatorId: aggregator.id,
            status: { in: ["OPEN", "IN_PROGRESS"] },
          },
        });

        if (!dispute) {
          return {
            success: false,
            message: "Активный спор не найден",
            error: "DISPUTE_NOT_FOUND",
          };
        }

        // Добавляем сообщение в спор
        await db.aggregatorDisputeMessage.create({
          data: {
            disputeId: dispute.id,
            senderId: aggregator.id,
            senderType: "AGGREGATOR",
            message: data.disputeMessage || "",
            fileUrls: data.disputeFileUrls || [],
          },
        });

        return {
          success: true,
          message: "Сообщение добавлено в спор",
          disputeId: dispute.id,
        };
      }

      default:
        return {
          success: false,
          message: "Неизвестный тип callback'а",
          error: "UNKNOWN_CALLBACK_TYPE",
        };
    }
  } catch (e) {
    console.error("[Callback] Error processing callback:", e);
    return {
      success: false,
      message: "Ошибка обработки callback'а",
      error: "PROCESSING_ERROR",
    };
  }
}

export default (app: Elysia) =>
  app
    .group("/callback", (app) =>
      app
        .use(aggregatorApiGuard())
        
        /* ──────── POST /aggregator/callback - Одиночный callback ──────── */
        .post(
          "",
          async ({ aggregator, body, error }) => {
            const startTime = Date.now();
            let response: any;
            let statusCode = 200;
            let errorMessage: string | undefined;

            try {
              console.log(
                `[Callback] Received single callback from ${aggregator.name}:`,
                body
              );

              // Обрабатываем callback
              response = await processSingleCallback(aggregator, body);
              
              if (!response.success) {
                statusCode = response.error === "TRANSACTION_NOT_FOUND" ? 404 : 400;
              }

              // Логируем callback
              await logCallback(
                aggregator.id,
                body.type,
                body.transactionId,
                body,
                response,
                statusCode,
                errorMessage
              );

              if (!response.success && statusCode !== 200) {
                return error(statusCode, response);
              }

              return response;
            } catch (e) {
              errorMessage = e instanceof Error ? e.message : "Unknown error";
              response = { success: false, message: "Внутренняя ошибка сервера" };
              statusCode = 500;

              await logCallback(
                aggregator.id,
                body.type,
                body.transactionId,
                body,
                response,
                statusCode,
                errorMessage
              );

              return error(500, response);
            }
          },
          {
            tags: ["aggregator-api"],
            detail: { summary: "Одиночный callback от агрегатора" },
            body: SingleCallbackSchema,
            response: {
              200: t.Object({
                success: t.Boolean(),
                message: t.String(),
                disputeId: t.Optional(t.String()),
              }),
              400: ErrorSchema,
              404: ErrorSchema,
              500: ErrorSchema,
            },
          }
        )

        /* ──────── POST /aggregator/callback/batch - Массовые callback'и ──────── */
        .post(
          "/batch",
          async ({ aggregator, body, error }) => {
            const { callbacks } = body;
            const results = [];
            let hasErrors = false;

            console.log(
              `[Callback] Received batch callbacks (${callbacks.length}) from ${aggregator.name}`
            );

            // Обрабатываем каждый callback
            for (const callback of callbacks) {
              const result = await processSingleCallback(aggregator, callback);
              
              // Логируем каждый callback
              await logCallback(
                aggregator.id,
                callback.type,
                callback.transactionId,
                callback,
                result,
                result.success ? 200 : 400,
                result.error
              );

              results.push({
                transactionId: callback.transactionId,
                ...result,
              });

              if (!result.success) {
                hasErrors = true;
              }
            }

            return {
              success: !hasErrors,
              message: hasErrors
                ? "Некоторые callback'и обработаны с ошибками"
                : "Все callback'и успешно обработаны",
              results,
              processed: results.length,
              successful: results.filter((r) => r.success).length,
              failed: results.filter((r) => !r.success).length,
            };
          },
          {
            tags: ["aggregator-api"],
            detail: { summary: "Массовые callback'и от агрегатора" },
            body: BatchCallbackSchema,
            response: {
              200: t.Object({
                success: t.Boolean(),
                message: t.String(),
                results: t.Array(
                  t.Object({
                    transactionId: t.String(),
                    success: t.Boolean(),
                    message: t.String(),
                    disputeId: t.Optional(t.String()),
                    error: t.Optional(t.String()),
                  })
                ),
                processed: t.Number(),
                successful: t.Number(),
                failed: t.Number(),
              }),
              400: ErrorSchema,
              500: ErrorSchema,
            },
          }
        )

        /* ──────── GET /aggregator/callback/logs - История callback'ов ──────── */
        .get(
          "/logs",
          async ({ aggregator, query }) => {
            const page = Number(query.page) || 1;
            const limit = Math.min(Number(query.limit) || 20, 100);
            const skip = (page - 1) * limit;

            const where: any = {
              aggregatorId: aggregator.id,
            };

            // Фильтры
            if (query.transactionId) {
              where.transactionId = query.transactionId;
            }

            if (query.type) {
              where.type = query.type;
            }

            if (query.dateFrom) {
              where.createdAt = { gte: new Date(query.dateFrom) };
            }

            if (query.dateTo) {
              where.createdAt = {
                ...where.createdAt,
                lte: new Date(query.dateTo),
              };
            }

            const [logs, total] = await Promise.all([
              db.aggregatorCallbackLog.findMany({
                where,
                take: limit,
                skip,
                orderBy: { createdAt: "desc" },
                include: {
                  transaction: {
                    select: {
                      id: true,
                      orderId: true,
                      amount: true,
                      status: true,
                    },
                  },
                },
              }),
              db.aggregatorCallbackLog.count({ where }),
            ]);

            return {
              data: logs.map((log) => ({
                ...log,
                createdAt: log.createdAt.toISOString(),
              })),
              pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
              },
            };
          },
          {
            tags: ["aggregator-api"],
            detail: { summary: "История callback'ов агрегатора" },
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              transactionId: t.Optional(t.String()),
              type: t.Optional(t.String()),
              dateFrom: t.Optional(t.String()),
              dateTo: t.Optional(t.String()),
            }),
            response: {
              200: t.Object({
                data: t.Array(t.Any()),
                pagination: t.Object({
                  page: t.Number(),
                  limit: t.Number(),
                  total: t.Number(),
                  totalPages: t.Number(),
                }),
              }),
            },
          }
        )
    );
