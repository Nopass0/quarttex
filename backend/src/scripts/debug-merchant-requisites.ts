#!/usr/bin/env bun

import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function debugMerchantRequisites() {
  try {
    // Найдем тестового мерчанта
    const merchant = await db.merchant.findFirst({
      where: { name: 'Test Merchant' }
    });
    
    if (!merchant) {
      console.log('Test merchant not found');
      return;
    }
    
    console.log('Merchant:', merchant.id, merchant.name);
    console.log('');
    
    // Проверим связи мерчанта с трейдерами
    const connectedTraders = await db.traderMerchant.findMany({
      where: { merchantId: merchant.id },
      include: {
        trader: true,
        method: true
      }
    });
    
    console.log(`Connected traders: ${connectedTraders.length}`);
    connectedTraders.forEach(ct => {
      console.log(`- Trader: ${ct.trader.email}, Method: ${ct.method.name} (${ct.method.type})`);
    });
    console.log('');
    
    const traderIds = connectedTraders.map(ct => ct.traderId);
    
    // Проверим реквизиты трейдеров
    const allRequisites = await db.bankDetail.findMany({
      where: {
        userId: { in: traderIds }
      },
      include: {
        user: true,
        device: true
      }
    });
    
    console.log(`All requisites for connected traders: ${allRequisites.length}`);
    for (const req of allRequisites) {
      console.log(`- Req ${req.id}:`);
      console.log(`  - methodType: ${req.methodType}`);
      console.log(`  - isArchived: ${req.isArchived}`);
      console.log(`  - isActive: ${req.isActive}`);
      console.log(`  - user.banned: ${req.user.banned}`);
      console.log(`  - user.deposit: ${req.user.deposit}`);
      console.log(`  - user.trafficEnabled: ${req.user.trafficEnabled}`);
      // Загружаем свежие данные устройства
      const freshDevice = req.deviceId ? await db.device.findUnique({ where: { id: req.deviceId } }) : null;
      console.log(`  - device: ${freshDevice ? `${freshDevice.id} (working: ${freshDevice.isWorking}, online: ${freshDevice.isOnline})` : 'null'}`);
    }
    console.log('');
    
    // Проверим фильтры
    const filteredRequisites = await db.bankDetail.findMany({
      where: {
        isArchived: false,
        isActive: true,
        methodType: 'c2c',
        userId: { in: traderIds },
        user: { 
          banned: false,
          deposit: { gte: 1000 },
          trafficEnabled: true
        },
        OR: [
          { deviceId: null },
          { device: { isWorking: true, isOnline: true } }
        ]
      },
      include: { user: true, device: true },
    });
    
    console.log(`Filtered requisites (as per merchant API): ${filteredRequisites.length}`);
    
    // Проверим каждый фильтр отдельно
    console.log('\nChecking filters separately:');
    
    const step1 = await db.bankDetail.count({
      where: {
        userId: { in: traderIds }
      }
    });
    console.log(`Step 1 - Trader IDs filter: ${step1}`);
    
    const step2 = await db.bankDetail.count({
      where: {
        userId: { in: traderIds },
        isArchived: false
      }
    });
    console.log(`Step 2 - + isArchived=false: ${step2}`);
    
    const step3 = await db.bankDetail.count({
      where: {
        userId: { in: traderIds },
        isArchived: false,
        isActive: true
      }
    });
    console.log(`Step 3 - + isActive=true: ${step3}`);
    
    const step4 = await db.bankDetail.count({
      where: {
        userId: { in: traderIds },
        isArchived: false,
        isActive: true,
        methodType: 'c2c'
      }
    });
    console.log(`Step 4 - + methodType=c2c: ${step4}`);
    
    const step5 = await db.bankDetail.count({
      where: {
        userId: { in: traderIds },
        isArchived: false,
        isActive: true,
        methodType: 'c2c',
        user: { 
          banned: false
        }
      }
    });
    console.log(`Step 5 - + user.banned=false: ${step5}`);
    
    const step6 = await db.bankDetail.count({
      where: {
        userId: { in: traderIds },
        isArchived: false,
        isActive: true,
        methodType: 'c2c',
        user: { 
          banned: false,
          deposit: { gte: 1000 }
        }
      }
    });
    console.log(`Step 6 - + user.deposit>=1000: ${step6}`);
    
    const step7 = await db.bankDetail.count({
      where: {
        userId: { in: traderIds },
        isArchived: false,
        isActive: true,
        methodType: 'c2c',
        user: { 
          banned: false,
          deposit: { gte: 1000 },
          trafficEnabled: true
        }
      }
    });
    console.log(`Step 7 - + user.trafficEnabled=true: ${step7}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

debugMerchantRequisites();