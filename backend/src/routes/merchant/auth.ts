import { Elysia, t } from "elysia";
import { db } from "@/db";
import ErrorSchema from "@/types/error";
import crypto from "crypto";
import { authenticator } from "otplib";

/**
 * Маршруты для аутентификации мерчантов
 * Доступны без проверки токена
 */
export default (app: Elysia) =>
  app
    /* ──────── POST /merchant/auth/login ──────── */
    .post(
      "/login",
      async ({ body, error, set }) => {
        // Проверяем токен сотрудника
        const staff = await db.merchantStaff.findFirst({
          where: { token: body.token, isActive: true },
        });

        let merchant;
        let role: "owner" | "staff" = "owner";
        let staffId: string | null = null;
        let rights = {
          can_settle: true,
          can_view_docs: true,
          can_view_token: true,
          can_manage_disputes: true,
        };

        if (staff) {
          merchant = await db.merchant.findUnique({
            where: { id: staff.merchantId },
          });
          if (!merchant) {
            return error(401, { error: "Неверный токен" });
          }
          role = staff.role;
          staffId = staff.id;
          rights = {
            can_settle: false,
            can_view_docs: false,
            can_view_token: false,
            can_manage_disputes: true,
          };
        } else {
          merchant = await db.merchant.findUnique({
            where: { token: body.token },
          });

          if (!merchant) {
            return error(401, { error: "Неверный токен" });
          }
        }

        // Проверка статуса мерчанта
        if (merchant.disabled) {
          return error(403, { error: "Мерчант деактивирован" });
        }

        if (merchant.banned) {
          return error(403, { error: "Мерчант заблокирован" });
        }

        // Если включен TOTP, запускаем двухэтапную авторизацию
        if (merchant.totpEnabled) {
          const challengeId = crypto.randomBytes(16).toString("hex");
          const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
          await db.systemConfig.upsert({
            where: { key: `merchant_totp_challenge_${challengeId}` },
            update: { value: JSON.stringify({ merchantId: merchant.id, staffId, role, rights, expiresAt }) },
            create: {
              key: `merchant_totp_challenge_${challengeId}`,
              value: JSON.stringify({ merchantId: merchant.id, staffId, role, rights, expiresAt }),
            },
          });

          set.status = 200;
          return {
            success: true,
            requiresTotp: true,
            challengeId,
            message: "Введите код из приложения Google Authenticator",
          };
        }

        // Создаем сессионный токен (без TOTP)
        const sessionToken = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 часа

        // Сохраняем сессию в базе данных
        const sessionData = {
          merchantId: merchant.id,
          staffId,
          role,
          rights,
          expiresAt,
        };

        await db.systemConfig.upsert({
          where: { key: `merchant_session_${sessionToken}` },
          update: { value: JSON.stringify(sessionData) },
          create: {
            key: `merchant_session_${sessionToken}`,
            value: JSON.stringify(sessionData),
          },
        });

        // Получаем статистику мерчанта
        const [totalTransactions, successfulTransactions, totalVolume] = await Promise.all([
          db.transaction.count({
            where: { merchantId: merchant.id },
          }),
          db.transaction.count({
            where: { merchantId: merchant.id, status: "READY" },
          }),
          db.transaction.aggregate({
            where: { merchantId: merchant.id, status: "READY" },
            _sum: { amount: true },
          }),
        ]);

        set.status = 200;
        return {
          success: true,
          sessionToken,
          expiresAt: expiresAt.toISOString(),
          role,
          rights,
          merchant: {
            id: merchant.id,
            name: merchant.name,
            balanceUsdt: merchant.balanceUsdt,
            createdAt: merchant.createdAt.toISOString(),
            statistics: {
              totalTransactions,
              successfulTransactions,
              successRate: totalTransactions > 0
                ? Math.round((successfulTransactions / totalTransactions) * 100)
                : 0,
              totalVolume: totalVolume._sum.amount || 0,
            },
          },
        };
      },
      {
        tags: ["merchant-auth"],
        detail: { summary: "Авторизация мерчанта по токену (с TOTP при включении)" },
        body: t.Object({ token: t.String() }),
        response: {
          200: t.Any(),
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    )

    /* ──────── POST /merchant/auth/verify-totp ──────── */
    .post(
      "/verify-totp",
      async ({ body, error, set }) => {
        const { challengeId, code } = body as { challengeId: string; code: string };

        const challengeConfig = await db.systemConfig.findUnique({
          where: { key: `merchant_totp_challenge_${challengeId}` },
        });

        if (!challengeConfig) {
          return error(400, { error: "Неверный или истекший челендж" });
        }

        const challenge = JSON.parse(challengeConfig.value);
        if (new Date(challenge.expiresAt) < new Date()) {
          await db.systemConfig.delete({ where: { key: `merchant_totp_challenge_${challengeId}` } });
          return error(400, { error: "Челендж истек" });
        }

        const merchant = await db.merchant.findUnique({ where: { id: challenge.merchantId } });
        if (!merchant) return error(404, { error: "Мерчант не найден" });
        if (!merchant.totpEnabled || !merchant.totpSecret) {
          return error(400, { error: "TOTP не настроен" });
        }

        const isValid = authenticator.verify({ token: code, secret: merchant.totpSecret });
        if (!isValid) return error(401, { error: "Неверный код" });

        // Удаляем челендж и создаем сессию
        await db.systemConfig.delete({ where: { key: `merchant_totp_challenge_${challengeId}` } });

        const sessionToken = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const sessionData = {
          merchantId: merchant.id,
          staffId: challenge.staffId ?? null,
          role: challenge.role ?? "owner",
          rights: challenge.rights ?? {},
          expiresAt,
        };

        await db.systemConfig.upsert({
          where: { key: `merchant_session_${sessionToken}` },
          update: { value: JSON.stringify(sessionData) },
          create: { key: `merchant_session_${sessionToken}`, value: JSON.stringify(sessionData) },
        });

        set.status = 200;
        return {
          success: true,
          sessionToken,
          expiresAt: expiresAt.toISOString(),
          role: sessionData.role,
          rights: sessionData.rights,
          merchant: {
            id: merchant.id,
            name: merchant.name,
            balanceUsdt: merchant.balanceUsdt,
            createdAt: merchant.createdAt.toISOString(),
          },
        };
      },
      {
        tags: ["merchant-auth"],
        detail: { summary: "Проверка TOTP и выдача сессии" },
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
      },
    )

    /* ──────── POST /merchant/auth/logout ──────── */
    .post(
      "/logout",
      async ({ headers, set, error }) => {
        const authHeader = headers.authorization as string | undefined;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return error(401, { error: "Отсутствует токен авторизации" });
        }
        const sessionToken = authHeader.substring(7);
        try {
          await db.systemConfig.delete({ where: { key: `merchant_session_${sessionToken}` } });
        } catch {}
        set.status = 200;
        return { success: true };
      },
      {
        tags: ["merchant-auth"],
        detail: { summary: "Выход мерчанта из системы" },
        headers: t.Object({ authorization: t.String() }),
        response: { 200: t.Object({ success: t.Boolean() }) },
      }
    )

    /* ──────── GET /merchant/auth/me ──────── */
    .get(
      "/me",
      async ({ headers, error }) => {
        const authHeader = headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return error(401, { error: "Отсутствует токен авторизации" });
        }

        const sessionToken = authHeader.substring(7);
        
        // Получаем сессию из базы данных
        const sessionConfig = await db.systemConfig.findUnique({
          where: { key: `merchant_session_${sessionToken}` },
        });

        if (!sessionConfig) {
          return error(401, { error: "Недействительная сессия" });
        }

        const session = JSON.parse(sessionConfig.value);
        
        // Проверяем срок действия сессии
        if (new Date(session.expiresAt) < new Date()) {
          // Удаляем истекшую сессию
          await db.systemConfig.delete({
            where: { key: `merchant_session_${sessionToken}` },
          });
          return error(401, { error: "Сессия истекла" });
        }

        // Получаем данные мерчанта
        const merchant = await db.merchant.findUnique({
          where: { id: session.merchantId },
        });

        if (!merchant) {
          return error(404, { error: "Мерчант не найден" });
        }

        // Получаем статистику мерчанта
        const [totalTransactions, successfulTransactions, totalVolume, methods] = await Promise.all([
          db.transaction.count({
            where: { merchantId: merchant.id },
          }),
          db.transaction.count({
            where: { merchantId: merchant.id, status: "READY" },
          }),
          db.transaction.aggregate({
            where: { merchantId: merchant.id, status: "READY" },
            _sum: { amount: true },
          }),
          db.merchantMethod.findMany({
            where: { merchantId: merchant.id, isEnabled: true },
            include: {
              method: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  type: true,
                  currency: true,
                  isEnabled: true,
                },
              },
            },
          }),
        ]);

        return {
          merchant: {
            id: merchant.id,
            name: merchant.name,
            balanceUsdt: merchant.balanceUsdt,
            countInRubEquivalent: merchant.countInRubEquivalent,
            createdAt: merchant.createdAt.toISOString(),
            statistics: {
              totalTransactions,
              successfulTransactions,
              successRate: totalTransactions > 0
                ? Math.round((successfulTransactions / totalTransactions) * 100)
                : 0,
              totalVolume: totalVolume._sum.amount || 0,
            },
            methods: methods.filter(mm => mm.method.isEnabled).map(mm => mm.method),
            totpEnabled: merchant.totpEnabled,
          },
          role: session.role,
          rights: session.rights,
        };
      },
      {
        tags: ["merchant-auth"],
        detail: { summary: "Получение текущего мерчанта" },
        headers: t.Object({
          authorization: t.String({ description: "Bearer токен сессии" }),
        }),
        response: {
          200: t.Object({
            merchant: t.Object({
              id: t.String(),
              name: t.String(),
              balanceUsdt: t.Number(),
              countInRubEquivalent: t.Boolean(),
              createdAt: t.String(),
              statistics: t.Object({
                totalTransactions: t.Number(),
                successfulTransactions: t.Number(),
                successRate: t.Number(),
                totalVolume: t.Number(),
              }),
              methods: t.Array(
                t.Object({
                  id: t.String(),
                  code: t.String(),
                  name: t.String(),
                  type: t.String(),
                  currency: t.String(),
                })
              ),
              totpEnabled: t.Boolean(),
            }),
            role: t.String(),
            rights: t.Record(t.String(), t.Boolean()),
          }),
          401: ErrorSchema,
          404: ErrorSchema,
        },
      },
    );