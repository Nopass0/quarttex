import { BaseService } from "./BaseService";
import { db } from "../db";
import { ServiceRegistry } from "./ServiceRegistry";
import { PayoutService } from "./payout.service";

export default class PayoutWatcherService extends BaseService {
  private payoutService: PayoutService;
  
  constructor() {
    super("payout_watcher");
    this.displayName = "Payout Watcher";
    this.description = "Monitors payout states and handles expiration";
    this.interval = 10_000; // Check every 10 seconds
    this.autoStart = true;
    console.log("[PayoutWatcherService] Initialized with autoStart:", this.autoStart);
  }
  
  protected async onStart(): Promise<void> {
    // Initialize payout service when the watcher starts
    this.payoutService = PayoutService.getInstance();
    console.log("[PayoutWatcherService] Service started successfully");
  }
  
  protected async tick(): Promise<void> {
    // Check for expired payouts
    await this.checkExpiredPayouts();
    
    // Check for payouts that need push notifications
    await this.checkPushNotifications();
    
    // Redistribute created payouts without traders
    await this.redistributePayouts();
  }
  
  private async checkExpiredPayouts() {
    const now = new Date();
    
    // Find expired payouts (both ACTIVE and unclaimed CREATED)
    const expiredPayouts = await db.payout.findMany({
      where: {
        OR: [
          // Active payouts that expired during processing
          {
            status: "ACTIVE",
            expireAt: { lte: now },
          },
          // Created payouts that expired without being claimed
          {
            status: "CREATED",
            expireAt: { lte: now },
          },
        ],
      },
      include: { trader: true },
    });
    
    for (const payout of expiredPayouts) {
      try {
        if (payout.status === "ACTIVE" && payout.traderId) {
          // Active payout with trader - mark as expired but keep funds frozen
          await db.payout.update({
            where: { id: payout.id },
            data: {
              status: "EXPIRED",
              expireAt: new Date(),
            },
          });

          this.log(
            "INFO",
            `Expired ACTIVE payout ${payout.numericId} for trader ${payout.trader?.numericId}`
          );

          // TODO: Send WebSocket notification to remove from trader UI
          // broadcastPayoutUpdate(payout.id, "RETURNED_TO_POOL", payout, payout.merchantId, payout.traderId);
        } else if (payout.status === "CREATED") {
          const newExpireAt = new Date(
            Date.now() + payout.acceptanceTime * 60 * 1000
          );
          if (payout.traderId) {
            // Return to pool and remember previous trader
            await db.payout.update({
              where: { id: payout.id },
              data: {
                traderId: null,
                acceptedAt: null,
                expireAt: newExpireAt,
                status: "CREATED",
                previousTraderIds: {
                  push: payout.traderId,
                },
              },
            });
            this.log(
              "INFO",
              `Returned unaccepted payout ${payout.numericId} to pool`
            );
          } else {
            // Extend expiration for unassigned payout
            await db.payout.update({
              where: { id: payout.id },
              data: { expireAt: newExpireAt },
            });
            this.log("INFO", `Extended expiration for payout ${payout.numericId}`);
          }
        }
      } catch (error) {
        this.log("ERROR", `Failed to expire payout ${payout.id}`, { error });
      }
    }
  }
  
  private async checkPushNotifications() {
    const now = new Date();
    
    // Find expired payouts that need push notifications
    const payoutsNeedingPush = await db.payout.findMany({
      where: {
        status: "EXPIRED",
        pushSent: false,
        pushNotificationTime: { not: null },
        traderId: { not: null },
      },
      include: {
        trader: {
          include: {
            devices: {
              where: { emulated: false },
              orderBy: { lastActiveAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });
    
    for (const payout of payoutsNeedingPush) {
      if (!payout.trader || !payout.pushNotificationTime) continue;
      
      const minutesSinceExpiry = Math.floor(
        (now.getTime() - payout.expireAt.getTime()) / (1000 * 60)
      );
      
      if (minutesSinceExpiry >= payout.pushNotificationTime) {
        try {
          // Send push notification
          const device = payout.trader.devices[0];
          if (device) {
            // TODO: Implement notification sending
            // await this.notificationService.sendNotification(
            //   device.id,
            //   "AppNotification",
            //   {
            //     title: "Выплата истекла",
            //     message: `Выплата #${payout.numericId} истекла ${minutesSinceExpiry} минут назад`,
            //   }
            // );
            this.log("INFO", `Would send push notification for payout ${payout.numericId}`);
          }
          
          // Mark push as sent
          await db.payout.update({
            where: { id: payout.id },
            data: { pushSent: true },
          });
          
          this.log("INFO", `Sent push for expired payout ${payout.numericId}`);
        } catch (error) {
          this.log("ERROR", `Failed to send push for payout ${payout.id}`, { error });
        }
      }
    }
  }
  
  private async redistributePayouts() {
    // Find created payouts without traders that have been waiting
    const waitingPayouts = await db.payout.findMany({
      where: {
        status: "CREATED",
        traderId: null,
        createdAt: {
          lte: new Date(Date.now() - 30 * 1000), // Waiting for 30 seconds
        },
      },
      orderBy: { createdAt: "asc" },
      take: 10,
    });
    
    for (const payout of waitingPayouts) {
      try {
        await (this.payoutService as any).distributePayoutToTraders(payout);
        this.log("INFO", `Redistributed payout ${payout.numericId}`);
      } catch (error) {
        this.log("ERROR", `Failed to redistribute payout ${payout.id}`, { error });
      }
    }
  }
}

// Export the service class - it will be auto-registered by the service loader