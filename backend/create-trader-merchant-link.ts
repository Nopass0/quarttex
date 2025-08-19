#!/usr/bin/env bun

import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function createTraderMerchantLink() {
  try {
    // Найдем тестового мерчанта и трейдера
    const merchant = await db.merchant.findFirst({
      where: { name: 'Test Merchant' }
    });
    
    const trader = await db.user.findFirst({
      where: { email: 'trader@test.com' }
    });
    
    const methods = await db.method.findMany({
      where: { type: 'c2c' }
    });
    
    if (!merchant || !trader || methods.length === 0) {
      console.log('Missing data:', { merchant: !!merchant, trader: !!trader, methods: methods.length });
      return;
    }
    
    console.log('Merchant:', merchant.id, merchant.name);
    console.log('Trader:', trader.id, trader.email);
    console.log('Methods:', methods.map(m => `${m.id} (${m.name})`).join(', '));
    
    // Создаем связи для каждого c2c метода
    for (const method of methods) {
      const existing = await db.traderMerchant.findUnique({
        where: {
          traderId_merchantId_methodId: {
            traderId: trader.id,
            merchantId: merchant.id,
            methodId: method.id
          }
        }
      });
      
      if (existing) {
        console.log(`Link already exists for method ${method.name}`);
        continue;
      }
      
      const link = await db.traderMerchant.create({
        data: {
          traderId: trader.id,
          merchantId: merchant.id,
          methodId: method.id,
          feeIn: 0,
          feeOut: 0,
          isFeeInEnabled: true,
          isFeeOutEnabled: true,
          isMerchantEnabled: true
        }
      });
      
      console.log(`Created link for method ${method.name}:`, link.id);
    }
    
    // Также убедимся, что у трейдера правильные настройки
    await db.user.update({
      where: { id: trader.id },
      data: {
        deposit: 5000,
        trafficEnabled: true,
        banned: false,
        trustBalance: 10000,
        minAmountPerRequisite: 100,
        maxAmountPerRequisite: 100000
      }
    });
    
    console.log('\nUpdated trader settings');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

createTraderMerchantLink();