import { db } from "../db";

// Прямой тест через базу данных без HTTP API
async function testDirectAPI() {
  console.log("🧪 Прямое тестирование логики разрешения споров...");

  try {
    // Найдем активный спор
    const dispute = await db.dealDispute.findFirst({
      where: {
        status: {
          in: ["OPEN", "IN_PROGRESS"]
        }
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
                frozenUsdt: true
              }
            }
          }
        }
      }
    });

    if (!dispute) {
      console.log("❌ Нет активных споров");
      return;
    }

    console.log(`📊 Найден спор: ${dispute.id}`);
    console.log(`- Статус спора: ${dispute.status}`);
    console.log(`- Статус сделки: ${dispute.deal.status}`);
    console.log(`- Сумма заморозки: ${dispute.deal.frozenUsdtAmount || 0} USDT`);

    if (dispute.deal.trader) {
      console.log(`\n👤 Трейдер (${dispute.deal.trader.name}):`);
      console.log(`- Trust Balance: ${dispute.deal.trader.trustBalance} USDT`);
      console.log(`- Deposit: ${dispute.deal.trader.deposit} USDT`);
      console.log(`- Frozen: ${dispute.deal.trader.frozenUsdt} USDT`);
    }

    // Применяем нашу логику напрямую
    console.log("\n🔄 Применяем логику разрешения в пользу МЕРЧАНТА...");
    
    await db.$transaction(async (tx) => {
      // Обновляем статус спора
      await tx.dealDispute.update({
        where: { id: dispute.id },
        data: {
          status: "RESOLVED_SUCCESS",
          resolution: "Тестовое разрешение в пользу мерчанта (прямой тест)",
          resolvedAt: new Date(),
        },
      });

      // Добавляем системное сообщение
      await tx.dealDisputeMessage.create({
        data: {
          disputeId: dispute.id,
          senderId: "system",
          senderType: "ADMIN",
          message: "Спор разрешен администратором в пользу мерчанта (прямой тест)",
        },
      });

      // Применяем логику для сделки
      const deal = dispute.deal;
      const frozenAmount = deal.frozenUsdtAmount || 0;

      // В пользу мерчанта - сделка становится EXPIRED
      await tx.transaction.update({
        where: { id: dispute.dealId },
        data: {
          status: "EXPIRED",
        },
      });

      // Если сделка была READY, списываем с баланса/депозита
      if (deal.status === "READY" && deal.traderId && frozenAmount > 0) {
        const trader = await tx.user.findUnique({
          where: { id: deal.traderId },
          select: { trustBalance: true, deposit: true }
        });

        if (trader) {
          const roundedFrozenAmount = Math.ceil(frozenAmount * 100) / 100;
          
          if (trader.trustBalance >= roundedFrozenAmount) {
            await tx.user.update({
              where: { id: deal.traderId },
              data: {
                frozenUsdt: { decrement: frozenAmount },
                trustBalance: { decrement: roundedFrozenAmount },
              },
            });
            console.log(`✅ Списано ${roundedFrozenAmount} USDT с trust balance`);
          } else {
            const remainingAmount = roundedFrozenAmount - trader.trustBalance;
            await tx.user.update({
              where: { id: deal.traderId },
              data: {
                frozenUsdt: { decrement: frozenAmount },
                trustBalance: 0,
                deposit: { decrement: remainingAmount },
              },
            });
            console.log(`✅ Списано ${trader.trustBalance} USDT с trust balance и ${remainingAmount} USDT с депозита`);
          }
        }
      } else {
        // Просто разморозить
        if (frozenAmount > 0 && deal.traderId) {
          await tx.user.update({
            where: { id: deal.traderId },
            data: {
              frozenUsdt: { decrement: frozenAmount },
            },
          });
          console.log(`✅ Разморожено ${frozenAmount} USDT`);
        }
      }
    });

    // Проверяем результат
    const updatedDispute = await db.dealDispute.findUnique({
      where: { id: dispute.id },
      include: {
        deal: {
          include: {
            trader: {
              select: {
                id: true,
                name: true,
                trustBalance: true,
                deposit: true,
                frozenUsdt: true
              }
            }
          }
        }
      }
    });

    if (updatedDispute) {
      console.log("\n📊 Результат:");
      console.log(`- Статус спора: ${updatedDispute.status}`);
      console.log(`- Статус сделки: ${updatedDispute.deal.status}`);
      console.log(`- Решение: ${updatedDispute.resolution}`);
      
      if (updatedDispute.deal.trader) {
        console.log(`\n👤 Обновленные данные трейдера:`);
        console.log(`- Trust Balance: ${updatedDispute.deal.trader.trustBalance} USDT`);
        console.log(`- Deposit: ${updatedDispute.deal.trader.deposit} USDT`);
        console.log(`- Frozen: ${updatedDispute.deal.trader.frozenUsdt} USDT`);
      }
    }

    console.log("\n✅ Прямой тест выполнен успешно!");

  } catch (error) {
    console.error("❌ Ошибка при прямом тестировании:", error);
  }
}

testDirectAPI();

