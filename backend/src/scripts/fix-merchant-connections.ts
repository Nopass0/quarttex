#!/usr/bin/env bun

import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function createMerchantMethodConnections() {
  // Get the test merchant
  let merchant = await db.merchant.findFirst({
    where: { name: 'test' }
  });
  
  if (!merchant) {
    console.log('Creating test merchant...');
    merchant = await db.merchant.create({
      data: {
        name: 'test',
        token: 'test-token-' + Date.now(),
        disabled: false,
        banned: false,
        balanceUsdt: 0
      }
    });
    console.log('Created test merchant:', merchant.id);
  } else {
    console.log('Found test merchant:', merchant.id);
  }
  
  // Get methods that match our requisite types
  const methods = await db.method.findMany({
    where: {
      type: { in: ['c2ckz', 'c2c'] }
    }
  });
  
  console.log('Found methods with matching types:', methods.length);
  
  // Create merchant method connections
  for (const method of methods) {
    try {
      await db.merchantMethod.upsert({
        where: {
          merchantId_methodId: {
            merchantId: merchant.id,
            methodId: method.id
          }
        },
        update: {
          isEnabled: true
        },
        create: {
          merchantId: merchant.id,
          methodId: method.id,
          isEnabled: true
        }
      });
      console.log(`Connected method ${method.code} to test merchant`);
    } catch (error) {
      console.log(`Failed to connect method ${method.code}:`, error);
    }
  }
  
  // Now create trader-merchant connections for the test merchant
  const trader = await db.user.findFirst({
    where: { email: 'trader@test.com' }
  });
  
  if (trader) {
    console.log('\nConnecting trader to test merchant...');
    for (const method of methods) {
      try {
        await db.traderMerchant.upsert({
          where: {
            traderId_merchantId_methodId: {
              traderId: trader.id,
              merchantId: merchant.id,
              methodId: method.id
            }
          },
          update: {
            isMerchantEnabled: true,
            isFeeInEnabled: true,
            feeIn: 2.5
          },
          create: {
            traderId: trader.id,
            merchantId: merchant.id,
            methodId: method.id,
            isMerchantEnabled: true,
            isFeeInEnabled: true,
            feeIn: 2.5
          }
        });
        console.log(`Connected trader to method ${method.code}`);
      } catch (error) {
        console.log(`Failed to connect trader to method ${method.code}:`, error);
      }
    }
  } else {
    console.log('Trader not found!');
  }
  
  await db.$disconnect();
}

createMerchantMethodConnections().catch(console.error);