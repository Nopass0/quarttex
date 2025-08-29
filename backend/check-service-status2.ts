import { db } from "./src/db";

async function checkServiceStatus() {
  console.log("=== ПРОВЕРКА СТАТУСА СЕРВИСОВ ОБРАБОТКИ УВЕДОМЛЕНИЙ ===\n");
  
  // Проверяем конфигурацию сервисов
  const serviceConfigs = await db.serviceConfig.findMany({
    where: {
      serviceKey: {
        in: ["notification_auto_processor", "notification_matcher"]
      }
    }
  });
  
  console.log("Конфигурации сервисов:");
  serviceConfigs.forEach(config => {
    console.log(`\n${config.serviceKey}:`);
    console.log(`- Включен: ${config.isEnabled}`);
    console.log(`- Конфигурация:`, JSON.stringify(config.config, null, 2));
  });
  
  // Проверяем запущенные сервисы
  const services = await db.service.findMany({
    where: {
      displayName: {
        contains: "Notification"
      }
    }
  });
  
  console.log("\n\nЗапущенные сервисы:");
  services.forEach(service => {
    console.log(`\n${service.displayName}:`);
    console.log(`- ID: ${service.id}`);
    console.log(`- Включен: ${service.enabled}`);
    console.log(`- Статус: ${service.status}`);
    console.log(`- Последняя активность: ${service.lastActiveAt}`);
    const publicFields = service.publicFields as any;
    if (publicFields?.stats) {
      console.log(`- Статистика:`, publicFields.stats);
    }
  });
  
  // Сбрасываем обработку для уведомления и транзакции
  const notificationId = "cmducamog00gjik5wrickzdxu";
  const transactionId = "cmdu6pfbl0433ik5jkgjl768q";
  
  console.log("\n\n=== СБРОС ОБРАБОТКИ ДЛЯ ПОВТОРНОЙ ПОПЫТКИ ===");
  
  // Сбрасываем уведомление
  await db.notification.update({
    where: { id: notificationId },
    data: {
      isProcessed: false,
      metadata: {}
    }
  });
  console.log(`✅ Уведомление ${notificationId} сброшено для повторной обработки`);
  
  // Проверяем статус транзакции
  const tx = await db.transaction.findUnique({
    where: { id: transactionId }
  });
  console.log(`\nТекущий статус транзакции: ${tx?.status}`);
  
  if (tx?.status === "READY") {
    console.log("⚠️  Транзакция уже в статусе READY, сопоставление может не сработать");
  }
}

checkServiceStatus().catch(console.error).finally(() => process.exit(0));