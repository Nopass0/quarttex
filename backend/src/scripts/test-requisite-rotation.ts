import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function testRequisiteRotation() {
  console.log("=== Тест ротации реквизитов ===\n");

  // Получаем активного мерчанта
  const merchant = await db.merchant.findFirst({
    where: {
      banned: false,
      disabled: false,
    }
  });

  if (!merchant || !merchant.token) {
    console.error("Активный мерчант не найден");
    return;
  }

  console.log(`Мерчант: ${merchant.name}`);
  console.log(`API Token: ${merchant.token}`);

  // Получаем метод оплаты
  const method = await db.method.findFirst({
    where: {
      isEnabled: true
    }
  });

  if (!method) {
    console.error("Активный метод оплаты не найден");
    return;
  }

  // Получаем курс
  const rate = await db.rateSettings.findFirst({
    where: {
      methodId: method.id
    }
  });

  if (!rate) {
    console.error("Активный курс не найден");
    return;
  }

  // Получаем все активные реквизиты для этого метода
  const activeRequisites = await db.bankDetail.findMany({
    where: {
      isArchived: false,
      methodType: method.type,
      user: {
        banned: false,
        deposit: { gt: 0 },
        teamId: { not: null },
        trafficEnabled: true
      }
    },
    orderBy: { updatedAt: "asc" },
    include: { user: true }
  });

  console.log(`\nНайдено активных реквизитов: ${activeRequisites.length}`);
  console.log(`Метод оплаты: ${method.type}`);
  
  if (activeRequisites.length < 2) {
    console.error("Недостаточно активных реквизитов для теста ротации (нужно минимум 2)");
    return;
  }

  console.log("\nПорядок реквизитов перед созданием транзакций:");
  activeRequisites.forEach((req, index) => {
    console.log(`${index + 1}. Реквизит ID: ${req.id}, Трейдер: ${req.user.username}, Обновлен: ${req.updatedAt.toISOString()}`);
  });

  // Создаем несколько транзакций подряд
  const apiUrl = "http://localhost:3000/merchant/transactions/create";
  const apiKey = merchant.token;
  
  console.log("\n=== Создание транзакций ===");
  console.log(`URL: ${apiUrl}`);
  console.log(`API Key: ${apiKey}`);
  
  const usedRequisites: string[] = [];
  
  for (let i = 0; i < 3; i++) {
    console.log(`\nСоздание транзакции ${i + 1}:`);
    
    const requestBody = {
      amount: 1000 + i * 100, // Разные суммы для уникальности
      orderId: `test-order-${Date.now()}-${i}`,
      methodId: method.id,
      type: "IN",
      rate: 95.5,
      expired_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 минут
    };
    
    console.log(`Request body:`, requestBody);
    
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-merchant-api-key": apiKey
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`Ошибка: ${response.status} - ${error}`);
        continue;
      }

      const result = await response.json();
      console.log(`✓ Транзакция создана: ID ${result.transaction.id}`);
      console.log(`  Использован реквизит: ${result.transaction.bankDetailId}`);
      console.log(`  Трейдер: ${result.transaction.traderId}`);
      
      usedRequisites.push(result.transaction.bankDetailId);
      
      // Небольшая задержка между запросами
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`Ошибка при создании транзакции: ${error}`);
    }
  }

  console.log("\n=== Анализ результатов ===");
  
  // Проверяем, что использовались разные реквизиты
  const uniqueRequisites = new Set(usedRequisites);
  console.log(`\nИспользовано уникальных реквизитов: ${uniqueRequisites.size} из ${usedRequisites.length} транзакций`);
  
  if (uniqueRequisites.size === usedRequisites.length) {
    console.log("✓ Ротация работает корректно: каждая транзакция использовала разный реквизит");
  } else {
    console.log("⚠ Возможная проблема с ротацией: некоторые реквизиты использовались повторно");
  }

  // Получаем обновленный порядок реквизитов
  const updatedRequisites = await db.bankDetail.findMany({
    where: {
      isArchived: false,
      methodType: method.type,
      user: {
        banned: false,
        deposit: { gt: 0 },
        teamId: { not: null },
        trafficEnabled: true
      }
    },
    orderBy: { updatedAt: "asc" },
    include: { user: true }
  });

  console.log("\nПорядок реквизитов после создания транзакций:");
  updatedRequisites.forEach((req, index) => {
    const wasUsed = usedRequisites.includes(req.id) ? " (✓ использован)" : "";
    console.log(`${index + 1}. Реквизит ID: ${req.id}, Трейдер: ${req.user.username}, Обновлен: ${req.updatedAt.toISOString()}${wasUsed}`);
  });

  // Очистка - отменяем созданные транзакции
  console.log("\n=== Очистка тестовых данных ===");
  const testTransactions = await db.transaction.findMany({
    where: {
      orderId: { contains: "test-order-" },
      createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } // Последние 5 минут
    }
  });

  for (const tx of testTransactions) {
    await db.transaction.update({
      where: { id: tx.id },
      data: { status: "CANCELED" }
    });
  }
  
  console.log(`Отменено ${testTransactions.length} тестовых транзакций`);
}

testRequisiteRotation()
  .catch(console.error)
  .finally(() => db.$disconnect());