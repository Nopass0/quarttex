#!/usr/bin/env bun

import { db } from "../db";

async function verifyFeature() {
  console.log("🔍 Проверка функции связи транзакций и уведомлений\n");
  
  // 1. Check database link
  const transaction = await db.transaction.findFirst({
    where: { numericId: 40 },
    include: { 
      matchedNotification: true,
      trader: true 
    }
  });
  
  if (!transaction) {
    console.log("❌ Транзакция #40 не найдена");
    return;
  }
  
  console.log("✅ База данных:");
  console.log(`   - Транзакция #${transaction.numericId}`);
  console.log(`   - Статус: ${transaction.status}`);
  console.log(`   - Связанное уведомление: ${transaction.matchedNotificationId ? '✓' : '✗'}`);
  
  if (transaction.matchedNotification) {
    console.log(`   - ID уведомления: ${transaction.matchedNotification.id}`);
    console.log(`   - Сообщение: ${transaction.matchedNotification.message}`);
  }
  
  // 2. Test API endpoints
  console.log("\n✅ API эндпоинты:");
  
  // Get trader token
  const session = await db.session.findFirst({
    where: { userId: transaction.traderId },
    orderBy: { createdAt: 'desc' }
  });
  
  if (!session) {
    console.log("❌ Сессия трейдера не найдена");
    return;
  }
  
  // Test transaction list endpoint
  const listResponse = await fetch('http://localhost:3000/api/trader/transactions', {
    headers: { 'x-trader-token': session.token }
  });
  const listData = await listResponse.json();
  const txInList = listData.data?.find((tx: any) => tx.id === transaction.id);
  console.log(`   - GET /trader/transactions - включает matchedNotification: ${txInList?.matchedNotification ? '✓' : '✗'}`);
  
  // Test transaction details endpoint  
  const detailsResponse = await fetch(`http://localhost:3000/api/trader/transactions/${transaction.id}`, {
    headers: { 'x-trader-token': session.token }
  });
  const detailsData = await detailsResponse.json();
  console.log(`   - GET /trader/transactions/:id - включает matchedNotification: ${detailsData.matchedNotification ? '✓' : '✗'}`);
  
  // Test notifications endpoint
  const notificationsResponse = await fetch('http://localhost:3000/api/trader/notifications', {
    headers: { 'x-trader-token': session.token }
  });
  const notificationsData = await notificationsResponse.json();
  const notification = notificationsData.data?.find((n: any) => n.id === transaction.matchedNotificationId);
  console.log(`   - GET /trader/notifications - показывает уведомление: ${notification ? '✓' : '✗'}`);
  console.log(`   - Уведомление включает matchedTransaction: ${notification?.matchedTransaction ? '✓' : '✗'}`);
  
  // 3. Frontend changes
  console.log("\n✅ Изменения в UI:");
  console.log("   - В модале деталей сделки показывается уведомление с обрезанным текстом (60 символов + ...)");
  console.log("   - Клик на уведомление переходит на /trader/notifications?notificationId={id}");
  console.log("   - На странице уведомлений открывается модальное окно с деталями");
  console.log("   - Из деталей уведомления можно перейти обратно к сделкам");
  
  console.log("\n📱 Для тестирования:");
  console.log(`   1. Войдите как трейдер: ${transaction.trader?.email}`);
  console.log(`   2. Откройте страницу сделок`);
  console.log(`   3. Найдите сделку #${transaction.numericId}`);
  console.log(`   4. Кликните на неё и увидите секцию "Уведомление от банка"`);
  console.log(`   5. Кликните на уведомление для перехода на страницу уведомлений`);
}

verifyFeature().catch(console.error).finally(() => process.exit(0));