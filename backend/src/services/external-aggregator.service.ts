import { db } from "@/db";
import { Merchant, Transaction, Status, TransactionType, MethodType } from "@prisma/client";
import { rapiraService } from "./rapira.service";
import { randomBytes } from "crypto";
import { truncate2, roundUp2 } from "@/utils/rounding";
import { getTraderRate } from "@/utils/trader-rate";

export interface ExternalDealRequest {
  ourDealId: string;
  amount: number;
  rate: number;
  paymentMethod: "SBP" | "C2C";
  bankType?: string;
  clientIdentifier?: string;
  callbackUrl?: string;
  expiresAt?: string;
  metadata?: any;
}

export interface ExternalDealResponse {
  accepted: boolean;
  partnerDealId: string;
  requisites?: {
    bankName?: string;
    cardNumber?: string;
    phoneNumber?: string;
    recipientName?: string;
    bankCode?: string;
    additionalInfo?: string;
  };
  dealDetails?: {
    id: string;
    amount: number;
    status: string;
    createdAt: string;
    expiresAt: string;
    paymentMethod: string;
    metadata?: any;
  };
  message?: string;
}

export class ExternalAggregatorService {
  private static instance: ExternalAggregatorService;

  static getInstance(): ExternalAggregatorService {
    if (!ExternalAggregatorService.instance) {
      ExternalAggregatorService.instance = new ExternalAggregatorService();
    }
    return ExternalAggregatorService.instance;
  }

