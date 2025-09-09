#!/usr/bin/env bun

import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function testMerchantTransaction() {
  try {
    // Найдем мерчанта и его API ключ
    const merchant = await db.merchant.findFirst({
      where: { name: 'Test Merchant' }
    });
    
    if (!merchant) {
      console.log('Merchant not found');
      return;
    }
    
    console.log('Merchant:', merchant.id, merchant.name);
    console.log('Token:', merchant.token);
    console.log('API Key:', merchant.apiKeyPublic);
    
    // Создаем тестовую транзакцию
    const testTransaction = {
      amount: 1500,
      orderId: `test_order_${Date.now()}`,
      methodId: "cmdt3szvx0004ikim5z5iaqcf", // Сбербанк C2C
      rate: 95.0,
      expired_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      userIp: "127.0.0.1",
      userId: `test_user_${Date.now()}`,
      type: "IN",
      isMock: false
    };
    
    console.log('\nCreating transaction:', testTransaction);
    
    // Отправляем запрос на API
    const response = await fetch('http://localhost:3000/api/merchant/transactions/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-merchant-api-key': merchant.token // Используем token, а не apiKeyPublic
      },
      body: JSON.stringify(testTransaction)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('\nError response:', response.status, result);
    } else {
      console.log('\nSuccess! Transaction created:', result);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

testMerchantTransaction();