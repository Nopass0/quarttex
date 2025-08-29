/**
 * Админские роуты для управления аукционной системой
 */

import { Elysia, t } from "elysia";
import { db } from "@/db";
import { auctionRSAKeyGenerator } from "@/utils/auction-signature";
import ErrorSchema from "@/types/error";

const authHeader = t.Object({ "x-admin-key": t.String() });

export default (app: Elysia) =>
  app
    /* ───────── POST /admin/auction/generate-keys/{merchantId} ───────── */
    .post(
      "/generate-keys/:merchantId",
      async ({ params, error }) => {
        try {
          const { merchantId } = params;

          // Проверяем, что мерчант существует
          const merchant = await db.merchant.findUnique({
            where: { id: merchantId },
            select: { id: true, name: true, isAuctionEnabled: true },
          });

          if (!merchant) {
            return error(404, { error: "Мерчант не найден" });
          }

          if (!merchant.isAuctionEnabled) {
            return error(400, { error: "Аукционная система не включена для этого мерчанта" });
          }

          // Генерируем новую пару ключей
          console.log(`[AuctionAdmin] Генерация RSA ключей для мерчанта ${merchant.name} (${merchantId})`);
          const keyPair = await auctionRSAKeyGenerator.generateKeyPair();

          // Проверяем валидность сгенерированных ключей
          const isValid = auctionRSAKeyGenerator.validateKeyPair(
            keyPair.publicKeyPem,
            keyPair.privateKeyPem
          );

          if (!isValid) {
            console.error(`[AuctionAdmin] Сгенерированные ключи невалидны для мерчанта ${merchantId}`);
            return error(500, { error: "Ошибка генерации ключей - ключи невалидны" });
          }

          // Сохраняем ключи в базу данных
          const updatedMerchant = await db.merchant.update({
            where: { id: merchantId },
            data: {
              rsaPublicKeyPem: keyPair.publicKeyPem,
              rsaPrivateKeyPem: keyPair.privateKeyPem,
              keysGeneratedAt: new Date(),
            },
            select: {
              id: true,
              name: true,
              rsaPublicKeyPem: true,
              keysGeneratedAt: true,
            },
          });

          console.log(`[AuctionAdmin] RSA ключи успешно сгенерированы для мерчанта ${merchant.name}`);

          return {
            success: true,
            message: "RSA ключи успешно сгенерированы",
            merchant: {
              id: updatedMerchant.id,
              name: updatedMerchant.name,
              keysGeneratedAt: updatedMerchant.keysGeneratedAt?.toISOString(),
            },
            publicKey: updatedMerchant.rsaPublicKeyPem,
            // Приватный ключ возвращаем только один раз при генерации
            privateKey: keyPair.privateKeyPem,
            warning: "Приватный ключ показан только один раз. Сохраните его в безопасном месте.",
          };
        } catch (err) {
          console.error(`[AuctionAdmin] Ошибка генерации ключей:`, err);
          return error(500, { error: "Внутренняя ошибка при генерации ключей" });
        }
      },
      {
        tags: ["admin", "auction"],
        detail: { 
          summary: "Генерация RSA ключей для аукционного мерчанта",
          description: "Генерирует новую пару RSA ключей (2048 бит) для мерчанта с включенной аукционной системой"
        },
        headers: authHeader,
        params: t.Object({
          merchantId: t.String({ description: "ID мерчанта" })
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            message: t.String(),
            merchant: t.Object({
              id: t.String(),
              name: t.String(),
              keysGeneratedAt: t.Nullable(t.String()),
            }),
            publicKey: t.String(),
            privateKey: t.String(),
            warning: t.String(),
          }),
          400: ErrorSchema,
          404: ErrorSchema,
          500: ErrorSchema,
        },
      }
    )

    /* ───────── GET /admin/auction/download-key/{merchantId}/{keyType} ───────── */
    .get(
      "/download-key/:merchantId/:keyType",
      async ({ params, error, set }) => {
        try {
          const { merchantId, keyType } = params;

          if (!["public", "private"].includes(keyType)) {
            return error(400, { error: "Тип ключа должен быть 'public' или 'private'" });
          }

          const merchant = await db.merchant.findUnique({
            where: { id: merchantId },
            select: {
              id: true,
              name: true,
              isAuctionEnabled: true,
              rsaPublicKeyPem: true,
              rsaPrivateKeyPem: true,
            },
          });

          if (!merchant) {
            return error(404, { error: "Мерчант не найден" });
          }

          if (!merchant.isAuctionEnabled) {
            return error(400, { error: "Аукционная система не включена для этого мерчанта" });
          }

          const keyContent = keyType === "public" 
            ? merchant.rsaPublicKeyPem 
            : merchant.rsaPrivateKeyPem;

          if (!keyContent) {
            return error(404, { error: `${keyType === "public" ? "Публичный" : "Приватный"} ключ не найден` });
          }

          // Устанавливаем заголовки для скачивания файла
          const filename = `${merchant.name.replace(/[^a-zA-Z0-9]/g, "_")}_${keyType}_key.pem`;
          set.headers["Content-Type"] = "application/x-pem-file";
          set.headers["Content-Disposition"] = `attachment; filename="${filename}"`;

          return keyContent;
        } catch (err) {
          console.error(`[AuctionAdmin] Ошибка скачивания ключа:`, err);
          return error(500, { error: "Внутренняя ошибка при скачивании ключа" });
        }
      },
      {
        tags: ["admin", "auction"],
        detail: { 
          summary: "Скачивание RSA ключа",
          description: "Скачивает публичный или приватный RSA ключ мерчанта в формате PEM"
        },
        headers: authHeader,
        params: t.Object({
          merchantId: t.String({ description: "ID мерчанта" }),
          keyType: t.Union([t.Literal("public"), t.Literal("private")], { 
            description: "Тип ключа для скачивания" 
          })
        }),
        response: {
          200: t.String({ description: "Содержимое PEM файла" }),
          400: ErrorSchema,
          404: ErrorSchema,
          500: ErrorSchema,
        },
      }
    )

    /* ───────── PUT /admin/auction/toggle/{merchantId} ───────── */
    .put(
      "/toggle/:merchantId",
      async ({ params, body, error }) => {
        try {
          const { merchantId } = params;

          const merchant = await db.merchant.findUnique({
            where: { id: merchantId },
            select: { id: true, name: true, isAuctionEnabled: true },
          });

          if (!merchant) {
            return error(404, { error: "Мерчант не найден" });
          }

          const updatedMerchant = await db.merchant.update({
            where: { id: merchantId },
            data: {
              isAuctionEnabled: body.isAuctionEnabled,
              auctionBaseUrl: body.auctionBaseUrl || null,
              externalSystemName: body.externalSystemName || null,
            },
            select: {
              id: true,
              name: true,
              isAuctionEnabled: true,
              auctionBaseUrl: true,
              externalSystemName: true,
              keysGeneratedAt: true,
            },
          });

          console.log(`[AuctionAdmin] Аукционная система ${body.isAuctionEnabled ? "включена" : "отключена"} для мерчанта ${merchant.name}`);

          return {
            success: true,
            message: `Аукционная система ${body.isAuctionEnabled ? "включена" : "отключена"}`,
            merchant: {
              ...updatedMerchant,
              keysGeneratedAt: updatedMerchant.keysGeneratedAt?.toISOString(),
            },
          };
        } catch (err) {
          console.error(`[AuctionAdmin] Ошибка переключения аукционной системы:`, err);
          return error(500, { error: "Внутренняя ошибка при изменении настроек" });
        }
      },
      {
        tags: ["admin", "auction"],
        detail: { 
          summary: "Включение/отключение аукционной системы",
          description: "Включает или отключает аукционную систему для мерчанта и устанавливает базовые настройки"
        },
        headers: authHeader,
        params: t.Object({
          merchantId: t.String({ description: "ID мерчанта" })
        }),
        body: t.Object({
          isAuctionEnabled: t.Boolean({ description: "Включить аукционную систему" }),
          auctionBaseUrl: t.Optional(t.String({ description: "URL для отправки callback'ов внешней системе" })),
          externalSystemName: t.Optional(t.String({ description: "Имя внешней системы для подписи" })),
        }),
        response: {
          200: t.Object({
            success: t.Boolean(),
            message: t.String(),
            merchant: t.Object({
              id: t.String(),
              name: t.String(),
              isAuctionEnabled: t.Boolean(),
              auctionBaseUrl: t.Nullable(t.String()),
              externalSystemName: t.Nullable(t.String()),
              keysGeneratedAt: t.Nullable(t.String()),
            }),
          }),
          404: ErrorSchema,
          500: ErrorSchema,
        },
      }
    )

    /* ───────── GET /admin/auction/status/{merchantId} ───────── */
    .get(
      "/status/:merchantId",
      async ({ params, error }) => {
        try {
          const { merchantId } = params;

          const merchant = await db.merchant.findUnique({
            where: { id: merchantId },
            select: {
              id: true,
              name: true,
              isAuctionEnabled: true,
              auctionBaseUrl: true,
              externalSystemName: true,
              keysGeneratedAt: true,
              rsaPublicKeyPem: true,
              rsaPrivateKeyPem: true,
            },
          });

          if (!merchant) {
            return error(404, { error: "Мерчант не найден" });
          }

          const hasKeys = !!(merchant.rsaPublicKeyPem && merchant.rsaPrivateKeyPem);
          const isFullyConfigured = !!(merchant.isAuctionEnabled && 
            hasKeys && 
            merchant.auctionBaseUrl && 
            merchant.externalSystemName);

          return {
            merchant: {
              id: merchant.id,
              name: merchant.name,
              isAuctionEnabled: merchant.isAuctionEnabled,
              auctionBaseUrl: merchant.auctionBaseUrl,
              externalSystemName: merchant.externalSystemName,
              keysGeneratedAt: merchant.keysGeneratedAt?.toISOString(),
            },
            status: {
              hasKeys,
              isFullyConfigured,
              configurationSteps: {
                auctionEnabled: merchant.isAuctionEnabled,
                baseUrlSet: !!merchant.auctionBaseUrl,
                systemNameSet: !!merchant.externalSystemName,
                keysGenerated: hasKeys,
              },
            },
          };
        } catch (err) {
          console.error(`[AuctionAdmin] Ошибка получения статуса:`, err);
          return error(500, { error: "Внутренняя ошибка при получении статуса" });
        }
      },
      {
        tags: ["admin", "auction"],
        detail: { 
          summary: "Получение статуса аукционной системы",
          description: "Возвращает текущий статус и конфигурацию аукционной системы для мерчанта"
        },
        headers: authHeader,
        params: t.Object({
          merchantId: t.String({ description: "ID мерчанта" })
        }),
        response: {
          200: t.Object({
            merchant: t.Object({
              id: t.String(),
              name: t.String(),
              isAuctionEnabled: t.Boolean(),
              auctionBaseUrl: t.Nullable(t.String()),
              externalSystemName: t.Nullable(t.String()),
              keysGeneratedAt: t.Nullable(t.String()),
            }),
            status: t.Object({
              hasKeys: t.Boolean(),
              isFullyConfigured: t.Boolean(),
              configurationSteps: t.Object({
                auctionEnabled: t.Boolean(),
                baseUrlSet: t.Boolean(),
                systemNameSet: t.Boolean(),
                keysGenerated: t.Boolean(),
              }),
            }),
          }),
          404: ErrorSchema,
          500: ErrorSchema,
        },
      }
    );
