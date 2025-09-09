import { describe, expect, test, beforeAll, afterAll, beforeEach } from "bun:test";
import { db } from "@/db";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import type { Merchant, Method, Aggregator } from "@prisma/client";

describe("Merchant IN Endpoint with Aggregator Fallback", () => {
  let testMerchant: Merchant;
  let testMethod: Method;
  let testAggregator: Aggregator;
  let merchantApiKey: string;
  
  const API_URL = process.env.API_URL || "http://localhost:3000";
  
  beforeAll(async () => {
    // Создаём тестового мерчанта
    merchantApiKey = `test_merchant_${uuidv4()}`;
    testMerchant = await db.merchant.create({
      data: {
        name: "Test Merchant for Aggregator Fallback",
        email: `test-merchant-${uuidv4()}@test.com`,
        apiKey: merchantApiKey,
        balanceUsdt: 0,
        countInRubEquivalent: false,
      },
    });
    
    // Создаём тестовый метод
    testMethod = await db.method.create({
      data: {
        code: `TEST_METHOD_${uuidv4()}`,
        name: "Test Method",
        type: "sbp",
        currency: "RUB",
        commissionPayin: 2,
        commissionPayout: 1.5,
        minPayin: 100,
        maxPayin: 100000,
        minPayout: 100,
        maxPayout: 100000,
        isEnabled: true,
      },
    });
    
    // Связываем метод с мерчантом
    await db.merchantMethod.create({
      data: {
        merchantId: testMerchant.id,
        methodId: testMethod.id,
        isEnabled: true,
      },
    });
    
    // Создаём тестового агрегатора
    const hashedPassword = await bcrypt.hash("test_password", 10);
    testAggregator = await db.aggregator.create({
      data: {
        name: "Test Aggregator for Fallback",
        email: `test-agg-fallback-${uuidv4()}@test.com`,
        password: hashedPassword,
        apiBaseUrl: "https://test-aggregator.local",
        apiToken: `test_agg_${uuidv4()}`,
        callbackToken: `callback_${uuidv4()}`,
        isActive: true,
        priority: 1,
        balanceUsdt: 10000,
        minBalance: 100,
        maxSlaMs: 5000,
        maxDailyVolume: 1000000,
        currentDailyVolume: 0,
      },
    });
  });
  
  afterAll(async () => {
    // Удаляем тестовые данные
    await db.merchantMethod.deleteMany({
      where: { merchantId: testMerchant.id }
    }).catch(() => {});
    
    await db.merchant.delete({
      where: { id: testMerchant.id }
    }).catch(() => {});
    
    await db.method.delete({
      where: { id: testMethod.id }
    }).catch(() => {});
    
    await db.aggregator.delete({
      where: { id: testAggregator.id }
    }).catch(() => {});
  });
  
  beforeEach(async () => {
    // Сбрасываем дневной объём агрегатора
    await db.aggregator.update({
      where: { id: testAggregator.id },
      data: { currentDailyVolume: 0 }
    });
  });
  
  describe("Aggregator Fallback", () => {
    test("should fallback to aggregators when no trader requisite found", async () => {
      const orderId = `test_order_${uuidv4()}`;
      
      // Мокаем fetch для агрегатора
      const originalFetch = global.fetch;
      let aggregatorCallMade = false;
      let aggregatorRequestBody: any = null;
      
      global.fetch = async (url: any, options: any) => {
        const urlString = url.toString();
        
        // Если это запрос к агрегатору
        if (urlString.includes("test-aggregator.local")) {
          aggregatorCallMade = true;
          aggregatorRequestBody = JSON.parse(options.body);
          
          return new Response(JSON.stringify({
            accepted: true,
            partnerDealId: `partner_${uuidv4()}`,
            requisites: {
              bankName: "Test Bank",
              phoneNumber: "+79001234567",
              recipientName: "Test Recipient"
            },
            dealDetails: {
              id: `deal_${uuidv4()}`,
              amount: 5000,
              status: "IN_PROGRESS",
              createdAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 3600000).toISOString(),
              paymentMethod: "SBP"
            }
          }), { 
            status: 201,
            headers: { "Content-Type": "application/json" }
          });
        }
        
        // Для всех остальных запросов используем оригинальный fetch
        return originalFetch(url, options);
      };
      
      try {
        // Создаём транзакцию через эндпоинт мерчанта
        const response = await fetch(`${API_URL}/merchant/transactions/in`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-merchant-api-key": merchantApiKey,
          },
          body: JSON.stringify({
            amount: 5000,
            orderId: orderId,
            methodId: testMethod.id,
            rate: 95.5,
            expired_at: new Date(Date.now() + 3600000).toISOString(),
            callbackUri: "https://merchant.test/callback",
            clientIdentifier: "test_client_123",
          }),
        });
        
        const result = await response.json();
        
        // Проверяем что транзакция создана через агрегатора
        expect(response.status).toBe(201);
        expect(aggregatorCallMade).toBe(true);
        
        // Проверяем что в ответе есть реквизиты от агрегатора
        expect(result.requisites).toBeDefined();
        expect(result.requisites.phoneNumber).toBe("+79001234567");
        expect(result.requisites.bankType).toBe("Test Bank");
        
        // Проверяем что запрос к агрегатору был правильный
        expect(aggregatorRequestBody).toBeDefined();
        expect(aggregatorRequestBody.ourDealId).toBe(orderId);
        expect(aggregatorRequestBody.amount).toBe(5000);
        expect(aggregatorRequestBody.paymentMethod).toBe("SBP");
        
        // Проверяем что транзакция сохранена в БД с привязкой к агрегатору
        const transaction = await db.transaction.findFirst({
          where: { orderId: orderId }
        });
        
        expect(transaction).toBeDefined();
        expect(transaction?.aggregatorId).toBe(testAggregator.id);
        expect(transaction?.status).toBe("IN_PROGRESS");
        
        // Проверяем что создана запись в логах интеграции
        const integrationLog = await db.aggregatorIntegrationLog.findFirst({
          where: {
            aggregatorId: testAggregator.id,
            ourDealId: orderId,
          }
        });
        
        expect(integrationLog).toBeDefined();
        expect(integrationLog?.eventType).toBe("deal_routed_from_merchant");
        expect(integrationLog?.direction).toBe("OUT");
        
      } finally {
        global.fetch = originalFetch;
      }
    });
    
    test("should return NO_REQUISITE when all aggregators decline", async () => {
      const orderId = `test_order_${uuidv4()}`;
      
      // Мокаем fetch для агрегатора - отказ
      const originalFetch = global.fetch;
      let aggregatorCallMade = false;
      
      global.fetch = async (url: any, options: any) => {
        const urlString = url.toString();
        
        // Если это запрос к агрегатору
        if (urlString.includes("test-aggregator.local")) {
          aggregatorCallMade = true;
          
          return new Response(JSON.stringify({
            accepted: false,
            message: "No available requisites"
          }), { 
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }
        
        // Для всех остальных запросов используем оригинальный fetch
        return originalFetch(url, options);
      };
      
      try {
        // Создаём транзакцию через эндпоинт мерчанта
        const response = await fetch(`${API_URL}/merchant/transactions/in`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-merchant-api-key": merchantApiKey,
          },
          body: JSON.stringify({
            amount: 5000,
            orderId: orderId,
            methodId: testMethod.id,
            rate: 95.5,
            expired_at: new Date(Date.now() + 3600000).toISOString(),
            callbackUri: "https://merchant.test/callback",
            clientIdentifier: "test_client_123",
          }),
        });
        
        const result = await response.json();
        
        // Проверяем что вернулась ошибка NO_REQUISITE
        expect(response.status).toBe(409);
        expect(result.error).toBe("NO_REQUISITE");
        
        // Проверяем что был вызов к агрегатору
        expect(aggregatorCallMade).toBe(true);
        
        // Проверяем что транзакция не была создана
        const transaction = await db.transaction.findFirst({
          where: { orderId: orderId }
        });
        
        expect(transaction).toBeNull();
        
        // Проверяем что создана запись о неудачной попытке
        const attempt = await db.transactionAttempt.findFirst({
          where: {
            merchantId: testMerchant.id,
            amount: 5000,
            success: false,
          },
          orderBy: { createdAt: "desc" }
        });
        
        expect(attempt).toBeDefined();
        expect(attempt?.status).toBe("NO_REQUISITE");
        expect(attempt?.errorCode).toBe("NO_AGGREGATOR");
        
      } finally {
        global.fetch = originalFetch;
      }
    });
    
    test("should handle aggregator timeout gracefully", async () => {
      const orderId = `test_order_${uuidv4()}`;
      
      // Мокаем fetch для агрегатора - таймаут
      const originalFetch = global.fetch;
      let aggregatorCallMade = false;
      
      global.fetch = async (url: any, options: any) => {
        const urlString = url.toString();
        
        // Если это запрос к агрегатору
        if (urlString.includes("test-aggregator.local")) {
          aggregatorCallMade = true;
          
          // Симулируем таймаут
          await new Promise(resolve => setTimeout(resolve, 6000));
          throw new Error("Request timeout");
        }
        
        // Для всех остальных запросов используем оригинальный fetch
        return originalFetch(url, options);
      };
      
      try {
        // Создаём транзакцию через эндпоинт мерчанта
        const response = await fetch(`${API_URL}/merchant/transactions/in`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-merchant-api-key": merchantApiKey,
          },
          body: JSON.stringify({
            amount: 5000,
            orderId: orderId,
            methodId: testMethod.id,
            rate: 95.5,
            expired_at: new Date(Date.now() + 3600000).toISOString(),
            callbackUri: "https://merchant.test/callback",
            clientIdentifier: "test_client_123",
          }),
        });
        
        const result = await response.json();
        
        // Проверяем что вернулась ошибка NO_REQUISITE
        expect(response.status).toBe(409);
        expect(result.error).toBe("NO_REQUISITE");
        
        // Проверяем что был вызов к агрегатору
        expect(aggregatorCallMade).toBe(true);
        
        // Проверяем что в логах есть запись об ошибке
        const integrationLog = await db.aggregatorIntegrationLog.findFirst({
          where: {
            aggregatorId: testAggregator.id,
            eventType: "deal_create_error",
          },
          orderBy: { createdAt: "desc" }
        });
        
        expect(integrationLog).toBeDefined();
        expect(integrationLog?.slaViolation).toBe(true);
        
      } finally {
        global.fetch = originalFetch;
      }
    }, 10000); // Увеличиваем таймаут для этого теста
  });
  
  describe("Aggregator Daily Volume Tracking", () => {
    test("should update aggregator daily volume after successful routing", async () => {
      const orderId = `test_order_${uuidv4()}`;
      const amount = 15000;
      
      // Запоминаем начальный объём
      const initialVolume = testAggregator.currentDailyVolume;
      
      // Мокаем fetch для агрегатора
      const originalFetch = global.fetch;
      
      global.fetch = async (url: any, options: any) => {
        const urlString = url.toString();
        
        if (urlString.includes("test-aggregator.local")) {
          return new Response(JSON.stringify({
            accepted: true,
            partnerDealId: `partner_${uuidv4()}`,
            requisites: {
              bankName: "Test Bank",
              cardNumber: "1234567890123456",
            }
          }), { 
            status: 201,
            headers: { "Content-Type": "application/json" }
          });
        }
        
        return originalFetch(url, options);
      };
      
      try {
        // Создаём транзакцию
        const response = await fetch(`${API_URL}/merchant/transactions/in`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-merchant-api-key": merchantApiKey,
          },
          body: JSON.stringify({
            amount: amount,
            orderId: orderId,
            methodId: testMethod.id,
            rate: 95.5,
            expired_at: new Date(Date.now() + 3600000).toISOString(),
          }),
        });
        
        expect(response.status).toBe(201);
        
        // Проверяем что дневной объём увеличился
        const updatedAggregator = await db.aggregator.findUnique({
          where: { id: testAggregator.id }
        });
        
        expect(updatedAggregator?.currentDailyVolume).toBe(initialVolume + amount);
        
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});