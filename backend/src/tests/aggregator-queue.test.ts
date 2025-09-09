import { describe, expect, test, beforeAll, afterAll, beforeEach } from "bun:test";
import { db } from "@/db";
import { aggregatorQueueService } from "@/services/aggregator-queue.service";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import type { Aggregator } from "@prisma/client";

describe("Aggregator Queue Service", () => {
  let testAggregators: Aggregator[] = [];
  
  beforeAll(async () => {
    // Создаём тестовых агрегаторов
    const hashedPassword = await bcrypt.hash("test_password", 10);
    const callbackToken1 = `callback_${uuidv4()}`;
    const callbackToken2 = `callback_${uuidv4()}`;
    const callbackToken3 = `callback_${uuidv4()}`;
    
    const aggregatorData = [
      {
        name: "Test Aggregator 1",
        email: `test-agg1-${uuidv4()}@test.com`,
        password: hashedPassword,
        apiBaseUrl: "https://aggregator1.test",
        apiToken: `test_token_${uuidv4()}`,
        callbackToken: callbackToken1,
        isActive: true,
        priority: 1,
        balanceUsdt: 10000,
        minBalance: 100,
        maxSlaMs: 2000,
        maxDailyVolume: 1000000,
        currentDailyVolume: 0,
      },
      {
        name: "Test Aggregator 2",
        email: `test-agg2-${uuidv4()}@test.com`,
        password: hashedPassword,
        apiBaseUrl: "https://aggregator2.test",
        apiToken: `test_token_${uuidv4()}`,
        callbackToken: callbackToken2,
        isActive: true,
        priority: 2,
        balanceUsdt: 5000,
        minBalance: 100,
        maxSlaMs: 2000,
        maxDailyVolume: 500000,
        currentDailyVolume: 0,
      },
      {
        name: "Test Aggregator 3 (Inactive)",
        email: `test-agg3-${uuidv4()}@test.com`,
        password: hashedPassword,
        apiBaseUrl: "https://aggregator3.test",
        apiToken: `test_token_${uuidv4()}`,
        callbackToken: callbackToken3,
        isActive: false,
        priority: 3,
        balanceUsdt: 15000,
        minBalance: 100,
        maxSlaMs: 2000,
      },
    ];
    
    for (const data of aggregatorData) {
      const aggregator = await db.aggregator.create({ data });
      testAggregators.push(aggregator);
    }
  });
  
  afterAll(async () => {
    // Удаляем тестовых агрегаторов
    for (const aggregator of testAggregators) {
      await db.aggregator.delete({ where: { id: aggregator.id } }).catch(() => {});
    }
  });
  
  beforeEach(async () => {
    // Сбрасываем дневные объёмы перед каждым тестом
    for (const aggregator of testAggregators) {
      await db.aggregator.update({
        where: { id: aggregator.id },
        data: { currentDailyVolume: 0 }
      });
    }
  });
  
  describe("Queue Rotation", () => {
    test("should rotate aggregators in round-robin fashion", async () => {
      const request = {
        ourDealId: `test_${uuidv4()}`,
        amount: 5000,
        rate: 95.5,
        paymentMethod: "SBP" as const,
        callbackUrl: "https://test.callback/url",
      };
      
      // Мокаем HTTP запросы к агрегаторам
      const originalFetch = global.fetch;
      const callHistory: string[] = [];
      
      global.fetch = async (url: any) => {
        const urlString = url.toString();
        
        // Запоминаем какой агрегатор был вызван
        if (urlString.includes("aggregator1.test")) {
          callHistory.push("aggregator1");
          return new Response(JSON.stringify({
            accepted: false,
            message: "No available requisites"
          }), { status: 200 });
        } else if (urlString.includes("aggregator2.test")) {
          callHistory.push("aggregator2");
          return new Response(JSON.stringify({
            accepted: true,
            partnerDealId: `partner_${uuidv4()}`,
            requisites: {
              bankName: "Test Bank",
              phoneNumber: "+79001234567"
            }
          }), { status: 201 });
        }
        
        return new Response("Not found", { status: 404 });
      };
      
      try {
        const result = await aggregatorQueueService.routeDealToAggregators(request);
        
        // Проверяем что сначала попробовали первого агрегатора (по приоритету)
        expect(callHistory[0]).toBe("aggregator1");
        
        // Проверяем что после отказа первого, попробовали второго
        expect(callHistory[1]).toBe("aggregator2");
        
        // Проверяем что второй принял сделку
        expect(result.success).toBe(true);
        expect(result.aggregator?.name).toBe("Test Aggregator 2");
        expect(result.response?.accepted).toBe(true);
        expect(result.triedAggregators).toHaveLength(2);
      } finally {
        global.fetch = originalFetch;
      }
    });
    
    test("should skip inactive aggregators", async () => {
      const request = {
        ourDealId: `test_${uuidv4()}`,
        amount: 5000,
        rate: 95.5,
        paymentMethod: "C2C" as const,
        callbackUrl: "https://test.callback/url",
      };
      
      // Мокаем HTTP запросы
      const originalFetch = global.fetch;
      const callHistory: string[] = [];
      
      global.fetch = async (url: any) => {
        const urlString = url.toString();
        
        if (urlString.includes("aggregator1.test")) {
          callHistory.push("aggregator1");
          return new Response(JSON.stringify({
            accepted: false
          }), { status: 200 });
        } else if (urlString.includes("aggregator2.test")) {
          callHistory.push("aggregator2");
          return new Response(JSON.stringify({
            accepted: false
          }), { status: 200 });
        } else if (urlString.includes("aggregator3.test")) {
          // Не должен быть вызван, так как неактивен
          callHistory.push("aggregator3");
          return new Response(JSON.stringify({
            accepted: true
          }), { status: 201 });
        }
        
        return new Response("Not found", { status: 404 });
      };
      
      try {
        const result = await aggregatorQueueService.routeDealToAggregators(request);
        
        // Проверяем что неактивный агрегатор не был вызван
        expect(callHistory).not.toContain("aggregator3");
        
        // Проверяем что попробовали только активных
        expect(callHistory).toEqual(["aggregator1", "aggregator2"]);
        
        // Все отказали
        expect(result.success).toBe(false);
        expect(result.triedAggregators).toHaveLength(2);
      } finally {
        global.fetch = originalFetch;
      }
    });
    
    test("should respect balance limits", async () => {
      // Устанавливаем низкий баланс для первого агрегатора
      await db.aggregator.update({
        where: { id: testAggregators[0].id },
        data: { balanceUsdt: 50 } // Меньше minBalance (100)
      });
      
      const request = {
        ourDealId: `test_${uuidv4()}`,
        amount: 5000,
        rate: 95.5,
        paymentMethod: "SBP" as const,
        callbackUrl: "https://test.callback/url",
      };
      
      const originalFetch = global.fetch;
      const callHistory: string[] = [];
      
      global.fetch = async (url: any) => {
        const urlString = url.toString();
        
        if (urlString.includes("aggregator1.test")) {
          callHistory.push("aggregator1");
          return new Response(JSON.stringify({
            accepted: true
          }), { status: 201 });
        } else if (urlString.includes("aggregator2.test")) {
          callHistory.push("aggregator2");
          return new Response(JSON.stringify({
            accepted: true,
            partnerDealId: `partner_${uuidv4()}`
          }), { status: 201 });
        }
        
        return new Response("Not found", { status: 404 });
      };
      
      try {
        const result = await aggregatorQueueService.routeDealToAggregators(request);
        
        // Проверяем что первый агрегатор был пропущен из-за низкого баланса
        expect(callHistory).not.toContain("aggregator1");
        
        // Проверяем что сразу пошли ко второму
        expect(callHistory[0]).toBe("aggregator2");
        
        expect(result.success).toBe(true);
        expect(result.aggregator?.name).toBe("Test Aggregator 2");
      } finally {
        global.fetch = originalFetch;
        // Восстанавливаем баланс
        await db.aggregator.update({
          where: { id: testAggregators[0].id },
          data: { balanceUsdt: 10000 }
        });
      }
    });
    
    test("should update daily volume after successful routing", async () => {
      const request = {
        ourDealId: `test_${uuidv4()}`,
        amount: 15000,
        rate: 95.5,
        paymentMethod: "C2C" as const,
        callbackUrl: "https://test.callback/url",
      };
      
      const originalFetch = global.fetch;
      
      global.fetch = async (url: any) => {
        const urlString = url.toString();
        
        if (urlString.includes("aggregator1.test")) {
          return new Response(JSON.stringify({
            accepted: true,
            partnerDealId: `partner_${uuidv4()}`,
            requisites: {
              bankName: "Test Bank",
              cardNumber: "1234567890123456"
            }
          }), { status: 201 });
        }
        
        return new Response("Not found", { status: 404 });
      };
      
      try {
        const initialVolume = testAggregators[0].currentDailyVolume;
        
        const result = await aggregatorQueueService.routeDealToAggregators(request);
        
        expect(result.success).toBe(true);
        
        // Проверяем что дневной объём был обновлён
        const updatedAggregator = await db.aggregator.findUnique({
          where: { id: testAggregators[0].id }
        });
        
        expect(updatedAggregator?.currentDailyVolume).toBe(initialVolume + request.amount);
      } finally {
        global.fetch = originalFetch;
      }
    });
    
    test("should return failure when all aggregators decline", async () => {
      const request = {
        ourDealId: `test_${uuidv4()}`,
        amount: 5000,
        rate: 95.5,
        paymentMethod: "SBP" as const,
        callbackUrl: "https://test.callback/url",
      };
      
      const originalFetch = global.fetch;
      
      global.fetch = async () => {
        return new Response(JSON.stringify({
          accepted: false,
          message: "No requisites available"
        }), { status: 200 });
      };
      
      try {
        const result = await aggregatorQueueService.routeDealToAggregators(request);
        
        expect(result.success).toBe(false);
        expect(result.triedAggregators).toHaveLength(2); // Только активные агрегаторы
        expect(result.aggregator).toBeUndefined();
        expect(result.response).toBeUndefined();
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
  
  describe("Daily Volume Reset", () => {
    test("should reset daily volumes for aggregators", async () => {
      // Устанавливаем объёмы и время последнего сброса на вчера
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      await db.aggregator.update({
        where: { id: testAggregators[0].id },
        data: {
          currentDailyVolume: 50000,
          lastVolumeReset: yesterday
        }
      });
      
      await db.aggregator.update({
        where: { id: testAggregators[1].id },
        data: {
          currentDailyVolume: 25000,
          lastVolumeReset: yesterday
        }
      });
      
      // Вызываем метод сброса
      await aggregatorQueueService.resetDailyVolumes();
      
      // Проверяем что объёмы сброшены
      const agg1 = await db.aggregator.findUnique({
        where: { id: testAggregators[0].id }
      });
      const agg2 = await db.aggregator.findUnique({
        where: { id: testAggregators[1].id }
      });
      
      expect(agg1?.currentDailyVolume).toBe(0);
      expect(agg2?.currentDailyVolume).toBe(0);
      
      // Проверяем что время сброса обновлено
      expect(agg1?.lastVolumeReset).toBeDefined();
      expect(agg1?.lastVolumeReset?.getTime()).toBeGreaterThan(yesterday.getTime());
    });
  });
});