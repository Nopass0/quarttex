import { db } from '@/db';
import { Status } from '@prisma/client';

export class AggregatorMetricsService {
  static instance: AggregatorMetricsService;

  static getInstance(): AggregatorMetricsService {
    if (!AggregatorMetricsService.instance) {
      AggregatorMetricsService.instance = new AggregatorMetricsService();
    }
    return AggregatorMetricsService.instance;
  }

  /**
   * Обновить метрики агрегатора при изменении статуса транзакции
   */
  async updateMetricsOnStatusChange(
    transactionId: string,
    oldStatus: Status,
    newStatus: Status
  ): Promise<void> {
    // Получаем транзакцию с агрегатором
    const transaction = await db.transaction.findUnique({
      where: { id: transactionId },
      include: {
        aggregator: true,
        method: true
      }
    });

    if (!transaction || !transaction.aggregator) {
      return; // Транзакция не связана с агрегатором
    }

    const aggregator = transaction.aggregator;
    
    // Рассчитываем сумму в USDT на основе курса транзакции
    const rate = transaction.rate || 100;
    const amountUsdt = transaction.amount / rate;

    // Обновляем метрики в зависимости от нового статуса
    const updateData: any = {};

    // NO_REQUISITE - не выдал реквизиты
    if (newStatus === 'NO_REQUISITE' && oldStatus !== 'NO_REQUISITE') {
      updateData.balanceNoRequisite = { increment: amountUsdt };
      console.log(`[AggregatorMetrics] Updated NO_REQUISITE balance for ${aggregator.name}: +${amountUsdt} USDT`);
    }

    // READY - успешная сделка
    if (newStatus === 'READY' && oldStatus !== 'READY') {
      updateData.balanceSuccess = { increment: amountUsdt };
      console.log(`[AggregatorMetrics] Updated SUCCESS balance for ${aggregator.name}: +${amountUsdt} USDT`);
    }

    // EXPIRED - истекшая сделка с выданными реквизитами
    if (newStatus === 'EXPIRED' && oldStatus !== 'EXPIRED') {
      // Проверяем, были ли выданы реквизиты
      if (transaction.bankDetailId) {
        updateData.balanceExpired = { increment: amountUsdt };
        console.log(`[AggregatorMetrics] Updated EXPIRED balance for ${aggregator.name}: +${amountUsdt} USDT`);
      }
    }

    // Применяем обновления если есть
    if (Object.keys(updateData).length > 0) {
      await db.aggregator.update({
        where: { id: aggregator.id },
        data: updateData
      });
    }
  }

  /**
   * Получить все метрики агрегатора
   */
  async getAggregatorMetrics(aggregatorId: string): Promise<{
    balanceUsdt: number;
    depositUsdt: number;
    balanceNoRequisite: number;
    balanceSuccess: number;
    balanceExpired: number;
    totalPlatformProfit: number;
    totalTransactions: number;
    successRate: number;
  }> {
    const aggregator = await db.aggregator.findUnique({
      where: { id: aggregatorId },
      include: {
        _count: {
          select: {
            transactions: true
          }
        },
        transactions: {
          where: {
            status: 'READY'
          }
        }
      }
    });

    if (!aggregator) {
      throw new Error('Aggregator not found');
    }

    const successfulTransactions = aggregator.transactions.length;
    const totalTransactions = aggregator._count.transactions;
    const successRate = totalTransactions > 0 
      ? (successfulTransactions / totalTransactions) * 100 
      : 0;

    return {
      balanceUsdt: aggregator.balanceUsdt,
      depositUsdt: aggregator.depositUsdt,
      balanceNoRequisite: aggregator.balanceNoRequisite,
      balanceSuccess: aggregator.balanceSuccess,
      balanceExpired: aggregator.balanceExpired,
      totalPlatformProfit: aggregator.totalPlatformProfit,
      totalTransactions,
      successRate: Math.round(successRate * 100) / 100
    };
  }

  /**
   * Пополнить депозит агрегатора
   */
  async addDeposit(aggregatorId: string, amount: number): Promise<void> {
    if (amount <= 0) {
      throw new Error('Deposit amount must be positive');
    }

    await db.aggregator.update({
      where: { id: aggregatorId },
      data: {
        depositUsdt: { increment: amount }
      }
    });

    console.log(`[AggregatorMetrics] Deposit added to aggregator: +${amount} USDT`);
  }

  /**
   * Пополнить основной баланс агрегатора
   */
  async addBalance(aggregatorId: string, amount: number): Promise<void> {
    if (amount <= 0) {
      throw new Error('Balance amount must be positive');
    }

    await db.aggregator.update({
      where: { id: aggregatorId },
      data: {
        balanceUsdt: { increment: amount }
      }
    });

    console.log(`[AggregatorMetrics] Balance added to aggregator: +${amount} USDT`);
  }
}

export const aggregatorMetricsService = AggregatorMetricsService.getInstance();