#!/usr/bin/env bun

import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function addTraderBalance() {
  try {
    const user = await db.user.update({
      where: { id: 'cmdt3szv50001ikim64p88222' },
      data: {
        trustBalance: { increment: 1000 } // Добавляем 1000 USDT
      }
    });
    
    console.log('Updated user balance:');
    console.log('- Trust balance:', user.trustBalance);
    console.log('- Frozen USDT:', user.frozenUsdt);
    console.log('- Available:', user.trustBalance - user.frozenUsdt);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

addTraderBalance();