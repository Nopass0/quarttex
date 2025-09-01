import { db } from "@/db";
import { Status } from "@prisma/client";

/**
 * Проверяет, можно ли создать новую сделку на данном реквизите с учетом интервала в минутах
 * @param requisiteId ID реквизита
 * @param intervalMinutes Интервал в минутах между сделками
 * @returns Promise<boolean> - true если можно создать сделку, false если нужно подождать
 */
export async function canCreateDealOnRequisite(
  requisiteId: string, 
  intervalMinutes: number
): Promise<boolean> {
  // Если интервал 0 или отрицательный, ограничения нет
  if (intervalMinutes <= 0) {
    return true;
  }

  // Находим последнюю созданную сделку на этом реквизите
  const lastTransaction = await db.transaction.findFirst({
    where: {
      bankDetailId: requisiteId,
      status: {
        in: [Status.CREATED, Status.IN_PROGRESS, Status.READY, Status.CANCELED]
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Если сделок еще не было, можно создавать
  if (!lastTransaction) {
    return true;
  }

  // Вычисляем разницу во времени
  const now = new Date();
  const lastTransactionTime = lastTransaction.createdAt;
  const diffInMs = now.getTime() - lastTransactionTime.getTime();
  const diffInMinutes = diffInMs / (1000 * 60);

  console.log(`[RequisiteInterval] Проверка интервала для реквизита ${requisiteId}:`);
  console.log(`  - Последняя сделка: ${lastTransactionTime.toISOString()}`);
  console.log(`  - Текущее время: ${now.toISOString()}`);
  console.log(`  - Прошло минут: ${diffInMinutes.toFixed(2)}`);
  console.log(`  - Требуемый интервал: ${intervalMinutes} мин`);
  console.log(`  - Можно создать: ${diffInMinutes >= intervalMinutes}`);

  return diffInMinutes >= intervalMinutes;
}

/**
 * Возвращает время в миллисекундах, которое нужно подождать до следующей сделки
 * @param requisiteId ID реквизита
 * @param intervalMinutes Интервал в минутах между сделками
 * @returns Promise<number> - время ожидания в миллисекундах, 0 если можно создавать сразу
 */
export async function getWaitTimeForNextDeal(
  requisiteId: string, 
  intervalMinutes: number
): Promise<number> {
  // Если интервал 0 или отрицательный, ждать не нужно
  if (intervalMinutes <= 0) {
    return 0;
  }

  // Находим последнюю созданную сделку на этом реквизите
  const lastTransaction = await db.transaction.findFirst({
    where: {
      bankDetailId: requisiteId,
      status: {
        in: [Status.CREATED, Status.IN_PROGRESS, Status.READY, Status.CANCELED]
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Если сделок еще не было, ждать не нужно
  if (!lastTransaction) {
    return 0;
  }

  // Вычисляем сколько нужно подождать
  const now = new Date();
  const lastTransactionTime = lastTransaction.createdAt;
  const nextAllowedTime = new Date(lastTransactionTime.getTime() + intervalMinutes * 60 * 1000);
  
  if (now >= nextAllowedTime) {
    return 0;
  }

  return nextAllowedTime.getTime() - now.getTime();
}
