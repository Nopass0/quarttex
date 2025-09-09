#!/usr/bin/env bun

import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function checkMerchantToken() {
  try {
    const merchant = await db.merchant.findFirst({
      where: { name: 'Test Merchant' }
    });
    
    if (!merchant) {
      console.log('Merchant not found');
      return;
    }
    
    console.log('Merchant:', merchant.name);
    console.log('Token:', merchant.token);
    console.log('API Key Public:', merchant.apiKeyPublic);
    console.log('API Key Private:', merchant.apiKeyPrivate);
    console.log('Disabled:', merchant.disabled);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

checkMerchantToken();