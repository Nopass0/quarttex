import { db } from "@/db";
import { randomBytes } from "crypto";
import axios from 'axios';

async function testBtWithSession() {
  try {
    // Найдем трейдера
    const trader = await db.user.findFirst({
      where: {
        id: "cmdmyxs1q0001iklukqvj3np7"
      }
    });

    if (!trader) {
      console.log("Trader not found");
      return;
    }

    // Создаем сессию для трейдера
    const token = randomBytes(32).toString('hex');
    const expiredAt = new Date();
    expiredAt.setDate(expiredAt.getDate() + 30); // 30 дней

    const session = await db.session.create({
      data: {
        token,
        userId: trader.id,
        expiredAt,
        ip: "127.0.0.1"
      }
    });

    console.log("\n=== Created Session ===");
    console.log(`Token: ${token}`);
    console.log(`Expires: ${expiredAt.toISOString()}`);
    console.log("\nTo use in browser console:");
    console.log(`localStorage.setItem('trader-token', '${token}');`);
    console.log("Then reload the page.");

    // Тестируем API эндпоинт
    console.log("\n=== Testing API Endpoint ===");
    try {
      const apiUrl = 'http://localhost:3000/api/trader/bt-entrance/deals';
      console.log(`Requesting: ${apiUrl}`);
      
      const response = await axios.get(apiUrl, {
        headers: {
          'x-trader-token': token
        },
        params: {
          page: 1,
          limit: 50
        }
      });
      
      console.log(`\nAPI Response Status: ${response.status}`);
      console.log(`Total BT deals: ${response.data.total}`);
      console.log(`Deals on page: ${response.data.data?.length || 0}`);
      
      if (response.data.data && response.data.data.length > 0) {
        console.log("\nFirst 3 deals:");
        response.data.data.slice(0, 3).forEach((deal: any, i: number) => {
          console.log(`${i + 1}. Deal #${deal.numericId}:`, {
            amount: deal.amount,
            status: deal.status,
            merchant: deal.merchantName,
            bank: deal.bankType,
            card: deal.cardNumber
          });
        });
      }
      
    } catch (apiError: any) {
      console.error("\nAPI Error:", apiError.response?.data || apiError.message);
      if (apiError.response) {
        console.error("Status:", apiError.response.status);
        console.error("Headers:", apiError.response.headers);
      }
    }

    await db.$disconnect();
  } catch (error) {
    console.error("Error:", error);
    await db.$disconnect();
  }
}

testBtWithSession();