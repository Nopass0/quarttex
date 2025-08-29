import { db } from '@/db';
import { BankType, MethodType } from '@prisma/client';

async function createWellbitTestRequisites() {
  try {
    // Find a trader user
    const trader = await db.user.findFirst({
      where: {
        email: { contains: 'trader' }
      }
    });

    if (!trader) {
      console.error('No trader user found');
      return;
    }

    console.log(`Using trader: ${trader.email}`);

    // Create requisites for common banks
    const banksToCreate = [
      { bank: BankType.ALFABANK, card: '4100111122223333' },
      { bank: BankType.SBERBANK, card: '4200111122224444' },
      { bank: BankType.VTB, card: '4300111122225555' },
      { bank: BankType.TBANK, card: '4400111122226666' },
      { bank: BankType.RAIFFEISEN, card: '4500111122227777' }
    ];

    for (const { bank, card } of banksToCreate) {
      // Check if requisite already exists
      const existing = await db.bankDetail.findFirst({
        where: {
          userId: trader.id,
          bankType: bank,
          methodType: MethodType.c2c,
          isArchived: false
        }
      });

      if (existing) {
        console.log(`✓ Requisite for ${bank} (c2c) already exists`);
        continue;
      }

      // Create new requisite
      const requisite = await db.bankDetail.create({
        data: {
          userId: trader.id,
          methodType: MethodType.c2c,
          bankType: bank,
          cardNumber: card,
          recipientName: 'Test User',
          phoneNumber: '+79001234567',
          minAmount: 100,
          maxAmount: 100000,
          dailyLimit: 1000000,
          monthlyLimit: 10000000,
          maxCountTransactions: 100,
          intervalMinutes: 0,
          isArchived: false
        }
      });

      console.log(`✅ Created requisite for ${bank} (c2c): ${card}`);
    }

    // Also create SBP requisites
    for (const { bank, card } of banksToCreate.slice(0, 2)) {
      const existing = await db.bankDetail.findFirst({
        where: {
          userId: trader.id,
          bankType: bank,
          methodType: MethodType.sbp,
          isArchived: false
        }
      });

      if (existing) {
        console.log(`✓ Requisite for ${bank} (sbp) already exists`);
        continue;
      }

      const requisite = await db.bankDetail.create({
        data: {
          userId: trader.id,
          methodType: MethodType.sbp,
          bankType: bank,
          cardNumber: '+79001234567', // Phone for SBP
          recipientName: 'Test User',
          phoneNumber: '+79001234567',
          minAmount: 100,
          maxAmount: 100000,
          dailyLimit: 1000000,
          monthlyLimit: 10000000,
          maxCountTransactions: 100,
          intervalMinutes: 0,
          isArchived: false
        }
      });

      console.log(`✅ Created requisite for ${bank} (sbp): ${requisite.cardNumber}`);
    }

    // Verify requisites were created
    const totalRequisites = await db.bankDetail.count({
      where: {
        userId: trader.id,
        isArchived: false
      }
    });

    console.log(`\nTotal active requisites for trader: ${totalRequisites}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

createWellbitTestRequisites();