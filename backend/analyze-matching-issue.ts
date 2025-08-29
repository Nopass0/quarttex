import { db } from "./src/db";

async function analyzeIssue() {
  const transactionId = "cmdu6pfbl0433ik5jkgjl768q";
  const notificationId = "cmducamog00gjik5wrickzdxu";
  
  // Получаем детали транзакции
  const tx = await db.transaction.findUnique({
    where: { id: transactionId },
    include: {
      requisites: true,
      trader: true
    }
  });
  
  // Получаем детали уведомления
  const notif = await db.notification.findUnique({
    where: { id: notificationId },
    include: {
      Device: {
        include: {
          bankDetails: true
        }
      }
    }
  });
  
  console.log("=== АНАЛИЗ ПРОБЛЕМЫ СОПОСТАВЛЕНИЯ ===\n");
  
  console.log("Транзакция:");
  console.log(`- ID: ${tx?.id}`);
  console.log(`- Статус: ${tx?.status}`);
  console.log(`- Сумма: ${tx?.amount}`);
  console.log(`- Трейдер ID: ${tx?.traderId}`);
  console.log(`- BankDetail ID: ${tx?.bankDetailId}`);
  console.log(`- Создана: ${tx?.createdAt}`);
  console.log(`- Реквизит: ${tx?.requisites?.bankType} (ID: ${tx?.requisites?.id})`);
  
  console.log("\nУведомление:");
  console.log(`- ID: ${notif?.id}`);
  console.log(`- Сообщение: ${notif?.message}`);
  console.log(`- Устройство: ${notif?.Device?.name} (ID: ${notif?.deviceId})`);
  console.log(`- Пользователь устройства: ${notif?.Device?.userId}`);
  console.log(`- Создано: ${notif?.createdAt}`);
  console.log(`- isProcessed: ${notif?.isProcessed}`);
  console.log(`- Metadata: ${JSON.stringify(notif?.metadata, null, 2)}`);
  
  console.log("\nBankDetails на устройстве:");
  notif?.Device?.bankDetails?.forEach(bd => {
    console.log(`- ${bd.bankType} (ID: ${bd.id}), активен: ${bd.isActive}`);
  });
  
  console.log("\n=== ПРОВЕРКА УСЛОВИЙ СОПОСТАВЛЕНИЯ ===");
  
  // Проверка 1: BankDetail ID
  const deviceBankDetailIds = notif?.Device?.bankDetails?.map(bd => bd.id) || [];
  const txBankDetailInDevice = deviceBankDetailIds.includes(tx?.bankDetailId || '');
  console.log(`\n1. BankDetail транзакции (${tx?.bankDetailId}) есть на устройстве: ${txBankDetailInDevice}`);
  
  // Проверка 2: Сумма
  console.log(`\n2. Сумма совпадает: ${tx?.amount === 3001}`);
  
  // Проверка 3: Тип транзакции
  console.log(`\n3. Тип транзакции IN: ${tx?.type === 'IN'}`);
  
  // Проверка 4: Статус
  const validStatuses = ['CREATED', 'IN_PROGRESS'];
  console.log(`\n4. Статус в допустимых (${validStatuses.join(', ')}): ${validStatuses.includes(tx?.status || '')}`);
  
  // Проверка 5: Трейдер
  const traderMatch = tx?.traderId === notif?.Device?.userId;
  console.log(`\n5. Трейдер совпадает с пользователем устройства:`);
  console.log(`   - Трейдер транзакции: ${tx?.traderId}`);
  console.log(`   - Пользователь устройства: ${notif?.Device?.userId}`);
  console.log(`   - Совпадает: ${traderMatch}`);
  
  // Проверка времени
  const txTime = tx?.createdAt?.getTime() || 0;
  const notifTime = notif?.createdAt?.getTime() || 0;
  const timeDiff = (notifTime - txTime) / 1000 / 60; // в минутах
  console.log(`\n6. Временная разница: ${timeDiff.toFixed(1)} минут`);
  
  // Поиск других транзакций на эту же сумму
  console.log("\n=== ДРУГИЕ ТРАНЗАКЦИИ НА ЭТУ СУММУ ===");
  const otherTxs = await db.transaction.findMany({
    where: {
      amount: 3001,
      type: "IN",
      traderId: tx?.traderId
    },
    include: {
      requisites: true
    }
  });
  
  otherTxs.forEach(otx => {
    console.log(`\n- ID: ${otx.id}`);
    console.log(`  Статус: ${otx.status}`);
    console.log(`  BankDetail: ${otx.bankDetailId}`);
    console.log(`  Создана: ${otx.createdAt}`);
    console.log(`  Реквизит: ${otx.requisites?.bankType}`);
  });
}

analyzeIssue().catch(console.error).finally(() => process.exit(0));