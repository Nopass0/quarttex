import { BaseService } from "./BaseService";
import { db } from "@/db";
import { PayoutStatus, Prisma, BankType } from "@prisma/client";
import { broadcastPayoutUpdate } from "@/routes/websocket/payouts";
import { ServiceRegistry } from "./ServiceRegistry";
import { payoutAccountingService } from "./payout-accounting.service";
import type { TelegramService } from "./TelegramService";

// Map bank display names to enum values for comparison
const bankNameToEnum: Record<string, BankType> = {
  "Сбербанк": BankType.SBERBANK,
  "Райффайзен": BankType.RAIFFEISEN,
  "Газпромбанк": BankType.GAZPROMBANK,
  "Почта Банк": BankType.POCHTABANK,
  "ВТБ": BankType.VTB,
  "Россельхозбанк": BankType.ROSSELKHOZBANK,
  "Альфа-банк": BankType.ALFABANK,
  "Уралсиб": BankType.URALSIB,
  "Локо-Банк": BankType.LOKOBANK,
  "Ак Барс": BankType.AKBARS,
  "МКБ": BankType.MKB,
  "Банк Санкт-Петербург": BankType.SPBBANK,
  "МТС Банк": BankType.MTSBANK,
  "Промсвязьбанк": BankType.PROMSVYAZBANK,
  "Озон Банк": BankType.OZONBANK,
  "Открытие": BankType.OTKRITIE,
  "Ренессанс": BankType.RENAISSANCE,
  "ОТП Банк": BankType.OTPBANK,
  "Авангард": BankType.AVANGARD,
  "Владбизнесбанк": BankType.VLADBUSINESSBANK,
  "Таврический": BankType.TAVRICHESKIY,
  "Фора-Банк": BankType.FORABANK,
  "БКС Банк": BankType.BCSBANK,
  "Хоум Кредит": BankType.HOMECREDIT,
  "ББР Банк": BankType.BBRBANK,
  "Кредит Европа Банк": BankType.CREDITEUROPE,
  "РНКБ": BankType.RNKB,
  "УБРиР": BankType.UBRIR,
  "Генбанк": BankType.GENBANK,
  "Синара": BankType.SINARA,
  "Абсолют Банк": BankType.ABSOLUTBANK,
  "МТС Деньги": BankType.MTSMONEY,
  "Свой Банк": BankType.SVOYBANK,
  "ТрансКапиталБанк": BankType.TRANSKAPITALBANK,
  "Долинск": BankType.DOLINSK,
  "Т-Банк": BankType.TBANK,
  "Совкомбанк": BankType.SOVCOMBANK,
  "Росбанк": BankType.ROSBANK,
  "ЮниКредит": BankType.UNICREDIT,
  "Ситибанк": BankType.CITIBANK,
  "Русский Стандарт": BankType.RUSSIANSTANDARD,
};

interface TraderCandidate {
  id: string;
  email: string;
  payoutBalance: number;
  frozenPayoutBalance: number;
  balanceRub: number;
  frozenRub: number;
  maxSimultaneousPayouts: number;
  activePayouts: number;
  filters?: {
    trafficTypes: string[];
    bankTypes: string[];
    maxPayoutAmount: number;
  } | null;
}

export default class PayoutRedistributionService extends BaseService {
  private static instance: PayoutRedistributionService;
  private readonly BATCH_SIZE = 100; // Process payouts in batches
  private isProcessing = false;
  public readonly autoStart = true; // Enable auto-start
  private lastRunTime = 0;
  private readonly RUN_INTERVAL_MS = 1000; // Run every 1 second
  private traderQueuePosition: Map<string, number> = new Map(); // For round-robin distribution

  private constructor() {
    super();
    // Set the tick interval to 1 second for checking
    this.interval = 1000;
  }

  static getInstance(): PayoutRedistributionService {
    if (!PayoutRedistributionService.instance) {
      PayoutRedistributionService.instance = new PayoutRedistributionService();
    }
    return PayoutRedistributionService.instance;
  }

  protected async onStart(): Promise<void> {
    await this.logInfo("Payout Redistribution Service starting", { runInterval: this.RUN_INTERVAL_MS });
    
    // Run initial redistribution
    await this.redistributePayouts();
    this.lastRunTime = Date.now();
    
    await this.logInfo("Payout Redistribution Service started successfully");
  }

