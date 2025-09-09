#!/usr/bin/env bun

import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function fixMerchantApiKey() {
  try {
    const merchant = await db.merchant.findFirst({
      where: { name: 'Test Merchant' }
    });
    
    if (!merchant) {
      console.log('Merchant not found');
      return;
    }
    
    // Генерируем API ключ
    const apiKey = `test_api_key_${Date.now()}`;
    
    await db.merchant.update({
      where: { id: merchant.id },
      data: { 
        apiKeyPublic: apiKey,
        apiKeyPrivate: `private_${apiKey}`,
        disabled: false,
        countInRubEquivalent: true
      }
    });
    
    console.log('Updated merchant:', merchant.name);
    console.log('New API key:', apiKey);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

fixMerchantApiKey();