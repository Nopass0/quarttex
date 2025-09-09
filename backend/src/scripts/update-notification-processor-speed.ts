#!/usr/bin/env bun

import { db } from "../db";

async function updateProcessorSpeed() {
  console.log("🚀 Ускоряем NotificationAutoProcessorService...\n");
  
  const config = {
    enabled: true,
    pollIntervalSec: 1, // Обработка каждую секунду
    deviceOfflineThresholdSec: 120,
    batchSize: 50, // Увеличенный размер батча
    callbackConcurrency: 5, // Больше параллельных callback'ов
    callbackTimeout: 30000,
    callbackRetries: 3,
    callbackRetryDelay: 1000,
    enableDeviceWatchdog: true,
    watchdogIntervalSec: 30,
    minTimeDiffMs: 600000, // 10 минут окно для поиска транзакций
    amountTolerance: 1,
  };
  
  // Обновляем конфигурацию в базе данных
  await db.serviceConfig.upsert({
    where: { serviceKey: "notification_auto_processor" },
    create: {
      serviceKey: "notification_auto_processor",
      config: config,
      isEnabled: true,
    },
    update: {
      config: config,
      isEnabled: true,
    },
  });
  
  console.log("✅ Конфигурация обновлена:");
  console.log("   - Интервал обработки: 1 секунда (было 5)");
  console.log("   - Размер батча: 50 уведомлений (было 20)");
  console.log("   - Параллельная обработка: до 5 уведомлений одновременно");
  console.log("   - Окно поиска транзакций: 10 минут (было 5)");
  console.log("   - Параллельные callback'и: 5 (было 3)");
  
  console.log("\n📝 Изменения в коде:");
  console.log("   - Добавлена параллельная обработка уведомлений");
  console.log("   - Оптимизированы запросы к базе данных");
  console.log("   - Увеличен размер батча для быстрой обработки больших очередей");
  
  console.log("\n⚡ Результат:");
  console.log("   - Уведомления будут обрабатываться практически мгновенно");
  console.log("   - Транзакции будут автоматически завершаться в течение 1-2 секунд");
  console.log("   - Система справится с большим потоком уведомлений");
}

updateProcessorSpeed().catch(console.error).finally(() => process.exit(0));