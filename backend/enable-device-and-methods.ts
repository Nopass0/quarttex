#!/usr/bin/env bun

import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function enableDeviceAndMethods() {
  try {
    // Включаем устройство
    const device = await db.device.findFirst();
    if (device) {
      await db.device.update({
        where: { id: device.id },
        data: {
          isWorking: true,
          isOnline: true
        }
      });
      console.log('Device enabled:', device.id);
    }
    
    // Включаем методы
    await db.method.updateMany({
      data: { isEnabled: true }
    });
    console.log('All methods enabled');
    
    // Создаем связи мерчанта с методами
    const merchant = await db.merchant.findFirst({
      where: { name: 'Test Merchant' }
    });
    
    const methods = await db.method.findMany();
    
    if (merchant) {
      for (const method of methods) {
        const existing = await db.merchantMethod.findUnique({
          where: {
            merchantId_methodId: {
              merchantId: merchant.id,
              methodId: method.id
            }
          }
        });
        
        if (!existing) {
          await db.merchantMethod.create({
            data: {
              merchantId: merchant.id,
              methodId: method.id,
              isEnabled: true
            }
          });
          console.log(`Created merchant-method link for ${method.name}`);
        } else {
          await db.merchantMethod.update({
            where: {
              merchantId_methodId: {
                merchantId: merchant.id,
                methodId: method.id
              }
            },
            data: { isEnabled: true }
          });
          console.log(`Enabled merchant-method link for ${method.name}`);
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

enableDeviceAndMethods();