  /**
   * Создание сделки через агрегаторский интерфейс
   */
  async createDeal(
    merchant: any,
    request: ExternalDealRequest
  ): Promise<ExternalDealResponse> {
    try {
      // Мапим метод платежа на наш формат
      const methodType = request.paymentMethod === "SBP" ? MethodType.sbp : MethodType.c2c;
      
      // Ищем подходящий метод
      const merchantMethod = merchant.merchantMethods.find(
        mm => mm.method.type === methodType && mm.isEnabled && mm.method.isEnabled
      );
      
      if (!merchantMethod) {
        return {
          accepted: false,
          partnerDealId: "",
          message: `Payment method ${request.paymentMethod} not available`
        };
      }
      
      const method = merchantMethod.method;
      
      // Проверяем лимиты
      if (request.amount < method.minPayin || request.amount > method.maxPayin) {
        console.log(
          `[ExternalAggregator] Amount ${request.amount} outside limits ${method.minPayin}-${method.maxPayin}`
        );
      }
      
      // Генерируем ID для транзакции
      const transactionId = `ext_${randomBytes(16).toString("hex")}`;
      
      // Определяем дату истечения
      const expired_at = request.expiresAt 
        ? new Date(request.expiresAt)
        : new Date(Date.now() + 86_400_000); // 24 часа по умолчанию
      
      // Получаем текущий курс от Rapira
      let rapiraRate: number;
      try {
        rapiraRate = await rapiraService.getUsdtRubRate();
      } catch (error) {
        console.error("Failed to get rate from Rapira:", error);
        rapiraRate = 95;
      }
      
      // Используем курс мерчанта или Rapira
      const rate = merchant.countInRubEquivalent ? rapiraRate : (request.rate || rapiraRate);
      
      // Подбираем трейдера для транзакции
      const connectedTraders = await db.traderMerchant.findMany({
        where: {
          merchantId: merchant.id,
          methodId: method.id,
          isMerchantEnabled: true,
          isFeeInEnabled: true,
        },
        select: { traderId: true },
      });
      
      const traderIds = connectedTraders.map(ct => ct.traderId);
      
      // Находим подходящий реквизит
      const pool = await db.bankDetail.findMany({
        where: {
          isArchived: false,
          isActive: true,
          methodType: method.type,
          userId: { in: traderIds },
          user: {
            banned: false,
            deposit: { gte: 1000 },
            trafficEnabled: true,
          },
          OR: [
            { deviceId: null },
            { device: { isWorking: true, isOnline: true } },
          ],
        },
        orderBy: { updatedAt: "asc" },
        include: { user: true, device: true },
      });
      
      let chosen = null;
      for (const bd of pool) {
        // Проверяем лимиты реквизита
        if (request.amount < bd.minAmount || request.amount > bd.maxAmount) continue;
        if (
          request.amount < bd.user.minAmountPerRequisite ||
          request.amount > bd.user.maxAmountPerRequisite
        ) continue;
        
        // Проверяем наличие активной транзакции с той же суммой
        const existingTransaction = await db.transaction.findFirst({
          where: {
            bankDetailId: bd.id,
            amount: request.amount,
            status: {
              in: [Status.CREATED, Status.IN_PROGRESS],
            },
            type: TransactionType.IN,
          },
        });
        
        if (existingTransaction) continue;
        
        // Проверяем лимиты операций
        if (bd.operationLimit > 0) {
          const totalOperations = await db.transaction.count({
            where: {
              bankDetailId: bd.id,
              status: {
                in: [Status.IN_PROGRESS, Status.READY],
              },
            },
          });
          
          if (totalOperations >= bd.operationLimit) continue;
        }
        
        // Проверяем лимит суммы
        if (bd.sumLimit > 0) {
          const totalSumResult = await db.transaction.aggregate({
            where: {
              bankDetailId: bd.id,
              status: {
                in: [Status.IN_PROGRESS, Status.READY],
              },
            },
            _sum: { amount: true },
          });
          const totalSum = (totalSumResult._sum.amount ?? 0) + request.amount;
          
          if (totalSum > bd.sumLimit) continue;
        }
        
        // Проверяем интервал между сделками
        if (bd.intervalMinutes > 0) {
          const intervalStart = new Date();
          intervalStart.setMinutes(intervalStart.getMinutes() - bd.intervalMinutes);
          
          const recentTransaction = await db.transaction.findFirst({
            where: {
              bankDetailId: bd.id,
              createdAt: { gte: intervalStart },
              status: { notIn: [Status.CANCELED, Status.EXPIRED] },
            },
          });
          
          if (recentTransaction) continue;
        }
        
        chosen = bd;
        break;
      }
      
      if (!chosen) {
        // Если не найден трейдер, пробуем через очередь агрегаторов
        console.log("[ExternalAggregator] No trader found, trying aggregators queue...");
        
        // Импортируем сервис очереди агрегаторов
        const { aggregatorQueueService } = await import("@/services/aggregator-queue.service");
        
        // Подготавливаем запрос для агрегаторов
        const aggregatorRequest = {
          ourDealId: request.ourDealId,
          amount: request.amount,
          rate: rate,
          paymentMethod: request.paymentMethod,
          bankType: request.bankType,
          clientIdentifier: request.clientIdentifier,
          callbackUrl: `${process.env.API_URL || 'http://localhost:3000'}/api/external/aggregator/callback`,
          expiresAt: request.expiresAt,
          metadata: request.metadata
        };
        
        // Пробуем распределить через агрегаторов
        const routingResult = await aggregatorQueueService.routeDealToAggregators(aggregatorRequest);
        
        if (routingResult.success && routingResult.response && routingResult.aggregator) {
          const aggResponse = routingResult.response;
          
          // Создаем транзакцию с привязкой к агрегатору
          const transaction = await db.transaction.create({
            data: {
              id: transactionId,
              merchantId: merchant.id,
              amount: request.amount,
              assetOrBank: aggResponse.requisites 
                ? `${aggResponse.requisites.bankName || routingResult.aggregator.name}: ${aggResponse.requisites.phoneNumber || aggResponse.requisites.cardNumber || 'Pending'}`
                : `${routingResult.aggregator.name}: Pending`,
              orderId: request.ourDealId,
              methodId: method.id,
              currency: "RUB",
              userId: `ext_user_${Date.now()}`,
              userIp: null,
              callbackUri: request.callbackUrl || "",
              successUri: "",
              failUri: "",
              type: TransactionType.IN,
              expired_at: expired_at,
              commission: 0,
              clientName: `ext_user_${Date.now()}`,
              status: Status.IN_PROGRESS,
              rate: rate,
              merchantRate: request.rate || rate,
              clientIdentifier: request.clientIdentifier,
              aggregatorId: routingResult.aggregator.id,
              isMock: false,
            },
          });
          
          // Сохраняем связь с партнёрской сделкой
          if (aggResponse.partnerDealId) {
            await db.aggregatorIntegrationLog.create({
              data: {
                aggregatorId: routingResult.aggregator.id,
                direction: "OUT",
                eventType: "deal_routed",
                method: "POST",
                url: `${routingResult.aggregator.apiBaseUrl}/deals`,
                headers: {},
                requestBody: aggregatorRequest,
                responseBody: aggResponse,
                statusCode: 201,
                ourDealId: request.ourDealId,
                partnerDealId: aggResponse.partnerDealId,
              }
            });
          }
          
          return {
            accepted: true,
            partnerDealId: transaction.id,
            requisites: aggResponse.requisites || {
              bankName: routingResult.aggregator.name,
              additionalInfo: "Payment details will be provided by partner"
            },
            dealDetails: {
              id: transaction.id,
              amount: transaction.amount,
              status: this.mapStatusToExternal(transaction.status),
              createdAt: transaction.createdAt.toISOString(),
              expiresAt: transaction.expired_at.toISOString(),
              paymentMethod: request.paymentMethod,
              metadata: request.metadata,
            },
          };
        } else {
          // Ни один агрегатор не принял заявку
          console.log(`[ExternalAggregator] No aggregators accepted the deal. Tried: ${routingResult.triedAggregators.join(', ')}`);
          
          return {
            accepted: false,
            partnerDealId: "",
            message: "NO_REQUISITE",
          };
        }
      }
      
      // Получаем параметры трейдера для расчета заморозки
      const traderMerchant = await db.traderMerchant.findUnique({
        where: {
          traderId_merchantId_methodId: {
            traderId: chosen.userId,
            merchantId: merchant.id,
            methodId: method.id,
          },
        },
      });
      
      const feeInPercent = traderMerchant?.feeIn || 0;
      
      // Получаем курс трейдера
      const traderRateData = await getTraderRate(chosen.userId);
      const selectedRate = traderRateData.rate;
      
      // Рассчитываем заморозку
      const frozenUsdtAmount = roundUp2(request.amount / selectedRate);
      const totalRequired = frozenUsdtAmount;
      
      // Проверяем баланс трейдера
      if (chosen.user) {
        const availableBalance = chosen.user.trustBalance;
        if (availableBalance < totalRequired) {
          console.log(
            `[ExternalAggregator] Insufficient balance. Need: ${totalRequired}, available: ${availableBalance}`
          );
          return {
            accepted: false,
            partnerDealId: "",
            message: "Insufficient trader balance",
          };
        }
      }
      
      // Создаем транзакцию и замораживаем средства
      const tx = await db.$transaction(async (prisma) => {
        const transaction = await prisma.transaction.create({
          data: {
            id: transactionId,
            merchantId: merchant.id,
            amount: request.amount,
            assetOrBank:
              method.type === MethodType.sbp
                ? chosen.cardNumber
                : `${chosen.bankType}: ${chosen.cardNumber}`,
            orderId: request.ourDealId,
            methodId: method.id,
            currency: "RUB",
            userId: `ext_user_${Date.now()}`,
            userIp: null,
            callbackUri: request.callbackUrl || "",
            successUri: "",
            failUri: "",
            type: TransactionType.IN,
            expired_at: expired_at,
            commission: 0,
            clientName: `ext_user_${Date.now()}`,
            status: Status.IN_PROGRESS,
            rate: selectedRate,
            merchantRate: request.rate || selectedRate,
            adjustedRate: selectedRate,
            kkkPercent: 0,
            kkkOperation: "MINUS",
            feeInPercent: feeInPercent,
            frozenUsdtAmount: frozenUsdtAmount,
            calculatedCommission: 0,
            isMock: false,
            clientIdentifier: request.clientIdentifier,
            bankDetailId: chosen.id,
            traderId: chosen.userId,
          },
        });
        
        // Замораживаем средства трейдера
        if (chosen.user) {
          await prisma.user.update({
            where: { id: chosen.userId },
            data: {
              frozenUsdt: { increment: totalRequired },
              trustBalance: { decrement: totalRequired },
            },
          });
        }
        
        return transaction;
      });
      
      // Формируем ответ с реквизитами
      return {
        accepted: true,
        partnerDealId: tx.id,
        requisites: {
          bankName: chosen.bankType,
          cardNumber: method.type === MethodType.c2c ? chosen.cardNumber : undefined,
          phoneNumber: method.type === MethodType.sbp ? chosen.cardNumber : undefined,
          recipientName: chosen.recipientName,
          bankCode: chosen.bankType,
        },
        dealDetails: {
          id: tx.id,
          amount: tx.amount,
          status: this.mapStatusToExternal(tx.status),
          createdAt: tx.createdAt.toISOString(),
          expiresAt: tx.expired_at.toISOString(),
          paymentMethod: request.paymentMethod,
          metadata: request.metadata,
        },
      };
      
    } catch (error) {
      console.error("[ExternalAggregator] Error creating deal:", error);
      return {
        accepted: false,
        partnerDealId: "",
        message: error instanceof Error ? error.message : "Internal error",
      };
    }
  }
  
