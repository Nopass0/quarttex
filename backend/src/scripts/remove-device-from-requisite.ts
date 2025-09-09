#!/usr/bin/env bun

import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function removeDeviceFromRequisite() {
  try {
    // Убираем устройство с первого реквизита чтобы он попал в pool
    const requisite = await db.bankDetail.update({
      where: { 
        id: 'cmdt479500cxnikpqhl84erwp'
      },
      data: {
        deviceId: null
      }
    });
    
    console.log('Requisite updated:');
    console.log('- ID:', requisite.id);
    console.log('- Card:', requisite.cardNumber);
    console.log('- Device ID:', requisite.deviceId);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

removeDeviceFromRequisite();