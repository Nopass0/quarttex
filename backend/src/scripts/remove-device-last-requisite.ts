#!/usr/bin/env bun

import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function removeDeviceLastRequisite() {
  try {
    const requisite = await db.bankDetail.update({
      where: { 
        id: 'cmdt6vo7n07b1ikyb98bv7rzs'
      },
      data: {
        deviceId: null
      }
    });
    
    console.log('Updated requisite:');
    console.log('- ID:', requisite.id);
    console.log('- Card:', requisite.cardNumber);
    console.log('- Device ID:', requisite.deviceId);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

removeDeviceLastRequisite();