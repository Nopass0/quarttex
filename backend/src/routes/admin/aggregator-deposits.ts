import { Elysia, t } from "elysia";
import { db } from "@/db";
import { AggregatorDepositStatus } from "@prisma/client";
import ErrorSchema from "@/types/error";
import { MASTER_KEY } from "@/utils/constants";
import { adminGuard } from "@/middleware/adminGuard";

export default new Elysia({ prefix: "/aggregator-deposits" })
  .use(adminGuard())

  // Get all aggregator deposit requests
  .get(
    "/",
    async ({ query }) => {
      try {
        const { status, page = 1, limit = 50 } = query;
        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const skip = (pageNum - 1) * limitNum;

        const where: any = {};
        if (status) where.status = status as AggregatorDepositStatus;

        const [deposits, total] = await Promise.all([
          db.aggregatorDepositRequest.findMany({
            where,
            skip,
            take: limitNum,
            orderBy: { createdAt: "desc" },
            include: {
              aggregator: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                  balanceUsdt: true,
                },
              },
            },
          }),
          db.aggregatorDepositRequest.count({ where }),
        ]);

        return {
          deposits: deposits.map((deposit) => ({
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
        console.error("Failed to get aggregator deposit requests:", error);
        throw new Error("Failed to get aggregator deposit requests");
      }
    },
    {
      tags: ["admin"],
      detail: { summary: "Получение заявок на пополнение агрегаторов" },
      query: t.Object({
        status: t.Optional(t.String()),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
      response: {
        200: t.Object({
          deposits: t.Array(
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
              aggregator: t.Object({
                id: t.String(),
                email: t.String(),
                name: t.String(),
                balanceUsdt: t.Number(),
              }),
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

  // Confirm aggregator deposit
  .post(
    "/:depositId/confirm",
    async ({ params, body, adminId, ip, set }) => {
      const clientIp = ip;
      try {
        const { depositId } = params;
        const { txHash } = body;

        const deposit = await db.aggregatorDepositRequest.findUnique({
          where: { id: depositId },
          include: { aggregator: true },
        });

        if (!deposit) {
          set.status = 404;
          return { error: "Deposit request not found" };
        }

        if (deposit.status !== AggregatorDepositStatus.PENDING) {
          set.status = 400;
          return { error: "Deposit request is not pending" };
        }

        // Update deposit and aggregator balance in transaction
        const updatedDeposit = await db.$transaction(async (prisma) => {
          // Update deposit status
          const deposit = await prisma.aggregatorDepositRequest.update({
            where: { id: depositId },
            data: {
              status: AggregatorDepositStatus.CONFIRMED,
              confirmedAt: new Date(),
              processedAt: new Date(),
              txHash: txHash || deposit.txHash,
              confirmations: 1,
            },
            include: { aggregator: true },
          });

          // Add to aggregator balance
          await prisma.aggregator.update({
            where: { id: deposit.aggregatorId },
            data: {
              balanceUsdt: {
                increment: deposit.amountUSDT,
              },
            },
          });

          return deposit;
        });

        // Log admin action
        await db.adminLog.create({
          data: {
            adminId,
            action: "AGGREGATOR_DEPOSIT_CONFIRMED",
            details: `Confirmed deposit request ${depositId} for ${deposit.amountUSDT} USDT for aggregator ${deposit.aggregator.email}`,
            ip: clientIp,
          },
        });

        return {
          success: true,
          deposit: {
            ...updatedDeposit,
            createdAt: updatedDeposit.createdAt.toISOString(),
            confirmedAt: updatedDeposit.confirmedAt?.toISOString() || null,
            processedAt: updatedDeposit.processedAt?.toISOString() || null,
          },
        };
      } catch (error) {
        console.error("Failed to confirm aggregator deposit:", error);
        set.status = 500;
        return { error: "Failed to confirm deposit" };
      }
    },
    {
      tags: ["admin"],
      detail: { summary: "Подтверждение депозита агрегатора" },
      body: t.Object({
        txHash: t.Optional(t.String()),
      }),
      response: {
        200: t.Object({
          success: t.Boolean(),
          deposit: t.Any(),
        }),
        400: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
    }
  )

  // Reject aggregator deposit
  .post(
    "/:depositId/reject",
    async ({ params, body, adminId, ip, set }) => {
      const clientIp = ip;
      try {
        const { depositId } = params;
        const { reason } = body;

        const deposit = await db.aggregatorDepositRequest.findUnique({
          where: { id: depositId },
          include: { aggregator: true },
        });

        if (!deposit) {
          set.status = 404;
          return { error: "Deposit request not found" };
        }

        if (deposit.status !== AggregatorDepositStatus.PENDING) {
          set.status = 400;
          return { error: "Deposit request is not pending" };
        }

        const updatedDeposit = await db.aggregatorDepositRequest.update({
          where: { id: depositId },
          data: {
            status: AggregatorDepositStatus.FAILED,
            processedAt: new Date(),
          },
          include: { aggregator: true },
        });

        // Log admin action
        await db.adminLog.create({
          data: {
            adminId,
            action: "AGGREGATOR_DEPOSIT_REJECTED",
            details: `Rejected deposit request ${depositId} for ${deposit.amountUSDT} USDT for aggregator ${deposit.aggregator.email}. Reason: ${reason}`,
            ip: clientIp,
          },
        });

        return {
          success: true,
          deposit: {
            ...updatedDeposit,
            createdAt: updatedDeposit.createdAt.toISOString(),
            confirmedAt: updatedDeposit.confirmedAt?.toISOString() || null,
            processedAt: updatedDeposit.processedAt?.toISOString() || null,
          },
        };
      } catch (error) {
        console.error("Failed to reject aggregator deposit:", error);
        set.status = 500;
        return { error: "Failed to reject deposit" };
      }
    },
    {
      tags: ["admin"],
      detail: { summary: "Отклонение депозита агрегатора" },
      body: t.Object({
        reason: t.String(),
      }),
      response: {
        200: t.Object({
          success: t.Boolean(),
          deposit: t.Any(),
        }),
        400: ErrorSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
    }
  );
