import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function testNotificationMatching() {
  console.log("=== Тест мэтчинга уведомлений со сделками ===\n");

  try {
    // 1. Получаем трейдера с устройством и реквизитами
    const device = await db.device.findFirst({
      where: {
        user: {
          banned: false
        },
        bankDetails: {
          some: {}
        }
      },
      include: {
        user: true,
        bankDetails: true
      }
    });

    if (!device) {
      console.error("Не найдено устройство с привязанными реквизитами!");
      return;
    }

    console.log(`Устройство: ${device.name}`);
    console.log(`Трейдер: ${device.user.name}`);
    console.log(`Привязанных реквизитов: ${device.bankDetails.length}`);
    
    const bankDetail = device.bankDetails[0];
    console.log(`\nИспользуем реквизит:`);
    console.log(`- Банк: ${bankDetail.bankType}`);
    console.log(`- Карта: ${bankDetail.cardNumber}`);
    console.log(`- ID: ${bankDetail.id}`);

    // 2. Создаем тестовую транзакцию
    console.log("\n=== Создание тестовой транзакции ===");
    
    const testAmount = 1234.56;
    const merchant = await db.merchant.findFirst({
      where: { banned: false, disabled: false }
    });

    if (!merchant) {
      console.error("Активный мерчант не найден!");
      return;
    }

    const method = await db.method.findFirst({
      where: { isEnabled: true }
    });

    if (!method) {
      console.error("Активный метод не найден!");
      return;
    }

    // Создаем транзакцию напрямую в БД
    const transaction = await db.transaction.create({
      data: {
        merchantId: merchant.id,
        amount: testAmount,
        assetOrBank: bankDetail.bankType,
        orderId: `test-matching-${Date.now()}`,
        userId: "test-user",
        callbackUri: "https://example.com/callback",
        successUri: "https://example.com/success",
        failUri: "https://example.com/fail",
        type: "IN",
        expired_at: new Date(Date.now() + 30 * 60 * 1000),
        status: "CREATED",
        rate: 95.5,
        traderId: device.userId,
        methodId: method.id,
        bankDetailId: bankDetail.id,
        clientName: "Test Client",
        commission: 0
      }
    });

    console.log(`✓ Создана транзакция ID: ${transaction.id}`);
    console.log(`  Сумма: ${transaction.amount} RUB`);
    console.log(`  Статус: ${transaction.status}`);
    console.log(`  Реквизит: ${transaction.bankDetailId}`);

    // 3. Создаем уведомление, имитирующее банковское
    console.log("\n=== Создание тестового уведомления ===");

    // Определяем правильный пакет для банка
    const bankPackageMap: Record<string, string> = {
      "SBERBANK": "ru.sberbankmobile",
      "TINKOFF": "ru.tinkoff.mobile.android",
      "VTB": "ru.vtb.mobile",
      "ALFABANK": "com.idamobile.android.alfabank",
      "GAZPROMBANK": "ru.gazprombank.mobile",
      "OZONBANK": "ru.ozon.card"
    };

    const packageName = bankPackageMap[bankDetail.bankType] || "ru.sberbankmobile";

    // Форматируем сумму для уведомления
    const formattedAmount = testAmount.toLocaleString('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).replace(',', '.');

    // Создаем текст уведомления в зависимости от банка
    let notificationText = "";
    switch (bankDetail.bankType) {
      case "SBERBANK":
        notificationText = `Поступление ${formattedAmount} ₽ от *1234`;
        break;
      case "TINKOFF":
        notificationText = `Пополнение +${formattedAmount} ₽`;
        break;
      case "VTB":
        notificationText = `Зачисление ${formattedAmount} RUB`;
        break;
      default:
        notificationText = `Поступление ${formattedAmount} ₽`;
    }

    const notification = await db.notification.create({
      data: {
        type: "AppNotification",
        title: "Поступление",
        message: notificationText,
        deviceId: device.id,
        isRead: false,
        metadata: {
          packageName,
          timestamp: new Date().toISOString(),
          originalAmount: testAmount
        }
      }
    });

    console.log(`✓ Создано уведомление ID: ${notification.id}`);
    console.log(`  Пакет: ${packageName}`);
    console.log(`  Текст: "${notificationText}"`);

    // 4. Ждем обработки NotificationMatcherService
    console.log("\n=== Ожидание обработки (10 секунд) ===");
    console.log("NotificationMatcherService должен обработать уведомление...");
    
    await new Promise(resolve => setTimeout(resolve, 10000));

    // 5. Проверяем результат
    console.log("\n=== Проверка результата ===");

    const updatedTransaction = await db.transaction.findUnique({
      where: { id: transaction.id }
    });

    const updatedNotification = await db.notification.findUnique({
      where: { id: notification.id }
    });

    console.log(`\nТранзакция:`);
    console.log(`- Статус изменился: ${transaction.status} → ${updatedTransaction.status}`);
    console.log(`- Принята: ${updatedTransaction.acceptedAt ? 'Да' : 'Нет'}`);

    console.log(`\nУведомление:`);
    console.log(`- Прочитано: ${updatedNotification.isRead ? 'Да' : 'Нет'}`);

    if (updatedTransaction.status === "READY" && updatedNotification.isRead) {
      console.log("\n✅ Мэтчинг работает корректно!");
    } else {
      console.log("\n⚠️ Мэтчинг не сработал");
      console.log("\nВозможные причины:");
      console.log("1. NotificationMatcherService не запущен");
      console.log("2. Regex паттерн не подходит для формата уведомления");
      console.log("3. Проблема с ассоциацией устройства и реквизита");
      console.log("4. Другие фильтры не пропускают транзакцию");
    }

    // 6. Очистка
    console.log("\n=== Очистка тестовых данных ===");
    await db.transaction.update({
      where: { id: transaction.id },
      data: { status: "CANCELED" }
    });
    await db.notification.delete({
      where: { id: notification.id }
    });
    console.log("✓ Тестовые данные удалены");

  } catch (error) {
    console.error("Ошибка при тестировании:", error);
  }
}

testNotificationMatching()
  .catch(console.error)
  .finally(() => db.$disconnect());