import { Elysia, t } from "elysia";
import { db } from "@/db";
import { AggregatorDepositStatus } from "@prisma/client";
import ErrorSchema from "@/types/error";

export default (app: Elysia) =>
  app
    /* ──────── GET /aggregator/deposits/settings ──────── */
    .get(
      "/settings",
      async ({ aggregator, set }) => {
        try {
          console.log(
            "[AggregatorDeposits] Getting deposit settings for:",
            aggregator.email
          );

          const [
            walletAddress,
            minAmount,
            confirmationsRequired,
            expiryMinutes,
          ] = await Promise.all([
            db.systemConfig.findUnique({
              where: { key: "deposit_wallet_address" },
            }),
            db.systemConfig.findUnique({
              where: { key: "min_deposit_amount" },
            }),
            db.systemConfig.findUnique({
              where: { key: "deposit_confirmations_required" },
            }),
            db.systemConfig.findUnique({
              where: { key: "deposit_expiry_minutes" },
            }),
          ]);

          if (!walletAddress) {
            set.status = 500;
            return {
              error: "Deposit wallet not configured. Please contact support.",
            };
          }

          return {
            success: true,
            data: {
              address: walletAddress.value,
              minAmount: parseFloat(minAmount?.value || "10"),
              confirmationsRequired: parseInt(
                confirmationsRequired?.value || "3"
              ),
              expiryMinutes: parseInt(expiryMinutes?.value || "60"),
              network: "TRC-20",
            },
          };
        } catch (error) {
          console.error(
            "[AggregatorDeposits] Failed to get deposit settings:",
            error
          );
          set.status = 500;
          return {
            error:
              error instanceof Error
                ? error.message
                : "Failed to get deposit settings",
          };
        }
      },
      {
        tags: ["aggregator-deposits"],
        detail: { summary: "Получение настроек пополнения" },
        response: {
          200: t.Object({
            success: t.Boolean(),
            data: t.Object({
              address: t.String(),
              minAmount: t.Number(),
              confirmationsRequired: t.Number(),
              expiryMinutes: t.Number(),
              network: t.String(),
            }),
          }),
          401: ErrorSchema,
          403: ErrorSchema,
          500: ErrorSchema,
        },
      }
    )

    /* ──────── POST /aggregator/deposits ──────── */
    .post(
      "/",
      async ({ aggregator, body, set }) => {
        try {
          const { amountUSDT, txHash } = body;

          console.log("[AggregatorDeposits] Creating deposit request:", {
            aggregatorId: aggregator.id,
            amountUSDT,
            txHash: txHash ? `${txHash.substring(0, 10)}...` : "none",
          });

          // Get deposit settings
          const [walletAddress, minAmount] = await Promise.all([
            db.systemConfig.findUnique({
              where: { key: "deposit_wallet_address" },
            }),
            db.systemConfig.findUnique({
              where: { key: "min_deposit_amount" },
            }),
          ]);

          if (!walletAddress) {
            set.status = 500;
            return { error: "Deposit wallet not configured" };
          }

          const minDepositAmount = parseFloat(minAmount?.value || "10");
          if (amountUSDT < minDepositAmount) {
            set.status = 400;
            return {
              error: `Минимальная сумма пополнения ${minDepositAmount} USDT`,
            };
          }

          // Check for existing pending deposits
          const pendingDeposit = await db.aggregatorDepositRequest.findFirst({
            where: {
              aggregatorId: aggregator.id,
              status: {
                in: [
                  AggregatorDepositStatus.PENDING,
                  AggregatorDepositStatus.CHECKING,
                ],
              },
            },
          });

          if (pendingDeposit) {
            set.status = 400;
            return { error: "У вас уже есть активная заявка на пополнение" };
          }

          // Create deposit request
          const depositRequest = await db.aggregatorDepositRequest.create({
            data: {
              aggregatorId: aggregator.id,
              amountUSDT,
              address: walletAddress.value,
              status: AggregatorDepositStatus.PENDING,
              txHash: txHash || null,
            },
          });

          // Log admin action
          await db.adminLog.create({
            data: {
              adminId: "system",
              action: "AGGREGATOR_DEPOSIT_REQUEST_CREATED",
              details: `Aggregator ${aggregator.email} created deposit request for ${amountUSDT} USDT`,
              ip: "system",
            },
          });

          console.log(
            "[AggregatorDeposits] Deposit request created:",
            depositRequest.id
          );

          set.status = 201;
          return {
            success: true,
            data: {
              ...depositRequest,
              createdAt: depositRequest.createdAt.toISOString(),
              confirmedAt: depositRequest.confirmedAt?.toISOString() || null,
              processedAt: depositRequest.processedAt?.toISOString() || null,
            },
          };
        } catch (error) {
          console.error(
            "[AggregatorDeposits] Failed to create deposit request:",
            error
          );
          set.status = 500;
          return { error: "Failed to create deposit request" };
        }
      },
      {
        tags: ["aggregator-deposits"],
        detail: { summary: "Создание заявки на пополнение" },
        body: t.Object({
          amountUSDT: t.Number({ minimum: 0 }),
          txHash: t.Optional(t.String()),
        }),
        response: {
          201: t.Object({
            success: t.Boolean(),
            data: t.Object({
              id: t.String(),
              aggregatorId: t.String(),
              amountUSDT: t.Number(),
              address: t.String(),
              status: t.Enum(AggregatorDepositStatus),
              txHash: t.Union([t.String(), t.Null()]),
              confirmations: t.Number(),
              createdAt: t.String(),
              confirmedAt: t.Union([t.String(), t.Null()]),
              processedAt: t.Union([t.String(), t.Null()]),
            }),
          }),
          400: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
          500: ErrorSchema,
        },
      }
    )

    /* ──────── GET /aggregator/deposits ──────── */
    .get(
      "/",
      async ({ aggregator, query }) => {
        try {
          const { page = "1", limit = "20", status } = query;
          const pageNum = parseInt(page);
          const limitNum = parseInt(limit);
          const skip = (pageNum - 1) * limitNum;

          const where = {
            aggregatorId: aggregator.id,
            ...(status && { status: status as AggregatorDepositStatus }),
          };

          const [deposits, total] = await Promise.all([
            db.aggregatorDepositRequest.findMany({
              where,
              skip,
              take: limitNum,
              orderBy: { createdAt: "desc" },
            }),
            db.aggregatorDepositRequest.count({ where }),
          ]);

          return {
            success: true,
            data: deposits.map((deposit) => ({
              ...deposit,
              createdAt: deposit.createdAt.toISOString(),
              confirmedAt: deposit.confirmedAt?.toISOString() || null,
              processedAt: deposit.processedAt?.toISOString() || null,
            })),
            pagination: {
              page: pageNum,
              limit: limitNum,
              total,
              totalPages: Math.ceil(total / limitNum),
            },
          };
        } catch (error) {
          console.error(
            "[AggregatorDeposits] Failed to get deposit requests:",
            error
          );
          throw new Error("Failed to get deposit requests");
        }
      },
      {
        tags: ["aggregator-deposits"],
        detail: { summary: "Получение списка заявок на пополнение" },
        query: t.Object({
          page: t.Optional(t.String()),
          limit: t.Optional(t.String()),
          status: t.Optional(t.String()),
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            data: t.Array(
              t.Object({
                id: t.String(),
                aggregatorId: t.String(),
                amountUSDT: t.Number(),
                address: t.String(),
                status: t.Enum(AggregatorDepositStatus),
                txHash: t.Union([t.String(), t.Null()]),
                confirmations: t.Number(),
                createdAt: t.String(),
                confirmedAt: t.Union([t.String(), t.Null()]),
                processedAt: t.Union([t.String(), t.Null()]),
              })
            ),
            pagination: t.Object({
              page: t.Number(),
              limit: t.Number(),
              total: t.Number(),
              totalPages: t.Number(),
            }),
          }),
          401: ErrorSchema,
          403: ErrorSchema,
          500: ErrorSchema,
        },
      }
    )

    /* ──────── GET /aggregator/deposits/stats ──────── */
    .get(
      "/stats",
      async ({ aggregator }) => {
        try {
          const [totalDeposited, pendingCount, totalCount] = await Promise.all([
            db.aggregatorDepositRequest.aggregate({
              where: {
                aggregatorId: aggregator.id,
                status: AggregatorDepositStatus.CONFIRMED,
              },
              _sum: {
                amountUSDT: true,
              },
            }),
            db.aggregatorDepositRequest.count({
              where: {
                aggregatorId: aggregator.id,
                status: {
                  in: [
                    AggregatorDepositStatus.PENDING,
                    AggregatorDepositStatus.CHECKING,
                  ],
                },
              },
            }),
            db.aggregatorDepositRequest.count({
              where: {
                aggregatorId: aggregator.id,
              },
            }),
          ]);

          return {
            success: true,
            data: {
              totalDeposited: totalDeposited._sum.amountUSDT || 0,
              pendingCount,
              totalCount,
              currentBalance: aggregator.balanceUsdt,
            },
          };
        } catch (error) {
          console.error(
            "[AggregatorDeposits] Failed to get deposit statistics:",
            error
          );
          throw new Error("Failed to get deposit statistics");
        }
      },
      {
        tags: ["aggregator-deposits"],
        detail: { summary: "Получение статистики по пополнениям" },
        response: {
          200: t.Object({
            success: t.Boolean(),
            data: t.Object({
              totalDeposited: t.Number(),
              pendingCount: t.Number(),
              totalCount: t.Number(),
              currentBalance: t.Number(),
            }),
          }),
          401: ErrorSchema,
          403: ErrorSchema,
          500: ErrorSchema,
        },
      }
    );
