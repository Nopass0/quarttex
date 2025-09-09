#!/usr/bin/env bun

import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function verifyDeviceUpdate() {
  try {
    const device = await db.device.findUnique({
      where: { id: 'cmdt44gas0bpfikpqd1s9xhch' }
    });
    
    console.log('Device from DB:');
    console.log('- Name:', device?.name);
    console.log('- isWorking:', device?.isWorking);
    console.log('- isOnline:', device?.isOnline);
    console.log('- updatedAt:', device?.updatedAt);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

verifyDeviceUpdate();