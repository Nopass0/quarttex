import { db } from "@/db";

async function checkTransactions() {
  try {
    // Найдем устройство
    const device = await db.device.findFirst({
      where: {
        id: "cmdn0i91l06o7ikcqim2zflxm"
      },
      include: {
        bankDetails: true
      }
    });

    if (!device) {
      console.log("Device not found");
      return;
    }

    const bankDetailIds = device.bankDetails.map(bd => bd.id);
    console.log("Device bank detail IDs:", bankDetailIds);

    // Найдем все активные транзакции для этого трейдера
    const allTransactions = await db.transaction.findMany({
      where: {
        traderId: device.userId,
        type: "IN",
        status: {
          in: ["CREATED", "IN_PROGRESS"]
        }
      },
      include: {
        requisites: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    });

    console.log("\n=== All Trader Transactions ===");
    allTransactions.forEach(tx => {
      const isFromDevice = bankDetailIds.includes(tx.bankDetailId || '');
      console.log({
        id: tx.id,
        amount: tx.amount,
        status: tx.status,
        bankDetailId: tx.bankDetailId,
        fromThisDevice: isFromDevice,
        createdAt: tx.createdAt
      });
    });

    // Найдем транзакции только для реквизитов устройства
    const transactions = allTransactions.filter(tx => 
      bankDetailIds.includes(tx.bankDetailId || '')
    );

    console.log("\n=== Active Transactions ===");
    transactions.forEach(tx => {
      console.log({
        id: tx.id,
        amount: tx.amount,
        status: tx.status,
        bankDetailId: tx.bankDetailId,
        createdAt: tx.createdAt
      });
    });

    // Проверим есть ли транзакции на 4571 и 5982
    console.log("\n=== Looking for specific amounts ===");
    const tx4571 = transactions.find(tx => tx.amount === 4571);
    const tx5982 = transactions.find(tx => tx.amount === 5982);

    console.log("Transaction 4571:", tx4571 ? `Found (ID: ${tx4571.id})` : "Not found");
    console.log("Transaction 5982:", tx5982 ? `Found (ID: ${tx5982.id})` : "Not found");

    await db.$disconnect();
  } catch (error) {
    console.error("Error:", error);
    await db.$disconnect();
  }
}

checkTransactions();