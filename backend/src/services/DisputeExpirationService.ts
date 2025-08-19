import { BaseService } from './BaseService';
import { db } from '../db';

export default class DisputeExpirationService extends BaseService {
  protected interval = 60_000; // Check every minute
  protected displayName = 'Dispute Expiration Service';
  protected description = 'Notifies about expired disputes without auto-closing';
  protected tags = ['disputes', 'automation'];

  constructor() {
    super({
      displayName: 'Dispute Expiration Service',
      description: 'Monitors dispute timeouts and posts system messages when time expires',
      interval: 60_000, // 1 minute
      enabled: true,
      autoStart: true,
      tags: ['disputes', 'automation'],
    });
  }

  protected async tick(): Promise<void> {
    try {
      await this.logDebug('Checking for expired disputes...');

      // Get dispute timeout settings from system config
      const systemConfig = await db.systemConfig.findMany({
        where: {
          key: {
            in: [
              'disputeDayShiftStartHour',
              'disputeDayShiftEndHour',
              'disputeDayShiftTimeoutMinutes',
              'disputeNightShiftTimeoutMinutes'
            ]
          }
        }
      });

      const configMap = Object.fromEntries(
        systemConfig.map(c => [c.key, c.value])
      );

      const dayShiftStartHour = parseInt(configMap.disputeDayShiftStartHour || '9');
      const dayShiftEndHour = parseInt(configMap.disputeDayShiftEndHour || '21');
      const dayShiftTimeoutMinutes = parseInt(configMap.disputeDayShiftTimeoutMinutes || '30');
      const nightShiftTimeoutMinutes = parseInt(configMap.disputeNightShiftTimeoutMinutes || '60');

      // Process Deal Disputes
      const expiredDealDisputes = await this.findExpiredDealDisputes(
        dayShiftStartHour,
        dayShiftEndHour,
        dayShiftTimeoutMinutes,
        nightShiftTimeoutMinutes
      );

      if (expiredDealDisputes.length > 0) {
        await this.logInfo(`Found ${expiredDealDisputes.length} expired deal disputes`);

        for (const dispute of expiredDealDisputes) {
          await this.notifyDealDispute(dispute);
        }
      }

      // Process Withdrawal Disputes (Payout disputes)
      const expiredWithdrawalDisputes = await this.findExpiredWithdrawalDisputes(
        dayShiftStartHour,
        dayShiftEndHour,
        dayShiftTimeoutMinutes,
        nightShiftTimeoutMinutes
      );

      if (expiredWithdrawalDisputes.length > 0) {
        await this.logInfo(`Found ${expiredWithdrawalDisputes.length} expired withdrawal disputes`);

        for (const dispute of expiredWithdrawalDisputes) {
          await this.notifyWithdrawalDispute(dispute);
        }
      }

      // Update public fields with statistics
      await this.updatePublicFieldsInDb({
        lastCheck: new Date().toISOString(),
        dealDisputesNotified: expiredDealDisputes.length,
        withdrawalDisputesNotified: expiredWithdrawalDisputes.length,
        totalNotified: expiredDealDisputes.length + expiredWithdrawalDisputes.length
      });

    } catch (error) {
      await this.logError('Error in dispute expiration check', { error: error.message });
      throw error;
    }
  }

  private async findExpiredDealDisputes(
    dayShiftStartHour: number,
    dayShiftEndHour: number,
    dayShiftTimeoutMinutes: number,
    nightShiftTimeoutMinutes: number
  ) {
    // Get all open/in_progress disputes
    const activeDisputes = await db.dealDispute.findMany({
      where: {
        status: {
          in: ['OPEN', 'IN_PROGRESS']
        }
      },
      include: {
        deal: true,
        merchant: true,
        trader: true
      }
    });

    const now = new Date();
    const expiredDisputes = [];

    for (const dispute of activeDisputes) {
      const createdAt = new Date(dispute.createdAt);
      const createdHour = createdAt.getHours();
      
      // Determine timeout based on shift
      const isDayShift = createdHour >= dayShiftStartHour && createdHour < dayShiftEndHour;
      const timeoutMinutes = isDayShift ? dayShiftTimeoutMinutes : nightShiftTimeoutMinutes;
      
      // Calculate deadline
      const deadline = new Date(createdAt.getTime() + timeoutMinutes * 60 * 1000);
      
      if (now > deadline) {
        expiredDisputes.push(dispute);
      }
    }

    return expiredDisputes;
  }

