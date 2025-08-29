import { db } from "@/db";
import axios from 'axios';

async function testBtApi() {
  try {
    // Найдем трейдера и получим его токен
    const trader = await db.user.findFirst({
      where: {
        id: "cmdmyxs1q0001iklukqvj3np7"
      }
    });

    if (!trader) {
      console.log("Trader not found");
      return;
    }

    // Генерируем токен для трейдера (для тестирования используем простой подход)
    const token = "test-trader-token"; // В реальности нужен настоящий JWT токен

    // Проверим прямой запрос к БД
    console.log("=== Direct DB Query ===");
    const directQuery = await db.transaction.findMany({
      where: {
        traderId: trader.id,
        bankDetailId: { not: null },
        requisites: {
          deviceId: null
        }
      },
      include: {
        merchant: true,
        requisites: true
      },
      take: 5
    });

    console.log(`Found ${directQuery.length} BT transactions in DB`);
    directQuery.forEach((tx, i) => {
      console.log(`${i + 1}. Transaction:`, {
        id: tx.id,
        amount: tx.amount,
        status: tx.status,
        merchantName: tx.merchant?.name,
        bankType: tx.requisites?.bankType,
        hasDevice: !!tx.requisites?.deviceId
      });
    });

    // Теперь проверим API эндпоинт
    console.log("\n=== API Request ===");
    try {
      const apiUrl = 'http://localhost:3000/api/trader/bt-entrance/deals';
      console.log(`Requesting: ${apiUrl}`);
      
      // Здесь нужен реальный токен авторизации
      console.log("\nNOTE: To test the API endpoint, you need a valid trader JWT token.");
      console.log("You can get it from the browser's localStorage after logging in as a trader.");
      console.log("Look for 'trader-token' in localStorage or in the Authorization header of API requests.");
      
    } catch (apiError: any) {
      console.error("API Error:", apiError.response?.data || apiError.message);
    }

    await db.$disconnect();
  } catch (error) {
    console.error("Error:", error);
    await db.$disconnect();
  }
}

testBtApi();