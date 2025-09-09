#!/usr/bin/env bun

import { PrismaClient, Status } from '@prisma/client';
const db = new PrismaClient();

async function clearOneMore() {
  try {
    // Обновляем одну транзакцию с реквизита cmdt4ukva0001ik3vqs71li22
    const tx = await db.transaction.findFirst({
      where: {
        bankDetailId: 'cmdt4ukva0001ik3vqs71li22',
        status: Status.IN_PROGRESS
      }
    });
    
    if (tx) {
      const updated = await db.transaction.update({
        where: { id: tx.id },
        data: { 
          status: Status.READY,
          updatedAt: new Date()
        }
      });
      
      // Обновляем currentTotalAmount для реквизита
      await db.bankDetail.update({
        where: { id: updated.bankDetailId! },
        data: { 
          currentTotalAmount: { increment: updated.amount }
        }
      });
      
      console.log(`Updated transaction ${tx.id} to READY status`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

clearOneMore();