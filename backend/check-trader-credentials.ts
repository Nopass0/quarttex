#!/usr/bin/env bun

import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function checkTraderCredentials() {
  try {
    const user = await db.user.findFirst({
      where: {
        id: 'cmdt3szv50001ikim64p88222'
      },
      select: {
        email: true,
        name: true
      }
    });
    
    console.log('Trader user:', user);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

checkTraderCredentials();