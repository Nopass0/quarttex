import { Elysia, t } from "elysia";
import { db } from "@/db";
import {
  Prisma,
  Status,
  TransactionType,
  MethodType,
  Currency,
  RateSource,
  AdminRole,
} from "@prisma/client";
import ErrorSchema from "@/types/error";
import { randomBytes } from "node:crypto";
import { sha256 } from "@/utils/hash";
import { MASTER_KEY } from "@/utils/constants";

import merchantRoutes from "@/routes/admin/merchant";
import transactionsRoutes from "@/routes/admin/transactions";
import methodsRoutes from "@/routes/admin/merchant/methods";
import ipWhitelistRoutes from "@/routes/admin/ip-whitelist";
import balanceTopupRoutes from "@/routes/admin/balance-topups";
import requisitesRoutes from "@/routes/admin/requisites";
import providerProfitRoutes from "@/routes/admin/provider-profit";
import { databaseRoute } from "@/routes/admin/database";
import topupSettingsRoutes from "@/routes/admin/topup-settings";
import { servicesRoutes } from "@/routes/admin/services";
import traderMerchantsRoutes from "@/routes/admin/trader-merchants";
import traderMerchantFeeRangesRoutes from "@/routes/admin/trader-merchant-fee-ranges";
import merchantTradersRoutes from "@/routes/admin/merchant-traders";
import agentsRoutes from "@/routes/admin/agents";
import paymentDetailsRoutes from "@/routes/admin/payment-details";
import devicesRoutes from "@/routes/admin/devices";
import traderSettingsRoutes from "@/routes/admin/trader-settings";
import agentTeamsRoutes from "@/routes/admin/agent-teams";
import appVersionsRoutes from "@/routes/admin/app-versions";
import supportRoutes from "@/routes/admin/support";
import rateSettingsRoutes from "@/routes/admin/rate-settings";
import kkkSettingsRoutes from "@/routes/admin/kkk-settings";
import rateSourceRoutes from "@/routes/admin/rate-sources";
import processorRoutes from "@/routes/admin/processor";
import deviceEmulatorRoutes from "@/routes/admin/device-emulator";
import metricsRoutes from "@/routes/admin/metrics";
import payoutEmulatorRoutes from "@/routes/admin/payout-emulator";
import adminMerchantsRoutes from "@/routes/admin/merchants";
import wellbitBankMappingRoutes from "@/routes/admin/wellbit-bank-mapping";
import { adminPayoutsRoutes } from "@/routes/admin/payouts";
import { telegramSettingsRoutes } from "@/routes/admin/telegram-settings";
import { adminWithdrawalsRoutes } from "@/routes/admin/withdrawals";
import { merchantEmulatorApi } from "@/api/admin/merchant-emulator";
import depositsRoutes from "@/routes/admin/deposits";
import aggregatorDepositsRoutes from "@/routes/admin/aggregator-deposits";
import systemConfigRoutes from "@/routes/admin/system-config";
import messagesRoutes from "@/routes/admin/messages";
import dealDisputesRoutes from "@/routes/admin/deal-disputes";
import withdrawalDisputesRoutes from "@/routes/admin/withdrawal-disputes";
import bulkDeleteRoutes from "@/routes/admin/bulk-delete";
import ideasRoutes from "@/routes/admin/ideas";
import testRoutes from "@/routes/admin/test";
import { settleRequestsRoutes } from "@/routes/admin/settle-requests";
import { merchantRequestLogsRoutes } from "@/routes/admin/merchant-request-logs";
import { botDisputesRoutes } from "@/routes/admin/bot-disputes";
import aggregatorsRoutes from "@/routes/admin/aggregators";
import auctionRoutes from "@/routes/admin/auction";
// import { testToolsRoutes } from "@/routes/admin/test-tools";

const authHeader = t.Object({ "x-admin-key": t.String() });