  /**
   * Получение информации о сделке
   */
  async getDeal(
    merchant: Merchant,
    partnerDealId: string
  ): Promise<ExternalDealResponse | null> {
    try {
      const transaction = await db.transaction.findFirst({
        where: {
          id: partnerDealId,
          merchantId: merchant.id,
        },
        include: {
          method: true,
          requisites: true,
        },
      });
      
      if (!transaction) {
        return null;
      }
      
      const paymentMethod = transaction.method?.type === MethodType.sbp ? "SBP" : "C2C";
      
      const requisites = transaction.requisites ? {
        bankName: transaction.requisites.bankType,
        cardNumber: paymentMethod === "C2C" ? transaction.requisites.cardNumber : undefined,
        phoneNumber: paymentMethod === "SBP" ? transaction.requisites.cardNumber : undefined,
        recipientName: transaction.requisites.recipientName,
      } : undefined;
      
      return {
        accepted: true,
        partnerDealId: transaction.id,
        requisites,
        dealDetails: {
          id: transaction.id,
          amount: transaction.amount,
          status: this.mapStatusToExternal(transaction.status),
          createdAt: transaction.createdAt.toISOString(),
          expiresAt: transaction.expired_at.toISOString(),
          paymentMethod,
        },
      };
      
    } catch (error) {
      console.error("[ExternalAggregator] Error getting deal:", error);
      return null;
    }
  }
  
