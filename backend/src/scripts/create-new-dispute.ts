import { db } from "../db";
import { Status } from "@prisma/client";

async function createNewDispute() {
  try {
    // Найдем сделку без спора
    const transaction = await db.transaction.findFirst({
      where: {
        status: Status.READY,
        traderId: { not: null },
        dealDispute: null, // У сделки нет спора
      },
    });

    if (!transaction) {
      console.log("Нет подходящих сделок для создания спора");
      return;
    }

    // Создаем новый спор
    const dispute = await db.dealDispute.create({
      data: {
        dealId: transaction.id,
        merchantId: transaction.merchantId,
        traderId: transaction.traderId!,
        status: "OPEN",
      },
    });

    console.log(`Создан новый спор: ${dispute.id}`);
    console.log(`Для сделки: ${transaction.id}`);
    console.log(`URL для тестирования: http://localhost:3001/admin/disputes/deal/${dispute.id}`);

  } catch (error) {
    console.error("Ошибка:", error);
  }
}

createNewDispute();

