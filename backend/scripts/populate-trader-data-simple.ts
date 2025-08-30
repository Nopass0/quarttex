#!/usr/bin/env bun

import { db } from '../src/db';
import { 
  Status, 
  PayoutStatus, 
  TransactionType, 
  DepositStatus,
  WithdrawalStatus,
  DealDisputeStatus,
  WithdrawalDisputeStatus,
  MessageType,
  MessagePriority,
  NotificationType,
  DisputeSenderType
} from '@prisma/client';

async function populateTraderData() {
  console.log('🚀 Starting to populate trader data...');

  try {
    // Get all traders
    const traders = await db.user.findMany({
      where: { 
        email: { 
          in: ['trader@test.com', 'small-balance@test.com', 'large-balance@test.com'] 
        } 
      }
    });

    if (traders.length === 0) {
      console.error('❌ No traders found!');
      return;
    }

    for (const trader of traders) {
      console.log(`\n📊 Populating data for trader: ${trader.email}`);

      // 1. Create Devices
      console.log('📱 Creating devices...');
      const devices = [];
      const deviceNames = [
        'Samsung Galaxy S23',
        'iPhone 14 Pro',
        'Xiaomi 13',
        'OnePlus 11',
        'Google Pixel 7'
      ];

      for (let i = 0; i < 5; i++) {
        const device = await db.device.create({
          data: {
            name: deviceNames[i],
            userId: trader.id,
            token: `${trader.id}-device-${i}-${Date.now()}`,
            isOnline: i < 3, // First 3 devices online
            lastActiveAt: new Date(Date.now() - i * 60 * 60 * 1000),
            energy: 80 - i * 10,
            ethernetSpeed: 100 - i * 20,
            emulated: false,
            pushEnabled: true,
            fcmToken: `FCM_TOKEN_${trader.id}_${i}`
          }
        });
        devices.push(device);

        // Add notifications for each device
        console.log(`📬 Creating notifications for device ${device.name}...`);
        const notificationTypes = [
          { type: NotificationType.SMS, packageName: 'com.android.mms' },
          { type: NotificationType.PUSH, packageName: 'com.sberbank.online' },
          { type: NotificationType.SMS, packageName: 'com.android.mms' },
          { type: NotificationType.PUSH, packageName: 'com.vtb24.online' },
          { type: NotificationType.PUSH, packageName: 'com.tinkoff.bank' }
        ];

        for (let j = 0; j < 10; j++) {
          const notifType = notificationTypes[j % notificationTypes.length];
          const amount = Math.floor(Math.random() * 50000) + 1000;
          const balance = Math.floor(Math.random() * 100000) + 10000;
          
          await db.notification.create({
            data: {
              deviceId: device.id,
              message: notifType.type === NotificationType.SMS 
                ? `Перевод ${amount}р. от +7${Math.floor(Math.random() * 900000000 + 100000000)}. Баланс: ${balance}р.`
                : `Поступление ${amount} ₽. Доступно: ${balance} ₽`,
              type: notifType.type,
              application: notifType.packageName,
              title: notifType.packageName.includes('sberbank') ? 'Сбербанк' 
                : notifType.packageName.includes('vtb') ? 'ВТБ'
                : notifType.packageName.includes('tinkoff') ? 'Тинькофф'
                : 'Банк',
              isRead: j > 5,
              metadata: {
                amount,
                balance,
                sender: notifType.type === NotificationType.SMS 
                  ? `+7${Math.floor(Math.random() * 900000000 + 100000000)}`
                  : undefined,
                bankType: notifType.packageName.includes('sberbank') ? 'sberbank'
                  : notifType.packageName.includes('vtb') ? 'vtb'
                  : notifType.packageName.includes('tinkoff') ? 'tinkoff'
                  : 'other',
                transactionId: `TRX${Date.now()}${j}`,
                currency: 'RUB',
                timestamp: new Date(Date.now() - j * 60 * 60 * 1000).toISOString()
              }
            }
          });
        }
      }

      // 2. Create Bank Details (Requisites)
      console.log('💳 Creating bank details...');
      const bankDetails = [];
      const banks = ['sberbank', 'vtb', 'tinkoff', 'alfabank', 'raiffeisen'];
      const cardHolders = [
        'Иванов Иван Иванович',
        'Петров Петр Петрович',
        'Сидоров Сидор Сидорович',
        'Козлов Козел Козлович',
        'Смирнов Смирн Смирнович'
      ];

      for (let i = 0; i < 5; i++) {
        const bankDetail = await db.bankDetail.create({
          data: {
            userId: trader.id,
            deviceId: devices[i % devices.length].id,
            bankType: banks[i],
            cardNumber: `${4000 + i}${String(Math.floor(Math.random() * 1000000000000)).padStart(12, '0')}`,
            holderName: cardHolders[i],
            minAmount: 100,
            maxAmount: 500000,
            dailyLimit: 1000000,
            monthlyLimit: 10000000,
            currentDailyVolume: Math.floor(Math.random() * 500000),
            currentMonthlyVolume: Math.floor(Math.random() * 5000000),
            isActive: i < 3,
            metadata: {
              bankBranch: 'Москва',
              accountType: 'debit',
              isVerified: true,
              addedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString()
            }
          }
        });
        bankDetails.push(bankDetail);
      }

      // 3. Create Methods (linked to bank details)
      console.log('🏦 Creating methods...');
      const methods = [];
      for (const bankDetail of bankDetails) {
        const method = await db.method.create({
          data: {
            name: `${bankDetail.bankType.toUpperCase()} •••• ${bankDetail.cardNumber.slice(-4)}`,
            type: 'CARD',
            isActive: bankDetail.isActive,
            requisiteId: bankDetail.id
          }
        });
        methods.push(method);
      }

      // 4. Create a test merchant for transactions
      console.log('🏪 Creating test merchant...');
      let merchant = await db.merchant.findFirst({
        where: { name: 'Test Merchant' }
      });
      
      if (!merchant) {
        // Create a test merchant user first
        const merchantUser = await db.user.create({
          data: {
            email: `merchant-${Date.now()}@test.com`,
            password: 'test123',
            name: 'Test Merchant User',
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
            domain: 'test-merchant.com',
            apiKey: `merchant-api-key-${Date.now()}`,
            callbackUrl: 'https://test-merchant.com/callback',
            successUrl: 'https://test-merchant.com/success',
            failUrl: 'https://test-merchant.com/fail',
            settings: {},
            metadata: {}
          }
        });
      }

      // 5. Create Transactions (Deals) - IN_PROGRESS ones
      console.log('💰 Creating in-progress transactions...');
      
      // Create some IN_PROGRESS transactions expiring in 4 hours
      for (let i = 0; i < 5; i++) {
        const amount = Math.floor(Math.random() * 30000) + 5000;
        
        await db.transaction.create({
          data: {
            merchantId: merchant.id,
            methodId: methods[i % methods.length].id,
            userId: trader.id,
            traderId: trader.id,
            amount,
            assetOrBank: banks[i % banks.length],
            orderId: `ORDER-INPROGRESS-${Date.now()}-${i}`,
            currency: 'RUB',
            userIp: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            callbackUri: merchant.callbackUrl,
            successUri: merchant.successUrl,
            failUri: merchant.failUrl,
            type: TransactionType.IN,
            expired_at: new Date(Date.now() + 4 * 60 * 60 * 1000), // Expires in 4 hours
            commission: 2.5,
            clientName: `Клиент ${i + 1}`,
            status: Status.IN_PROGRESS,
            rate: 90 + Math.random() * 10,
            acceptedAt: new Date(),
            bankDetailId: bankDetails[i % bankDetails.length].id,
            calculatedCommission: amount * 0.025,
            feeInPercent: 2.5
          }
        });
      }

      // Create other transactions with various statuses
      console.log('💰 Creating other transactions...');
      const statuses = [Status.CREATED, Status.READY, Status.FAILED, Status.EXPIRED];
      
      for (let i = 0; i < 15; i++) {
        const status = statuses[i % statuses.length];
        const amount = Math.floor(Math.random() * 50000) + 1000;
        
        const transaction = await db.transaction.create({
          data: {
            merchantId: merchant.id,
            methodId: methods[i % methods.length].id,
            userId: trader.id,
            traderId: trader.id,
            amount,
            assetOrBank: banks[i % banks.length],
            orderId: `ORDER-${Date.now()}-${i}`,
            currency: 'RUB',
            userIp: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            callbackUri: merchant.callbackUrl,
            successUri: merchant.successUrl,
            failUri: merchant.failUrl,
            type: TransactionType.IN,
            expired_at: new Date(Date.now() + (status === Status.EXPIRED ? -1 : 1) * 24 * 60 * 60 * 1000),
            commission: 2.5,
            clientName: `Клиент ${i + 10}`,
            status,
            rate: 90 + Math.random() * 10,
            acceptedAt: status === Status.READY ? new Date() : null,
            bankDetailId: bankDetails[i % bankDetails.length].id,
            calculatedCommission: amount * 0.025,
            feeInPercent: 2.5
          }
        });

        // Add receipts for completed transactions
        if (status === Status.READY) {
          await db.receipt.create({
            data: {
              transactionId: transaction.id,
              fileData: `data:image/png;base64,${Buffer.from(`Receipt for transaction ${transaction.id}`).toString('base64')}`,
              fileName: `receipt-${transaction.numericId}.png`,
              isChecked: true,
              isFake: false,
              isAuto: Math.random() > 0.5
            }
          });
        }
      }

      // 6. Create Payouts with various statuses
      console.log('💸 Creating payouts...');
      const payoutStatuses = [PayoutStatus.CREATED, PayoutStatus.IN_WORK, PayoutStatus.PROCESSING, PayoutStatus.COMPLETED, PayoutStatus.FAILED];
      
      for (let i = 0; i < 15; i++) {
        const status = payoutStatuses[i % payoutStatuses.length];
        const amount = Math.floor(Math.random() * 100000) + 5000;
        
        await db.payout.create({
          data: {
            traderId: trader.id,
            amount,
            amountUsdt: amount / 90,
            currency: 'RUB',
            accountNumber: `${4000 + i}${String(Math.floor(Math.random() * 1000000000000)).padStart(12, '0')}`,
            accountName: cardHolders[i % cardHolders.length],
            bankName: banks[i % banks.length],
            status,
            createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
            processedAt: status === PayoutStatus.COMPLETED ? new Date() : null,
            metadata: {
              paymentSystem: 'SBP',
              processingTime: status === PayoutStatus.COMPLETED ? Math.floor(Math.random() * 3600) + 300 : null,
              failureReason: status === PayoutStatus.FAILED ? 'Insufficient funds' : null
            }
          }
        });
      }

      // 7. Create Deposits (Balance Top-ups)
      console.log('💵 Creating deposits...');
      for (let i = 0; i < 10; i++) {
        const amount = Math.floor(Math.random() * 50000) + 10000;
        const status = i < 7 ? DepositStatus.COMPLETED : DepositStatus.PENDING;
        
        await db.deposit.create({
          data: {
            userId: trader.id,
            amount,
            amountUsdt: amount / 90,
            currency: 'USDT',
            network: 'TRC20',
            address: 'TVjsyZ7fYF3qLF6BQgPmTEZy1xrNNyVAAA',
            txHash: status === DepositStatus.COMPLETED ? `0x${String(Math.random().toString(16).slice(2, 10)).padEnd(64, '0')}` : null,
            status,
            confirmations: status === DepositStatus.COMPLETED ? 20 : 0,
            requiredConfirmations: 20,
            metadata: {
              source: 'manual',
              note: `Test deposit ${i + 1}`
            }
          }
        });
      }

      // 8. Create Withdrawals
      console.log('💴 Creating withdrawals...');
      for (let i = 0; i < 8; i++) {
        const amount = Math.floor(Math.random() * 30000) + 5000;
        const status = i < 5 ? WithdrawalStatus.COMPLETED : WithdrawalStatus.PENDING;
        
        await db.withdrawal.create({
          data: {
            userId: trader.id,
            amount,
            amountUsdt: amount / 90,
            currency: 'USDT',
            network: 'TRC20',
            address: `T${String(Math.random().toString(36).slice(2, 11)).toUpperCase()}${String(Math.random().toString(36).slice(2, 11)).toUpperCase()}`,
            status,
            txHash: status === WithdrawalStatus.COMPLETED ? `0x${String(Math.random().toString(16).slice(2, 10)).padEnd(64, '0')}` : null,
            fee: amount * 0.01,
            processedAt: status === WithdrawalStatus.COMPLETED ? new Date() : null,
            metadata: {
              ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
              userAgent: 'Mozilla/5.0'
            }
          }
        });
      }

      // 9. Create Disputes
      console.log('⚖️ Creating disputes...');
      
      // Deal disputes
      const transactions = await db.transaction.findMany({
        where: { 
          traderId: trader.id,
          status: { in: [Status.IN_PROGRESS, Status.READY] }
        },
        take: 5
      });

      for (const transaction of transactions) {
        const dispute = await db.dealDispute.create({
          data: {
            dealId: transaction.id,
            merchantId: merchant.id,
            traderId: trader.id,
            status: Math.random() > 0.5 ? DealDisputeStatus.OPEN : DealDisputeStatus.IN_PROGRESS,
            metadata: {
              reason: 'Payment not received',
              initiatedBy: 'merchant'
            }
          }
        });

        // Add messages to dispute
        await db.dealDisputeMessage.create({
          data: {
            disputeId: dispute.id,
            senderId: merchant.id,
            senderType: DisputeSenderType.MERCHANT,
            message: 'Клиент утверждает, что оплатил, но средства не поступили на счет.'
          }
        });

        await db.dealDisputeMessage.create({
          data: {
            disputeId: dispute.id,
            senderId: trader.id,
            senderType: DisputeSenderType.TRADER,
            message: 'Проверяю информацию по транзакции. Запрошу скриншот чека у клиента.'
          }
        });
      }

      // Withdrawal disputes
      const payouts = await db.payout.findMany({
        where: { 
          traderId: trader.id,
          status: { in: [PayoutStatus.IN_WORK, PayoutStatus.PROCESSING] }
        },
        take: 3
      });

      for (const payout of payouts) {
        const dispute = await db.withdrawalDispute.create({
          data: {
            payoutId: payout.id,
            merchantId: merchant.id,
            traderId: trader.id,
            status: WithdrawalDisputeStatus.OPEN,
            metadata: {
              reason: 'Delayed processing',
              priority: 'high'
            }
          }
        });

        // Add messages to dispute
        await db.withdrawalDisputeMessage.create({
          data: {
            disputeId: dispute.id,
            senderId: trader.id,
            senderType: DisputeSenderType.TRADER,
            message: 'Выплата застряла в статусе обработки более 24 часов. Прошу проверить.'
          }
        });
      }

      // 10. Create Trader Messages
      console.log('💬 Creating trader messages...');
      const messageTypes = [
        MessageType.SYSTEM,
        MessageType.TRANSACTION,
        MessageType.PAYOUT,
        MessageType.ACCOUNT,
        MessageType.SECURITY,
        MessageType.ANNOUNCEMENT
      ];

      const messageTemplates = [
        { 
          type: MessageType.SYSTEM, 
          subject: 'Системное обновление',
          content: 'Запланировано техническое обслуживание на 15:00 MSK. Сервис будет недоступен в течение 30 минут.'
        },
        {
          type: MessageType.TRANSACTION,
          subject: 'Новая сделка #',
          content: 'Вам назначена новая сделка на сумму {amount} ₽. Проверьте детали в разделе "Сделки".'
        },
        {
          type: MessageType.PAYOUT,
          subject: 'Выплата обработана',
          content: 'Ваша выплата на сумму {amount} ₽ успешно обработана и отправлена на указанные реквизиты.'
        },
        {
          type: MessageType.ACCOUNT,
          subject: 'Изменение баланса',
          content: 'Ваш баланс был пополнен на {amount} USDT. Текущий доступный баланс: {balance} USDT.'
        },
        {
          type: MessageType.SECURITY,
          subject: 'Новый вход в аккаунт',
          content: 'Зафиксирован вход в ваш аккаунт с IP-адреса {ip}. Если это были не вы, срочно смените пароль.'
        },
        {
          type: MessageType.ANNOUNCEMENT,
          subject: 'Важное объявление',
          content: 'Уважаемые трейдеры! С 1 января вводятся новые правила работы с международными переводами. Подробности в личном кабинете.'
        }
      ];

      for (let i = 0; i < 20; i++) {
        const template = messageTemplates[i % messageTemplates.length];
        const amount = Math.floor(Math.random() * 50000) + 1000;
        
        await db.traderMessage.create({
          data: {
            traderId: trader.id,
            subject: template.subject + (template.type === MessageType.TRANSACTION ? (1000 + i) : ''),
            content: template.content
              .replace('{amount}', amount.toLocaleString('ru-RU'))
              .replace('{balance}', (trader.balanceUsdt + amount).toLocaleString('ru-RU'))
              .replace('{ip}', `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`),
            type: template.type,
            priority: i < 3 ? MessagePriority.URGENT : i < 10 ? MessagePriority.HIGH : MessagePriority.NORMAL,
            isRead: i > 5,
            readAt: i > 5 ? new Date() : null,
            metadata: {
              source: 'system',
              category: template.type.toLowerCase(),
              actionRequired: template.type === MessageType.SECURITY
            }
          }
        });
      }

      // 11. Create Folders with requisites
      console.log('📁 Creating folders...');
      const folderNames = ['Основные карты', 'Резервные карты', 'VIP клиенты'];
      
      for (let i = 0; i < folderNames.length; i++) {
        const folder = await db.folder.create({
          data: {
            traderId: trader.id,
            title: folderNames[i],
            isActive: i === 0,
            metadata: {
              color: ['blue', 'green', 'purple'][i],
              icon: ['star', 'shield', 'crown'][i]
            }
          }
        });

        // Add requisites to folder
        const requisitesToAdd = bankDetails.slice(i * 2, (i + 1) * 2);
        for (const requisite of requisitesToAdd) {
          await db.folderRequisite.create({
            data: {
              folderId: folder.id,
              requisiteId: requisite.id
            }
          });
        }
      }

      console.log(`✅ Completed data population for ${trader.email}`);
    }

    console.log('\n🎉 All trader data populated successfully!');
    console.log('\n📊 Summary:');
    console.log('- 5 devices per trader with notifications');
    console.log('- 5 bank details (requisites) per trader');
    console.log('- 20 transactions per trader (5 IN_PROGRESS expiring in 4 hours)');
    console.log('- 15 payouts per trader');
    console.log('- 10 deposits per trader');
    console.log('- 8 withdrawals per trader');
    console.log('- Multiple disputes with messages');
    console.log('- 20 trader messages per trader');
    console.log('- 3 folders with requisites per trader');

  } catch (error) {
    console.error('❌ Error populating trader data:', error);
  } finally {
    await db.$disconnect();
  }
}

// Run the script
populateTraderData();