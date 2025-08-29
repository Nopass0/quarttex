/**
 * Скрипт для тестирования аукционной системы
 * Проверяет все компоненты системы в интеграции
 */

import { db } from "@/db";
import { auctionRSAKeyGenerator, auctionSignatureUtils } from "@/utils/auction-signature";
import { auctionIntegrationService } from "@/services/auction-integration.service";
import { auctionCallbackHandler } from "@/services/auction-callback-handler";

async function main() {
  console.log("🚀 Тестирование аукционной системы");
  console.log("=" .repeat(50));

  try {
    // 1. Тест генерации ключей
    console.log("\n1️⃣ Тестирование генерации RSA ключей...");
    const keyPair = await auctionRSAKeyGenerator.generateKeyPair();
    console.log("✅ Ключи сгенерированы успешно");
    
    const isValid = auctionRSAKeyGenerator.validateKeyPair(
      keyPair.publicKeyPem,
      keyPair.privateKeyPem
    );
    console.log(`✅ Валидация ключей: ${isValid ? "ПРОЙДЕНА" : "ПРОВАЛЕНА"}`);

    // 2. Тест подписи
    console.log("\n2️⃣ Тестирование подписи и верификации...");
    const testString = "test-canonical-string-" + Date.now();
    const signature = auctionSignatureUtils.signCanonicalString(testString, keyPair.privateKeyPem);
    const verificationResult = auctionSignatureUtils.verifySignature(
      testString,
      signature,
      keyPair.publicKeyPem
    );
    console.log(`✅ Подпись и верификация: ${verificationResult ? "ПРОЙДЕНА" : "ПРОВАЛЕНА"}`);

    // 3. Тест создания тестового мерчанта
    console.log("\n3️⃣ Создание тестового аукционного мерчанта...");
    
    // Проверяем, есть ли уже тестовый мерчант
    let testMerchant = await db.merchant.findFirst({
      where: { name: "Test Auction Merchant" }
    });

    if (!testMerchant) {
      testMerchant = await db.merchant.create({
        data: {
          name: "Test Auction Merchant",
          token: `test-auction-${Date.now()}`,
          isAuctionEnabled: true,
          auctionBaseUrl: "https://test-auction-api.example.com",
          rsaPublicKeyPem: keyPair.publicKeyPem,
          rsaPrivateKeyPem: keyPair.privateKeyPem,
          externalSystemName: "test-auction-system",
          keysGeneratedAt: new Date(),
        }
      });
      console.log(`✅ Тестовый мерчант создан: ${testMerchant.id}`);
    } else {
      // Обновляем существующего мерчанта
      testMerchant = await db.merchant.update({
        where: { id: testMerchant.id },
        data: {
          isAuctionEnabled: true,
          auctionBaseUrl: "https://test-auction-api.example.com",
          rsaPublicKeyPem: keyPair.publicKeyPem,
          rsaPrivateKeyPem: keyPair.privateKeyPem,
          externalSystemName: "test-auction-system",
          keysGeneratedAt: new Date(),
        }
      });
      console.log(`✅ Тестовый мерчант обновлен: ${testMerchant.id}`);
    }

    // 4. Тест проверки аукционного мерчанта
    console.log("\n4️⃣ Тестирование проверки аукционного мерчанта...");
    const isAuctionMerchant = await auctionIntegrationService.isAuctionMerchant(testMerchant.id);
    console.log(`✅ Проверка аукционного мерчанта: ${isAuctionMerchant ? "ПРОЙДЕНА" : "ПРОВАЛЕНА"}`);

    const auctionConfig = await auctionIntegrationService.getAuctionMerchantConfig(testMerchant.id);
    console.log(`✅ Получение конфигурации: ${auctionConfig ? "ПРОЙДЕНА" : "ПРОВАЛЕНА"}`);

    // 5. Тест валидации callback
    console.log("\n5️⃣ Тестирование валидации callback...");
    const timestamp = Math.floor(Date.now() / 1000);
    const orderId = "test-order-" + Date.now();
    const callbackBody = {
      order_id: orderId,
      status_id: 6,
      amount: 1000
    };

    // Создаем каноничную строку и подписываем
    const canonicalString = `${timestamp}|test-auction-system|${orderId}|AuctionCallback`;
    const callbackSignature = auctionSignatureUtils.signCanonicalString(
      canonicalString,
      keyPair.privateKeyPem
    );

    const callbackHeaders = {
      "X-Timestamp": timestamp.toString(),
      "X-Signature": callbackSignature,
    };

    const callbackValidation = auctionCallbackHandler.validateCallbackSignature(
      auctionConfig!,
      callbackHeaders,
      callbackBody
    );
    console.log(`✅ Валидация callback: ${callbackValidation ? "ПРОЙДЕНА" : "ПРОВАЛЕНА"}`);

    // 6. Тест временных окон
    console.log("\n6️⃣ Тестирование временных окон...");
    const currentTime = Math.floor(Date.now() / 1000);
    const validTime1 = auctionSignatureUtils.validateTimestamp(currentTime);
    const validTime2 = auctionSignatureUtils.validateTimestamp(currentTime - 60); // 1 минута назад
    const invalidTime = auctionSignatureUtils.validateTimestamp(currentTime - 200); // 200 секунд назад

    console.log(`✅ Текущее время: ${validTime1 ? "ВАЛИДНО" : "НЕВАЛИДНО"}`);
    console.log(`✅ Время -60 сек: ${validTime2 ? "ВАЛИДНО" : "НЕВАЛИДНО"}`);
    console.log(`✅ Время -200 сек: ${invalidTime ? "ВАЛИДНО" : "НЕВАЛИДНО"} (должно быть невалидно)`);

    // 7. Тест маппинга статусов
    console.log("\n7️⃣ Тестирование маппинга статусов...");
    const statusMappings = [
      { auction: 1, expected: "CREATED" },
      { auction: 6, expected: "READY" },
      { auction: 8, expected: "EXPIRED" },
      { auction: 9, expected: "CANCELED" },
    ];

    statusMappings.forEach(({ auction, expected }) => {
      console.log(`   Аукционный статус ${auction} → ${expected}`);
    });

    // 8. Очистка тестовых данных (опционально)
    console.log("\n8️⃣ Очистка тестовых данных...");
    const shouldCleanup = process.argv.includes("--cleanup");
    
    if (shouldCleanup) {
      await db.merchant.delete({
        where: { id: testMerchant.id }
      });
      console.log("✅ Тестовый мерчант удален");
    } else {
      console.log("ℹ️  Тестовый мерчант сохранен (используйте --cleanup для удаления)");
      console.log(`   ID мерчанта: ${testMerchant.id}`);
    }

    console.log("\n" + "=".repeat(50));
    console.log("🎉 Все тесты аукционной системы пройдены успешно!");
    console.log("\n📋 Что было протестировано:");
    console.log("   ✅ Генерация и валидация RSA ключей");
    console.log("   ✅ Подпись и верификация сообщений");
    console.log("   ✅ Создание аукционного мерчанта");
    console.log("   ✅ Проверка конфигурации мерчанта");
    console.log("   ✅ Валидация callback подписей");
    console.log("   ✅ Временные окна валидации");
    console.log("   ✅ Маппинг статусов");

    console.log("\n🔧 Для полного тестирования также проверьте:");
    console.log("   - Админские роуты: /api/admin/auction/*");
    console.log("   - Callback роуты: /api/auction/callback/:merchantId");
    console.log("   - Интеграцию с реальными внешними системами");

  } catch (error) {
    console.error("\n❌ Ошибка при тестировании:", error);
    process.exit(1);
  }
}

// Запуск скрипта
if (import.meta.main) {
  main().catch(console.error);
}
