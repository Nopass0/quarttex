import { BaseService } from "./BaseService";
import { db } from "@/db";
import { Status, TransactionType, NotificationType } from "@prisma/client";
import { HttpClient } from "@/utils/httpClient";
import { BankRegexFactory } from "@/bank-parsers";
import type { ProcessorConfig, ProcessorStats } from "@/types/processor";
import { ProcessorConfigSchema } from "@/types/processor";
import { truncate2 } from "@/utils/rounding";

interface CallbackPayload {
  transactionId: string;
  orderId: string;
  status: string;
  amount: number;
  timestamp: string;
}

interface CallbackTask {
  transaction: any;
  payload: CallbackPayload;
  attempts: number;
}

export class NotificationAutoProcessorService extends BaseService {
  private config: ProcessorConfig;
  private stats: ProcessorStats;
  private bankFactory: BankRegexFactory;
  private httpClient: HttpClient;
  private callbackQueue: CallbackTask[] = [];
  private activeCallbacks = 0;
  private watchdogTimer?: NodeJS.Timeout;

  constructor() {
    super({
      displayName: "Notification Auto-Processor Service",
      description:
        "Automatically processes bank notifications and matches them with transactions",
      enabled: true, // Always enabled
      autoStart: true,
      tags: ["notifications", "automation", "critical"],
    });

    this.config = ProcessorConfigSchema.parse({
      pollIntervalSec: 1, // Ускоряем до 1 секунды
    });
    this.stats = {
      totalProcessed: 0,
      successfulMatches: 0,
      failedMatches: 0,
      callbacksSent: 0,
      callbacksFailed: 0,
      devicesMarkedOffline: 0,
      averageProcessingTime: 0,
    };

    this.bankFactory = new BankRegexFactory();
    this.httpClient = new HttpClient({
      timeout: this.config.callbackTimeout,
      retries: this.config.callbackRetries,
      retryDelay: this.config.callbackRetryDelay,
    });

    this.interval = this.config.pollIntervalSec * 1000;
  }

  protected async onStart(): Promise<void> {
    await this.loadConfig();
    await this.logInfo("Notification Auto-Processor Service starting", {
      config: this.config,
      supportedBanks: this.bankFactory.getBankNames(),
    });

    // Start device watchdog
    if (this.config.enableDeviceWatchdog) {
      this.startWatchdog();
    }
  }

  protected async onStop(): Promise<void> {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = undefined;
    }

