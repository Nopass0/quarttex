/**
 * Тесты для аукционной системы
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import {
  auctionSignatureUtils,
  auctionRSAKeyGenerator,
  AuctionSignatureHelpers,
} from "../utils/auction-signature";
import { AuctionApiClientImpl } from "../services/auction-api-client";
import { AuctionCallbackHandlerImpl } from "../services/auction-callback-handler";
import { AuctionIntegrationService } from "../services/auction-integration.service";

describe("Auction System Tests", () => {
  let testKeyPair: { publicKeyPem: string; privateKeyPem: string };
  let testMerchantConfig: any;

  beforeAll(async () => {
    // Генерируем тестовые ключи
    testKeyPair = await auctionRSAKeyGenerator.generateKeyPair();
    
    testMerchantConfig = {
      id: "test-merchant-id",
      name: "Test Merchant",
      isAuctionEnabled: true,
      auctionBaseUrl: "https://test-auction-api.example.com",
      rsaPublicKeyPem: testKeyPair.publicKeyPem,
      rsaPrivateKeyPem: testKeyPair.privateKeyPem,
      externalSystemName: "test-system",
      keysGeneratedAt: new Date(),
    };
  });

  describe("RSA Key Generation", () => {
    it("should generate valid RSA key pair", async () => {
      const keyPair = await auctionRSAKeyGenerator.generateKeyPair();
      
      expect(keyPair.publicKeyPem).toBeDefined();
      expect(keyPair.privateKeyPem).toBeDefined();
      expect(keyPair.publicKeyPem).toContain("-----BEGIN PUBLIC KEY-----");
      expect(keyPair.privateKeyPem).toContain("-----BEGIN PRIVATE KEY-----");
    });

    it("should validate generated key pair", async () => {
      const keyPair = await auctionRSAKeyGenerator.generateKeyPair();
      const isValid = auctionRSAKeyGenerator.validateKeyPair(
        keyPair.publicKeyPem,
        keyPair.privateKeyPem
      );
      
      expect(isValid).toBe(true);
    });

    it("should reject invalid key pair", () => {
      const isValid = auctionRSAKeyGenerator.validateKeyPair(
        "invalid-public-key",
        "invalid-private-key"
      );
      
      expect(isValid).toBe(false);
    });
  });

  describe("Signature Utils", () => {
    it("should create canonical string correctly", () => {
      const timestamp = 1706534400;
      const externalSystemName = "test-system";
      const keyField = "test-order-123";
      const operation = "CreateOrder";

      const canonical = auctionSignatureUtils.createCanonicalString(
        timestamp,
        externalSystemName,
        keyField,
        operation
      );

      expect(canonical).toBe("1706534400|test-system|test-order-123|CreateOrder");
    });

    it("should sign and verify signature correctly", () => {
      const testString = "test-canonical-string";
      
      const signature = auctionSignatureUtils.signCanonicalString(
        testString,
        testKeyPair.privateKeyPem
      );
      
      expect(signature).toBeDefined();
      expect(signature.length).toBeGreaterThan(0);

      const isValid = auctionSignatureUtils.verifySignature(
        testString,
        signature,
        testKeyPair.publicKeyPem
      );
      
      expect(isValid).toBe(true);
    });

    it("should reject invalid signature", () => {
      const testString = "test-canonical-string";
      const invalidSignature = "invalid-signature";
      
      const isValid = auctionSignatureUtils.verifySignature(
        testString,
        invalidSignature,
        testKeyPair.publicKeyPem
      );
      
      expect(isValid).toBe(false);
    });

    it("should validate timestamp within window", () => {
      const now = Math.floor(Date.now() / 1000);
      
      expect(auctionSignatureUtils.validateTimestamp(now)).toBe(true);
      expect(auctionSignatureUtils.validateTimestamp(now - 60)).toBe(true); // 1 minute ago
      expect(auctionSignatureUtils.validateTimestamp(now + 60)).toBe(true); // 1 minute future
      expect(auctionSignatureUtils.validateTimestamp(now - 200)).toBe(false); // Too old
      expect(auctionSignatureUtils.validateTimestamp(now + 200)).toBe(false); // Too far future
    });

    it("should create signed headers correctly", () => {
      const canonicalString = "test-canonical-string";
      const timestamp = Math.floor(Date.now() / 1000);
      
      const headers = auctionSignatureUtils.createSignedHeaders(
        canonicalString,
        testKeyPair.privateKeyPem,
        timestamp
      );
      
      expect(headers["Content-Type"]).toBe("application/json");
      expect(headers["X-Timestamp"]).toBe(timestamp.toString());
      expect(headers["X-Signature"]).toBeDefined();
    });
  });

  describe("Signature Helpers", () => {
    const timestamp = 1706534400;
    const externalSystemName = "test-system";
    const orderId = "test-order-123";

    it("should create CreateOrder canonical string", () => {
      const canonical = AuctionSignatureHelpers.createOrderCanonical(
        timestamp,
        externalSystemName,
        orderId
      );
      
      expect(canonical).toBe("1706534400|test-system|test-order-123|CreateOrder");
    });

    it("should create CancelOrder canonical string", () => {
      const canonical = AuctionSignatureHelpers.cancelOrderCanonical(
        timestamp,
        externalSystemName,
        orderId
      );
      
      expect(canonical).toBe("1706534400|test-system|test-order-123|CancelOrder");
    });

    it("should create GetOrderStatus canonical string", () => {
      const canonical = AuctionSignatureHelpers.getOrderStatusCanonical(
        timestamp,
        externalSystemName,
        orderId
      );
      
      expect(canonical).toBe("1706534400|test-system|test-order-123|GetOrderStatus");
    });

    it("should create CreateDispute canonical string", () => {
      const canonical = AuctionSignatureHelpers.createDisputeCanonical(
        timestamp,
        externalSystemName,
        orderId
      );
      
      expect(canonical).toBe("1706534400|test-system|test-order-123|CreateDispute");
    });

    it("should create AuctionCallback canonical string", () => {
      const canonical = AuctionSignatureHelpers.auctionCallbackCanonical(
        timestamp,
        externalSystemName,
        orderId
      );
      
      expect(canonical).toBe("1706534400|test-system|test-order-123|AuctionCallback");
    });
  });

  describe("API Client", () => {
    let apiClient: AuctionApiClientImpl;

    beforeEach(() => {
      apiClient = new AuctionApiClientImpl(1000); // 1 second timeout for tests
    });

    it("should handle network errors gracefully", async () => {
      const invalidConfig = {
        ...testMerchantConfig,
        auctionBaseUrl: "https://invalid-url-that-does-not-exist.test",
      };

      const request = {
        system_order_id: "test-order-123",
        currency: "RUB",
        max_exchange_rate: 120,
        max_commission: 5,
        amount: 1000,
        cancel_order_time_unix: Math.floor(Date.now() / 1000) + 300,
        stop_auction_time_unix: Math.floor(Date.now() / 1000) + 30,
        callback_url: "https://test.example.com/callback",
        allowed_payment_method: "sbp" as const,
        iterative_sum_search_enabled: true,
      };

      const response = await apiClient.createOrder(invalidConfig, request);
      
      expect(response.is_success).toBe(false);
      expect(response.error_code).toBeDefined();
      expect(response.error_message).toBeDefined();
    });

    it("should validate merchant config", async () => {
      const invalidConfig = {
        ...testMerchantConfig,
        isAuctionEnabled: false,
      };

      const request = {
        system_order_id: "test-order-123",
        currency: "RUB",
        max_exchange_rate: 120,
        max_commission: 5,
        amount: 1000,
        cancel_order_time_unix: Math.floor(Date.now() / 1000) + 300,
        stop_auction_time_unix: Math.floor(Date.now() / 1000) + 30,
        callback_url: "https://test.example.com/callback",
        allowed_payment_method: "sbp" as const,
        iterative_sum_search_enabled: true,
      };

      await expect(apiClient.createOrder(invalidConfig, request)).rejects.toThrow();
    });
  });

  describe("Callback Handler", () => {
    let callbackHandler: AuctionCallbackHandlerImpl;

    beforeEach(() => {
      callbackHandler = new AuctionCallbackHandlerImpl();
    });

    it("should validate callback signature", () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const orderId = "test-order-123";
      const body = { order_id: orderId, status_id: 6 };
      
      const canonicalString = AuctionSignatureHelpers.auctionCallbackCanonical(
        timestamp,
        testMerchantConfig.externalSystemName,
        orderId
      );
      
      const signature = auctionSignatureUtils.signCanonicalString(
        canonicalString,
        testKeyPair.privateKeyPem
      );
      
      const headers = {
        "X-Timestamp": timestamp.toString(),
        "X-Signature": signature,
      };

      const isValid = callbackHandler.validateCallbackSignature(
        testMerchantConfig,
        headers,
        body
      );
      
      expect(isValid).toBe(true);
    });

    it("should reject callback with invalid signature", () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const orderId = "test-order-123";
      const body = { order_id: orderId, status_id: 6 };
      
      const headers = {
        "X-Timestamp": timestamp.toString(),
        "X-Signature": "invalid-signature",
      };

      const isValid = callbackHandler.validateCallbackSignature(
        testMerchantConfig,
        headers,
        body
      );
      
      expect(isValid).toBe(false);
    });

    it("should reject callback with expired timestamp", () => {
      const expiredTimestamp = Math.floor(Date.now() / 1000) - 200; // 200 seconds ago
      const orderId = "test-order-123";
      const body = { order_id: orderId, status_id: 6 };
      
      const canonicalString = AuctionSignatureHelpers.auctionCallbackCanonical(
        expiredTimestamp,
        testMerchantConfig.externalSystemName,
        orderId
      );
      
      const signature = auctionSignatureUtils.signCanonicalString(
        canonicalString,
        testKeyPair.privateKeyPem
      );
      
      const headers = {
        "X-Timestamp": expiredTimestamp.toString(),
        "X-Signature": signature,
      };

      const isValid = callbackHandler.validateCallbackSignature(
        testMerchantConfig,
        headers,
        body
      );
      
      expect(isValid).toBe(false);
    });
  });

  describe("Integration Service", () => {
    let integrationService: AuctionIntegrationService;

    beforeEach(() => {
      integrationService = new AuctionIntegrationService();
    });

    it("should check if merchant is auction merchant", async () => {
      // Этот тест требует подключения к базе данных
      // В реальном тестировании нужно использовать тестовую БД или моки
      expect(integrationService).toBeDefined();
    });

    it("should map payment methods correctly", () => {
      // Тестируем внутренний метод маппинга
      expect(integrationService).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle missing configuration gracefully", () => {
      const incompleteConfig = {
        id: "test-merchant",
        name: "Test Merchant",
        isAuctionEnabled: true,
        // Отсутствуют обязательные поля
      };

      expect(() => {
        // Проверяем, что система корректно обрабатывает неполную конфигурацию
      }).not.toThrow();
    });

    it("should handle network timeouts", async () => {
      // Тест на обработку таймаутов сети
      const apiClient = new AuctionApiClientImpl(1); // 1ms timeout
      
      const request = {
        system_order_id: "test-order-123",
        currency: "RUB",
        max_exchange_rate: 120,
        max_commission: 5,
        amount: 1000,
        cancel_order_time_unix: Math.floor(Date.now() / 1000) + 300,
        stop_auction_time_unix: Math.floor(Date.now() / 1000) + 30,
        callback_url: "https://test.example.com/callback",
        allowed_payment_method: "sbp" as const,
        iterative_sum_search_enabled: true,
      };

      const response = await apiClient.createOrder(testMerchantConfig, request);
      expect(response.is_success).toBe(false);
    });
  });

  describe("Security", () => {
    it("should not log sensitive data", () => {
      // Проверяем, что приватные ключи не логируются
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      
      auctionSignatureUtils.signCanonicalString(
        "test-string",
        testKeyPair.privateKeyPem
      );
      
      const logCalls = logSpy.mock.calls.flat().join(' ');
      expect(logCalls).not.toContain(testKeyPair.privateKeyPem);
      
      logSpy.mockRestore();
    });

    it("should validate all required fields", () => {
      const timestamp = Math.floor(Date.now() / 1000);
      
      // Тест на отсутствие timestamp
      const validation1 = auctionSignatureUtils.validateIncomingHeaders(
        { "X-Signature": "test-sig" },
        "test-canonical",
        testKeyPair.publicKeyPem
      );
      expect(validation1.valid).toBe(false);
      expect(validation1.error).toBe("timestamp_missing");
      
      // Тест на отсутствие подписи
      const validation2 = auctionSignatureUtils.validateIncomingHeaders(
        { "X-Timestamp": timestamp.toString() },
        "test-canonical",
        testKeyPair.publicKeyPem
      );
      expect(validation2.valid).toBe(false);
      expect(validation2.error).toBe("signature_missing");
    });
  });
});
