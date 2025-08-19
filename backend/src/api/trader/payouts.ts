import Elysia, { t } from "elysia";
import { PayoutService } from "../../services/payout.service";
import { payoutAccountingService } from "../../services/payout-accounting.service";
import { db } from "../../db";
import { validateFileUrls } from "../../middleware/fileUploadValidation";
import { fileUploadService } from "../../services/file-upload.service";

const payoutService = PayoutService.getInstance();

export const traderPayoutsApi = new Elysia({ prefix: "/payouts" })
  // Get payouts list
  .get(
    "/",
    async ({ trader, query, set }) => {

      try {
        const statusFilter = query.status?.split(",") as any;
        
        console.log(`[TraderPayoutsAPI] Requested status filter: ${query.status}, parsed: ${JSON.stringify(statusFilter)}`);
        
        const { payouts, total } = await payoutService.getTraderPayouts(
          trader.id,
          {
            status: statusFilter,
            search: query.search,
            limit: query.limit,
            offset: query.offset,
          }
        );
        
        console.log(`[TraderPayoutsAPI] Found ${payouts.length} payouts`);
        payouts.forEach(p => {
          console.log(`  - Payout ${p.numericId}: status=${p.status}`);
        });

        return {
          success: true,
          payouts: payouts.map((p: any) => ({
            id: p.numericId,  // Use numericId as the display ID
            uuid: p.id,       // Add the actual UUID for API calls
            numericId: p.numericId,
            amount: p.amount,
            amountUsdt: p.amountUsdt,
            total: p.total,
            totalUsdt: p.totalUsdt,
            actualTotalUsdt: p.actualTotalUsdt, // Actual total based on trader's fee
            traderFeeOut: p.traderFeeOut, // Trader's fee percentage
            rate: p.rate,
            wallet: p.wallet,
            bank: p.bank,
            isCard: p.isCard,
            status: p.status,
            expireAt: p.expireAt,
            createdAt: p.createdAt,
            acceptedAt: p.acceptedAt,
            confirmedAt: p.confirmedAt,
            cancelledAt: p.cancelledAt,
            merchantName: p.merchant.name,
          })),
          total,
        };
      } catch (error: any) {
        set.status = 400;
        return { error: error.message };
      }
    },
    {
      query: t.Object({
        status: t.Optional(t.String()),
        search: t.Optional(t.String()),
        limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
        offset: t.Optional(t.Number({ minimum: 0 })),
      }),
    }
  )
  
  // Accept payout
  .post(
    "/:id/accept",
    async ({ params, trader, set }) => {

      try {
        // Check if params.id is a UUID or numeric ID
        let payoutRecord;
        if (params.id.length > 10) {
          // UUID format
          payoutRecord = await db.payout.findFirst({
            where: { id: params.id }
          });
        } else {
          // Numeric ID format
          const numericId = parseInt(params.id);
          payoutRecord = await db.payout.findFirst({
            where: { numericId }
          });
        }
        
        if (!payoutRecord) {
          set.status = 404;
          return { error: "Payout not found" };
        }
        
        const payout = await payoutAccountingService.acceptPayoutWithAccounting(payoutRecord.id, trader.id);
        return {
          success: true,
          payout: {
            id: payout.numericId, // Return numeric ID for frontend
            uuid: payout.id,      // Also return UUID
            status: payout.status,
            expireAt: payout.expireAt,
          },
        };
      } catch (error: any) {
        set.status = 400;
        return { error: error.message };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  
  // Confirm payout with proof
  .post(
    "/:id/confirm",
    async ({ params, body, trader, set }) => {

      try {
        // Check if params.id is a UUID or numeric ID
        let payoutRecord;
        if (params.id.length > 10) {
          // UUID format
          payoutRecord = await db.payout.findFirst({
            where: { id: params.id }
          });
        } else {
          // Numeric ID format
          const numericId = parseInt(params.id);
          payoutRecord = await db.payout.findFirst({
            where: { numericId }
          });
        }
        
        if (!payoutRecord) {
          set.status = 404;
          return { error: "Payout not found" };
        }
        
        // Validate proof files
        const validation = validateFileUrls(body.proofFiles);
        if (!validation.valid) {
          set.status = 400;
          return { error: validation.error };
        }
        
        const payout = await payoutService.confirmPayout(
          payoutRecord.id,
          trader.id,
          body.proofFiles
        );
        return {
          success: true,
          payout: {
            id: payout.numericId, // Return numeric ID for frontend
            uuid: payout.id,      // Also return UUID
            status: payout.status,
          },
        };
      } catch (error: any) {
        set.status = 400;
        return { error: error.message };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        proofFiles: t.Array(t.String(), { minItems: 1, maxItems: 10 }),
      }),
    }
  )
  
  // Cancel payout
  .post(
    "/:id/cancel",
    async ({ params, body, trader, set }) => {

      try {
        // Check if params.id is a UUID or numeric ID
        let payoutRecord;
        if (params.id.length > 10) {
          // UUID format
          payoutRecord = await db.payout.findFirst({
            where: { id: params.id }
          });
        } else {
          // Numeric ID format
          const numericId = parseInt(params.id);
          payoutRecord = await db.payout.findFirst({
            where: { numericId }
          });
        }
        
        if (!payoutRecord) {
          set.status = 404;
          return { error: "Payout not found" };
        }
        
        // Validate files if provided
        if (body.files && body.files.length > 0) {
          const validation = validateFileUrls(body.files);
          if (!validation.valid) {
            set.status = 400;
            return { error: validation.error };
          }
        }
        
        const payout = await payoutAccountingService.cancelPayoutWithAccounting(
          payoutRecord.id,
          trader.id,
          body.reason,
          body.reasonCode,
          body.files || []
        );
        return {
          success: true,
          payout: {
            id: payout.numericId, // Return numeric ID for frontend
            uuid: payout.id,      // Also return UUID
            status: payout.status,
          },
        };
      } catch (error: any) {
        set.status = 400;
        return { error: error.message };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        reason: t.String({ minLength: 5 }),
        reasonCode: t.Optional(t.String()),
        files: t.Optional(t.Array(t.String(), { maxItems: 10 })),
      }),
    }
  )
  
  // Get payout details
  .get(
    "/:id",
    async ({ params, trader, set }) => {
      try {
        // Check if params.id is a UUID or numeric ID
        let payoutRecord;
        if (params.id.length > 10) {
          // UUID format
          payoutRecord = await db.payout.findFirst({
            where: { id: params.id },
            include: { 
              merchant: true,
              cancellationHistory: {
                include: {
                  trader: {
                    select: {
                      id: true,
                      email: true,
                      name: true
                    }
                  }
                },
                orderBy: {
                  createdAt: 'desc'
                }
              }
            }
          });
        } else {
          // Numeric ID format
          const numericId = parseInt(params.id);
          payoutRecord = await db.payout.findFirst({
            where: { numericId },
            include: { 
              merchant: true,
              cancellationHistory: {
                include: {
                  trader: {
                    select: {
                      id: true,
                      email: true,
                      name: true
                    }
                  }
                },
                orderBy: {
                  createdAt: 'desc'
                }
              }
            }
          });
        }
        
        if (!payoutRecord) {
          set.status = 404;
          return { error: "Payout not found" };
        }
        
        // Check if trader has access to this payout
        const hasAccess = payoutRecord.traderId === trader.id || 
                         payoutRecord.status === "CREATED";
        
        if (!hasAccess) {
          set.status = 403;
          return { error: "Access denied" };
        }
        
        return {
          success: true,
          payout: {
            id: payoutRecord.numericId,
            uuid: payoutRecord.id,
            amount: payoutRecord.amount,
            amountUsdt: payoutRecord.amountUsdt,
            total: payoutRecord.total,
            totalUsdt: payoutRecord.totalUsdt,
            rate: payoutRecord.rate,
            wallet: payoutRecord.wallet,
            bank: payoutRecord.bank,
            isCard: payoutRecord.isCard,
            status: payoutRecord.status,
            expireAt: payoutRecord.expireAt,
            createdAt: payoutRecord.createdAt,
            acceptedAt: payoutRecord.acceptedAt,
            confirmedAt: payoutRecord.confirmedAt,
            cancelledAt: payoutRecord.cancelledAt,
            merchantName: payoutRecord.merchant.name,
            // Include dispute files from previous traders (legacy)
            disputeFiles: payoutRecord.disputeFiles || [],
            disputeMessage: payoutRecord.disputeMessage || null,
            cancelReason: payoutRecord.cancelReason || null,
            // Include proof files if trader owns this payout
            proofFiles: payoutRecord.traderId === trader.id ? payoutRecord.proofFiles : [],
            // Include full cancellation history
            cancellationHistory: payoutRecord.cancellationHistory?.map(cancellation => ({
              id: cancellation.id,
              reason: cancellation.reason,
              reasonCode: cancellation.reasonCode,
              files: cancellation.files,
              createdAt: cancellation.createdAt,
              trader: {
                id: cancellation.trader.id,
                name: cancellation.trader.name,
                email: cancellation.trader.email,
              }
            })) || [],
          },
        };
      } catch (error: any) {
        set.status = 400;
        return { error: error.message };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )
  
  // Get payout balance
  .get("/balance", async ({ trader, set }) => {
    try {
      const user = await db.user.findUnique({
        where: { id: trader.id },
        select: {
          payoutBalance: true,
          frozenPayoutBalance: true,
        },
      });

      if (!user) {
        set.status = 404;
        return { error: "User not found" };
      }

      return {
        success: true,
        balance: {
          available: user.payoutBalance,
          frozen: user.frozenPayoutBalance,
          total: user.payoutBalance + user.frozenPayoutBalance,
        },
      };
    } catch (error: any) {
      set.status = 500;
      return { error: error.message };
    }
  })

  // Update payout balance
  .put(
    "/balance",
    async ({ body, trader, set }) => {
      const user = await db.user.update({
        where: { id: trader.id },
        data: {
          payoutBalance: body.balance,
          balanceRub: body.balance,
        },
        select: {
          payoutBalance: true,
          frozenPayoutBalance: true,
        },
      });

      return {
        success: true,
        balance: {
          available: user.payoutBalance,
          frozen: user.frozenPayoutBalance,
          total: user.payoutBalance + user.frozenPayoutBalance,
        },
      };
    },
    {
      body: t.Object({
        balance: t.Number({ minimum: 0 }),
      }),
    }
  )
  
  // Upload files endpoint
  .post(
    "/upload",
    async ({ body, set }) => {
      try {
        // Handle both single file and array of files
        const files = Array.isArray(body.files) ? body.files : [body.files];
        
        if (!files || files.length === 0 || !files[0]) {
          set.status = 400;
          return { error: "No files provided" };
        }

        const uploadedUrls = await fileUploadService.uploadFiles(files);
        
        return {
          success: true,
          urls: uploadedUrls,
        };
      } catch (error: any) {
        set.status = 500;
        return { error: error.message };
      }
    },
    {
      body: t.Object({
        files: t.Union([
          t.File({ maxSize: "10m" }),
          t.Array(t.File({ maxSize: "10m" }))
        ]),
      }),
    }
  );