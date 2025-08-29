import { Elysia, t } from "elysia";
import { PayoutService } from "../../services/payout.service";
import { db } from "../../db";
import { rapiraService } from "../../services/rapira.service";
import { roundDown2, truncate2 } from "../../utils/rounding";

const payoutService = PayoutService.getInstance();

// Helper function to get rate with KKK applied
async function getRateWithKkk(): Promise<number> {
  // Get KKK percentage from system config
  const kkkSetting = await db.systemConfig.findUnique({
    where: { key: "kkk_percent" },
  });

  const kkkPercent = kkkSetting ? parseFloat(kkkSetting.value) : 0;

  // Get rate from Rapira with KKK applied
  return await rapiraService.getRateWithKkk(kkkPercent);
}

export const adminPayoutsRoutes = new Elysia({ prefix: "/payouts" })
  // Get all payouts with filters
  .get(
    "/",
    async ({ query }) => {
      const {
        status,
        direction,
        merchantId,
        traderId,
        dateFrom,
        dateTo,

        search,
        amount,
        id,

        page = 1,
        limit = 20,
      } = query;

      const where: any = {};

      if (status) {
        where.status = { in: status.split(",") };
      }

      if (direction) {
        where.direction = direction;
      }

      if (merchantId) {
        where.merchantId = merchantId;
      }

      if (traderId) {
        where.traderId = traderId;
      }

      if (amount) {
        const amt = Number(amount);
        if (!Number.isNaN(amt)) where.amount = amt;
      }

      if (id) {
        const num = Number(id);
        if (!Number.isNaN(num)) where.numericId = num;
        else where.id = { contains: id, mode: "insensitive" };
      }

      if (search) {
        where.OR = [{ wallet: { contains: search, mode: "insensitive" } }];
        const n = Number(search);
        if (!Number.isNaN(n)) where.amount = n;
      }

      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) {
          where.createdAt.gte = new Date(dateFrom);
        }
        if (dateTo) {
          where.createdAt.lte = new Date(dateTo);
        }
      }

      const offset = (page - 1) * limit;

      const [payouts, total] = await db.$transaction([
        db.payout.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
          include: {
            merchant: {
              select: {
                id: true,
                name: true,
              },
            },
            trader: {
              select: {
                id: true,
                numericId: true,
                email: true,
              },
            },
            rateAudits: {
              orderBy: { timestamp: "desc" },
              take: 5,
            },
          },
        }),
        db.payout.count({ where }),
      ]);

      return {
        success: true,
        data: payouts,
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
        merchantId: t.Optional(t.String()),
        traderId: t.Optional(t.String()),
        dateFrom: t.Optional(t.String()),
        dateTo: t.Optional(t.String()),
        id: t.Optional(t.String()),

        search: t.Optional(t.String()),
        amount: t.Optional(t.String()),

        page: t.Optional(t.Number({ minimum: 1 })),
        limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
      }),
    }
  )

  // Get payout details
  .get(
    "/:id",
    async ({ params }) => {
      const payout = await db.payout.findUnique({
        where: { id: params.id },
        include: {
          merchant: true,
          trader: true,
          rateAudits: {
            orderBy: { timestamp: "desc" },
          },
        },
      });

      if (!payout) {
        return { error: "Payout not found" };
      }

      return {
        success: true,
        data: payout,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  // Adjust payout rate
  .patch(
    "/:id/rate-adjust",
    async ({ params, body, request }) => {
      const adminKey = request.headers.get("x-admin-key");
      if (!adminKey) {
        return { error: "Admin key required" };
      }

      // In a real app, we'd look up the admin by key
      const adminId = adminKey; // Use key as adminId for now

      try {
        const updatedPayout = await payoutService.adjustPayoutRate(
          params.id,
          adminId,
          body.rateDelta,
          body.feePercent
        );

        return {
          success: true,
          data: updatedPayout,
        };
      } catch (error: any) {
        return { error: error.message };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        rateDelta: t.Optional(t.Number({ minimum: -20, maximum: 20 })),
        feePercent: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
      }),
    }
  )

  // Force complete payout
  .post(
    "/:id/force-complete",
    async ({ params }) => {
      const payout = await db.payout.findUnique({
        where: { id: params.id },
        include: { trader: true },
      });

      if (!payout) {
        return { error: "Payout not found" };
      }

      if (payout.status === "COMPLETED") {
        return { error: "Payout already completed" };
      }

      // Update payout status
      const updatedPayout = await db.payout.update({
        where: { id: params.id },
        data: {
          status: "COMPLETED",
          confirmedAt: new Date(),
        },
      });

      // Send webhook
      await payoutService.sendMerchantWebhook(updatedPayout, "COMPLETED");

      return {
        success: true,
        data: updatedPayout,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  // Force cancel payout
  .post(
    "/:id/force-cancel",
    async ({ params, body }) => {
      const payout = await db.payout.findUnique({
        where: { id: params.id },
      });

      if (!payout) {
        return { error: "Payout not found" };
      }

      if (payout.status === "COMPLETED" || payout.status === "CANCELLED") {
        return { error: "Cannot cancel completed or already cancelled payout" };
      }

      // Update payout status
      const updatedPayout = await db.payout.update({
        where: { id: params.id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelReason: body.reason || "Cancelled by admin",
        },
      });

      // Send webhook
      await payoutService.sendMerchantWebhook(updatedPayout, "CANCELLED");

      return {
        success: true,
        data: updatedPayout,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        reason: t.Optional(t.String()),
      }),
    }
  )

  // Approve payout (from CHECKING status)
  .post(
    "/:id/approve",
    async ({ params, set }) => {
      const payout = await db.payout.findUnique({
        where: { id: params.id },
        include: { trader: true },
      });

      if (!payout) {
        set.status = 404;
        return { error: "Payout not found" };
      }

      if (payout.status !== "CHECKING") {
        set.status = 400;
        return { error: "Can only approve payouts in CHECKING status" };
      }

      if (!payout.traderId) {
        set.status = 400;
        return { error: "Payout has no trader assigned" };
      }

      // Calculate profit amount if not stored
      let profitAmount = payout.profitAmount;
      if (profitAmount === null || profitAmount === undefined) {
        // Get trader-merchant specific fee percentage for backward compatibility
        const traderMerchant = await db.traderMerchant.findFirst({
          where: {
            traderId: payout.traderId,
            merchantId: payout.merchantId,
            isFeeOutEnabled: true,
          },
        });

        if (traderMerchant && traderMerchant.feeOut > 0) {
          const amountInUsdt = truncate2(payout.amount / payout.rate);
          profitAmount = truncate2(
            amountInUsdt * (traderMerchant.feeOut / 100)
          );
        } else {
          profitAmount = truncate2(payout.totalUsdt - payout.amountUsdt);
        }
      }

      // Update payout status to COMPLETED, unfreeze balance, add profit and USDT
      const [updatedPayout] = await db.$transaction([
        db.payout.update({
          where: { id: params.id },
          data: {
            status: "COMPLETED",
            confirmedAt: new Date(),
          },
        }),
        db.user.update({
          where: { id: payout.traderId },
          data: {
            frozenPayoutBalance: { decrement: payout.total },
            profitFromPayouts: { increment: profitAmount },
            trustBalance: {
              increment: truncate2(payout.amount / payout.rate),
            },
          },
        }),
      ]);

      // Send webhook
      await payoutService.sendMerchantWebhook(updatedPayout, "COMPLETED");

      return {
        success: true,
        data: updatedPayout,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  // Reject payout (from CHECKING status)
  .post(
    "/:id/reject",
    async ({ params, body, set }) => {
      try {
        // Use the new adminRejectPayout method from the service
        const updatedPayout = await payoutService.adminRejectPayout(
          params.id,
          body.reason
        );

        return {
          success: true,
          data: updatedPayout,
        };
      } catch (error: any) {
        // Handle specific error cases
        if (error.message.includes("not found")) {
          set.status = 404;
          return { error: error.message };
        }

        if (error.message.includes("CHECKING status")) {
          set.status = 400;
          return { error: error.message };
        }

        // General error
        set.status = 500;
        return {
          error: "Failed to reject payout",
          details: error.message,
        };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        reason: t.String({ minLength: 5 }),
      }),
    }
  )

  // Create test payout for trader
  .post(
    "/create-test",
    async ({ body, set }) => {
      try {
        // Check if trader exists
        const trader = await db.user.findUnique({
          where: { id: body.traderId },
          select: {
            id: true,
            numericId: true,
            email: true,
            payoutBalance: true,
          },
        });

        if (!trader) {
          set.status = 404;
          return { error: "Trader not found" };
        }

        // Check if trader has sufficient balance for OUT payouts
        if (body.direction === "OUT" && trader.payoutBalance < body.amount) {
          set.status = 400;
          return { error: "Insufficient trader balance for OUT payout" };
        }

        // Get merchant by ID or use test merchant
        let merchant;
        if (body.merchantId) {
          merchant = await db.merchant.findUnique({
            where: { id: body.merchantId },
          });
          if (!merchant) {
            set.status = 404;
            return { error: "Merchant not found" };
          }
        } else {
          // Get or create test merchant
          merchant = await db.merchant.findFirst({
            where: { name: "Test Merchant" },
          });

          if (!merchant) {
            merchant = await db.merchant.create({
              data: {
                name: "Test Merchant",
                token: `test-merchant-${Date.now()}`,
                callbackUri: "https://test-merchant.com/callback",
                balanceUsdt: 1000000,
                banned: false,
                disabled: false,
                countInRubEquivalent: false, // Default for test merchant
              },
            });
          }
        }

        // Calculate expiration time - for test payouts set to next day
        const expireAt = new Date();
        expireAt.setDate(expireAt.getDate() + 1);
        expireAt.setHours(23, 59, 59, 999);

        // Verify that method exists
        const method = await db.method.findUnique({
          where: { id: body.methodId },
        });

        if (!method) {
          set.status = 404;
          return { error: "Method not found" };
        }

        // Always get rate from Rapira with KKK
        const rate = await getRateWithKkk();

        // Determine merchantRate based on merchant's countInRubEquivalent setting
        let merchantRate: number;

        if (merchant.countInRubEquivalent) {
          // If merchant has RUB calculations enabled, we don't accept rate from request
          if (body.rate !== undefined) {
            set.status = 400;
            return {
              error:
                "Курс не должен передаваться при включенных расчетах в рублях у мерчанта",
            };
          }
          // Use the same Rapira rate with KKK for merchantRate
          merchantRate = rate;
        } else {
          // If RUB calculations are disabled, merchant must provide the rate
          if (body.rate === undefined) {
            set.status = 400;
            return {
              error:
                "Курс обязателен при выключенных расчетах в рублях у мерчанта",
            };
          }
          // Use merchant-provided rate for merchantRate
          merchantRate = body.rate;
        }

        // Create test payout
        const payout = await db.$transaction(async (tx) => {
          const newPayout = await tx.payout.create({
            data: {
              merchantId: merchant.id,
              traderId: trader.id,
              methodId: body.methodId,
              amount: body.amount,
              amountUsdt: truncate2(body.amount / rate),
              total: body.amount,
              totalUsdt: truncate2(body.amount / rate),
              merchantRate: merchantRate,
              rate: rate,
              feePercent: 0,
              wallet:
                body.wallet || `7900${Math.floor(Math.random() * 10000000)}`,
              bank: body.bank || "SBER",
              isCard: body.isCard !== undefined ? body.isCard : true,
              direction: body.direction || "OUT",
              status: body.status || "CREATED",
              expireAt,
              processingTime: body.processingTime || 15,
              externalReference: `TEST-${Date.now()}`,
              merchantMetadata: {
                isTest: true,
                createdByAdmin: true,
              },
            },
            include: {
              merchant: {
                select: {
                  id: true,
                  name: true,
                },
              },
              trader: {
                select: {
                  id: true,
                  numericId: true,
                  email: true,
                },
              },
            },
          });

          // For OUT payouts, freeze trader balance if status is ACTIVE or CHECKING
          if (
            body.direction === "OUT" &&
            (body.status === "ACTIVE" || body.status === "CHECKING")
          ) {
            await tx.user.update({
              where: { id: trader.id },
              data: {
                payoutBalance: { decrement: body.amount },
                frozenPayoutBalance: { increment: body.amount },
              },
            });
          }

          return newPayout;
        });

        return {
          success: true,
          data: payout,
        };
      } catch (error: any) {
        console.error("Failed to create test payout:", error);
        set.status = 500;
        return {
          error: "Failed to create test payout",
          details: error.message,
        };
      }
    },
    {
      body: t.Object({
        traderId: t.String({ description: "ID трейдера" }),
        methodId: t.String({ description: "ID метода платежа (обязательно)" }),
        merchantId: t.Optional(
          t.String({
            description:
              "ID мерчанта (опционально, если не указан - используется тестовый)",
          })
        ),
        amount: t.Number({ minimum: 100, description: "Сумма в рублях" }),
        rate: t.Optional(
          t.Number({
            minimum: 1,
            default: 95,
            description:
              "Курс USDT/RUB (обязателен если у мерчанта выключены расчеты в рублях)",
          })
        ),
        wallet: t.Optional(t.String({ description: "Кошелек получателя" })),
        bank: t.Optional(t.String({ description: "Банк получателя" })),
        isCard: t.Optional(
          t.Boolean({ default: true, description: "Это карта?" })
        ),
        direction: t.Optional(
          t.Enum({ IN: "IN", OUT: "OUT" }, { default: "OUT" })
        ),
        status: t.Optional(
          t.Enum(
            {
              CREATED: "CREATED",
              ACTIVE: "ACTIVE",
              CHECKING: "CHECKING",
              COMPLETED: "COMPLETED",
              CANCELLED: "CANCELLED",
              DISPUTED: "DISPUTED",
            },
            { default: "CREATED" }
          )
        ),
        processingTime: t.Optional(
          t.Number({ minimum: 5, maximum: 60, default: 15 })
        ),
      }),
    }
  )

  // Create multiple test payouts
  .post(
    "/test-multiple",
    async ({ body, set }) => {
      try {
        const count = body.count || 5;
        const results = [];
        const errors = [];

        // Find test merchant
        const testMerchant = await db.merchant.findFirst({
          where: { name: "test" },
        });

        if (!testMerchant) {
          set.status = 404;
          return {
            error:
              'Test merchant not found. Please create a merchant with name "test"',
          };
        }

        // Check merchant's countInRubEquivalent setting
        if (testMerchant.countInRubEquivalent && body.rate !== undefined) {
          set.status = 400;
          return {
            error:
              "Курс не должен передаваться при включенных расчетах в рублях у мерчанта",
          };
        }

        if (!testMerchant.countInRubEquivalent && body.rate === undefined) {
          set.status = 400;
          return {
            error:
              "Курс обязателен при выключенных расчетах в рублях у мерчанта",
          };
        }

        // Get default method if not provided
        let methodId = body.methodId;
        if (!methodId) {
          const defaultMethod = await db.method.findFirst({
            where: { isEnabled: true },
          });
          if (!defaultMethod) {
            set.status = 404;
            return { error: "No enabled methods found" };
          }
          methodId = defaultMethod.id;
        }

        // Always get rate from Rapira with KKK
        const finalRate = await getRateWithKkk();

        // Determine merchantRate based on merchant's countInRubEquivalent setting
        let merchantRate: number;

        if (testMerchant.countInRubEquivalent) {
          // Use the same Rapira rate with KKK for merchantRate
          merchantRate = finalRate;
        } else {
          // If RUB calculations are disabled, use provided rate
          merchantRate = body.rate!;
        }

        // Create multiple payouts
        for (let i = 0; i < count; i++) {
          try {
            const amount =
              body.amount || Math.floor(Math.random() * 50000) + 5000;
            const wallet =
              body.wallet ||
              `7${Math.floor(Math.random() * 9000000000 + 1000000000)}`;
            const bank =
              body.bank ||
              ["Сбербанк", "Тинькофф", "ВТБ", "Альфа-банк"][
                Math.floor(Math.random() * 4)
              ];

            const expireAt = new Date();
            expireAt.setDate(expireAt.getDate() + 1);
            expireAt.setHours(23, 59, 59, 999);

            const payout = await db.payout.create({
              data: {
                merchantId: testMerchant.id,
                methodId: methodId,
                amount,
                amountUsdt: truncate2(amount / finalRate),
                total: amount,
                totalUsdt: truncate2(amount / finalRate),
                merchantRate: merchantRate,
                rate: finalRate,
                feePercent: body.feePercent || 0,
                wallet,
                bank,
                isCard: body.isCard !== undefined ? body.isCard : true,
                direction: body.direction || "OUT",
                status: "CREATED",
                expireAt,
                processingTime: Math.floor(
                  (expireAt.getTime() - Date.now()) / 60000
                ),
                externalReference: `TEST_BATCH_${Date.now()}_${i}`,
                merchantMetadata: {
                  isTest: true,
                  createdByAdmin: true,
                  batchIndex: i + 1,
                  batchCount: count,
                },
              },
            });

            results.push({
              id: payout.id,
              numericId: payout.numericId,
              amount: payout.amount,
              wallet: payout.wallet,
              bank: payout.bank,
            });
          } catch (error: any) {
            errors.push({
              index: i,
              error: error.message,
            });
          }
        }

        return {
          success: true,
          created: results.length,
          failed: errors.length,
          results,
          errors: errors.length > 0 ? errors : undefined,
        };
      } catch (error: any) {
        set.status = 500;
        return { error: error.message || "Failed to create test payouts" };
      }
    },
    {
      body: t.Object({
        count: t.Optional(t.Number({ minimum: 1, maximum: 100, default: 5 })),
        methodId: t.Optional(t.String()),
        amount: t.Optional(t.Number({ minimum: 100 })),
        wallet: t.Optional(t.String()),
        bank: t.Optional(t.String()),
        isCard: t.Optional(t.Boolean()),
        rate: t.Optional(t.Number({ minimum: 50, maximum: 150 })),
        direction: t.Optional(t.Enum({ IN: "IN", OUT: "OUT" })),
        feePercent: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
      }),
    }
  )

  // Create test payout
  .post(
    "/test",
    async ({ body, set }) => {
      try {
        // Find test merchant
        const testMerchant = await db.merchant.findFirst({
          where: { name: "test" },
        });

        if (!testMerchant) {
          set.status = 404;
          return {
            error:
              'Test merchant not found. Please create a merchant with name "test"',
          };
        }

        // Always get rate from Rapira with KKK
        const finalRate = await getRateWithKkk();

        // Determine merchantRate based on merchant's countInRubEquivalent setting
        let merchantRate: number;

        if (testMerchant.countInRubEquivalent) {
          // If merchant has RUB calculations enabled, we don't accept rate from request
          if (body.rate !== undefined) {
            set.status = 400;
            return {
              error:
                "Курс не должен передаваться при включенных расчетах в рублях у мерчанта",
            };
          }
          // Use the same Rapira rate with KKK for merchantRate
          merchantRate = finalRate;
        } else {
          // If RUB calculations are disabled, merchant must provide the rate
          if (body.rate === undefined) {
            set.status = 400;
            return {
              error:
                "Курс обязателен при выключенных расчетах в рублях у мерчанта",
            };
          }
          // Use merchant-provided rate for merchantRate
          merchantRate = body.rate;
        }

        // Get default method if not provided
        let methodId = body.methodId;
        if (!methodId) {
          const defaultMethod = await db.method.findFirst({
            where: { isEnabled: true },
          });
          if (!defaultMethod) {
            set.status = 404;
            return {
              error:
                "No enabled methods found. Please create at least one enabled method.",
            };
          }
          methodId = defaultMethod.id;
        } else {
          // Verify that provided method exists
          const method = await db.method.findUnique({
            where: { id: methodId },
          });
          if (!method) {
            set.status = 404;
            return { error: "Method not found" };
          }
        }

        // Generate default values
        const amount = body.amount || Math.floor(Math.random() * 50000) + 5000;
        const wallet =
          body.wallet ||
          `4${Math.floor(Math.random() * 9000000000000000 + 1000000000000000)}`;
        const bank =
          body.bank ||
          ["Сбербанк", "Тинькофф", "ВТБ", "Альфа-банк"][
            Math.floor(Math.random() * 4)
          ];

        // Calculate expiration time - for test payouts set to next day
        const expireAt = new Date();
        expireAt.setDate(expireAt.getDate() + 1);
        expireAt.setHours(23, 59, 59, 999);

        // Create payout manually since service doesn't support methodId yet
        const payout = await db.payout.create({
          data: {
            merchantId: testMerchant.id,
            methodId: methodId,
            amount,
            amountUsdt: truncate2(amount / finalRate),
            total: amount,
            totalUsdt: truncate2(amount / finalRate),
            merchantRate: merchantRate,
            rate: finalRate,
            feePercent: body.feePercent || 0,
            wallet,
            bank,
            isCard: body.isCard !== undefined ? body.isCard : true,
            direction: body.direction || "OUT",
            status: "CREATED",
            expireAt,
            processingTime: Math.floor(
              (expireAt.getTime() - Date.now()) / 60000
            ),
            externalReference: body.externalReference || `TEST_${Date.now()}`,
            merchantMetadata: {
              ...body.metadata,
              isTest: true,
              createdByAdmin: true,
            },
          },
          include: {
            merchant: {
              select: {
                id: true,
                name: true,
              },
            },
            method: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        });

        set.status = 201;
        return {
          success: true,
          payout: {
            id: payout.id,
            numericId: payout.numericId,
            status: payout.status,
            amount: payout.amount,
            amountUsdt: payout.amountUsdt,
            total: payout.total,
            totalUsdt: payout.totalUsdt,
            rate: payout.rate,
            wallet: payout.wallet,
            bank: payout.bank,
            direction: payout.direction,
            expireAt: payout.expireAt,
            traderId: payout.traderId,
          },
        };
      } catch (error: any) {
        set.status = 500;
        return { error: error.message || "Failed to create test payout" };
      }
    },
    {
      body: t.Object({
        methodId: t.Optional(
          t.String({
            description:
              "ID метода платежа (если не указан, будет выбран первый доступный)",
          })
        ),
        amount: t.Optional(t.Number({ minimum: 100 })),
        wallet: t.Optional(t.String()),
        bank: t.Optional(t.String()),
        isCard: t.Optional(t.Boolean()),
        rate: t.Optional(t.Number({ minimum: 50, maximum: 150 })),
        direction: t.Optional(t.Enum({ IN: "IN", OUT: "OUT" })),
        rateDelta: t.Optional(t.Number({ minimum: -20, maximum: 20 })),
        feePercent: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
        externalReference: t.Optional(t.String()),
        webhookUrl: t.Optional(t.String()),
        metadata: t.Optional(t.Any()),
      }),
    }
  )

  // Manually send payout callback
  .post(
    "/:id/callback",
    async ({ params, body, error }) => {
      const payout = await db.payout.findUnique({ where: { id: params.id } });
      if (!payout) return error(404, { error: "Payout not found" });
      if (!payout.merchantWebhookUrl)
        return error(400, { error: "Webhook URL not set for payout" });

      const status = body.status || payout.status;
      await payoutService.sendMerchantWebhook(payout, status);

      const history = await db.payoutCallbackHistory.findFirst({
        where: { payoutId: payout.id },
        orderBy: { createdAt: "desc" },
      });

      return {
        success: true,
        callbackHistoryEntry: history
          ? { ...history, createdAt: history.createdAt.toISOString() }
          : null,
      };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({ status: t.Optional(t.String()) }),
    }
  )

  // Get payout callback history
  .get(
    "/:id/callbacks",
    async ({ params, error }) => {
      const payout = await db.payout.findUnique({
        where: { id: params.id },
        include: { callbackHistory: { orderBy: { createdAt: "desc" } } },
      });
      if (!payout) return error(404, { error: "Payout not found" });

      return {
        success: true,
        callbackHistory: payout.callbackHistory.map((cb) => ({
          ...cb,
          createdAt: cb.createdAt.toISOString(),
        })),
      };
    },

    { params: t.Object({ id: t.String() }) }
  );
