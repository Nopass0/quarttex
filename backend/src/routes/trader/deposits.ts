import { Elysia, t } from "elysia";
import { db } from "@/db";
import { traderGuard } from "@/middleware/traderGuard";
import { DepositStatus, DepositType } from "@prisma/client";
import ErrorSchema from "@/types/error";

export default new Elysia({ prefix: "/deposits" })
  .use(traderGuard())
  
  // Get deposit settings
  .get("/settings", async ({ set }) => {
    try {
      console.log("Getting deposit settings...");
      
      // Test database connection
      try {
        await db.$queryRaw`SELECT 1`;
      } catch (dbError) {
        console.error("Database connection error:", dbError);
        set.status = 500;
        return { error: "Database connection error" };
      }
      
      const [walletAddress, minAmount, confirmationsRequired, expiryMinutes] = await Promise.all([
        db.systemConfig.findUnique({ where: { key: "deposit_wallet_address" } }),
        db.systemConfig.findUnique({ where: { key: "min_deposit_amount" } }),
        db.systemConfig.findUnique({ where: { key: "deposit_confirmations_required" } }),
        db.systemConfig.findUnique({ where: { key: "deposit_expiry_minutes" } })
      ]);

      console.log("Settings found:", { walletAddress: !!walletAddress, minAmount: !!minAmount });

      if (!walletAddress) {
        set.status = 500;
        return { error: "Deposit wallet not configured. Please contact support." };
      }

      return {
        success: true,
        data: {
          address: walletAddress.value,
          minAmount: parseFloat(minAmount?.value || "10"),
          confirmationsRequired: parseInt(confirmationsRequired?.value || "3"),
          expiryMinutes: parseInt(expiryMinutes?.value || "60"),
          network: "TRC-20"
        }
      };
    } catch (error) {
      console.error("Failed to get deposit settings:", error);
      set.status = 500;
      return { error: error instanceof Error ? error.message : "Failed to get deposit settings" };
    }
  }, {
    tags: ["trader"],
    detail: { summary: "Получение настроек депозита" },
    response: {
      200: t.Object({
        success: t.Boolean(),
        data: t.Object({
          address: t.String(),
          minAmount: t.Number(),
          confirmationsRequired: t.Number(),
          expiryMinutes: t.Number(),
          network: t.String()
        })
      }),
      401: ErrorSchema,
      403: ErrorSchema,
      500: ErrorSchema
    }
  })
  
  // Create deposit request
  .post("/", async ({ trader, body, set }) => {
    try {
      const { amountUSDT, txHash } = body;
      
      // Get deposit settings
      const [walletAddress, minAmount, expiryMinutes] = await Promise.all([
        db.systemConfig.findUnique({ where: { key: "deposit_wallet_address" } }),
        db.systemConfig.findUnique({ where: { key: "min_deposit_amount" } }),
        db.systemConfig.findUnique({ where: { key: "deposit_expiry_minutes" } })
      ]);

      if (!walletAddress) {
        set.status = 500;
        return { error: "Deposit wallet not configured" };
      }

      const minDepositAmount = parseFloat(minAmount?.value || "10");
      if (amountUSDT < minDepositAmount) {
        set.status = 400;
        return { error: `Минимальная сумма пополнения ${minDepositAmount} USDT` };
      }

      // Check for existing pending deposits
      const pendingDeposit = await db.depositRequest.findFirst({
        where: {
          traderId: trader.id,
          status: {
            in: [DepositStatus.PENDING, DepositStatus.CHECKING]
          }
        }
      });

      if (pendingDeposit) {
        set.status = 400;
        return { error: "You already have a pending deposit request" };
      }

      // Create deposit request
      const depositRequest = await db.depositRequest.create({
        data: {
          traderId: trader.id,
          amountUSDT,
          address: walletAddress.value,
          status: DepositStatus.PENDING,
          // Всегда создаём как депозит (INSURANCE), чтобы при подтверждении пополнялся именно депозит
          type: DepositType.INSURANCE,
          txHash: txHash || null
        }
      });

      // Log admin action
      await db.adminLog.create({
        data: {
          adminId: "system",
          action: "DEPOSIT_REQUEST_CREATED",
          details: `Trader ${trader.email} created deposit request for ${amountUSDT} USDT`,
          ip: "system"
        }
      });

      set.status = 201;
      return {
        success: true,
        data: {
          ...depositRequest,
          createdAt: depositRequest.createdAt.toISOString()
        }
      };
    } catch (error) {
      console.error("Failed to create deposit request:", error);
      set.status = 500;
      return { error: "Failed to create deposit request" };
    }
  }, {
    tags: ["trader"],
    detail: { summary: "Создание заявки на пополнение" },
    body: t.Object({
      amountUSDT: t.Number({ minimum: 0 }),
      // type в теле игнорируется и всегда принудительно устанавливается как INSURANCE
      type: t.Optional(t.Enum(DepositType)),
      txHash: t.Optional(t.String())
    }),
    response: {
      201: t.Object({
        success: t.Boolean(),
        data: t.Object({
          id: t.String(),
          traderId: t.String(),
          amountUSDT: t.Number(),
          address: t.String(),
          status: t.Enum(DepositStatus),
          txHash: t.Union([t.String(), t.Null()]),
          confirmations: t.Number(),
          createdAt: t.String()
        })
      }),
      400: ErrorSchema,
      401: ErrorSchema,
      403: ErrorSchema,
      500: ErrorSchema
    }
  })
  
  // Get deposit requests
  .get("/", async ({ trader, query }) => {
    try {
      const { page = 1, limit = 20, status } = query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const where = {
        traderId: trader.id,
        ...(status && { status: status as DepositStatus })
      };

      const [deposits, total] = await Promise.all([
        db.depositRequest.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' }
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
    tags: ["trader"],
    detail: { summary: "Получение списка заявок на пополнение" },
    query: t.Object({
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      status: t.Optional(t.String())
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
          txHash: t.Union([t.String(), t.Null()]),
          confirmations: t.Number(),
          createdAt: t.String(),
          confirmedAt: t.Union([t.String(), t.Null()]),
          processedAt: t.Union([t.String(), t.Null()])
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
  
  // Get single deposit request
  .get("/:id", async ({ trader, params }) => {
    try {
      const deposit = await db.depositRequest.findFirst({
        where: {
          id: params.id,
          traderId: trader.id
        }
      });

      if (!deposit) {
        throw new Error("Deposit request not found");
      }

      return {
        success: true,
        data: {
          ...deposit,
          createdAt: deposit.createdAt.toISOString(),
          confirmedAt: deposit.confirmedAt?.toISOString() || null,
          processedAt: deposit.processedAt?.toISOString() || null
        }
      };
    } catch (error) {
      console.error("Failed to get deposit request:", error);
      throw new Error("Failed to get deposit request");
    }
  }, {
    tags: ["trader"],
    detail: { summary: "Получение информации о заявке на пополнение" },
    response: {
      200: t.Object({
        success: t.Boolean(),
        data: t.Object({
          id: t.String(),
          traderId: t.String(),
          amountUSDT: t.Number(),
          address: t.String(),
          status: t.Enum(DepositStatus),
          txHash: t.Union([t.String(), t.Null()]),
          confirmations: t.Number(),
          createdAt: t.String(),
          confirmedAt: t.Union([t.String(), t.Null()]),
          processedAt: t.Union([t.String(), t.Null()])
        })
      }),
      401: ErrorSchema,
      403: ErrorSchema,
      404: ErrorSchema,
      500: ErrorSchema
    }
  })
  
  // Get deposit statistics
  .get("/stats", async ({ trader }) => {
    try {
      const [totalDeposited, pendingCount, totalCount] = await Promise.all([
        db.depositRequest.aggregate({
          where: {
            traderId: trader.id,
            status: DepositStatus.CONFIRMED
          },
          _sum: {
            amountUSDT: true
          }
        }),
        db.depositRequest.count({
          where: {
            traderId: trader.id,
            status: {
              in: [DepositStatus.PENDING, DepositStatus.CHECKING]
            }
          }
        }),
        db.depositRequest.count({
          where: {
            traderId: trader.id
          }
        })
      ]);

      return {
        success: true,
        data: {
          totalDeposited: totalDeposited._sum.amountUSDT || 0,
          pendingCount,
          totalCount,
          currentBalance: trader.trustBalance
        }
      };
    } catch (error) {
      console.error("Failed to get deposit statistics:", error);
      throw new Error("Failed to get deposit statistics");
    }
  }, {
    tags: ["trader"],
    detail: { summary: "Получение статистики по депозитам" },
    response: {
      200: t.Object({
        success: t.Boolean(),
        data: t.Object({
          totalDeposited: t.Number(),
          pendingCount: t.Number(),
          totalCount: t.Number(),
          currentBalance: t.Number()
        })
      }),
      401: ErrorSchema,
      403: ErrorSchema,
      500: ErrorSchema
    }
  });