#!/usr/bin/env bun

import { db } from '../src/db';

async function quickPopulate() {
  console.log('🚀 Quick populate starting...');

  try {
    // Get trader
    const trader = await db.user.findFirst({
      where: { email: 'trader@test.com' }
    });

    if (!trader) {
      console.error('❌ Trader not found!');
      return;
    }

    console.log('👤 Found trader:', trader.email);

    // 1. Create devices
    console.log('\n📱 Creating devices...');
    const devices = [];
    for (let i = 0; i < 3; i++) {
      const device = await db.device.create({
        data: {
          name: `Device ${i + 1}`,
          userId: trader.id,
          token: `token-${Date.now()}-${i}`,
          isOnline: i === 0,
          lastActiveAt: new Date(),
          energy: 80,
          ethernetSpeed: 100,
          fcmToken: `fcm-${i}`
        }
      });
      devices.push(device);
      console.log(`✅ Created device: ${device.name}`);
    }

    // 2. Create notifications
    console.log('\n📬 Creating notifications...');
    for (const device of devices) {
      for (let i = 0; i < 5; i++) {
        await db.notification.create({
          data: {
            type: i % 2 === 0 ? 'SMS' : 'AppNotification',
            deviceId: device.id,
            message: `Test notification ${i + 1} for ${device.name}`,
            title: 'Bank Notification',
            application: 'com.bank.app',
            isRead: false,
            metadata: {
              amount: 1000 + i * 500,
              timestamp: new Date().toISOString()
            }
          }
        });
      }
    }
    console.log('✅ Created notifications');

    // 3. Create bank details
    console.log('\n💳 Creating bank details...');
    const bankDetails = [];
    for (let i = 0; i < 3; i++) {
      const bd = await db.bankDetail.create({
        data: {
          userId: trader.id,
          deviceId: devices[i % devices.length].id,
          bankType: ['SBERBANK', 'VTB', 'ALFABANK'][i],
          cardNumber: `4000${String(Math.floor(Math.random() * 1000000000000)).padStart(12, '0')}`,
          recipientName: `Holder ${i + 1}`,
          minAmount: 100,
          maxAmount: 500000,
          dailyLimit: 1000000,
          monthlyLimit: 10000000,
          methodType: 'c2ckz'
        }
      });
      bankDetails.push(bd);
      console.log(`✅ Created bank detail: ${bd.bankType}`);
    }

    // 4. Create methods
    console.log('\n🏦 Creating methods...');
    const methods = [];
    for (let i = 0; i < bankDetails.length; i++) {
      const bd = bankDetails[i];
      const method = await db.method.create({
        data: {
          code: `METHOD_${Date.now()}_${i}`,
          name: `${bd.bankType} •••• ${bd.cardNumber.slice(-4)}`,
          type: 'c2ckz',
          commissionPayin: 2.5,
          commissionPayout: 1.5,
          maxPayin: 500000,
          minPayin: 100,
          maxPayout: 1000000,
          minPayout: 500,
          chancePayin: 90,
          chancePayout: 85
        }
      });
      methods.push(method);
    }
    console.log('✅ Created methods');

    // 5. Get or create merchant
    console.log('\n🏪 Getting merchant...');
    let merchant = await db.merchant.findFirst();
    if (!merchant) {
      const merchantUser = await db.user.create({
        data: {
          email: 'merchant@test.com',
          password: 'test123',
          name: 'Test Merchant',
          balanceUsdt: 0,
          balanceRub: 0,
          frozenUsdt: 0,
          frozenRub: 0
        }
      });
      merchant = await db.merchant.create({
        data: {
          name: 'Test Merchant',
          userId: merchantUser.id,
          isActive: true,
          domain: 'test.com',
          token: 'test-api-key',
          callbackUrl: 'https://test.com/callback',
          successUrl: 'https://test.com/success',
          failUrl: 'https://test.com/fail'
        }
      });
    }
    console.log('✅ Got merchant:', merchant.name);

    // 6. Create transactions
    console.log('\n💰 Creating transactions...');
    // Create IN_PROGRESS transactions
    for (let i = 0; i < 5; i++) {
      await db.transaction.create({
        data: {
          merchantId: merchant.id,
          methodId: methods[i % methods.length].id,
          userId: trader.id,
          traderId: trader.id,
          amount: 5000 + i * 1000,
          assetOrBank: 'RUB',
          orderId: `ORDER-PROGRESS-${i}`,
          currency: 'RUB',
          userIp: '127.0.0.1',
          callbackUri: merchant.callbackUrl || 'https://test.com/callback',
          successUri: merchant.successUrl || 'https://test.com/success',
          failUri: merchant.failUrl || 'https://test.com/fail',
          type: 'IN',
          expired_at: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours
          commission: 2.5,
          clientName: `Client ${i + 1}`,
          status: 'IN_PROGRESS',
          rate: 90,
          acceptedAt: new Date(),
          bankDetailId: bankDetails[i % bankDetails.length].id
        }
      });
    }
    
    // Create other statuses
    const statuses = ['CREATED', 'READY', 'CANCELED'];
    for (let i = 0; i < 9; i++) {
      await db.transaction.create({
        data: {
          merchantId: merchant.id,
          methodId: methods[i % methods.length].id,
          userId: trader.id,
          traderId: trader.id,
          amount: 10000 + i * 2000,
          assetOrBank: 'RUB',
          orderId: `ORDER-${i}`,
          currency: 'RUB',
          userIp: '127.0.0.1',
          callbackUri: merchant.callbackUrl || 'https://test.com/callback',
          successUri: merchant.successUrl || 'https://test.com/success',
          failUri: merchant.failUrl || 'https://test.com/fail',
          type: 'IN',
          expired_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
          commission: 2.5,
          clientName: `Client ${i + 10}`,
          status: statuses[i % statuses.length],
          rate: 90,
          bankDetailId: bankDetails[i % bankDetails.length].id
        }
      });
    }
    console.log('✅ Created transactions');

    // 7. Create payouts
    console.log('\n💸 Creating payouts...');
    const payoutStatuses = ['CREATED', 'ACTIVE', 'CHECKING', 'COMPLETED'];
    for (let i = 0; i < 8; i++) {
      const amount = 20000 + i * 5000;
      const amountUsdt = amount / 90;
      await db.payout.create({
        data: {
          merchantId: merchant.id,
          traderId: trader.id,
          amount,
          amountUsdt,
          total: amount,
          totalUsdt: amountUsdt,
          rate: 90,
          wallet: `T${String(Math.random().toString(36).slice(2, 11)).toUpperCase()}`,
          bank: ['SBERBANK', 'VTB', 'ALFABANK'][i % 3],
          isCard: true,
          status: payoutStatuses[i % payoutStatuses.length],
          expireAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      });
    }
    console.log('✅ Created payouts');

    // 8. Create trader messages
    console.log('\n💬 Creating trader messages...');
    const messageTypes = ['SYSTEM', 'TRANSACTION', 'PAYOUT', 'ANNOUNCEMENT'];
    for (let i = 0; i < 10; i++) {
      await db.message.create({
        data: {
          traderId: trader.id,
          subject: `Message ${i + 1}`,
          content: `This is test message number ${i + 1}. Important information here.`,
          type: messageTypes[i % messageTypes.length],
          priority: i < 3 ? 'URGENT' : 'NORMAL',
          isRead: i > 5
        }
      });
    }
    console.log('✅ Created trader messages');

    // 9. Create folders
    console.log('\n📁 Creating folders...');
    for (let i = 0; i < 2; i++) {
      const folder = await db.folder.create({
        data: {
          traderId: trader.id,
          title: `Folder ${i + 1}`,
          isActive: i === 0
        }
      });
      
      // Add requisites to folder
      for (let j = 0; j < 2; j++) {
        const bdIndex = (i * 2 + j) % bankDetails.length;
        await db.requisiteOnFolder.create({
          data: {
            folderId: folder.id,
            requisiteId: bankDetails[bdIndex].id
          }
        });
      }
    }
    console.log('✅ Created folders');

    console.log('\n🎉 Quick populate completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.$disconnect();
  }
}

quickPopulate();