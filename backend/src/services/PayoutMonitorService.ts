import { BaseService } from "./BaseService";
import { ServiceRegistry } from "./ServiceRegistry";
import { db } from "../db";
import type { PayoutService } from "./payout.service";
import type { TelegramService } from "./TelegramService";

export class PayoutMonitorService extends BaseService {
  private static instance: PayoutMonitorService;
  private monitorInterval: Timer | null = null;
  private readonly MONITOR_INTERVAL = 30000; // Check every 30 seconds
  public readonly autoStart = true; // Enable auto-start

  static getInstance(): PayoutMonitorService {
    if (!PayoutMonitorService.instance) {
      PayoutMonitorService.instance = new PayoutMonitorService();
    }
    return PayoutMonitorService.instance;
  }

  private constructor() {
    super();
  }

  private getPayoutService(): PayoutService | null {
    try {
      return ServiceRegistry.getInstance().get<PayoutService>("payout");
    } catch {
      return null;
    }
  }

  private getTelegramService(): TelegramService | null {
    try {
      return ServiceRegistry.getInstance().get<TelegramService>("TelegramService");
    } catch {
      return null;
    }
  }

  async start(): Promise<void> {
    console.log("[PayoutMonitorService] Starting payout monitor service...");
    
    // Run initial check
    await this.checkAndDistributePayouts();
    
    // Set up interval
    this.monitorInterval = setInterval(async () => {
      await this.checkAndDistributePayouts();
    }, this.MONITOR_INTERVAL);
  }

