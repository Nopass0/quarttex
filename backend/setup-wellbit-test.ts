import { db } from "./src/db";
import crypto from 'crypto';
import { BankType, Status } from "@prisma/client";

async function setupWellbitTest() {
  console.log("=== Setting up Wellbit Test Environment ===\n");

  try {
    // 1. Найти или создать Wellbit мерчанта
    let wellbitMerchant = await db.merchant.findFirst({
      where: { name: { contains: 'wellbit', mode: 'insensitive' } }
    });

    if (!wellbitMerchant) {
      const apiKeyPublic = `wellbit_${crypto.randomBytes(16).toString('hex')}`;
      const apiKeyPrivate = `wellbit_private_${crypto.randomBytes(32).toString('hex')}`;
      
      wellbitMerchant = await db.merchant.create({
        data: {
          name: "Wellbit",
          token: `wellbit_token_${crypto.randomBytes(16).toString('hex')}`,
          countInRubEquivalent: false,
          apiKeyPublic,
          apiKeyPrivate,
          disabled: false,
          wellbitCallbackUrl:
            "https://wellbit.pro/cascade/cb/79af32c6-37e2-4dd1-bf7f-fbef29bf2a24"
        }
      });
      
      console.log(`✅ Created Wellbit merchant`);
    } else {
      console.log(`✅ Found Wellbit merchant`);
    }

    // 2. Найти или создать трейдера
    let trader = await db.user.findFirst({
      where: { role: 'TRADER' }
    });

    if (!trader) {
      trader = await db.user.create({
        data: {
          email: 'test-trader@chase.com',
          password: crypto.randomBytes(32).toString('hex'),
          name: 'Test Trader',
          role: 'TRADER',
          token: `trader_${crypto.randomBytes(16).toString('hex')}`,
          isApproved: true,
          isOnline: true,
          allowWithdraw: true,
          withdrawIsAuto: false,
          autoWithdraw: false,
          allowPayin: true,
          payinIsAuto: true,
          autoPayin: true,
          trustBalance: 10000, // 10000 USDT для тестов
          frozenUsdt: 0
        }
      });
      console.log(`✅ Created test trader`);
    } else {
      // Обновляем баланс трейдера
      await db.user.update({
        where: { id: trader.id },
        data: {
          isOnline: true,
          allowPayin: true,
          payinIsAuto: true,
          autoPayin: true,
          trustBalance: 10000,
          frozenUsdt: 0
        }
      });
      console.log(`✅ Updated trader settings`);
    }

    // 3. Создать реквизиты для трейдера
    const banks = [BankType.SBER, BankType.TINKOFF];
    
    for (const bankType of banks) {
      const existingDetail = await db.bankDetail.findFirst({
        where: { userId: trader.id, bankType }
      });

      if (!existingDetail) {
        await db.bankDetail.create({
          data: {
            userId: trader.id,
            bankType,
            cardNumber: bankType === BankType.SBER ? "2202200000000001" : "5536900000000001",
            recipientName: "Иван Иванов",
            isArchived: false,
            isActive: true,
            currentTotalAmount: 0,
            dailyAmount: 0,
            monthlyAmount: 0,
            dailyOperations: 0,
            monthlyOperations: 0,
            lastResetDate: new Date()
          }
        });
        console.log(`✅ Created ${bankType} bank details for trader`);
      }
    }

    // Создаем реквизит для СБП
    const sbpDetail = await db.bankDetail.findFirst({
      where: { userId: trader.id, bankType: BankType.SBER, cardNumber: { contains: '+7' } }
    });

    if (!sbpDetail) {
      await db.bankDetail.create({
        data: {
          userId: trader.id,
          bankType: BankType.SBER,
          cardNumber: "+79001234567",
          recipientName: "Иван Иванов",
          isArchived: false,
          isActive: true,
          currentTotalAmount: 0,
          dailyAmount: 0,
          monthlyAmount: 0,
          dailyOperations: 0,
          monthlyOperations: 0,
          lastResetDate: new Date()
        }
      });
      console.log(`✅ Created SBP bank details for trader`);
    }

    // 4. Найти методы оплаты
    const methods = await db.method.findMany({
      where: { isEnabled: true }
    });

    if (methods.length === 0) {
      console.log("❌ No payment methods found");
      return;
    }

    // 5. Связать мерчанта с методами
    for (const method of methods) {
      const existingLink = await db.merchantMethod.findUnique({
        where: {
          merchantId_methodId: {
            merchantId: wellbitMerchant.id,
            methodId: method.id
          }
        }
      });

      if (!existingLink) {
        await db.merchantMethod.create({
          data: {
            merchantId: wellbitMerchant.id,
            methodId: method.id,
            isEnabled: true
          }
        });
      }
    }

    // 6. Связать трейдера с мерчантом для всех методов
    for (const method of methods) {
      const existingLink = await db.traderMerchant.findUnique({
        where: {
          traderId_merchantId_methodId: {
            traderId: trader.id,
            merchantId: wellbitMerchant.id,
            methodId: method.id
          }
        }
      });

      if (!existingLink) {
        await db.traderMerchant.create({
          data: {
            traderId: trader.id,
            merchantId: wellbitMerchant.id,
            methodId: method.id,
            isEnabled: true,
            isMerchantEnabled: true,
            isFeeInEnabled: true,
            isFeeOutEnabled: true
          }
        });
        console.log(`✅ Connected trader to Wellbit for method ${method.name}`);
      } else {
        // Обновляем существующую связь
        await db.traderMerchant.update({
          where: {
            traderId_merchantId_methodId: {
              traderId: trader.id,
              merchantId: wellbitMerchant.id,
              methodId: method.id
            }
          },
          data: {
            isEnabled: true,
            isMerchantEnabled: true,
            isFeeInEnabled: true,
            isFeeOutEnabled: true
          }
        });
        console.log(`✅ Updated trader-Wellbit connection for method ${method.name}`);
      }
    }

    console.log("\n=== Setup Complete ===");
    console.log(`Merchant ID: ${wellbitMerchant.id}`);
    console.log(`API Key: ${wellbitMerchant.apiKeyPublic}`);
    console.log(`Private Key: ${wellbitMerchant.apiKeyPrivate}`);
    console.log(`Trader ID: ${trader.id}`);
    console.log(`Trader Balance: ${trader.trustBalance} USDT`);

  } catch (error) {
    console.error("❌ Setup failed:", error);
  } finally {
    await db.$disconnect();
  }
}

// Запускаем настройку
setupWellbitTest();