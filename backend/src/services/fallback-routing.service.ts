import { db } from "@/db";
import { Transaction, Aggregator } from "@prisma/client";
import { aggregatorServiceV2 } from "./aggregator-v2.service";

export interface FallbackResult {
  success: boolean;
  aggregatorId?: string;
  aggregatorName?: string;
  partnerDealId?: string;
  requisites?: any;
  attempts: FallbackAttempt[];
  error?: string;
}

export interface FallbackAttempt {
  aggregatorId: string;
  aggregatorName: string;
  success: boolean;
  error?: string;
  responseTimeMs?: number;
  slaViolation?: boolean;
}

export class FallbackRoutingService {
  private static instance: FallbackRoutingService;

  static getInstance(): FallbackRoutingService {
    if (!FallbackRoutingService.instance) {
      FallbackRoutingService.instance = new FallbackRoutingService();
    }
    return FallbackRoutingService.instance;
  }

  /**
   * Попытка распределить транзакцию через агрегаторов по приоритету
   */
  async routeTransactionToAggregators(
    transaction: Transaction & { method: any; merchant: any }
  ): Promise<FallbackResult> {
    const attempts: FallbackAttempt[] = [];
    
    console.log(`[FallbackRouting] Starting fallback routing for transaction ${transaction.id}`);
    
    // Получаем список доступных агрегаторов
    const availableAggregators = await aggregatorServiceV2.getAvailableAggregators(
      transaction.amount
    );
    
    if (availableAggregators.length === 0) {
      console.log(`[FallbackRouting] No available aggregators found`);
      return {
        success: false,
        attempts,
        error: "No available aggregators",
      };
    }
    
    console.log(
      `[FallbackRouting] Found ${availableAggregators.length} available aggregators:`,
      availableAggregators.map(a => ({ name: a.name, priority: a.priority }))
    );
    
    // Пробуем каждого агрегатора по приоритету
    for (const aggregator of availableAggregators) {
      console.log(`[FallbackRouting] Trying aggregator: ${aggregator.name} (priority: ${aggregator.priority})`);
      
      const startTime = Date.now();
      
      try {
        // Назначаем транзакцию агрегатору
        await db.transaction.update({
          where: { id: transaction.id },
          data: {
            aggregatorId: aggregator.id,
          },
        });
        
        // Пытаемся создать сделку у агрегатора
        const result = await aggregatorServiceV2.createDeal(aggregator, transaction);
        
        const responseTimeMs = Date.now() - startTime;
        const slaViolation = responseTimeMs > aggregator.maxSlaMs;
        
        attempts.push({
          aggregatorId: aggregator.id,
          aggregatorName: aggregator.name,
          success: result.success,
          error: result.error,
          responseTimeMs,
          slaViolation,
        });
        
        if (result.success) {
          console.log(
            `[FallbackRouting] Successfully routed to aggregator: ${aggregator.name}`,
            { partnerDealId: result.partnerDealId, requisites: result.requisites }
          );
          
          return {
            success: true,
            aggregatorId: aggregator.id,
            aggregatorName: aggregator.name,
            partnerDealId: result.partnerDealId,
            requisites: result.requisites,
            attempts,
          };
        } else {
          console.log(
            `[FallbackRouting] Aggregator ${aggregator.name} rejected the deal:`,
            result.error
          );
          
          // Если агрегатор отказал, убираем назначение
          await db.transaction.update({
            where: { id: transaction.id },
            data: {
              aggregatorId: null,
            },
          });
        }
      } catch (error) {
        console.error(
          `[FallbackRouting] Error with aggregator ${aggregator.name}:`,
          error
        );
        
        const responseTimeMs = Date.now() - startTime;
        
        attempts.push({
          aggregatorId: aggregator.id,
          aggregatorName: aggregator.name,
          success: false,
          error: String(error),
          responseTimeMs,
        });
        
        // Убираем назначение при ошибке
        await db.transaction.update({
          where: { id: transaction.id },
          data: {
            aggregatorId: null,
          },
        });
      }
    }
    
    console.log(
      `[FallbackRouting] All aggregators failed for transaction ${transaction.id}`,
      { attempts }
    );
    
    return {
      success: false,
      attempts,
      error: "All aggregators failed or rejected the deal",
    };
  }