  async stop(): Promise<void> {
    console.log("[PayoutMonitorService] Stopping payout monitor service...");
    
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  private async checkAndDistributePayouts(): Promise<void> {
    try {
      // Find unassigned payouts that are not expired
      const unassignedPayouts = await db.payout.findMany({
        where: {
          status: "CREATED",
          traderId: null,
          expireAt: {
            gt: new Date(), // Not expired
          },
        },
        include: {
          merchant: true,
        },
        orderBy: {
          createdAt: "asc", // Process oldest first
        },
      });

      if (unassignedPayouts.length === 0) {
        return;
      }

      console.log(`[PayoutMonitorService] Found ${unassignedPayouts.length} unassigned payouts`);


      const telegramService = this.getTelegramService();

      // Process each unassigned payout
      for (const payout of unassignedPayouts) {
        // Get traders connected to this merchant with OUT operations enabled
        const connectedTraders = await db.traderMerchant.findMany({
          where: {
            merchantId: payout.merchantId,
            isMerchantEnabled: true,
            isFeeOutEnabled: true // Check that OUT operations are enabled
          },
          select: { traderId: true }
        });

        const traderIds = connectedTraders.map(ct => ct.traderId);

        // Find eligible traders with their filters
        const eligibleTraders = await db.user.findMany({
          where: {
            id: { in: traderIds }, // Only traders connected to the merchant
            banned: false,
            trafficEnabled: true,
            // Remove balance check here - we'll check it per payout below
          },
          include: {
            payoutFilters: true,
          },
          orderBy: {
            createdAt: "asc", // FIFO distribution
          },
        });

        // Find traders who can accept this payout
        const availableTraders = [];

        for (const trader of eligibleTraders) {
          // Check if this trader previously had this payout
          if (payout.previousTraderIds && payout.previousTraderIds.includes(trader.id)) {
            continue;
          }

          // Check trader's available payout balance including assigned payouts
          const pendingAmount = await db.payout.aggregate({
            where: { traderId: trader.id, status: "CREATED" },
            _sum: { amount: true }
          });
          const assignedTotal =
            trader.frozenPayoutBalance + (pendingAmount._sum.amount || 0);
          if (trader.payoutBalance < assignedTotal + payout.amount) {
            continue;
          }

          // Check trader's filters
          if (trader.payoutFilters) {
            const filters = trader.payoutFilters;
            
            // Check max payout amount filter
            if (filters.maxPayoutAmount > 0 && payout.amount > filters.maxPayoutAmount) {
              continue;
            }

            // Check traffic type filter
            if (filters.trafficTypes.length > 0) {
              const payoutTrafficType = payout.isCard ? "card" : "sbp";
              if (!filters.trafficTypes.includes(payoutTrafficType) && !filters.trafficTypes.includes("both")) {
                continue;
              }
            }

            // Check bank type filter
            if (filters.bankTypes.length > 0 && payout.bank) {
              // Convert bank name to BankType enum value
              const bankTypeMap: { [key: string]: string } = {
                "Сбербанк": "SBERBANK",
                "Райффайзен": "RAIFFEISEN",
                "Газпромбанк": "GAZPROMBANK",
                "Почта Банк": "POCHTABANK",
                "ВТБ": "VTB",
                "Россельхозбанк": "ROSSELKHOZBANK",
                "Альфа-банк": "ALFABANK",
                "Уралсиб": "URALSIB",
                "Локо-Банк": "LOKOBANK",
                "Ак Барс": "AKBARS",
                "МКБ": "MKB",
                "Банк Санкт-Петербург": "SPBBANK",
                "МТС Банк": "MTSBANK",
                "Промсвязьбанк": "PROMSVYAZBANK",
                "Озон Банк": "OZONBANK",
                "Открытие": "OTKRITIE",
                "Ренессанс": "RENAISSANCE",
                "ОТП Банк": "OTPBANK",
                "Авангард": "AVANGARD",
                "Владбизнесбанк": "VLADBUSINESSBANK",
                "Таврический": "TAVRICHESKIY",
                "Фора-Банк": "FORABANK",
                "БКС Банк": "BCSBANK",
                "Хоум Кредит": "HOMECREDIT",
                "ББР Банк": "BBRBANK",
                "Кредит Европа Банк": "CREDITEUROPE",
                "РНКБ": "RNKB",
                "УБРиР": "UBRIR",
                "Генбанк": "GENBANK",
                "Синара": "SINARA",
                "Абсолют Банк": "ABSOLUTBANK",
                "МТС Деньги": "MTSMONEY",
                "Свой Банк": "SVOYBANK",
                "ТрансКапиталБанк": "TRANSKAPITALBANK",
                "Долинск": "DOLINSK",
                "Т-Банк": "TBANK",
                "Совкомбанк": "SOVCOMBANK",
                "Росбанк": "ROSBANK",
                "ЮниКредит": "UNICREDIT",
                "Ситибанк": "CITIBANK",
                "Русский Стандарт": "RUSSIANSTANDARD"
              };

              const payoutBankType = bankTypeMap[payout.bank];
              if (payoutBankType && !filters.bankTypes.includes(payoutBankType as any)) {
                continue;
              }
            }
          }

          // Check trader's current active payout count
          const activeCount = await db.payout.count({
            where: {
              traderId: trader.id,
              status: "ACTIVE",
            },
          });

          // Check personal limit
          if (activeCount >= trader.maxSimultaneousPayouts) {
            continue;
          }

          // This trader is eligible
          availableTraders.push({
            trader,
            activeCount,
          });
        }

        if (availableTraders.length === 0) {
          console.log(`[PayoutMonitorService] No eligible traders for payout ${payout.id}`);
          continue;
        }

        console.log(`[PayoutMonitorService] Found ${availableTraders.length} eligible traders for payout ${payout.id}`);

        // Send notifications to all eligible traders
        if (telegramService) {
          for (const { trader } of availableTraders) {
            try {
              await telegramService.notifyTraderNewPayout(trader.id, payout);
            } catch (error) {
              console.error(`[PayoutMonitorService] Failed to notify trader ${trader.id}:`, error);
            }
          }
        }

        // Log distribution attempt
        console.log(
          `[PayoutMonitorService] Distributed payout ${payout.numericId} to ${availableTraders.length} traders`
        );
      }
    } catch (error) {
      console.error("[PayoutMonitorService] Error in checkAndDistributePayouts:", error);
    }
  }

  // Method to manually trigger distribution for a specific payout
  async distributeSpecificPayout(payoutId: string): Promise<void> {
    try {
      const payout = await db.payout.findUnique({
        where: { id: payoutId },
        include: { merchant: true },
      });

      if (!payout || payout.status !== "CREATED" || payout.traderId) {
        return;
      }


      // Get traders connected to this merchant with OUT operations enabled
      const connectedTraders = await db.traderMerchant.findMany({
        where: {
          merchantId: payout.merchantId,
          isMerchantEnabled: true,
          isFeeOutEnabled: true // Check that OUT operations are enabled
        },
        select: { traderId: true }
      });

      const traderIds = connectedTraders.map(ct => ct.traderId);

      // Find eligible traders, excluding those who previously worked with this payout
      const traders = await db.user.findMany({
        where: {
          id: { in: traderIds }, // Only traders connected to the merchant
          banned: false,
          trafficEnabled: true,
          // Exclude traders who previously had this payout
          AND: {
            id: {
              notIn: payout.previousTraderIds || [],
            },
          },
        },
        include: {
          payoutFilters: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      const telegramService = this.getTelegramService();
      let notificationsSent = 0;

      for (const trader of traders) {
        // Check trader has sufficient payout balance
        const pendingAmount = await db.payout.aggregate({
          where: { traderId: trader.id, status: "CREATED" },
          _sum: { amount: true }
        });
        const assignedTotal =
          trader.frozenPayoutBalance + (pendingAmount._sum.amount || 0);
        if (trader.payoutBalance < assignedTotal + payout.amount) {
          continue;
        }

        // Check trader's filters
        if (trader.payoutFilters) {
          const filters = trader.payoutFilters;
          
          // Check max payout amount filter
          if (filters.maxPayoutAmount > 0 && payout.amount > filters.maxPayoutAmount) {
            continue;
          }

          // Check traffic type filter
          if (filters.trafficTypes.length > 0) {
            const payoutTrafficType = payout.isCard ? "card" : "sbp";
            if (!filters.trafficTypes.includes(payoutTrafficType) && !filters.trafficTypes.includes("both")) {
              continue;
            }
          }

          // Check bank type filter
          if (filters.bankTypes.length > 0 && payout.bank) {
            const bankTypeMap: { [key: string]: string } = {
              "Сбербанк": "SBERBANK",
              "Райффайзен": "RAIFFEISEN",
              "Газпромбанк": "GAZPROMBANK",
              "Почта Банк": "POCHTABANK",
              "ВТБ": "VTB",
              "Россельхозбанк": "ROSSELKHOZBANK",
              "Альфа-банк": "ALFABANK",
              "Уралсиб": "URALSIB",
              "Локо-Банк": "LOKOBANK",
              "Ак Барс": "AKBARS",
              "МКБ": "MKB",
              "Банк Санкт-Петербург": "SPBBANK",
              "МТС Банк": "MTSBANK",
              "Промсвязьбанк": "PROMSVYAZBANK",
              "Озон Банк": "OZONBANK",
              "Открытие": "OTKRITIE",
              "Ренессанс": "RENAISSANCE",
              "ОТП Банк": "OTPBANK",
              "Авангард": "AVANGARD",
              "Владбизнесбанк": "VLADBUSINESSBANK",
              "Таврический": "TAVRICHESKIY",
              "Фора-Банк": "FORABANK",
              "БКС Банк": "BCSBANK",
              "Хоум Кредит": "HOMECREDIT",
              "ББР Банк": "BBRBANK",
              "Кредит Европа Банк": "CREDITEUROPE",
              "РНКБ": "RNKB",
              "УБРиР": "UBRIR",
              "Генбанк": "GENBANK",
              "Синара": "SINARA",
              "Абсолют Банк": "ABSOLUTBANK",
              "МТС Деньги": "MTSMONEY",
              "Свой Банк": "SVOYBANK",
              "ТрансКапиталБанк": "TRANSKAPITALBANK",
              "Долинск": "DOLINSK",
              "Т-Банк": "TBANK",
              "Совкомбанк": "SOVCOMBANK",
              "Росбанк": "ROSBANK",
              "ЮниКредит": "UNICREDIT",
              "Ситибанк": "CITIBANK",
              "Русский Стандарт": "RUSSIANSTANDARD"
            };

            const payoutBankType = bankTypeMap[payout.bank];
            if (payoutBankType && !filters.bankTypes.includes(payoutBankType as any)) {
              continue;
            }
          }
        }

        // Check trader's active payout count
        const activeCount = await db.payout.count({
          where: {
            traderId: trader.id,
            status: "ACTIVE",
          },
        });

        // Check personal limit
        if (activeCount >= trader.maxSimultaneousPayouts) {
          continue;
        }

        // Send notification
        if (telegramService) {
          try {
            await telegramService.notifyTraderNewPayout(trader.id, payout);
            notificationsSent++;
          } catch (error) {
            console.error(`[PayoutMonitorService] Failed to notify trader ${trader.id}:`, error);
          }
        }
      }

      console.log(
        `[PayoutMonitorService] Sent ${notificationsSent} notifications for payout ${payout.numericId}`
      );
    } catch (error) {
      console.error("[PayoutMonitorService] Error in distributeSpecificPayout:", error);
    }
  }
}

// Register service
ServiceRegistry.register("PayoutMonitorService", PayoutMonitorService.getInstance());

export default PayoutMonitorService;