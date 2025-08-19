#!/usr/bin/env bun

import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function checkPoolDetails() {
  try {
    const merchantId = 'cmdt3szvd0002ikimoy8ozixi';
    const methodId = 'cmdt3szvx0004ikim5z5iaqcf';
    
    // 1. Получаем метод
    const method = await db.method.findUnique({
      where: { id: methodId }
    });
    console.log('Method type:', method?.type);
    
    // 2. Проверяем трейдеров подключенных к мерчанту
    const connectedTraders = await db.traderMerchant.findMany({
      where: {
        merchantId,
        methodId,
        isMerchantEnabled: true,
        isFeeInEnabled: true
      }
    });
    
    console.log('\nConnected traders:', connectedTraders.length);
    const traderIds = connectedTraders.map(ct => ct.traderId);
    console.log('Trader IDs:', traderIds);
    
    // 3. Проверяем пользователей
    const users = await db.user.findMany({
      where: {
        id: { in: traderIds }
      },
      select: {
        id: true,
        banned: true,
        deposit: true,
        trafficEnabled: true
      }
    });
    
    console.log('\nUsers:');
    users.forEach(u => {
      console.log(`- ${u.id}: banned=${u.banned}, deposit=${u.deposit}, trafficEnabled=${u.trafficEnabled}`);
    });
    
    // 4. Проверяем реквизиты с полными условиями
    const pool = await db.bankDetail.findMany({
      where: {
        isArchived: false,
        isActive: true,
        methodType: method?.type,
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
      include: { user: true, device: true }
    });
    
    console.log('\nPool size:', pool.length);
    pool.forEach(bd => {
      console.log(`\nRequisite ${bd.id}:`);
      console.log(`- Card: ${bd.cardNumber}`);
      console.log(`- Method type: ${bd.methodType}`);
      console.log(`- Archived: ${bd.isArchived}`);
      console.log(`- Active: ${bd.isActive}`);
      console.log(`- User banned: ${bd.user.banned}`);
      console.log(`- User deposit: ${bd.user.deposit}`);
      console.log(`- User trafficEnabled: ${bd.user.trafficEnabled}`);
      console.log(`- Device: ${bd.device ? `${bd.device.name} (working=${bd.device.isWorking}, online=${bd.device.isOnline})` : 'NO DEVICE'}`);
      console.log(`- Amount range: ${bd.minAmount} - ${bd.maxAmount}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

checkPoolDetails();