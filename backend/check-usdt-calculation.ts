import { db } from "./src/db";

async function checkUsdtCalculation() {
  try {
    // Найдем мерчанта с countInRubEquivalent = false
    const merchant = await db.merchant.findFirst({
      where: {
        countInRubEquivalent: false,
        disabled: false,
        banned: false
      }
    });

    if (!merchant) {
      console.log("No merchant found with countInRubEquivalent = false");
      return;
    }

    console.log("Merchant:", merchant.name, "ID:", merchant.id);
    console.log("countInRubEquivalent:", merchant.countInRubEquivalent);

    // Получаем транзакции этого мерчанта
    const transactions = await db.transaction.findMany({
      where: {
        merchantId: merchant.id,
        type: "IN",
        status: "READY"
      },
      include: {
        method: true
      },
      take: 10
    });

    console.log("\nFound", transactions.length, "successful transactions");

    let totalUsdt = 0;
    let totalRub = 0;

    for (const tx of transactions) {
      console.log("\nTransaction ID:", tx.id);
      console.log("  Amount RUB:", tx.amount);
      console.log("  Merchant Rate:", tx.merchantRate);
      console.log("  Method:", tx.method.name);
      console.log("  Method Commission:", tx.method.commissionPayin, "%");
      
      if (tx.merchantRate && tx.merchantRate > 0) {
        const commission = tx.amount * (tx.method.commissionPayin / 100);
        const netAmount = tx.amount - commission;
        const usdtAmount = netAmount / tx.merchantRate;
        const truncatedUsdt = Math.floor(usdtAmount * 100) / 100;
        
        console.log("  Commission RUB:", commission);
        console.log("  Net Amount RUB:", netAmount);
        console.log("  USDT Amount:", usdtAmount);
        console.log("  Truncated USDT:", truncatedUsdt);
        
        totalUsdt += truncatedUsdt;
        totalRub += netAmount;
      } else {
        console.log("  ⚠️  NO MERCHANT RATE!");
      }
    }

    console.log("\n=== TOTALS ===");
    console.log("Total RUB (after commission):", totalRub);
    console.log("Total USDT:", totalUsdt);

    // Проверим последний settle
    const lastSettle = await db.settleRequest.findFirst({
      where: {
        merchantId: merchant.id,
        status: "COMPLETED"
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    if (lastSettle) {
      console.log("\nLast completed settle:", lastSettle.createdAt);
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await db.$disconnect();
  }
}

checkUsdtCalculation();