    await this.logInfo("Notification Auto-Processor Service stopped", {
      stats: this.stats,
    });
  }

  protected async tick(): Promise<void> {
    if (!this.config.enabled) return;

    const startTime = Date.now();
    this.stats.lastRunTime = new Date();

    try {
      // Process notifications
      const notifications = await this.fetchUnprocessedNotifications();

      if (notifications.length > 0) {
        await this.logDebug(`Processing ${notifications.length} notifications`);

        // Обрабатываем до 5 уведомлений параллельно для ускорения
        const chunks = [];
        for (let i = 0; i < notifications.length; i += 5) {
          chunks.push(notifications.slice(i, i + 5));
        }

        for (const chunk of chunks) {
          await Promise.all(
            chunk.map((notification) =>
              this.processNotification(notification).catch((error) =>
                this.logError("Error processing notification", {
                  notificationId: notification.id,
                  error,
                })
              )
            )
          );
        }
      }

      // Process callback queue
      await this.processCallbackQueue();

      // Update average processing time
      const processingTime = Date.now() - startTime;
      this.stats.averageProcessingTime =
        this.stats.averageProcessingTime * 0.9 + processingTime * 0.1;
    } catch (error) {
      await this.logError("Error in notification processing tick", { error });
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      const serviceConfig = await db.serviceConfig.findUnique({
        where: { serviceKey: "notification_auto_processor" },
      });

      if (serviceConfig && serviceConfig.isEnabled) {
        this.config = ProcessorConfigSchema.parse(serviceConfig.config);
        this.interval = this.config.pollIntervalSec * 1000;
      }
    } catch (error) {
      await this.logError("Failed to load config", { error });
    }
  }

  private async fetchUnprocessedNotifications(): Promise<any[]> {
    return db.notification.findMany({
      where: {
        type: { in: [NotificationType.AppNotification, NotificationType.SMS] },
        isProcessed: false,
        deviceId: { not: null },
      },
      include: {
        Device: {
          include: {
            bankDetails: {
              where: {
                isArchived: false,
              },
              select: {
                id: true,
                methodType: true,
                bankType: true,
                cardNumber: true,
                recipientName: true,
                phoneNumber: true,
                minAmount: true,
                maxAmount: true,
                totalAmountLimit: true,
                currentTotalAmount: true,
                operationLimit: true,
                sumLimit: true,
                intervalMinutes: true,
                isArchived: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                deviceId: true,
                userId: true,
              },
            },
            user: true,
          },
        },
      },
      take: 50, // Увеличиваем размер батча для более быстрой обработки
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  private async processNotification(notification: any): Promise<void> {
    const startTime = Date.now();

    try {
      this.stats.totalProcessed++;

      // Check if device has bank details
      if (
        !notification.Device?.bankDetails ||
        notification.Device.bankDetails.length === 0
      ) {
        await this.markNotificationProcessed(
          notification.id,
          "NO_BANK_DETAILS"
        );
        return;
      }

      const metadata = notification.metadata as any;
      const packageName = metadata?.packageName;
      const senderCode = notification.senderCode || notification.application; // Some notifications may have sender code as application

      // Parse notification message
      const parseResult = this.bankFactory.parseMessage(
        notification.message,
        packageName,
        senderCode
      );

      if (!parseResult) {
        await this.markNotificationProcessed(notification.id, "PARSE_FAILED");
        this.stats.failedMatches++;
        return;
      }

      const { parser, transaction: parsedTx } = parseResult;

      await this.logDebug("Parsed notification", {
        notificationId: notification.id,
        bank: parser.bankName,
        amount: parsedTx.amount,
        senderName: parsedTx.senderName,
      });

      // Find matching transaction
      const matchedTransaction = await this.findMatchingTransaction(
        notification,
        parsedTx,
        parser.bankName
      );

      if (!matchedTransaction) {
        await this.markNotificationProcessed(
          notification.id,
          "NO_MATCHING_TXN",
          parsedTx
        );
        this.stats.failedMatches++;
        return;
      }

      // Update transaction status and notification metadata with parsed amount
      await this.updateTransactionStatus(
        matchedTransaction,
        notification.id,
        parsedTx
      );
      this.stats.successfulMatches++;

      // Queue callback
      this.queueCallback(matchedTransaction);

      const processingTime = Date.now() - startTime;
      await this.logInfo("Successfully matched notification", {
        notificationId: notification.id,
        transactionId: matchedTransaction.id,
        amount: parsedTx.amount,
        processingTimeMs: processingTime,
      });
    } catch (error) {
      await this.logError("Error processing notification", {
        notificationId: notification.id,
        error,
      });
      await this.markNotificationProcessed(notification.id, "ERROR");
      this.stats.failedMatches++;
    }
  }

  private async findMatchingTransaction(
    notification: any,
    parsedTx: any,
    bankName: string
  ): Promise<any> {
    const { amount } = parsedTx;
    const notificationTime = new Date(notification.createdAt);

    // Get all eligible bank details for this device
    const bankType = this.mapBankNameToType(bankName);
    const eligibleBankDetails = notification.Device.bankDetails.filter(
      (bd: any) => {
        if (bankType) {
          return bd.bankType === bankType;
        }
        return true;
      }
    );

    if (eligibleBankDetails.length === 0) {
      return null;
    }

    const bankDetailIds = eligibleBankDetails.map((bd: any) => bd.id);

    // Search for matching transaction
    const transactions = await db.transaction.findMany({
      where: {
        bankDetailId: { in: bankDetailIds },
        type: TransactionType.IN,
        status: Status.IN_PROGRESS,
        amount: {
          gte: amount - this.config.amountTolerance,
          lte: amount + this.config.amountTolerance,
        },
        traderId: notification.Device.userId,
        createdAt: {
          gte: new Date(notificationTime.getTime() - 14400000), // 4 часа (240 минут) для поиска старых транзакций
          lte: notificationTime,
        },
      },
      include: {
        merchant: true,
        method: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (transactions.length === 0) {
      return null;
    }

    // Return the most recent matching transaction
    return transactions[0];
  }

  private mapBankNameToType(bankName: string): string | undefined {
    const mapping: Record<string, string> = {
      Тинькофф: "TBANK",
      Сбербанк: "SBERBANK",
      ВТБ: "VTB",
      "Альфа-Банк": "ALFABANK",
      Газпромбанк: "GAZPROMBANK",
      "Озон Банк": "OZONBANK",
      Открытие: "OTKRITIE",
      Совкомбанк: "SOVCOMBANK",
      Росбанк: "ROSBANK",
      ЮниКредит: "UNICREDIT",
      Ситибанк: "CITIBANK",
      "Русский Стандарт": "RUSSIANSTANDARD",
      ПСБ: "PSB",
      "ДОМ.РФ": "DOMRF",
      "МТС Банк": "MTSBANK",
      УралСиб: "URALSIB",
      Райффайзенбанк: "RAIFFEISEN",
      "Почта Банк": "POCHTABANK",
      "Банк Санкт-Петербург": "SPBBANK",
      РНКБ: "RNKB",
      Россельхозбанк: "ROSSELKHOZBANK",
      "ОТП Банк": "OTPBANK",
      "Хоум Кредит": "HOMECREDIT",
      // Add more mappings as needed
    };

    return mapping[bankName];
  }

  private async updateTransactionStatus(
    transaction: any,
    notificationId: string,
    parsedTx?: any
  ): Promise<void> {
    await db.$transaction(async (prisma) => {
      // Get full transaction details with trader merchant settings
      const fullTransaction = await prisma.transaction.findUnique({
        where: { id: transaction.id },
        include: {
          trader: true,
          merchant: true,
          method: true,
        },
      });

      if (!fullTransaction || !fullTransaction.traderId) {
        throw new Error("Transaction or trader not found");
      }

      // Get trader merchant settings for commission calculation
      const traderMerchant = await prisma.traderMerchant.findUnique({
        where: {
          traderId_merchantId_methodId: {
            traderId: fullTransaction.traderId,
            merchantId: fullTransaction.merchantId,
            methodId: fullTransaction.methodId,
          },
        },
      });

      // Calculate trader profit using the rate field (Rapira rate with KKK)
      // This is the amount the trader spent in USDT to buy RUB
      const spentUsdt = fullTransaction.rate
        ? fullTransaction.amount / fullTransaction.rate
        : 0;

      // Calculate commission using flexible rates (как в БТ-входе)
      const {
        getFlexibleFeePercent,
      } = require("../utils/flexible-fee-calculator");
      const commissionPercent = await getFlexibleFeePercent(
        fullTransaction.traderId!,
        fullTransaction.merchantId,
        fullTransaction.methodId,
        fullTransaction.amount,
        "IN"
      );

      // Trader profit = спенс в USDT * процент комиссии (как в БТ-входе)
      const traderProfit = truncate2(spentUsdt * (commissionPercent / 100));

      console.log(
        `Profit calculation: amount=${fullTransaction.amount}, rate=${fullTransaction.rate}, spentUsdt=${spentUsdt}, commissionPercent=${commissionPercent}, profit=${traderProfit}`
      );

      // Calculate merchant credit amount (after merchant commission)
      const merchantCommission = fullTransaction.method.commissionPayin || 0;
      const netAmount =
        fullTransaction.amount -
        (fullTransaction.amount * merchantCommission) / 100;
      const merchantCreditUsdt = fullTransaction.rate
        ? netAmount / fullTransaction.rate
        : 0;

      // Update transaction status and profit, and link to notification
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: Status.READY,
          acceptedAt: new Date(),
          traderProfit: traderProfit, // Save trader profit
          matchedNotificationId: notificationId, // Link to the notification
        },
      });

      // Update trader balances
      await prisma.user.update({
        where: { id: fullTransaction.traderId },
        data: {
          // Decrease frozen balance by the amount that was frozen
          frozenUsdt: {
            decrement: fullTransaction.frozenUsdtAmount || 0,
          },
          // НЕ уменьшаем trustBalance - он уже был уменьшен при заморозке!
          // trustBalance уже был уменьшен в transaction-freezing.ts при создании сделки
          // Increase profit from deals
          profitFromDeals: {
            increment: traderProfit,
          },
          // НЕ увеличиваем deposit - прибыль учитывается только в profitFromDeals!
        },
      });

      // Update merchant balance (credit the merchant with the transaction amount minus commission)
      if (merchantCreditUsdt > 0) {
        await prisma.merchant.update({
          where: { id: fullTransaction.merchantId },
          data: {
            balanceUsdt: { increment: merchantCreditUsdt },
          },
        });

        console.log(
          `Merchant ${fullTransaction.merchantId} credited with ${merchantCreditUsdt} USDT`
        );
      }

      // Get current notification metadata
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
      });

      const currentMetadata = (notification?.metadata as any) || {};

      // Mark notification as processed and update metadata with parsed amount
      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          isProcessed: true,
          updatedAt: new Date(),
          metadata: {
            ...currentMetadata,
            extractedAmount: parsedTx?.amount || 0,
            bankName: parsedTx?.bankName,
            senderName: parsedTx?.senderName,
            processedAt: new Date().toISOString(),
          },
        },
      });

      await this.logInfo("Transaction completed successfully", {
        transactionId: transaction.id,
        amount: fullTransaction.amount,
        rate: fullTransaction.rate,
        spentUsdt,
        traderProfit,
        traderId: fullTransaction.traderId,
      });
    });

    // Send callbacks after successful transaction update
    // Send callback to callbackUri
    if (
      transaction.callbackUri &&
      transaction.callbackUri !== "none" &&
      transaction.callbackUri !== ""
    ) {
      try {
        const callbackPayload = {
          id: transaction.orderId,
          amount: transaction.amount,
          status: Status.READY,
        };

        console.log(
          `[NotificationAutoProcessor] Sending callback to ${transaction.callbackUri}`
        );
        const response = await fetch(transaction.callbackUri, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Chase/1.0",
          },
          body: JSON.stringify(callbackPayload),
        });

        const responseText = await response.text();

        // Save callback history
        await db.callbackHistory
          .create({
            data: {
              transactionId: transaction.id,
              url: transaction.callbackUri,
              payload: callbackPayload as any,
              response: responseText,
              statusCode: response.status,
              error: response.ok ? null : `HTTP ${response.status}`,
            },
          })
          .catch((err) =>
            console.error(
              "[NotificationAutoProcessor] Error saving callback history:",
              err
            )
          );

        if (!response.ok) {
          console.error(
            `[NotificationAutoProcessor] Callback failed with status ${response.status}`
          );
        } else {
          console.log(`[NotificationAutoProcessor] Callback sent successfully`);
        }
      } catch (error) {
        console.error(
          `[NotificationAutoProcessor] Error sending callback:`,
          error
        );
        // Save error to callback history
        await db.callbackHistory
          .create({
            data: {
              transactionId: transaction.id,
              url: transaction.callbackUri,
              payload: {
                id: transaction.orderId,
                amount: transaction.amount,
                status: Status.READY,
              } as any,
              error: error instanceof Error ? error.message : String(error),
            },
          })
          .catch((err) =>
            console.error(
              "[NotificationAutoProcessor] Error saving callback error history:",
              err
            )
          );
      }
    }

    // Send callback to successUri
    if (
      transaction.successUri &&
      transaction.successUri !== "none" &&
      transaction.successUri !== ""
    ) {
      try {
        const successPayload = {
          id: transaction.orderId,
          amount: transaction.amount,
          status: Status.READY,
        };

        console.log(
          `[NotificationAutoProcessor] Sending success callback to ${transaction.successUri}`
        );
        const response = await fetch(transaction.successUri, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Chase/1.0",
          },
          body: JSON.stringify(successPayload),
        });

        const responseText = await response.text();

        // Save callback history
        await db.callbackHistory
          .create({
            data: {
              transactionId: transaction.id,
              url: transaction.successUri,
              payload: successPayload as any,
              response: responseText,
              statusCode: response.status,
              error: response.ok ? null : `HTTP ${response.status}`,
            },
          })
          .catch((err) =>
            console.error(
              "[NotificationAutoProcessor] Error saving success callback history:",
              err
            )
          );

        if (!response.ok) {
          console.error(
            `[NotificationAutoProcessor] Success callback failed with status ${response.status}`
          );
        } else {
          console.log(
            `[NotificationAutoProcessor] Success callback sent successfully`
          );
        }
      } catch (error) {
        console.error(
          `[NotificationAutoProcessor] Error sending success callback:`,
          error
        );
        // Save error to callback history
        await db.callbackHistory
          .create({
            data: {
              transactionId: transaction.id,
              url: transaction.successUri,
              payload: {
                id: transaction.orderId,
                amount: transaction.amount,
                status: Status.READY,
              } as any,
              error: error instanceof Error ? error.message : String(error),
            },
          })
          .catch((err) =>
            console.error(
              "[NotificationAutoProcessor] Error saving success callback error history:",
              err
            )
          );
      }
    }
  }

  private async markNotificationProcessed(
    notificationId: string,
    reason: string,
    parsedTx?: any
  ): Promise<void> {
    // Get current notification to preserve existing metadata
    const notification = await db.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) return;

    const currentMetadata = (notification.metadata as any) || {};

    await db.notification.update({
      where: { id: notificationId },
      data: {
        isProcessed: true,
        metadata: {
          ...currentMetadata,
          processedReason: reason,
          processedAt: new Date().toISOString(),
          extractedAmount: parsedTx?.amount || 0,
          bankName: parsedTx?.bankName,
          senderName: parsedTx?.senderName,
        },
      },
    });
  }

  private queueCallback(transaction: any): void {
    const payload: CallbackPayload = {
      transactionId: transaction.id,
      orderId: transaction.orderId,
      status: "success",
      amount: transaction.amount,
      timestamp: new Date().toISOString(),
    };

    this.callbackQueue.push({
      transaction,
      payload,
      attempts: 0,
    });
  }

  private async processCallbackQueue(): Promise<void> {
    while (
      this.callbackQueue.length > 0 &&
      this.activeCallbacks < this.config.callbackConcurrency
    ) {
      const task = this.callbackQueue.shift();
      if (!task) break;

      this.activeCallbacks++;
      this.sendCallback(task).finally(() => {
        this.activeCallbacks--;
      });
    }
  }

  private async sendCallback(task: CallbackTask): Promise<void> {
    const { transaction, payload } = task;

    if (!transaction.callbackUri) {
      return;
    }

    try {
      task.attempts++;

      await this.httpClient.post(transaction.callbackUri, payload, {
        headers: {
          "X-Merchant-Token": transaction.merchant.token,
          "X-Transaction-Id": transaction.id,
        },
      });

      this.stats.callbacksSent++;

      await this.logInfo("Callback sent successfully", {
        transactionId: transaction.id,
        callbackUri: transaction.callbackUri,
        attempts: task.attempts,
      });
    } catch (error) {
      this.stats.callbacksFailed++;

      await this.logError("Callback failed", {
        transactionId: transaction.id,
        callbackUri: transaction.callbackUri,
        attempts: task.attempts,
        error,
      });

      // Retry if attempts remaining
      if (task.attempts < this.config.callbackRetries) {
        // Re-queue with exponential backoff
        setTimeout(() => {
          this.callbackQueue.push(task);
        }, this.config.callbackRetryDelay * Math.pow(2, task.attempts - 1));
      }
    }
  }

  private startWatchdog(): void {
    this.watchdogTimer = setInterval(async () => {
      await this.updateDeviceStatuses();
    }, this.config.watchdogIntervalSec * 1000);
  }

  private async updateDeviceStatuses(): Promise<void> {
    try {
      const threshold = new Date(
        Date.now() - this.config.deviceOfflineThresholdSec * 1000
      );

      const result = await db.device.updateMany({
        where: {
          isOnline: true,
          lastActiveAt: {
            lt: threshold,
          },
        },
        data: {
          isOnline: false,
        },
      });

      if (result.count > 0) {
        this.stats.devicesMarkedOffline += result.count;

        await this.logInfo("Devices marked offline", {
          count: result.count,
          threshold: threshold.toISOString(),
        });
      }
    } catch (error) {
      await this.logError("Error updating device statuses", { error });
    }
  }

  protected getPublicFields(): Record<string, any> {
    return {
      enabled: this.config.enabled,
      stats: this.stats,
      config: this.config,
      supportedBanks: this.bankFactory.getBankNames(),
      callbackQueueSize: this.callbackQueue.length,
      activeCallbacks: this.activeCallbacks,
    };
  }

  protected async updatePublicFields(
    fields: Record<string, any>
  ): Promise<void> {
    if (fields.config) {
      this.config = ProcessorConfigSchema.parse(fields.config);
      this.interval = this.config.pollIntervalSec * 1000;

      // Save to database
      await db.serviceConfig.upsert({
        where: { serviceKey: "notification_auto_processor" },
        create: {
          serviceKey: "notification_auto_processor",
          config: fields.config,
          isEnabled: true,
        },
        update: {
          config: fields.config,
        },
      });
    }

    await this.updatePublicFieldsInDb(this.getPublicFields());
  }
}

export default NotificationAutoProcessorService;
