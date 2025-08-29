import { db } from "./src/db";

async function updateMerchantRates() {
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

    console.log("Found merchant:", merchant.name, "ID:", merchant.id);

    // Обновляем транзакции, добавляя merchantRate
    // Используем разные курсы для демонстрации
    const rates = [105.5, 106.2, 104.8, 107.1, 105.9]; // Разные курсы USDT/RUB
    
    const transactions = await db.transaction.findMany({
      where: {
        merchantId: merchant.id,
        type: "IN",
        status: "READY",
        merchantRate: null
      }
    });

    console.log("Found", transactions.length, "transactions without merchantRate");

    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      const rate = rates[i % rates.length]; // Циклически используем курсы
      
      await db.transaction.update({
        where: { id: tx.id },
        data: { merchantRate: rate }
      });
      
      console.log(`Updated transaction ${tx.id} with rate ${rate}`);
    }

    console.log("\nAll transactions updated!");
    
    // Теперь давайте проверим расчет
    const updatedTransactions = await db.transaction.findMany({
      where: {
        merchantId: merchant.id,
        type: "IN",
        status: "READY"
      },
      include: {
        method: true
      }
    });

    console.log("\n=== Checking USDT calculations ===");
    let totalUsdt = 0;
    let totalRub = 0;

    for (const tx of updatedTransactions) {
      if (tx.merchantRate && tx.merchantRate > 0) {
        const commission = tx.amount * (tx.method.commissionPayin / 100);
        const netAmount = tx.amount - commission;
        
        // Расчет в USDT
        const dealUsdt = tx.amount / tx.merchantRate;
        const commissionUsdt = dealUsdt * (tx.method.commissionPayin / 100);
        const netUsdt = dealUsdt - commissionUsdt;
        const truncatedUsdt = Math.floor(netUsdt * 100) / 100;
        
        console.log(`\nTransaction ${tx.id}:`);
        console.log(`  Amount: ${tx.amount} RUB`);
        console.log(`  Rate: ${tx.merchantRate}`);
        console.log(`  Deal in USDT: ${dealUsdt.toFixed(4)}`);
        console.log(`  Commission ${tx.method.commissionPayin}%: ${commissionUsdt.toFixed(4)} USDT`);
        console.log(`  Net USDT: ${netUsdt.toFixed(4)}`);
        console.log(`  Truncated: ${truncatedUsdt} USDT`);
        
        totalUsdt += truncatedUsdt;
        totalRub += netAmount;
      }
    }

    console.log("\n=== TOTALS ===");
    console.log("Total RUB (after commission):", totalRub.toFixed(2));
    console.log("Total USDT:", totalUsdt.toFixed(2));

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await db.$disconnect();
  }
}

updateMerchantRates();