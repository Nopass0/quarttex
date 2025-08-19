#!/usr/bin/env bun

import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function checkMethodTypes() {
  try {
    // Проверяем метод
    const method = await db.method.findUnique({
      where: { id: 'cmdt3szvx0004ikim5z5iaqcf' }
    });
    
    console.log('Method:', method);
    
    // Проверяем реквизиты
    const requisites = await db.bankDetail.findMany({
      where: {
        userId: 'cmdt3szv50001ikim64p88222'
      },
      select: {
        id: true,
        cardNumber: true,
        methodType: true,
        bankType: true,
        isActive: true,
        isArchived: true
      }
    });
    
    console.log('\nRequisites:');
    requisites.forEach(req => {
      console.log(`- ${req.id}: methodType=${req.methodType}, bank=${req.bankType}, active=${req.isActive}, archived=${req.isArchived}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

checkMethodTypes();