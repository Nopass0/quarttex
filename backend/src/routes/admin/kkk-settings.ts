import { Elysia, t } from "elysia";
import { db } from "@/db";
import ErrorSchema from "@/types/error";

export default (app: Elysia) =>
  app
    /* ─────────── GET /admin/kkk-settings ─────────── */
    .get(
      "",
      async () => {
        // Get KKK setting from SystemConfig
        const kkkSetting = await db.systemConfig.findUnique({
          where: { key: "kkk_percent" }
        });

        // Get RateSetting for rapiraKkk
        const rateSetting = await db.rateSetting.findFirst({
          where: { id: 1 }
        });

        return {
          kkkPercent: kkkSetting ? parseFloat(kkkSetting.value) : 0,
          rapiraKkk: rateSetting?.rapiraKkk || 0,
          bybitKkk: rateSetting?.bybitKkk || 0
        };
      },
      {
        tags: ["admin"],
        detail: { summary: "Получить настройку ККК" },
        response: {
          200: t.Object({
            kkkPercent: t.Number(),
            rapiraKkk: t.Number()
          }),
          401: ErrorSchema,
          403: ErrorSchema,
        },
      }
    )

    /* ─────────── PUT /admin/kkk-settings ─────────── */
    .put(
      "",
      async ({ body }) => {
        const { kkkPercent, rapiraKkk, bybitKkk } = body;
        
        // Upsert KKK setting in SystemConfig
        await db.systemConfig.upsert({
          where: { key: "kkk_percent" },
          update: { value: kkkPercent.toString() },
          create: { 
            key: "kkk_percent",
            value: kkkPercent.toString()
          }
        });

        // Update or create RateSetting for rapiraKkk
        const existingRateSetting = await db.rateSetting.findFirst({
          where: { id: 1 }
        });

        if (existingRateSetting) {
          await db.rateSetting.update({
            where: { id: 1 },
            data: { rapiraKkk: rapiraKkk || 0, bybitKkk: bybitKkk || 0 }
          });
        } else {
          await db.rateSetting.create({
            data: {
              id: 1,
              value: 0, // Default rate value
              rapiraKkk: rapiraKkk || 0,
              bybitKkk: bybitKkk || 0
            }
          });
        }

        return {
          success: true,
          kkkPercent,
          rapiraKkk: rapiraKkk || 0,
          bybitKkk: bybitKkk || 0
        };
      },
      {
        tags: ["admin"],
        detail: { summary: "Обновить настройку ККК" },
        body: t.Object({
          kkkPercent: t.Number({
            description: "Процент ККК",
            minimum: 0,
            maximum: 100
          }),
          rapiraKkk: t.Optional(t.Number({
            description: "Процент ККК для Rapira",
            minimum: -100,
            maximum: 100
          })),
          bybitKkk: t.Optional(t.Number({
            description: "Процент ККК для Bybit",
            minimum: -100,
            maximum: 100
          }))
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            kkkPercent: t.Number(),
            rapiraKkk: t.Number(),
            bybitKkk: t.Number()
          }),
          401: ErrorSchema,
          403: ErrorSchema,
        },
      }
    );