import { db } from "@/db";
import { Status, TransactionType } from "@prisma/client";

async function main() {
  try {
    // Найдем тестового мерчанта
    const merchant = await db.merchant.findFirst({
      where: { name: { contains: "Test" } }
    });

    if (!merchant) {
      console.log("No test merchant found");
      return;
    }

    console.log(`\n=== Creating test transactions for ${merchant.name} ===`);
    console.log(`countInRubEquivalent: ${merchant.countInRubEquivalent}`);

    // Получим методы
    const methods = await db.method.findMany({
      where: { isEnabled: true }
    });

    // Создадим несколько успешных транзакций с разными курсами
    const transactions = [
      {
        amount: 10000, // 10,000 RUB
        merchantRate: 100, // 100 RUB/USDT
        methodId: methods[0].id,
        status: Status.READY,
      },
      {
        amount: 20000, // 20,000 RUB
        merchantRate: 95, // 95 RUB/USDT
        methodId: methods[0].id,
        status: Status.READY,
      },
      {
        amount: 15000, // 15,000 RUB
        merchantRate: 98, // 98 RUB/USDT
        methodId: methods[1].id,
        status: Status.READY,
      },
    ];

    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      const created = await db.transaction.create({
        data: {
          merchantId: merchant.id,
          methodId: tx.methodId,
          amount: tx.amount,
          merchantRate: tx.merchantRate,
          status: tx.status,
          type: TransactionType.IN,
          orderId: `TEST-${Date.now()}-${i}`,
          clientName: `Test Client ${i + 1}`,
          expired_at: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        }
      });
      
      console.log(`✅ Created transaction ${created.orderId}:`);
      console.log(`   Amount: ${tx.amount} RUB`);
      console.log(`   Merchant Rate: ${tx.merchantRate} RUB/USDT`);
      console.log(`   USDT equivalent: ${(tx.amount / tx.merchantRate).toFixed(2)} USDT`);
    }

    // Создадим одну выплату
    const payout = await db.payout.create({
      data: {
        merchantId: merchant.id,
        methodId: methods[0].id,
        amount: 5000, // 5,000 RUB
        merchantRate: 97, // 97 RUB/USDT
        status: "COMPLETED",
        tradePartnerNumber: "1234567890",
        tradePartnerHolder: "Test Recipient",
      }
    });
    
    console.log(`\n✅ Created payout:`);
    console.log(`   Amount: ${payout.amount} RUB`);
    console.log(`   Merchant Rate: ${payout.merchantRate} RUB/USDT`);
    console.log(`   USDT equivalent: ${(payout.amount / payout.merchantRate!).toFixed(2)} USDT`);

    // Рассчитаем итоговый баланс
    console.log("\n=== BALANCE CALCULATION ===");
    
    const totalDeals = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const method = methods[0];
    const dealsCommission = totalDeals * (method.commissionPayin / 100);
    const payoutCommission = payout.amount * (method.commissionPayout / 100);
    const rubBalance = totalDeals - dealsCommission - payout.amount - payoutCommission;
    
    console.log(`Total deals: ${totalDeals} RUB`);
    console.log(`Deals commission (${method.commissionPayin}%): ${dealsCommission} RUB`);
    console.log(`Payout amount: ${payout.amount} RUB`);
    console.log(`Payout commission (${method.commissionPayout}%): ${payoutCommission} RUB`);
    console.log(`RUB balance: ${rubBalance} RUB`);

    if (!merchant.countInRubEquivalent) {
      // Рассчитаем USDT баланс по курсам транзакций
      let usdtBalance = 0;
      
      for (const tx of transactions) {
        const m = methods.find(m => m.id === tx.methodId);
        const commission = tx.amount * (m!.commissionPayin / 100);
        const netAmount = tx.amount - commission;
        const usdtAmount = netAmount / tx.merchantRate;
        const truncatedUsdt = Math.floor(usdtAmount * 100) / 100;
        usdtBalance += truncatedUsdt;
        console.log(`\nTransaction ${tx.amount} RUB @ ${tx.merchantRate}:`);
        console.log(`  Net amount: ${netAmount} RUB`);
        console.log(`  USDT: ${truncatedUsdt} USDT`);
      }
      
      // Вычитаем выплату
      const payoutTotalWithCommission = payout.amount + payoutCommission;
      const payoutUsdt = payoutTotalWithCommission / payout.merchantRate!;
      const truncatedPayoutUsdt = Math.floor(payoutUsdt * 100) / 100;
      usdtBalance -= truncatedPayoutUsdt;
      
      console.log(`\nPayout ${payout.amount} RUB @ ${payout.merchantRate}:`);
      console.log(`  Total with commission: ${payoutTotalWithCommission} RUB`);
      console.log(`  USDT: ${truncatedPayoutUsdt} USDT`);
      
      console.log(`\n✅ Final USDT balance: ${usdtBalance.toFixed(2)} USDT`);
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await db.$disconnect();
  }
}

main();