  /**
   * Отмена сделки
   */
  async cancelDeal(
    merchant: Merchant,
    partnerDealId: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const transaction = await db.transaction.findFirst({
        where: {
          id: partnerDealId,
          merchantId: merchant.id,
        },
      });
      
      if (!transaction) {
        return {
          success: false,
          message: "Deal not found",
        };
      }
      
      if (
        transaction.status === Status.EXPIRED ||
        transaction.status === Status.CANCELED ||
        transaction.status === Status.READY
      ) {
        return {
          success: false,
          message: "Cannot cancel deal in current status",
        };
      }
      
      const updated = await db.$transaction(async (prisma) => {
        const tx = await prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: Status.CANCELED },
        });
        
        // Размораживаем средства для IN транзакций
        if (
          tx.type === "IN" &&
          tx.traderId &&
          tx.frozenUsdtAmount &&
          tx.calculatedCommission !== null
        ) {
          const totalToUnfreeze = tx.frozenUsdtAmount + tx.calculatedCommission;
          
          await prisma.user.update({
            where: { id: tx.traderId },
            data: {
              frozenUsdt: { decrement: truncate2(totalToUnfreeze) },
              trustBalance: { increment: truncate2(totalToUnfreeze) },
            },
          });
        }
        
        return tx;
      });
      
      return {
        success: true,
        message: "Deal canceled successfully",
      };
      
    } catch (error) {
      console.error("[ExternalAggregator] Error canceling deal:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Internal error",
      };
    }
  }
  
  /**
   * Создание спора по сделке
   */
  async createDispute(
    merchant: Merchant,
    partnerDealId: string,
    message: string
  ): Promise<{ success: boolean; disputeId?: string; message?: string }> {
    try {
      const transaction = await db.transaction.findFirst({
        where: {
          id: partnerDealId,
          merchantId: merchant.id,
        },
      });
      
      if (!transaction) {
        return {
          success: false,
          message: "Deal not found",
        };
      }
      
      // Создаем спор
      const dispute = await db.dealDispute.create({
        data: {
          transactionId: transaction.id,
          merchantId: merchant.id,
          subject: "External system dispute",
          description: message,
          status: "OPEN",
        },
      });
      
      // Обновляем статус транзакции
      await db.transaction.update({
        where: { id: transaction.id },
        data: { status: Status.DISPUTE },
      });
      
      return {
        success: true,
        disputeId: dispute.id,
        message: "Dispute created successfully",
      };
      
    } catch (error) {
      console.error("[ExternalAggregator] Error creating dispute:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Internal error",
      };
    }
  }
  
  /**
   * Маппинг статусов на внешний формат
   */
  private mapStatusToExternal(status: Status): string {
    const mapping: Record<Status, string> = {
      CREATED: "CREATED",
      IN_PROGRESS: "IN_PROGRESS",
      READY: "READY",
      CANCELED: "CANCELED",
      EXPIRED: "EXPIRED",
      DISPUTE: "DISPUTE",
      MILK: "MILK",
    };
    return mapping[status] || "UNKNOWN";
  }
}

export const externalAggregatorService = ExternalAggregatorService.getInstance();