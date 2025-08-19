#!/usr/bin/env bun

import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function enableDevice() {
  try {
    // Сначала проверяем существование устройства
    const existingDevice = await db.device.findUnique({
      where: { id: 'cmdt44gas0bpfikpqd1s9xhch' }
    });
    
    console.log('Existing device:', existingDevice);
    
    if (!existingDevice) {
      console.error('Device not found!');
      return;
    }
    
    // Включаем устройство для первого реквизита
    const device = await db.device.update({
      where: { 
        id: 'cmdt44gas0bpfikpqd1s9xhch'
      },
      data: {
        isWorking: true,
        isOnline: true,
        updatedAt: new Date()
      }
    });
    
    console.log('Device updated successfully:');
    console.log('- Name:', device.name);
    console.log('- isWorking:', device.isWorking);
    console.log('- isOnline:', device.isOnline);
    console.log('- updatedAt:', device.updatedAt);
    
    // Проверяем обновление
    const verifyDevice = await db.device.findUnique({
      where: { id: 'cmdt44gas0bpfikpqd1s9xhch' }
    });
    
    console.log('\nVerification:');
    console.log('- isWorking:', verifyDevice?.isWorking);
    console.log('- isOnline:', verifyDevice?.isOnline);
    
  } catch (error) {
    console.error('Error updating device:', error);
  } finally {
    await db.$disconnect();
  }
}

enableDevice();