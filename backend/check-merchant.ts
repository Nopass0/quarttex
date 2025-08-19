#!/usr/bin/env bun

import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function checkMerchant() {
  const merchant = await db.merchant.findFirst({
    where: { name: 'test' }
  });
  
  if (merchant) {
    console.log('Test merchant found:');
    console.log('ID:', merchant.id);
    console.log('Name:', merchant.name);
    console.log('Token:', merchant.token);
  } else {
    console.log('Test merchant not found');
  }
  
  await db.$disconnect();
}

checkMerchant().catch(console.error);