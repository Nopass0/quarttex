import { db } from "@/db";

async function debugBtTransactions() {
  try {
    // Найдем трейдера
    const trader = await db.user.findFirst({
      where: {
        id: "cmdmyxs1q0001iklukqvj3np7"
      }
    });

    if (!trader) {
      console.log("Trader not found");
      return;
    }

    console.log("=== Trader Info ===");
    console.log("ID:", trader.id);
    console.log("Name:", trader.name);

    // Найдем все транзакции трейдера
    const allTransactions = await db.transaction.findMany({
      where: {
        traderId: trader.id,
        type: "IN"
      },
      include: {
        requisites: true
      },
      take: 10,
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log("\n=== All Trader Transactions (last 10) ===");
    allTransactions.forEach((tx, index) => {
      console.log(`\n${index + 1}. Transaction ${tx.id}`);
      console.log(`   Amount: ${tx.amount}`);
      console.log(`   Status: ${tx.status}`);
      console.log(`   BankDetailId: ${tx.bankDetailId}`);
      console.log(`   Has requisites: ${!!tx.requisites}`);
      if (tx.requisites) {
        console.log(`   Requisites deviceId: ${tx.requisites.deviceId}`);
        console.log(`   Requisites bank: ${tx.requisites.bankType}`);
      }
    });

    // Проверим транзакции для БТ-входа
    const btTransactions = await db.transaction.findMany({
      where: {
        traderId: trader.id,
        bankDetailId: { not: null },
        requisites: {
          deviceId: null
        }
      },
      include: {
        requisites: true
      }
    });

    console.log(`\n=== BT Transactions (requisites without device) ===`);
    console.log(`Found: ${btTransactions.length}`);
    btTransactions.forEach((tx, index) => {
      console.log(`\n${index + 1}. Transaction ${tx.id}`);
      console.log(`   Amount: ${tx.amount}`);
      console.log(`   Status: ${tx.status}`);
      console.log(`   BankDetailId: ${tx.bankDetailId}`);
    });

    // Проверим транзакции для обычных сделок
    const regularTransactions = await db.transaction.findMany({
      where: {
        traderId: trader.id,
        bankDetailId: { not: null },
        requisites: {
          deviceId: { not: null }
        }
      },
      include: {
        requisites: true
      }
    });

    console.log(`\n=== Regular Transactions (requisites with device) ===`);
    console.log(`Found: ${regularTransactions.length}`);
    regularTransactions.forEach((tx, index) => {
      console.log(`\n${index + 1}. Transaction ${tx.id}`);
      console.log(`   Amount: ${tx.amount}`);
      console.log(`   Status: ${tx.status}`);
      console.log(`   BankDetailId: ${tx.bankDetailId}`);
      console.log(`   Device ID: ${tx.requisites?.deviceId}`);
    });

    await db.$disconnect();
  } catch (error) {
    console.error("Error:", error);
    await db.$disconnect();
  }
}

debugBtTransactions();