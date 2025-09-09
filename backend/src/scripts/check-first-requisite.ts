#!/usr/bin/env bun

import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function checkFirstRequisite() {
  try {
    const requisite = await db.bankDetail.findUnique({
      where: { id: 'cmdt479500cxnikpqhl84erwp' },
      include: { 
        user: true, 
        device: true 
      }
    });
    
    console.log('Requisite cmdt479500cxnikpqhl84erwp:');
    console.log('- isArchived:', requisite?.isArchived);
    console.log('- isActive:', requisite?.isActive);
    console.log('- methodType:', requisite?.methodType);
    console.log('- userId:', requisite?.userId);
    console.log('- Device ID:', requisite?.deviceId);
    if (requisite?.device) {
      console.log('- Device isWorking:', requisite.device.isWorking);
      console.log('- Device isOnline:', requisite.device.isOnline);
    }
    
    // Проверяем почему не попадает в pool
    console.log('\nChecking pool conditions:');
    console.log('- isArchived = false?', requisite?.isArchived === false);
    console.log('- isActive = true?', requisite?.isActive === true);
    console.log('- methodType = c2c?', requisite?.methodType === 'c2c');
    console.log('- userId matches trader?', requisite?.userId === 'cmdt3szv50001ikim64p88222');
    console.log('- user.banned = false?', requisite?.user.banned === false);
    console.log('- user.deposit >= 1000?', (requisite?.user.deposit || 0) >= 1000);
    console.log('- user.trafficEnabled = true?', requisite?.user.trafficEnabled === true);
    console.log('- device condition?', 
      !requisite?.deviceId || 
      (requisite?.device?.isWorking === true && requisite?.device?.isOnline === true)
    );
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

checkFirstRequisite();