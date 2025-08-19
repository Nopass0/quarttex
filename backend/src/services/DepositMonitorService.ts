import { BaseService } from "./BaseService";
import { db } from "@/db";
import { DepositStatus, DepositType } from "@prisma/client";
import { truncate2 } from "@/utils/rounding";

export default class DepositMonitorService extends BaseService {
  private readonly INTERVAL_MS = 60000; // Check every minute
  private readonly TRON_API_KEY = Bun.env.TRON_API_KEY || "";
  private readonly TRON_API_URL = "https://api.trongrid.io";
  public readonly autoStart = true;

  constructor() {
    super();
    this.interval = this.INTERVAL_MS;
  }

  protected async onStart(): Promise<void> {
    await this.logInfo("Deposit Monitor Service starting", {
      interval: this.INTERVAL_MS,
    });

    // Run initial check
    await this.checkPendingDeposits();

    await this.logInfo("Deposit Monitor Service started successfully");
  }

  protected async tick(): Promise<void> {
    await this.checkPendingDeposits();
  }

  protected async onStop(): Promise<void> {
    await this.logInfo("Deposit Monitor Service stopped");
  }

  private async checkPendingDeposits(): Promise<void> {
    try {
      // Get all pending deposits
      const pendingDeposits = await db.depositRequest.findMany({
        where: {
          status: {
            in: [DepositStatus.PENDING, DepositStatus.CHECKING],
          },
        },
        include: {
          trader: true,
        },
      });

      await this.logDebug(
        `Checking ${pendingDeposits.length} pending deposits`
      );

      // Get deposit settings
      const [walletAddress, confirmationsRequired, expiryMinutes] =
        await Promise.all([
          db.systemConfig.findUnique({
            where: { key: "deposit_wallet_address" },
          }),
          db.systemConfig.findUnique({
            where: { key: "deposit_confirmations_required" },
          }),
          db.systemConfig.findUnique({
            where: { key: "deposit_expiry_minutes" },
          }),
        ]);

      if (!walletAddress) {
        await this.logError("Deposit wallet address not configured");
        return;
      }

      const requiredConfirmations = parseInt(
        confirmationsRequired?.value || "3"
      );
      const expiryMs = parseInt(expiryMinutes?.value || "60") * 60 * 1000;

      for (const deposit of pendingDeposits) {
        try {
          // Check if deposit expired
          const now = new Date();
          const expiryTime = new Date(deposit.createdAt.getTime() + expiryMs);

          if (now > expiryTime) {
            await this.expireDeposit(deposit.id);
            continue;
          }

          // Mock transaction check - in production, this would call TRON API
          // For demo purposes, we'll simulate finding a transaction
          const mockTransaction = await this.mockCheckTransaction(deposit);

          if (mockTransaction) {
            // Update deposit with transaction info
            await db.depositRequest.update({
              where: { id: deposit.id },
              data: {
                status: DepositStatus.CHECKING,
                txHash: mockTransaction.txHash,
                confirmations: mockTransaction.confirmations,
              },
            });

            // Check if enough confirmations
            // DISABLED: Now admin must manually confirm deposits
            // if (mockTransaction.confirmations >= requiredConfirmations) {
            //   await this.confirmDeposit(deposit);
            // }
          }
        } catch (error) {
          await this.logError(`Error checking deposit ${deposit.id}`, {
            error,
          });
        }
      }
    } catch (error) {
      await this.logError("Error in checkPendingDeposits", { error });
    }
  }

  private async mockCheckTransaction(
    deposit: any
  ): Promise<{ txHash: string; confirmations: number } | null> {
    // Only process deposits that already have a txHash (provided by trader)
    if (!deposit.txHash) {
      return null;
    }

    // In production, this would call TRON API to verify the transaction
    // For now, we'll simulate confirmations for deposits that have txHash
    const timeSinceCreation = Date.now() - deposit.createdAt.getTime();

    // Simulate increasing confirmations over time
    return {
      txHash: deposit.txHash,
      confirmations: Math.floor(timeSinceCreation / 20000), // 1 confirmation every 20 seconds
    };
  }

  private async confirmDeposit(deposit: any): Promise<void> {
    const now = new Date();

    // Start transaction
    await db.$transaction(async (tx) => {
      // Update deposit status
      await tx.depositRequest.update({
        where: { id: deposit.id },
        data: {
          status: DepositStatus.CONFIRMED,
          confirmedAt: now,
          processedAt: now,
        },
      });

      // Update trader balance based on deposit type
      const updateData =
        deposit.type === DepositType.INSURANCE
          ? { deposit: { increment: truncate2(deposit.amountUSDT) } }
          : { trustBalance: { increment: truncate2(deposit.amountUSDT) } };

      await tx.user.update({
        where: { id: deposit.traderId },
        data: updateData,
      });

      // Create admin log
      await tx.adminLog.create({
        data: {
          adminId: "system",
          action: "DEPOSIT_CONFIRMED",
          details: `Deposit ${deposit.id} confirmed for ${
            deposit.amountUSDT
          } USDT, ${
            deposit.type === DepositType.INSURANCE
              ? "insurance deposit"
              : "trader balance"
          } updated`,
          ip: "system",
        },
      });
    });

    await this.logInfo(
      `Deposit ${deposit.id} confirmed, added ${deposit.amountUSDT} USDT to trader ${deposit.trader.email}`
    );
  }

  private async expireDeposit(depositId: string): Promise<void> {
    await db.depositRequest.update({
      where: { id: depositId },
      data: {
        status: DepositStatus.EXPIRED,
      },
    });

    await db.adminLog.create({
      data: {
        adminId: "system",
        action: "DEPOSIT_EXPIRED",
        details: `Deposit ${depositId} expired due to timeout`,
        ip: "system",
      },
    });

    await this.logInfo(`Deposit ${depositId} expired`);
  }

  // Real TRON API implementation (commented out for demo)
  /*
  private async checkTronTransactions(address: string, fromTimestamp: number): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.TRON_API_URL}/v1/accounts/${address}/transactions/trc20?only_to=true&limit=200&min_timestamp=${fromTimestamp}`,
        {
          headers: {
            'TRON-PRO-API-KEY': this.TRON_API_KEY
          }
        }
      );

      if (!response.ok) {
        throw new Error(`TRON API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      await this.logError("Error fetching TRON transactions", { error });
      return [];
    }
  }
  */
}