  private async findExpiredWithdrawalDisputes(
    dayShiftStartHour: number,
    dayShiftEndHour: number,
    dayShiftTimeoutMinutes: number,
    nightShiftTimeoutMinutes: number
  ) {
    // Get all open/in_progress withdrawal disputes
    const activeDisputes = await db.withdrawalDispute.findMany({
      where: {
        status: {
          in: ['OPEN', 'IN_PROGRESS']
        }
      },
      include: {
        payout: true,
        merchant: true,
        trader: true
      }
    });

    const now = new Date();
    const expiredDisputes = [];

    for (const dispute of activeDisputes) {
      const createdAt = new Date(dispute.createdAt);
      const createdHour = createdAt.getHours();
      
      // Determine timeout based on shift
      const isDayShift = createdHour >= dayShiftStartHour && createdHour < dayShiftEndHour;
      const timeoutMinutes = isDayShift ? dayShiftTimeoutMinutes : nightShiftTimeoutMinutes;
      
      // Calculate deadline
      const deadline = new Date(createdAt.getTime() + timeoutMinutes * 60 * 1000);
      
      if (now > deadline) {
        expiredDisputes.push(dispute);
      }
    }

    return expiredDisputes;
  }

  private async notifyDealDispute(dispute: any) {
    try {
      await this.logInfo(`Notifying expired deal dispute ${dispute.id}`, {
        dealId: dispute.dealId,
        traderId: dispute.traderId,
        merchantId: dispute.merchantId
      });

      const exists = await db.dealDisputeMessage.findFirst({
        where: {
          disputeId: dispute.id,
          senderId: 'system',
          message: {
            contains: 'Время на ответ истекло'
          }
        }
      });

      if (exists) {
        return;
      }

      await db.dealDisputeMessage.create({
        data: {
          disputeId: dispute.id,
          senderId: 'system',
          senderType: 'ADMIN',
          message: 'Время на ответ истекло, спор будет рассмотрен администратором. Переписка может быть продолжена.'
        }
      });

      await this.logInfo(`Expiration notice added to deal dispute ${dispute.id}`);
    } catch (error) {
      await this.logError(`Failed to notify deal dispute ${dispute.id}`, { error: error.message });
    }
  }

  private async notifyWithdrawalDispute(dispute: any) {
    try {
      await this.logInfo(`Notifying expired withdrawal dispute ${dispute.id}`, {
        payoutId: dispute.payoutId,
        traderId: dispute.traderId,
        merchantId: dispute.merchantId
      });

      const exists = await db.withdrawalDisputeMessage.findFirst({
        where: {
          disputeId: dispute.id,
          senderId: 'system',
          message: {
            contains: 'Время на ответ истекло'
          }
        }
      });

      if (exists) {
        return;
      }

      await db.withdrawalDisputeMessage.create({
        data: {
          disputeId: dispute.id,
          senderId: 'system',
          senderType: 'ADMIN',
          message: 'Время на ответ истекло, спор будет рассмотрен администратором. Переписка может быть продолжена.'
        }
      });

      await this.logInfo(`Expiration notice added to withdrawal dispute ${dispute.id}`);
    } catch (error) {
      await this.logError(`Failed to notify withdrawal dispute ${dispute.id}`, { error: error.message });
    }
  }

  protected getPublicFields(): Record<string, any> {
    return {
      lastCheck: this.getSetting('lastCheck', 'Never'),
      dealDisputesNotified: this.getSetting('dealDisputesNotified', 0),
      withdrawalDisputesNotified: this.getSetting('withdrawalDisputesNotified', 0),
      totalNotified: this.getSetting('totalNotified', 0)
    };
  }
}