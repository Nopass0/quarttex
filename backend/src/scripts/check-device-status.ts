#!/usr/bin/env bun

import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function checkDeviceStatus() {
  try {
    // Проверяем реквизиты с устройствами
    const requisites = await db.bankDetail.findMany({
      where: {
        id: { in: ['cmdt479500cxnikpqhl84erwp', 'cmdt4ukva0001ik3vqs71li22', 'cmdt4m3wa0001ikqb06yaeu28'] }
      },
      include: {
        device: true,
        user: true
      }
    });
    
    for (const req of requisites) {
      console.log(`\nRequisite ${req.id}:`);
      console.log(`- Card: ${req.cardNumber}`);
      console.log(`- Has device: ${req.deviceId ? 'YES' : 'NO'}`);
      if (req.device) {
        console.log(`- Device: ${req.device.name}`);
        console.log(`- Device isWorking: ${req.device.isWorking}`);
        console.log(`- Device isOnline: ${req.device.isOnline}`);
      }
      console.log(`- User deposit: ${req.user.deposit}`);
      console.log(`- User trafficEnabled: ${req.user.trafficEnabled}`);
      console.log(`- User banned: ${req.user.banned}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

checkDeviceStatus();