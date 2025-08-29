import { db } from "./src/db";
import { Status, TransactionType } from "@prisma/client";

async function debugMatching() {
  const notificationId = "cmducamog00gjik5wrickzdxu";
  const deviceId = "cmdt9zux505qlikybvsxywj6f";
  const amount = 3001;
  const notificationTime = new Date("2025-08-02T14:20:17.000Z");
  
  console.log("=== ОТЛАДКА ЛОГИКИ СОПОСТАВЛЕНИЯ ===\n");
  
  // 1. Получаем устройство с реквизитами
  const device = await db.device.findUnique({
    where: { id: deviceId },
    include: {
      bankDetails: {
        where: {
          isArchived: false
        }
      }
    }
  });
  
  console.log("1. Устройство и реквизиты:");
  console.log(`- Device ID: ${device?.id}`);
  console.log(`- User ID: ${device?.userId}`);
  console.log(`- Реквизиты:`, device?.bankDetails?.map(bd => ({
    id: bd.id,
    bankType: bd.bankType,
    isActive: bd.isActive
  })));
  
  // 2. Ищем подходящие реквизиты для T-Bank
  const bankType = "TBANK"; // из маппинга "Тинькофф" -> "TBANK"
  const eligibleBankDetails = device?.bankDetails?.filter(bd => bd.bankType === bankType) || [];
  
  console.log(`\n2. Подходящие реквизиты для банка ${bankType}:`, eligibleBankDetails.length);
  const bankDetailIds = eligibleBankDetails.map(bd => bd.id);
  console.log("- IDs:", bankDetailIds);
  
  // 3. Ищем транзакции с этими параметрами
  const searchParams = {
    bankDetailId: { in: bankDetailIds },
    type: TransactionType.IN,
    status: Status.IN_PROGRESS,
    amount: {
      gte: amount - 1,
      lte: amount + 1,
    },
    traderId: device?.userId,
    createdAt: {
      gte: new Date(notificationTime.getTime() - 7200000), // 2 часа
      lte: notificationTime,
    },
  };
  
  console.log("\n3. Параметры поиска транзакции:");
  console.log(JSON.stringify(searchParams, null, 2));
  
  const transactions = await db.transaction.findMany({
    where: searchParams,
    include: {
      requisites: true
    }
  });
  
  console.log(`\n4. Найденные транзакции: ${transactions.length}`);
  transactions.forEach((tx, i) => {
    console.log(`\nТранзакция ${i + 1}:`);
    console.log(`- ID: ${tx.id}`);
    console.log(`- Amount: ${tx.amount}`);
    console.log(`- Status: ${tx.status}`);
    console.log(`- BankDetailId: ${tx.bankDetailId}`);
    console.log(`- Created: ${tx.createdAt}`);
  });
  
  // 5. Проверяем все транзакции трейдера для отладки
  console.log("\n\n5. ВСЕ транзакции трейдера на 3001:");
  const allTxs = await db.transaction.findMany({
    where: {
      traderId: device?.userId,
      amount: 3001,
      type: TransactionType.IN
    },
    include: {
      requisites: true
    }
  });
  
  allTxs.forEach(tx => {
    console.log(`\n- ID: ${tx.id}`);
    console.log(`  Status: ${tx.status}`);
    console.log(`  BankDetailId: ${tx.bankDetailId}`);
    console.log(`  Bank: ${tx.requisites?.bankType}`);
    console.log(`  Created: ${tx.createdAt}`);
    console.log(`  В диапазоне времени: ${tx.createdAt >= new Date(notificationTime.getTime() - 7200000) && tx.createdAt <= notificationTime}`);
  });
}

debugMatching().catch(console.error).finally(() => process.exit(0));