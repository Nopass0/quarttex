#!/usr/bin/env bun

import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function checkDevice() {
  try {
    const device = await db.device.findFirst();
    console.log('Device:', device);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

checkDevice();