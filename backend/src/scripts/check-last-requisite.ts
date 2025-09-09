#!/usr/bin/env bun

import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function checkLastRequisite() {
  try {
    const requisite = await db.bankDetail.findUnique({
      where: { id: 'cmdt6vo7n07b1ikyb98bv7rzs' },
      include: { 
        user: true,
        device: true
      }
    });
    
    if (!requisite) {
      console.log('Requisite not found!');
      return;
    }
    
    console.log('=== Requisite Details ===');
    console.log('ID:', requisite.id);
    console.log('Card:', requisite.cardNumber);
    console.log('Bank:', requisite.bankType);
    console.log('Method:', requisite.methodType);
    console.log('Min/Max Amount:', requisite.minAmount, '-', requisite.maxAmount);
    console.log('Total Amount Limit:', requisite.totalAmountLimit);
    console.log('Active:', requisite.isActive);
    console.log('Archived:', requisite.isArchived);
    
    console.log('\n=== User Details ===');
    console.log('User ID:', requisite.userId);
    console.log('Min/Max per requisite:', requisite.user.minAmountPerRequisite, '-', requisite.user.maxAmountPerRequisite);
    console.log('Trust Balance:', requisite.user.trustBalance);
    console.log('Frozen USDT:', requisite.user.frozenUsdt);
    console.log('Available Balance:', requisite.user.trustBalance - requisite.user.frozenUsdt);
    
    console.log('\n=== Device Check ===');
    console.log('Has device ID:', requisite.deviceId);
    if (requisite.device) {
      console.log('Device:', requisite.device.name);
      console.log('isWorking:', requisite.device.isWorking);
      console.log('isOnline:', requisite.device.isOnline);
    }
    
    // Проверка на одинаковую сумму
    const amount = 1500;
    const existingTransaction = await db.transaction.findFirst({
      where: {
        bankDetailId: requisite.id,
        amount: amount,
        status: { in: ['CREATED', 'IN_PROGRESS'] },
        type: 'IN'
      }
    });
    
    console.log('\n=== Same Amount Check ===');
    console.log('Transaction with same amount exists:', existingTransaction ? 'YES' : 'NO');
    if (existingTransaction) {
      console.log('Transaction ID:', existingTransaction.id);
      console.log('Status:', existingTransaction.status);
    }
    
    // Проверка баланса для транзакции
    const rate = 95;
    const frozenUsdtAmount = Math.ceil((amount / rate) * 100) / 100;
    const availableBalance = requisite.user.trustBalance - requisite.user.frozenUsdt;
    
    console.log('\n=== Balance Check ===');
    console.log('Transaction amount:', amount);
    console.log('Rate:', rate);
    console.log('Frozen USDT needed:', frozenUsdtAmount);
    console.log('Available balance:', availableBalance);
    console.log('Sufficient:', availableBalance >= frozenUsdtAmount ? 'YES' : 'NO');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

checkLastRequisite();