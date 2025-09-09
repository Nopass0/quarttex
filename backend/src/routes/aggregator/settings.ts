import { Elysia, t } from "elysia";
import { db } from "@/db";
import ErrorSchema from "@/types/error";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { authenticator } from "otplib";
import QRCode from "qrcode";

/**
 * Настройки агрегатора
 */
export default (app: Elysia) =>
  app
    /* ──────── GET /aggregator/settings/profile ──────── */
    .get(
      "/profile",
      async ({ aggregator }) => {
        // Используем кастомный токен если он задан, иначе сгенерированный
        const effectiveApiToken = aggregator.customApiToken || aggregator.apiToken;
        
        return {
          id: aggregator.id,
          email: aggregator.email,
          name: aggregator.name,
          apiToken: effectiveApiToken,
          customApiToken: aggregator.customApiToken,
          generatedApiToken: aggregator.apiToken,
          callbackToken: aggregator.callbackToken,
          apiBaseUrl: aggregator.apiBaseUrl,
          balanceUsdt: aggregator.balanceUsdt,
          twoFactorEnabled: aggregator.twoFactorEnabled,
          isActive: aggregator.isActive,
          createdAt: aggregator.createdAt.toISOString(),
          updatedAt: aggregator.updatedAt.toISOString()
        };
      },
      {
        tags: ["aggregator-settings"],
        detail: { summary: "Профиль агрегатора" },
        response: {
          200: t.Object({
            id: t.String(),
            email: t.String(),
            name: t.String(),
            apiToken: t.String(),
            customApiToken: t.Union([t.String(), t.Null()]),
            generatedApiToken: t.String(),
            callbackToken: t.String(),
            apiBaseUrl: t.Union([t.String(), t.Null()]),
            balanceUsdt: t.Number(),
            twoFactorEnabled: t.Boolean(),
            isActive: t.Boolean(),
            createdAt: t.String(),
            updatedAt: t.String()
          })
        }
      }
    )

    /* ──────── PATCH /aggregator/settings/profile ──────── */
    .patch(
      "/profile",
      async ({ aggregator, body, error }) => {
        try {
          const updateData: any = {};

          if (body.name) updateData.name = body.name;
          if (body.apiBaseUrl !== undefined) updateData.apiBaseUrl = body.apiBaseUrl;
          if (body.customApiToken !== undefined) updateData.customApiToken = body.customApiToken;

          const updatedAggregator = await db.aggregator.update({
            where: { id: aggregator.id },
            data: updateData
          });

          return {
            success: true,
            aggregator: {
              id: updatedAggregator.id,
              email: updatedAggregator.email,
              name: updatedAggregator.name,
              apiBaseUrl: updatedAggregator.apiBaseUrl,
              customApiToken: updatedAggregator.customApiToken,
              updatedAt: updatedAggregator.updatedAt.toISOString()
            }
          };
        } catch (e) {
          console.error('Error updating profile:', e);
          return error(500, { error: "Ошибка обновления профиля" });
        }
      },
      {
        tags: ["aggregator-settings"],
        detail: { summary: "Обновление профиля агрегатора" },
        body: t.Object({
          name: t.Optional(t.String()),
          apiBaseUrl: t.Optional(t.Union([t.String(), t.Null()])),
          customApiToken: t.Optional(t.Union([t.String(), t.Null()]))
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            aggregator: t.Object({
              id: t.String(),
              email: t.String(),
              name: t.String(),
              apiBaseUrl: t.Union([t.String(), t.Null()]),
              customApiToken: t.Union([t.String(), t.Null()]),
              updatedAt: t.String()
            })
          }),
          500: ErrorSchema
        }
      }
    )

    /* ──────── POST /aggregator/settings/change-password ──────── */
    .post(
      "/change-password",
      async ({ aggregator, body, error }) => {
        const { currentPassword, newPassword } = body;

        // Проверяем текущий пароль
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, aggregator.password);
        if (!isCurrentPasswordValid) {
          return error(401, { error: "Неверный текущий пароль" });
        }

        // Проверяем новый пароль
        if (newPassword.length < 8) {
          return error(400, { error: "Новый пароль должен содержать минимум 8 символов" });
        }

        try {
          // Хешируем новый пароль
          const hashedPassword = await bcrypt.hash(newPassword, 10);

          // Обновляем пароль в базе
          await db.aggregator.update({
            where: { id: aggregator.id },
            data: { password: hashedPassword }
          });

          // Удаляем все активные сессии (кроме текущей)
          await db.aggregatorSession.deleteMany({
            where: { 
              aggregatorId: aggregator.id 
              // TODO: исключить текущую сессию
            }
          });

          return { 
            success: true, 
            message: "Пароль успешно изменен. Все сессии завершены." 
          };
        } catch (e) {
          console.error('Error changing password:', e);
          return error(500, { error: "Ошибка изменения пароля" });
        }
      },
      {
        tags: ["aggregator-settings"],
        detail: { summary: "Изменение пароля агрегатора" },
        body: t.Object({
          currentPassword: t.String(),
          newPassword: t.String({ minLength: 8 })
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            message: t.String()
          }),
          400: ErrorSchema,
          401: ErrorSchema,
          500: ErrorSchema
        }
      }
    )

    /* ──────── POST /aggregator/settings/regenerate-token ──────── */
    .post(
      "/regenerate-token",
      async ({ aggregator, error }) => {
        try {
          const newToken = crypto.randomBytes(32).toString('hex');

          const updatedAggregator = await db.aggregator.update({
            where: { id: aggregator.id },
            data: { apiToken: newToken }
          });

          return {
            success: true,
            newToken: updatedAggregator.apiToken,
            message: "API токен успешно перегенерирован"
          };
        } catch (e) {
          console.error('Error regenerating token:', e);
          return error(500, { error: "Ошибка перегенерации токена" });
        }
      },
      {
        tags: ["aggregator-settings"],
        detail: { summary: "Перегенерация API токена" },
        response: {
          200: t.Object({
            success: t.Boolean(),
            newToken: t.String(),
            message: t.String()
          }),
          500: ErrorSchema
        }
      }
    )

    /* ──────── GET /aggregator/settings/2fa/setup ──────── */
    .get(
      "/2fa/setup",
      async ({ aggregator, error }) => {
        if (aggregator.twoFactorEnabled) {
          return error(400, { error: "2FA уже настроен" });
        }

        try {
          // Генерируем секрет для 2FA
          const secret = authenticator.generateSecret();
          const serviceName = "Payment Platform";
          const accountName = aggregator.email;
          
          // Создаем otpauth URL
          const otpauthUrl = authenticator.keyuri(accountName, serviceName, secret);
          
          // Генерируем QR код
          const qrCodeDataURL = await QRCode.toDataURL(otpauthUrl);

          // Временно сохраняем секрет (не активируем 2FA)
          await db.systemConfig.upsert({
            where: { key: `aggregator_2fa_setup_${aggregator.id}` },
            update: { value: secret },
            create: {
              key: `aggregator_2fa_setup_${aggregator.id}`,
              value: secret
            }
          });

          return {
            secret,
            qrCodeDataURL,
            manualEntryKey: secret,
            serviceName,
            accountName
          };
        } catch (e) {
          console.error('Error setting up 2FA:', e);
          return error(500, { error: "Ошибка настройки 2FA" });
        }
      },
      {
        tags: ["aggregator-settings"],
        detail: { summary: "Настройка двухфакторной аутентификации" },
        response: {
          200: t.Object({
            secret: t.String(),
            qrCodeDataURL: t.String(),
            manualEntryKey: t.String(),
            serviceName: t.String(),
            accountName: t.String()
          }),
          400: ErrorSchema,
          500: ErrorSchema
        }
      }
    )

    /* ──────── POST /aggregator/settings/2fa/verify ──────── */
    .post(
      "/2fa/verify",
      async ({ aggregator, body, error }) => {
        const { code } = body;

        if (aggregator.twoFactorEnabled) {
          return error(400, { error: "2FA уже активирован" });
        }

        try {
          // Получаем временный секрет
          const setupConfig = await db.systemConfig.findUnique({
            where: { key: `aggregator_2fa_setup_${aggregator.id}` }
          });

          if (!setupConfig) {
            return error(400, { error: "Сначала инициализируйте настройку 2FA" });
          }

          const secret = setupConfig.value;

          // Проверяем код
          const isValid = authenticator.verify({ token: code, secret });
          if (!isValid) {
            return error(401, { error: "Неверный код" });
          }

          // Активируем 2FA
          await db.aggregator.update({
            where: { id: aggregator.id },
            data: {
              twoFactorEnabled: true,
              twoFactorSecret: secret
            }
          });

          // Удаляем временную настройку
          await db.systemConfig.delete({
            where: { key: `aggregator_2fa_setup_${aggregator.id}` }
          });

          return {
            success: true,
            message: "2FA успешно активирован"
          };
        } catch (e) {
          console.error('Error verifying 2FA:', e);
          return error(500, { error: "Ошибка активации 2FA" });
        }
      },
      {
        tags: ["aggregator-settings"],
        detail: { summary: "Активация двухфакторной аутентификации" },
        body: t.Object({
          code: t.String({ minLength: 6, maxLength: 6 })
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            message: t.String()
          }),
          400: ErrorSchema,
          401: ErrorSchema,
          500: ErrorSchema
        }
      }
    )

    /* ──────── POST /aggregator/settings/2fa/disable ──────── */
    .post(
      "/2fa/disable",
      async ({ aggregator, body, error }) => {
        const { code } = body;

        if (!aggregator.twoFactorEnabled || !aggregator.twoFactorSecret) {
          return error(400, { error: "2FA не активирован" });
        }

        // Проверяем код
        const isValid = authenticator.verify({ 
          token: code, 
          secret: aggregator.twoFactorSecret 
        });
        
        if (!isValid) {
          return error(401, { error: "Неверный код" });
        }

        try {
          // Отключаем 2FA
          await db.aggregator.update({
            where: { id: aggregator.id },
            data: {
              twoFactorEnabled: false,
              twoFactorSecret: null
            }
          });

          return {
            success: true,
            message: "2FA успешно отключен"
          };
        } catch (e) {
          console.error('Error disabling 2FA:', e);
          return error(500, { error: "Ошибка отключения 2FA" });
        }
      },
      {
        tags: ["aggregator-settings"],
        detail: { summary: "Отключение двухфакторной аутентификации" },
        body: t.Object({
          code: t.String({ minLength: 6, maxLength: 6 })
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            message: t.String()
          }),
          400: ErrorSchema,
          401: ErrorSchema,
          500: ErrorSchema
        }
      }
    )

    /* ──────── GET /aggregator/settings/sessions ──────── */
    .get(
      "/sessions",
      async ({ aggregator }) => {
        const sessions = await db.aggregatorSession.findMany({
          where: { aggregatorId: aggregator.id },
          orderBy: { createdAt: "desc" }
        });

        return {
          sessions: sessions.map(session => ({
            id: session.id,
            ip: session.ip,
            userAgent: session.userAgent,
            createdAt: session.createdAt.toISOString(),
            expiresAt: session.expiresAt.toISOString(),
            isExpired: session.expiresAt < new Date()
          }))
        };
      },
      {
        tags: ["aggregator-settings"],
        detail: { summary: "Список активных сессий" },
        response: {
          200: t.Object({
            sessions: t.Array(
              t.Object({
                id: t.String(),
                ip: t.String(),
                userAgent: t.Optional(t.String()),
                createdAt: t.String(),
                expiresAt: t.String(),
                isExpired: t.Boolean()
              })
            )
          })
        }
      }
    )

    /* ──────── DELETE /aggregator/settings/sessions/:sessionId ──────── */
    .delete(
      "/sessions/:sessionId",
      async ({ aggregator, params, error }) => {
        try {
          await db.aggregatorSession.delete({
            where: { 
              id: params.sessionId,
              aggregatorId: aggregator.id 
            }
          });

          return {
            success: true,
            message: "Сессия завершена"
          };
        } catch (e) {
          return error(404, { error: "Сессия не найдена" });
        }
      },
      {
        tags: ["aggregator-settings"],
        detail: { summary: "Завершение сессии" },
        params: t.Object({ sessionId: t.String() }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            message: t.String()
          }),
          404: ErrorSchema
        }
      }
    );