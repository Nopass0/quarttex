import { Elysia, t } from "elysia";
import { PayoutService } from "../../services/payout.service";
import { payoutAccountingService } from "../../services/payout-accounting.service";
import { db } from "../../db";
import { PayoutStatus, MerchantRequestType } from "@prisma/client";
import { validateFileUrls } from "../../middleware/fileUploadValidation";
import { MerchantRequestLogService } from "../../services/merchant-request-log.service";

const payoutService = PayoutService.getInstance();

export const merchantPayoutsApi = new Elysia({ prefix: "/payouts" })
  // Middleware to extract merchant from token
  .derive(async ({ request, set }) => {
    const authHeader = request.headers.get("authorization");

    // Bearer session token for merchant staff
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const sessionToken = authHeader.substring(7);

      const sessionConfig = await db.systemConfig.findUnique({
        where: { key: `merchant_session_${sessionToken}` },
      });

      if (!sessionConfig) {
        set.status = 401;
        return { error: "Недействительная сессия" };
      }

      const session = JSON.parse(sessionConfig.value);

      if (new Date(session.expiresAt) < new Date()) {
        await db.systemConfig.delete({
          where: { key: `merchant_session_${sessionToken}` },
        });
        set.status = 401;
        return { error: "Сессия истекла" };
      }

      const merchant = await db.merchant.findUnique({
        where: { id: session.merchantId },
      });

      if (!merchant) {
        set.status = 401;
        return { error: "Merchant not found" };
      }

      if (merchant.disabled || merchant.banned) {
        set.status = 403;
        return { error: "Merchant is disabled" };
      }

      return { merchant };
    }

    // API key fallback
    const token = request.headers.get("x-api-key");

    if (!token) {
      set.status = 401;
      return { error: "API key required" };
    }

    const merchant = await db.merchant.findFirst({
      where: {
        OR: [{ token }, { apiKeyPublic: token }],
      },
    });

    if (!merchant) {
      set.status = 401;
      return { error: "Invalid API key" };
    }

    if (merchant.disabled || merchant.banned) {
      set.status = 403;
      return { error: "Merchant is disabled" };
    }

    return { merchant };
  })

  // Create payout
  .post(
    "/",
    async ({ body, merchant, set }) => {
      if ("error" in merchant) {
        return merchant;
      }

      // Log request for admin
      await MerchantRequestLogService.log(
        merchant.id,
        MerchantRequestType.PAYOUT_CREATE,
        body,
      );

      try {
        const payout = await payoutService.createPayout({
          merchantId: merchant.id,
          amount: body.amount,
          wallet: body.wallet,
          methodId: body.methodId,
          bank: body.bank,
          isCard: body.isCard,
          merchantRate: body.merchantRate,
          direction: "OUT",
          externalReference: body.externalReference,
          webhookUrl: body.webhookUrl,
          metadata: body.metadata,
        });

        set.status = 200;
        return {
          success: true,
          payout: {
            id: payout.id,
            numericId: payout.numericId,
            amount: payout.amount,
            amountUsdt: payout.amountUsdt,
            total: payout.total,
            totalUsdt: payout.totalUsdt,
            rate: payout.rate,
            wallet: payout.wallet,
            bank: payout.bank,
            isCard: payout.isCard,
            method: payout.method
              ? {
                  id: payout.method.id,
                  code: payout.method.code,
                  name: payout.method.name,
                  type: payout.method.type,
                  currency: payout.method.currency,
                }
              : null,
            status: payout.status,
            expireAt: payout.expireAt,
            createdAt: payout.createdAt,
          },
        };
      } catch (error: any) {
        set.status = 400;
        return { error: error.message };
      }
    },
    {
      body: t.Object({
        methodId: t.String(),
        amount: t.Number({ minimum: 100 }),
        wallet: t.String({ minLength: 10 }),
        bank: t.String({ minLength: 3 }),
        isCard: t.Boolean(),
        merchantRate: t.Optional(t.Number({ minimum: 1 })),
        externalReference: t.Optional(t.String()),
        processingTime: t.Optional(t.Number({ minimum: 5, maximum: 60 })),
        webhookUrl: t.Optional(t.String({ format: "uri" })),
        metadata: t.Optional(
          t.Object(
            {
              isMock: t.Optional(t.Boolean()),
            },
            { additionalProperties: true },
          ),
        ),
      }),
    },
  )

  // Get payout by ID
  .get(
    "/:id",
    async ({ params, merchant, set }) => {
      if ("error" in merchant) {
        return merchant;
      }

      const payout = await payoutService.getPayoutById(params.id);
      if (!payout || payout.merchantId !== merchant.id) {
        set.status = 404;
        return { error: "Payout not found" };
      }

      return {
        success: true,
        payout: {
          id: payout.id,
          numericId: payout.numericId,
          amount: payout.amount,
          amountUsdt: payout.amountUsdt,
          total: payout.total,
          totalUsdt: payout.totalUsdt,
          rate: payout.rate,
          wallet: payout.wallet,
          bank: payout.bank,
          isCard: payout.isCard,
          status: payout.status,
          feePercent: payout.feePercent,
          method: payout.method
            ? {
                id: payout.method.id,
                code: payout.method.code,
                name: payout.method.name,
                type: payout.method.type,
                currency: payout.method.currency,
              }
            : null,
          payoutsCommission:
            payout.amount *
            ((payout.method?.commissionPayout ?? payout.feePercent ?? 0) / 100),
          expireAt: payout.expireAt,
          createdAt: payout.createdAt,
          acceptedAt: payout.acceptedAt,
          confirmedAt: payout.confirmedAt,
          cancelledAt: payout.cancelledAt,
          proofFiles: payout.proofFiles,
          disputeFiles: payout.disputeFiles,
          disputeMessage: payout.disputeMessage,
          cancelReason: payout.cancelReason,
        },
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )

  // Approve payout
  .post(
    "/:id/approve",
    async ({ params, merchant, set }) => {
      if ("error" in merchant) {
        return merchant;
      }

      try {
        const payout =
          await payoutAccountingService.completePayoutWithAccounting(
            params.id,
            merchant.id,
          );
        return {
          success: true,
          payout: {
            id: payout.id,
            numericId: payout.numericId,
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
    },
  )

  // Create dispute
  .post(
    "/:id/dispute",
    async ({ params, body, merchant, set }) => {
      if ("error" in merchant) {
        return merchant;
      }

      try {
        // Validate files if provided
        if (body.files && body.files.length > 0) {
          const validation = validateFileUrls(body.files);
          if (!validation.valid) {
            set.status = 400;
            return { error: validation.error };
          }
        }

        const payout = await payoutService.createDispute(
          params.id,
          merchant.id,
          body.files || [],
          body.message,
        );
        return {
          success: true,
          payout: {
            id: payout.id,
            numericId: payout.numericId,
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
        message: t.String({ minLength: 10 }),
        files: t.Optional(t.Array(t.String())),
      }),
    },
  )

  // Cancel payout
  .patch(
    "/:id/cancel",
    async ({ params, body, merchant, set }) => {
      if ("error" in merchant) {
        return merchant;
      }

      try {
        const payout = await payoutService.cancelPayoutByMerchant(
          params.id,
          merchant.id,
          body.reasonCode,
        );
        return {
          success: true,
          payout: {
            id: payout.id,
            numericId: payout.numericId,
            status: payout.status,
            cancelledAt: payout.cancelledAt,
            cancelReasonCode: payout.cancelReasonCode,
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
        reasonCode: t.String({ minLength: 3 }),
      }),
    },
  )

  // Update payout rate
  .patch(
    "/:id/rate",
    async ({ params, body, merchant, set }) => {
      if ("error" in merchant) {
        return merchant;
      }

      try {
        const payout = await payoutService.updatePayoutRate(
          params.id,
          merchant.id,
          body.merchantRate,
          body.amount,
        );
        return {
          success: true,
          payout: {
            id: payout.id,
            numericId: payout.numericId,
            amount: payout.amount,
            merchantRate: payout.merchantRate,
            rate: payout.rate,
            total: payout.total,
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
        merchantRate: t.Optional(t.Number({ minimum: 0 })),
        amount: t.Optional(t.Number({ minimum: 0 })),
      }),
    },
  )

  // List payouts
  .get(
    "/",
    async ({ query, merchant }) => {
      if ("error" in merchant) {
        return merchant;
      }

      const {
        status,
        direction,
        dateFrom,
        dateTo,
        page = 1,
        limit = 20,
      } = query;

      const filters: any = {};

      if (status) {
        filters.status = status.split(",") as PayoutStatus[];
      }

      if (direction) {
        filters.direction = direction;
      }

      if (dateFrom || dateTo) {
        filters.dateFrom = dateFrom ? new Date(dateFrom) : undefined;
        filters.dateTo = dateTo ? new Date(dateTo) : undefined;
      }

      const { payouts, total } = await payoutService.getMerchantPayouts(
        merchant.id,
        {
          ...filters,
          limit,
          offset: (page - 1) * limit,
        },
      );

      return {
        success: true,
        data: payouts.map((p) => ({
          id: p.id,
          numericId: p.numericId,
          status: p.status,
          direction: p.direction,
          amount: p.amount,
          rate: p.rate,
          total: p.total,
          wallet: p.wallet,
          bank: p.bank,
          isCard: p.isCard,
          feePercent: p.feePercent,
          externalReference: p.externalReference,
          createdAt: p.createdAt,
          acceptedAt: p.acceptedAt,
          confirmedAt: p.confirmedAt,
          cancelledAt: p.cancelledAt,
          method: p.method
            ? {
                id: p.method.id,
                code: p.method.code,
                name: p.method.name,
                type: p.method.type,
                currency: p.method.currency,
              }
            : null,
          payoutsCommission:
            p.amount *
            ((p.method?.commissionPayout ?? p.feePercent ?? 0) / 100),
          trader: p.trader
            ? {
                numericId: p.trader.numericId,
                email: p.trader.email,
              }
            : null,
        })),
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    },
    {
      query: t.Object({
        status: t.Optional(t.String()),
        direction: t.Optional(t.Enum({ IN: "IN", OUT: "OUT" })),
        dateFrom: t.Optional(t.String()),
        dateTo: t.Optional(t.String()),
        page: t.Optional(t.Number({ minimum: 1 })),
        limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
      }),
    },
  );
