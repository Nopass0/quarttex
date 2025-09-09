#!/usr/bin/env bun

import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function checkSpecificRequisite() {
  try {
    // Проверяем первый реквизит подробно
    const requisite = await db.bankDetail.findUnique({
      where: { id: 'cmdt479500cxnikpqhl84erwp' },
      include: { 
        user: true, 
        device: true 
      }
    });
    
    if (!requisite) {
      console.log('Requisite not found!');
      return;
    }
    
    console.log('=== Requisite Details ===');
    console.log('ID:', requisite.id);
    console.log('Card:', requisite.cardNumber);
    console.log('User ID:', requisite.userId);
    console.log('Method Type:', requisite.methodType);
    console.log('Active:', requisite.isActive);
    console.log('Archived:', requisite.isArchived);
    console.log('Amount range:', requisite.minAmount, '-', requisite.maxAmount);
    
    console.log('\n=== User Details ===');
    console.log('Banned:', requisite.user.banned);
    console.log('Deposit:', requisite.user.deposit);
    console.log('Traffic Enabled:', requisite.user.trafficEnabled);
    
    console.log('\n=== Device Details ===');
    if (requisite.device) {
      console.log('Device ID:', requisite.device.id);
      console.log('Device Name:', requisite.device.name);
      console.log('isWorking:', requisite.device.isWorking);
      console.log('isOnline:', requisite.device.isOnline);
    } else {
      console.log('No device');
    }
    
    // Проверяем прямой запрос с условиями pool
    const directCheck = await db.bankDetail.findFirst({
      where: {
        id: 'cmdt479500cxnikpqhl84erwp',
        isArchived: false,
        isActive: true,
        methodType: 'c2c',
        userId: 'cmdt3szv50001ikim64p88222',
        user: { 
          banned: false,
          deposit: { gte: 1000 },
          trafficEnabled: true
        },
        OR: [
          { deviceId: null },
          { device: { isWorking: true, isOnline: true } }
        ]
      }
    });
    
    console.log('\n=== Direct Pool Check ===');
    console.log('Found in pool query:', directCheck ? 'YES' : 'NO');
    
    // Проверяем каждое условие отдельно
    const checkConditions = await db.bankDetail.findFirst({
      where: {
        id: 'cmdt479500cxnikpqhl84erwp',
        device: { isWorking: true, isOnline: true }
      },
      include: { device: true }
    });
    
    console.log('\n=== Device Condition Check ===');
    console.log('Found with device conditions:', checkConditions ? 'YES' : 'NO');
    if (checkConditions?.device) {
      console.log('Device isWorking:', checkConditions.device.isWorking);
      console.log('Device isOnline:', checkConditions.device.isOnline);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

checkSpecificRequisite();