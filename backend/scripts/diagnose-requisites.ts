import { db } from "../src/db";
import { MethodType } from "@prisma/client";

async function diagnoseRequisites() {
  console.log("=== Диагностика проблемы с реквизитами ===\n");

  try {
    // 1. Check all methods
    console.log("1. Все методы в системе:");
    const methods = await db.method.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        isEnabled: true,
        minPayin: true,
        maxPayin: true
      }
    });
    
    for (const method of methods) {
      console.log(`   - ${method.name} (${method.code}): type=${method.type}, enabled=${method.isEnabled}, limits=${method.minPayin}-${method.maxPayin}`);
    }

    // 2. Check merchants
    console.log("\n2. Активные мерчанты:");
    const merchants = await db.merchant.findMany({
      where: {
        banned: false,
        disabled: false
      },
      select: {
        id: true,
        name: true,
        disabled: true,
        banned: true
      }
    });
    
    for (const merchant of merchants) {
      console.log(`   - ${merchant.name}: id=${merchant.id}, disabled=${merchant.disabled}, banned=${merchant.banned}`);
    }

    // 3. Check merchant-method connections
    console.log("\n3. Связи мерчант-метод:");
    const merchantMethods = await db.merchantMethod.findMany({
      include: {
        merchant: {
          select: { name: true }
        },
        method: {
          select: { name: true, type: true }
        }
      }
    });
    
    for (const mm of merchantMethods) {
      console.log(`   - ${mm.merchant.name} → ${mm.method.name}: enabled=${mm.isEnabled}`);
    }

    // 4. Check traders
    console.log("\n4. Активные трейдеры:");
    const traders = await db.user.findMany({
      where: {
        banned: false,
        deposit: { gte: 1000 },
        trafficEnabled: true
      },
      select: {
        id: true,
        email: true,
        name: true,
        deposit: true,
        trustBalance: true,
        frozenUsdt: true,
        trafficEnabled: true,
        minAmountPerRequisite: true,
        maxAmountPerRequisite: true
      }
    });
    
    console.log(`   Найдено трейдеров: ${traders.length}`);
    for (const trader of traders) {
      const availableBalance = trader.trustBalance - trader.frozenUsdt;
      console.log(`   - ${trader.name}: deposit=${trader.deposit}, trustBalance=${trader.trustBalance}, frozen=${trader.frozenUsdt}, available=${availableBalance}, limits=${trader.minAmountPerRequisite}-${trader.maxAmountPerRequisite}`);
    }

    // 5. Check trader-merchant connections
    console.log("\n5. Связи трейдер-мерчант:");
    const traderMerchants = await db.traderMerchant.findMany({
      where: {
        isMerchantEnabled: true,
        isFeeInEnabled: true
      },
      include: {
        trader: {
          select: { name: true, email: true }
        },
        merchant: {
          select: { name: true }
        },
        method: {
          select: { name: true, type: true }
        }
      }
    });
    
    console.log(`   Найдено активных связей: ${traderMerchants.length}`);
    for (const tm of traderMerchants) {
      console.log(`   - ${tm.trader.name} → ${tm.merchant.name} (${tm.method.name}): feeIn=${tm.feeIn}%, merchantEnabled=${tm.isMerchantEnabled}, feeInEnabled=${tm.isFeeInEnabled}`);
    }

    // 6. Check bank details for each method type
    for (const methodType of Object.values(MethodType)) {
      console.log(`\n6. Реквизиты для метода ${methodType}:`);
      
      const bankDetails = await db.bankDetail.findMany({
        where: {
          isArchived: false,
          methodType: methodType,
          user: {
            banned: false,
            deposit: { gte: 1000 },
            trafficEnabled: true
          }
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              deposit: true,
              trustBalance: true,
              frozenUsdt: true
            }
          },
          device: true
        }
      });
      
      console.log(`   Найдено реквизитов: ${bankDetails.length}`);
      
      for (const bd of bankDetails) {
        const deviceStatus = bd.device 
          ? `Device: ${bd.device.name} (online=${bd.device.isOnline}, working=${bd.device.isWorking})` 
          : "No device";
        console.log(`   - ${bd.bankType} ${bd.cardNumber}: owner=${bd.user.name}, limits=${bd.minAmount}-${bd.maxAmount}, ${deviceStatus}`);
      }
    }

    // 7. Check specific SBP requisites
    console.log("\n7. Специфическая проверка SBP реквизитов:");
    const sbpDetails = await db.bankDetail.findMany({
      where: {
        methodType: MethodType.sbp
      },
      include: {
        user: true,
        device: true
      }
    });
    
    console.log(`   Всего SBP реквизитов в базе: ${sbpDetails.length}`);
    for (const bd of sbpDetails) {
      console.log(`\n   Реквизит ${bd.id}:`);
      console.log(`     - Владелец: ${bd.user.email} (${bd.user.name})`);
      console.log(`     - Телефон: ${bd.cardNumber}`); // For SBP, phone is stored in cardNumber
      console.log(`     - Архивирован: ${bd.isArchived}`);
      console.log(`     - Лимиты: ${bd.minAmount}-${bd.maxAmount}`);
      console.log(`     - Трейдер:`);
      console.log(`       - banned: ${bd.user.banned}`);
      console.log(`       - deposit: ${bd.user.deposit}`);
      console.log(`       - trafficEnabled: ${bd.user.trafficEnabled}`);
      console.log(`       - trustBalance: ${bd.user.trustBalance}`);
      console.log(`       - frozenUsdt: ${bd.user.frozenUsdt}`);
      if (bd.device) {
        console.log(`     - Устройство: ${bd.device.name}`);
        console.log(`       - online: ${bd.device.isOnline}`);
        console.log(`       - working: ${bd.device.isWorking}`);
      } else {
        console.log(`     - Устройство: НЕТ`);
      }
    }

    // 8. Check if we need to create SBP requisites
    const sbpMethod = methods.find(m => m.type === MethodType.sbp);
    if (sbpMethod && sbpDetails.length === 0) {
      console.log("\n⚠️  НЕТ SBP РЕКВИЗИТОВ! Нужно создать.");
    }

  } catch (error) {
    console.error("Ошибка:", error);
  } finally {
    await db.$disconnect();
  }
}

diagnoseRequisites();