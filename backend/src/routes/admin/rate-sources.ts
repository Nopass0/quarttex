import { Elysia, t } from "elysia";
import { db } from "@/db";
import { RateSource, KkkOperationType } from "@prisma/client";

const authHeader = t.Object({ "x-admin-key": t.String() });

export default (app: Elysia) =>
  app
    // Получить все источники курсов
    .get(
      "/rate-sources",
      async () => {
        // Ленивая инициализация дефолтных источников, если отсутствуют
        const existing = await db.rateSourceConfig.findMany({
          select: { id: true },
        });

        if (existing.length === 0) {
          await Promise.all([
            db.rateSourceConfig.upsert({
              where: { source: RateSource.bybit },
              create: {
                source: RateSource.bybit,
                displayName: "Bybit",
                kkkPercent: 0,
                kkkOperation: KkkOperationType.MINUS,
                isActive: true,
              },
              update: {},
            }),
            db.rateSourceConfig.upsert({
              where: { source: RateSource.rapira },
              create: {
                source: RateSource.rapira,
                displayName: "Rapira",
                kkkPercent: 0,
                kkkOperation: KkkOperationType.MINUS,
                isActive: true,
              },
              update: {},
            }),
          ]);
        }

        const rateSources = await db.rateSourceConfig.findMany({
          include: {
            traders: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            merchants: {
              include: {
                merchant: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            _count: {
              select: {
                traders: true,
                merchants: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        });

        // Получить текущие курсы от источников
        const ratesPromises = rateSources.map(async (source) => {
          let currentRate = null;

          try {
            if (source.source === "bybit") {
              const { bybitService } = await import("@/services/bybit.service");
              currentRate = await bybitService.getUsdtRubRate();
            } else if (source.source === "rapira") {
              const { rapiraService } = await import(
                "@/services/rapira.service"
              );
              currentRate = await rapiraService.getUsdtRubRate();
            }
          } catch (error) {
            console.error(`Failed to fetch rate for ${source.source}:`, error);
            // Fallback to stored base rate if available
            if (source.baseRate) {
              currentRate = source.baseRate;
            }
          }

          return {
            ...source,
            currentRate,
            adjustedRate: currentRate
              ? currentRate *
                (1 +
                  (source.kkkPercent / 100) *
                    (source.kkkOperation === "MINUS" ? -1 : 1))
              : null,
          };
        });

        const sourcesWithRates = await Promise.all(ratesPromises);

        return {
          success: true,
          data: sourcesWithRates,
        };
      },
      {
        headers: authHeader,
      }
    )

    // Получить конкретный источник курса
    .get(
      "/rate-sources/:id",
      async ({ params: { id } }) => {
        const rateSource = await db.rateSourceConfig.findUnique({
          where: { id },
          include: {
            traders: {
              select: {
                id: true,
                name: true,
                email: true,
                balanceUsdt: true,
                balanceRub: true,
              },
            },
            merchants: {
              include: {
                merchant: {
                  select: {
                    id: true,
                    name: true,
                    balanceUsdt: true,
                  },
                },
              },
            },
          },
        });

        if (!rateSource) {
          return {
            success: false,
            error: "Источник курса не найден",
          };
        }

        return {
          success: true,
          data: rateSource,
        };
      },
      {
        headers: authHeader,
        params: t.Object({
          id: t.String(),
        }),
      }
    )

    // Обновить настройки источника курса
    .put(
      "/rate-sources/:id",
      async ({ params: { id }, body }) => {
        const { displayName, kkkPercent, kkkOperation, isActive } = body as {
          displayName?: string;
          kkkPercent?: number;
          kkkOperation?: KkkOperationType;
          isActive?: boolean;
        };

        try {
          const updated = await db.rateSourceConfig.update({
            where: { id },
            data: {
              ...(displayName !== undefined && { displayName }),
              ...(kkkPercent !== undefined && { kkkPercent }),
              ...(kkkOperation !== undefined && { kkkOperation }),
              ...(isActive !== undefined && { isActive }),
            },
          });

          return {
            success: true,
            data: updated,
          };
        } catch (error) {
          return {
            success: false,
            error: "Не удалось обновить источник курса",
          };
        }
      },
      {
        headers: authHeader,
        params: t.Object({
          id: t.String(),
        }),
        body: t.Object({
          displayName: t.Optional(t.String()),
          kkkPercent: t.Optional(t.Number()),
          kkkOperation: t.Optional(
            t.Union([t.Literal("PLUS"), t.Literal("MINUS")])
          ),
          isActive: t.Optional(t.Boolean()),
        }),
      }
    )

    // Привязать трейдера к источнику курса
    .post(
      "/rate-sources/:id/traders/:traderId",
      async ({ params: { id, traderId } }) => {
        try {
          const updated = await db.user.update({
            where: { id: traderId },
            data: {
              rateSourceConfigId: id,
            },
          });

          return {
            success: true,
            data: updated,
          };
        } catch (error) {
          return {
            success: false,
            error: "Не удалось привязать трейдера к источнику",
          };
        }
      },
      {
        headers: authHeader,
        params: t.Object({
          id: t.String(),
          traderId: t.String(),
        }),
      }
    )

    // Отвязать трейдера от источника курса
    .delete(
      "/rate-sources/:id/traders/:traderId",
      async ({ params: { id, traderId } }) => {
        try {
          const updated = await db.user.update({
            where: { id: traderId },
            data: {
              rateSourceConfigId: null,
            },
          });

          return {
            success: true,
            data: updated,
          };
        } catch (error) {
          return {
            success: false,
            error: "Не удалось отвязать трейдера от источника",
          };
        }
      },
      {
        headers: authHeader,
        params: t.Object({
          id: t.String(),
          traderId: t.String(),
        }),
      }
    )

    // Привязать мерчанта к источнику курса
    .post(
      "/rate-sources/:id/merchants/:merchantId",
      async ({ params: { id, merchantId }, body }) => {
        const { merchantProvidesRate = true, priority = 0 } = body as {
          merchantProvidesRate?: boolean;
          priority?: number;
        };

        try {
          const created = await db.merchantRateSource.create({
            data: {
              merchantId,
              rateSourceId: id,
              merchantProvidesRate,
              priority,
            },
            include: {
              merchant: true,
              rateSource: true,
            },
          });

          return {
            success: true,
            data: created,
          };
        } catch (error) {
          return {
            success: false,
            error: "Не удалось привязать мерчанта к источнику",
          };
        }
      },
      {
        headers: authHeader,
        params: t.Object({
          id: t.String(),
          merchantId: t.String(),
        }),
        body: t.Object({
          merchantProvidesRate: t.Optional(t.Boolean()),
          priority: t.Optional(t.Number()),
        }),
      }
    )

    // Обновить настройки связи мерчант-источник
    .put(
      "/rate-sources/merchants/:relationId",
      async ({ params: { relationId }, body }) => {
        const { merchantProvidesRate, priority, isActive } = body as {
          merchantProvidesRate?: boolean;
          priority?: number;
          isActive?: boolean;
        };

        try {
          const updated = await db.merchantRateSource.update({
            where: { id: relationId },
            data: {
              ...(merchantProvidesRate !== undefined && {
                merchantProvidesRate,
              }),
              ...(priority !== undefined && { priority }),
              ...(isActive !== undefined && { isActive }),
            },
          });

          return {
            success: true,
            data: updated,
          };
        } catch (error) {
          return {
            success: false,
            error: "Не удалось обновить настройки связи",
          };
        }
      },
      {
        headers: authHeader,
        params: t.Object({
          relationId: t.String(),
        }),
        body: t.Object({
          merchantProvidesRate: t.Optional(t.Boolean()),
          priority: t.Optional(t.Number()),
          isActive: t.Optional(t.Boolean()),
        }),
      }
    )

    // Удалить связь мерчанта с источником
    .delete(
      "/rate-sources/merchants/:relationId",
      async ({ params: { relationId } }) => {
        try {
          await db.merchantRateSource.delete({
            where: { id: relationId },
          });

          return {
            success: true,
          };
        } catch (error) {
          return {
            success: false,
            error: "Не удалось удалить связь",
          };
        }
      },
      {
        headers: authHeader,
        params: t.Object({
          relationId: t.String(),
        }),
      }
    )

    // Получить все связи мерчанта с источниками
    .get(
      "/rate-sources/merchant/:merchantId",
      async ({ params: { merchantId } }) => {
        const relations = await db.merchantRateSource.findMany({
          where: { merchantId },
          include: {
            rateSource: true,
          },
          orderBy: {
            priority: "asc",
          },
        });

        return {
          success: true,
          data: relations,
        };
      },
      {
        headers: authHeader,
        params: t.Object({
          merchantId: t.String(),
        }),
      }
    )

    // Обновить курсы всех источников
    .post(
      "/rate-sources/update-rates",
      async () => {
        const sources = await db.rateSourceConfig.findMany({
          where: { isActive: true },
        });

        const updates = [];

        for (const source of sources) {
          let rate = null;

          try {
            if (source.source === "bybit") {
              const { bybitService } = await import("@/services/bybit.service");
              rate = await bybitService.getUsdtRubRate();
            } else if (source.source === "rapira") {
              const { rapiraService } = await import(
                "@/services/rapira.service"
              );
              rate = await rapiraService.getUsdtRubRate();
            }

            if (rate) {
              const updated = await db.rateSourceConfig.update({
                where: { id: source.id },
                data: {
                  baseRate: rate,
                  lastRateUpdate: new Date(),
                },
              });
              updates.push(updated);
            }
          } catch (error) {
            console.error(`Failed to update rate for ${source.source}:`, error);
          }
        }

        return {
          success: true,
          data: updates,
        };
      },
      {
        headers: authHeader,
      }
    );
