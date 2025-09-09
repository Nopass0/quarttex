#!/usr/bin/env bun

import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function fixDevice() {
  try {
    const updated = await db.device.update({
      where: { id: "cmdt44gas0bpfikpqd1s9xhch" },
      data: { 
        isWorking: true, 
        isOnline: true 
      }
    });
    console.log('Updated device:', updated);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

fixDevice();