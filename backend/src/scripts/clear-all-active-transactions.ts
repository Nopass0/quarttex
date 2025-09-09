#!/usr/bin/env bun

import { PrismaClient, Status } from '@prisma/client';
const db = new PrismaClient();

async function clearAllActiveTransactions() {
  try {
    // Отменяем ВСЕ активные транзакции чтобы освободить реквизиты
    const result = await db.transaction.updateMany({
      where: {
        status: { in: [Status.CREATED, Status.IN_PROGRESS] }
      },
      data: {
        status: Status.CANCELED,
        error: 'Cleared for testing',
        updatedAt: new Date()
      }
    });
    
    console.log(`Canceled ${result.count} active transactions`);
    
    // Проверяем реквизиты
    const requisites = await db.bankDetail.findMany({
      where: {
        userId: 'cmdt3szv50001ikim64p88222',
        isArchived: false,
        isActive: true
      }
    });
    
    for (const req of requisites) {
      const activeCount = await db.transaction.count({
        where: {
          bankDetailId: req.id,
          status: { in: [Status.CREATED, Status.IN_PROGRESS] }
        }
      });
      
      console.log(`Requisite ${req.cardNumber}: ${activeCount} active transactions`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

clearAllActiveTransactions();