  /**
   * Проверка и обновление приоритетов агрегаторов на основе статистики
   */
  async updateAggregatorPriorities(): Promise<void> {
    try {
      // Получаем статистику по агрегаторам за последние 24 часа
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const aggregators = await db.aggregator.findMany({
        where: {
          isActive: true,
        },
        include: {
          integrationLogs: {
            where: {
              createdAt: { gte: yesterday },
              eventType: "deal_create",
              direction: "OUT",
            },
          },
        },
      });
      
      // Вычисляем метрики для каждого агрегатора
      const metrics = aggregators.map(aggregator => {
        const logs = aggregator.integrationLogs;
        const total = logs.length;
        const successful = logs.filter(log => log.statusCode === 200 && !log.error).length;
        const avgResponseTime = total > 0
          ? logs.reduce((sum, log) => sum + (log.responseTimeMs || 0), 0) / total
          : 0;
        const slaViolations = logs.filter(log => log.slaViolation).length;
        
        // Вычисляем score (меньше = лучше)
        // Формула: (100 - successRate) * 10 + (avgResponseTime / 100) + (slaViolations * 5)
        const successRate = total > 0 ? (successful / total) * 100 : 0;
        const score = (100 - successRate) * 10 + (avgResponseTime / 100) + (slaViolations * 5);
        
        return {
          id: aggregator.id,
          name: aggregator.name,
          currentPriority: aggregator.priority,
          total,
          successful,
          successRate,
          avgResponseTime,
          slaViolations,
          score,
        };
      });
      
      // Сортируем по score и обновляем приоритеты
      metrics.sort((a, b) => a.score - b.score);
      
      for (let i = 0; i < metrics.length; i++) {
        const metric = metrics[i];
        const newPriority = i; // 0 = высший приоритет
        
        if (metric.currentPriority !== newPriority) {
          await db.aggregator.update({
            where: { id: metric.id },
            data: {
              priority: newPriority,
              lastPriorityChangeAt: new Date(),
              lastPriorityChangeBy: "system",
            },
          });
          
          console.log(
            `[FallbackRouting] Updated priority for ${metric.name}: ${metric.currentPriority} -> ${newPriority}`,
            {
              successRate: metric.successRate.toFixed(2) + "%",
              avgResponseTime: metric.avgResponseTime.toFixed(0) + "ms",
              slaViolations: metric.slaViolations,
            }
          );
        }
      }
    } catch (error) {
      console.error("[FallbackRouting] Error updating aggregator priorities:", error);
    }
  }

  /**
   * Получение статистики по агрегаторам
   */
  async getAggregatorStats(periodDays: number = 7): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);
    
    const aggregators = await db.aggregator.findMany({
      orderBy: { priority: "asc" },
      include: {
        integrationLogs: {
          where: {
            createdAt: { gte: startDate },
            eventType: "deal_create",
          },
        },
        transactions: {
          where: {
            createdAt: { gte: startDate },
          },
        },
      },
    });
    
    return aggregators.map(aggregator => {
      const logs = aggregator.integrationLogs;
      const transactions = aggregator.transactions;
      
      const totalAttempts = logs.length;
      const successfulAttempts = logs.filter(log => log.statusCode === 200 && !log.error).length;
      const avgResponseTime = totalAttempts > 0
        ? logs.reduce((sum, log) => sum + (log.responseTimeMs || 0), 0) / totalAttempts
        : 0;
      const slaViolations = logs.filter(log => log.slaViolation).length;
      
      const totalTransactions = transactions.length;
      const completedTransactions = transactions.filter(t => t.status === "READY").length;
      const totalVolume = transactions.reduce((sum, t) => sum + t.amount, 0);
      
      return {
        id: aggregator.id,
        name: aggregator.name,
        priority: aggregator.priority,
        isActive: aggregator.isActive,
        balanceUsdt: aggregator.balanceUsdt,
        stats: {
          period: `${periodDays} days`,
          totalAttempts,
          successfulAttempts,
          successRate: totalAttempts > 0 ? (successfulAttempts / totalAttempts * 100).toFixed(2) + "%" : "0%",
          avgResponseTime: avgResponseTime.toFixed(0) + "ms",
          slaViolations,
          slaViolationRate: totalAttempts > 0 ? (slaViolations / totalAttempts * 100).toFixed(2) + "%" : "0%",
          totalTransactions,
          completedTransactions,
          completionRate: totalTransactions > 0 ? (completedTransactions / totalTransactions * 100).toFixed(2) + "%" : "0%",
          totalVolume,
        },
      };
    });
  }
}

export const fallbackRoutingService = FallbackRoutingService.getInstance();
