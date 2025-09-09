// src/services/ExpiredTransactionWatcher.ts
import { BaseService } from "./BaseService";
import { db } from "@/db";
import { Status } from "@prisma/client";
import { sendTransactionCallbacks } from "@/utils/notify";
import { truncate2 } from "@/utils/rounding";

/**
 * ExpiredTransactionWatcher
 *
 * • Каждую минуту проверяет таблицу transaction.
 * • Если expired_at < now и статус ещё не EXPIRED и не MILK — обновляет статус.
 * • Логирует количество «протухших» транзакций.
 */
export default class ExpiredTransactionWatcher extends BaseService {
  protected interval = 10_000; // 10 секунд для более быстрой обработки

  // Публичные поля для мониторинга
  private totalProcessed = 0;
  private lastProcessedCount = 0;
  private totalUnfrozenAmount = 0;
  private lastRunTime = new Date();
  private enabled = true;

  constructor() {
    super({
      displayName: "Наблюдатель просроченных транзакций",
      description:
        "Автоматически отмечает просроченные транзакции и размораживает средства трейдеров",
      enabled: true,
      autoStart: true,
      tags: ["transactions", "cleanup", "critical"],
    });

    this.customSettings = {
      enabled: true,
      batchSize: 50,
      alertOnError: true,
    };
  }

  /** Инициализация сервиса */
  protected async onStart(): Promise<void> {
    await this.logInfo("Expired Transaction Watcher starting", {
      interval: this.interval,
      checkStatuses: ["IN_PROGRESS"],
    });
  }

