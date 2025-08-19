#!/usr/bin/env bun

import { PrismaClient, Status } from '@prisma/client';
const db = new PrismaClient();

async function clearTransactionForFirst() {
  try {
    // Найдем активную транзакцию для первого реквизита
    const activeTx = await db.transaction.findFirst({
      where: {
        bankDetailId: 'cmdt479500cxnikpqhl84erwp',
        status: { in: [Status.CREATED, Status.IN_PROGRESS] }
      }
    });
    
    if (activeTx) {
      await db.transaction.update({
        where: { id: activeTx.id },
        data: { 
          status: Status.READY,
          updatedAt: new Date()
        }
      });
      
      // Обновляем currentTotalAmount
      await db.bankDetail.update({
        where: { id: 'cmdt479500cxnikpqhl84erwp' },
        data: { 
          currentTotalAmount: { increment: activeTx.amount }
        }
      });
      
      console.log(`Cleared transaction ${activeTx.id} with amount ${activeTx.amount}`);
    } else {
      console.log('No active transactions found for first requisite');
    }
    
    // Проверяем текущее состояние
    const activeCount = await db.transaction.count({
      where: {
        bankDetailId: 'cmdt479500cxnikpqhl84erwp',
        status: { in: [Status.CREATED, Status.IN_PROGRESS] }
      }
    });
    
    console.log(`Active transactions remaining: ${activeCount}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

clearTransactionForFirst();