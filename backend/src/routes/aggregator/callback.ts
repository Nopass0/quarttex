import { Elysia, t } from "elysia";
import { db } from "@/db";
import ErrorSchema from "@/types/error";
import { aggregatorApiGuard } from "@/middleware/aggregatorGuard";
import { sendTransactionCallbacks } from "@/utils/notify";
import { Status } from "@prisma/client";

/**
 * API эндпоинт для получения колбэков от агрегаторов
 * Используется агрегаторами для уведомления об изменениях статуса транзакций
 */
export default (app: Elysia) =>
  app
    /* ──────── POST /aggregator/callback ──────── */
    .group("/callback", (app) =>
      app.use(aggregatorApiGuard()).post(
        "",
        async ({ aggregator, body, headers, error }) => {
          const { type, transactionId, data } = body;
          const startTime = Date.now();

          try {
            console.log(
              `[AggregatorCallback] Received callback from ${aggregator.name}:`,
              {
                type,
                transactionId,
                data,
              }
            );

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
              console.error(
                `[AggregatorCallback] Transaction not found or doesn't belong to aggregator:`,
                {
                  transactionId,
                  aggregatorId: aggregator.id,
                }
              );
              return error(404, { error: "Транзакция не найдена" });
            }

            if (type === "transaction_status_update") {
              // Маппим CREATED в IN_PROGRESS согласно бизнес-правилу
              const incoming = (data.status || "").toString().toUpperCase();
              const mapped = incoming === "CREATED" ? "IN_PROGRESS" : incoming;
              const newStatus = mapped as Status;

              // Проверяем валидность статуса
              const validStatuses = [
                "CREATED",
                "IN_PROGRESS",
                "READY",
                "CANCELED",
                "EXPIRED",
                "DISPUTE",
              ];
              if (!validStatuses.includes(newStatus)) {
                return error(400, { error: "Недопустимый статус" });
              }

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

              // Обновляем метрики агрегатора
              const { aggregatorMetricsService } = await import('@/services/aggregator-metrics.service');
              await aggregatorMetricsService.updateMetricsOnStatusChange(
                transactionId,
                transaction.status as any,
                newStatus
              );

              console.log(`[AggregatorCallback] Transaction status updated:`, {
                transactionId,
                oldStatus: transaction.status,
                newStatus,
                aggregatorName: aggregator.name,
              });

              // Обрабатываем финансовые операции
              if (newStatus === "READY" && transaction.status !== "READY") {
                await db.$transaction(async (prisma) => {
                  // Начисляем мерчанту (упрощенная логика)
                  if (transaction.type === "IN") {
                    // Для агрегаторских транзакций используем фиксированный курс
                    const rate = transaction.rate || 100; // fallback rate
                    const merchantCredit = transaction.amount / rate;

                    await prisma.merchant.update({
                      where: { id: transaction.merchantId },
                      data: {
                        balanceUsdt: { increment: merchantCredit },
                      },
                    });

                    // Списываем с баланса агрегатора
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
                console.log(
                  `[AggregatorCallback] Merchant callback sent for transaction ${transactionId}`
                );
              } catch (callbackError) {
                console.error(
                  `[AggregatorCallback] Error sending merchant callback:`,
                  callbackError
                );
              }

              return {
                success: true,
                message: "Статус транзакции обновлен",
              };
            }

            if (type === "dispute_created") {
              // Создаем спор
              const dispute = await db.aggregatorDispute.create({
                data: {
                  transactionId,
                  aggregatorId: aggregator.id,
                  merchantId: transaction.merchantId,
                  subject: data.subject || "Спор по транзакции",
                  description: data.description,
                  status: "OPEN",
                },
              });

              console.log(`[AggregatorCallback] Dispute created:`, {
                disputeId: dispute.id,
                transactionId,
                aggregatorName: aggregator.name,
              });

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
                message: "Спор создан",
                disputeId: dispute.id,
              };
            }

            return error(400, { error: "Неизвестный тип колбэка" });
          } catch (e) {
            console.error(`[AggregatorCallback] Error processing callback:`, e);
            return error(500, { error: "Ошибка обработки колбэка" });
          } finally {
            // Log callback to API logs
            const responseTime = Date.now() - startTime;
            
            try {
              await db.aggregatorIntegrationLog.create({
                data: {
                  aggregatorId: aggregator.id,
                  direction: 'IN' as any,
                  eventType: `callback_${type}`,
                  method: 'POST',
                  url: '/api/aggregator/callback',
                  headers: {
                    'x-aggregator-api-token': '[PRESENT]',
                    'content-type': headers['content-type'] || 'application/json'
                  },
                  requestBody: body as any,
                  responseBody: { success: true } as any,
                  statusCode: 200,
                  responseTimeMs: responseTime,
                  ourDealId: transactionId,
                  error: null
                }
              });
            } catch (logError) {
              console.error('[AggregatorCallback] Failed to log callback:', logError);
            }
          }
        },
        {
          tags: ["aggregator-api"],
          detail: { summary: "Колбэк от агрегатора" },
          body: t.Object({
            type: t.Union([
              t.Literal("transaction_status_update"),
              t.Literal("dispute_created"),
            ]),
            transactionId: t.String(),
            data: t.Object({
              status: t.Optional(t.String()),
              subject: t.Optional(t.String()),
              description: t.Optional(t.String()),
              timestamp: t.Optional(t.String()),
            }),
          }),
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
    );
