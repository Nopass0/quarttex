#!/usr/bin/env bun

import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function checkBalanceRequirement() {
  try {
    const amount = 1500;
    const rate = 95;
    
    // Проверяем пользователя и его баланс
    const user = await db.user.findUnique({
      where: { id: 'cmdt3szv50001ikim64p88222' }
    });
    
    console.log('User balance info:');
    console.log('- Trust balance:', user?.trustBalance);
    console.log('- Frozen USDT:', user?.frozenUsdt);
    console.log('- Available balance:', (user?.trustBalance || 0) - (user?.frozenUsdt || 0));
    
    // Рассчитываем необходимую заморозку
    const frozenUsdtAmount = Math.ceil((amount / rate) * 100) / 100;
    console.log('\nTransaction requirements:');
    console.log('- Amount:', amount);
    console.log('- Rate:', rate);
    console.log('- Frozen USDT needed:', frozenUsdtAmount);
    
    const availableBalance = (user?.trustBalance || 0) - (user?.frozenUsdt || 0);
    console.log('\nBalance check:');
    console.log('- Available:', availableBalance);
    console.log('- Required:', frozenUsdtAmount);
    console.log('- Sufficient:', availableBalance >= frozenUsdtAmount ? 'YES' : 'NO');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

checkBalanceRequirement();