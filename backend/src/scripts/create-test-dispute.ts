import { db } from "../db";
import { Status } from "@prisma/client";

async function createTestDispute() {
  console.log("🔧 Создаем тестовый спор для проверки функционала...");

  try {
    // Найдем любую сделку для создания спора
    const transaction = await db.transaction.findFirst({
      where: {
        status: Status.READY,
        traderId: { not: null },
      },
      include: {
        trader: {
          select: {
            id: true,
            name: true,
            trustBalance: true,
            deposit: true,
            frozenUsdt: true,
          },
        },
        merchant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!transaction) {
      console.log("❌ Не найдено подходящих сделок для создания спора");
      return;
    }

    console.log(`📊 Найдена сделка: ${transaction.id}`);
    console.log(`- Сумма: ${transaction.amount}`);
    console.log(`- Статус: ${transaction.status}`);
    console.log(`- Трейдер: ${transaction.trader?.name}`);
    console.log(`- Мерчант: ${transaction.merchant?.name}`);

    // Проверим, нет ли уже спора по этой сделке
    const existingDispute = await db.dealDispute.findUnique({
      where: { dealId: transaction.id },
    });

    if (existingDispute) {
      console.log(`✅ Спор уже существует: ${existingDispute.id}`);
      console.log(`- Статус: ${existingDispute.status}`);
      return;
    }

    // Создаем тестовый спор
    const dispute = await db.dealDispute.create({
      data: {
        dealId: transaction.id,
        merchantId: transaction.merchantId,
        traderId: transaction.traderId!,
        status: "OPEN",
      },
      include: {
        deal: {
          include: {
            trader: {
              select: {
                id: true,
                name: true,
                trustBalance: true,
                deposit: true,
                frozenUsdt: true,
              },
            },
          },
        },
      },
    });

    console.log(`✅ Создан тестовый спор: ${dispute.id}`);
    console.log(`- Статус спора: ${dispute.status}`);
    console.log(`- ID сделки: ${dispute.dealId}`);
    console.log(`- Статус сделки: ${dispute.deal.status}`);

    if (dispute.deal.trader) {
      console.log(`\n👤 Данные трейдера:`);
      console.log(`- Trust Balance: ${dispute.deal.trader.trustBalance} USDT`);
      console.log(`- Deposit: ${dispute.deal.trader.deposit} USDT`);
      console.log(`- Frozen: ${dispute.deal.trader.frozenUsdt} USDT`);
    }

    console.log(`\n🌐 Теперь можно протестировать по адресу:`);
    console.log(`http://localhost:3001/admin/disputes/deal/${dispute.id}`);

  } catch (error) {
    console.error("❌ Ошибка при создании тестового спора:", error);
  }
}

// Запускаем создание тестового спора
createTestDispute();

