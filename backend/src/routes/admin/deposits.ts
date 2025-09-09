import { Elysia, t } from "elysia";
import { db } from "@/db";
import { DepositStatus, DepositType } from "@prisma/client";
import ErrorSchema from "@/types/error";
import { MASTER_KEY } from "@/utils/constants";

export default new Elysia({ prefix: "/deposits" })
  // Derive adminId and clientIp from request context
  .derive(async ({ request, ip }) => {
    const adminToken = request.headers.get("x-admin-key");
    let adminId = "system";
    
    // If it's not the master key, find the admin
    if (adminToken && adminToken !== MASTER_KEY) {
      const admin = await db.admin.findUnique({
        where: { token: adminToken },
        select: { id: true }
      });
      if (admin) {
        adminId = admin.id;
      }
    }
    
    return {
      adminId,
      clientIp: ip
    };
  })
  
  // Get all deposit requests
  .get("/", async ({ query }) => {
    try {
      const { status, type, page = 1, limit = 50 } = query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};
      if (status) where.status = status as DepositStatus;
      if (type) where.type = type as DepositType;

      const [deposits, total] = await Promise.all([
        db.depositRequest.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          include: {
            trader: {
              select: {
                id: true,
                name: true,
                email: true,
                trustBalance: true
              }
            }
          }
        }),
        db.depositRequest.count({ where })
      ]);

      return {
        success: true,
        data: deposits.map(deposit => ({
          ...deposit,
          createdAt: deposit.createdAt.toISOString(),
          confirmedAt: deposit.confirmedAt?.toISOString() || null,
          processedAt: deposit.processedAt?.toISOString() || null
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      };
    } catch (error) {
      console.error("Failed to get deposit requests:", error);
      throw new Error("Failed to get deposit requests");
    }
  }, {
    tags: ["admin"],
    detail: { summary: "Get all deposit requests" },
    query: t.Object({
      status: t.Optional(t.String()),
      type: t.Optional(t.String()),
      page: t.Optional(t.String()),
      limit: t.Optional(t.String())
    }),
    response: {
      200: t.Object({
        success: t.Boolean(),
        data: t.Array(t.Object({
          id: t.String(),
          traderId: t.String(),
          amountUSDT: t.Number(),
          address: t.String(),
          status: t.Enum(DepositStatus),
          type: t.Enum(DepositType),
          txHash: t.Union([t.String(), t.Null()]),
          confirmations: t.Number(),
          createdAt: t.String(),
          confirmedAt: t.Union([t.String(), t.Null()]),
          processedAt: t.Union([t.String(), t.Null()]),
          trader: t.Object({
            id: t.String(),
            name: t.String(),
            email: t.String(),
            trustBalance: t.Number()
          })
        })),
        pagination: t.Object({
          page: t.Number(),
          limit: t.Number(),
          total: t.Number(),
          totalPages: t.Number()
        })
      }),
      401: ErrorSchema,
      403: ErrorSchema,
      500: ErrorSchema
    }
  })
  
  // Confirm deposit
  .post("/:id/confirm", async ({ params, body, adminId, clientIp, set }) => {
    try {
      const { txHash } = body;
      
      // Find deposit request
      const deposit = await db.depositRequest.findUnique({
        where: { id: params.id },
        include: { trader: true }
      });

      if (!deposit) {
        set.status = 404;
        return { error: "Deposit request not found" };
      }

      if (deposit.status === DepositStatus.CONFIRMED) {
        set.status = 400;
        return { error: "Deposit already confirmed" };
      }

      // Update deposit status and add to trader balance
      await db.$transaction(async (prisma) => {
        // Update deposit
        await prisma.depositRequest.update({
          where: { id: deposit.id },
          data: {
            status: DepositStatus.CONFIRMED,
            txHash: txHash || deposit.txHash,
            confirmations: 3, // Assuming confirmed
            confirmedAt: new Date(),
            processedAt: new Date()
          }
        });

        // Always add to trader's deposit for deposit requests
        console.log(`Confirming deposit ${deposit.id}, type: ${deposit.type}, amount: ${deposit.amountUSDT}`);
        
        const balanceUpdate = { deposit: { increment: deposit.amountUSDT } };
        
        console.log('Balance update (forced to deposit):', balanceUpdate);
        
        const updatedUser = await prisma.user.update({
          where: { id: deposit.traderId },
          data: balanceUpdate
        });
        
        console.log(`Updated user ${deposit.traderId} balance. New deposit: ${updatedUser.deposit}, trustBalance: ${updatedUser.trustBalance}`);

        // Log admin action
        await prisma.adminLog.create({
          data: {
            adminId,
            action: "DEPOSIT_CONFIRMED",
            details: `Confirmed deposit ${deposit.id} for trader ${deposit.trader.email}, amount: ${deposit.amountUSDT} USDT, txHash: ${txHash}`,
            ip: clientIp
          }
        });
      });

      return {
        success: true,
        message: "Deposit confirmed successfully"
      };
    } catch (error) {
      console.error("Failed to confirm deposit:", error);
      set.status = 500;
      return { error: "Failed to confirm deposit" };
    }
  }, {
    tags: ["admin"],
    detail: { summary: "Confirm deposit request" },
    body: t.Object({
      txHash: t.String()
    }),
    response: {
      200: t.Object({
        success: t.Boolean(),
        message: t.String()
      }),
      400: ErrorSchema,
      401: ErrorSchema,
      403: ErrorSchema,
      404: ErrorSchema,
      500: ErrorSchema
    }
  })
  
  // Reject deposit
  .post("/:id/reject", async ({ params, body, adminId, clientIp, set }) => {
    try {
      const { reason } = body;
      
      // Find deposit request
      const deposit = await db.depositRequest.findUnique({
        where: { id: params.id },
        include: { trader: true }
      });

      if (!deposit) {
        set.status = 404;
        return { error: "Deposit request not found" };
      }

      if (deposit.status !== DepositStatus.PENDING && deposit.status !== DepositStatus.CHECKING) {
        set.status = 400;
        return { error: "Cannot reject processed deposit" };
      }

      // Update deposit status
      await db.$transaction(async (prisma) => {
        await prisma.depositRequest.update({
          where: { id: deposit.id },
          data: {
            status: DepositStatus.FAILED,
            processedAt: new Date()
          }
        });

        // Log admin action
        await prisma.adminLog.create({
          data: {
            adminId,
            action: "DEPOSIT_REJECTED",
            details: `Rejected deposit ${deposit.id} for trader ${deposit.trader.email}, amount: ${deposit.amountUSDT} USDT, reason: ${reason}`,
            ip: clientIp
          }
        });
      });

      return {
        success: true,
        message: "Deposit rejected successfully"
      };
    } catch (error) {
      console.error("Failed to reject deposit:", error);
      set.status = 500;
      return { error: "Failed to reject deposit" };
    }
  }, {
    tags: ["admin"],
    detail: { summary: "Reject deposit request" },
    body: t.Object({
      reason: t.String()
    }),
    response: {
      200: t.Object({
        success: t.Boolean(),
        message: t.String()
      }),
      400: ErrorSchema,
      401: ErrorSchema,
      403: ErrorSchema,
      404: ErrorSchema,
      500: ErrorSchema
    }
  })
  
  // Get deposit statistics
  .get("/stats", async () => {
    try {
      const [totalDeposits, pendingDeposits, confirmedDeposits, totalAmount] = await Promise.all([
        db.depositRequest.count(),
        db.depositRequest.count({
          where: { status: { in: [DepositStatus.PENDING, DepositStatus.CHECKING] } }
        }),
        db.depositRequest.count({
          where: { status: DepositStatus.CONFIRMED }
        }),
        db.depositRequest.aggregate({
          where: { status: DepositStatus.CONFIRMED },
          _sum: { amountUSDT: true }
        })
      ]);

      return {
        success: true,
        data: {
          totalDeposits,
          pendingDeposits,
          confirmedDeposits,
          totalAmount: totalAmount._sum.amountUSDT || 0
        }
      };
    } catch (error) {
      console.error("Failed to get deposit statistics:", error);
      throw new Error("Failed to get deposit statistics");
    }
  }, {
    tags: ["admin"],
    detail: { summary: "Get deposit statistics" },
    response: {
      200: t.Object({
        success: t.Boolean(),
        data: t.Object({
          totalDeposits: t.Number(),
          pendingDeposits: t.Number(),
          confirmedDeposits: t.Number(),
          totalAmount: t.Number()
        })
      }),
      401: ErrorSchema,
      403: ErrorSchema,
      500: ErrorSchema
    }
  });