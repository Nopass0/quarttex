#!/usr/bin/env bun
/**
 * Скрипт для исправления отрицательных балансов trustBalance
 * 
 * Этот скрипт:
 * 1. Находит всех трейдеров с отрицательным trustBalance
 * 2. Переносит долг на deposit (если есть средства)
 * 3. Логирует все изменения для аудита
 */

import { db } from "@/db";
import { truncate2 } from "@/utils/rounding";

async function main() {
  console.log("🔍 Поиск трейдеров с отрицательным trustBalance...");

  // Находим всех трейдеров с отрицательным trustBalance
  const tradersWithNegativeBalance = await db.user.findMany({
    where: {
      trustBalance: {
        lt: 0
      }
    },
    select: {
      id: true,
      email: true,
      trustBalance: true,
      deposit: true,
      balanceUsdt: true,
      frozenUsdt: true
    }
  });

  if (tradersWithNegativeBalance.length === 0) {
    console.log("✅ Трейдеров с отрицательным trustBalance не найдено");
    return;
  }

  console.log(`❌ Найдено ${tradersWithNegativeBalance.length} трейдеров с отрицательным trustBalance:`);
  
  for (const trader of tradersWithNegativeBalance) {
    console.log(`\n📊 Трейдер ${trader.email} (${trader.id}):`);
    console.log(`   trustBalance: ${trader.trustBalance}`);
    console.log(`   deposit: ${trader.deposit}`);
    console.log(`   balanceUsdt: ${trader.balanceUsdt}`);
    console.log(`   frozenUsdt: ${trader.frozenUsdt}`);

    const deficit = Math.abs(trader.trustBalance || 0);
    const availableDeposit = trader.deposit || 0;

    if (availableDeposit >= deficit) {
      console.log(`✅ Можно покрыть дефицит ${deficit} из депозита ${availableDeposit}`);
      
      // Покрываем дефицит из депозита
      await db.user.update({
        where: { id: trader.id },
        data: {
          trustBalance: 0, // Обнуляем отрицательный баланс
          deposit: { decrement: truncate2(deficit) } // Списываем из депозита
        }
      });

      console.log(`✅ Исправлено: trustBalance = 0, deposit = ${truncate2(availableDeposit - deficit)}`);
    } else {
      console.log(`⚠️  Недостаточно средств в депозите для покрытия дефицита ${deficit}`);
      console.log(`   Доступно в депозите: ${availableDeposit}`);
      console.log(`   Не хватает: ${truncate2(deficit - availableDeposit)}`);
      
      if (availableDeposit > 0) {
        // Частично покрываем дефицит
        const newTrustBalance = truncate2(trader.trustBalance + availableDeposit);
        
        await db.user.update({
          where: { id: trader.id },
          data: {
            trustBalance: newTrustBalance,
            deposit: 0
          }
        });

        console.log(`⚠️  Частично исправлено: trustBalance = ${newTrustBalance}, deposit = 0`);
      }
    }
  }

  console.log("\n🔍 Проверяем результаты...");
  
  const remainingNegativeBalances = await db.user.findMany({
    where: {
      trustBalance: {
        lt: 0
      }
    },
    select: {
      id: true,
      email: true,
      trustBalance: true,
      deposit: true
    }
  });

  if (remainingNegativeBalances.length === 0) {
    console.log("✅ Все отрицательные балансы исправлены!");
  } else {
    console.log(`⚠️  Осталось ${remainingNegativeBalances.length} трейдеров с отрицательным балансом:`);
    for (const trader of remainingNegativeBalances) {
      console.log(`   ${trader.email}: trustBalance = ${trader.trustBalance}, deposit = ${trader.deposit}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