export default (app: Elysia) =>
  app
    /* ───────────────── Auth verify ───────────────── */
    .get(
      "/verify",
      async ({ request, set }) => {
        // Ensure proper UTF-8 encoding for response
        set.headers["Content-Type"] = "application/json; charset=utf-8";

        // Get admin details including role
        const adminToken = request.headers.get("x-admin-key");
        const admin = await db.admin.findUnique({
          where: { token: adminToken || "" },
          select: {
            id: true,
            role: true,
          },
        });

        // If we reach this point, it means adminGuard has already validated the token
        return {
          success: true,
          message: "Admin token is valid",
          admin: admin
            ? {
                id: admin.id,
                role: admin.role,
              }
            : null,
        };
      },
      {
        tags: ["admin"],
        headers: authHeader,
        response: {
          200: t.Object({
            success: t.Boolean(),
            message: t.String(),
            admin: t.Nullable(
              t.Object({
                id: t.String(),
                role: t.Enum(AdminRole),
              })
            ),
          }),
          401: ErrorSchema,
          403: ErrorSchema,
        },
      }
    )

    /* ───────────────── вложенные группы ───────────────── */
    .group("/merchant", (a) => merchantRoutes(a))
    .group("/merchant/methods", (a) => methodsRoutes(a))
    .use(adminMerchantsRoutes)
    .use(wellbitBankMappingRoutes)
    .group("/transactions", (a) => transactionsRoutes(a))
    .group("/ip-whitelist", (a) => ipWhitelistRoutes(a))
    .group("/balance-topups", (a) => balanceTopupRoutes(a))
    .group("/requisites", (a) => requisitesRoutes(a))
    .group("/provider-profit", (a) => providerProfitRoutes(a))
    .group("/topup-settings", (a) => topupSettingsRoutes(a))
    .group("/services", (a) => a.use(servicesRoutes))
    .group("/payment-details", (a) => paymentDetailsRoutes(a))
    .group("/devices", (a) => devicesRoutes(a))
    .use(databaseRoute)
    .use(traderMerchantsRoutes)
    .use(merchantTradersRoutes)
    .use(traderMerchantFeeRangesRoutes)
    .use(agentsRoutes)
    .use(traderSettingsRoutes)
    .use(agentTeamsRoutes)
    .group("/app-versions", (a) => appVersionsRoutes(a))
    .group("/support", (a) => supportRoutes(a))
    .group("/rate-settings", (a) => rateSettingsRoutes(a))
    .group("/kkk-settings", (a) => kkkSettingsRoutes(a))
    .use(rateSourceRoutes)
    .use(processorRoutes)
    .use(deviceEmulatorRoutes)
    .use(payoutEmulatorRoutes)
    .use(adminPayoutsRoutes)
    .use(telegramSettingsRoutes)
    .use(adminWithdrawalsRoutes)
    .use(merchantEmulatorApi)
    .use(depositsRoutes)
    .use(aggregatorDepositsRoutes)
    .use(systemConfigRoutes)
    .group("/messages", (a) => messagesRoutes(a))
    .group("/deal-disputes", (a) => dealDisputesRoutes(a))
    .group("/withdrawal-disputes", (a) => withdrawalDisputesRoutes(a))
    .group("/bulk-delete", (a) => a.use(bulkDeleteRoutes))
    .group("/ideas", (a) => ideasRoutes(a))
    .group("/test", (a) => testRoutes(a))
    .use(settleRequestsRoutes)
    .use(merchantRequestLogsRoutes)
    .use(botDisputesRoutes)
    .group("/aggregators", (a) => aggregatorsRoutes(a))
    .use(auctionRoutes)
    // .group("/test-tools", (a) => a.use(testToolsRoutes))
    .group("", (a) => metricsRoutes(a))

    /* ───────────────── Quick access endpoints ───────────────── */
    .get(
      "/methods",
      async () => {
        const methods = await db.method.findMany();
        return methods;
      },
      {
        tags: ["admin"],
        headers: authHeader,
        response: {
          200: t.Array(
            t.Object({
              id: t.String(),
              code: t.String(),
              name: t.String(),
              type: t.Enum(MethodType),
              currency: t.Enum(Currency),
            })
          ),
          401: ErrorSchema,
          403: ErrorSchema,
        },
      }
    )

    /* ───────────────── enums ───────────────── */
    .get("/enums/status", () => Object.values(Status), {
      tags: ["admin"],
      headers: authHeader,
      response: {
        200: t.Array(t.Enum(Status)),
        401: ErrorSchema,
        403: ErrorSchema,
      },
    })
    .get("/enums/transaction-type", () => Object.values(TransactionType), {
      tags: ["admin"],
      headers: authHeader,
      response: {
        200: t.Array(t.Enum(TransactionType)),
        401: ErrorSchema,
        403: ErrorSchema,
      },
    })
    .get("/enums/method-type", () => Object.values(MethodType), {
      tags: ["admin"],
      headers: authHeader,
      response: {
        200: t.Array(t.Enum(MethodType)),
        401: ErrorSchema,
        403: ErrorSchema,
      },
    })
    .get("/enums/currency", () => Object.values(Currency), {
      tags: ["admin"],
      headers: authHeader,
      response: {
        200: t.Array(t.Enum(Currency)),
        401: ErrorSchema,
        403: ErrorSchema,
      },
    })
    .get("/enums/rate-source", () => Object.values(RateSource), {
      tags: ["admin"],
      headers: authHeader,
      response: {
        200: t.Array(t.Enum(RateSource)),
        401: ErrorSchema,
        403: ErrorSchema,
      },
    })
    .get(
      "/enums/all",
      () => ({
        status: Object.values(Status),
        transactionType: Object.values(TransactionType),
        methodType: Object.values(MethodType),
        currency: Object.values(Currency),
        rateSource: Object.values(RateSource),
      }),
      {
        tags: ["admin"],
        headers: authHeader,
        response: {
          200: t.Object({
            status: t.Array(t.Enum(Status)),
            transactionType: t.Array(t.Enum(TransactionType)),
            methodType: t.Array(t.Enum(MethodType)),
            currency: t.Array(t.Enum(Currency)),
            rateSource: t.Array(t.Enum(RateSource)),
          }),
          401: ErrorSchema,
          403: ErrorSchema,
        },
      }
    )

    /* ───────────────── stats ───────────────── */
    .get(
      "/stats",
      async () => ({ users: await db.user.count(), uptime: process.uptime() }),
      {
        tags: ["admin"],
        headers: authHeader,
        response: {
          200: t.Object({ users: t.Number(), uptime: t.Number() }),
          401: ErrorSchema,
          403: ErrorSchema,
        },
      }
    )

    /* ───────────────── rate setting ───────────────── */
    .get(
      "/rate",
      async () => {
        const rs = await db.rateSetting.findFirst();
        return rs
          ? { value: rs.value, updatedAt: rs.updatedAt.toISOString() }
          : { value: 0, updatedAt: new Date(0).toISOString() };
      },
      {
        tags: ["admin"],
        headers: authHeader,
        response: {
          200: t.Object({ value: t.Number(), updatedAt: t.String() }),
          401: ErrorSchema,
          403: ErrorSchema,
        },
      }
    )
    .put(
      "/rate",
      async ({ body }) => {
        const rs = await db.rateSetting.upsert({
          where: { id: 1 },
          update: { value: body.value },
          create: { id: 1, value: body.value },
        });
        return { value: rs.value, updatedAt: rs.updatedAt.toISOString() };
      },
      {
        tags: ["admin"],
        headers: authHeader,
        body: t.Object({ value: t.Number() }),
        response: {
          200: t.Object({ value: t.Number(), updatedAt: t.String() }),
          401: ErrorSchema,
          403: ErrorSchema,
        },
      }
    )

    /* ───────────────── user: ban ───────────────── */
    .post(
      "/ban-user",
      async ({ body, error }) => {
        try {
          await db.user.update({
            where: { id: body.id },
            data: { banned: true },
          });
          return { ok: true };
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2025"
          )
            return error(404, { error: "User not found" });
          throw e;
        }
      },
      {
        tags: ["admin"],
        headers: authHeader,
        body: t.Object({ id: t.String() }),
        response: {
          200: t.Object({ ok: t.Boolean() }),
          404: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      }
    )

    /* ───────────────── user: create ───────────────── */
    .post(
      "/create-user",
      async ({ body, error }) => {
        try {
          const plain = randomBytes(8).toString("hex");
          const hash = await sha256(plain);

          const user = await db.user.create({
            data: {
              email: body.email,
              password: hash,
              name: body.name ?? "",
              balanceUsdt: body.balanceUsdt ?? 0,
              balanceRub: body.balanceRub ?? 0,
              trustBalance: body.trustBalance ?? 0,
              rateConst: body.rateConst ?? null,
              useConstRate: body.useConstRate ?? false,
              profitPercent: body.profitPercent ?? null,
              stakePercent: body.stakePercent ?? null,
            },
            select: {
              id: true,
              email: true,
              name: true,
              balanceUsdt: true,
              balanceRub: true,
              trustBalance: true,
              profitFromDeals: true,
              profitFromPayouts: true,
              rateConst: true,
              useConstRate: true,
              profitPercent: true,
              stakePercent: true,
              createdAt: true,
            },
          });

          // Создаем TRC20 кошелек для пользователя
          // const wallet = await WalletService.createWalletForUser(user.id);

          const out = {
            ...user,
            createdAt: user.createdAt.toISOString(),
            plainPassword: plain,
          };
          return new Response(JSON.stringify(out), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2002"
          )
            return error(409, {
              error: "Пользователь с таким email уже существует",
            });
          throw e;
        }
      },
      {
        tags: ["admin"],
        headers: authHeader,
        body: t.Object({
          email: t.String({ format: "email" }),
          name: t.Optional(t.String()),
          balanceUsdt: t.Optional(t.Number()),
          balanceRub: t.Optional(t.Number()),
          trustBalance: t.Optional(t.Number()),
          rateConst: t.Optional(t.Nullable(t.Number())),
          useConstRate: t.Optional(t.Boolean()),
          profitPercent: t.Optional(t.Nullable(t.Number())),
          stakePercent: t.Optional(t.Nullable(t.Number())),
        }),
        response: {
          201: t.Object({
            id: t.String(),
            email: t.String(),
            name: t.String(),
            balanceUsdt: t.Number(),
            balanceRub: t.Number(),
            trustBalance: t.Number(),
            profitFromDeals: t.Number(),
            profitFromPayouts: t.Number(),
            rateConst: t.Nullable(t.Number()),
            useConstRate: t.Optional(t.Boolean()),
            profitPercent: t.Nullable(t.Number()),
            stakePercent: t.Nullable(t.Number()),
            createdAt: t.String(),
            plainPassword: t.String(),
          }),
          409: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      }
    )

    /* ───────────────── user: delete ───────────────── */
    .delete(
      "/delete-user",
      async ({ body, error }) => {
        try {
          await db.user.delete({ where: { id: body.id } });
          return { ok: true };
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2025"
          )
            return error(404, { error: "Пользователь не найден" });
          throw e;
        }
      },
      {
        tags: ["admin"],
        headers: authHeader,
        body: t.Object({ id: t.String() }),
        response: {
          200: t.Object({ ok: t.Boolean() }),
          404: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      }
    )

    /* ───────────────── user: regenerate password ───────────────── */
    .post(
      "/regenerate-password",
      async ({ body, error }) => {
        try {
          const plain = randomBytes(8).toString("hex");
          const hash = await sha256(plain);
          await db.user.update({
            where: { id: body.id },
            data: { password: hash },
          });
          return { ok: true, newPassword: plain };
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2025"
          )
            return error(404, { error: "Пользователь не найден" });
          throw e;
        }
      },
      {
        tags: ["admin"],
        headers: authHeader,
        body: t.Object({ id: t.String() }),
        response: {
          200: t.Object({ ok: t.Boolean(), newPassword: t.String() }),
          404: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      }
    )

    /* ───────────────── user: update ───────────────── */
    .put(
      "/update-user",
      async ({ body, error }) => {
        try {
          const updateData: any = {
            email: body.email,
            name: body.name,
          };

          // Add optional fields only if they are provided
          if (body.balanceUsdt !== undefined)
            updateData.balanceUsdt = body.balanceUsdt;
          if (body.balanceRub !== undefined)
            updateData.balanceRub = body.balanceRub;
          if (body.trustBalance !== undefined)
            updateData.trustBalance = body.trustBalance;
          if (body.profitFromDeals !== undefined)
            updateData.profitFromDeals = body.profitFromDeals;
          if (body.profitFromPayouts !== undefined)
            updateData.profitFromPayouts = body.profitFromPayouts;
          if (body.banned !== undefined) updateData.banned = body.banned;
          if (body.rateConst !== undefined)
            updateData.rateConst = body.rateConst;
          if (body.useConstRate !== undefined)
            updateData.useConstRate = body.useConstRate;
          if (body.profitPercent !== undefined)
            updateData.profitPercent = body.profitPercent;
          if (body.stakePercent !== undefined)
            updateData.stakePercent = body.stakePercent;
          if (body.rateSource !== undefined)
            updateData.rateSource = body.rateSource;

          const u = await db.user.update({
            where: { id: body.id },
            data: updateData,
            select: {
              id: true,
              email: true,
              name: true,
              balanceUsdt: true,
              balanceRub: true,
              trustBalance: true,
              profitFromDeals: true,
              profitFromPayouts: true,
              rateConst: true,
              useConstRate: true,
              profitPercent: true,
              stakePercent: true,
              banned: true,
              createdAt: true,
              rateSource: true,
            },
          });
          return { ...u, createdAt: u.createdAt.toISOString() };
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2025"
          )
            return error(404, { error: "Пользователь не найден" });
          throw e;
        }
      },
      {
        tags: ["admin"],
        headers: authHeader,
        body: t.Object({
          id: t.String(),
          email: t.String({ format: "email" }),
          name: t.String(),
          balanceUsdt: t.Optional(t.Number()),
          balanceRub: t.Optional(t.Number()),
          trustBalance: t.Optional(t.Number()),
          profitFromDeals: t.Optional(t.Number()),
          profitFromPayouts: t.Optional(t.Number()),
          rateConst: t.Optional(t.Nullable(t.Number())),
          useConstRate: t.Optional(t.Boolean()),
          profitPercent: t.Optional(t.Nullable(t.Number())),
          stakePercent: t.Optional(t.Nullable(t.Number())),
          banned: t.Optional(t.Boolean()),
          rateSource: t.Optional(t.Enum(RateSource)),
        }),
        response: {
          200: t.Object({
            id: t.String(),
            email: t.String(),
            name: t.String(),
            balanceUsdt: t.Number(),
            balanceRub: t.Number(),
            trustBalance: t.Number(),
            profitFromDeals: t.Number(),
            profitFromPayouts: t.Number(),
            rateConst: t.Nullable(t.Number()),
            useConstRate: t.Optional(t.Boolean()),
            profitPercent: t.Nullable(t.Number()),
            stakePercent: t.Nullable(t.Number()),
            banned: t.Boolean(),
            createdAt: t.String(),
            rateSource: t.Optional(t.Enum(RateSource)),
          }),
          404: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      }
    )

    // Get all merchants
    .get("/merchant", async () => {
      const merchants = await db.merchant.findMany({
        select: {
          id: true,
          name: true,
          token: true,
          balanceUsdt: true,
          disabled: true,
          banned: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc"
        }
      });

      return {
        success: true,
        merchants
      };
    })

    // Get all traders
    .get("/traders", async () => {
      const traders = await db.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          balanceUsdt: true,
          balanceRub: true,
          banned: true,
          createdAt: true,
          trafficEnabled: true,
        },
        orderBy: {
          createdAt: "desc"
        }
      });

      return {
        success: true,
        traders
      };
    })

    // Rate sources endpoints
    .get("/rate-sources", async () => {
      const rateSources = await db.rateSourceConfig.findMany({
        include: {
          traders: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          merchants: {
            include: {
              merchant: {
                select: {
                  id: true,
                  name: true,
                }
              }
            }
          },
          _count: {
            select: {
              traders: true,
              merchants: true,
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      })

      // Получить текущие курсы от источников
      const ratesPromises = rateSources.map(async (source) => {
        let currentRate = null
        
        try {
          if (source.source === 'bybit') {
            const response = await fetch('https://api.bybit.com/v5/market/tickers?category=spot&symbol=USDTRUB')
            const data = await response.json()
            if (data.result?.list?.[0]?.lastPrice) {
              currentRate = parseFloat(data.result.list[0].lastPrice)
            }
          } else if (source.source === 'rapira') {
            currentRate = source.baseRate || 95.5
          }
        } catch (error) {
          console.error(`Failed to fetch rate for ${source.source}:`, error)
        }

        return {
          ...source,
          currentRate,
          adjustedRate: currentRate ? 
            currentRate * (1 + (source.kkkPercent / 100) * (source.kkkOperation === 'MINUS' ? -1 : 1)) : 
            null
        }
      })

      const sourcesWithRates = await Promise.all(ratesPromises)

      return {
        success: true,
        data: sourcesWithRates
      }
    })

    // Update rate source settings
    .put("/rate-sources/:id", async ({ params: { id }, body }) => {
      const { displayName, kkkPercent, kkkOperation, isActive } = body as any

      try {
        const updated = await db.rateSourceConfig.update({
          where: { id },
          data: {
            ...(displayName !== undefined && { displayName }),
            ...(kkkPercent !== undefined && { kkkPercent }),
            ...(kkkOperation !== undefined && { kkkOperation }),
            ...(isActive !== undefined && { isActive }),
          }
        })

        return {
          success: true,
          data: updated
        }
      } catch (error) {
        return {
          success: false,
          error: 'Failed to update rate source'
        }
      }
    })

    // Update all rates
    .post("/rate-sources/update-rates", async () => {
      const sources = await db.rateSourceConfig.findMany({
        where: { isActive: true }
      })

      const updates = []

      for (const source of sources) {
        let rate = null
        
        try {
          if (source.source === 'bybit') {
            const response = await fetch('https://api.bybit.com/v5/market/tickers?category=spot&symbol=USDTRUB')
            const data = await response.json()
            if (data.result?.list?.[0]?.lastPrice) {
              rate = parseFloat(data.result.list[0].lastPrice)
            }
          } else if (source.source === 'rapira') {
            rate = 95.5
          }

          if (rate) {
            const updated = await db.rateSourceConfig.update({
              where: { id: source.id },
              data: {
                baseRate: rate,
                lastRateUpdate: new Date()
              }
            })
            updates.push(updated)
          }
        } catch (error) {
          console.error(`Failed to update rate for ${source.source}:`, error)
        }
      }

      return {
        success: true,
        data: updates
      }
    })

    //get profits for trader
    .get("/traders/:id/profits", async ({ params }) => {
      const trader = await db.user.findUniqueOrThrow({
        where: { id: params.id },
      });

      const profitFromDeals = await db.deal.aggregate({
        where: { traderId: trader.id },
        _sum: { profit: true },
      });

      const profitFromPayouts = await db.payout.aggregate({
        where: { traderId: trader.id },
        _sum: { amount: true },
      });

      return {
        profitFromDeals: profitFromDeals || 0,
        profitFromPayouts: profitFromPayouts || 0,
      };
    })
    /* ───────────────── trader: change balance ───────────────── */
    .post(
      "/traders/:id/balance",
      async ({ params, body, error }) => {
        try {
          const trader = await db.user.findUniqueOrThrow({
            where: { id: params.id },
          });

          let balanceField: string;
          let currentBalance: number;

          if (body.currency === "USDT") {
            balanceField = "balanceUsdt";
            currentBalance = trader.balanceUsdt;
          } else if (body.currency === "RUB") {
            balanceField = "balanceRub";
            currentBalance = trader.balanceRub;
          } else if (body.currency === "DEPOSIT") {
            balanceField = "deposit";
            currentBalance = trader.deposit;
          } else if (body.currency === "BALANCE") {
            balanceField = "trustBalance";
            currentBalance = trader.trustBalance;
          } else if (body.currency === "FROZEN_USDT") {
            balanceField = "frozenUsdt";
            currentBalance = trader.frozenUsdt;
          } else if (body.currency === "FROZEN_RUB") {
            balanceField = "frozenRub";
            currentBalance = trader.frozenRub;
          } else if (body.currency === "PROFIT_DEALS") {
            balanceField = "profitFromDeals";
            currentBalance = trader.profitFromDeals;
          } else if (body.currency === "PROFIT_PAYOUTS") {
            balanceField = "profitFromPayouts";
            currentBalance = trader.profitFromPayouts;
          } else {
            return error(400, { error: "Неверный тип валюты" });
          }

          const newBalance = currentBalance + body.amount;

          if (newBalance < 0) {
            return error(400, { error: "Недостаточно средств на балансе" });
          }

          const updatedTrader = await db.user.update({
            where: { id: params.id },
            data: {
              [balanceField]: newBalance,
            },
            select: {
              id: true,
              email: true,
              name: true,
              balanceUsdt: true,
              balanceRub: true,
              deposit: true,
              trustBalance: true,
              frozenUsdt: true,
              frozenRub: true,
            },
          });

          return {
            ...updatedTrader,
            previousBalance: currentBalance,
            newBalance: newBalance,
            currency: body.currency,
            amount: body.amount,
          };
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2025"
          )
            return error(404, { error: "Трейдер не найден" });
          throw e;
        }
      },
      {
        tags: ["admin"],
        headers: authHeader,
        params: t.Object({ id: t.String() }),
        body: t.Object({
          amount: t.Number(),
          currency: t.Union([
            t.Literal("USDT"),
            t.Literal("RUB"),
            t.Literal("DEPOSIT"),
            t.Literal("BALANCE"),
            t.Literal("FROZEN_USDT"),
            t.Literal("FROZEN_RUB"),
            t.Literal("PROFIT_DEALS"),
            t.Literal("PROFIT_PAYOUTS"),
          ]),
        }),
        response: {
          200: t.Object({
            id: t.String(),
            email: t.String(),
            name: t.String(),
            balanceUsdt: t.Number(),
            balanceRub: t.Number(),
            deposit: t.Number(),
            trustBalance: t.Number(),
            frozenUsdt: t.Number(),
            frozenRub: t.Number(),
            previousBalance: t.Number(),
            newBalance: t.Number(),
            currency: t.String(),
            amount: t.Number(),
          }),
          400: ErrorSchema,
          404: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      }
    )

    /* ───────────────── trader: update insurance deposits ───────────────── */
    .patch(
      "/traders/:id/insurance-deposit",
      async ({ params, body, error }) => {
        const trader = await db.user.findUnique({
          where: { id: params.id },
        });

        if (!trader) {
          return error(404, { error: "Trader not found" });
        }

        const updated = await db.user.update({
          where: { id: params.id },
          data: {
            minInsuranceDeposit: body.minInsuranceDeposit,
            maxInsuranceDeposit: body.maxInsuranceDeposit,
          },
        });

        return { success: true, trader: updated };
      },
      {
        tags: ["admin"],
        headers: authHeader,
        params: t.Object({
          id: t.String(),
        }),
        body: t.Object({
          minInsuranceDeposit: t.Number(),
          maxInsuranceDeposit: t.Number(),
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            trader: t.Object({
              id: t.String(),
              minInsuranceDeposit: t.Number(),
              maxInsuranceDeposit: t.Number(),
            }),
          }),
          404: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      }
    )

    /* ───────────────── trader: update all settings ───────────────── */
    .patch(
      "/traders/:id/settings",
      async ({ params, body, error }) => {
        try {
          const trader = await db.user.findUniqueOrThrow({
            where: { id: params.id },
          });

          // Validate team if provided
          if (body.teamId) {
            const team = await db.team.findUnique({
              where: { id: body.teamId },
            });
            if (!team) {
              return error(404, { error: "Команда не найдена" });
            }
          }

          const updated = await db.user.update({
            where: { id: params.id },
            data: {
              email: body.email,
              name: body.name,
              minInsuranceDeposit: body.minInsuranceDeposit,
              maxInsuranceDeposit: body.maxInsuranceDeposit,
              minAmountPerRequisite: body.minAmountPerRequisite,
              maxAmountPerRequisite: body.maxAmountPerRequisite,
              disputeLimit: body.disputeLimit,
              teamId: body.teamId,
            },
            include: {
              team: {
                include: {
                  agent: true,
                },
              },
              agentTraders: {
                include: {
                  agent: true,
                },
              },
            },
          });

          // Update AgentTrader teamId if team is set
          if (body.teamId && updated.agentTraders.length > 0) {
            await db.agentTrader.updateMany({
              where: { traderId: params.id },
              data: { teamId: body.teamId },
            });
          }

          return {
            id: updated.id,
            email: updated.email,
            name: updated.name,
            minInsuranceDeposit: updated.minInsuranceDeposit,
            maxInsuranceDeposit: updated.maxInsuranceDeposit,
            minAmountPerRequisite: updated.minAmountPerRequisite,
            maxAmountPerRequisite: updated.maxAmountPerRequisite,
            disputeLimit: updated.disputeLimit,
            teamId: updated.teamId,
            team: updated.team
              ? {
                  id: updated.team.id,
                  name: updated.team.name,
                  agentId: updated.team.agentId,
                  agentName: updated.team.agent.name,
                }
              : null,
            agent:
              updated.agentTraders.length > 0
                ? {
                    id: updated.agentTraders[0].agent.id,
                    name: updated.agentTraders[0].agent.name,
                    email: updated.agentTraders[0].agent.email,
                  }
                : null,
          };
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2025"
          )
            return error(404, { error: "Трейдер не найден" });
          throw e;
        }
      },
      {
        tags: ["admin"],
        headers: authHeader,
        params: t.Object({ id: t.String() }),
        body: t.Object({
          email: t.String({ format: "email" }),
          name: t.String(),
          minInsuranceDeposit: t.Number(),
          maxInsuranceDeposit: t.Number(),
          minAmountPerRequisite: t.Number(),
          maxAmountPerRequisite: t.Number(),
          disputeLimit: t.Number(),
          teamId: t.Optional(t.Nullable(t.String())),
        }),
        response: {
          200: t.Object({
            id: t.String(),
            email: t.String(),
            name: t.String(),
            minInsuranceDeposit: t.Number(),
            maxInsuranceDeposit: t.Number(),
            minAmountPerRequisite: t.Number(),
            maxAmountPerRequisite: t.Number(),
            disputeLimit: t.Number(),
            teamId: t.Nullable(t.String()),
            team: t.Nullable(
              t.Object({
                id: t.String(),
                name: t.String(),
                agentId: t.String(),
                agentName: t.String(),
              })
            ),
            agent: t.Nullable(
              t.Object({
                id: t.String(),
                name: t.String(),
                email: t.String(),
              })
            ),
          }),
          404: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      }
    )

    /* ───────────────── trader: get full details ───────────────── */
    .get(
      "/traders/:id/full",
      async ({ params, error }) => {
        try {
          const trader = await db.user.findUniqueOrThrow({
            where: { id: params.id },
            include: {
              team: {
                include: {
                  agent: true,
                },
              },
              agentTraders: {
                include: {
                  agent: true,
                  team: true,
                },
              },
              bankDetails: {
                where: { isArchived: false },
                select: {
                  id: true,
                  methodType: true,
                  bankType: true,
                  cardNumber: true,
                  recipientName: true,
                },
              },
              _count: {
                select: {
                  tradedTransactions: {
                    where: { status: "DISPUTE" },
                  },
                },
              },
            },
          });

          return {
            id: trader.id,
            email: trader.email,
            name: trader.name,
            balanceUsdt: trader.balanceUsdt,
            balanceRub: trader.balanceRub,
            minInsuranceDeposit: trader.minInsuranceDeposit,
            maxInsuranceDeposit: trader.maxInsuranceDeposit,
            minAmountPerRequisite: trader.minAmountPerRequisite,
            maxAmountPerRequisite: trader.maxAmountPerRequisite,
            disputeLimit: trader.disputeLimit,
            currentDisputes: trader._count.tradedTransactions,
            teamId: trader.teamId,
            team: trader.team
              ? {
                  id: trader.team.id,
                  name: trader.team.name,
                  agentId: trader.team.agentId,
                  agentName: trader.team.agent.name,
                }
              : null,
            agent:
              trader.agentTraders.length > 0
                ? {
                    id: trader.agentTraders[0].agent.id,
                    name: trader.agentTraders[0].agent.name,
                    email: trader.agentTraders[0].agent.email,
                  }
                : null,
            requisitesCount: trader.bankDetails.length,
            createdAt: trader.createdAt.toISOString(),
          };
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2025"
          )
            return error(404, { error: "Трейдер не найден" });
          throw e;
        }
      },
      {
        tags: ["admin"],
        headers: authHeader,
        params: t.Object({ id: t.String() }),
        response: {
          200: t.Object({
            id: t.String(),
            email: t.String(),
            name: t.String(),
            balanceUsdt: t.Number(),
            balanceRub: t.Number(),
            minInsuranceDeposit: t.Number(),
            maxInsuranceDeposit: t.Number(),
            minAmountPerRequisite: t.Number(),
            maxAmountPerRequisite: t.Number(),
            disputeLimit: t.Number(),
            currentDisputes: t.Number(),
            teamId: t.Nullable(t.String()),
            team: t.Nullable(
              t.Object({
                id: t.String(),
                name: t.String(),
                agentId: t.String(),
                agentName: t.String(),
              })
            ),
            agent: t.Nullable(
              t.Object({
                id: t.String(),
                name: t.String(),
                email: t.String(),
              })
            ),
            requisitesCount: t.Number(),
            createdAt: t.String(),
          }),
          404: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      }
    )

    /* ───────────────── users list ───────────────── */
    .get(
      "/users",
      async () => {
        const users = await db.user.findMany({
          select: {
            id: true,
            numericId: true,
            email: true,
            name: true,
            balanceUsdt: true,
            balanceRub: true,
            trustBalance: true,
            profitFromDeals: true,
            profitFromPayouts: true,
            rateConst: true,
            useConstRate: true,
            profitPercent: true,
            stakePercent: true,
            banned: true,
            createdAt: true,
            frozenUsdt: true,
            frozenRub: true,
            trafficEnabled: true,
            deposit: true,
            maxSimultaneousPayouts: true,
            rateSource: true,
            agentTraders: {
              include: {
                agent: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
            team: {
              select: {
                id: true,
                name: true,
                agentId: true,
              },
            },
            bankDetails: {
              where: { isArchived: false },
              select: {
                id: true,
              },
            },
          },
        });

        const turnovers = await db.transaction.groupBy({
          by: ["traderId"],
          where: {
            traderId: { in: users.map((u) => u.id) },
            status: Status.READY,
            type: TransactionType.IN,
          },
          _sum: { amount: true },
        });
        const map = Object.fromEntries(
          turnovers.map((t) => [t.traderId, t._sum.amount ?? 0])
        );

        // Get last transaction for each trader
        const lastTransactions = await db.transaction.findMany({
          where: {
            traderId: { in: users.map((u) => u.id) },
          },
          orderBy: { createdAt: "desc" },
          distinct: ["traderId"],
          select: {
            traderId: true,
            createdAt: true,
          },
        });
        const lastTransactionMap = Object.fromEntries(
          lastTransactions.map((t) => [t.traderId, t.createdAt])
        );

        return users.map((u) => ({
          ...u,
          turnover: map[u.id] ?? 0,
          createdAt: u.createdAt.toISOString(),
          lastTransactionAt: lastTransactionMap[u.id]?.toISOString() ?? null,
          agent: u.agentTraders.length > 0 ? u.agentTraders[0].agent : null,
          team: u.team,
          activeRequisitesCount: u.bankDetails.length,
          agentTraders: undefined, // Remove the full agentTraders object
          bankDetails: undefined, // Remove the full bankDetails object
        }));
      },
      {
        tags: ["admin"],
        headers: authHeader,
        response: {
          200: t.Array(
            t.Object({
              id: t.String(),
              numericId: t.Number(),
              email: t.String(),
              name: t.String(),
              balanceUsdt: t.Number(),
              balanceRub: t.Number(),
              rateConst: t.Nullable(t.Number()),
              useConstRate: t.Optional(t.Boolean()),
              profitPercent: t.Nullable(t.Number()),
              stakePercent: t.Nullable(t.Number()),
              trustBalance: t.Number(),
              profitFromDeals: t.Number(),
              profitFromPayouts: t.Number(),
              turnover: t.Number(),
              banned: t.Boolean(),
              createdAt: t.String(),
              frozenUsdt: t.Number(),
              frozenRub: t.Number(),
              trafficEnabled: t.Boolean(),
              deposit: t.Number(),
              maxSimultaneousPayouts: t.Number(),
              lastTransactionAt: t.Nullable(t.String()),
              rateSource: t.Union([t.Enum(RateSource), t.Null()]),
              agent: t.Nullable(
                t.Object({
                  id: t.String(),
                  name: t.String(),
                  email: t.String(),
                })
              ),
              team: t.Nullable(
                t.Object({
                  id: t.String(),
                  name: t.String(),
                  agentId: t.String(),
                })
              ),
              activeRequisitesCount: t.Number(),
            })
          ),
          401: ErrorSchema,
          403: ErrorSchema,
        },
      }
    )

    /* ───────────────── user by id ───────────────── */
    .get(
      "/user/:id",
      async ({ params, error }) => {
        try {
          const u = await db.user.findUniqueOrThrow({
            where: { id: params.id },
            select: {
              id: true,
              email: true,
              name: true,
              balanceUsdt: true,
              balanceRub: true,
              rateConst: true,
              useConstRate: true,
              profitPercent: true,
              stakePercent: true,
              banned: true,
              createdAt: true,
              rateSource: true,
              sessions: {
                select: {
                  id: true,
                  ip: true,
                  createdAt: true,
                  expiredAt: true,
                },
              },
            },
          });
          return {
            ...u,
            createdAt: u.createdAt.toISOString(),
            sessions: u.sessions.map((s) => ({
              ...s,
              createdAt: s.createdAt.toISOString(),
              expiredAt: s.expiredAt.toISOString(),
            })),
          };
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2025"
          )
            return error(404, { error: "Пользователь не найден" });
          throw e;
        }
      },
      {
        tags: ["admin"],
        headers: authHeader,
        params: t.Object({ id: t.String() }),
        response: {
          200: t.Object({
            id: t.String(),
            email: t.String(),
            name: t.String(),
            balanceUsdt: t.Number(),
            balanceRub: t.Number(),
            rateConst: t.Nullable(t.Number()),
            useConstRate: t.Optional(t.Boolean()),
            profitPercent: t.Nullable(t.Number()),
            stakePercent: t.Nullable(t.Number()),
            banned: t.Boolean(),
            createdAt: t.String(),
            rateSource: t.Union([t.Enum(RateSource), t.Null()]),
            sessions: t.Array(
              t.Object({
                id: t.String(),
                ip: t.String(),
                createdAt: t.String(),
                expiredAt: t.String(),
              })
            ),
          }),
          404: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      }
    )

    /* ───────────────── Get all admins (SUPER_ADMIN only) ───────────────── */
    .get(
      "/admins",
      async ({ request, error }) => {
        // Check if requester is SUPER_ADMIN
        const adminToken = request.headers.get("x-admin-key");
        const admin = await db.admin.findUnique({
          where: { token: adminToken || "" },
        });

        if (!admin || admin.role !== "SUPER_ADMIN") {
          return error(403, { error: "Super-admin privileges required" });
        }

        const admins = await db.admin.findMany({
          select: {
            id: true,
            token: true,
            role: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        });

        return admins.map((a) => ({
          ...a,
          createdAt: a.createdAt.toISOString(),
        }));
      },
      {
        tags: ["superadmin"],
        headers: authHeader,
        response: {
          200: t.Array(
            t.Object({
              id: t.String(),
              token: t.String(),
              role: t.Enum(AdminRole),
              createdAt: t.String(),
            })
          ),
          401: ErrorSchema,
          403: ErrorSchema,
        },
      }
    )

    /* ───────────────── superadmin: create ───────────────── */
    .post(
      "/create-admin",
      async ({ request, body, error }) => {
        // Check if requester is SUPER_ADMIN
        const adminToken = request.headers.get("x-admin-key");
        const admin = await db.admin.findUnique({
          where: { token: adminToken || "" },
        });

        if (!admin || admin.role !== "SUPER_ADMIN") {
          return error(403, { error: "Super-admin privileges required" });
        }

        const token = randomBytes(32).toString("hex");
        const a = await db.admin.create({
          data: {
            token,
            role: body.role || "ADMIN",
          },
          select: { id: true, token: true, role: true, createdAt: true },
        });

        const out = { ...a, createdAt: a.createdAt.toISOString() };
        return new Response(JSON.stringify(out), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      },
      {
        tags: ["superadmin"],
        headers: authHeader,
        body: t.Object({
          role: t.Optional(t.Enum(AdminRole)),
        }),
        response: {
          201: t.Object({
            id: t.String(),
            token: t.String(),
            role: t.Enum(AdminRole),
            createdAt: t.String(),
          }),
          409: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      }
    )

    /* ───────────────── Update admin role (SUPER_ADMIN only) ───────────────── */
    .put(
      "/admins/:id",
      async ({ params, body, request, error }) => {
        // Check if requester is SUPER_ADMIN
        const adminToken = request.headers.get("x-admin-key");
        const admin = await db.admin.findUnique({
          where: { token: adminToken || "" },
        });

        if (!admin || admin.role !== "SUPER_ADMIN") {
          return error(403, { error: "Super-admin privileges required" });
        }

        // Prevent changing own role
        if (admin.id === params.id) {
          return error(400, { error: "Cannot change your own role" });
        }

        try {
          const updatedAdmin = await db.admin.update({
            where: { id: params.id },
            data: { role: body.role },
            select: { id: true, token: true, role: true, createdAt: true },
          });

          return {
            ...updatedAdmin,
            createdAt: updatedAdmin.createdAt.toISOString(),
          };
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2025"
          )
            return error(404, { error: "Admin not found" });
          throw e;
        }
      },
      {
        tags: ["superadmin"],
        headers: authHeader,
        params: t.Object({ id: t.String() }),
        body: t.Object({
          role: t.Enum(AdminRole),
        }),
        response: {
          200: t.Object({
            id: t.String(),
            token: t.String(),
            role: t.Enum(AdminRole),
            createdAt: t.String(),
          }),
          400: ErrorSchema,
          404: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      }
    )

    /* ───────────────── superadmin: delete ───────────────── */
    .delete(
      "/admins/:id",
      async ({ params, request, error }) => {
        // Check if requester is SUPER_ADMIN
        const adminToken = request.headers.get("x-admin-key");
        const admin = await db.admin.findUnique({
          where: { token: adminToken || "" },
        });

        if (!admin || admin.role !== "SUPER_ADMIN") {
          return error(403, { error: "Super-admin privileges required" });
        }

        // Prevent deleting yourself
        if (admin.id === params.id) {
          return error(400, { error: "Cannot delete your own account" });
        }

        try {
          await db.admin.delete({ where: { id: params.id } });
          return { ok: true };
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2025"
          )
            return error(404, { error: "Admin not found" });
          throw e;
        }
      },
      {
        tags: ["superadmin"],
        headers: authHeader,
        params: t.Object({ id: t.String() }),
        response: {
          200: t.Object({ ok: t.Boolean() }),
          400: ErrorSchema,
          404: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      }
    );
