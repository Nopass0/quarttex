// src/middleware/aggregatorGuard.ts
import { Elysia, t } from "elysia";
import { db } from "@/db";

// Extend Elysia context
declare module "elysia" {
  interface Context {
    aggregator: {
      id: string;
      email: string;
      name: string;
      apiToken: string;
      callbackToken: string;
      apiBaseUrl?: string | null;
      balanceUsdt: number;
      isActive: boolean;
      twoFactorEnabled: boolean;
      createdAt: Date;
      updatedAt: Date;
    };
  }
}

/**
 * aggregatorSessionGuard — защита эндпоинтов агрегатора с использованием сессий.
 *
 * Ошибки:
 *  • 401 Unauthorized — нет/неверный Bearer токен или истекшая сессия.
 *
 * Использование:
 *   app.use(aggregatorSessionGuard())                 // глобально
 *   app.use('/aggregator/dashboard', aggregatorSessionGuard())    // для группы /aggregator/dashboard
 */
export const aggregatorSessionGuard = () => (app: Elysia) =>
  app.derive(async ({ headers, error }) => {
    const authHeader = headers.authorization;
    const altHeader = headers["x-aggregator-session-token"] as
      | string
      | undefined;

    let sessionToken: string | undefined;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      sessionToken = authHeader.substring(7);
    } else if (altHeader) {
      sessionToken = altHeader;
    }

    if (!sessionToken) {
      throw error(401, { error: "Отсутствует токен сессии агрегатора" });
    }

    console.log(
      "[AggregatorGuard] Checking session:",
      sessionToken.substring(0, 10) + "..."
    );

    // Получаем сессию
    const session = await db.aggregatorSession.findUnique({
      where: { token: sessionToken },
      include: { aggregator: true },
    });

    if (!session) {
      console.log("[AggregatorGuard] Session not found");
      throw error(401, { error: "Недействительная сессия" });
    }

    console.log(
      "[AggregatorGuard] Session found for aggregator:",
      session.aggregator.email
    );

    // Проверяем срок действия сессии
    if (session.expiresAt < new Date()) {
      // Удаляем истекшую сессию
      await db.aggregatorSession.delete({
        where: { id: session.id },
      });
      throw error(401, { error: "Сессия истекла" });
    }

    // Проверяем статус агрегатора
    if (!session.aggregator.isActive) {
      throw error(403, { error: "Доступ запрещен" });
    }

    /* теперь в handlers доступно { aggregator } */
    return {
      aggregator: session.aggregator,
    };
  });

/**
 * aggregatorApiGuard — защита для API эндпоинтов агрегаторов через API токен
 *
 * Ошибки:
 *  • 401 Unauthorized — нет/неверный API токен
 *
 * Использование:
 *   app.use(aggregatorApiGuard())
 */
export const aggregatorApiGuard = () => (app: Elysia) =>
  app
    .guard({
      headers: t.Object({
        "x-aggregator-api-token": t.String({
          description: "API токен агрегатора",
        }),
      }),
      async beforeHandle({ headers, error }) {
        const apiToken = headers["x-aggregator-api-token"];

        if (!apiToken) {
          return error(401, { error: "Отсутствует API токен" });
        }

        const aggregator = await db.aggregator.findUnique({
          where: { apiToken },
        });

        if (!aggregator) {
          return error(401, { error: "Недействительный API токен" });
        }

        if (!aggregator.isActive) {
          return error(403, { error: "Агрегатор деактивирован" });
        }
      },
    })
    .derive(async ({ headers, error }) => {
      const apiToken = headers["x-aggregator-api-token"];

      if (!apiToken) {
        throw error(401, { error: "API токен не предоставлен" });
      }

      const aggregator = await db.aggregator.findUnique({
        where: { apiToken },
      });

      if (!aggregator) {
        throw error(401, { error: "Недействительный API токен" });
      }

      return {
        aggregator,
      };
    });
