#!/usr/bin/env bun
/**
 * Тестовый скрипт для проверки маршрутизации сделок через PSPWare агрегаторов
 * когда у мерчанта нет подходящих трейдеров
 */

import { db } from "@/db";
import { AggregatorApiSchema, PSPWareRandomizationType } from "@prisma/client";
import axios from "axios";

const API_URL = process.env.API_URL || "http://localhost:3000/api";

async function testPSPWareRouting() {
  console.log("🔍 Тестирование маршрутизации через PSPWare агрегаторов...\n");

  try {
    // 1. Находим или создаем тестового мерчанта
    console.log("1️⃣ Настройка тестового мерчанта...");
    let merchant = await db.merchant.findFirst({
      where: { name: "Test Merchant for PSPWare" }
    });

    if (!merchant) {
      merchant = await db.merchant.create({
        data: {
          name: "Test Merchant for PSPWare",
          token: "test-merchant-token-pspware-" + Date.now(),
          apiKeyPublic: "test-merchant-api-key-pspware",
          apiKeyPrivate: "test-merchant-private-key-pspware",
          disabled: false,
          balanceUsdt: 1000
        }
      });
      console.log("✅ Создан тестовый мерчант");
    } else {
      console.log("✅ Используем существующего мерчанта");
    }

    // 2. Убеждаемся, что у мерчанта есть метод оплаты
    console.log("\n2️⃣ Проверка методов оплаты...");
    let method = await db.method.findFirst({
      where: {
        merchantId: merchant.id,
        type: "sbp",
        isActive: true
      }
    });

    if (!method) {
      method = await db.method.create({
        data: {
          merchantId: merchant.id,
          name: "СБП",
          code: "sbp",
          type: "sbp",
          currency: "RUB",
          isActive: true,
          showOnMain: true,
          minPayin: 100,
          maxPayin: 300000,
          commissionPayin: 2.5
        }
      });
      console.log("✅ Создан метод оплаты СБП");
    } else {
      console.log("✅ Метод СБП уже существует");
    }

    // 3. Проверяем наличие PSPWare агрегатора
    console.log("\n3️⃣ Проверка PSPWare агрегатора...");
    let pspwareAggregator = await db.aggregator.findFirst({
      where: {
        apiSchema: AggregatorApiSchema.PSPWARE,
        isActive: true
      }
    });

    if (!pspwareAggregator) {
      console.log("⚠️ Создаем PSPWare агрегатор...");
      pspwareAggregator = await db.aggregator.create({
        data: {
          email: "pspware-test@example.com",
          name: "PSPWare Test Aggregator",
          password: "hashedpassword",
          apiToken: "pspware-api-token-" + Date.now(),
          callbackToken: "pspware-callback-token-" + Date.now(),
          apiBaseUrl: "http://localhost:4002", // Мок сервер PSPWare
          apiSchema: AggregatorApiSchema.PSPWARE,
          pspwareApiKey: "test-pspware-key-123",
          enableRandomization: true,
          randomizationType: PSPWareRandomizationType.PARTIAL,
          isActive: true,
          balanceUsdt: 10000,
          priority: 1,
          minBalance: 100,
          maxSlaMs: 5000
        }
      });
      console.log("✅ Создан PSPWare агрегатор");
    } else {
      console.log(`✅ Используем существующий PSPWare агрегатор: ${pspwareAggregator.name}`);
    }

    // 4. Деактивируем всех трейдеров, чтобы сделка пошла через агрегатора
    console.log("\n4️⃣ Деактивация трейдеров для тестирования fallback...");
    await db.user.updateMany({
      where: { role: "trader" },
      data: { banned: true }
    });
    console.log("✅ Все трейдеры заблокированы для теста");

    // 5. Создаем тестовую сделку через API мерчанта
    console.log("\n5️⃣ Создание тестовой сделки...");
    const dealRequest = {
      amount: 1500, // Кратно 500 для частичной рандомизации
      orderId: `test-pspware-${Date.now()}`,
      clientIdentifier: "test-client-123",
      userIp: "192.168.1.100",
      callbackUri: `${API_URL}/test/callback`,
      rate: 96.5
    };

    console.log("📤 Отправка запроса на создание сделки:");
    console.log(JSON.stringify(dealRequest, null, 2));

    try {
      const response = await axios.post(
        `${API_URL}/merchant/in`,
        dealRequest,
        {
          headers: {
            "Content-Type": "application/json",
            "x-api-key": merchant.apiKeyPublic || "test-merchant-api-key-pspware"
          },
          timeout: 10000
        }
      );

      console.log("\n✅ Сделка успешно создана!");
      console.log("📥 Ответ от системы:");
      console.log(JSON.stringify(response.data, null, 2));

      if (response.data.data) {
        const transaction = response.data.data;
        
        // Проверяем, что сделка действительно пошла через агрегатора
        const dbTransaction = await db.transaction.findUnique({
          where: { id: transaction.id },
          include: {
            aggregator: true
          }
        });

        if (dbTransaction?.aggregator) {
          console.log(`\n🎯 Сделка успешно направлена через агрегатора: ${dbTransaction.aggregator.name}`);
          console.log(`   API Schema: ${dbTransaction.aggregator.apiSchema}`);
          
          if (dbTransaction.aggregator.apiSchema === AggregatorApiSchema.PSPWARE) {
            console.log("   ✅ Используется PSPWare API схема!");
            
            // Проверяем логи интеграции
            const integrationLogs = await db.aggregatorIntegrationLog.findMany({
              where: {
                aggregatorId: dbTransaction.aggregator.id,
                ourDealId: dealRequest.orderId
              },
              orderBy: { createdAt: 'desc' },
              take: 5
            });

            if (integrationLogs.length > 0) {
              console.log(`\n📋 Найдено ${integrationLogs.length} логов интеграции:`);
              integrationLogs.forEach(log => {
                console.log(`   - ${log.eventType}: ${log.method} ${log.url}`);
                console.log(`     Status: ${log.statusCode}, Response time: ${log.responseTimeMs}ms`);
                if (log.error) {
                  console.log(`     ❌ Error: ${log.error}`);
                }
              });
            }
          }
        } else {
          console.log("\n⚠️ Сделка не была направлена через агрегатора");
        }
      }

    } catch (error: any) {
      if (error.response) {
        console.error("\n❌ Ошибка при создании сделки:");
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
        
        if (error.response.data?.error === "NO_REQUISITE") {
          console.log("\n⚠️ Получен NO_REQUISITE - проверьте:");
          console.log("   1. Активен ли PSPWare агрегатор");
          console.log("   2. Настроен ли apiBaseUrl агрегатора");
          console.log("   3. Достаточен ли баланс агрегатора");
          console.log("   4. Запущен ли мок-сервер PSPWare на порту 4002");
        }
      } else {
        console.error("\n❌ Ошибка сети:", error.message);
      }
    }

    // 6. Проверяем очередь агрегаторов
    console.log("\n6️⃣ Проверка очереди агрегаторов...");
    const activeAggregators = await db.aggregator.findMany({
      where: {
        isActive: true,
        apiBaseUrl: { not: null }
      },
      orderBy: { priority: 'asc' }
    });

    console.log(`Найдено ${activeAggregators.length} активных агрегаторов:`);
    activeAggregators.forEach(agg => {
      console.log(`   - ${agg.name} (${agg.apiSchema})`);
      console.log(`     URL: ${agg.apiBaseUrl}`);
      console.log(`     Priority: ${agg.priority}, Balance: ${agg.balanceUsdt} USDT`);
      if (agg.apiSchema === AggregatorApiSchema.PSPWARE) {
        console.log(`     PSPWare Key: ${agg.pspwareApiKey ? '✅ Configured' : '❌ Not configured'}`);
        console.log(`     Randomization: ${agg.enableRandomization ? `✅ ${agg.randomizationType}` : '❌ Disabled'}`);
      }
    });

  } catch (error) {
    console.error("\n❌ Ошибка:", error);
  } finally {
    // Восстанавливаем трейдеров
    console.log("\n🔄 Восстановление трейдеров...");
    await db.user.updateMany({
      where: { role: "trader" },
      data: { banned: false }
    });
    console.log("✅ Трейдеры разблокированы");
  }

  console.log("\n✅ Тест завершен!");
  process.exit(0);
}

// Запуск теста
testPSPWareRouting().catch(console.error);