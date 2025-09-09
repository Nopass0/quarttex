import { db } from "../db";

async function testDisputeResolutionAdmin() {
  console.log("🧪 Тестирование функционала разрешения споров админом...");

  try {
    // Найдем любой активный спор для тестирования
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
      console.log("❌ Не найдено активных споров для тестирования");
      return;
    }

    console.log("\n📊 Данные спора:");
    console.log(`- ID спора: ${dispute.id}`);
    console.log(`- ID сделки: ${dispute.dealId}`);
    console.log(`- Статус спора: ${dispute.status}`);
    console.log(`- Статус сделки: ${dispute.deal.status}`);
    console.log(`- Сумма заморозки: ${dispute.deal.frozenUsdtAmount || 0} USDT`);
    
    if (dispute.deal.trader) {
      console.log(`\n👤 Данные трейдера (${dispute.deal.trader.name}):`);
      console.log(`- Trust Balance: ${dispute.deal.trader.trustBalance} USDT`);
      console.log(`- Deposit: ${dispute.deal.trader.deposit} USDT`);
      console.log(`- Frozen: ${dispute.deal.trader.frozenUsdt} USDT`);
    }

    // Симулируем разрешение спора в пользу мерчанта
    console.log("\n🔄 Тестируем разрешение в пользу МЕРЧАНТА...");
    
    const merchantResolutionUrl = `http://localhost:3000/admin/deal-disputes/${dispute.id}/resolve`;
    const merchantPayload = {
      inFavorOf: "MERCHANT",
      resolution: "Тестовое разрешение в пользу мерчанта"
    };

    console.log(`📤 POST ${merchantResolutionUrl}`);
    console.log(`📦 Payload:`, JSON.stringify(merchantPayload, null, 2));

    const response = await fetch(merchantResolutionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": "3d3b2e3efa297cae2bc6b19f3f8448ed2b2c7fd43af823a2a3a0585edfbb67d1"
      },
      body: JSON.stringify(merchantPayload)
    });

    if (response.ok) {
      const result = await response.json();
      console.log("✅ Ответ сервера:", result);

      // Проверим изменения в базе данных
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
        console.log("\n📊 Данные после разрешения:");
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
    } else {
      const errorText = await response.text();
      console.log("❌ Ошибка:", response.status, errorText);
    }

  } catch (error) {
    console.error("❌ Ошибка при тестировании разрешения спора:", error);
  }

  console.log("\n🏁 Тестирование завершено");
}

// Запускаем тест
testDisputeResolutionAdmin();
