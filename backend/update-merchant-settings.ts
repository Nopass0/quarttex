#!/usr/bin/env bun

import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function updateMerchantSettings() {
  try {
    const merchant = await db.merchant.findFirst({
      where: { name: 'Test Merchant' }
    });
    
    if (!merchant) {
      console.log('Merchant not found');
      return;
    }
    
    await db.merchant.update({
      where: { id: merchant.id },
      data: { 
        countInRubEquivalent: false // Отключаем автоматический курс
      }
    });
    
    console.log('Updated merchant settings');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

updateMerchantSettings();