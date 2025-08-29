import { Elysia, t } from "elysia";
import { db } from "@/db";
import ErrorSchema from "@/types/error";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import { aggregatorSessionGuard } from "@/middleware/aggregatorGuard";

/**
 * Маршруты для аутентификации агрегаторов
 * Доступны без проверки токена
 */
export default (app: Elysia) =>
  app
    /* ──────── POST /aggregator/auth/login ──────── */
    .post(
      "/login",
      async ({ body, error, set }) => {
        const { email, password } = body;

        // Ищем агрегатора по email
        const aggregator = await db.aggregator.findUnique({
          where: { email },
        });

        if (!aggregator) {
          return error(401, { error: "Неверный email или пароль" });
        }

        // Проверяем статус агрегатора
        if (!aggregator.isActive) {
          return error(403, { error: "Агрегатор деактивирован" });
        }

        // Проверяем пароль
        const isPasswordValid = await bcrypt.compare(
          password,
          aggregator.password
        );
        if (!isPasswordValid) {
          return error(401, { error: "Неверный email или пароль" });
        }

        // Если включен 2FA, запускаем двухэтапную авторизацию
        if (aggregator.twoFactorEnabled && aggregator.twoFactorSecret) {
          const challengeId = crypto.randomBytes(16).toString("hex");
          const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 минут

          // Сохраняем челендж в системной конфигурации
          await db.systemConfig.upsert({
            where: { key: `aggregator_totp_challenge_${challengeId}` },
            update: {
              value: JSON.stringify({
                aggregatorId: aggregator.id,
                expiresAt: expiresAt.toISOString(),
              }),
            },
            create: {
              key: `aggregator_totp_challenge_${challengeId}`,
              value: JSON.stringify({
                aggregatorId: aggregator.id,
                expiresAt: expiresAt.toISOString(),
              }),
            },
          });

          set.status = 200;
          return {
            success: true,
            requiresTwoFactor: true,
            challengeId,
            message: "Введите код из приложения Google Authenticator",
          };
        }

        // Создаем сессию (без 2FA)
        const sessionToken = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 часа

        console.log(
          "[Auth] Creating session for aggregator:",
          aggregator.email
        );
        console.log(
          "[Auth] Session token:",
          sessionToken.substring(0, 10) + "..."
        );

        await db.aggregatorSession.create({
          data: {
            aggregatorId: aggregator.id,
            token: sessionToken,
            ip: "127.0.0.1", // TODO: получить реальный IP
            userAgent: "Unknown", // TODO: получить User-Agent
            expiresAt,
          },
        });

        console.log("[Auth] Session created successfully");

        // Получаем статистику агрегатора
        const [totalTransactions, successfulTransactions, totalVolume] =
          await Promise.all([
            db.transaction.count({
              where: { aggregatorId: aggregator.id },
            }),
            db.transaction.count({
              where: { aggregatorId: aggregator.id, status: "READY" },
            }),
            db.transaction.aggregate({
              where: { aggregatorId: aggregator.id, status: "READY" },
              _sum: { amount: true },
            }),
          ]);

        set.status = 200;
        return {
          success: true,
          sessionToken,
          expiresAt: expiresAt.toISOString(),
          aggregator: {
            id: aggregator.id,
            email: aggregator.email,
            name: aggregator.name,
            apiToken: aggregator.apiToken,
            balanceUsdt: aggregator.balanceUsdt,
            apiBaseUrl: aggregator.apiBaseUrl,
            twoFactorEnabled: aggregator.twoFactorEnabled,
            createdAt: aggregator.createdAt.toISOString(),
            statistics: {
              totalTransactions,
              successfulTransactions,
              successRate:
                totalTransactions > 0
                  ? Math.round(
                      (successfulTransactions / totalTransactions) * 100
                    )
                  : 0,
              totalVolume: totalVolume._sum.amount || 0,
            },
          },
        };
      },
      {
        tags: ["aggregator-auth"],
        detail: { summary: "Авторизация агрегатора по email и паролю" },
        body: t.Object({
          email: t.String({ format: "email" }),
          password: t.String(),
        }),
        response: {
          200: t.Any(),
          401: ErrorSchema,
          403: ErrorSchema,
        },
      }
    )

    /* ──────── POST /aggregator/auth/verify-2fa ──────── */
    .post(
      "/verify-2fa",
      async ({ body, error, set }) => {
        const { challengeId, code } = body;

        const challengeConfig = await db.systemConfig.findUnique({
          where: { key: `aggregator_totp_challenge_${challengeId}` },
        });

        if (!challengeConfig) {
          return error(400, { error: "Неверный или истекший вызов" });
        }

        const challenge = JSON.parse(challengeConfig.value);
        if (new Date(challenge.expiresAt) < new Date()) {
          await db.systemConfig.delete({
            where: { key: `aggregator_totp_challenge_${challengeId}` },
          });
          return error(400, { error: "Время вызова истекло" });
        }

        const aggregator = await db.aggregator.findUnique({
          where: { id: challenge.aggregatorId },
        });

        if (!aggregator) {
          return error(404, { error: "Агрегатор не найден" });
        }

        if (!aggregator.twoFactorEnabled || !aggregator.twoFactorSecret) {
          return error(400, { error: "2FA не настроен" });
        }

        const isValid = authenticator.verify({
          token: code,
          secret: aggregator.twoFactorSecret,
        });

        if (!isValid) {
          return error(401, { error: "Неверный код" });
        }

        // Удаляем вызов и создаем сессию
        await db.systemConfig.delete({
          where: { key: `aggregator_totp_challenge_${challengeId}` },
        });

        const sessionToken = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        console.log(
          "[Auth 2FA] Creating session for aggregator:",
          aggregator.email
        );
        console.log(
          "[Auth 2FA] Session token:",
          sessionToken.substring(0, 10) + "..."
        );

        await db.aggregatorSession.create({
          data: {
            aggregatorId: aggregator.id,
            token: sessionToken,
            ip: "127.0.0.1", // TODO: получить реальный IP
            userAgent: "Unknown", // TODO: получить User-Agent
            expiresAt,
          },
        });

        console.log("[Auth 2FA] Session created successfully");

        set.status = 200;
        return {
          success: true,
          sessionToken,
          expiresAt: expiresAt.toISOString(),
          aggregator: {
            id: aggregator.id,
            email: aggregator.email,
            name: aggregator.name,
            apiToken: aggregator.apiToken,
            balanceUsdt: aggregator.balanceUsdt,
            apiBaseUrl: aggregator.apiBaseUrl,
            twoFactorEnabled: aggregator.twoFactorEnabled,
            createdAt: aggregator.createdAt.toISOString(),
          },
        };
      },
      {
        tags: ["aggregator-auth"],
        detail: { summary: "Проверка 2FA и выдача сессии" },
        body: t.Object({
          challengeId: t.String(),
          code: t.String(),
        }),
        response: {
          200: t.Any(),
          400: ErrorSchema,
          401: ErrorSchema,
          404: ErrorSchema,
        },
      }
    )

    /* ──────── POST /aggregator/auth/logout ──────── */
    .post(
      "/logout",
      async ({ headers, set, error }) => {
        const authHeader = headers.authorization as string | undefined;
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
          return error(401, { error: "Отсутствует токен сессии агрегатора" });
        }

        try {
          await db.aggregatorSession.delete({
            where: { token: sessionToken },
          });
        } catch {
          // Игнорируем ошибку, если сессия уже не существует
        }

        set.status = 200;
        return { success: true };
      },
      {
        tags: ["aggregator-auth"],
        detail: { summary: "Выход агрегатора из системы" },
        headers: t.Object({
          authorization: t.Optional(
            t.String({ description: "Bearer токен сессии" })
          ),
          "x-aggregator-session-token": t.Optional(
            t.String({
              description: "Альтернативный заголовок с токеном сессии",
            })
          ),
        }),
        response: {
          200: t.Object({ success: t.Boolean() }),
          401: ErrorSchema,
        },
      }
    )

    /* ──────── GET /aggregator/auth/me ──────── */
    // Защищенный эндпоинт для получения текущего пользователя
    .get(
      "/me",
      async ({ headers, error }) => {
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
          return error(401, { error: "Отсутствует токен сессии агрегатора" });
        }

        // Получаем сессию
        const session = await db.aggregatorSession.findUnique({
          where: { token: sessionToken },
          include: { aggregator: true },
        });

        if (!session) {
          return error(401, { error: "Недействительная сессия" });
        }

        // Проверяем срок действия сессии
        if (session.expiresAt < new Date()) {
          // Удаляем истекшую сессию
          await db.aggregatorSession.delete({
            where: { id: session.id },
          });
          return error(401, { error: "Сессия истекла" });
        }

        if (!session.aggregator.isActive) {
          return error(403, { error: "Доступ запрещен" });
        }

        const aggregator = session.aggregator;

        // Получаем статистику агрегатора
        const [
          totalTransactions,
          successfulTransactions,
          totalVolume,
          activeDisputes,
        ] = await Promise.all([
          db.transaction.count({
            where: { aggregatorId: aggregator.id },
          }),
          db.transaction.count({
            where: { aggregatorId: aggregator.id, status: "READY" },
          }),
          db.transaction.aggregate({
            where: { aggregatorId: aggregator.id, status: "READY" },
            _sum: { amount: true },
          }),
          db.aggregatorDispute.count({
            where: {
              aggregatorId: aggregator.id,
              status: { in: ["OPEN", "IN_PROGRESS"] },
            },
          }),
        ]);

        return {
          aggregator: {
            id: aggregator.id,
            email: aggregator.email,
            name: aggregator.name,
            apiToken: aggregator.apiToken,
            balanceUsdt: aggregator.balanceUsdt,
            apiBaseUrl: aggregator.apiBaseUrl,
            twoFactorEnabled: aggregator.twoFactorEnabled,
            createdAt: aggregator.createdAt.toISOString(),
            statistics: {
              totalTransactions,
              successfulTransactions,
              successRate:
                totalTransactions > 0
                  ? Math.round(
                      (successfulTransactions / totalTransactions) * 100
                    )
                  : 0,
              totalVolume: totalVolume._sum.amount || 0,
              activeDisputes,
            },
          },
        };
      },
      {
        tags: ["aggregator-auth"],
        detail: { summary: "Получение текущего агрегатора" },
        headers: t.Object({
          authorization: t.Optional(
            t.String({ description: "Bearer токен сессии" })
          ),
          "x-aggregator-session-token": t.Optional(
            t.String({
              description: "Альтернативный заголовок с токеном сессии",
            })
          ),
        }),
        response: {
          200: t.Object({
            aggregator: t.Object({
              id: t.String(),
              email: t.String(),
              name: t.String(),
              balanceUsdt: t.Number(),
              apiBaseUrl: t.Union([t.String(), t.Null()]),
              twoFactorEnabled: t.Boolean(),
              createdAt: t.String(),
              statistics: t.Object({
                totalTransactions: t.Number(),
                successfulTransactions: t.Number(),
                successRate: t.Number(),
                totalVolume: t.Number(),
                activeDisputes: t.Number(),
              }),
            }),
          }),
          401: ErrorSchema,
        },
      }
    );