  protected async onStop(): Promise<void> {
    // Wait for current processing to complete
    while (this.isProcessing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    await this.logInfo("Payout Redistribution Service stopped");
  }

  protected async tick(): Promise<void> {
    // Check if it's time to run redistribution
    const now = Date.now();
    if (now - this.lastRunTime >= this.RUN_INTERVAL_MS) {
      this.lastRunTime = now;
      await this.redistributePayouts();
    }
  }

  public async redistributePayouts(): Promise<void> {
    if (this.isProcessing) {
      await this.logDebug("Redistribution already in progress, skipping");
      return;
    }

    this.isProcessing = true;
    const startTime = Date.now();
    let totalAssigned = 0;

    try {
      // Get all unassigned payouts
      const unassignedPayouts = await db.payout.findMany({
        where: {
          status: PayoutStatus.CREATED,
          traderId: null,
          expireAt: {
            gt: new Date() // Not expired
          }
        },
        include: {
          merchant: {
            include: {
              traderMerchants: true
            }
          },
          blacklistEntries: {
            select: {
              traderId: true
            }
          }
        },
        orderBy: {
          createdAt: 'asc' // Process oldest first
        }
      });

      await this.logInfo(`[PayoutRedistribution] Found ${unassignedPayouts.length} unassigned payouts`);

      // Process in batches for better performance
      for (let i = 0; i < unassignedPayouts.length; i += this.BATCH_SIZE) {
        const batch = unassignedPayouts.slice(i, i + this.BATCH_SIZE);
        const assignments = await this.processBatch(batch);
        totalAssigned += assignments;
      }

      const duration = Date.now() - startTime;
      await this.logInfo(`Redistribution completed`, {
        totalPayouts: unassignedPayouts.length,
        assigned: totalAssigned,
        durationMs: duration
      });

      // Update service metrics
      await this.updateMetrics({
        lastRunAt: new Date(),
        payoutsProcessed: unassignedPayouts.length,
        payoutsAssigned: totalAssigned,
        processingTimeMs: duration
      });

    } catch (error) {
      await this.logError("Error in redistributePayouts", { error });
    } finally {
      this.isProcessing = false;
    }
  }

  private async processBatch(payouts: any[]): Promise<number> {
    let assigned = 0;

    // Get all potential traders with their current payout counts and queue positions
    let allTraders = await this.getEligibleTraders();

    // Create a working copy of traders list for round-robin
    let availableTraders = [...allTraders];

    for (const payout of payouts) {
      // Filter traders for this specific payout while preserving queue order
      let suitableTraders = await this.filterSuitableTradersForPayout(payout, availableTraders);

      if (suitableTraders.length === 0) {
        // No suitable traders from current queue, try with full list
        suitableTraders = await this.filterSuitableTradersForPayout(payout, allTraders);
        if (suitableTraders.length === 0) {
          await this.logInfo(`[PayoutRedistribution] No suitable traders found for payout ${payout.id}`, {
            payoutId: payout.id,
            amount: payout.amount,
            bank: payout.bank,
            isCard: payout.isCard,
            merchantId: payout.merchantId,
            totalTradersChecked: allTraders.length
          });
          continue;
        }
      }

      // Take the first suitable trader from the queue
      const trader = suitableTraders[0];

      try {
        await this.assignPayoutToTrader(payout, trader);
        assigned++;

        // Update trader's active payout count
        trader.activePayouts++;

        // Move trader to end of queues for round-robin
        availableTraders = availableTraders.filter(t => t.id !== trader.id);
        availableTraders.push(trader);
        allTraders = allTraders.filter(t => t.id !== trader.id);
        allTraders.push(trader);

        // Update persistent queue position
        const maxPosition = Math.max(0, ...this.traderQueuePosition.values());
        this.traderQueuePosition.set(trader.id, maxPosition + 1);
      } catch (error) {
        await this.logError(`Failed to assign payout ${payout.id}`, { error });
      }
    }

    return assigned;
  }

  private async getEligibleTraders(): Promise<TraderCandidate[]> {
    const traders = await db.user.findMany({
      where: {
        banned: false,
        trafficEnabled: true,
        deposit: {
          gte: 1000 // Minimum deposit requirement
        }
      },
      select: {
        id: true,
        email: true,
        payoutBalance: true,
        frozenPayoutBalance: true,
        balanceRub: true,
        frozenRub: true,
        maxSimultaneousPayouts: true,
        _count: {
          select: {
            payouts: {
              where: {
                // Count both assigned (CREATED with traderId) and active payouts
                OR: [
                  { status: PayoutStatus.ACTIVE },
                  { status: PayoutStatus.CHECKING },
                  {
                    status: PayoutStatus.CREATED,
                    traderId: { not: null }
                  }
                ]
              }
            }
          }
        },
        payoutFilters: true
      }
    });

    // Initialize queue positions for new traders and sort by position
    let maxPosition = Math.max(0, ...this.traderQueuePosition.values());
    for (const trader of traders) {
      if (!this.traderQueuePosition.has(trader.id)) {
        this.traderQueuePosition.set(trader.id, ++maxPosition);
      }
    }

    const sortedTraders = traders.sort(
      (a, b) =>
        (this.traderQueuePosition.get(a.id) || 0) -
        (this.traderQueuePosition.get(b.id) || 0)
    );

    await this.logInfo(`[PayoutRedistribution] Found ${sortedTraders.length} eligible traders`, {
      traders: sortedTraders.map(t => ({
        email: t.email,
        payoutBalance: t.payoutBalance,
        balanceRub: t.balanceRub,
        activePayouts: t._count.payouts,
        maxSimultaneous: t.maxSimultaneousPayouts,
        trafficEnabled: t.trafficEnabled
      }))
    });

    return sortedTraders.map(trader => ({
      id: trader.id,
      email: trader.email,
      payoutBalance: trader.payoutBalance,
      frozenPayoutBalance: trader.frozenPayoutBalance,
      balanceRub: trader.balanceRub,
      frozenRub: trader.frozenRub,
      maxSimultaneousPayouts: trader.maxSimultaneousPayouts,
      activePayouts: trader._count.payouts,
      filters: trader.payoutFilters
    }));
  }

  private async filterSuitableTradersForPayout(
    payout: any,
    traders: TraderCandidate[]
  ): Promise<TraderCandidate[]> {
    // Log blacklist entries for debugging
    if (payout.blacklistEntries && payout.blacklistEntries.length > 0) {
      await this.logDebug(`Payout ${payout.id} has blacklist entries:`, {
        blacklistedTraders: payout.blacklistEntries.map((entry: any) => entry.traderId)
      });
    }
    
    const eligibleTraders: TraderCandidate[] = [];

    for (const trader of traders) {
      // Skip if trader has reached simultaneous payout limit
      if (trader.activePayouts >= trader.maxSimultaneousPayouts) {
        continue;
      }

      // Check payout balance considering assigned payouts
      const pendingAmount = await db.payout.aggregate({
        where: { traderId: trader.id, status: "CREATED" },
        _sum: { amount: true }
      });
      const assignedTotal = pendingAmount._sum.amount || 0;
      const availableFromPayout =
        trader.payoutBalance - trader.frozenPayoutBalance;
      const availableFromRub = trader.balanceRub - trader.frozenRub;
      const availableBalance = Math.max(
        availableFromPayout,
        availableFromRub
      );
      if (availableBalance < assignedTotal + payout.amount) {
        continue;
      }

      // Skip if this trader is in the blacklist (previously cancelled this payout)
      if (payout.previousTraderIds && payout.previousTraderIds.includes(trader.id)) {
        continue;
      }

      // Check PayoutBlacklist table
      const isBlacklisted = payout.blacklistEntries?.some(
        (entry: any) => entry.traderId === trader.id
      );
      if (isBlacklisted) {
        continue;
      }

      // Check merchant-trader relationship for specific method
      const merchantRelation = payout.merchant.traderMerchants.find(
        (tm: any) =>
          tm.traderId === trader.id &&
          tm.methodId === payout.methodId &&
          tm.isMerchantEnabled &&
          tm.isFeeOutEnabled
      );

      // Skip if no matching relation or payouts disabled
      if (!merchantRelation) {
        continue;
      }

      // Check trader filters if they exist
      if (trader.filters) {
        // Check max payout amount
        const maxAmount = trader.filters.maxPayoutAmount || 0;
        if (maxAmount > 0 && payout.amount > maxAmount) {
          continue;
        }

        // Check traffic type filter - only if filters are set AND balance > 0
        // If balance is set but no filters selected, all traffic types are allowed
        const hasBalanceSet = maxAmount > 0;
        const trafficTypes = trader.filters.trafficTypes || [];
        if (trafficTypes.length > 0) {
          const payoutTrafficType = payout.isCard ? "card" : "sbp";
          if (!trafficTypes.includes(payoutTrafficType)) {
            continue;
          }
        } else if (hasBalanceSet) {
          // Balance is set but no traffic types selected - allow all types
          // Continue processing (don't skip this trader)
        } else if (!hasBalanceSet && trafficTypes.length === 0) {
          // No balance and no traffic types - skip this trader (not participating)
          continue;
        }

        // Check bank filter - only if filters are set AND balance > 0
        // If balance is set but no bank filters selected, all banks are allowed
        const bankTypes = trader.filters.bankTypes || [];
        if (bankTypes.length > 0) {
          // Convert payout bank name to enum value for comparison
          const payoutBankEnum = bankNameToEnum[payout.bank];
          if (!payoutBankEnum || !bankTypes.includes(payoutBankEnum)) {
            continue;
          }
        } else if (hasBalanceSet) {
          // Balance is set but no bank filters selected - allow all banks
          // Continue processing (don't skip this trader)
        }
      } else {
        // No filters object - skip this trader (not participating)
        continue;
      }

      eligibleTraders.push(trader);
    }

    return eligibleTraders;
  }

  private async assignPayoutToTrader(
    payout: any,
    trader: TraderCandidate
  ): Promise<void> {
    // Use new method that only assigns without accepting
    const updatedPayout = await payoutAccountingService.assignPayoutToTrader(
      payout.id,
      trader.id
    );

    await this.logInfo(`Assigned payout ${payout.id} to trader ${trader.email} (not accepted yet)`, {
      payoutId: payout.id,
      traderId: trader.id,
      blacklistCount: payout.blacklistEntries?.length || 0
    });

    // Send WebSocket notification - status remains CREATED
    broadcastPayoutUpdate(
      updatedPayout.id,
      "CREATED",
      updatedPayout,
      payout.merchantId,
      trader.id
    );

    // Send specific assignment notification using broadcastPayoutUpdate with custom event
    // The trader will receive this via the standard WebSocket channel
    // Event type "withdrawal:assigned" indicates a new payout was assigned to them

    // Send Telegram notification
    const telegramService = this.getTelegramService();
    if (telegramService) {
      await telegramService.notifyTraderNewPayout(trader.id, updatedPayout);
    }
  }

  private getTelegramService(): TelegramService | null {
    try {
      return ServiceRegistry.getInstance().get<TelegramService>("TelegramService");
    } catch {
      return null;
    }
  }

  private async updateMetrics(metrics: any): Promise<void> {
    try {
      await db.serviceConfig.upsert({
        where: { serviceKey: "payout_redistribution_metrics" },
        create: {
          serviceKey: "payout_redistribution_metrics",
          config: metrics,
          isEnabled: true
        },
        update: {
          config: metrics
        }
      });
    } catch (error) {
      await this.logError("Failed to update metrics", { error });
    }
  }

  // Public method for testing performance
  async testPerformance(payoutCount: number = 1000, merchantId?: string): Promise<{ duration: number, assigned: number }> {
    const startTime = Date.now();
    
    // Create test payouts
    const testPayouts = Array.from({ length: payoutCount }, (_, i) => ({
      merchantId: merchantId || "test-merchant",
      amount: 1000 + i,
      amountUsdt: 10 + i / 100,
      total: 1100 + i,
      totalUsdt: 11 + i / 100,
      rate: 100,
      wallet: `test-wallet-${i}`,
      bank: "Test Bank",
      isCard: true,
      status: PayoutStatus.CREATED,
      expireAt: new Date(Date.now() + 3600000),
      acceptanceTime: 5,
      processingTime: 15,
      direction: "OUT" as const
    }));

    // Bulk create
    await db.payout.createMany({
      data: testPayouts
    });

    // Run redistribution
    await this.redistributePayouts();

    const duration = Date.now() - startTime;
    
    // Count assigned
    const assigned = await db.payout.count({
      where: {
        status: PayoutStatus.ACTIVE,
        traderId: { not: null },
        createdAt: { gte: new Date(startTime) }
      }
    });

    // Cleanup
    await db.payout.deleteMany({
      where: {
        wallet: { startsWith: "test-wallet-" }
      }
    });

    return { duration, assigned };
  }
}

// Register service instance for dependency injection
ServiceRegistry.register(
  "PayoutRedistributionService",
  PayoutRedistributionService.getInstance()
);