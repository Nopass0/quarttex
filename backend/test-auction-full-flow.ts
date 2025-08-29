/**
 * Полный тест аукционного флоу:
 * 1. Создание заказа через API
 * 2. Изменение статуса транзакции
 * 3. Автоматическая отправка callback'ов внешней системе
 */

import { db } from "@/db";
import { Status } from "@prisma/client";
import { auctionSignatureUtils } from "@/utils/auction-signature";
import { CreateOrderRequest } from "@/types/auction";
import { sendTransactionCallbacks } from "@/utils/notify";
import { createServer } from "http";

class AuctionFullFlowTester {
  private testServer: any = null;
  private receivedCallbacks: any[] = [];
  private serverPort = 3334;
  private merchantId = "";
  private privateKey = "";
  private externalSystemName = "test-auction-system";

  async startTestServer() {
    return new Promise<void>((resolve) => {
      this.testServer = createServer((req, res) => {
        if (req.method === 'POST') {
          let body = '';
          
          req.on('data', chunk => {
            body += chunk.toString();
          });
          
          req.on('end', () => {
            try {
              const callback = JSON.parse(body);
              console.log(`📥 [${req.url}] Получен callback:`, callback);
              
              this.receivedCallbacks.push({
                url: req.url,
                headers: req.headers,
                body: callback,
                timestamp: new Date()
              });
              
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ status: 'received' }));
            } catch (error) {
              res.writeHead(400);
              res.end('Invalid JSON');
            }
          });
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
      });

      this.testServer.listen(this.serverPort, () => {
        console.log(`🌐 Тестовый сервер запущен на порту ${this.serverPort}`);
        resolve();
      });
    });
  }

  async stopTestServer() {
    if (this.testServer) {
      this.testServer.close();
      console.log("🛑 Тестовый сервер остановлен");
    }
  }

  async setupAuctionMerchant() {
    console.log("🔧 Настройка аукционного мерчанта для тестирования...");

    const merchant = await db.merchant.findFirst({
      where: { name: "Test Auction Merchant" }
    });

    if (!merchant) {
      throw new Error("Аукционный мерчант не найден");
    }

    this.merchantId = merchant.id;
    this.privateKey = merchant.rsaPrivateKeyPem!;

    // Обновляем URL для callback'ов на наш тестовый сервер
    await db.merchant.update({
      where: { id: merchant.id },
      data: { auctionBaseUrl: `http://localhost:${this.serverPort}` }
    });

    console.log(`✅ Мерчант настроен: ${merchant.name} (ID: ${this.merchantId})`);
  }

  /**
   * Создает заказ через аукционный API
   */
  async createOrderViaAPI() {
    console.log("\n📡 Создаем заказ через аукционный API...");

    const systemOrderId = `FULL_FLOW_TEST_${Date.now()}`;
    const timestamp = Math.floor(Date.now() / 1000);
    
    const request: CreateOrderRequest = {
      system_order_id: systemOrderId,
      currency: "USDT",
      max_exchange_rate: 100.0,
      max_commission: 2.5,
      amount: 7500,
      cancel_order_time_unix: timestamp + 600,
      stop_auction_time_unix: timestamp + 300,
      callback_url: `http://localhost:${this.serverPort}/external-callback`,
      allowed_payment_method: "sbp",
      iterative_sum_search_enabled: true,
      allowed_bank_name: "Сбербанк"
    };

    // Создаем подпись
    const canonicalString = auctionSignatureUtils.createCanonicalString(
      timestamp,
      this.externalSystemName,
      systemOrderId,
      "CreateOrder"
    );

    const signature = auctionSignatureUtils.signCanonicalString(canonicalString, this.privateKey);

    // Отправляем запрос
    const response = await fetch("http://localhost:3000/api/auction/external/CreateOrder", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Timestamp": timestamp.toString(),
        "X-Signature": signature,
      },
      body: JSON.stringify(request)
    });

    const result = await response.json();

    if (result.is_success) {
      console.log("✅ Заказ создан через API:");
      console.log(`   External Order ID: ${result.external_order_id}`);
      console.log(`   System Order ID: ${systemOrderId}`);
      console.log(`   Реквизиты:`, result.payment_details);
      
      return {
        externalOrderId: result.external_order_id,
        systemOrderId,
        transaction: result
      };
    } else {
      throw new Error(`Ошибка создания заказа: ${result.error_message}`);
    }
  }

  /**
   * Симулирует жизненный цикл транзакции с callback'ами
   */
  async simulateTransactionLifecycle(externalOrderId: string) {
    console.log("\n🔄 Симулируем жизненный цикл транзакции...");

    const transaction = await db.transaction.findFirst({
      where: { id: externalOrderId },
      include: {
        merchant: true,
        method: true,
        trader: true,
        requisites: true,
      }
    });

    if (!transaction) {
      throw new Error("Транзакция не найдена");
    }

    // Очищаем callback'и перед началом
    this.receivedCallbacks = [];

    // Шаг 1: IN_PROGRESS
    console.log("\n📈 Шаг 1: Переводим в IN_PROGRESS...");
    await db.transaction.update({
      where: { id: transaction.id },
      data: { status: Status.IN_PROGRESS }
    });

    // Отправляем callback
    const updatedTx1 = await db.transaction.findFirst({
      where: { id: transaction.id },
      include: { merchant: true, method: true, trader: true, requisites: true }
    });
    await sendTransactionCallbacks(updatedTx1!);

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Шаг 2: READY  
    console.log("\n📈 Шаг 2: Завершаем транзакцию (READY)...");
    await db.transaction.update({
      where: { id: transaction.id },
      data: { status: Status.READY, acceptedAt: new Date() }
    });

    const updatedTx2 = await db.transaction.findFirst({
      where: { id: transaction.id },
      include: { merchant: true, method: true, trader: true, requisites: true }
    });
    await sendTransactionCallbacks(updatedTx2!);

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Анализируем результаты
    console.log(`\n📊 Анализ callback'ов за жизненный цикл:`);
    console.log(`   Всего получено: ${this.receivedCallbacks.length}`);

    let auctionCallbacks = 0;
    let merchantCallbacks = 0;

    this.receivedCallbacks.forEach((cb, index) => {
      console.log(`\n   Callback ${index + 1}:`);
      console.log(`     URL: ${cb.url}`);
      console.log(`     Время: ${cb.timestamp.toISOString()}`);
      
      if (cb.body.order_id) {
        console.log(`     Тип: Аукционный (order_id: ${cb.body.order_id}, status_id: ${cb.body.status_id})`);
        console.log(`     RSA подпись: ${cb.headers['x-signature'] ? 'есть' : 'нет'}`);
        auctionCallbacks++;
      } else {
        console.log(`     Тип: Мерчантский (id: ${cb.body.id}, status: ${cb.body.status})`);
        merchantCallbacks++;
      }
    });

    console.log(`\n📈 Итоговая статистика:`);
    console.log(`   Аукционных callback'ов: ${auctionCallbacks}`);
    console.log(`   Мерчантских callback'ов: ${merchantCallbacks}`);

    return {
      total: this.receivedCallbacks.length,
      auctionCallbacks,
      merchantCallbacks
    };
  }

  /**
   * Полный тест аукционного флоу
   */
  async runFullFlowTest() {
    console.log("🚀 Полный тест аукционного флоу с callback'ами");
    console.log("=".repeat(60));

    try {
      // 1. Настройка
      await this.startTestServer();
      await this.setupAuctionMerchant();

      // 2. Создание заказа
      const order = await this.createOrderViaAPI();

      // 3. Симуляция жизненного цикла
      const stats = await this.simulateTransactionLifecycle(order.externalOrderId);

      console.log("\n🎉 Полный тест завершен!");
      console.log(`📊 Результат: ${stats.total} callback'ов (${stats.auctionCallbacks} аукционных + ${stats.merchantCallbacks} мерчантских)`);

      if (stats.auctionCallbacks >= 2) {
        console.log("✅ Аукционные callback'и работают корректно!");
      } else {
        console.log("❌ Аукционные callback'и работают не полностью!");
      }

    } catch (error) {
      console.error("💥 Ошибка полного теста:", error);
    } finally {
      await this.stopTestServer();
    }
  }
}

// Запуск тестирования
async function main() {
  const tester = new AuctionFullFlowTester();
  await tester.runFullFlowTest();
  process.exit(0);
}

if (require.main === module) {
  main().catch(console.error);
}

export { AuctionFullFlowTester };
