import { Elysia, t } from "elysia";
import { db } from "../../db";
import { traderGuard } from "../../middleware/traderGuard";
import { TrafficType } from "@prisma/client";
import ErrorSchema from "../../types/error";

export const trafficSettingsApi = new Elysia({ prefix: "/traffic-settings" })
  .use(traderGuard())
  
  // Get trader's traffic settings
  .get("/", async ({ trader }) => {
    try {
      const settings = await db.trafficSettings.findUnique({
        where: { userId: trader.id },
      });

      // Return default settings if none exist
      if (!settings) {
        return {
          success: true,
          settings: {
            isEnabled: false,
            maxCounterparties: 5,
            trafficType: "PRIMARY" as TrafficType,
          },
        };
      }

      return {
        success: true,
        settings: {
          isEnabled: settings.isEnabled,
          maxCounterparties: settings.maxCounterparties,
          trafficType: settings.trafficType,
        },
      };
    } catch (error: any) {
      return { error: error.message };
    }
  }, {
    tags: ["trader"],
    detail: { summary: "Получить настройки трафика трейдера" },
    response: {
      200: t.Object({
        success: t.Boolean(),
        settings: t.Object({
          isEnabled: t.Boolean(),
          maxCounterparties: t.Number(),
          trafficType: t.Enum(TrafficType),
        }),
      }),
      400: ErrorSchema,
      401: ErrorSchema,
    },
  })
  
  // Update trader's traffic settings
  .put("/", async ({ trader, body, set }) => {
    try {
      const settings = await db.trafficSettings.upsert({
        where: { userId: trader.id },
        update: {
          isEnabled: body.isEnabled,
          maxCounterparties: body.maxCounterparties,
          trafficType: body.trafficType,
          updatedAt: new Date(),
        },
        create: {
          userId: trader.id,
          isEnabled: body.isEnabled,
          maxCounterparties: body.maxCounterparties,
          trafficType: body.trafficType,
        },
      });

      return {
        success: true,
        settings: {
          isEnabled: settings.isEnabled,
          maxCounterparties: settings.maxCounterparties,
          trafficType: settings.trafficType,
        },
      };
    } catch (error: any) {
      set.status = 400;
      return { error: error.message };
    }
  }, {
    body: t.Object({
      isEnabled: t.Boolean(),
      maxCounterparties: t.Number({ minimum: 1, maximum: 100 }),
      trafficType: t.Enum(TrafficType),
    }),
    tags: ["trader"],
    detail: { summary: "Обновить настройки трафика трейдера" },
    response: {
      200: t.Object({
        success: t.Boolean(),
        settings: t.Object({
          isEnabled: t.Boolean(),
          maxCounterparties: t.Number(),
          trafficType: t.Enum(TrafficType),
        }),
      }),
      400: ErrorSchema,
      401: ErrorSchema,
    },
  });
