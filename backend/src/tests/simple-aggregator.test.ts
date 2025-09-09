import { describe, expect, test } from "bun:test";

describe("Simple Aggregator Integration Test", () => {
  test("aggregator queue service should be importable", async () => {
    const { aggregatorQueueService } = await import("@/services/aggregator-queue.service");
    expect(aggregatorQueueService).toBeDefined();
    expect(typeof aggregatorQueueService.routeDealToAggregators).toBe("function");
  });
  
  test("should handle no aggregators gracefully", async () => {
    const { aggregatorQueueService } = await import("@/services/aggregator-queue.service");
    
    const request = {
      ourDealId: "test_deal_123",
      amount: 5000,
      rate: 95.5,
      paymentMethod: "SBP" as const,
      callbackUrl: "https://test.callback/url",
    };
    
    const result = await aggregatorQueueService.routeDealToAggregators(request);
    
    // Since we don't have any active aggregators in test env, should fail gracefully
    expect(result.success).toBe(false);
    expect(result.triedAggregators).toBeDefined();
    expect(Array.isArray(result.triedAggregators)).toBe(true);
  });
});