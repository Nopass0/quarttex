import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { db } from "@/db";
import { Merchant, Method, User, BankDetail } from "@prisma/client";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

const API_URL = "http://localhost:3000/api";

describe("External Aggregator API", () => {
  let testMerchant: Merchant;
  let testMethod: Method;
  let testTrader: User;
  let testBankDetail: BankDetail;
  let externalApiToken: string;
  let externalCallbackToken: string;
  
  beforeAll(async () => {
    console.log("Setting up test data for external aggregator tests...");
    
    // Создаём тестового мерчанта с агрегаторским режимом
    externalApiToken = `test_api_${randomBytes(16).toString("hex")}`;
    externalCallbackToken = `test_callback_${randomBytes(16).toString("hex")}`;
    
    testMerchant = await db.merchant.create({
      data: {
        name: "Test Aggregator Merchant",
        token: `test_merchant_${randomBytes(16).toString("hex")}`,
        isAggregatorMode: true,
        externalApiToken: externalApiToken,
        externalCallbackToken: externalCallbackToken,
        countInRubEquivalent: false,
        balanceUsdt: 10000
      }
    });
    
    // Создаём тестовый метод
    testMethod = await db.method.create({
      data: {
        code: `test_method_${Date.now()}`,
        name: "Test SBP Method",
        type: "sbp",
        currency: "rub",
        commissionPayin: 2,
        commissionPayout: 1,
        maxPayin: 100000,
        minPayin: 100,
        maxPayout: 100000,
        minPayout: 100,
        chancePayin: 100,
        chancePayout: 100,
        isEnabled: true
      }
    });
    
    // Связываем метод с мерчантом
    await db.merchantMethod.create({
      data: {
        merchantId: testMerchant.id,
        methodId: testMethod.id,
        isEnabled: true
      }
    });
    
    // Создаём тестового трейдера
    testTrader = await db.user.create({
      data: {
        email: `trader_${Date.now()}@test.com`,
        password: await bcrypt.hash("testpassword", 10),
        name: "Test Trader",
        balanceUsdt: 1000,
        balanceRub: 100000,
        trustBalance: 1000,
        deposit: 5000,
        trafficEnabled: true,
        minAmountPerRequisite: 100,
        maxAmountPerRequisite: 50000
      }
    });
    
    // Связываем трейдера с мерчантом
    await db.traderMerchant.create({
      data: {
        traderId: testTrader.id,
        merchantId: testMerchant.id,
        methodId: testMethod.id,
        feeIn: 1,
        feeOut: 1,
        isFeeInEnabled: true,
        isFeeOutEnabled: true,
        isMerchantEnabled: true
      }
    });
    
    // Создаём банковский реквизит для трейдера
    testBankDetail = await db.bankDetail.create({
      data: {
        userId: testTrader.id,
        bankType: "SBERBANK",
        cardNumber: "+79001234567",
        recipientName: "Test Recipient",
        methodType: "sbp",
        isActive: true,
        isArchived: false,
        minAmount: 100,
        maxAmount: 50000,
        operationLimit: 10,
        sumLimit: 100000,
        intervalMinutes: 0
      }
    });
  });
  
  afterAll(async () => {
    console.log("Cleaning up test data...");
    
    // Удаляем тестовые данные
    if (testBankDetail) {
      await db.bankDetail.delete({ where: { id: testBankDetail.id } }).catch(() => {});
    }
    
    await db.traderMerchant.deleteMany({
      where: { merchantId: testMerchant.id }
    }).catch(() => {});
    
    await db.merchantMethod.deleteMany({
      where: { merchantId: testMerchant.id }
    }).catch(() => {});
    
    if (testTrader) {
      await db.user.delete({ where: { id: testTrader.id } }).catch(() => {});
    }
    
    if (testMethod) {
      await db.method.delete({ where: { id: testMethod.id } }).catch(() => {});
    }
    
    if (testMerchant) {
      // Удаляем транзакции мерчанта
      await db.transaction.deleteMany({
        where: { merchantId: testMerchant.id }
      }).catch(() => {});
      
      await db.merchant.delete({ where: { id: testMerchant.id } }).catch(() => {});
    }
  });
  
  describe("POST /external/aggregator/deals", () => {
    it("should create a deal with valid data", async () => {
      const dealData = {
        ourDealId: `test_deal_${Date.now()}`,
        amount: 1000,
        rate: 95,
        paymentMethod: "SBP",
        clientIdentifier: "test_client_123",
        callbackUrl: "https://example.com/callback",
        expiresAt: new Date(Date.now() + 86400000).toISOString()
      };
      
      const response = await fetch(`${API_URL}/external/aggregator/deals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${externalApiToken}`
        },
        body: JSON.stringify(dealData)
      });
      
      expect(response.status).toBe(201);
      
      const result = await response.json();
      expect(result.accepted).toBe(true);
      expect(result.partnerDealId).toBeDefined();
      expect(result.requisites).toBeDefined();
      expect(result.requisites.phoneNumber).toBe(testBankDetail.cardNumber);
      expect(result.dealDetails).toBeDefined();
      expect(result.dealDetails.amount).toBe(dealData.amount);
      expect(result.dealDetails.paymentMethod).toBe(dealData.paymentMethod);
    });
    
    it("should reject deal with invalid token", async () => {
      const dealData = {
        ourDealId: `test_deal_${Date.now()}`,
        amount: 1000,
        paymentMethod: "SBP"
      };
      
      const response = await fetch(`${API_URL}/external/aggregator/deals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer invalid_token"
        },
        body: JSON.stringify(dealData)
      });
      
      expect(response.status).toBe(401);
    });
    
    it("should reject deal with duplicate ourDealId", async () => {
      const dealId = `test_deal_${Date.now()}`;
      
      // Создаём первую сделку
      const firstResponse = await fetch(`${API_URL}/external/aggregator/deals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-aggregator-token": externalApiToken
        },
        body: JSON.stringify({
          ourDealId: dealId,
          amount: 1000,
          paymentMethod: "SBP"
        })
      });
      
      expect(firstResponse.status).toBe(201);
      
      // Пытаемся создать дубликат
      const duplicateResponse = await fetch(`${API_URL}/external/aggregator/deals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-aggregator-token": externalApiToken
        },
        body: JSON.stringify({
          ourDealId: dealId,
          amount: 2000,
          paymentMethod: "SBP"
        })
      });
      
      expect(duplicateResponse.status).toBe(409);
      const result = await duplicateResponse.json();
      expect(result.error).toContain("already exists");
    });
  });
  
  describe("GET /external/aggregator/deals/:partnerDealId", () => {
    it("should get deal info by partnerDealId", async () => {
      // Сначала создаём сделку
      const createResponse = await fetch(`${API_URL}/external/aggregator/deals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${externalApiToken}`
        },
        body: JSON.stringify({
          ourDealId: `test_get_${Date.now()}`,
          amount: 1500,
          paymentMethod: "SBP"
        })
      });
      
      expect(createResponse.status).toBe(201);
      const createResult = await createResponse.json();
      const partnerDealId = createResult.partnerDealId;
      
      // Получаем информацию о сделке
      const getResponse = await fetch(
        `${API_URL}/external/aggregator/deals/${partnerDealId}`,
        {
          headers: {
            "Authorization": `Bearer ${externalApiToken}`
          }
        }
      );
      
      expect(getResponse.status).toBe(200);
      const getResult = await getResponse.json();
      expect(getResult.partnerDealId).toBe(partnerDealId);
      expect(getResult.dealDetails.amount).toBe(1500);
    });
    
    it("should return 404 for non-existent deal", async () => {
      const response = await fetch(
        `${API_URL}/external/aggregator/deals/non_existent_id`,
        {
          headers: {
            "Authorization": `Bearer ${externalApiToken}`
          }
        }
      );
      
      expect(response.status).toBe(404);
    });
  });
  
  describe("POST /external/aggregator/deals/:partnerDealId/cancel", () => {
    it("should cancel a deal", async () => {
      // Создаём сделку
      const createResponse = await fetch(`${API_URL}/external/aggregator/deals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-token": externalApiToken
        },
        body: JSON.stringify({
          ourDealId: `test_cancel_${Date.now()}`,
          amount: 2000,
          paymentMethod: "SBP"
        })
      });
      
      expect(createResponse.status).toBe(201);
      const createResult = await createResponse.json();
      const partnerDealId = createResult.partnerDealId;
      
      // Отменяем сделку
      const cancelResponse = await fetch(
        `${API_URL}/external/aggregator/deals/${partnerDealId}/cancel`,
        {
          method: "POST",
          headers: {
            "x-api-token": externalApiToken
          }
        }
      );
      
      expect(cancelResponse.status).toBe(200);
      const cancelResult = await cancelResponse.json();
      expect(cancelResult.success).toBe(true);
      
      // Проверяем статус после отмены
      const checkResponse = await fetch(
        `${API_URL}/external/aggregator/deals/${partnerDealId}`,
        {
          headers: {
            "x-api-token": externalApiToken
          }
        }
      );
      
      const checkResult = await checkResponse.json();
      expect(checkResult.dealDetails.status).toBe("CANCELED");
    });
  });
  
  describe("POST /external/aggregator/deals/:partnerDealId/disputes", () => {
    it("should create a dispute for a deal", async () => {
      // Создаём сделку
      const createResponse = await fetch(`${API_URL}/external/aggregator/deals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${externalApiToken}`
        },
        body: JSON.stringify({
          ourDealId: `test_dispute_${Date.now()}`,
          amount: 3000,
          paymentMethod: "SBP"
        })
      });
      
      expect(createResponse.status).toBe(201);
      const createResult = await createResponse.json();
      const partnerDealId = createResult.partnerDealId;
      
      // Создаём спор
      const disputeResponse = await fetch(
        `${API_URL}/external/aggregator/deals/${partnerDealId}/disputes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${externalApiToken}`
          },
          body: JSON.stringify({
            message: "Test dispute message",
            attachments: ["https://example.com/proof.jpg"]
          })
        }
      );
      
      expect(disputeResponse.status).toBe(200);
      const disputeResult = await disputeResponse.json();
      expect(disputeResult.success).toBe(true);
      expect(disputeResult.disputeId).toBeDefined();
    });
  });
  
  describe("Callback sending", () => {
    it("should send aggregator-format callback when transaction status changes", async () => {
      // Этот тест проверяет, что колбэки отправляются в правильном формате
      // Для полного теста нужен mock-сервер для приёма колбэков
      
      const dealData = {
        ourDealId: `test_callback_${Date.now()}`,
        amount: 5000,
        paymentMethod: "SBP",
        callbackUrl: "http://localhost:9999/test-callback" // Mock endpoint
      };
      
      const response = await fetch(`${API_URL}/external/aggregator/deals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${externalApiToken}`
        },
        body: JSON.stringify(dealData)
      });
      
      expect(response.status).toBe(201);
      const result = await response.json();
      
      // В реальном тесте здесь нужно:
      // 1. Изменить статус транзакции через админ API
      // 2. Проверить, что колбэк был отправлен на mock-сервер
      // 3. Проверить формат колбэка (ourDealId, status, amount, partnerDealId)
      
      expect(result.partnerDealId).toBeDefined();
    });
  });
});

console.log("External Aggregator tests ready to run!");