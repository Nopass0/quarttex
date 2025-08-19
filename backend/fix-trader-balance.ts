#!/usr/bin/env bun

import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function fixTraderBalance() {
  try {
    // Сначала посмотрим текущую ситуацию
    const user = await db.user.findUnique({
      where: { id: 'cmdt3szv50001ikim64p88222' }
    });
    
    console.log('Current balance:');
    console.log('- Trust balance:', user?.trustBalance);
    console.log('- Frozen USDT:', user?.frozenUsdt);
    console.log('- Available:', (user?.trustBalance || 0) - (user?.frozenUsdt || 0));
    
    // Добавим достаточно баланса чтобы покрыть frozen и иметь запас
    const updatedUser = await db.user.update({
      where: { id: 'cmdt3szv50001ikim64p88222' },
      data: {
        trustBalance: 10000 // Устанавливаем 10000 USDT
      }
    });
    
    console.log('\nUpdated balance:');
    console.log('- Trust balance:', updatedUser.trustBalance);
    console.log('- Frozen USDT:', updatedUser.frozenUsdt);
    console.log('- Available:', updatedUser.trustBalance - updatedUser.frozenUsdt);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

fixTraderBalance();