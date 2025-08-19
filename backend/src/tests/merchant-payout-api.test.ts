import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { Elysia } from "elysia";
import { merchantPayoutsApi } from "../api/merchant/payouts";
import { db } from "../db";
import { createTestMerchant, createTestTrader, cleanupTestData } from "./utils/test-helpers";
import { PayoutService } from "../services/payout.service";

const payoutService = PayoutService.getInstance();

describe("Merchant Payout API Tests", () => {
  let app: Elysia;
  let merchant: any;
  let trader: any;
  let apiKey: string;
  let method: any;
  
  beforeAll(async () => {
    await cleanupTestData();
    merchant = await createTestMerchant();
    trader = await createTestTrader();
    apiKey = merchant.token;
    method = await db.method.findFirst({
      where: { merchantMethods: { some: { merchantId: merchant.id } } },
    });
    
    // Create test app with the API
    app = new Elysia()
      .use(merchantPayoutsApi);
  });
  
  afterAll(async () => {
    await cleanupTestData();
  });
  
  describe("POST /payouts", () => {
    test("should create payout with valid API key", async () => {
      const response = await app.handle(
        new Request("http://localhost/payouts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
          },
          body: JSON.stringify({
            amount: 10000,
            wallet: "41001234567890",
            bank: "SBER",
            isCard: true,
            methodId: method.id,
            merchantRate: 100,
            externalReference: "API-TEST-001",
            webhookUrl: "https://example.com/webhook",
            metadata: { orderId: "12345" },
          }),
        })
      );
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.payout).toBeDefined();
      expect(data.payout.amount).toBe(10000);
      expect(data.payout.status).toBe("CREATED");
      expect(data.payout.numericId).toBeGreaterThan(0);
    });
    
    test("should reject with invalid API key", async () => {
      const response = await app.handle(
        new Request("http://localhost/payouts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": "invalid-key",
          },
          body: JSON.stringify({
            amount: 10000,
            wallet: "41001234567890",
            bank: "SBER",
            isCard: true,
            methodId: method.id,
            merchantRate: 100,
          }),
        })
      );
      
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Invalid API key");
    });
    
    test("should validate amount minimum", async () => {
      const response = await app.handle(
        new Request("http://localhost/payouts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
          },
          body: JSON.stringify({
            amount: 50, // Below minimum
            wallet: "41001234567890",
            bank: "SBER",
            isCard: true,
            methodId: method.id,
            merchantRate: 100,
          }),
        })
      );
      
      expect(response.status).toBe(400);
    });
  });
  
  describe("GET /payouts/:id", () => {
    test("should get payout by ID", async () => {
      const payout = await payoutService.createPayout({
        merchantId: merchant.id,
        amount: 5000,
        wallet: "41001234567890",
        bank: "SBER",
        isCard: true,
        methodId: method.id,
        merchantRate: 100,
      });
      
      const response = await app.handle(
        new Request(`http://localhost/payouts/${payout.id}`, {
          method: "GET",
          headers: {
            "x-api-key": apiKey,
          },
        })
      );
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.payout.id).toBe(payout.id);
      expect(data.payout.amount).toBe(5000);
    });
    
    test("should not get payout from another merchant", async () => {
      const anotherMerchant = await createTestMerchant();
      const payout = await payoutService.createPayout({
        merchantId: anotherMerchant.id,
        amount: 5000,
        wallet: "41001234567890",
        bank: "SBER",
        isCard: true,
        methodId: method.id,
        merchantRate: 100,
      });
      
      const response = await app.handle(
        new Request(`http://localhost/payouts/${payout.id}`, {
          method: "GET",
          headers: {
            "x-api-key": apiKey,
          },
        })
      );
      
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("Payout not found");
    });
  });
  
  describe("POST /payouts/:id/approve", () => {
    test("should approve payout in checking status", async () => {
      const payout = await payoutService.createPayout({
        merchantId: merchant.id,
        amount: 5000,
        wallet: "41001234567890",
        bank: "SBER",
        isCard: true,
        merchantRate: 100,
      });
      
      // Simulate trader accepting and confirming
      await db.user.update({
        where: { id: trader.id },
        data: { payoutBalance: 10000 },
      });
      await payoutService.acceptPayout(payout.id, trader.id);
      await payoutService.confirmPayout(payout.id, trader.id, ["proof.jpg"]);
      
      const response = await app.handle(
        new Request(`http://localhost/payouts/${payout.id}/approve`, {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
          },
        })
      );
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.payout.status).toBe("COMPLETED");
    });
  });
  
  describe("POST /payouts/:id/dispute", () => {
    test("should create dispute with files", async () => {
      const payout = await payoutService.createPayout({
        merchantId: merchant.id,
        amount: 7000,
        wallet: "41001234567890",
        bank: "SBER",
        isCard: true,
        merchantRate: 100,
      });
      
      // Get to checking status
      await db.user.update({
        where: { id: trader.id },
        data: { payoutBalance: 10000 },
      });
      await payoutService.acceptPayout(payout.id, trader.id);
      await payoutService.confirmPayout(payout.id, trader.id, ["proof.jpg"]);
      
      const response = await app.handle(
        new Request(`http://localhost/payouts/${payout.id}/dispute`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
          },
          body: JSON.stringify({
            message: "Amount mismatch - received 6500 instead of 7000",
            files: [
              "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAY...",
              "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA..."
            ],
          }),
        })
      );
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.payout.status).toBe("DISPUTED");
    });
    
    test("should validate file sizes", async () => {
      const payout = await payoutService.createPayout({
        merchantId: merchant.id,
        amount: 7000,
        wallet: "41001234567890",
        bank: "SBER",
        isCard: true,
        merchantRate: 100,
      });
      
      // Get to checking status
      await db.user.update({
        where: { id: trader.id },
        data: { payoutBalance: 10000 },
      });
      await payoutService.acceptPayout(payout.id, trader.id);
      await payoutService.confirmPayout(payout.id, trader.id, ["proof.jpg"]);
      
      // Create a large base64 string (simulating > 15MB file)
      const largeFile = "data:image/jpeg;base64," + "A".repeat(20 * 1024 * 1024);
      
      const response = await app.handle(
        new Request(`http://localhost/payouts/${payout.id}/dispute`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
          },
          body: JSON.stringify({
            message: "File too large test",
            files: [largeFile],
          }),
        })
      );
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("File exceeds maximum size");
    });
  });
  
  describe("PATCH /payouts/:id/cancel", () => {
    test("should cancel payout with reason code", async () => {
      const payout = await payoutService.createPayout({
        merchantId: merchant.id,
        amount: 3000,
        wallet: "41001234567890",
        bank: "SBER",
        isCard: true,
        merchantRate: 100,
      });
      
      const response = await app.handle(
        new Request(`http://localhost/payouts/${payout.id}/cancel`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
          },
          body: JSON.stringify({
            reasonCode: "DUPLICATE_ORDER",
          }),
        })
      );
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.payout.status).toBe("CANCELLED");
      expect(data.payout.cancelReasonCode).toBe("DUPLICATE_ORDER");
    });
  });
  
  describe("PATCH /payouts/:id/rate", () => {
    test("should update payout rate and amount", async () => {
      const payout = await payoutService.createPayout({
        merchantId: merchant.id,
        amount: 5000,
        wallet: "41001234567890",
        bank: "SBER",
        isCard: true,
        merchantRate: 100,
      });
      
      const response = await app.handle(
        new Request(`http://localhost/payouts/${payout.id}/rate`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
          },
          body: JSON.stringify({
            merchantRate: 102,
            amount: 6000,
          }),
        })
      );
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.payout.merchantRate).toBe(102);
      expect(data.payout.amount).toBe(6000);
      expect(data.payout.rate).toBe(102);
    });
  });
  
  describe("GET /payouts", () => {
    test("should list payouts with filters", async () => {
      // Create multiple payouts
      await payoutService.createPayout({
        merchantId: merchant.id,
        amount: 1000,
        wallet: "41001234567890",
        bank: "SBER",
        isCard: true,
        merchantRate: 100,
        direction: "OUT",
      });
      
      await payoutService.createPayout({
        merchantId: merchant.id,
        amount: 2000,
        wallet: "41001234567890",
        bank: "SBER",
        isCard: true,
        merchantRate: 100,
        direction: "IN",
      });
      
      const response = await app.handle(
        new Request("http://localhost/payouts?direction=OUT&limit=10", {
          method: "GET",
          headers: {
            "x-api-key": apiKey,
          },
        })
      );
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeArray();
      expect(data.data.every((p: any) => p.direction === "OUT")).toBe(true);
      expect(data.meta.limit).toBe(10);
    });
  });
});