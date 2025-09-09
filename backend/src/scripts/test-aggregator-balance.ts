#!/usr/bin/env bun
import { db } from "@/db";

async function testAggregatorBalance() {
  console.log("=== Testing Aggregator Balance System ===\n");

  try {
    // Найдем или создадим тестового агрегатора
    let aggregator = await db.aggregator.findFirst({
      where: { name: "Test Aggregator" }
    });

    if (!aggregator) {
      console.log("Creating test aggregator...");
      aggregator = await db.aggregator.create({
        data: {
          name: "Test Aggregator",
          email: "test@aggregator.com",
          password: "test123456",
          apiBaseUrl: "https://test.example.com",
          apiToken: "test-token-123",
          callbackToken: "callback-token-123",
          isActive: true,
          balanceUsdt: 5000,
          depositUsdt: 1500, // Больше минимума в 1000
          balanceNoRequisite: 0,
          balanceSuccess: 0,
          balanceExpired: 0,
          totalPlatformProfit: 0
        }
      });
    }

    console.log("Test Aggregator:", {
      id: aggregator.id,
      name: aggregator.name,
      balanceUsdt: aggregator.balanceUsdt,
      depositUsdt: aggregator.depositUsdt,
      balanceNoRequisite: aggregator.balanceNoRequisite,
      balanceSuccess: aggregator.balanceSuccess,
      balanceExpired: aggregator.balanceExpired,
      totalPlatformProfit: aggregator.totalPlatformProfit
    });

    // Проверяем минимальный депозит
    console.log("\n--- Checking Deposit Requirements ---");
    if (aggregator.depositUsdt >= 1000) {
      console.log("✅ Deposit sufficient for receiving traffic:", aggregator.depositUsdt, "USDT");
    } else {
      console.log("❌ Deposit insufficient:", aggregator.depositUsdt, "USDT (minimum: 1000 USDT)");
    }

    // Симулируем расчет стоимости сделки
    console.log("\n--- Simulating Deal Cost Calculation ---");
    const dealAmountRub = 10000; // 10,000 RUB
    const rate = 100; // 1 USDT = 100 RUB
    const aggregatorFeePercent = 2; // 2% fee
    
    const baseAmountUsdt = dealAmountRub / rate;
    const feeAmountUsdt = baseAmountUsdt * (aggregatorFeePercent / 100);
    const totalCostUsdt = baseAmountUsdt + feeAmountUsdt;

    console.log("Deal amount (RUB):", dealAmountRub);
    console.log("Rate (RUB/USDT):", rate);
    console.log("Base amount (USDT):", baseAmountUsdt);
    console.log("Fee percentage:", aggregatorFeePercent + "%");
    console.log("Fee amount (USDT):", feeAmountUsdt);
    console.log("Total cost (USDT):", totalCostUsdt);

    // Симулируем расчет прибыли платформы
    console.log("\n--- Platform Profit Calculation ---");
    const merchantFeePercent = 3; // 3% fee for merchant
    const merchantFeeAmountUsdt = baseAmountUsdt * (merchantFeePercent / 100);
    const merchantTotalCostUsdt = baseAmountUsdt + merchantFeeAmountUsdt;
    const platformProfit = merchantTotalCostUsdt - totalCostUsdt;

    console.log("Merchant fee percentage:", merchantFeePercent + "%");
    console.log("Merchant total cost (USDT):", merchantTotalCostUsdt);
    console.log("Aggregator total cost (USDT):", totalCostUsdt);
    console.log("Platform profit (USDT):", platformProfit);

    // Тестируем обновление метрик
    console.log("\n--- Testing Metrics Update ---");
    
    // Симулируем NO_REQUISITE
    await db.aggregator.update({
      where: { id: aggregator.id },
      data: {
        balanceNoRequisite: { increment: baseAmountUsdt }
      }
    });
    console.log("✅ Updated NO_REQUISITE balance: +", baseAmountUsdt, "USDT");

    // Симулируем SUCCESS
    await db.aggregator.update({
      where: { id: aggregator.id },
      data: {
        balanceSuccess: { increment: baseAmountUsdt },
        balanceUsdt: { decrement: totalCostUsdt },
        totalPlatformProfit: { increment: platformProfit }
      }
    });
    console.log("✅ Updated SUCCESS balance: +", baseAmountUsdt, "USDT");
    console.log("✅ Deducted from main balance: -", totalCostUsdt, "USDT");
    console.log("✅ Added platform profit: +", platformProfit, "USDT");

    // Получаем финальное состояние
    const updatedAggregator = await db.aggregator.findUnique({
      where: { id: aggregator.id }
    });

    console.log("\n--- Final Aggregator State ---");
    console.log({
      balanceUsdt: updatedAggregator?.balanceUsdt,
      depositUsdt: updatedAggregator?.depositUsdt,
      balanceNoRequisite: updatedAggregator?.balanceNoRequisite,
      balanceSuccess: updatedAggregator?.balanceSuccess,
      balanceExpired: updatedAggregator?.balanceExpired,
      totalPlatformProfit: updatedAggregator?.totalPlatformProfit
    });

    // Тестируем создание fee configuration
    console.log("\n--- Testing Fee Configuration ---");
    
    const method = await db.method.findFirst();
    if (method) {
      const existingFee = await db.aggregatorMethodFee.findUnique({
        where: {
          aggregatorId_methodId: {
            aggregatorId: aggregator.id,
            methodId: method.id
          }
        }
      });

      if (!existingFee) {
        const fee = await db.aggregatorMethodFee.create({
          data: {
            aggregatorId: aggregator.id,
            methodId: method.id,
            feePercent: 2.5
          }
        });
        console.log("✅ Created fee configuration:", {
          method: method.name,
          feePercent: fee.feePercent + "%"
        });
      } else {
        console.log("Fee configuration exists:", {
          method: method.name,
          feePercent: existingFee.feePercent + "%"
        });
      }
    }

    console.log("\n✅ All tests completed successfully!");

  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await db.$disconnect();
  }
}

testAggregatorBalance();