  /** Периодическая проверка просроченных транзакций */
  protected async tick(): Promise<void> {
    if (!this.enabled) {
      await this.logDebug("Service is disabled, skipping tick");
      return;
    }

    const startTime = Date.now();
    this.lastRunTime = new Date();

    try {
      const now = new Date();

      // Находим все просроченные транзакции IN_PROGRESS
      const expiredTransactions = await db.transaction.findMany({
        where: {
          expired_at: { lt: now },
          status: Status.IN_PROGRESS,
        },
        include: {
          trader: true,
          method: true,
          merchant: true,
        },
        orderBy: {
          expired_at: "asc", // Обрабатываем сначала те, что истекли раньше
        },
        take: 100, // Ограничиваем количество для пакетной обработки
      });

      this.lastProcessedCount = expiredTransactions.length;

      if (expiredTransactions.length === 0) {
        await this.logDebug("No expired transactions found");
        return;
      }

      await this.logInfo(
        `Found ${expiredTransactions.length} expired transactions to process`,
        {
          transactionIds: expiredTransactions.map((tx) => tx.id),
          expiredSince: expiredTransactions.map((tx) => ({
            id: tx.id,
            expiredAt: tx.expired_at,
            expiredFor: Math.floor(
              (now.getTime() - tx.expired_at.getTime()) / 1000 / 60
            ), // минуты
          })),
        }
      );

      let processedCount = 0;
      let unfrozenAmountTotal = 0;
      const processedTransactions = [];

      // Обрабатываем каждую транзакцию
      for (const tx of expiredTransactions) {
        try {
          let unfrozenAmount = 0;

          await db.$transaction(async (prisma) => {
            // Обновляем статус транзакции
            await prisma.transaction.update({
              where: { id: tx.id },
              data: { status: Status.EXPIRED },
            });

            // Отправляем callback после смены статуса на EXPIRED
            // Делаем это асинхронно, чтобы не блокировать транзакцию БД
            setImmediate(async () => {
              try {
                await sendTransactionCallbacks(tx, Status.EXPIRED);
              } catch (callbackError) {
                await this.logError(
                  `Failed to send callback for expired transaction ${tx.id}`,
                  {
                    transactionId: tx.id,
                    error:
                      callbackError instanceof Error
                        ? callbackError.message
                        : String(callbackError),
                  }
                );
              }
            });

            // Размораживаем средства для IN транзакций
            if (tx.type === "IN" && tx.traderId && tx.frozenUsdtAmount) {
              // Размораживаем ровно замороженную сумму (ceil2(amount/rate))
              unfrozenAmount = tx.frozenUsdtAmount;

              // Проверяем текущий замороженный баланс трейдера
              const trader = await prisma.user.findUnique({
                where: { id: tx.traderId },
                select: { frozenUsdt: true, trustBalance: true },
              });

              if (trader) {
                const currentFrozen = trader.frozenUsdt || 0;
                const newFrozen = Math.max(currentFrozen - unfrozenAmount, 0);

                // Возвращаем средства на траст баланс и предотвращаем отрицательные значения frozenUsdt
                await prisma.user.update({
                  where: { id: tx.traderId },
                  data: {
                    frozenUsdt: { set: truncate2(newFrozen) },
                    trustBalance: { increment: truncate2(unfrozenAmount) },
                  },
                });

                if (currentFrozen < unfrozenAmount) {
                  await this.logError(
                    `Insufficient frozen balance for trader ${tx.traderId}`,
                    {
                      transactionId: tx.id,
                      requiredAmount: unfrozenAmount,
                      currentFrozenBalance: currentFrozen,
                    }
                  );
                }
              }
            }

            // Обработка OUT транзакций (выплат)
            if (tx.type === "OUT" && tx.traderId) {
              // Для выплат возвращаем сумму на баланс трейдера
              const payoutAmount = tx.amount / (tx.rate || 1); // Конвертируем обратно в USDT

              await prisma.user.update({
                where: { id: tx.traderId },
                data: {
                  frozenPayoutBalance: { decrement: truncate2(payoutAmount) },
                  trustBalance: { increment: truncate2(payoutAmount) },
                },
              });

              unfrozenAmount = payoutAmount;

              await this.logInfo(`Payout expired and refunded`, {
                transactionId: tx.id,
                traderId: tx.traderId,
                refundedAmount: payoutAmount,
              });
            }
          });

          processedCount++;
          unfrozenAmountTotal += unfrozenAmount;
          processedTransactions.push({
            id: tx.id,
            orderId: tx.orderId,
            amount: tx.amount,
            unfrozenAmount,
            traderId: tx.traderId,
            traderEmail: tx.trader?.email,
            merchantName: tx.merchant.name,
            methodName: tx.method.name,
          });

          await this.logInfo(`Transaction expired and processed`, {
            transactionId: tx.id,
            orderId: tx.orderId,
            amount: tx.amount,
            unfrozenAmount,
            traderId: tx.traderId,
            traderEmail: tx.trader?.email,
          });
        } catch (error) {
          await this.logError(
            `Failed to process expired transaction ${tx.id}`,
            {
              transactionId: tx.id,
              error: error instanceof Error ? error.message : "Unknown error",
              stack: error instanceof Error ? error.stack : undefined,
            }
          );
        }
      }

      this.totalProcessed += processedCount;
      this.totalUnfrozenAmount += unfrozenAmountTotal;

      const processingTime = Date.now() - startTime;

      await this.logInfo(`Expired transaction processing completed`, {
        totalFound: expiredTransactions.length,
        successfullyProcessed: processedCount,
        totalUnfrozenAmount: unfrozenAmountTotal,
        processingTimeMs: processingTime,
        processedTransactions,
      });

      // Массовое логирование для аналитики
      await this.logMany([
        {
          level: "INFO",
          message: "Processing statistics",
          data: {
            totalLifetimeProcessed: this.totalProcessed,
            totalLifetimeUnfrozenAmount: this.totalUnfrozenAmount,
            currentRunProcessed: processedCount,
            currentRunUnfrozenAmount: unfrozenAmountTotal,
          },
        },
        {
          level: "DEBUG",
          message: "Performance metrics",
          data: {
            processingTimeMs: processingTime,
            transactionsPerSecond: processedCount / (processingTime / 1000),
            memoryUsage: process.memoryUsage(),
          },
        },
      ]);
    } catch (error) {
      await this.logError("Failed to process expired transactions", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        processingTime: Date.now() - startTime,
      });
      throw error;
    }
  }

  /** Возвращает публичные поля сервиса */
  protected getPublicFields(): Record<string, any> {
    return {
      enabled: this.enabled,
      totalProcessed: this.totalProcessed,
      lastProcessedCount: this.lastProcessedCount,
      totalUnfrozenAmount: this.totalUnfrozenAmount,
      lastRunTime: this.lastRunTime.toISOString(),
      checkInterval: this.interval,
      uptime: process.uptime(),
    };
  }

  /** Обновляет публичные поля сервиса */
  protected async updatePublicFields(
    fields: Record<string, any>
  ): Promise<void> {
    if (fields.enabled !== undefined) {
      this.enabled = fields.enabled;
      await this.logInfo("Service enabled status changed", {
        enabled: this.enabled,
      });
    }

    // Обновляем в базе данных
    await this.updatePublicFieldsInDb(this.getPublicFields());
  }
}
