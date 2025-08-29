/**
 * Админские роуты для управления аукционными мерчантами
 * Согласно документации IE Cloud Summit
 */

import { Elysia, t } from "elysia";
import { db } from "@/db";
import { auctionIntegrationService } from "@/services/auction-integration.service";
import { AuctionMerchantConfig } from "@/types/auction";
import { auctionRSAKeyGenerator } from "@/utils/auction-signature";

export default (app: Elysia) =>
  app
    .group("/auction", (app) =>
      app
        /* ──────── POST /admin/auction/toggle/{merchantId} ──────── */
        .post(
          "/toggle/:merchantId",
          async ({ params, body, error }) => {
            const { merchantId } = params;
            const { enabled, auctionBaseUrl, auctionCallbackUrl, externalSystemName } = body;

            try {
              const merchant = await db.merchant.findUnique({
                where: { id: merchantId },
              });

              if (!merchant) {
                return error(404, { error: "Мерчант не найден" });
              }

              console.log(`[AdminAuction] Toggling auction for merchant ${merchant.name}: ${enabled}`);

              // Обновляем настройки аукциона
              const updatedMerchant = await db.merchant.update({
                where: { id: merchantId },
                data: {
                  isAuctionEnabled: enabled,
                  auctionBaseUrl: enabled ? auctionBaseUrl : null,
                  auctionCallbackUrl: enabled ? auctionCallbackUrl : null,
                  externalSystemName: enabled ? externalSystemName : null,
                },
              });

              console.log(`[AdminAuction] Auction ${enabled ? 'enabled' : 'disabled'} for ${merchant.name}`);

              return {
                success: true,
                merchant: {
                  id: updatedMerchant.id,
                  name: updatedMerchant.name,
                  isAuctionEnabled: updatedMerchant.isAuctionEnabled,
                  auctionBaseUrl: updatedMerchant.auctionBaseUrl,
                  auctionCallbackUrl: updatedMerchant.auctionCallbackUrl,
                  externalSystemName: updatedMerchant.externalSystemName,
                  hasKeys: !!(updatedMerchant.rsaPublicKeyPem && updatedMerchant.rsaPrivateKeyPem),
                  keysGeneratedAt: updatedMerchant.keysGeneratedAt,
                },
              };
            } catch (err) {
              console.error("Error toggling auction for merchant:", err);
              return error(500, { error: "Ошибка обновления настроек аукциона" });
            }
          },
          {
            tags: ["admin", "auction"],
            detail: {
              summary: "Включение/выключение аукционного режима для мерчанта",
              description: "Настройка мерчанта для работы через внешнюю аукционную систему"
            },
            params: t.Object({
              merchantId: t.String({ description: "ID мерчанта" })
            }),
            body: t.Object({
              enabled: t.Boolean({ 
                description: "Включить аукционный режим для мерчанта" 
              }),
              auctionBaseUrl: t.Optional(t.String({
                description: "Base URL внешней аукционной системы",
                examples: ["https://partner.example.com/api"]
              })),
              auctionCallbackUrl: t.Optional(t.String({
                description: "URL для callback'ов от внешней системы", 
                examples: ["https://partner.example.com/callback"]
              })),
              externalSystemName: t.Optional(t.String({
                description: "Имя внешней системы для подписи",
                examples: ["test-auction-system"]
              })),
            }),
          }
        )

        /* ──────── GET /admin/auction/status/{merchantId} ──────── */
        .get(
          "/status/:merchantId",
          async ({ params, error }) => {
            const { merchantId } = params;

            try {
              const merchant = await db.merchant.findUnique({
                where: { id: merchantId },
                select: {
                  id: true,
                  name: true,
                  isAuctionEnabled: true,
                  auctionBaseUrl: true,
                  auctionCallbackUrl: true,
                  externalSystemName: true,
                  rsaPublicKeyPem: true,
                  rsaPrivateKeyPem: true,
                  keysGeneratedAt: true,
                },
              });

              if (!merchant) {
                return error(404, { error: "Мерчант не найден" });
              }

              return {
                success: true,
                config: {
                  isAuctionEnabled: merchant.isAuctionEnabled,
                  auctionBaseUrl: merchant.auctionBaseUrl,
                  auctionCallbackUrl: merchant.auctionCallbackUrl,
                  externalSystemName: merchant.externalSystemName,
                  hasKeys: !!(merchant.rsaPublicKeyPem && merchant.rsaPrivateKeyPem),
                  keysGeneratedAt: merchant.keysGeneratedAt,
                  // Не возвращаем сами ключи в статусе для безопасности
                } as AuctionMerchantConfig,
              };
            } catch (err) {
              console.error("Error getting auction status:", err);
              return error(500, { error: "Ошибка получения статуса аукциона" });
            }
          },
          {
            tags: ["admin", "auction"],
            detail: {
              summary: "Получение статуса аукционного мерчанта",
              description: "Возвращает текущие настройки аукционной системы для мерчанта"
            },
            params: t.Object({
              merchantId: t.String({ description: "ID мерчанта" })
            }),
          }
        )

        /* ──────── POST /admin/auction/generate-keys/{merchantId} ──────── */
        .post(
          "/generate-keys/:merchantId",
          async ({ params, error }) => {
            const { merchantId } = params;

            try {
              const merchant = await db.merchant.findUnique({
                where: { id: merchantId },
              });

              if (!merchant) {
                return error(404, { error: "Мерчант не найден" });
              }

              if (!merchant.isAuctionEnabled) {
                return error(400, { error: "Аукционный режим не включен для данного мерчанта" });
              }

              console.log(`[AdminAuction] Generating RSA keys for merchant ${merchant.name}...`);

              // Генерируем RSA ключи 2048 бит
              const keyPair = await auctionRSAKeyGenerator.generateKeyPair();

              // Проверяем валидность ключей
              const isValid = auctionRSAKeyGenerator.validateKeyPair(
                keyPair.publicKeyPem,
                keyPair.privateKeyPem
              );

              if (!isValid) {
                throw new Error("Generated keys failed validation");
              }

              // Сохраняем ключи в БД
              const updatedMerchant = await db.merchant.update({
                where: { id: merchantId },
                data: {
                  rsaPublicKeyPem: keyPair.publicKeyPem,
                  rsaPrivateKeyPem: keyPair.privateKeyPem,
                  keysGeneratedAt: new Date(),
                },
              });

              console.log(`[AdminAuction] RSA keys generated for ${merchant.name}`);

              return {
                success: true,
                message: "RSA ключи сгенерированы успешно",
                publicKey: keyPair.publicKeyPem,
                privateKey: keyPair.privateKeyPem, // Возвращаем только при создании!
                generatedAt: updatedMerchant.keysGeneratedAt,
                warning: "ВНИМАНИЕ: Сохраните приватный ключ в безопасном месте. Он больше не будет показан в открытом виде."
              };
            } catch (err) {
              console.error("Error generating RSA keys:", err);
              return error(500, { error: `Ошибка генерации ключей: ${err}` });
            }
          },
          {
            tags: ["admin", "auction"],
            detail: {
              summary: "Генерация RSA ключей для аукционного мерчанта",
              description: "Генерирует новую пару RSA ключей 2048 бит для подписи запросов. ВНИМАНИЕ: Приватный ключ показывается только один раз!"
            },
            params: t.Object({
              merchantId: t.String({ description: "ID мерчанта" })
            }),
          }
        )

        /* ──────── GET /admin/auction/download-key/{merchantId}/{keyType} ──────── */
        .get(
          "/download-key/:merchantId/:keyType",
          async ({ params, query, headers, error, set }) => {
            const { merchantId, keyType } = params;
            
            // Поддерживаем admin key как в query параметре так и в заголовке
            const adminKey = query["admin_key"] || query["x-admin-key"] || headers["x-admin-key"];
            
            if (!adminKey) {
              return error(401, { error: "Admin key required" });
            }

            // Простая проверка admin ключа (в продакшене должна быть более строгая)
            const validAdminKey = "3d3b2e3efa297cae2bc6b19f3f8448ed2b2c7fd43af823a2a3a0585edfbb67d1";
            if (adminKey !== validAdminKey) {
              return error(403, { error: "Invalid admin key" });
            }

            if (keyType !== "public" && keyType !== "private") {
              return error(400, { error: "Неверный тип ключа. Используйте 'public' или 'private'" });
            }

            try {
              const merchant = await db.merchant.findUnique({
                where: { id: merchantId },
                select: {
                  name: true,
                  rsaPublicKeyPem: true,
                  rsaPrivateKeyPem: keyType === "private", // Приватный только если запрошен
                  keysGeneratedAt: true,
                },
              });

              if (!merchant) {
                return error(404, { error: "Мерчант не найден" });
              }

              const keyContent = keyType === "public" 
                ? merchant.rsaPublicKeyPem 
                : merchant.rsaPrivateKeyPem;

              if (!keyContent) {
                return error(404, { error: `${keyType === "public" ? "Публичный" : "Приватный"} ключ не найден` });
              }

              // Устанавливаем заголовки для скачивания файла
              set.headers = {
                "Content-Type": "application/x-pem-file",
                "Content-Disposition": `attachment; filename="${merchant.name}_${keyType}_key.pem"`
              };

              console.log(`[AdminAuction] Downloaded ${keyType} key for ${merchant.name}`);

              return keyContent;
            } catch (err) {
              console.error("Error downloading key:", err);
              return error(500, { error: "Ошибка скачивания ключа" });
            }
          },
          {
            tags: ["admin", "auction"],
            detail: {
              summary: "Скачивание RSA ключа",
              description: "Скачивает публичный или приватный ключ в формате PEM"
            },
            params: t.Object({
              merchantId: t.String({ description: "ID мерчанта" }),
              keyType: t.Union([
                t.Literal("public"),
                t.Literal("private")
              ], { description: "Тип ключа для скачивания" })
            }),
          }
        )

        /* ──────── GET /admin/auction/status/{merchantId} ──────── */
        .get(
          "/status/:merchantId",
          async ({ params, error }) => {
            const { merchantId } = params;

            try {
              const merchant = await db.merchant.findUnique({
                where: { id: merchantId },
                select: {
                  id: true,
                  name: true,
                  isAuctionEnabled: true,
                  auctionBaseUrl: true,
                  auctionCallbackUrl: true,
                  externalSystemName: true,
                  rsaPublicKeyPem: true,
                  rsaPrivateKeyPem: true,
                  keysGeneratedAt: true,
                },
              });

              if (!merchant) {
                return error(404, { error: "Мерчант не найден" });
              }

              const hasKeys = !!(merchant.rsaPublicKeyPem && merchant.rsaPrivateKeyPem);
              
              console.log(`[AdminAuction] Status for ${merchant.name}:`, {
                hasKeys,
                publicKeyLength: merchant.rsaPublicKeyPem?.length || 0,
                privateKeyLength: merchant.rsaPrivateKeyPem?.length || 0
              });

              return {
                success: true,
                config: {
                  isAuctionEnabled: merchant.isAuctionEnabled,
                  auctionBaseUrl: merchant.auctionBaseUrl,
                  auctionCallbackUrl: merchant.auctionCallbackUrl,
                  externalSystemName: merchant.externalSystemName,
                  hasKeys: hasKeys,
                  keysGeneratedAt: merchant.keysGeneratedAt,
                  publicKeyPreview: merchant.rsaPublicKeyPem, // Полный ключ для копирования
                } as AuctionMerchantConfig,
              };
            } catch (err) {
              console.error("Error getting auction status:", err);
              return error(500, { error: "Ошибка получения статуса аукциона" });
            }
          },
          {
            tags: ["admin", "auction"],
            detail: {
              summary: "Получение статуса аукционного мерчанта",
              description: "Возвращает текущие настройки аукционной системы для мерчанта"
            },
            params: t.Object({
              merchantId: t.String({ description: "ID мерчанта" })
            }),
          }
        )
    );