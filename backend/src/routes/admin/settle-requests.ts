import { Elysia, t } from "elysia"
import { db } from "@/db"
import { SettleRequestStatus } from "@prisma/client"

export const settleRequestsRoutes = new Elysia({ prefix: "/settle-requests" })
  // Get all settle requests
  .get("/", async ({ query, set, error }) => {
    try {
      console.log("Fetching settle requests with query:", query)
      
      const page = parseInt(query.page || "1")
      const limit = parseInt(query.limit || "50")
      const skip = (page - 1) * limit

      const where: any = {}
      if (query.status) {
        where.status = query.status
      }
      if (query.merchantId) {
        where.merchantId = query.merchantId
      }

      console.log("Query params:", { page, limit, skip, where })

      const [requests, total] = await Promise.all([
        db.settleRequest.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            merchant: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        db.settleRequest.count({ where }),
      ])

      console.log(`Found ${total} settle requests`)

      return {
        data: requests,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }
    } catch (e) {
      console.error("Failed to fetch settle requests - detailed error:", e)
      return error(500, { error: "Failed to fetch settle requests" })
    }
  }, {
    query: t.Object({
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      status: t.Optional(t.Enum(SettleRequestStatus)),
      merchantId: t.Optional(t.String()),
    }),
  })

  // Get single settle request
  .get("/:id", async ({ params, set, error }) => {
    try {
      console.log("Fetching single settle request:", params.id)
      
      const request = await db.settleRequest.findUnique({
        where: { id: params.id },
        include: {
          merchant: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      if (!request) {
        return error(404, { error: "Settle request not found" })
      }

      console.log("Found request:", request.id, "for merchant:", request.merchantId)

      // Calculate balance with error handling
      let currentBalance = 0
      let balanceFormula = {
        dealsTotal: 0,
        dealsCommission: 0,
        payoutsTotal: 0,
        payoutsCommission: 0,
        settledAmount: 0,
        rateCalculation: 'RAPIRA' as 'RAPIRA' | 'MERCHANT'
      }

      try {
        // Get merchant data separately for balance calculation
        const merchant = await db.merchant.findUnique({
          where: { id: request.merchantId },
          select: { countInRubEquivalent: true }
        });

        const [transactions, payouts, completedSettles] = await Promise.all([
          db.transaction.findMany({
            where: { 
              merchantId: request.merchantId,
              status: "READY" 
            },
            select: { 
              amount: true, 
              methodId: true,
              merchantRate: true
            },
          }),
          db.payout.findMany({
            where: { 
              merchantId: request.merchantId,
              status: "COMPLETED" 
            },
            select: { 
              amount: true, 
              methodId: true,
              merchantRate: true
            },
          }),
          db.settleRequest.findMany({
            where: { 
              merchantId: request.merchantId,
              status: "COMPLETED"
            },
            select: { amount: true },
          })
        ])

        // Get methods to calculate commissions
        const methodIds = [
          ...new Set(
            [
              ...transactions.map((t) => t.methodId),
              ...payouts.map((p) => p.methodId),
            ].filter((id): id is string => Boolean(id))
          ),
        ];

        const methods = await db.method.findMany({
          where: { id: { in: methodIds } },
          select: {
            id: true,
            commissionPayin: true,
            commissionPayout: true,
          },
        });

        const methodCommissionsMap = new Map(methods.map(m => [m.id, m]));

        // Calculate totals with proper commission
        let dealsTotal = 0;
        let dealsCommission = 0;
        for (const tx of transactions) {
          const method = methodCommissionsMap.get(tx.methodId);
          if (method) {
            const commission = tx.amount * (method.commissionPayin / 100);
            dealsTotal += tx.amount;
            dealsCommission += commission;
          } else {
            dealsTotal += tx.amount;
          }
        }

        let payoutsTotal = 0;
        let payoutsCommission = 0;
        for (const payout of payouts) {
          const method = methodCommissionsMap.get(payout.methodId);
          if (method) {
            const commission = payout.amount * (method.commissionPayout / 100);
            payoutsTotal += payout.amount;
            payoutsCommission += commission;
          } else {
            payoutsTotal += payout.amount;
          }
        }

        const settledAmount = completedSettles.reduce((sum, s) => sum + s.amount, 0)

        currentBalance = dealsTotal - dealsCommission - payoutsTotal - payoutsCommission - settledAmount
        balanceFormula = {
          dealsTotal,
          dealsCommission,
          payoutsTotal,
          payoutsCommission,
          settledAmount,
          rateCalculation: merchant?.countInRubEquivalent ? 'RAPIRA' : 'MERCHANT'
        }
      } catch (balanceError) {
        console.error("Error calculating balance:", balanceError)
        // Continue with zero values if balance calculation fails
      }

      return {
        request,
        currentBalance,
        balanceFormula,
      }
    } catch (e) {
      console.error("Failed to fetch settle request - detailed error:", e)
      return error(500, { error: "Failed to fetch settle requests" })
    }
  }, {
    params: t.Object({
      id: t.String(),
    }),
  })

  // Approve settle request
  .post("/:id/approve", async ({ params, set, error, request }) => {
    try {
      // Get admin info from token (adminGuard already validated)
      const adminToken = request.headers.get("x-admin-key") || ""
      const admin = await db.admin.findFirst({ where: { token: adminToken } })

      const settleRequest = await db.settleRequest.findUnique({
        where: { id: params.id },
        include: {
          merchant: true,
        },
      })

      if (!settleRequest) {
        return error(404, { error: "Settle request not found" })
      }

      if (settleRequest.status !== "PENDING") {
        return error(400, { error: "Request is not pending" })
      }

      // Update the settle request
      const updatedRequest = await db.settleRequest.update({
        where: { id: params.id },
        data: {
          status: "COMPLETED",
          processedAt: new Date(),
          processedBy: admin?.id || "SUPER_ADMIN",
        },
      })

      set.status = 200
      return { success: true, request: updatedRequest }
    } catch (e) {
      console.error("Failed to approve settle request:", e)
      return error(500, { error: "Failed to approve settle request" })
    }
  }, {
    params: t.Object({
      id: t.String(),
    }),
  })

  // Cancel settle request
  .post("/:id/cancel", async ({ params, body, set, error, request }) => {
    try {
      // Get admin info from token (adminGuard already validated)
      const adminToken = request.headers.get("x-admin-key") || ""
      const admin = await db.admin.findFirst({ where: { token: adminToken } })

      const settleRequest = await db.settleRequest.findUnique({
        where: { id: params.id },
      })

      if (!settleRequest) {
        return error(404, { error: "Settle request not found" })
      }

      if (settleRequest.status !== "PENDING") {
        return error(400, { error: "Request is not pending" })
      }

      const updatedRequest = await db.settleRequest.update({
        where: { id: params.id },
        data: {
          status: SettleRequestStatus.CANCELLED,
          processedAt: new Date(),
          processedBy: admin?.id || "SUPER_ADMIN",
          cancelReason: body.reason,
        },
      })

      return { success: true, request: updatedRequest }
    } catch (e) {
      console.error("Failed to cancel settle request:", e)
      return error(500, { error: "Failed to cancel settle request" })
    }
  }, {
    params: t.Object({
      id: t.String(),
    }),
    body: t.Object({
      reason: t.String(),
    }),
  })

  // Get settle history for a merchant
  .get("/merchant/:merchantId", async ({ params, query, set, error }) => {
    try {
      const page = parseInt(query.page || "1")
      const limit = parseInt(query.limit || "50")
      const skip = (page - 1) * limit

      const where: any = {
        merchantId: params.merchantId,
      }
      // Optional status filter; if not provided, return all statuses
      if (query.status) {
        where.status = query.status as SettleRequestStatus
      }

      const [requests, total] = await Promise.all([
        db.settleRequest.findMany({
          where,
          skip,
          take: limit,
          orderBy: { processedAt: "desc" },
        }),
        db.settleRequest.count({ where }),
      ])

      return {
        data: requests,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }
    } catch (e) {
      console.error("Failed to fetch settle requests:", e)
      return error(500, { error: "Failed to fetch settle requests" })
    }
  }, {
    params: t.Object({
      merchantId: t.String(),
    }),
    query: t.Object({
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      status: t.Optional(t.Enum(SettleRequestStatus)),
    }),
  })