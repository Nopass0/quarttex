#!/usr/bin/env bun

import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function findDeviceId() {
  try {
    const requisite = await db.bankDetail.findUnique({
      where: { id: 'cmdt479500cxnikpqhl84erwp' },
      include: { device: true }
    });
    
    console.log('Requisite deviceId:', requisite?.deviceId);
    console.log('Device:', requisite?.device);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

findDeviceId();